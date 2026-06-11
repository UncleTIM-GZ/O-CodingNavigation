// PR-B / M5 — per-section line builders extracted from next-prompt-assemble.
//
// Pure functions over a `PromptInputs` slice. No I/O. These build the
// individual section line arrays (objective, evidence, acceptance, blocking,
// allowed, forbidden, verification). The aggregator (`assemblePrompt`)
// composes them in `next-prompt-assemble.ts`.

import {
  BASE_VERIFICATION_COMMANDS,
  CHANGED_FILES_PREVIEW,
  COVERAGE_VERIFICATION_COMMAND,
  FORBIDDEN_ACTIONS,
  RECENT_COMMITS_PREVIEW,
  REVIEW_MODE_FORBIDDEN_PREFIX,
  SMOKE_VERIFICATION_COMMAND,
  TOP_MISSING_PREVIEW,
  TOP_MISSING_TRUNCATE,
} from "./next-prompt-templates.js";
import type { EvidenceMapItem, NextPromptMode, NextPromptRiskFlag } from "./types.js";
import type { PromptInputs } from "./next-prompt-shapes.js";
import {
  buildTaskAllowedWork,
  buildTaskObjective,
  resolveTaskDispatch,
  taskVerificationCommands,
} from "./next-prompt-task-dispatch.js";

const ACCEPTANCE_RELATIVE_PATH = "docs/03-acceptance-criteria.md";

export function buildObjective(input: PromptInputs): string {
  if (input.issueText !== null) {
    return `Resolve the following issue: ${input.issueText}.`;
  }
  // SOP 0.5.0 (AM-007 / DEC-032) — BUILD-state ledger dispatch overrides the
  // generic step objective; null (no ledger / no pending) → legacy behavior.
  const dispatch = resolveTaskDispatch(input);
  if (dispatch !== null) {
    return buildTaskObjective(dispatch);
  }
  if (
    input.ocn.isOcnProject === true &&
    typeof input.ocn.currentStepId === "string" &&
    typeof input.ocn.currentStateId === "string"
  ) {
    return `Advance OCN current step \`${input.ocn.currentStepId}\` (state \`${input.ocn.currentStateId}\`).`;
  }
  if (input.github !== null && input.github.pr !== null) {
    return `Continue work on PR #${input.github.pr.number}: ${input.github.pr.title}.`;
  }
  if (
    input.mapping.missing > 0 ||
    input.mapping.candidate > 0 ||
    input.mapping.needsHumanReview > 0
  ) {
    return "Close evidence gaps for missing acceptance criteria.";
  }
  if (input.mapping.items.length > 0) {
    return "Continue implementation safely against the current evidence baseline.";
  }
  return "Evidence insufficient.";
}

export function buildEvidenceLines(input: PromptInputs): readonly string[] {
  const lines: string[] = [];
  if (input.git.isGitRepo === false) {
    lines.push("branch: (not a git repository)");
  } else {
    const branchLabel =
      typeof input.git.branch === "string"
        ? input.git.branch
        : input.git.branch === null
          ? "detached"
          : "unknown";
    lines.push(`branch: ${branchLabel}`);
    const headLabel = typeof input.git.head === "string" ? input.git.head : "no-commits";
    lines.push(`head: ${headLabel}`);
    lines.push(`working tree: ${input.git.isDirty === true ? "dirty" : "clean"}`);
    const changed = input.git.changedFiles ?? [];
    lines.push(`changed files: ${changed.length}`);
    for (const path of changed.slice(0, CHANGED_FILES_PREVIEW)) {
      lines.push(`  - ${path}`);
    }
    const recent = input.git.recentCommits ?? [];
    lines.push(`recent commits: ${recent.length}`);
    for (const c of recent.slice(0, RECENT_COMMITS_PREVIEW)) {
      lines.push(`  - ${c.subject}`);
    }
  }
  if (input.github !== null && input.github.pr !== null) {
    const checksLabel = input.github.checks !== null ? input.github.checks.summary : "none";
    lines.push(
      `pr: #${input.github.pr.number} — ${input.github.pr.title} [${input.github.pr.state}] (mergeable=${input.github.pr.mergeable ?? "unknown"}, checks=${checksLabel})`,
    );
  }
  if (input.ocn.isOcnProject === true) {
    const stateId = input.ocn.currentStateId ?? "?";
    const stepId = input.ocn.currentStepId ?? "?";
    const sopVersion = input.ocn.sopProfileVersion ?? "?";
    lines.push(`ocn: state=${stateId}, step=${stepId}, sopProfileVersion=${sopVersion}`);
  }
  return lines;
}

function compareCriterionId(a: EvidenceMapItem, b: EvidenceMapItem): number {
  return a.criterionId < b.criterionId ? -1 : a.criterionId > b.criterionId ? 1 : 0;
}

