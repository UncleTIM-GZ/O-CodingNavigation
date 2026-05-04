// MVP 4 — deterministic agent prompt generator (DEC-024 PR 5).
//
// Read-only. Composes existing readers (local git, OCN state, acceptance map,
// optional GitHub PR analysis) into a deterministic markdown prompt body.
// Pure assembly: same inputs → byte-identical prompt string. No LLM, no
// network call, no mutation, no file writes.

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
import type { GhRunner } from "./github-pr-runner.js";
import {
  AGENT_OVERLAYS,
  BASE_VERIFICATION_COMMANDS,
  CHANGED_FILES_PREVIEW,
  COVERAGE_VERIFICATION_COMMAND,
  EXPECTED_COMPLETION_OUTPUT,
  FORBIDDEN_ACTIONS,
  ISSUE_TEXT_MAX_LENGTH,
  NEXT_PROMPT_HEADLINE_EN,
  NEXT_PROMPT_HEADLINE_ZH,
  RECENT_COMMITS_PREVIEW,
  REVIEW_MODE_FORBIDDEN_PREFIX,
  SECTION_HEADER,
  SMOKE_VERIFICATION_COMMAND,
  STOP_CONDITIONS,
  TOP_MISSING_PREVIEW,
  TOP_MISSING_TRUNCATE,
} from "./next-prompt-templates.js";
import type {
  AcceptanceParseResult,
  EvidenceMapItem,
  EvidenceMapMappingData,
  EvidenceSourceUsed,
  ExecStatusGitData,
  ExecStatusOcnData,
  GitHubPrAnalyzeData,
  NextPromptAgent,
  NextPromptData,
  NextPromptMode,
  NextPromptRiskFlag,
  NextPromptSummary,
} from "./types.js";

const ACCEPTANCE_RELATIVE_PATH = "docs/03-acceptance-criteria.md";
const SMOKE_SCRIPT_PATH = "examples/plan-to-verify/scripts/smoke.sh";

export interface NextPromptOptions {
  readonly cwd: string;
  readonly agent: NextPromptAgent;
  readonly mode: NextPromptMode;
  readonly issue?: string;
  readonly prNumber?: number;
  readonly runner?: GhRunner;
}

interface PromptInputs {
  readonly opts: NextPromptOptions;
  readonly git: ExecStatusGitData;
  readonly ocn: ExecStatusOcnData;
  readonly acceptance: AcceptanceParseResult;
  readonly mapping: EvidenceMapMappingData;
  readonly github: GitHubPrAnalyzeData | null;
  readonly githubRequested: boolean;
  readonly githubUnavailable: boolean;
  readonly issueText: string | null;
  readonly issueTruncated: boolean;
  readonly smokeAvailable: boolean;
  readonly warnings: readonly string[];
}

async function loadAcceptance(cwd: string): Promise<AcceptanceParseResult> {
  const absPath = join(cwd, ACCEPTANCE_RELATIVE_PATH);
  try {
    const raw = await fs.readFile(absPath, "utf8");
    return parseAcceptanceCriteria(raw, { path: ACCEPTANCE_RELATIVE_PATH });
  } catch {
    return emptyAcceptanceParseResult(ACCEPTANCE_RELATIVE_PATH);
  }
}

async function smokeScriptExists(cwd: string): Promise<boolean> {
  try {
    await fs.access(join(cwd, SMOKE_SCRIPT_PATH));
    return true;
  } catch {
    return false;
  }
}

function normaliseIssue(raw: string | undefined): {
  readonly text: string | null;
  readonly truncated: boolean;
} {
  if (typeof raw !== "string") return { text: null, truncated: false };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { text: null, truncated: false };
  if (trimmed.length > ISSUE_TEXT_MAX_LENGTH) {
    return { text: trimmed.slice(0, ISSUE_TEXT_MAX_LENGTH), truncated: true };
  }
  return { text: trimmed, truncated: false };
}

