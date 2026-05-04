// MVP 3 — orchestrator for `ocn evidence map` (DEC-024 PR 4).
//
// Read-only. Reads acceptance criteria, local git evidence, OCN state, and
// optionally GitHub PR evidence. Maps criteria to evidence deterministically.
// Never writes any file. Never calls a `gh` mutation subcommand. Never
// touches the working tree or `.ocoding/`.

import { promises as fs } from "node:fs";
import { join, relative } from "node:path";
import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import {
  emptyAcceptanceParseResult,
  parseAcceptanceCriteria,
} from "./acceptance-parser.js";
import { readLocalGit } from "./local-git.js";
import { readOcnProjectState } from "./ocn-state-reader.js";
import { analyzeGithubPr } from "./github-pr.js";
import { mapEvidence } from "./evidence-map.js";
import type { GhRunner } from "./github-pr-runner.js";
import type {
  AcceptanceParseResult,
  EvidenceMapAnalysis,
  EvidenceMapCoverageStatus,
  EvidenceMapData,
  EvidenceMapMappingData,
  EvidenceMapRiskFlag,
  EvidenceSourceUsed,
  ExecStatusGitData,
  ExecStatusOcnData,
  GitHubPrAnalyzeData,
} from "./types.js";

const ACCEPTANCE_RELATIVE_PATH = "docs/03-acceptance-criteria.md";

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
}

async function loadAcceptanceFile(
  cwd: string,
): Promise<{ readonly result: AcceptanceParseResult; readonly fileMissing: boolean }> {
  const absPath = join(cwd, ACCEPTANCE_RELATIVE_PATH);
  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      return {
        result: emptyAcceptanceParseResult(ACCEPTANCE_RELATIVE_PATH),
        fileMissing: true,
      };
    }
    // Defensive: any other read error → treat as missing but record a warning
    // by emitting a parse result with `found=false` and a synthetic warning.
    const fallback = emptyAcceptanceParseResult(ACCEPTANCE_RELATIVE_PATH);
    return {
      result: {
        ...fallback,
        warnings: [`acceptance file unreadable: ${e.code ?? "unknown"}`],
      },
      fileMissing: true,
    };
  }

  // Use the relative path so output is portable regardless of cwd.
  const path = relative(cwd, absPath) || ACCEPTANCE_RELATIVE_PATH;
  const result = parseAcceptanceCriteria(raw, { path });
  return { result, fileMissing: false };
}

interface AnalysisInputs {
  readonly mapping: EvidenceMapMappingData;
  readonly acceptance: AcceptanceParseResult;
  readonly git: ExecStatusGitData;
  readonly githubUnavailable: boolean;
  readonly githubRequested: boolean;
}

function buildAnalysis(inputs: AnalysisInputs): EvidenceMapAnalysis {
  const flags: EvidenceMapRiskFlag[] = [];

  if (!inputs.acceptance.found) flags.push("acceptance-file-missing");
  if (inputs.acceptance.found && inputs.acceptance.criteriaCount === 0) {
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
  const [{ result: acceptance }, git, ocn] = await Promise.all([
    loadAcceptanceFile(opts.cwd),
    readLocalGit(opts.cwd),
    readOcnProjectState(opts.cwd),
  ]);

  const warnings: string[] = [];
  let github: GitHubPrAnalyzeData | null = null;
  let githubUnavailable = false;
  const githubRequested = typeof opts.prNumber === "number";

  if (githubRequested && opts.prNumber !== undefined) {
    const ghResult = await analyzeGithubPr({
      prNumber: opts.prNumber,
      cwd: opts.cwd,
      ...(opts.runner !== undefined ? { runner: opts.runner } : {}),
    });
    if (
      ghResult.ok === true &&
      ghResult.data !== undefined &&
      ghResult.data.pr !== null
    ) {
      github = ghResult.data;
    } else {
      githubUnavailable = true;
      const data = ghResult.data as GitHubPrAnalyzeData | undefined;
      const reason = data?.reason ?? "unknown";
      warnings.push(`github-evidence-unavailable: ${reason}`);
    }
  }

  const mapping = mapEvidence({
    criteria: acceptance.criteria,
    git,
    github,
  });

  const analysis = buildAnalysis({
    mapping,
    acceptance,
    git,
    githubUnavailable,
    githubRequested,
  });

  const evidenceSourcesUsed = buildEvidenceSourcesUsed(github !== null);

  const data: EvidenceMapData = {
    command: "evidence.map",
    implemented: true,
    noMutation: true,
    evidenceSourcesUsed,
    acceptance,
    mapping,
    ocn: ocn satisfies ExecStatusOcnData,
    analysis,
    warnings,
  };

  const headline = acceptance.found ? HEADLINE_OK : HEADLINE_MISSING;
  return ok(headline, data);
}
