import type { SopProfile } from "../../types/sop.js";
import type { StateId } from "../../types/state.js";
import type { StepLocation } from "../../types/state-machine.js";

// PR #4 — pure state-machine functions. No I/O, no audit, no lock. The
// authoritative step ordering lives in SopProfile (`stateOrder`,
// `stepsForState`, `nextStep`) — these helpers compose it for callers.

/**
 * Find the next step from a given location, using the bundled SOP profile.
 * Returns null when there is no next step (end of REFLECT in PR #4).
 */
export function nextStepFor(
  profile: SopProfile,
  current: StepLocation,
): StepLocation | null {
  return profile.nextStep(current.stateId, current.stepId);
}

/**
 * Validate that a state pair represents a forward transition. PR #4 only
 * supports forward; backwards/rollback transitions return false.
 */
export function isForwardTransition(
  profile: SopProfile,
  from: StateId,
  to: StateId,
): boolean {
  if (from === to) return true; // step-within-state advance is "same state".
  const order = profile.stateOrder;
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  return fromIdx >= 0 && toIdx > fromIdx;
}

/**
 * Resolve `current` against the SOP profile. Returns true when the (state, step)
 * combination is one of the recognized step locations; useful for input
 * validation before mutating state.
 */
export function isKnownLocation(profile: SopProfile, current: StepLocation): boolean {
  const steps = profile.stepsForState(current.stateId);
  return steps.includes(current.stepId);
}
