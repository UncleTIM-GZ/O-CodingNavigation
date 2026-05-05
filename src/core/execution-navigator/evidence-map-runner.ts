// MVP 3 — orchestrator for `ocn evidence map` (DEC-024 PR 4).
//
// Read-only. Reads acceptance criteria, local git evidence, OCN state, and
// optionally GitHub PR evidence. Maps criteria to evidence deterministically.
// Never writes any file. Never calls a `gh` mutation subcommand. Never
// touches the working tree or `.ocoding/`.
//
// PR-B / M1 + M2: acceptance loading delegates to the shared
// `loadAcceptanceFromProject` helper; the four readers can be composed once
// via the shared `buildEvidenceContext` aggregator and reused by callers
// that already have a context (verdict-draft uses this to dedupe its
// downstream verify-status call).

import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import {
  buildEvidenceContext,
  type EvidenceContext,
} from "./evidence-context.js";
import { defaultGhRunner, type GhRunner } from "./github-pr-runner.js";
import { mapEvidence } from "./evidence-map.js";
import type {
  EvidenceMapAnalysis,
  EvidenceMapCoverageStatus,
  EvidenceMapData,
  EvidenceMapMappingData,
  EvidenceMapRiskFlag,
  EvidenceSourceUsed,
  ExecStatusGitData,
  ExecStatusOcnData,
} from "./types.js";

const HEADLINE_OK = msg(
  "Acceptance evidence map generated.",
  "已生成验收证据映射。",
);

const HEADLINE_MISSING = msg(
  "Acceptance criteria file is missing — nothing to map.",
  "验收标准文件缺失 —— 暂无可映射的内容。",
);

const NEXT_ACTION_BY_COVERAGE: Readonly<Record<EvidenceMapCoverageStatus, string>> = Object.freeze({
  complete: "Acceptance evidence is complete — proceed to draft final verdict.",
  partial: "Review missing or candidate evidence before drafting final verdict.",
  missing: "No matching evidence found — verify implementation maps to acceptance criteria.",
  "needs-human-review": "Human review required for qualitative acceptance criteria.",
  "no-acceptance-criteria": "Author docs/03-acceptance-criteria.md before mapping evidence.",
});

const NEXT_ACTION_GH_UNAVAILABLE =
  "GitHub PR evidence unavailable; authenticate gh or omit --pr and retry.";

export interface EvidenceMapOptions {
  readonly cwd: string;
  // Optional GitHub PR number to fetch evidence for.
  readonly prNumber?: number;
  // Optional gh runner override (used by tests / CLI env injection).
  readonly runner?: GhRunner;
  // Optional pre-built EvidenceContext (PR-B / M2). When supplied, the
  // orchestrator skips all I/O and runs as a pure assembler.
  readonly context?: EvidenceContext;
}

interface AnalysisInputs {
  readonly mapping: EvidenceMapMappingData;
  readonly acceptanceFound: boolean;
  readonly criteriaCount: number;
  readonly git: ExecStatusGitData;
  readonly githubUnavailable: boolean;
  readonly githubRequested: boolean;
}

function buildAnalysis(inputs: AnalysisInputs): EvidenceMapAnalysis {
  const flags: EvidenceMapRiskFlag[] = [];

  if (!inputs.acceptanceFound) flags.push("acceptance-file-missing");
  if (inputs.acceptanceFound && inputs.criteriaCount === 0) {
    flags.push("no-acceptance-criteria");
  }
  if (inputs.mapping.coverageStatus === "partial") flags.push("coverage-partial");
  if (inputs.mapping.coverageStatus === "missing") flags.push("coverage-missing");
  if (inputs.githubRequested && inputs.githubUnavailable) {
    flags.push("github-evidence-unavailable");
  }
  if (inputs.mapping.needsHumanReview > 0) flags.push("human-review-required");
  if (inputs.git.isGitRepo === true && inputs.git.isDirty === true) {
    flags.push("working-tree-dirty");
  }

  let nextSuggestedAction = NEXT_ACTION_BY_COVERAGE[inputs.mapping.coverageStatus];
  if (flags.includes("github-evidence-unavailable")) {
    nextSuggestedAction = NEXT_ACTION_GH_UNAVAILABLE;
  }

  return { riskFlags: flags, nextSuggestedAction };
}

function buildEvidenceSourcesUsed(
  hasGithub: boolean,
): readonly EvidenceSourceUsed[] {
  const base: EvidenceSourceUsed[] = ["local-git", "ocn-state"];
  if (hasGithub) base.push("github");
  return base;
}

// Top-level orchestrator. Always returns ok=true; this is informative.
// `--pr` failures degrade to warnings rather than blocking the command.
export async function generateEvidenceMap(
  opts: EvidenceMapOptions,
): Promise<CommandResult<EvidenceMapData>> {
  const ctx =
    opts.context ??
    (await buildEvidenceContext({
      cwd: opts.cwd,
      // evidence-map historically used a hybrid mode: local + (optional pr)
      // without any explicit `--mode` flag. Mirror that with "combined" so
      // PR data is fetched whenever a prNumber is supplied.
      mode: typeof opts.prNumber === "number" ? "combined" : "local",
      prNumber: typeof opts.prNumber === "number" ? opts.prNumber : null,
      ghRunner: opts.runner ?? defaultGhRunner(),
    }));

  const mapping = mapEvidence({
    criteria: ctx.acceptance.criteria,
    git: ctx.git,
    github: ctx.github,
  });

  const analysis = buildAnalysis({
    mapping,
    acceptanceFound: ctx.acceptance.found,
    criteriaCount: ctx.acceptance.criteriaCount,
    git: ctx.git,
    githubUnavailable: ctx.githubUnavailable,
    githubRequested: ctx.githubRequested,
  });

  const evidenceSourcesUsed = buildEvidenceSourcesUsed(ctx.github !== null);

  // evidence-map's historical `warnings` array carried only the github
  // unavailable warning (acceptance-loader warnings are not surfaced here
  // for backward compatibility with the existing envelope shape).
  const warnings: string[] = [];
  if (ctx.githubRequested && ctx.githubUnavailable) {
    for (const w of ctx.warnings) {
      if (w.startsWith("github-evidence-unavailable")) warnings.push(w);
    }
  }

  const data: EvidenceMapData = {
    command: "evidence.map",
    implemented: true,
    noMutation: true,
    evidenceSourcesUsed,
    acceptance: ctx.acceptance,
    mapping,
    ocn: ctx.ocn satisfies ExecStatusOcnData,
    analysis,
    warnings,
  };

  const headline = ctx.acceptance.found ? HEADLINE_OK : HEADLINE_MISSING;
  return ok(headline, data);
}