export function buildAcceptanceLines(input: PromptInputs): readonly string[] {
  const lines: string[] = [];
  if (!input.acceptance.found) {
    lines.push("coverage: no-acceptance-criteria");
    lines.push(`note: ${ACCEPTANCE_RELATIVE_PATH} is missing`);
    return lines;
  }
  lines.push(`coverage: ${input.mapping.coverageStatus}`);
  lines.push(
    `covered: ${input.mapping.covered}, candidate: ${input.mapping.candidate}, missing: ${input.mapping.missing}, needsHumanReview: ${input.mapping.needsHumanReview}`,
  );
  const missingItems = [...input.mapping.items]
    .filter((i) => i.status === "missing-evidence")
    .sort(compareCriterionId)
    .slice(0, TOP_MISSING_PREVIEW);
  if (missingItems.length > 0) {
    lines.push("top missing criteria:");
    for (const item of missingItems) {
      const text =
        item.criterionText.length > TOP_MISSING_TRUNCATE
          ? item.criterionText.slice(0, TOP_MISSING_TRUNCATE)
          : item.criterionText;
      lines.push(`  - ${item.criterionId}: ${text}`);
    }
  }
  return lines;
}

export function buildBlockingLines(flags: readonly NextPromptRiskFlag[]): readonly string[] {
  if (flags.length === 0) return ["none observed."];
  return flags.map((f) => `- ${f}`);
}

function mentionsKeyword(items: readonly EvidenceMapItem[], keywords: readonly string[]): boolean {
  for (const item of items) {
    if (item.status !== "missing-evidence") continue;
    const text = item.criterionText.toLowerCase();
    for (const k of keywords) {
      if (text.includes(k)) return true;
    }
  }
  return false;
}

export function buildAllowedWork(
  input: PromptInputs,
  flags: readonly NextPromptRiskFlag[],
): readonly string[] {
  const lines: string[] = [];
  lines.push("- run read-only diagnostic commands (git status, git diff, git log)");

  if (input.opts.mode === "review") {
    lines.push("- read and analyse only; do not modify any file");
    return lines;
  }

  // SOP 0.5.0 (AM-007 / DEC-032) — a dispatched task scopes the allowed work
  // to its touches + the build receipts (real evidence only).
  const dispatch = resolveTaskDispatch(input);
  if (dispatch !== null && dispatch.kind === "task") {
    lines.push(...buildTaskAllowedWork(dispatch.task));
    return lines;
  }

  const items = input.mapping.items;
  const noEvidenceAvailable =
    items.length === 0 && !input.acceptance.found && input.git.isGitRepo === false;

  if (mentionsKeyword(items, ["test", "tests", "testing"])) {
    lines.push("- add or update tests under tests/**");
  }
  if (mentionsKeyword(items, ["cli", "command", "ocn "])) {
    lines.push("- modify CLI source under src/cli/**");
    lines.push("- add tests under tests/cli/** or tests/unit/**");
  }
  if (mentionsKeyword(items, ["docs", "readme", "documentation"])) {
    lines.push("- update documentation under docs/** (excluding forbidden docs)");
  }
  if (
    input.github !== null &&
    input.github.changes !== null &&
    input.github.changes.changedFiles > 0
  ) {
    lines.push(
      `- modify the files already touched by PR #${input.github.pr?.number ?? input.opts.prNumber ?? 0}`,
    );
    lines.push("- add tests covering those files");
  }
  if (input.mapping.coverageStatus === "complete" && input.opts.mode === "verify") {
    lines.push(
      "- run verification commands; do not modify source files unless a test reveals a defect",
    );
  }
  if (input.opts.mode === "fix" && flags.includes("ci-failing")) {
    lines.push(
      "- modify the failing test or its production code, plus its narrowest sibling files",
    );
  }
  if (noEvidenceAvailable) {
    lines.push(
      "- analyse the codebase; gather evidence; do not modify source until evidence is captured",
    );
  }

  return lines;
}

export function buildForbiddenLines(mode: NextPromptMode): readonly string[] {
  const lines: string[] = [];
  if (mode === "review") {
    lines.push(`- ${REVIEW_MODE_FORBIDDEN_PREFIX}`);
  }
  for (const f of FORBIDDEN_ACTIONS) {
    lines.push(`- ${f}`);
  }
  return lines;
}

export function buildVerificationBlock(
  input: PromptInputs,
  flags: readonly NextPromptRiskFlag[],
): string {
  const cmds: string[] = [];
  if (input.github !== null && flags.includes("ci-failing")) {
    cmds.push(
      `# CI is currently failing on PR #${input.github.pr?.number ?? input.opts.prNumber ?? 0} — reproduce locally before changes`,
    );
  }
  // SOP 0.5.0 (AM-007 / DEC-032) — the dispatched task's frozen verify
  // command + its check-off command lead the verification block.
  const dispatch = resolveTaskDispatch(input);
  if (dispatch !== null && dispatch.kind === "task") {
    cmds.push(...taskVerificationCommands(dispatch.task));
  }
  for (const c of BASE_VERIFICATION_COMMANDS) cmds.push(c);
  if (input.smokeAvailable) cmds.push(SMOKE_VERIFICATION_COMMAND);
  if (input.opts.mode === "verify") cmds.push(COVERAGE_VERIFICATION_COMMAND);
  return ["```", ...cmds, "```"].join("\n");
}

export function buildSection(heading: string, body: readonly string[] | string): string {
  if (typeof body === "string") return `${heading}\n\n${body}`;
  return `${heading}\n\n${body.join("\n")}`;
}
