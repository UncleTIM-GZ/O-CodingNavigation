// PR-B / M5 — top-level prompt assembler.
//
// Pure aggregator over a `PromptInputs` slice. Composes the per-section
// builders from `next-prompt-sections.ts` into the final markdown body and
// derives the `NextPromptSummary`. No I/O.

import {
  AGENT_OVERLAYS,
  EXPECTED_COMPLETION_OUTPUT,
  SECTION_HEADER,
  STOP_CONDITIONS,
} from "./next-prompt-templates.js";
import {
  buildAcceptanceLines,
  buildAllowedWork,
  buildBlockingLines,
  buildEvidenceLines,
  buildForbiddenLines,
  buildObjective,
  buildSection,
  buildVerificationBlock,
} from "./next-prompt-sections.js";
import type {
  NextPromptRiskFlag,
  NextPromptSummary,
} from "./types.js";
import type { PromptInputs } from "./next-prompt-shapes.js";

// Re-export the shared shapes so existing imports from
// `next-prompt-assemble` continue to resolve.
export type { NextPromptOptionsSlice, PromptInputs } from "./next-prompt-shapes.js";

function dedupeSort(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function collectRiskFlags(input: PromptInputs): readonly NextPromptRiskFlag[] {
  const flags: string[] = [];
  if (input.git.isGitRepo === false) {
    if (input.git.reason === "git-not-found") flags.push("git-not-found");
    else flags.push("not-a-git-repository");
  } else {
    if (input.git.isDirty === true) flags.push("working-tree-dirty");
    if (input.git.reason === "no-commits") flags.push("no-commits");
    if (input.git.branch === null && input.git.head !== null) flags.push("detached-head");
  }
  if (input.ocn.reason === "state-unreadable") flags.push("ocn-state-unreadable");
  if (!input.acceptance.found) flags.push("acceptance-file-missing");
  if (input.acceptance.found && input.acceptance.criteriaCount === 0) {
    flags.push("no-acceptance-criteria");
  }
  if (input.mapping.coverageStatus === "partial") flags.push("coverage-partial");
  if (input.mapping.coverageStatus === "missing") flags.push("coverage-missing");
  if (input.mapping.needsHumanReview > 0) flags.push("human-review-required");
  if (input.githubRequested && input.githubUnavailable) {
    flags.push("github-evidence-unavailable");
  }
  if (input.github !== null && input.github.analysis !== null) {
    for (const f of input.github.analysis.riskFlags) {
      if (
        f === "ci-failing" ||
        f === "ci-pending" ||
        f === "draft-pr" ||
        f === "merge-conflict-or-unclean"
      ) {
        flags.push(f);
      }
    }
  }
  return dedupeSort(flags) as readonly NextPromptRiskFlag[];
}

export interface AssembledPrompt {
  readonly prompt: string;
  readonly riskFlags: readonly NextPromptRiskFlag[];
}

export function assemblePrompt(input: PromptInputs): AssembledPrompt {
  const overlay = AGENT_OVERLAYS[input.opts.agent];
  const flags = collectRiskFlags(input);

  const objective = buildObjective(input);
  const evidence = buildEvidenceLines(input);
  const acceptance = buildAcceptanceLines(input);
  const blocking = buildBlockingLines(flags);
  const allowed = buildAllowedWork(input, flags);
  const forbidden = buildForbiddenLines(input.opts.mode);
  const verification = buildVerificationBlock(input, flags);
  const stop = STOP_CONDITIONS.map((s) => `- ${s}`);
  const expected = EXPECTED_COMPLETION_OUTPUT.map((s) => `- ${s}`);

  const sections: string[] = [];
  if (overlay.length > 0) sections.push(overlay);
  sections.push(SECTION_HEADER);
  sections.push(buildSection("## Current objective", objective));
  sections.push(buildSection("## Current evidence", evidence));
  sections.push(buildSection("## Acceptance evidence status", acceptance));
  sections.push(buildSection("## Blocking issues or risks", blocking));
  sections.push(buildSection("## Allowed work", allowed));
  sections.push(buildSection("## Forbidden actions", forbidden));
  sections.push(buildSection("## Required verification commands", verification));
  sections.push(buildSection("## Stop conditions", stop));
  sections.push(buildSection("## Expected completion output", expected));

  return { prompt: sections.join("\n\n"), riskFlags: flags };
}

export function buildSummary(
  input: PromptInputs,
  flags: readonly NextPromptRiskFlag[],
): NextPromptSummary {
  const gitStatus: NextPromptSummary["gitStatus"] =
    input.git.isGitRepo === false
      ? "no-git"
      : input.git.reason === "no-commits"
        ? "empty-repo"
        : input.git.isDirty === true
          ? "dirty"
          : "clean";
  return {
    currentStateId: input.ocn.currentStateId ?? null,
    currentStepId: input.ocn.currentStepId ?? null,
    gitStatus,
    branch: input.git.branch ?? null,
    head: input.git.head ?? null,
    changedFilesCount: (input.git.changedFiles ?? []).length,
    acceptanceCoverageStatus: input.mapping.coverageStatus,
    covered: input.mapping.covered,
    candidate: input.mapping.candidate,
    missing: input.mapping.missing,
    needsHumanReview: input.mapping.needsHumanReview,
    riskFlags: flags,
  };
}
