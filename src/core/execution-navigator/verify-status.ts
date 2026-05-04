// MVP 5 — verification status summarizer (DEC-024 PR 6).
//
// Read-only orchestrator. Composes existing readers (local git, OCN state,
// acceptance map, optional GitHub PR analysis) plus a defensive package.json
// reader to produce a deterministic verification readiness envelope. Never
// runs lint / typecheck / test / build itself; only enumerates them. No LLM,
// no mutation, no file writes. Pure assembly: same inputs produce
// byte-identical JSON.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import { readLocalGit } from "./local-git.js";
import { readOcnProjectState } from "./ocn-state-reader.js";
import { analyzeGithubPr } from "./github-pr.js";
import { emptyAcceptanceParseResult, parseAcceptanceCriteria } from "./acceptance-parser.js";
import { mapEvidence } from "./evidence-map.js";
import { readPackageScripts } from "./verify-status-package.js";
import {
  buildVerification,
  deriveStatus,
  type PrSlice,
} from "./verify-status-verdict.js";
import type { GhRunner } from "./github-pr-runner.js";
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
  ACCEPTANCE_RELATIVE_PATH,
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
}

async function smokeScriptExists(cwd: string): Promise<boolean> {
  try {
    await fs.access(join(cwd, SMOKE_RELATIVE_PATH));
    return true;
  } catch {
    return false;
  }
}

async function loadAcceptance(cwd: string): Promise<AcceptanceParseResult> {
  try {
    const raw = await fs.readFile(join(cwd, ACCEPTANCE_RELATIVE_PATH), "utf8");
    return parseAcceptanceCriteria(raw, { path: ACCEPTANCE_RELATIVE_PATH });
  } catch {
    return emptyAcceptanceParseResult(ACCEPTANCE_RELATIVE_PATH);
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

interface GhFetchResult {
  readonly github: GitHubPrAnalyzeData | null;
  readonly githubUnavailable: boolean;
  readonly warning: string | null;
}

async function fetchGithubEvidence(opts: VerifyStatusOptions): Promise<GhFetchResult> {
  if (typeof opts.prNumber !== "number") {
    return { github: null, githubUnavailable: false, warning: null };
  }
  if (opts.mode === "local") {
    return {
      github: null,
      githubUnavailable: false,
      warning: "ignoring --pr because --mode local was requested",
    };
  }
  const ghResult = await analyzeGithubPr({
    prNumber: opts.prNumber,
    cwd: opts.cwd,
    ...(opts.runner !== undefined ? { runner: opts.runner } : {}),
  });
  if (ghResult.ok === true && ghResult.data !== undefined && ghResult.data.pr !== null) {
    return { github: ghResult.data, githubUnavailable: false, warning: null };
  }
  const data = ghResult.data as GitHubPrAnalyzeData | undefined;
  const reason = data?.reason ?? "unknown";
  return {
    github: null,
    githubUnavailable: true,
    warning: `github-evidence-unavailable: ${reason}`,
  };
}

export async function summarizeVerifyStatus(
  opts: VerifyStatusOptions,
): Promise<CommandResult<VerifyStatusData>> {
  const warnings: string[] = [];

  const [git, ocn, acceptance, smokeAvailable, gh] = await Promise.all([
    readLocalGit(opts.cwd),
    readOcnProjectState(opts.cwd),
    loadAcceptance(opts.cwd),
    smokeScriptExists(opts.cwd),
    fetchGithubEvidence(opts),
  ]);
  if (gh.warning !== null) warnings.push(gh.warning);

  const pkg = await readPackageScripts(opts.cwd, smokeAvailable);
  const mapping = mapEvidence({ criteria: acceptance.criteria, git, github: gh.github });
  const acceptanceSlice = buildAcceptance(acceptance, mapping);
  const built = buildPr({ github: gh.github });

  const githubRequested =
    typeof opts.prNumber === "number" && (opts.mode === "pr" || opts.mode === "combined");

  const verdictInputs = {
    mode: opts.mode,
    scripts: pkg.scripts,
    acceptance: acceptanceSlice,
    git,
    pr: built.slice,
    githubRequested,
    githubUnavailable: gh.githubUnavailable,
  };

  const status = deriveStatus(verdictInputs);
  const verification = buildVerification(verdictInputs, status);

  const local: VerifyStatusLocalEvidence = {
    scripts: pkg.scripts,
    scriptCommands: pkg.scriptCommands,
    git: {
      branch: typeof git.branch === "string" ? git.branch : null,
      head: typeof git.head === "string" ? git.head : null,
      isDirty: git.isDirty === true,
      changedFilesCount: (git.changedFiles ?? []).length,
    },
    ocn: ocn satisfies ExecStatusOcnData,
  };

  const data: VerifyStatusData = {
    command: VERIFY_STATUS_COMMAND_ID,
    implemented: true,
    noMutation: true,
    mode: opts.mode,
    evidenceSourcesUsed: buildEvidenceSourcesUsed(gh.github !== null),
    local,
    pr: opts.mode === "local" ? null : built.pr,
    acceptance: acceptanceSlice,
    verification,
    warnings,
  };

  return ok(msg(HEADLINE_EN, HEADLINE_ZH), data);
}
