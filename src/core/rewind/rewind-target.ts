import type { SopProfile } from "../../types/sop.js";
import type { StateId } from "../../types/state.js";
import type { StepLocation } from "../../types/state-machine.js";

// DEC-033 — pure target resolution for `ocn rewind`. The target must exist
// in the pinned profile and be STRICTLY earlier than the cursor in profile
// declaration order. Positions are derived transiently for the comparison;
// no numeric pointer is ever persisted (CLAUDE.md §4.1).

export type RewindTargetFailure =
  | "cursor_not_in_profile"
  | "target_not_in_profile"
  | "target_not_earlier";

export type RewindTargetResolution =
  | { readonly ok: true; readonly to: StepLocation }
  | { readonly ok: false; readonly failure: RewindTargetFailure };

function flattenStepOrder(profile: SopProfile): StepLocation[] {
  return profile.stateOrder.flatMap((stateId: StateId) =>
    profile.stepsForState(stateId).map((stepId) => ({ stateId, stepId })),
  );
}

export function resolveRewindTarget(
  profile: SopProfile,
  from: StepLocation,
  targetStepId: string,
): RewindTargetResolution {
  const order = flattenStepOrder(profile);
  const fromIndex = order.findIndex(
    (location) => location.stateId === from.stateId && location.stepId === from.stepId,
  );
  if (fromIndex === -1) {
    return { ok: false, failure: "cursor_not_in_profile" };
  }
  // Step ids are globally unique across states by contract (CLAUDE.md §4.2 —
  // renaming/reusing one is a breaking SOP version bump), so the first match
  // is THE match; profiles are bundled code, not runtime-editable data.
  const targetIndex = order.findIndex((location) => location.stepId === targetStepId);
  const target = targetIndex === -1 ? undefined : order[targetIndex];
  if (target === undefined) {
    return { ok: false, failure: "target_not_in_profile" };
  }
  if (targetIndex >= fromIndex) {
    return { ok: false, failure: "target_not_earlier" };
  }
  return { ok: true, to: target };
}
