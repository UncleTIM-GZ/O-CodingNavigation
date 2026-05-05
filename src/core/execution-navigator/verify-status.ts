// MVP 5 — verification status summarizer (DEC-024 PR 6).
//
// Read-only orchestrator. Composes existing readers (local git, OCN state,
// acceptance map, optional GitHub PR analysis) plus a defensive package.json
// reader to produce a deterministic verification readiness envelope. Never
// runs lint / typecheck / test / build itself; only enumerates them. No LLM,
// no mutation, no file writes. Pure assembly: same inputs produce
// byte-identical JSON.
//
// PR-B / M2: takes an optional `EvidenceContext` so callers that already
// composed one (e.g. verdict-draft) can pass it through and avoid a second
// round-trip to the GitHub API.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import {
  buildEvidenceContext,
  type EvidenceContext,
} from "./evidence-context.js";
import { mapEvidence } from "./evidence-map.js";
import { readPackageScripts } from "./verify-status-package.js";
import { buildVerification, deriveStatus, type PrSlice } from "./verify-status-verdict.js";
import { defaultGhRunner, type GhRunner } from "./github-pr-runner.js";
import type {
  AcceptanceParseResult,
  EvidenceMapMappingData,
  EvidenceSourceUsed,
  ExecStatusOcnData,
  GitHubPrAnalyzeData,
  VerifyStatusAcceptance,
  VerifyStatusData,
  VerifyStatusLocalEvidence,
  VerifyStatusMode,
  VerifyStatusPr,
  VerifyStatusPrCheckRecord,
} from "./types.js";
import {
  HEADLINE_EN,
  HEADLINE_ZH,
  PR_ITEMS_LIMIT,
  SMOKE_RELATIVE_PATH,
  VERIFY_STATUS_COMMAND_ID,
} from "./verify-status-constants.js";

export interface VerifyStatusOptions {
  readonly cwd: string;
  readonly mode: VerifyStatusMode;
  readonly prNumber?: number;
  readonly runner?: GhRunner;
  // Optional pre-built EvidenceContext (PR-B / M2). When supplied, the
  // orchestrator skips git/ocn/acceptance/github I/O and reuses the bundle.
  readonly context?: EvidenceContext;
}

async function smokeScriptExists(cwd: string): Promise<boolean> {
  try {
    await fs.access(join(cwd, SMOKE_RELATIVE_PATH));
    return true;
  } catch {
    return false;
  }
}

interface BuildPrArgs {
  readonly github: GitHubPrAnalyzeData | null;
}

interface BuiltPr {
  readonly pr: VerifyStatusPr | null;
  readonly slice: PrSlice;
}

function buildPr(args: BuildPrArgs): BuiltPr {
  const github = args.github;
  if (github === null || github.pr === null) {
    return {
      pr: null,
      slice: {
        hasPr: false,
        isDraft: false,
        checksSummary: null,
        mergeStateStatus: null,
        riskFlags: [],
      },
    };
  }
  const items: VerifyStatusPrCheckRecord[] =
    github.checks !== null
      ? github.checks.items.slice(0, PR_ITEMS_LIMIT).map((i) => ({
          name: i.name,
          status: i.status,
          conclusion: i.conclusion,
        }))
      : [];
  const checks = github.checks;
  const reviews = github.reviews;
  const pr: VerifyStatusPr = {
    number: github.pr.number,
    state: github.pr.state,
    isDraft: github.pr.isDraft,
    mergeable: github.pr.mergeable,
    mergeStateStatus: github.pr.mergeStateStatus,
    checksSummary: checks !== null ? checks.summary : "none",
    passed: checks !== null ? checks.passed : 0,
    failed: checks !== null ? checks.failed : 0,
    pending: checks !== null ? checks.pending : 0,
    items,
    reviews: {
      total: reviews !== null ? reviews.total : 0,
      approved: reviews !== null ? reviews.approved : 0,
      changesRequested: reviews !== null ? reviews.changesRequested : 0,
      commented: reviews !== null ? reviews.commented : 0,
    },
  };
  const slice: PrSlice = {
    hasPr: true,
    isDraft: github.pr.isDraft,
    checksSummary: checks !== null ? checks.summary : null,
    mergeStateStatus: github.pr.mergeStateStatus,
    riskFlags: github.analysis !== null ? github.analysis.riskFlags : [],
  };
  return { pr, slice };
}

