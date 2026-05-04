// MVP 6 — verdict draft generator (DEC-024 PR 7).
//
// Read-only orchestrator. Composes existing readers (local git, OCN state,
// acceptance evidence map, verification status, optional GitHub PR) into a
// deterministic evidence-derived verdict draft. No LLM, no mutation, no file
// writes, no command execution. Pure assembly: same inputs produce
// byte-identical JSON.
//
// Decision philosophy: conservative — when rules are ambiguous, default
// toward `hold-for-manual-review` or `continue-work` over `ready-to-merge`.
// The command does NOT auto-decide; it produces an auditable draft to help a
// human decide.

import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import { summarizeVerifyStatus } from "./verify-status.js";
import type { GhRunner } from "./github-pr-runner.js";
import type {
  EvidenceMapCoverageStatus,
  EvidenceSourceUsed,
  VerdictDraftCategory,
  VerdictDraftConfidence,
  VerdictDraftData,
  VerdictDraftInputs,
  VerdictDraftMode,
  VerdictDraftRiskFlag,
  VerdictDraftVerdict,
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
  HEADLINE_EN,
  HEADLINE_ZH,
  NEXT_ACTION,
  SUMMARY,
  SUPPORT_ACCEPTANCE_COMPLETE,
  SUPPORT_ACCEPTANCE_PARTIAL_NO_MISSING,
  SUPPORT_LOCAL_SCRIPTS_AVAILABLE,
  SUPPORT_LOCAL_TREE_CLEAN,
  SUPPORT_NO_CHANGES_REQUESTED,
  SUPPORT_PR_CHECKS_SUCCESS,
  SUPPORT_PR_MERGEABLE_CLEAN,
  SUPPORT_VERIFICATION_READY,
  VERDICT_DRAFT_COMMAND_ID,
  WARNING_GITHUB_EVIDENCE_UNAVAILABLE,
  WARNING_NO_ACCEPTANCE_CRITERIA,
  WARNING_NO_LOCAL_SCRIPTS_DETECTED,
  WARNING_PR_CHECKS_UNAVAILABLE,
} from "./verdict-draft-constants.js";

export interface VerdictDraftOptions {
  readonly cwd: string;
  readonly mode: VerdictDraftMode;
  readonly prNumber?: number;
  readonly runner?: GhRunner;
}

// Sort lexicographically and dedupe.
function sortLex<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// ---- Verdict derivation rules ----

interface VerdictInputs {
  readonly mode: VerdictDraftMode;
  readonly verify: VerifyStatusData;
  readonly hasPr: boolean;
  readonly prProvided: boolean;
  readonly githubUnavailable: boolean;
  readonly verifyWarnings: readonly string[];
}

function hasFlag(
  inputs: VerdictInputs,
  flag: VerdictDraftRiskFlag,
): boolean {
  return (inputs.verify.verification.riskFlags as readonly string[]).includes(flag);
}

