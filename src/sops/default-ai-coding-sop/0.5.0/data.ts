import type { RequiredSectionDef } from "../../../types/artifact.js";
import {
  PROFILE_ID as PROFILE_ID_040,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_040,
  SCHEMA_VERSION as SCHEMA_VERSION_040,
  STATE_DEFS as STATE_DEFS_040,
  STATE_ORDER as STATE_ORDER_040,
  STEPS_BY_STATE as STEPS_BY_STATE_040,
  type StepDef as StepDef040,
} from "../0.4.0/data.js";

// SOP 0.5.0 (AM-007 / DEC-032) — 0.4.0 + the Task Backbone.
//
// Like readiness (0.4.0), the task backbone adds NO state-machine step:
// states, steps, and artifact paths are inherited from 0.4.0 unchanged. The
// only contract delta is that `step_build_plan` gains one more required
// section — `section_task_specs` ("Task Specs｜任务规格") — whose machine-
// parsed task blocks the gate runner validates (six hard defects) and, on
// pass, freezes into `.ocoding/task-ledger.json`. Step set unchanged →
// cursor compatibility for `ocn sop upgrade` holds trivially.
//
// 0.4.0 stays frozen and importable (`ocn init --sop-version 0.4.0`).

export const PROFILE_ID = PROFILE_ID_040;
export const PROFILE_VERSION = "0.5.0";
export const SCHEMA_VERSION = SCHEMA_VERSION_040;

export type StepDef = StepDef040;

export const STATE_DEFS = STATE_DEFS_040;
export const STATE_ORDER = STATE_ORDER_040;
export const STEPS_BY_STATE = STEPS_BY_STATE_040;

// Same def shape as the other build-plan sections (0.2.0 data.ts `section()`
// helper): canonical English heading + bilingual alias forms, levels 2-3.
const TASK_SPECS_SECTION: RequiredSectionDef = {
  id: "section_task_specs",
  canonical: "Task Specs",
  aliases: ["Task Specs｜任务规格", "任务规格"],
  allowedLevels: [2, 3],
};

export const REQUIRED_SECTIONS_BY_STEP: Readonly<Record<string, readonly RequiredSectionDef[]>> = {
  ...REQUIRED_SECTIONS_BY_STEP_040,
  step_build_plan: [
    ...(REQUIRED_SECTIONS_BY_STEP_040["step_build_plan"] ?? []),
    TASK_SPECS_SECTION,
  ],
};
