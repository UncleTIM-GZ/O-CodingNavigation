import {
  PROFILE_ID as PROFILE_ID_030,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_030,
  SCHEMA_VERSION as SCHEMA_VERSION_030,
  STATE_DEFS as STATE_DEFS_030,
  STATE_ORDER as STATE_ORDER_030,
  STEPS_BY_STATE as STEPS_BY_STATE_030,
  type StepDef as StepDef030,
} from "../0.3.0/data.js";

// SOP 0.4.0 (AM-004 / DEC-028) — 0.3.0 + the readiness cross-cutting gate.
//
// Unlike 0.3.0 (which added a step), readiness is NOT a state-machine step:
// it validates the OTHER artifacts plus repository facts against a role-based
// rulebook (see ./readiness.ts), so states, steps, artifact paths, and
// required sections are all inherited from 0.3.0 unchanged. The only profile
// delta is the bundled readiness rulebook, which the gate runner evaluates
// after the section (and logic-backbone) gates on every check/advance.
//
// 0.3.0 stays frozen and importable; the runtime default is NOT flipped here
// (per the build plan, the cutover to 0.4.0 is a separate DEC).

export const PROFILE_ID = PROFILE_ID_030;
export const PROFILE_VERSION = "0.4.0";
export const SCHEMA_VERSION = SCHEMA_VERSION_030;

export type StepDef = StepDef030;

export const STATE_DEFS = STATE_DEFS_030;
export const STATE_ORDER = STATE_ORDER_030;
export const STEPS_BY_STATE = STEPS_BY_STATE_030;
export const REQUIRED_SECTIONS_BY_STEP = REQUIRED_SECTIONS_BY_STEP_030;
