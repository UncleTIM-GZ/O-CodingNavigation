import type { RequiredSectionDef } from "../../../types/artifact.js";
import type { StateId } from "../../../types/state.js";
import {
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_020,
  STATE_DEFS as STATE_DEFS_020,
  STATE_ORDER as STATE_ORDER_020,
  type StepDef as StepDef020,
} from "../0.2.0/data.js";

// SOP 0.3.0 — introduces `step_logic_backbone` (artifact_logic_backbone) and
// places it in its dependency-correct position: the DESIGN layer, immediately
// AFTER the data model and BEFORE the API contract and test strategy. The
// logic backbone is "computation on the data model" (its inputs/scores derive
// from data-model fields), and the API contract exposes its outputs while the
// test strategy tests its graph — so it must precede both. It gets file slot
// **07**; the remaining design/plan/build/verify docs shift +1 (08…19).
//
// This renumber (vs an additive slot at 19) keeps the file number equal to the
// workflow order — file 07 IS the 7th-written artifact — instead of a 19 that
// misleadingly reads as "written last". The 0.2.0 profile keeps its own
// numbering (frozen, importable). Paths are sourced from THIS data.ts via the
// profile (`artifactPathForStep`), so per-version numbering never collides.
//
// Required-section definitions for the shared steps are inherited from 0.2.0
// (sections don't change with the renumber — only artifactPath does); the
// step ids are identical, so renaming none of them is a breaking change.

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

// Explicit 0.3.0 sequence. Same step ids as 0.2.0, but logic_backbone is
// inserted after data_model and every artifact from api_contract onward shifts
// +1 (07→08 … 18→19) so file number == workflow order.
export const STEPS_BY_STATE: Readonly<Record<StateId, readonly StepDef[]>> = {
  state_discovery: [{ stepId: "step_project_brief", artifactPath: "docs/00-project-brief.md" }],
  state_spec: [
    { stepId: "step_scope", artifactPath: "docs/01-scope.md" },
    { stepId: "step_prd", artifactPath: "docs/02-prd.md" },
    { stepId: "step_acceptance_criteria", artifactPath: "docs/03-acceptance-criteria.md" },
  ],
  state_design: [
    { stepId: "step_technical_architecture", artifactPath: "docs/04-technical-architecture.md" },
    {
      stepId: "step_information_architecture",
      artifactPath: "docs/05-information-architecture.md",
    },
    { stepId: "step_data_model", artifactPath: "docs/06-data-model.md" },
    { stepId: "step_logic_backbone", artifactPath: "docs/07-logic-backbone.md" },
    { stepId: "step_api_contract", artifactPath: "docs/08-api-contract.md" },
    { stepId: "step_test_strategy", artifactPath: "docs/09-test-strategy.md" },
  ],
  state_plan: [
    { stepId: "step_mvp_plan", artifactPath: "docs/10-mvp-plan.md" },
    { stepId: "step_build_plan", artifactPath: "docs/11-build-plan.md" },
  ],
  state_build: [
    { stepId: "step_implementation_log", artifactPath: "docs/12-implementation-log.md" },
    { stepId: "step_change_evidence", artifactPath: "docs/13-change-evidence.md" },
    { stepId: "step_integration_notes", artifactPath: "docs/14-integration-notes.md" },
  ],
  state_verify: [
    { stepId: "step_verification_report", artifactPath: "docs/15-verification-report.md" },
    { stepId: "step_acceptance_mapping", artifactPath: "docs/16-acceptance-mapping.md" },
    { stepId: "step_failure_fix_log", artifactPath: "docs/17-failure-fix-log.md" },
    { stepId: "step_regression_evidence", artifactPath: "docs/18-regression-evidence.md" },
    { stepId: "step_final_build_verdict", artifactPath: "docs/19-final-build-verdict.md" },
  ],
  state_ship: [],
  state_reflect: [],
};

export const REQUIRED_SECTIONS_BY_STEP: Readonly<Record<string, readonly RequiredSectionDef[]>> = {
  ...REQUIRED_SECTIONS_BY_STEP_020,
  step_logic_backbone: LOGIC_BACKBONE_REQUIRED_SECTIONS,
};
