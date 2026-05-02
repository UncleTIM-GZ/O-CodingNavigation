import type { RequiredSectionDef } from "../../types/artifact.js";
import type { SopProfile } from "../../types/sop.js";
import type { StateId } from "../../types/state.js";
import type { StepLocation } from "../../types/state-machine.js";
import { artifactsYaml as artifactsYaml010 } from "../../sops/default-ai-coding-sop/0.1.0/artifacts.js";
import { defaultConfigYaml as defaultConfigYaml010 } from "../../sops/default-ai-coding-sop/0.1.0/config.js";
import {
  PROFILE_ID as PROFILE_ID_010,
  PROFILE_VERSION as PROFILE_VERSION_010,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_010,
  STATE_ORDER as STATE_ORDER_010,
  STEPS_BY_STATE as STEPS_BY_STATE_010,
  type StepDef as StepDef010,
} from "../../sops/default-ai-coding-sop/0.1.0/data.js";
import { gatesYaml as gatesYaml010 } from "../../sops/default-ai-coding-sop/0.1.0/gates.js";
import { sopYaml as sopYaml010 } from "../../sops/default-ai-coding-sop/0.1.0/sop.js";
import { artifactsYaml as artifactsYaml020 } from "../../sops/default-ai-coding-sop/0.2.0/artifacts.js";
import { defaultConfigYaml as defaultConfigYaml020 } from "../../sops/default-ai-coding-sop/0.2.0/config.js";
import {
  PROFILE_ID as PROFILE_ID_020,
  PROFILE_VERSION as PROFILE_VERSION_020,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_020,
  STATE_ORDER as STATE_ORDER_020,
  STEPS_BY_STATE as STEPS_BY_STATE_020,
  type StepDef as StepDef020,
} from "../../sops/default-ai-coding-sop/0.2.0/data.js";
import { gatesYaml as gatesYaml020 } from "../../sops/default-ai-coding-sop/0.2.0/gates.js";
import { sopYaml as sopYaml020 } from "../../sops/default-ai-coding-sop/0.2.0/sop.js";

// P1-003 — the runtime profile and the persisted .ocoding/sop.yaml now share
// a single source of truth (data.ts). The loader is a thin adapter that
// wires the canonical data into the SopProfile interface; gates.yaml,
// sop.yaml, and artifacts.yaml come from the same data via the renderer in
// `render.ts`. Adding a step requires editing data.ts only — both surfaces
// pick it up automatically.
//
// SOP 0.2.0 PR 3 (DEC-023) — added `loadSopProfileByVersion(version)` for
// callers that need to validate against an explicit profile version (e.g.
// the gate runner when invoked with an override profile, or unit tests
// pinning 0.2.0 enforcement). The default `loadSopProfile()` STILL returns
// 0.1.0; the runtime default does not change in PR 3. Flipping the default
// is reserved for PR 4.

// Re-export 0.1.0 STATE_ORDER for backward compatibility with existing
// imports of the runtime constant. This always reflects the default profile
// (currently 0.1.0).
export const STATE_ORDER: readonly StateId[] = STATE_ORDER_010;

export type SopProfileVersion = "0.1.0" | "0.2.0";

interface ProfileSource {
  readonly id: string;
  readonly version: SopProfileVersion;
  readonly sopYaml: string;
  readonly gatesYaml: string;
  readonly artifactsYaml: string;
  readonly defaultConfigYaml: string;
  readonly stateOrder: readonly StateId[];
  readonly stepsByState: Readonly<Record<StateId, readonly (StepDef010 | StepDef020)[]>>;
  readonly requiredSectionsByStep: Readonly<
    Record<string, readonly RequiredSectionDef[]>
  >;
}

