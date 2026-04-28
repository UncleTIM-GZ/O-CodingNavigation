import type { RequiredSectionDef } from "../../types/artifact.js";
import type { SopProfile } from "../../types/sop.js";
import type { StateId } from "../../types/state.js";
import type { StepLocation } from "../../types/state-machine.js";
import { artifactsYaml } from "../../sops/default-ai-coding-sop/0.1.0/artifacts.js";
import { defaultConfigYaml } from "../../sops/default-ai-coding-sop/0.1.0/config.js";
import { gatesYaml } from "../../sops/default-ai-coding-sop/0.1.0/gates.js";
import { sopYaml } from "../../sops/default-ai-coding-sop/0.1.0/sop.js";

// PR #4 — the bundled SOP profile knows the full state machine + step map.
// State IDs use stable strings (CLAUDE.md §4.1). The map below is the source
// of truth; gates.yaml + sop.yaml on disk are written from this for portability
// but the in-process loader uses these constants directly.

export const STATE_ORDER: readonly StateId[] = [
  "state_discovery",
  "state_spec",
  "state_design",
  "state_plan",
  "state_build",
  "state_verify",
  "state_ship",
  "state_reflect",
];

interface StepDef {
  readonly stepId: string;
  readonly artifactPath: string | null;
}

/** Per-state ordered step list. Empty arrays are valid (BUILD/VERIFY/etc. are
 *  state stubs in PR #4 — step IDs land in a later PR). */
const STEPS_BY_STATE: Readonly<Record<StateId, readonly StepDef[]>> = {
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
    { stepId: "step_information_architecture", artifactPath: "docs/05-information-architecture.md" },
    { stepId: "step_data_model", artifactPath: "docs/06-data-model.md" },
    { stepId: "step_api_contract", artifactPath: "docs/07-api-contract.md" },
    { stepId: "step_test_strategy", artifactPath: "docs/08-test-strategy.md" },
  ],
  state_plan: [
    { stepId: "step_mvp_plan", artifactPath: "docs/09-mvp-plan.md" },
  ],
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
  // user §XII says "Goal｜目标" (singular) for project-brief specifically.
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
    aliases: ["Given When Then｜给定条件 执行动作 预期结果", "给定条件 执行动作 预期结果"],
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

const REQUIRED_SECTIONS_BY_STEP: Readonly<Record<string, readonly RequiredSectionDef[]>> = {
  step_project_brief: PROJECT_BRIEF_REQUIRED_SECTIONS,
  step_scope: SCOPE_REQUIRED_SECTIONS,
  step_prd: PRD_REQUIRED_SECTIONS,
  step_acceptance_criteria: ACCEPTANCE_CRITERIA_REQUIRED_SECTIONS,
  step_technical_architecture: TECHNICAL_ARCHITECTURE_REQUIRED_SECTIONS,
  // Other steps have no required sections in PR #4 (gate auto-passes if
  // artifact exists). PR #5+ adds detailed checks.
};

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
  // Flatten every step into a single ordered list, then map step_i to step_(i+1).
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
    id: "default-ai-coding-sop",
    version: "0.1.0",
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
