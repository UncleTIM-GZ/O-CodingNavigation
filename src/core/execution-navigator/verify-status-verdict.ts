// MVP 5 — verdict computation for `ocn verify status` (DEC-024 PR 6).
//
// Pure functions over already-collected evidence. No IO, no LLM. Same inputs
// produce byte-identical output.

import type {
  ExecStatusGitData,
  VerifyStatusAcceptance,
  VerifyStatusMissingSignal,
  VerifyStatusMode,
  VerifyStatusOverall,
  VerifyStatusRiskFlag,
  VerifyStatusScriptsPresent,
  VerifyStatusVerification,
} from "./types.js";
import {
  COMMAND_BUILD,
  COMMAND_COVERAGE_PRIMARY,
  COMMAND_LINT,
  COMMAND_SMOKE,
  COMMAND_TEST,
  COMMAND_TYPECHECK,
  NEXT_ACTION_BLOCKED,
  NEXT_ACTION_NO_VERIFICATION_DATA,
  NEXT_ACTION_PARTIAL,
  NEXT_ACTION_PENDING,
  NEXT_ACTION_READY,
} from "./verify-status-constants.js";

export interface PrSlice {
  readonly hasPr: boolean;
  readonly isDraft: boolean;
  readonly checksSummary: "success" | "failure" | "pending" | "none" | "mixed" | null;
  readonly mergeStateStatus: string | null;
  readonly riskFlags: readonly string[];
}

export interface VerdictInputs {
  readonly mode: VerifyStatusMode;
  readonly scripts: VerifyStatusScriptsPresent;
  readonly acceptance: VerifyStatusAcceptance;
  readonly git: ExecStatusGitData;
  readonly pr: PrSlice;
  readonly githubRequested: boolean;
  readonly githubUnavailable: boolean;
}

export function buildRequiredCommands(
  scripts: VerifyStatusScriptsPresent,
): readonly string[] {
  const cmds: string[] = [];
  if (scripts.lint) cmds.push(COMMAND_LINT);
  if (scripts.typecheck) cmds.push(COMMAND_TYPECHECK);
  if (scripts.test) cmds.push(COMMAND_TEST);
  if (scripts.build) cmds.push(COMMAND_BUILD);
  // Resolution rule: prefer test:coverage. The package reader resolves the
  // canonical command in scriptCommands; here we just emit the canonical
  // npm script alias humans / agents should run.
  if (scripts.coverage) cmds.push(COMMAND_COVERAGE_PRIMARY);
  if (scripts.smoke) cmds.push(COMMAND_SMOKE);
  return cmds;
}

function sortLex<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function collectMissingSignals(
  inputs: VerdictInputs,
): readonly VerifyStatusMissingSignal[] {
  const signals: VerifyStatusMissingSignal[] = [];
  if (!inputs.scripts.lint) signals.push("no-lint-script");
  if (!inputs.scripts.typecheck) signals.push("no-typecheck-script");
  if (!inputs.scripts.test) signals.push("no-test-script");
  if (!inputs.scripts.build) signals.push("no-build-script");
  if (!inputs.scripts.coverage) signals.push("no-coverage-script");
  if (!inputs.acceptance.found) signals.push("no-acceptance-criteria");
  if (inputs.acceptance.found && inputs.acceptance.coverageStatus === "missing") {
    signals.push("acceptance-evidence-missing");
  }
  if (inputs.githubRequested && inputs.githubUnavailable) {
    signals.push("pr-checks-unavailable");
  }
  if ((inputs.mode === "pr" || inputs.mode === "combined") && !inputs.githubRequested) {
    signals.push("pr-not-provided");
  }
  if (inputs.git.isGitRepo === true && inputs.git.isDirty === true) {
    signals.push("local-working-tree-dirty");
  }
  if (inputs.pr.checksSummary === "pending") signals.push("checks-pending");
  if (inputs.pr.checksSummary === "failure") signals.push("checks-failing");
  return sortLex(signals);
}