const PROFILE_SOURCES: Readonly<Record<SopProfileVersion, ProfileSource>> = {
  "0.1.0": {
    id: PROFILE_ID_010,
    version: PROFILE_VERSION_010 as SopProfileVersion,
    sopYaml: sopYaml010,
    gatesYaml: gatesYaml010,
    artifactsYaml: artifactsYaml010,
    defaultConfigYaml: defaultConfigYaml010,
    stateOrder: STATE_ORDER_010,
    stepsByState: STEPS_BY_STATE_010,
    requiredSectionsByStep: REQUIRED_SECTIONS_BY_STEP_010,
  },
  "0.2.0": {
    id: PROFILE_ID_020,
    version: PROFILE_VERSION_020 as SopProfileVersion,
    sopYaml: sopYaml020,
    gatesYaml: gatesYaml020,
    artifactsYaml: artifactsYaml020,
    defaultConfigYaml: defaultConfigYaml020,
    stateOrder: STATE_ORDER_020,
    stepsByState: STEPS_BY_STATE_020,
    requiredSectionsByStep: REQUIRED_SECTIONS_BY_STEP_020,
  },
};

function buildArtifactPathIndex(source: ProfileSource): Map<string, string> {
  const index = new Map<string, string>();
  for (const state of source.stateOrder) {
    for (const step of source.stepsByState[state]) {
      if (step.artifactPath !== null) {
        index.set(step.stepId, step.artifactPath);
      }
    }
  }
  return index;
}

function buildNextStepIndex(source: ProfileSource): Map<string, StepLocation> {
  const flat: StepLocation[] = [];
  for (const stateId of source.stateOrder) {
    for (const step of source.stepsByState[stateId]) {
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

function buildProfile(source: ProfileSource): SopProfile {
  const artifactPathIndex = buildArtifactPathIndex(source);
  const nextStepIndex = buildNextStepIndex(source);
  return {
    id: source.id,
    version: source.version,
    sopYaml: source.sopYaml,
    gatesYaml: source.gatesYaml,
    artifactsYaml: source.artifactsYaml,
    defaultConfigYaml: source.defaultConfigYaml,
    requiredSectionsForStep: (stepId: string): readonly RequiredSectionDef[] =>
      source.requiredSectionsByStep[stepId] ?? [],
    stateOrder: source.stateOrder,
    stepsForState: (stateId: StateId): readonly string[] =>
      source.stepsByState[stateId].map((s) => s.stepId),
    nextStep: (_stateId: StateId, stepId: string): StepLocation | null =>
      nextStepIndex.get(stepId) ?? null,
    artifactPathForStep: (stepId: string): string | null =>
      artifactPathIndex.get(stepId) ?? null,
  };
}

// Cache profiles so repeated calls don't rebuild indexes.
const PROFILE_CACHE: Partial<Record<SopProfileVersion, SopProfile>> = {};

function getProfile(version: SopProfileVersion): SopProfile {
  const cached = PROFILE_CACHE[version];
  if (cached !== undefined) return cached;
  const built = buildProfile(PROFILE_SOURCES[version]);
  PROFILE_CACHE[version] = built;
  return built;
}

/**
 * Default runtime profile — pinned to 0.1.0 in SOP 0.2.0 PR 3 (DEC-023).
 * The runtime does not flip to 0.2.0 here; flipping the init default is
 * reserved for PR 4.
 */
export function loadSopProfile(): SopProfile {
  return getProfile("0.1.0");
}

/**
 * Explicit version-aware profile loader. Used by:
 *   - the gate runner when an explicit `profile` override is passed in
 *     (PR 3 introduces this path; default callers still go through
 *     `loadSopProfile()` and therefore still see 0.1.0)
 *   - unit tests that pin the 0.2.0 enforcement contract
 *   - PR 4 / PR 5 when the runtime default eventually flips
 *
 * Deterministic and typed. Throws via TypeScript at compile time for any
 * version outside the SopProfileVersion union.
 */
export function loadSopProfileByVersion(version: SopProfileVersion): SopProfile {
  return getProfile(version);
}
