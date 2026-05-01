import type { RequiredSectionDef } from "../../../types/artifact.js";
import type { StateId } from "../../../types/state.js";

// P1-003 — single canonical source of truth for the default-ai-coding-sop 0.1.0
// profile. Every consumer (runtime loader, persisted YAML renderer, init,
// detect_sop_version) reads from here. Splitting the data out of loader.ts
// closes the historical drift between the runtime profile and the bundled
// YAML snapshots; cf. docs/reports/2026-04-30-post-alpha-codex-audit.md §3
// P1-003.
//
// Renaming any stable id below is an SOP-version-breaking change per
// CLAUDE.md §4.2 — bump the profile version and add a CHANGELOG entry, do
// not rename in place.

export const PROFILE_ID = "default-ai-coding-sop";
export const PROFILE_VERSION = "0.1.0";
export const SCHEMA_VERSION = "1.0";

export interface StateDef {
  readonly id: StateId;
  readonly name: string;
  readonly purpose: string;
}

export interface StepDef {
  readonly stepId: string;
  /** Project-relative artifact path (or null if the step has no required artifact). */
  readonly artifactPath: string | null;
}

export const STATE_DEFS: readonly StateDef[] = [
  {
    id: "state_discovery",
    name: "DISCOVERY",
    purpose: "Frame the problem, scope, and project brief.",
  },
  {
    id: "state_spec",
    name: "SPEC",
    purpose: "Form structured PRD and acceptance criteria.",
  },
  {
    id: "state_design",
    name: "DESIGN",
    purpose: "Define technical architecture, data model, API contract, and test strategy.",
  },
  {
    id: "state_plan",
    name: "PLAN",
    purpose: "Sequence delivery via the MVP plan.",
  },
  {
    id: "state_build",
    name: "BUILD",
    purpose: "Implement the plan; step ids land in a future PR.",
  },
  {
    id: "state_verify",
    name: "VERIFY",
    purpose: "Validate against acceptance criteria; step ids land in a future PR.",
  },
  {
    id: "state_ship",
    name: "SHIP",
    purpose: "Release with audit trail and observability; step ids land in a future PR.",
  },
  {
    id: "state_reflect",
    name: "REFLECT",
    purpose: "Post-release evolution and AI governance review; step ids land in a future PR.",
  },
];

export const STATE_ORDER: readonly StateId[] = STATE_DEFS.map((s) => s.id);

/** Per-state ordered step list. Empty arrays are valid for state stubs whose
 *  step ids land in a later PR. */
export const STEPS_BY_STATE: Readonly<Record<StateId, readonly StepDef[]>> = {
  state_discovery: [
    { stepId: "step_project_brief", artifactPath: "docs/00-project-brief.md" },
    { stepId: "step_scope", artifactPath: "docs/01-scope.md" },
  ],
  state_spec: [
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
    { stepId: "step_api_contract", artifactPath: "docs/07-api-contract.md" },
    { stepId: "step_test_strategy", artifactPath: "docs/08-test-strategy.md" },
  ],
  state_plan: [{ stepId: "step_mvp_plan", artifactPath: "docs/09-mvp-plan.md" }],
  state_build: [],
  state_verify: [],
  state_ship: [],
  state_reflect: [],
};

const PRD_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  {
    id: "section_problem",
    canonical: "Problem",
    aliases: ["Problem｜问题", "问题"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_goals",
    canonical: "Goals",
    aliases: ["Goals｜目标", "目标"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_users",
    canonical: "Users",
    aliases: ["Users｜用户", "用户"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_scenarios",
    canonical: "Scenarios",
    aliases: [
      "Scenarios｜使用场景",
      "使用场景",
      "Use Cases",
      "User Scenarios",
      "用户场景",
    ],
    allowedLevels: [2, 3],
  },
  {
    id: "section_requirements",
    canonical: "Requirements",
    aliases: ["Requirements｜需求", "需求"],
    allowedLevels: [2, 3],
  },
];

const PROJECT_BRIEF_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  {
    id: "section_problem",
    canonical: "Problem",
    aliases: ["Problem｜问题", "问题"],
    allowedLevels: [2, 3],
  },
  // user §XII — "Goal｜目标" (singular) for project-brief specifically.
  {
    id: "section_goal",
    canonical: "Goal",
    aliases: ["Goal｜目标", "目标"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_users",
    canonical: "Users",
    aliases: ["Users｜用户", "用户"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_success_criteria",
    canonical: "Success Criteria",
    aliases: ["Success Criteria｜成功标准", "成功标准"],
    allowedLevels: [2, 3],
  },
];

const SCOPE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  {
    id: "section_in_scope",
    canonical: "In Scope",
    aliases: ["In Scope｜范围内", "范围内"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_out_of_scope",
    canonical: "Out of Scope",
    aliases: ["Out of Scope｜范围外", "范围外"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_technical_constraints",
    canonical: "Technical Constraints",
    aliases: ["Technical Constraints｜技术约束", "技术约束"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_completion_boundary",
    canonical: "Completion Boundary",
    aliases: ["Completion Boundary｜完成边界", "完成边界"],
    allowedLevels: [2, 3],
  },
];

const ACCEPTANCE_CRITERIA_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  {
    id: "section_acceptance_rules",
    canonical: "Acceptance Rules",
    aliases: ["Acceptance Rules｜验收规则", "验收规则"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_given_when_then",
    canonical: "Given When Then",
    aliases: [
      "Given When Then｜给定条件 执行动作 预期结果",
      "给定条件 执行动作 预期结果",
    ],
    allowedLevels: [2, 3],
  },
  {
    id: "section_failure_conditions",
    canonical: "Failure Conditions",
    aliases: ["Failure Conditions｜失败条件", "失败条件"],
    allowedLevels: [2, 3],
  },
];

const TECHNICAL_ARCHITECTURE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  {
    id: "section_product_form",
    canonical: "Product Form",
    aliases: ["Product Form｜产品形态", "产品形态"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_runtime",
    canonical: "Runtime",
    aliases: ["Runtime｜运行时", "运行时"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_language",
    canonical: "Language",
    aliases: ["Language｜开发语言", "开发语言"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_storage",
    canonical: "Storage",
    aliases: ["Storage｜存储方案", "存储方案"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_final_decision",
    canonical: "Final Decision",
    aliases: ["Final Decision｜最终决策", "最终决策"],
    allowedLevels: [2, 3],
  },
];

export const REQUIRED_SECTIONS_BY_STEP: Readonly<
  Record<string, readonly RequiredSectionDef[]>
> = {
  step_project_brief: PROJECT_BRIEF_REQUIRED_SECTIONS,
  step_scope: SCOPE_REQUIRED_SECTIONS,
  step_prd: PRD_REQUIRED_SECTIONS,
  step_acceptance_criteria: ACCEPTANCE_CRITERIA_REQUIRED_SECTIONS,
  step_technical_architecture: TECHNICAL_ARCHITECTURE_REQUIRED_SECTIONS,
  // step_information_architecture, step_data_model, step_api_contract,
  // step_test_strategy, step_mvp_plan have artifact paths but no required
  // sections in v1.0; gate auto-passes if the artifact exists. PR #5+ adds
  // detailed checks.
};