function buildObjective(input: PromptInputs): string {
  if (input.issueText !== null) {
    return `Resolve the following issue: ${input.issueText}.`;
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

function buildEvidenceLines(input: PromptInputs): readonly string[] {
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

function buildAcceptanceLines(input: PromptInputs): readonly string[] {
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

function dedupeSort(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function collectRiskFlags(input: PromptInputs): readonly NextPromptRiskFlag[] {
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

function buildBlockingLines(flags: readonly NextPromptRiskFlag[]): readonly string[] {
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

function buildAllowedWork(
  input: PromptInputs,
  flags: readonly NextPromptRiskFlag[],
): readonly string[] {
  const lines: string[] = [];
  lines.push("- run read-only diagnostic commands (git status, git diff, git log)");

  if (input.opts.mode === "review") {
    lines.push("- read and analyse only; do not modify any file");
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

function buildForbiddenLines(mode: NextPromptMode): readonly string[] {
  const lines: string[] = [];
  if (mode === "review") {
    lines.push(`- ${REVIEW_MODE_FORBIDDEN_PREFIX}`);
  }
  for (const f of FORBIDDEN_ACTIONS) {
    lines.push(`- ${f}`);
  }
  return lines;
}

function buildVerificationBlock(input: PromptInputs, flags: readonly NextPromptRiskFlag[]): string {
  const cmds: string[] = [];
  if (input.github !== null && flags.includes("ci-failing")) {
    cmds.push(
      `# CI is currently failing on PR #${input.github.pr?.number ?? input.opts.prNumber ?? 0} — reproduce locally before changes`,
    );
  }
  for (const c of BASE_VERIFICATION_COMMANDS) cmds.push(c);
  if (input.smokeAvailable) cmds.push(SMOKE_VERIFICATION_COMMAND);
  if (input.opts.mode === "verify") cmds.push(COVERAGE_VERIFICATION_COMMAND);
  return ["```", ...cmds, "```"].join("\n");
}

function buildSection(heading: string, body: readonly string[] | string): string {
  if (typeof body === "string") return `${heading}\n\n${body}`;
  return `${heading}\n\n${body.join("\n")}`;
}

function assemblePrompt(input: PromptInputs): {
  readonly prompt: string;
  readonly riskFlags: readonly NextPromptRiskFlag[];
} {
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

function buildSummary(
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

function buildEvidenceSourcesUsed(
  hasGithub: boolean,
  acceptanceFound: boolean,
): readonly EvidenceSourceUsed[] {
  const out: EvidenceSourceUsed[] = ["local-git", "ocn-state"];
  if (acceptanceFound) out.push("acceptance-map");
  if (hasGithub) out.push("github");
  return out;
}

export async function generateNextPrompt(
  opts: NextPromptOptions,
): Promise<CommandResult<NextPromptData>> {
  const issue = normaliseIssue(opts.issue);
  const warnings: string[] = [];
  if (issue.truncated) {
    warnings.push(`issue text truncated to ${ISSUE_TEXT_MAX_LENGTH} chars`);
  }

  const [git, ocn, acceptance, smokeAvailable] = await Promise.all([
    readLocalGit(opts.cwd),
    readOcnProjectState(opts.cwd),
    loadAcceptance(opts.cwd),
    smokeScriptExists(opts.cwd),
  ]);

  let github: GitHubPrAnalyzeData | null = null;
  let githubUnavailable = false;
  const githubRequested = typeof opts.prNumber === "number";
  if (githubRequested && opts.prNumber !== undefined) {
    const ghResult = await analyzeGithubPr({
      prNumber: opts.prNumber,
      cwd: opts.cwd,
      ...(opts.runner !== undefined ? { runner: opts.runner } : {}),
    });
    if (ghResult.ok === true && ghResult.data !== undefined && ghResult.data.pr !== null) {
      github = ghResult.data;
    } else {
      githubUnavailable = true;
      const data = ghResult.data as GitHubPrAnalyzeData | undefined;
      const reason = data?.reason ?? "unknown";
      warnings.push(`github-evidence-unavailable: ${reason}`);
    }
  }

  const mapping = mapEvidence({ criteria: acceptance.criteria, git, github });

  const input: PromptInputs = {
    opts,
    git,
    ocn,
    acceptance,
    mapping,
    github,
    githubRequested,
    githubUnavailable,
    issueText: issue.text,
    issueTruncated: issue.truncated,
    smokeAvailable,
    warnings,
  };

  const { prompt, riskFlags } = assemblePrompt(input);
  const summary = buildSummary(input, riskFlags);
  const evidenceSourcesUsed = buildEvidenceSourcesUsed(github !== null, acceptance.found);

  const data: NextPromptData = {
    command: "next_prompt",
    implemented: true,
    noMutation: true,
    agent: opts.agent,
    mode: opts.mode,
    evidenceSourcesUsed,
    summary,
    prompt,
    warnings,
  };

  return ok(msg(NEXT_PROMPT_HEADLINE_EN, NEXT_PROMPT_HEADLINE_ZH), data);
}
