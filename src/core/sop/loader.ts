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
import { artifactsYaml as artifactsYaml030 } from "../../sops/default-ai-coding-sop/0.3.0/artifacts.js";
import { defaultConfigYaml as defaultConfigYaml030 } from "../../sops/default-ai-coding-sop/0.3.0/config.js";
import {
  PROFILE_ID as PROFILE_ID_030,
  PROFILE_VERSION as PROFILE_VERSION_030,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_030,
  STATE_ORDER as STATE_ORDER_030,
  STEPS_BY_STATE as STEPS_BY_STATE_030,
} from "../../sops/default-ai-coding-sop/0.3.0/data.js";
import { gatesYaml as gatesYaml030 } from "../../sops/default-ai-coding-sop/0.3.0/gates.js";
import { sopYaml as sopYaml030 } from "../../sops/default-ai-coding-sop/0.3.0/sop.js";
import { artifactsYaml as artifactsYaml040 } from "../../sops/default-ai-coding-sop/0.4.0/artifacts.js";
import { defaultConfigYaml as defaultConfigYaml040 } from "../../sops/default-ai-coding-sop/0.4.0/config.js";
import {
  PROFILE_ID as PROFILE_ID_040,
  PROFILE_VERSION as PROFILE_VERSION_040,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_040,
  STATE_ORDER as STATE_ORDER_040,
  STEPS_BY_STATE as STEPS_BY_STATE_040,
} from "../../sops/default-ai-coding-sop/0.4.0/data.js";
import { gatesYaml as gatesYaml040 } from "../../sops/default-ai-coding-sop/0.4.0/gates.js";
import { readinessYaml as readinessYaml040 } from "../../sops/default-ai-coding-sop/0.4.0/readiness.js";
import { sopYaml as sopYaml040 } from "../../sops/default-ai-coding-sop/0.4.0/sop.js";
import { artifactsYaml as artifactsYaml050 } from "../../sops/default-ai-coding-sop/0.5.0/artifacts.js";
import { defaultConfigYaml as defaultConfigYaml050 } from "../../sops/default-ai-coding-sop/0.5.0/config.js";
import {
  PROFILE_ID as PROFILE_ID_050,
  PROFILE_VERSION as PROFILE_VERSION_050,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_050,
  STATE_ORDER as STATE_ORDER_050,
  STEPS_BY_STATE as STEPS_BY_STATE_050,
} from "../../sops/default-ai-coding-sop/0.5.0/data.js";
import { gatesYaml as gatesYaml050 } from "../../sops/default-ai-coding-sop/0.5.0/gates.js";
import { readinessYaml as readinessYaml050 } from "../../sops/default-ai-coding-sop/0.5.0/readiness.js";
import { sopYaml as sopYaml050 } from "../../sops/default-ai-coding-sop/0.5.0/sop.js";

// P1-003 — the runtime profile and the persisted .ocoding/sop.yaml share a
// single source of truth (data.ts). The loader is a thin adapter that wires
// the canonical data into the SopProfile interface; gates.yaml, sop.yaml,
// and artifacts.yaml come from the same data via the renderer in
// `render.ts`. Adding a step requires editing data.ts only — both surfaces
// pick it up automatically.
//
// SOP 0.5.0 (AM-007, DEC-032) — runtime cutover: `loadSopProfile()` now
// returns 0.5.0 by default (= 0.4.0 + task backbone). Fresh `ocn init` pins
// 0.5.0; the build-plan gate requires section_task_specs and freezes the
// task ledger on pass. Older pins are honored at runtime via
// `resolveProfileForProject` and migrate forward with `ocn sop upgrade`
// (DEC-029) — no silent fallback to the default profile anymore.

// Re-export STATE_ORDER for backward compatibility with existing imports of
// the runtime constant. Always reflects the default profile. (0.5.0 keeps the
// same 8 states and 20 steps as 0.3.0/0.4.0; only the build-plan section
// gate + task ledger are new.)
export const STATE_ORDER: readonly StateId[] = STATE_ORDER_050;

export type SopProfileVersion = "0.1.0" | "0.2.0" | "0.3.0" | "0.4.0" | "0.5.0";

