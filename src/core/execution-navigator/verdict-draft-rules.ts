// PR-B / M5 — verdict-category rules extracted from verdict-draft.ts.
//
// Pure functions over a `VerdictInputs` slice. No I/O. Each `rule*`
// returns true when the corresponding category applies; `deriveCategory`
// composes them in priority order.

import type {
  VerdictDraftCategory,
  VerdictDraftRiskFlag,
  VerifyStatusData,
} from "./types.js";
import {
  CATEGORY_CONTINUE_WORK,
  CATEGORY_HOLD,
  CATEGORY_READY_FOR_REVIEW,
  CATEGORY_READY_TO_MERGE,
  CATEGORY_REQUEST_CHANGES,
} from "./verdict-draft-constants.js";

export interface VerdictInputs {
  readonly mode: "local" | "pr" | "combined";
  readonly verify: VerifyStatusData;
  readonly hasPr: boolean;
  readonly prProvided: boolean;
  readonly githubUnavailable: boolean;
  readonly verifyWarnings: readonly string[];
}

export function hasFlag(inputs: VerdictInputs, flag: VerdictDraftRiskFlag): boolean {
  return (inputs.verify.verification.riskFlags as readonly string[]).includes(flag);
}

// Rule 1 — hold-for-manual-review (priority 1).
export function ruleHold(inputs: VerdictInputs): boolean {
  if (inputs.verify.acceptance.needsHumanReview > 0) return true;
  if (hasFlag(inputs, "human-review-required")) return true;
  // Evidence conflicts: PR checks success but acceptance has coverage-missing.
  if (
    inputs.hasPr &&
    inputs.verify.pr !== null &&
    inputs.verify.pr.checksSummary === "success" &&
    inputs.verify.acceptance.coverageStatus === "missing"
  ) {
    return true;
  }
  // --mode combined requested but PR data unavailable AND acceptance has critical missing evidence.
  if (
    inputs.mode === "combined" &&
    inputs.prProvided &&
    inputs.githubUnavailable &&
    inputs.verify.acceptance.coverageStatus === "missing"
  ) {
    return true;
  }
  return false;
}

// Rule 2 — request-changes (priority 2).
export function ruleRequestChanges(inputs: VerdictInputs): boolean {
  if (inputs.verify.verification.status === "blocked") return true;
  if (inputs.hasPr && inputs.verify.pr !== null && inputs.verify.pr.checksSummary === "failure") {
    return true;
  }
  if (inputs.verify.acceptance.coverageStatus === "missing") return true;
  if (
    inputs.hasPr &&
    inputs.verify.pr !== null &&
    (inputs.verify.pr.mergeStateStatus === "DIRTY" ||
      inputs.verify.pr.mergeStateStatus === "BLOCKED" ||
      inputs.verify.pr.mergeStateStatus === "BEHIND")
  ) {
    return true;
  }
  if (inputs.hasPr && inputs.verify.pr !== null && inputs.verify.pr.reviews.changesRequested > 0) {
    return true;
  }
  // Significant missing evidence with source-file changes
  // (source-change-without-test-change flag AND verification not ready).
  if (
    hasFlag(inputs, "source-change-without-test-change") &&
    inputs.verify.verification.status !== "ready"
  ) {
    return true;
  }
  return false;
}

// Rule 3 — continue-work (priority 3).
export function ruleContinueWork(inputs: VerdictInputs): boolean {
  if (inputs.verify.verification.status === "partial") return true;
  if (inputs.verify.local.git.isDirty && inputs.verify.verification.status !== "ready") {
    return true;
  }
  // No PR provided in combined mode AND local repo has changed files.
  if (
    inputs.mode === "combined" &&
    !inputs.prProvided &&
    inputs.verify.local.git.changedFilesCount > 0
  ) {
    return true;
  }
  // Evidence exists but important gaps remain (e.g. acceptance partial and PR not yet open).
  if (inputs.verify.acceptance.coverageStatus === "partial" && !inputs.hasPr) {
    return true;
  }
  return false;
}

// Rule 4 — ready-for-review (priority 4).
export function ruleReadyForReview(inputs: VerdictInputs): boolean {
  if (inputs.verify.verification.status !== "ready") return false;
  const cs = inputs.verify.acceptance.coverageStatus;
  if (cs !== "complete" && cs !== "partial") return false;
  // No failed checks.
  if (inputs.hasPr && inputs.verify.pr !== null && inputs.verify.pr.checksSummary === "failure") {
    return false;
  }
  return true;
}

// Rule 5 — ready-to-merge (priority 5, most conservative).
export function ruleReadyToMerge(inputs: VerdictInputs): boolean {
  if (!inputs.prProvided) return false;
  if (!inputs.hasPr || inputs.verify.pr === null) return false;
  const pr = inputs.verify.pr;
  if (pr.state !== "OPEN") return false;
  if (pr.isDraft === true) return false;
  if (pr.mergeable !== "MERGEABLE") return false;
  if (pr.mergeStateStatus !== "CLEAN") return false;
  if (pr.checksSummary !== "success") return false;
  if (pr.failed !== 0) return false;
  if (pr.reviews.changesRequested !== 0) return false;
  const cs = inputs.verify.acceptance.coverageStatus;
  if (cs !== "complete" && cs !== "partial") return false;
  if (inputs.verify.verification.status !== "ready") return false;
  if (hasFlag(inputs, "human-review-required")) return false;
  if (hasFlag(inputs, "working-tree-dirty")) return false;
  return true;
}

export function deriveCategory(inputs: VerdictInputs): VerdictDraftCategory {
  if (ruleHold(inputs)) return CATEGORY_HOLD;
  if (ruleRequestChanges(inputs)) return CATEGORY_REQUEST_CHANGES;
  if (ruleContinueWork(inputs)) return CATEGORY_CONTINUE_WORK;
  if (ruleReadyToMerge(inputs)) return CATEGORY_READY_TO_MERGE;
  if (ruleReadyForReview(inputs)) return CATEGORY_READY_FOR_REVIEW;
  // Defensive default — when no rule matches, prefer the conservative
  // continue-work option.
  return CATEGORY_CONTINUE_WORK;
}
