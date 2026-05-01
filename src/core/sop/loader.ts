import type { RequiredSectionDef } from "../../types/artifact.js";
import type { SopProfile } from "../../types/sop.js";
import type { StateId } from "../../types/state.js";
import type { StepLocation } from "../../types/state-machine.js";
import { artifactsYaml } from "../../sops/default-ai-coding-sop/0.1.0/artifacts.js";
import { defaultConfigYaml } from "../../sops/default-ai-coding-sop/0.1.0/config.js";
import {
  PROFILE_ID,
  PROFILE_VERSION,
  REQUIRED_SECTIONS_BY_STEP,
  STATE_ORDER as DATA_STATE_ORDER,
  STEPS_BY_STATE,
} from "../../sops/default-ai-coding-sop/0.1.0/data.js";
import { gatesYaml } from "../../sops/default-ai-coding-sop/0.1.0/gates.js";
import { sopYaml } from "../../sops/default-ai-coding-sop/0.1.0/sop.js";

// P1-003 — the runtime profile and the persisted .ocoding/sop.yaml now share
// a single source of truth (data.ts). The loader is a thin adapter that
// wires the canonical data into the SopProfile interface; gates.yaml,
// sop.yaml, and artifacts.yaml come from the same data via the renderer in
// `render.ts`. Adding a step requires editing data.ts only — both surfaces
// pick it up automatically.

export const STATE_ORDER: readonly StateId[] = DATA_STATE_ORDER;

function buildArtifactPathIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const state of STATE_ORDER) {
    for (const step of STEPS_BY_STATE[state]) {
      if (step.artifactPath !== null) {
        index.set(step.stepId, step.artifactPath);
      }
    }
  }
  return index;
}

function buildNextStepIndex(): Map<string, StepLocation> {
  const flat: StepLocation[] = [];
  for (const stateId of STATE_ORDER) {
    for (const step of STEPS_BY_STATE[stateId]) {
      flat.push({ stateId, stepId: step.stepId });
    }
  }
  const index = new Map<string, StepLocation>();
  for (let i = 0; i < flat.length - 1; i++) {
    const current = flat[i];
    const next = flat[i + 1];
    if (current && next) {
      index.set(current.stepId, next);
    }
  }
  return index;
}

const ARTIFACT_PATH_INDEX = buildArtifactPathIndex();
const NEXT_STEP_INDEX = buildNextStepIndex();

export function loadSopProfile(): SopProfile {
  return {
    id: PROFILE_ID,
    version: PROFILE_VERSION,
    sopYaml,
    gatesYaml,
    artifactsYaml,
    defaultConfigYaml,
    requiredSectionsForStep: (stepId: string): readonly RequiredSectionDef[] =>
      REQUIRED_SECTIONS_BY_STEP[stepId] ?? [],
    stateOrder: STATE_ORDER,
    stepsForState: (stateId: StateId): readonly string[] =>
      STEPS_BY_STATE[stateId].map((s) => s.stepId),
    nextStep: (_stateId: StateId, stepId: string): StepLocation | null =>
      NEXT_STEP_INDEX.get(stepId) ?? null,
    artifactPathForStep: (stepId: string): string | null =>
      ARTIFACT_PATH_INDEX.get(stepId) ?? null,
  };
}
