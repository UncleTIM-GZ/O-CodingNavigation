import type { RequiredSectionDef } from "./artifact.js";
import type { StateId } from "./state.js";
import type { StepLocation } from "./state-machine.js";

export interface SopProfile {
  readonly id: string;
  readonly version: string;
  readonly sopYaml: string;
  readonly gatesYaml: string;
  readonly artifactsYaml: string;
  readonly defaultConfigYaml: string;

  // PR #1 — required sections for a step (used by gate-runner + check)
  readonly requiredSectionsForStep: (stepId: string) => readonly RequiredSectionDef[];

  // PR #4 — state-machine navigation + artifact path lookup
  readonly stateOrder: readonly StateId[];
  readonly stepsForState: (stateId: StateId) => readonly string[];
  /** Returns the next step in this state, or the first step of the next state.
   *  Returns null when there is no next step (terminal). */
  readonly nextStep: (stateId: StateId, stepId: string) => StepLocation | null;
  /** Project-relative artifact path for a step (e.g., "docs/02-prd.md"); null
   *  if the step has no required artifact. */
  readonly artifactPathForStep: (stepId: string) => string | null;
}
