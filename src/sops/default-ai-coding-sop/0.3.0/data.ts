import type { RequiredSectionDef } from "../../../types/artifact.js";
import type { StateId } from "../../../types/state.js";
import {
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_020,
  STATE_DEFS as STATE_DEFS_020,
  STATE_ORDER as STATE_ORDER_020,
  STEPS_BY_STATE as STEPS_BY_STATE_020,
  type StepDef as StepDef020,
} from "../0.2.0/data.js";

// SOP 0.3.0 — additive over 0.2.0. Introduces one new DESIGN-phase step,
// `step_logic_backbone` (artifact_logic_backbone), appended as the LAST design
// step so its required-section + structural gate must pass before PLAN/BUILD.
// This anchors the system's computation/decision graph at design time so the
// implementation cannot drift (see src/core/gate/logic-backbone-validator.ts).
//
// Adding a step is an additive SOP minor bump (CLAUDE.md §4.2): 0.2.0 stays
// frozen; new projects opt in by pinning 0.3.0. Renaming a stable id below
// would be breaking — add a new version directory instead.

export const PROFILE_ID = "default-ai-coding-sop";
export const PROFILE_VERSION = "0.3.0";
export const SCHEMA_VERSION = "1.0";

export type StepDef = StepDef020;

// States are unchanged from 0.2.0.
export const STATE_DEFS = STATE_DEFS_020;
export const STATE_ORDER: readonly StateId[] = STATE_ORDER_020;

function section(id: string, canonical: string, zh: string): RequiredSectionDef {
  return { id, canonical, aliases: [`${canonical}｜${zh}`, zh], allowedLevels: [2, 3] };
}

const LOGIC_BACKBONE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_nodes", "Nodes", "节点"),
  section("section_dependencies", "Dependencies", "依赖"),
  section("section_decision_bindings", "Decision Bindings", "判断绑定"),
  section("section_signals", "Signals", "信号"),
  section("section_graph", "Graph", "逻辑图"),
];

const LOGIC_BACKBONE_STEP: StepDef = {
  stepId: "step_logic_backbone",
  artifactPath: "docs/19-logic-backbone.md",
};

// Append the new step to the end of DESIGN; every other state is inherited
// verbatim from 0.2.0.
export const STEPS_BY_STATE: Readonly<Record<StateId, readonly StepDef[]>> = {
  ...STEPS_BY_STATE_020,
  state_design: [...STEPS_BY_STATE_020.state_design, LOGIC_BACKBONE_STEP],
};

export const REQUIRED_SECTIONS_BY_STEP: Readonly<
  Record<string, readonly RequiredSectionDef[]>
> = {
  ...REQUIRED_SECTIONS_BY_STEP_020,
  step_logic_backbone: LOGIC_BACKBONE_REQUIRED_SECTIONS,
};
