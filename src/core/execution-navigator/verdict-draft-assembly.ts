// PR-B / M5 — verdict assembly helpers extracted from verdict-draft.ts.
//
// Pure functions over a `VerdictInputs` slice. No I/O. Builds the supports /
// blocks / warnings sentence arrays, the inputs envelope, and confidence /
// human-review-required derivations.

import type {
  EvidenceMapCoverageStatus,
  EvidenceSourceUsed,
  VerdictDraftCategory,
  VerdictDraftConfidence,
  VerdictDraftInputs,
  VerdictDraftRiskFlag,
  VerdictDraftWarning,
  VerifyStatusData,
  VerifyStatusOverall,
} from "./types.js";
import {
  BLOCK_ACCEPTANCE_FILE_MISSING,
  BLOCK_ACCEPTANCE_MISSING_PREFIX,
  BLOCK_ACCEPTANCE_MISSING_SUFFIX_PLURAL,
  BLOCK_ACCEPTANCE_MISSING_SUFFIX_SINGULAR,
  BLOCK_GITHUB_EVIDENCE_UNAVAILABLE,
  BLOCK_HUMAN_REVIEW_REQUIRED,
  BLOCK_LOCAL_TREE_DIRTY,
  BLOCK_MODE_PR_WITHOUT_PR,
  BLOCK_PR_CHANGES_REQUESTED,
  BLOCK_PR_CHECKS_FAILURE_PREFIX,
  BLOCK_PR_CHECKS_FAILURE_SUFFIX,
  BLOCK_PR_CHECKS_PENDING,
  BLOCK_PR_DRAFT,
  BLOCK_PR_MERGE_STATE_UNCLEAN,
  BLOCK_VERIFICATION_BLOCKED,
  BLOCK_VERIFICATION_PARTIAL,
  CATEGORY_CONTINUE_WORK,
  CATEGORY_HOLD,
  CATEGORY_READY_FOR_REVIEW,
  CATEGORY_READY_TO_MERGE,
  CATEGORY_REQUEST_CHANGES,
  CONFIDENCE_HIGH,
  CONFIDENCE_LOW,
  CONFIDENCE_MEDIUM,
  SUPPORT_ACCEPTANCE_COMPLETE,
  SUPPORT_ACCEPTANCE_PARTIAL_NO_MISSING,
  SUPPORT_LOCAL_SCRIPTS_AVAILABLE,
  SUPPORT_LOCAL_TREE_CLEAN,
  SUPPORT_NO_CHANGES_REQUESTED,
  SUPPORT_PR_CHECKS_SUCCESS,
  SUPPORT_PR_MERGEABLE_CLEAN,
  SUPPORT_VERIFICATION_READY,
  WARNING_GITHUB_EVIDENCE_UNAVAILABLE,
  WARNING_NO_ACCEPTANCE_CRITERIA,
  WARNING_NO_LOCAL_SCRIPTS_DETECTED,
  WARNING_PR_CHECKS_UNAVAILABLE,
} from "./verdict-draft-constants.js";
import { isVerdictDraftRiskFlag } from "./verdict-draft-risk-flags.js";
import type { VerdictInputs } from "./verdict-draft-rules.js";