function buildAcceptance(
  acceptance: AcceptanceParseResult,
  mapping: EvidenceMapMappingData,
): VerifyStatusAcceptance {
  if (!acceptance.found) {
    return {
      found: false,
      coverageStatus: "no-acceptance-criteria",
      criteriaCount: 0,
      covered: 0,
      candidate: 0,
      missing: 0,
      needsHumanReview: 0,
    };
  }
  return {
    found: true,
    coverageStatus: mapping.coverageStatus,
    criteriaCount: acceptance.criteriaCount,
    covered: mapping.covered,
    candidate: mapping.candidate,
    missing: mapping.missing,
    needsHumanReview: mapping.needsHumanReview,
  };
}

function buildEvidenceSourcesUsed(hasGithub: boolean): readonly EvidenceSourceUsed[] {
  const out: EvidenceSourceUsed[] = ["local-git", "ocn-state", "acceptance-map"];
  if (hasGithub) out.push("github");
  return out;
}

export async function summarizeVerifyStatus(
  opts: VerifyStatusOptions,
): Promise<CommandResult<VerifyStatusData>> {
  const warnings: string[] = [];
  const prRequested = typeof opts.prNumber === "number";
  const ignorePrInLocalMode = prRequested && opts.mode === "local";
  if (ignorePrInLocalMode) {
    warnings.push("ignoring --pr because --mode local was requested");
  }

  const ctx =
    opts.context ??
    (await buildEvidenceContext({
      cwd: opts.cwd,
      mode: opts.mode,
      prNumber: prRequested && !ignorePrInLocalMode ? (opts.prNumber as number) : null,
      ghRunner: opts.runner ?? defaultGhRunner(),
    }));

  // Forward github-evidence-unavailable warnings emitted during context
  // construction. Acceptance-loader warnings are intentionally not surfaced
  // in the verify-status envelope (backward compatibility with PR-A shape).
  for (const w of ctx.warnings) {
    if (w.startsWith("github-evidence-unavailable")) warnings.push(w);
  }

  const smokeAvailable = await smokeScriptExists(opts.cwd);
  const pkg = await readPackageScripts(opts.cwd, smokeAvailable);

  const mapping = mapEvidence({
    criteria: ctx.acceptance.criteria,
    git: ctx.git,
    github: ctx.github,
  });
  const acceptanceSlice = buildAcceptance(ctx.acceptance, mapping);
  const built = buildPr({ github: ctx.github });

  const githubRequested =
    typeof opts.prNumber === "number" && (opts.mode === "pr" || opts.mode === "combined");

  const verdictInputs = {
    mode: opts.mode,
    scripts: pkg.scripts,
    acceptance: acceptanceSlice,
    git: ctx.git,
    pr: built.slice,
    githubRequested,
    githubUnavailable: ctx.githubUnavailable,
  };

  const status = deriveStatus(verdictInputs);
  const verification = buildVerification(verdictInputs, status);

  const local: VerifyStatusLocalEvidence = {
    scripts: pkg.scripts,
    scriptCommands: pkg.scriptCommands,
    git: {
      branch: typeof ctx.git.branch === "string" ? ctx.git.branch : null,
      head: typeof ctx.git.head === "string" ? ctx.git.head : null,
      isDirty: ctx.git.isDirty === true,
      changedFilesCount: (ctx.git.changedFiles ?? []).length,
      isGitRepo: ctx.git.isGitRepo === true,
      gitReason: ctx.git.reason ?? null,
    },
    ocn: ctx.ocn satisfies ExecStatusOcnData,
  };

  const data: VerifyStatusData = {
    command: VERIFY_STATUS_COMMAND_ID,
    implemented: true,
    noMutation: true,
    mode: opts.mode,
    evidenceSourcesUsed: buildEvidenceSourcesUsed(ctx.github !== null),
    local,
    pr: opts.mode === "local" ? null : built.pr,
    acceptance: acceptanceSlice,
    verification,
    warnings,
  };

  return ok(msg(HEADLINE_EN, HEADLINE_ZH), data);
}
