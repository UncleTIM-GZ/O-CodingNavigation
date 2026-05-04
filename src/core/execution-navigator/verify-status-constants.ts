// MVP 5 — verify status constants (DEC-024 PR 6).
//
// Centralised so the CLI, the summarizer, and tests share one source of truth
// for command id, status enum, mode enum, missing-signal identifiers,
// risk-flag identifiers, next-suggested-action sentences, and required-command
// order.

import type { VerifyStatusMode } from "./types.js";

// Stable command id used in the JSON envelope.
export const VERIFY_STATUS_COMMAND_ID = "verify.status" as const;

// Allowed --mode values.
export const SUPPORTED_MODES: readonly VerifyStatusMode[] = Object.freeze([
  "local",
  "pr",
  "combined",
]);

// Bilingual headline reused by the OK envelope.
export const HEADLINE_EN = "Verification status summarized.";
export const HEADLINE_ZH = "已汇总验证状态。";

// Required-commands canonical strings — emitted in this priority order.
export const COMMAND_LINT = "npm run lint";
export const COMMAND_TYPECHECK = "npm run typecheck";
export const COMMAND_TEST = "npm run test";
export const COMMAND_BUILD = "npm run build";
export const COMMAND_COVERAGE_PRIMARY = "npm run test:coverage";
export const COMMAND_COVERAGE_FALLBACK = "npm run coverage";
export const COMMAND_SMOKE = "bash examples/plan-to-verify/scripts/smoke.sh";

// Sentinel sentences for the verdict's nextSuggestedAction. Stable wording so
// downstream callers can branch deterministically.
export const NEXT_ACTION_READY =
  "Run the listed verification commands and prepare the final verdict.";
export const NEXT_ACTION_PARTIAL =
  "Run local verification commands and close missing acceptance evidence before final review.";
export const NEXT_ACTION_BLOCKED =
  "Investigate failing checks or missing scripts before proceeding.";
export const NEXT_ACTION_PENDING =
  "Wait for CI to complete, then re-run `ocn verify status`.";
export const NEXT_ACTION_NO_VERIFICATION_DATA =
  "Author package scripts and acceptance criteria before requesting verification.";

// Cap for individual `package.json` script command strings to prevent the
// envelope from ballooning when projects use very long inline commands.
export const SCRIPT_COMMAND_TRUNCATE = 200;

// Cap for the number of PR check items exported in the envelope.
export const PR_ITEMS_LIMIT = 5;

// Repository-relative paths used by the reader. Centralised so tests stay
// stable when paths are renamed.
export const ACCEPTANCE_RELATIVE_PATH = "docs/03-acceptance-criteria.md";
export const SMOKE_RELATIVE_PATH = "examples/plan-to-verify/scripts/smoke.sh";
