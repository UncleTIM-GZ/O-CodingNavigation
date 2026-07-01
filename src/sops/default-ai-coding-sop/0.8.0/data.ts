import type { RequiredSectionDef } from "../../../types/artifact.js";
import {
  PROFILE_ID as PROFILE_ID_070,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_070,
  SCHEMA_VERSION as SCHEMA_VERSION_070,
  STATE_DEFS as STATE_DEFS_070,
  STATE_ORDER as STATE_ORDER_070,
  STEPS_BY_STATE as STEPS_BY_STATE_070,
  type StepDef as StepDef070,
} from "../0.7.0/data.js";

// SOP 0.8.0 (AM-015 / DEC-041) — 0.7.0 + the Acceptance Backbone.
//
// Like the task backbone (0.5.0), the acceptance backbone adds NO state-machine
// step: states, steps, and artifact paths are inherited from 0.7.0 unchanged.
// The only contract delta is that `step_acceptance_criteria` gains one more
// required section — `section_acceptance_specs` ("Acceptance Specs｜验收规格") —
// whose machine-parsed spec blocks the gate runner validates (structural
// defects) and, on pass, freezes into `.ocoding/acceptance-specs.json` (the
// canonical machine source of AC ids for build-plan `traces`). Step set
// unchanged → cursor compatibility for `ocn sop upgrade` holds trivially
// (the section is added to an already-existing SPEC-phase step).
//
// 0.7.0 (and earlier) stay frozen and importable (`ocn init --sop-version …`).

export const PROFILE_ID = PROFILE_ID_070;
export const PROFILE_VERSION = "0.8.0";
export const SCHEMA_VERSION = SCHEMA_VERSION_070;

export type StepDef = StepDef070;

export const STATE_DEFS = STATE_DEFS_070;
export const STATE_ORDER = STATE_ORDER_070;
export const STEPS_BY_STATE = STEPS_BY_STATE_070;

// Same def shape as the other acceptance sections (0.2.0 data.ts `section()`
// helper): canonical English heading + bilingual alias forms, levels 2-3.
const ACCEPTANCE_SPECS_SECTION: RequiredSectionDef = {
  id: "section_acceptance_specs",
  canonical: "Acceptance Specs",
  aliases: ["Acceptance Specs｜验收规格", "验收规格"],
  allowedLevels: [2, 3],
};

export const REQUIRED_SECTIONS_BY_STEP: Readonly<Record<string, readonly RequiredSectionDef[]>> = {
  ...REQUIRED_SECTIONS_BY_STEP_070,
  step_acceptance_criteria: [
    ...(REQUIRED_SECTIONS_BY_STEP_070["step_acceptance_criteria"] ?? []),
    ACCEPTANCE_SPECS_SECTION,
  ],
};