function collectRiskFlags(inputs: VerdictInputs): readonly VerifyStatusRiskFlag[] {
  const flags: string[] = [];
  if (inputs.git.isGitRepo === false) {
    if (inputs.git.reason === "git-not-found") flags.push("git-not-found");
    else flags.push("not-a-git-repository");
  } else {
    if (inputs.git.isDirty === true) flags.push("working-tree-dirty");
    if (inputs.git.reason === "no-commits") flags.push("no-commits");
    if (inputs.git.branch === null && inputs.git.head !== null) flags.push("detached-head");
  }
  if (!inputs.acceptance.found) flags.push("acceptance-file-missing");
  if (inputs.acceptance.found && inputs.acceptance.criteriaCount === 0) {
    flags.push("no-acceptance-criteria");
  }
  if (inputs.acceptance.coverageStatus === "partial") flags.push("coverage-partial");
  if (inputs.acceptance.coverageStatus === "missing") flags.push("coverage-missing");
  if (inputs.acceptance.needsHumanReview > 0) flags.push("human-review-required");
  if (inputs.githubRequested && inputs.githubUnavailable) {
    flags.push("github-evidence-unavailable");
  }
  for (const f of inputs.pr.riskFlags) flags.push(f);
  return sortLex(flags) as readonly VerifyStatusRiskFlag[];
}

function allRequired(scripts: VerifyStatusScriptsPresent): boolean {
  return scripts.lint && scripts.typecheck && scripts.test && scripts.build;
}

function noLocalScripts(scripts: VerifyStatusScriptsPresent): boolean {
  return !scripts.lint && !scripts.typecheck && !scripts.test && !scripts.build;
}

export function deriveStatus(inputs: VerdictInputs): VerifyStatusOverall {
  const cs = inputs.pr.checksSummary;
  const allReq = allRequired(inputs.scripts);
  const noLocal = noLocalScripts(inputs.scripts);
  const prAvailable = inputs.pr.hasPr;

  // Rule 1 — blocked.
  if (cs === "failure") return "blocked";
  if (
    inputs.pr.mergeStateStatus === "DIRTY" ||
    inputs.pr.mergeStateStatus === "BLOCKED" ||
    inputs.pr.mergeStateStatus === "BEHIND"
  ) {
    return "blocked";
  }
  if (inputs.acceptance.coverageStatus === "missing") return "blocked";
  if (!allReq && !prAvailable && !noLocal) return "blocked";

  // Rule 2 — pending.
  if (cs === "pending") return "pending";

  // Rule 5 (early) — no verification data at all.
  if (
    noLocal &&
    !prAvailable &&
    inputs.acceptance.coverageStatus === "no-acceptance-criteria"
  ) {
    return "no-verification-data";
  }

  // Rule 4 — ready.
  const acceptanceOk =
    (inputs.acceptance.coverageStatus === "complete" ||
      inputs.acceptance.coverageStatus === "partial") &&
    inputs.acceptance.criteriaCount > 0;
  const prOk = prAvailable ? cs === "success" && !inputs.pr.isDraft : true;
  const treeOk =
    inputs.mode === "pr" || (inputs.git.isGitRepo === true && inputs.git.isDirty === false);
  if (allReq && acceptanceOk && prOk && treeOk) return "ready";

  // Rule 3 — partial (default catch-all when some evidence exists).
  return "partial";
}

const NEXT_ACTION: Readonly<Record<VerifyStatusOverall, string>> = Object.freeze({
  ready: NEXT_ACTION_READY,
  partial: NEXT_ACTION_PARTIAL,
  blocked: NEXT_ACTION_BLOCKED,
  pending: NEXT_ACTION_PENDING,
  "no-verification-data": NEXT_ACTION_NO_VERIFICATION_DATA,
});

export function buildVerification(
  inputs: VerdictInputs,
  status: VerifyStatusOverall,
): VerifyStatusVerification {
  return {
    status,
    readyForReview: status === "ready",
    requiredCommands: buildRequiredCommands(inputs.scripts),
    missingSignals: collectMissingSignals(inputs),
    riskFlags: collectRiskFlags(inputs),
    nextSuggestedAction: NEXT_ACTION[status],
  };
}
