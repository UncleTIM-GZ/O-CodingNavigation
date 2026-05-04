// MVP 6 — verdict draft constants (DEC-024 PR 7).
//
// Centralised so the CLI, the orchestrator, the verdict logic, and tests share
// one source of truth for command id, category enum, confidence enum, mode
// enum, support-sentence templates, block-sentence templates, next-action
// sentences, warnings, and bilingual summary templates.

import type {
  VerdictDraftCategory,
  VerdictDraftConfidence,
  VerdictDraftMode,
  VerdictDraftSummary,
} from "./types.js";

// Stable command id used in the JSON envelope.
export const VERDICT_DRAFT_COMMAND_ID = "verdict.draft" as const;

// Allowed --mode values.
export const SUPPORTED_MODES: readonly VerdictDraftMode[] = Object.freeze([
  "local",
  "pr",
  "combined",
]);

// Verdict category enum, ordered by rule priority (high → low).
export const CATEGORY_HOLD: VerdictDraftCategory = "hold-for-manual-review";
export const CATEGORY_REQUEST_CHANGES: VerdictDraftCategory = "request-changes";
export const CATEGORY_CONTINUE_WORK: VerdictDraftCategory = "continue-work";
export const CATEGORY_READY_FOR_REVIEW: VerdictDraftCategory = "ready-for-review";
export const CATEGORY_READY_TO_MERGE: VerdictDraftCategory = "ready-to-merge";

// Confidence enum.
export const CONFIDENCE_LOW: VerdictDraftConfidence = "low";
export const CONFIDENCE_MEDIUM: VerdictDraftConfidence = "medium";
export const CONFIDENCE_HIGH: VerdictDraftConfidence = "high";

// Bilingual headline reused by the OK envelope.
export const HEADLINE_EN = "Evidence-derived verdict draft generated.";
export const HEADLINE_ZH = "已生成基于证据的终稿判断。";

// ---- Support sentence templates (deterministic) ----
export const SUPPORT_LOCAL_SCRIPTS_AVAILABLE =
  "All required local verification scripts are available.";
export const SUPPORT_PR_CHECKS_SUCCESS = "PR checks succeeded.";
export const SUPPORT_PR_MERGEABLE_CLEAN = "PR mergeable state is clean.";
export const SUPPORT_ACCEPTANCE_COMPLETE = "Acceptance coverage is complete.";
export const SUPPORT_ACCEPTANCE_PARTIAL_NO_MISSING =
  "Acceptance coverage is partial with no missing-status criteria.";
export const SUPPORT_NO_CHANGES_REQUESTED = "No reviews requested changes.";
export const SUPPORT_LOCAL_TREE_CLEAN = "Local working tree is clean.";
export const SUPPORT_VERIFICATION_READY = "Verification status is ready.";

// ---- Block sentence templates (deterministic) ----
export const BLOCK_PR_CHECKS_FAILURE_PREFIX = "PR checks include";
export const BLOCK_PR_CHECKS_FAILURE_SUFFIX = "failure(s).";
export const BLOCK_PR_CHECKS_PENDING = "PR has pending checks; results are not final.";
export const BLOCK_ACCEPTANCE_MISSING_PREFIX = "Acceptance coverage is missing for";
export const BLOCK_ACCEPTANCE_MISSING_SUFFIX_SINGULAR = "criterion.";
export const BLOCK_ACCEPTANCE_MISSING_SUFFIX_PLURAL = "criteria.";
export const BLOCK_LOCAL_TREE_DIRTY = "Local working tree is dirty.";
export const BLOCK_PR_CHANGES_REQUESTED = "PR has pending review(s) requesting changes.";
export const BLOCK_PR_MERGE_STATE_UNCLEAN =
  "PR merge state is unclean (DIRTY/BLOCKED/BEHIND).";