// Sort lexicographically and dedupe.
function sortLex<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function sortLexFlags(values: readonly VerdictDraftRiskFlag[]): readonly VerdictDraftRiskFlag[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function collectRiskFlags(inputs: VerdictInputs): readonly VerdictDraftRiskFlag[] {
  const flags: VerdictDraftRiskFlag[] = [];
  for (const f of inputs.verify.verification.riskFlags) {
    if (isVerdictDraftRiskFlag(f)) flags.push(f);
  }
  if (inputs.verify.verification.status === "blocked") flags.push("verification-blocked");
  if (inputs.verify.verification.status === "partial") flags.push("verification-partial");
  return sortLexFlags(flags);
}

// ---- Confidence calculation ----

export function deriveConfidence(
  category: VerdictDraftCategory,
  inputs: VerdictInputs,
  riskFlagCount: number,
): VerdictDraftConfidence {
  if (
    category === CATEGORY_READY_TO_MERGE &&
    riskFlagCount === 0 &&
    inputs.hasPr &&
    inputs.verify.verification.status === "ready" &&
    inputs.verify.acceptance.coverageStatus === "complete"
  ) {
    if (inputs.mode === "local") return CONFIDENCE_MEDIUM;
    return CONFIDENCE_HIGH;
  }
  if (
    (category === CATEGORY_READY_FOR_REVIEW || category === CATEGORY_READY_TO_MERGE) &&
    riskFlagCount <= 2
  ) {
    return CONFIDENCE_MEDIUM;
  }
  return CONFIDENCE_LOW;
}

// ---- Supports / blocks / warnings sentence assembly ----

export function collectSupports(inputs: VerdictInputs): readonly string[] {
  const out: string[] = [];
  const v = inputs.verify;
  const s = v.local.scripts;
  if (s.lint && s.typecheck && s.test && s.build) {
    out.push(SUPPORT_LOCAL_SCRIPTS_AVAILABLE);
  }
  if (v.pr !== null && v.pr.checksSummary === "success" && v.pr.failed === 0) {
    out.push(SUPPORT_PR_CHECKS_SUCCESS);
  }
  if (v.pr !== null && v.pr.mergeStateStatus === "CLEAN" && v.pr.mergeable === "MERGEABLE") {
    out.push(SUPPORT_PR_MERGEABLE_CLEAN);
  }
  if (v.acceptance.coverageStatus === "complete") {
    out.push(SUPPORT_ACCEPTANCE_COMPLETE);
  } else if (v.acceptance.coverageStatus === "partial" && v.acceptance.missing === 0) {
    out.push(SUPPORT_ACCEPTANCE_PARTIAL_NO_MISSING);
  }
  if (v.pr !== null && v.pr.reviews.changesRequested === 0 && v.pr.reviews.total > 0) {
    out.push(SUPPORT_NO_CHANGES_REQUESTED);
  }
  if (v.local.git.isDirty === false && v.local.git.head !== null) {
    out.push(SUPPORT_LOCAL_TREE_CLEAN);
  }
  if (v.verification.status === "ready") {
    out.push(SUPPORT_VERIFICATION_READY);
  }
  return sortLex(out);
}

function buildAcceptanceMissingSentence(missing: number): string {
  const suffix =
    missing === 1
      ? BLOCK_ACCEPTANCE_MISSING_SUFFIX_SINGULAR
      : BLOCK_ACCEPTANCE_MISSING_SUFFIX_PLURAL;
  return `${BLOCK_ACCEPTANCE_MISSING_PREFIX} ${missing} ${suffix}`;
}

function buildPrChecksFailureSentence(failed: number): string {
  return `${BLOCK_PR_CHECKS_FAILURE_PREFIX} ${failed} ${BLOCK_PR_CHECKS_FAILURE_SUFFIX}`;
}

export function collectBlocks(inputs: VerdictInputs): readonly string[] {
  const out: string[] = [];
  const v = inputs.verify;
  if (v.pr !== null && v.pr.failed > 0) {
    out.push(buildPrChecksFailureSentence(v.pr.failed));
  }
  if (v.pr !== null && v.pr.checksSummary === "pending") {
    out.push(BLOCK_PR_CHECKS_PENDING);
  }
  if (v.acceptance.coverageStatus === "missing" && v.acceptance.missing > 0) {
    out.push(buildAcceptanceMissingSentence(v.acceptance.missing));
  }
  if (v.local.git.isDirty === true) {
    out.push(BLOCK_LOCAL_TREE_DIRTY);
  }
  if (v.pr !== null && v.pr.reviews.changesRequested > 0) {
    out.push(BLOCK_PR_CHANGES_REQUESTED);
  }
  if (
    v.pr !== null &&
    (v.pr.mergeStateStatus === "DIRTY" ||
      v.pr.mergeStateStatus === "BLOCKED" ||
      v.pr.mergeStateStatus === "BEHIND")
  ) {
    out.push(BLOCK_PR_MERGE_STATE_UNCLEAN);
  }
  if (inputs.mode === "pr" && !inputs.prProvided) {
    out.push(BLOCK_MODE_PR_WITHOUT_PR);
  }
  if (v.acceptance.found === false) {
    out.push(BLOCK_ACCEPTANCE_FILE_MISSING);
  }
  if (v.verification.status === "blocked") {
    out.push(BLOCK_VERIFICATION_BLOCKED);
  } else if (v.verification.status === "partial") {
    out.push(BLOCK_VERIFICATION_PARTIAL);
  }
  if (v.acceptance.needsHumanReview > 0) {
    out.push(BLOCK_HUMAN_REVIEW_REQUIRED);
  }
  if (inputs.prProvided && inputs.githubUnavailable) {
    out.push(BLOCK_GITHUB_EVIDENCE_UNAVAILABLE);
  }
  if (v.pr !== null && v.pr.isDraft === true) {
    out.push(BLOCK_PR_DRAFT);
  }
  return sortLex(out);
}

export function collectWarnings(inputs: VerdictInputs): readonly VerdictDraftWarning[] {
  const out: VerdictDraftWarning[] = [];
  if (inputs.prProvided && inputs.githubUnavailable) {
    out.push(WARNING_GITHUB_EVIDENCE_UNAVAILABLE);
  }
  if (inputs.hasPr && inputs.verify.pr !== null && inputs.verify.pr.checksSummary === "none") {
    out.push(WARNING_PR_CHECKS_UNAVAILABLE);
  }
  if (inputs.verify.acceptance.found === false) {
    out.push(WARNING_NO_ACCEPTANCE_CRITERIA);
  }
  const s = inputs.verify.local.scripts;
  if (!s.lint && !s.typecheck && !s.test && !s.build) {
    out.push(WARNING_NO_LOCAL_SCRIPTS_DETECTED);
  }
  return sortLex(out) as readonly VerdictDraftWarning[];
}

// ---- humanReviewRequired derivation ----

export function deriveHumanReviewRequired(
  category: VerdictDraftCategory,
  confidence: VerdictDraftConfidence,
): boolean {
  if (category === CATEGORY_HOLD) return true;
  if (
    confidence === CONFIDENCE_LOW &&
    (category === CATEGORY_REQUEST_CHANGES || category === CATEGORY_CONTINUE_WORK)
  ) {
    return true;
  }
  return false;
}

// ---- Inputs slice for the envelope ----

export function deriveGitStatus(
  verify: VerifyStatusData,
): "clean" | "dirty" | "no-git" | "empty-repo" {
  const g = verify.local.git;
  if (g.isGitRepo === false) return "no-git";
  if (g.gitReason === "no-commits") return "empty-repo";
  return g.isDirty ? "dirty" : "clean";
}

export function buildInputs(inputs: VerdictInputs): VerdictDraftInputs {
  const v = inputs.verify;
  const acceptanceCoverageStatus: EvidenceMapCoverageStatus = v.acceptance.coverageStatus;
  const verificationStatus: VerifyStatusOverall = v.verification.status;
  const prState = v.pr !== null ? v.pr.state : null;
  const prChecksSummary = v.pr !== null ? v.pr.checksSummary : null;
  return {
    currentStateId: v.local.ocn.currentStateId ?? null,
    currentStepId: v.local.ocn.currentStepId ?? null,
    verificationStatus,
    acceptanceCoverageStatus,
    gitStatus: deriveGitStatus(v),
    branch: v.local.git.branch,
    head: v.local.git.head,
    prState,
    prChecksSummary,
  };
}

// ---- Evidence-sources-used derivation ----

export function buildEvidenceSourcesUsed(inputs: VerdictInputs): readonly EvidenceSourceUsed[] {
  const out: EvidenceSourceUsed[] = ["local-git", "ocn-state", "acceptance-map", "verify-status"];
  if (inputs.hasPr) out.push("github");
  return out;
}
