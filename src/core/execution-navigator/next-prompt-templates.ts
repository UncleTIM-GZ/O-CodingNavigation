// MVP 4 — constant prompt fragments per agent / mode (DEC-024 PR 5).
//
// Pure constants. No IO. No imports of runtime data. The agent overlays are
// prepended to the assembled prompt body so the deterministic body is the
// source of truth and the overlay is purely cosmetic guidance.

import type { NextPromptAgent, NextPromptMode } from "./types.js";

// Stable command id used in the JSON envelope. Centralised so the CLI, the
// generator, and tests cannot drift.
export const NEXT_PROMPT_COMMAND_ID = "next_prompt" as const;

// Allowed enum values — kept here so CLI validation and the generator share
// one source of truth.
export const SUPPORTED_AGENTS: readonly NextPromptAgent[] = Object.freeze([
  "generic",
  "claude-code",
  "codex",
  "lfg",
]);

export const SUPPORTED_MODES: readonly NextPromptMode[] = Object.freeze([
  "continue",
  "fix",
  "verify",
  "review",
]);

// Section headings (markdown). These are part of the prompt contract — tests
// assert order and exact text.
export const SECTION_HEADER = "# Agent Task Brief";

export const SECTIONS: readonly string[] = Object.freeze([
  "## Current objective",
  "## Current evidence",
  "## Acceptance evidence status",
  "## Blocking issues or risks",
  "## Allowed work",
  "## Forbidden actions",
  "## Required verification commands",
  "## Stop conditions",
  "## Expected completion output",
]);

// Agent-specific overlays. Prepended verbatim to "# Agent Task Brief". The
// `generic` overlay is intentionally empty — the base body is already neutral.
export const AGENT_OVERLAYS: Readonly<Record<NextPromptAgent, string>> = Object.freeze({
  generic: "",
  "claude-code":
    "> Target: Claude Code (CLI). Work directly in the current repository. Make the smallest safe change. Run the verification commands before reporting completion. Do not ask for confirmation unless blocked.",
  codex:
    "> Target: Codex. Produce a reviewable diff. Cite exact test files run. Avoid broad refactors. Return a concise final report listing files changed, commands run, and outcomes.",
  lfg:
    "> Target: LFG automation. Follow the steps in order. Honour every Stop condition. Do not perform any release, publish, or \"latest\" action. Return a structured completion report.",
});

// Forbidden actions — exact ordered list. Assembled here so the generator and
// tests share one source of truth.
export const FORBIDDEN_ACTIONS: readonly string[] = Object.freeze([
  "Do not publish to npm.",
  "Do not move the npm \"latest\" tag.",
  "Do not bump package version.",
  "Do not create git tags or GitHub releases.",
  "Do not declare GA, beta promotion, or stable release.",
  "Do not claim Cursor / Cline / external IDE validation that did not occur in this session.",
  "Do not perform unrelated refactors.",
  "Do not bypass tests, lint, or typecheck.",
  "Do not modify files outside the Allowed work scope without explaining why.",
  "Do not call any LLM API or external network service.",
  "Do not run git mutation commands (push, force-push, reset --hard, branch -D) unless explicitly authorised.",
  "Do not modify .github/workflows.",
  "Do not modify SOP profiles under src/sops/**.",
]);

// "Review-only" mode pre-pends one extra forbidden line at the top.
export const REVIEW_MODE_FORBIDDEN_PREFIX = "Do not modify any file in this session.";

// Stop conditions — exact ordered list.
export const STOP_CONDITIONS: readonly string[] = Object.freeze([
  "tests fail",
  "lint or typecheck fails",
  "unexpected files outside the Allowed work scope are modified",
  "scope expands beyond the Current objective",
  "evidence newly observed conflicts with the Acceptance evidence status",
  "GitHub or CI state cannot be verified read-only",
  "any package, release, or \"latest\" tag operation becomes necessary",
  "LLM or external API call becomes necessary",
]);

// Expected completion output — exact ordered list.
export const EXPECTED_COMPLETION_OUTPUT: readonly string[] = Object.freeze([
  "files changed (paths)",
  "commands run and their outcomes",
  "tests passed / failed (counts)",
  "evidence added or updated (links to AC IDs, PR comments, file paths)",
  "unresolved risks",
  "recommended next action for the human reviewer",
]);

// Base verification commands always present.
export const BASE_VERIFICATION_COMMANDS: readonly string[] = Object.freeze([
  "npm run lint",
  "npm run typecheck",
  "npm run test",
  "npm run build",
]);

export const SMOKE_VERIFICATION_COMMAND = "bash examples/plan-to-verify/scripts/smoke.sh";
export const COVERAGE_VERIFICATION_COMMAND = "npm run test:coverage";

// Bilingual headline reused by both the OK envelope and the JSON renderer.
export const NEXT_PROMPT_HEADLINE_EN = "Next agent prompt generated.";
export const NEXT_PROMPT_HEADLINE_ZH = "已生成下一轮 Agent 提示词。";

// Cap for free-form `--issue` text. Anything longer is truncated and a
// warning is appended.
export const ISSUE_TEXT_MAX_LENGTH = 500;

// Thresholds reused by the generator. Centralised to avoid magic numbers.
export const RECENT_COMMITS_PREVIEW = 3;
export const CHANGED_FILES_PREVIEW = 5;
export const TOP_MISSING_PREVIEW = 5;
export const TOP_MISSING_TRUNCATE = 80;