export const BLOCK_MODE_PR_WITHOUT_PR = "`--mode pr` was used without `--pr`.";
export const BLOCK_ACCEPTANCE_FILE_MISSING = "docs/03-acceptance-criteria.md is missing.";
export const BLOCK_VERIFICATION_BLOCKED = "Verification status is blocked.";
export const BLOCK_VERIFICATION_PARTIAL = "Verification status is partial.";
export const BLOCK_HUMAN_REVIEW_REQUIRED =
  "Human review is required for at least one acceptance criterion.";
export const BLOCK_GITHUB_EVIDENCE_UNAVAILABLE =
  "GitHub evidence requested but unavailable.";
export const BLOCK_PR_DRAFT = "PR is still in draft.";

// ---- Warnings (deterministic) ----
export const WARNING_GITHUB_EVIDENCE_UNAVAILABLE = "github-evidence-unavailable";
export const WARNING_PR_CHECKS_UNAVAILABLE = "pr-checks-unavailable";
export const WARNING_NO_ACCEPTANCE_CRITERIA = "no-acceptance-criteria";
export const WARNING_NO_LOCAL_SCRIPTS_DETECTED = "no-local-scripts-detected";

// ---- Next-suggested-action sentences per category ----
export const NEXT_ACTION_CONTINUE_WORK =
  "Close missing acceptance evidence and rerun verification before drafting a merge-ready verdict.";
export const NEXT_ACTION_REQUEST_CHANGES =
  "Address blocking checks or coverage gaps and re-run verification.";
export const NEXT_ACTION_READY_FOR_REVIEW =
  "Request review and continue verification once reviewers respond.";
export const NEXT_ACTION_READY_TO_MERGE =
  "Recommend merge; confirm with a human reviewer before clicking merge.";
export const NEXT_ACTION_HOLD_FOR_MANUAL_REVIEW =
  "Pause for human review before proceeding.";

export const NEXT_ACTION: Readonly<Record<VerdictDraftCategory, string>> = Object.freeze({
  "continue-work": NEXT_ACTION_CONTINUE_WORK,
  "request-changes": NEXT_ACTION_REQUEST_CHANGES,
  "ready-for-review": NEXT_ACTION_READY_FOR_REVIEW,
  "ready-to-merge": NEXT_ACTION_READY_TO_MERGE,
  "hold-for-manual-review": NEXT_ACTION_HOLD_FOR_MANUAL_REVIEW,
});

// ---- Bilingual summary templates per category ----
const SUMMARY_CONTINUE_WORK: VerdictDraftSummary = Object.freeze({
  en: "Work should continue before review because verification or evidence is incomplete.",
  zh: "在进入评审前应继续工作，因为验证或证据仍不完整。",
});

const SUMMARY_REQUEST_CHANGES: VerdictDraftSummary = Object.freeze({
  en: "Changes are required before this work can move forward.",
  zh: "在继续推进前需要请求修改。",
});

const SUMMARY_READY_FOR_REVIEW: VerdictDraftSummary = Object.freeze({
  en: "Verification looks ready; the work can be put up for human review.",
  zh: "验证已就绪，可提交人工评审。",
});

const SUMMARY_READY_TO_MERGE: VerdictDraftSummary = Object.freeze({
  en: "All evidence supports merging; confirm with a human reviewer before merging.",
  zh: "全部证据支持合并；建议人工评审确认后再合并。",
});

const SUMMARY_HOLD_FOR_MANUAL_REVIEW: VerdictDraftSummary = Object.freeze({
  en: "Manual review is required before any further automated decision.",
  zh: "在做出进一步自动判断前需要人工评审。",
});

export const SUMMARY: Readonly<Record<VerdictDraftCategory, VerdictDraftSummary>> =
  Object.freeze({
    "continue-work": SUMMARY_CONTINUE_WORK,
    "request-changes": SUMMARY_REQUEST_CHANGES,
    "ready-for-review": SUMMARY_READY_FOR_REVIEW,
    "ready-to-merge": SUMMARY_READY_TO_MERGE,
    "hold-for-manual-review": SUMMARY_HOLD_FOR_MANUAL_REVIEW,
  });