// Rule 1 — hold-for-manual-review (priority 1).
function ruleHold(inputs: VerdictInputs): boolean {
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
function ruleRequestChanges(inputs: VerdictInputs): boolean {
  if (inputs.verify.verification.status === "blocked") return true;
  if (
    inputs.hasPr &&
    inputs.verify.pr !== null &&
    inputs.verify.pr.checksSummary === "failure"
  ) {
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
  if (
    inputs.hasPr &&
    inputs.verify.pr !== null &&
    inputs.verify.pr.reviews.changesRequested > 0
  ) {
    return true;
  }
  // Significant missing evidence with source-file changes (source-change-without-test-change
  // flag AND verification not ready).
  if (
    hasFlag(inputs, "source-change-without-test-change") &&
    inputs.verify.verification.status !== "ready"
  ) {
    return true;
  }
  return false;
}

// Rule 3 — continue-work (priority 3).
function ruleContinueWork(inputs: VerdictInputs): boolean {
  if (inputs.verify.verification.status === "partial") return true;
  if (
    inputs.verify.local.git.isDirty &&
    inputs.verify.verification.status !== "ready"
  ) {
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
  if (
    inputs.verify.acceptance.coverageStatus === "partial" &&
    !inputs.hasPr
  ) {
    return true;
  }
  return false;
}

// Rule 4 — ready-for-review (priority 4).
function ruleReadyForReview(inputs: VerdictInputs): boolean {
  if (inputs.verify.verification.status !== "ready") return false;
  const cs = inputs.verify.acceptance.coverageStatus;
  if (cs !== "complete" && cs !== "partial") return false;
  // No failed checks.
  if (
    inputs.hasPr &&
    inputs.verify.pr !== null &&
    inputs.verify.pr.checksSummary === "failure"
  ) {
    return false;
  }
  return true;
}

// Rule 5 — ready-to-merge (priority 5, most conservative).
function ruleReadyToMerge(inputs: VerdictInputs): boolean {
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

// ---- Confidence calculation ----

export function deriveConfidence(
  category: VerdictDraftCategory,
  inputs: VerdictInputs,
  riskFlagCount: number,
): VerdictDraftConfidence {
  // High — only on a complete happy-path ready-to-merge with zero risk flags
  // AND PR fetched successfully AND verification ready AND acceptance complete.
  if (
    category === CATEGORY_READY_TO_MERGE &&
    riskFlagCount === 0 &&
    inputs.hasPr &&
    inputs.verify.verification.status === "ready" &&
    inputs.verify.acceptance.coverageStatus === "complete"
  ) {
    // Local mode cannot reach high (no PR data even possible).
    if (inputs.mode === "local") return CONFIDENCE_MEDIUM;
    return CONFIDENCE_HIGH;
  }
  // Medium — ready-for-review or ready-to-merge with up to 2 non-blocking flags.
  if (
    (category === CATEGORY_READY_FOR_REVIEW ||
      category === CATEGORY_READY_TO_MERGE) &&
    riskFlagCount <= 2
  ) {
    return CONFIDENCE_MEDIUM;
  }
  return CONFIDENCE_LOW;
}

// ---- Risk flag aggregation ----

function collectRiskFlags(inputs: VerdictInputs): readonly VerdictDraftRiskFlag[] {
  const flags: string[] = [];
  for (const f of inputs.verify.verification.riskFlags) flags.push(f);
  if (inputs.verify.verification.status === "blocked") flags.push("verification-blocked");
  if (inputs.verify.verification.status === "partial") flags.push("verification-partial");
  return sortLex(flags) as readonly VerdictDraftRiskFlag[];
}

// ---- Supports / blocks / warnings sentence assembly ----

function collectSupports(inputs: VerdictInputs): readonly string[] {
  const out: string[] = [];
  const v = inputs.verify;
  // Required local scripts available — all four (lint/typecheck/test/build).
  const s = v.local.scripts;
  if (s.lint && s.typecheck && s.test && s.build) {
    out.push(SUPPORT_LOCAL_SCRIPTS_AVAILABLE);
  }
  // PR checks succeeded.
  if (v.pr !== null && v.pr.checksSummary === "success" && v.pr.failed === 0) {
    out.push(SUPPORT_PR_CHECKS_SUCCESS);
  }
  // PR mergeable state is clean.
  if (v.pr !== null && v.pr.mergeStateStatus === "CLEAN" && v.pr.mergeable === "MERGEABLE") {
    out.push(SUPPORT_PR_MERGEABLE_CLEAN);
  }
  // Acceptance complete vs partial-no-missing.
  if (v.acceptance.coverageStatus === "complete") {
    out.push(SUPPORT_ACCEPTANCE_COMPLETE);
  } else if (
    v.acceptance.coverageStatus === "partial" &&
    v.acceptance.missing === 0
  ) {
    out.push(SUPPORT_ACCEPTANCE_PARTIAL_NO_MISSING);
  }
  // No reviews requested changes.
  if (v.pr !== null && v.pr.reviews.changesRequested === 0 && v.pr.reviews.total > 0) {
    out.push(SUPPORT_NO_CHANGES_REQUESTED);
  }
  // Local working tree clean.
  if (v.local.git.isDirty === false && v.local.git.head !== null) {
    out.push(SUPPORT_LOCAL_TREE_CLEAN);
  }
  // Verification ready.
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

function collectBlocks(inputs: VerdictInputs): readonly string[] {
  const out: string[] = [];
  const v = inputs.verify;
  // PR check failures — quantified.
  if (v.pr !== null && v.pr.failed > 0) {
    out.push(buildPrChecksFailureSentence(v.pr.failed));
  }
  // PR pending checks (no failures yet but not final).
  if (v.pr !== null && v.pr.checksSummary === "pending") {
    out.push(BLOCK_PR_CHECKS_PENDING);
  }
  // Acceptance missing — singular vs plural based on count.
  if (v.acceptance.coverageStatus === "missing" && v.acceptance.missing > 0) {
    out.push(buildAcceptanceMissingSentence(v.acceptance.missing));
  }
  // Working tree dirty.
  if (v.local.git.isDirty === true) {
    out.push(BLOCK_LOCAL_TREE_DIRTY);
  }
  // PR has reviews requesting changes.
  if (v.pr !== null && v.pr.reviews.changesRequested > 0) {
    out.push(BLOCK_PR_CHANGES_REQUESTED);
  }
  // PR merge state unclean.
  if (
    v.pr !== null &&
    (v.pr.mergeStateStatus === "DIRTY" ||
      v.pr.mergeStateStatus === "BLOCKED" ||
      v.pr.mergeStateStatus === "BEHIND")
  ) {
    out.push(BLOCK_PR_MERGE_STATE_UNCLEAN);
  }
  // --mode pr without --pr — this would actually short-circuit at validation,
  // but we still emit the block for any caller that bypassed validation.
  if (inputs.mode === "pr" && !inputs.prProvided) {
    out.push(BLOCK_MODE_PR_WITHOUT_PR);
  }
  // Acceptance file missing.
  if (v.acceptance.found === false) {
    out.push(BLOCK_ACCEPTANCE_FILE_MISSING);
  }
  // Verification status sentences.
  if (v.verification.status === "blocked") {
    out.push(BLOCK_VERIFICATION_BLOCKED);
  } else if (v.verification.status === "partial") {
    out.push(BLOCK_VERIFICATION_PARTIAL);
  }
  // Human-review-required block sentence.
  if (v.acceptance.needsHumanReview > 0) {
    out.push(BLOCK_HUMAN_REVIEW_REQUIRED);
  }
  // GitHub evidence unavailable when requested.
  if (inputs.prProvided && inputs.githubUnavailable) {
    out.push(BLOCK_GITHUB_EVIDENCE_UNAVAILABLE);
  }
  // PR is draft.
  if (v.pr !== null && v.pr.isDraft === true) {
    out.push(BLOCK_PR_DRAFT);
  }
  return sortLex(out);
}

function collectWarnings(inputs: VerdictInputs): readonly VerdictDraftWarning[] {
  const out: VerdictDraftWarning[] = [];
  if (inputs.prProvided && inputs.githubUnavailable) {
    out.push(WARNING_GITHUB_EVIDENCE_UNAVAILABLE);
  }
  // PR provided successfully but no checks data attached (e.g. checks=null).
  if (inputs.hasPr && inputs.verify.pr !== null && inputs.verify.pr.checksSummary === "none") {
    out.push(WARNING_PR_CHECKS_UNAVAILABLE);
  }
  if (inputs.verify.acceptance.found === false) {
    out.push(WARNING_NO_ACCEPTANCE_CRITERIA);
  }
  // No local scripts at all.
  const s = inputs.verify.local.scripts;
  if (!s.lint && !s.typecheck && !s.test && !s.build) {
    out.push(WARNING_NO_LOCAL_SCRIPTS_DETECTED);
  }
  return sortLex(out) as readonly VerdictDraftWarning[];
}

// ---- humanReviewRequired derivation ----

function deriveHumanReviewRequired(
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

function deriveGitStatus(
  verify: VerifyStatusData,
): "clean" | "dirty" | "no-git" | "empty-repo" {
  const g = verify.local.git;
  if (g.head === null && g.branch === null) return "empty-repo";
  if (g.head === null) return "no-git";
  return g.isDirty ? "dirty" : "clean";
}

function buildInputs(inputs: VerdictInputs): VerdictDraftInputs {
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

function buildEvidenceSourcesUsed(inputs: VerdictInputs): readonly EvidenceSourceUsed[] {
  const out: EvidenceSourceUsed[] = ["local-git", "ocn-state", "acceptance-map", "verify-status"];
  if (inputs.hasPr) out.push("github");
  return out;
}

// ---- Top-level orchestrator ----

export async function generateVerdictDraft(
  opts: VerdictDraftOptions,
): Promise<CommandResult<VerdictDraftData>> {
  // Reuse verify-status which already composes local-git, ocn-state,
  // acceptance-map, and optional GitHub PR — saves duplicating IO and keeps
  // the verdict draft byte-deterministic against the same inputs.
  const verifyResult = await summarizeVerifyStatus({
    cwd: opts.cwd,
    mode: opts.mode,
    ...(opts.prNumber !== undefined ? { prNumber: opts.prNumber } : {}),
    ...(opts.runner !== undefined ? { runner: opts.runner } : {}),
  });
  // verify-status never blocks for evidence; if its envelope is somehow
  // not ok we surface the failure to the caller verbatim.
  if (verifyResult.ok !== true || verifyResult.data === undefined) {
    // Failure surface — pass through verbatim. CommandResult<T> is union;
    // cast through unknown to keep the failure data attached.
    return verifyResult as unknown as CommandResult<VerdictDraftData>;
  }

  const verify = verifyResult.data;
  const hasPr = verify.pr !== null;
  const prProvided = typeof opts.prNumber === "number" && opts.mode !== "local";
  const githubUnavailable =
    prProvided && verify.warnings.some((w) => w.startsWith("github-evidence-unavailable"));
  const verifyWarnings = verify.warnings;

  const verdictInputs: VerdictInputs = {
    mode: opts.mode,
    verify,
    hasPr,
    prProvided,
    githubUnavailable,
    verifyWarnings,
  };

  const category = deriveCategory(verdictInputs);
  const riskFlags = collectRiskFlags(verdictInputs);
  const confidence = deriveConfidence(category, verdictInputs, riskFlags.length);
  const supports = collectSupports(verdictInputs);
  const blocks = collectBlocks(verdictInputs);
  const warnings = collectWarnings(verdictInputs);
  const humanReviewRequired = deriveHumanReviewRequired(category, confidence);

  const verdict: VerdictDraftVerdict = {
    category,
    confidence,
    summary: SUMMARY[category],
    supports,
    blocks,
    humanReviewRequired,
    nextSuggestedAction: NEXT_ACTION[category],
  };

  const data: VerdictDraftData = {
    command: VERDICT_DRAFT_COMMAND_ID,
    implemented: true,
    noMutation: true,
    mode: opts.mode,
    evidenceSourcesUsed: buildEvidenceSourcesUsed(verdictInputs),
    verdict,
    inputs: buildInputs(verdictInputs),
    riskFlags,
    warnings,
  };

  return ok(msg(HEADLINE_EN, HEADLINE_ZH), data);
}
