import type { StateId } from "./state.js";

// PR #4 — types shared across gate-runner and advance-state.

/**
 * GateStatus carries the result of running an artifact gate against the
 * current step's required sections. `not_applicable` covers steps that have
 * no required artifact (BUILD/VERIFY/SHIP/REFLECT step stubs in PR #4).
 */
export type GateStatus = "pass" | "warning" | "blocked" | "not_applicable";

/**
 * GateResult is the structured output of `runGate(opts)` and the `--json`
 * payload for `ocn gate`.
 */
export interface GateResult {
  readonly status: GateStatus;
  readonly currentStateId: StateId;
  readonly currentStepId: string;
  readonly artifactPath?: string;
  readonly missingRequiredSectionIds?: readonly string[];
  readonly blockingReasons?: readonly string[];
}

/**
 * StepLocation identifies a single step in the state machine.
 */
export interface StepLocation {
  readonly stateId: StateId;
  readonly stepId: string;
}

/**
 * AdvanceResult captures the outcome of `advanceState(opts)`. On success,
 * `from` and `to` describe the transition. On block, `gate` carries why.
 */
export interface AdvanceResult {
  readonly from: StepLocation;
  readonly to?: StepLocation;
  readonly gate?: GateResult;
  readonly correlationId: string;
}

/**
 * RewindResult captures the outcome of `rewindState(opts)` (DEC-033). On
 * success, `from`/`to` describe the backwards move and `reason` echoes the
 * mandatory human-supplied justification.
 */
export interface RewindResult {
  readonly from: StepLocation;
  readonly to?: StepLocation;
  readonly reason?: string;
  readonly correlationId: string;
}

/**
 * CycleResult captures the outcome of `cycleNew(opts)` (DEC-033). On success,
 * `round` is the archived round's number (also the archive dir name prefix —
 * ruling ②: the directory name is the round counter, no schema field) and
 * `archivePath` is project-relative.
 */
export interface CycleResult {
  readonly from: StepLocation;
  readonly to?: StepLocation;
  readonly round?: number;
  readonly archivePath?: string;
  readonly correlationId: string;
}