interface ProfileSource {
  readonly id: string;
  readonly version: SopProfileVersion;
  readonly sopYaml: string;
  readonly gatesYaml: string;
  readonly artifactsYaml: string;
  readonly defaultConfigYaml: string;
  /** AM-004 — bundled readiness rulebook (0.4.0+ only). */
  readonly readinessYaml?: string;
  readonly stateOrder: readonly StateId[];
  readonly stepsByState: Readonly<Record<StateId, readonly (StepDef010 | StepDef020)[]>>;
  readonly requiredSectionsByStep: Readonly<Record<string, readonly RequiredSectionDef[]>>;
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
  // SOP 0.3.0 — 0.2.0 + step_logic_backbone. The runtime default (AM-003).
  "0.3.0": {
    id: PROFILE_ID_030,
    version: PROFILE_VERSION_030 as SopProfileVersion,
    sopYaml: sopYaml030,
    gatesYaml: gatesYaml030,
    artifactsYaml: artifactsYaml030,
    defaultConfigYaml: defaultConfigYaml030,
    stateOrder: STATE_ORDER_030,
    stepsByState: STEPS_BY_STATE_030,
    requiredSectionsByStep: REQUIRED_SECTIONS_BY_STEP_030,
  },
  // SOP 0.4.0 — 0.3.0 + readiness cross-cutting gate (AM-004 / DEC-028).
  // Runtime default DEC-030 → DEC-032; now frozen + importable.
  "0.4.0": {
    id: PROFILE_ID_040,
    version: PROFILE_VERSION_040 as SopProfileVersion,
    sopYaml: sopYaml040,
    gatesYaml: gatesYaml040,
    artifactsYaml: artifactsYaml040,
    defaultConfigYaml: defaultConfigYaml040,
    readinessYaml: readinessYaml040,
    stateOrder: STATE_ORDER_040,
    stepsByState: STEPS_BY_STATE_040,
    requiredSectionsByStep: REQUIRED_SECTIONS_BY_STEP_040,
  },
  // SOP 0.5.0 — 0.4.0 + task backbone (AM-007 / DEC-032). The runtime default.
  "0.5.0": {
    id: PROFILE_ID_050,
    version: PROFILE_VERSION_050 as SopProfileVersion,
    sopYaml: sopYaml050,
    gatesYaml: gatesYaml050,
    artifactsYaml: artifactsYaml050,
    defaultConfigYaml: defaultConfigYaml050,
    readinessYaml: readinessYaml050,
    stateOrder: STATE_ORDER_050,
    stepsByState: STEPS_BY_STATE_050,
    requiredSectionsByStep: REQUIRED_SECTIONS_BY_STEP_050,
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
    ...(source.readinessYaml !== undefined ? { readinessYaml: source.readinessYaml } : {}),
    requiredSectionsForStep: (stepId: string): readonly RequiredSectionDef[] =>
      source.requiredSectionsByStep[stepId] ?? [],
    stateOrder: source.stateOrder,
    stepsForState: (stateId: StateId): readonly string[] =>
      source.stepsByState[stateId].map((s) => s.stepId),
    nextStep: (_stateId: StateId, stepId: string): StepLocation | null =>
      nextStepIndex.get(stepId) ?? null,
    artifactPathForStep: (stepId: string): string | null => artifactPathIndex.get(stepId) ?? null,
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

/** DEC-029 — every bundled profile version, in registry order. */
export const KNOWN_SOP_PROFILE_VERSIONS = Object.keys(
  PROFILE_SOURCES,
) as readonly SopProfileVersion[];

export function isKnownSopProfileVersion(version: string): version is SopProfileVersion {
  return version in PROFILE_SOURCES;
}

/**
 * Default runtime profile — flipped to 0.5.0 (DEC-032); prior defaults were
 * 0.4.0 (DEC-030), 0.3.0 (AM-003 / DEC-025) and 0.2.0 (DEC-023). Every
 * runtime path (init, status, brief, check, gate, advance, MCP) reads this
 * loader by default and therefore sees 0.5.0 (= 0.4.0 + task backbone) from
 * this commit forward.
 */
export const DEFAULT_SOP_PROFILE_VERSION: SopProfileVersion = "0.5.0";

export function loadSopProfile(): SopProfile {
  return getProfile(DEFAULT_SOP_PROFILE_VERSION);
}

/**
 * Explicit version-aware profile loader. Used by:
 *   - tests that pin a specific profile version
 *   - the gate runner when callers want to validate against a non-default
 *     profile
 *
 * Deterministic and typed. Compile-time error for any version outside the
 * SopProfileVersion union.
 */
export function loadSopProfileByVersion(version: SopProfileVersion): SopProfile {
  return getProfile(version);
}

/**
 * Pin resolution (DEC-030). A project's pinned version is honored whenever it
 * is a known bundled profile — a 0.3.0-pinned repo keeps 0.3.0 behavior (no
 * readiness gate) until the human runs `ocn sop upgrade` (DEC-029). Before
 * the 0.4.0 cutover this honored only readiness-carrying pins (AM-004
 * minimal form); honoring every known pin is required now, otherwise older
 * pins would silently fall back to the 0.4.0 default and hit the readiness
 * gate without ever opting in. Unknown pins (corrupt / future) fall back to
 * the default profile.
 */
export function resolveProfileForProject(pinnedVersion: string): SopProfile {
  if (isKnownSopProfileVersion(pinnedVersion)) {
    return getProfile(pinnedVersion);
  }
  return loadSopProfile();
}
