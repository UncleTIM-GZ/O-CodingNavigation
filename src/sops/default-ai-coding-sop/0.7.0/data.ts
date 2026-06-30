import type { RequiredSectionDef } from "../../../types/artifact.js";
import {
  PROFILE_ID as PROFILE_ID_050,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_050,
  SCHEMA_VERSION as SCHEMA_VERSION_050,
  STATE_DEFS as STATE_DEFS_050,
  STATE_ORDER as STATE_ORDER_050,
  STEPS_BY_STATE as STEPS_BY_STATE_050,
  type StepDef as StepDef050,
} from "../0.5.0/data.js";

// SOP 0.7.0 (DEC-039) — npm/SOP-profile version unification + lockstep.
//
// Content-equal to 0.5.0 (= 0.4.0 + task backbone): states, steps, artifact
// paths, required sections, gates, and the readiness rulebook are all
// inherited from 0.5.0 unchanged. The ONLY delta is the version string: the
// SOP profile number is bumped to 0.7.0 so it tracks the npm package version
// (no SOP content change — 0.6.0 is intentionally skipped to align the
// numbers). From DEC-039 forward, npm and the SOP profile move in lockstep;
// when SOP content is unchanged a new profile version re-exports the prior
// content (as here) so pins stay stable.
//
// 0.5.0 (and 0.4.0) stay frozen and importable (`ocn init --sop-version …`).

export const PROFILE_ID = PROFILE_ID_050;
export const PROFILE_VERSION = "0.7.0";
export const SCHEMA_VERSION = SCHEMA_VERSION_050;

export type StepDef = StepDef050;

export const STATE_DEFS = STATE_DEFS_050;
export const STATE_ORDER = STATE_ORDER_050;
export const STEPS_BY_STATE = STEPS_BY_STATE_050;

export const REQUIRED_SECTIONS_BY_STEP: Readonly<Record<string, readonly RequiredSectionDef[]>> =
  REQUIRED_SECTIONS_BY_STEP_050;
