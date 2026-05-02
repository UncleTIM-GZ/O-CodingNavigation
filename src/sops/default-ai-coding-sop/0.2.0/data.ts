import type { RequiredSectionDef } from "../../../types/artifact.js";
import type { StateId } from "../../../types/state.js";

// DEC-023 — single canonical source of truth for the default-ai-coding-sop
// 0.2.0 profile. Mirrors the 0.1.0 module shape (data.ts + render.ts +
// sop.ts + gates.ts + artifacts.ts + config.ts) so future runtime wiring
// (deferred to PR 3 / PR 4 in the SOP 0.2.0 6-PR sequence) can swap the
// import surface without restructuring the profile package.
//
// Scope of this PR (PR 1 of 6): profile data + deterministic rendering ONLY.
// No runtime default change. `loadSopProfile()` continues to return 0.1.0;
// 0.2.0 is importable as data + renderer for tests and future consumers.
//
// Renaming any stable id below is an SOP-version-breaking change per
// CLAUDE.md §4.2. Add a new version directory under
// src/sops/default-ai-coding-sop/<next>/ and a CHANGELOG entry, do not
// rename in place.
//
// TODO(refactor): once 0.2.0 ships in the runtime (PR 3 / PR 4), extract
// shared types (StateDef, StepDef) into src/sops/default-ai-coding-sop/
// shared/types.ts so 0.1.0 and 0.2.0 import the same shape. For now we
// duplicate the local type aliases to keep PR 1 a pure additive change.

export const PROFILE_ID = "default-ai-coding-sop";
export const PROFILE_VERSION = "0.2.0";
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
    purpose: "Frame the problem and project brief.",
  },
  {
    id: "state_spec",
    name: "SPEC",
    purpose: "Form scope, PRD, and acceptance criteria.",
  },
  {
    id: "state_design",
    name: "DESIGN",
    purpose:
      "Define technical architecture, information architecture, data model, API contract, and test strategy.",
  },
  {
    id: "state_plan",
    name: "PLAN",
    purpose: "Sequence delivery via MVP plan and build plan.",
  },
  {
    id: "state_build",
    name: "BUILD",
    purpose:
      "Strong-gated implementation: capture implementation log, change evidence, and integration notes.",
  },
  {
    id: "state_verify",
    name: "VERIFY",
    purpose:
      "Strong-gated verification: report, acceptance mapping, failure-fix log, regression evidence, and final build verdict.",
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

/**
 * Per-state ordered step list for SOP 0.2.0. SHIP and REFLECT remain explicit
 * stubs (`steps: []`) — same shape state_build / state_verify had in 0.1.0.
 *
 * Total wired steps = 19 across DISCOVERY, SPEC, DESIGN, PLAN, BUILD, VERIFY.
 */
export const STEPS_BY_STATE: Readonly<Record<StateId, readonly StepDef[]>> = {
  state_discovery: [
    { stepId: "step_project_brief", artifactPath: "docs/00-project-brief.md" },
  ],
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
    { stepId: "step_api_contract", artifactPath: "docs/07-api-contract.md" },
    { stepId: "step_test_strategy", artifactPath: "docs/08-test-strategy.md" },
  ],
  state_plan: [
    { stepId: "step_mvp_plan", artifactPath: "docs/09-mvp-plan.md" },
    { stepId: "step_build_plan", artifactPath: "docs/10-build-plan.md" },
  ],
  state_build: [
    { stepId: "step_implementation_log", artifactPath: "docs/11-implementation-log.md" },
    { stepId: "step_change_evidence", artifactPath: "docs/12-change-evidence.md" },
    { stepId: "step_integration_notes", artifactPath: "docs/13-integration-notes.md" },
  ],
  state_verify: [
    { stepId: "step_verification_report", artifactPath: "docs/14-verification-report.md" },
    { stepId: "step_acceptance_mapping", artifactPath: "docs/15-acceptance-mapping.md" },
    { stepId: "step_failure_fix_log", artifactPath: "docs/16-failure-fix-log.md" },
    { stepId: "step_regression_evidence", artifactPath: "docs/17-regression-evidence.md" },
    { stepId: "step_final_build_verdict", artifactPath: "docs/18-final-build-verdict.md" },
  ],
  state_ship: [],
  state_reflect: [],
};

// ---------------------------------------------------------------------------
// Required-section definitions per step. Section titles use the EXACT wording
// from DEC-023 / the SOP 0.2.0 plan. Aliases follow the 0.1.0 bilingual
// convention ("English｜中文" + bare Chinese) so renderers and gate runners
// can match either form once 0.2.0 is wired into the runtime.
// ---------------------------------------------------------------------------

function section(
  id: string,
  canonical: string,
  zh: string,
): RequiredSectionDef {
  return {
    id,
    canonical,
    aliases: [`${canonical}｜${zh}`, zh],
    allowedLevels: [2, 3],
  };
}

const PROJECT_BRIEF_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_problem", "Problem", "问题"),
  section("section_goal", "Goal", "目标"),
  section("section_users", "Users", "用户"),
  section("section_success_criteria", "Success Criteria", "成功标准"),
  section("section_constraints", "Constraints", "约束"),
  section("section_risks", "Risks", "风险"),
  section("section_non_goals", "Non-goals", "非目标"),
];

const SCOPE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_in_scope", "In Scope", "范围内"),
  section("section_out_of_scope", "Out of Scope", "范围外"),
  section("section_technical_constraints", "Technical Constraints", "技术约束"),
  section("section_completion_boundary", "Completion Boundary", "完成边界"),
  section("section_exclusions", "Exclusions", "排除项"),
  section("section_assumptions", "Assumptions", "假设"),
];

const PRD_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_product_form", "Product Form", "产品形态"),
  section("section_user_roles", "User Roles", "用户角色"),
  section("section_user_flow", "User Flow", "用户流程"),
  section("section_core_features", "Core Features", "核心功能"),
  section(
    "section_non_functional_requirements",
    "Non-functional Requirements",
    "非功能性需求",
  ),
  section(
    "section_acceptance_preconditions",
    "Acceptance Preconditions",
    "验收前置条件",
  ),
  section("section_non_goals", "Non-goals", "非目标"),
];

const ACCEPTANCE_CRITERIA_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_acceptance_items", "Acceptance Items", "验收项"),
  section("section_evidence_method", "Evidence Method", "证据方法"),
  section("section_pass_criteria", "Pass Criteria", "通过标准"),
  section("section_failure_criteria", "Failure Criteria", "失败标准"),
  section("section_human_review_requirement", "Human Review Requirement", "人工评审要求"),
];

const TECHNICAL_ARCHITECTURE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_product_form", "Product Form", "产品形态"),
  section("section_runtime", "Runtime", "运行时"),
  section("section_language", "Language", "开发语言"),
  section("section_frameworks", "Frameworks", "框架"),
  section("section_storage", "Storage", "存储方案"),
  section("section_integration", "Integration", "集成"),
  section("section_deployment_form", "Deployment Form", "部署形态"),
  section("section_non_goals", "Non-goals", "非目标"),
  section("section_decision_matrix", "Decision Matrix", "决策矩阵"),
  section("section_constraints", "Constraints", "约束"),
  section("section_risks", "Risks", "风险"),
  section("section_final_decision", "Final Decision", "最终决策"),
];

const INFORMATION_ARCHITECTURE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_navigation_structure", "Navigation Structure", "导航结构"),
  section("section_page_or_module_map", "Page or Module Map", "页面或模块地图"),
  section("section_object_hierarchy", "Object Hierarchy", "对象层级"),
  section("section_user_entry_points", "User Entry Points", "用户入口"),
  section(
    "section_state_and_permission_notes",
    "State and Permission Notes",
    "状态与权限说明",
  ),
];

const DATA_MODEL_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_entities", "Entities", "实体"),
  section("section_fields", "Fields", "字段"),
  section("section_relationships", "Relationships", "关系"),
  section("section_constraints", "Constraints", "约束"),
  section(
    "section_indexes_or_access_patterns",
    "Indexes or Access Patterns",
    "索引或访问模式",
  ),
  section("section_migration_notes", "Migration Notes", "迁移说明"),
];

const API_CONTRACT_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_endpoints", "Endpoints", "接口"),
  section("section_request_schema", "Request Schema", "请求结构"),
  section("section_response_schema", "Response Schema", "响应结构"),
  section("section_error_shape", "Error Shape", "错误结构"),
  section(
    "section_authentication_or_authorization",
    "Authentication or Authorization",
    "认证或授权",
  ),
  section("section_compatibility_notes", "Compatibility Notes", "兼容性说明"),
];

const TEST_STRATEGY_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_unit_tests", "Unit Tests", "单元测试"),
  section("section_integration_tests", "Integration Tests", "集成测试"),
  section("section_e2e_or_smoke_tests", "E2E or Smoke Tests", "端到端或冒烟测试"),
  section("section_fixtures", "Fixtures", "测试夹具"),
  section("section_coverage_expectation", "Coverage Expectation", "覆盖率期望"),
  section("section_non_testable_risks", "Non-testable Risks", "不可测试风险"),
];

const MVP_PLAN_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_milestones", "Milestones", "里程碑"),
  section("section_task_breakdown", "Task Breakdown", "任务分解"),
  section("section_build_order", "Build Order", "构建顺序"),
  section("section_verification_plan", "Verification Plan", "验证计划"),
  section("section_cutline", "Cutline", "切线"),
  section("section_known_risks", "Known Risks", "已知风险"),
];

const BUILD_PLAN_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_target_scope", "Target Scope", "目标范围"),
  section(
    "section_files_expected_to_change",
    "Files Expected to Change",
    "预期变更文件",
  ),
  section("section_implementation_tasks", "Implementation Tasks", "实施任务"),
  section("section_non_goals", "Non-goals", "非目标"),
  section("section_risk_points", "Risk Points", "风险点"),
  section("section_verification_commands", "Verification Commands", "验证命令"),
];

const IMPLEMENTATION_LOG_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_files_changed", "Files Changed", "已变更文件"),
  section("section_change_summary", "Change Summary", "变更摘要"),
  section("section_commands_run", "Commands Run", "执行命令"),
  section("section_deviations_from_plan", "Deviations from Plan", "与计划的偏差"),
  section("section_open_issues", "Open Issues", "遗留问题"),
];

const CHANGE_EVIDENCE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_git_diff_summary", "Git Diff Summary", "Git 差异摘要"),
  section("section_files_added", "Files Added", "新增文件"),
  section("section_files_modified", "Files Modified", "修改文件"),
  section("section_files_deleted", "Files Deleted", "删除文件"),
  section(
    "section_migration_or_config_impact",
    "Migration or Config Impact",
    "迁移或配置影响",
  ),
  section(
    "section_evidence_links_or_commands",
    "Evidence Links or Commands",
    "证据链接或命令",
  ),
];

const INTEGRATION_NOTES_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_integration_points", "Integration Points", "集成点"),
  section("section_data_flow_impact", "Data Flow Impact", "数据流影响"),
  section("section_api_impact", "API Impact", "API 影响"),
  section("section_ui_impact", "UI Impact", "UI 影响"),
  section("section_environment_impact", "Environment Impact", "环境影响"),
  section("section_rollback_notes", "Rollback Notes", "回滚说明"),
];

const VERIFICATION_REPORT_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_lint_result", "Lint Result", "Lint 结果"),
  section("section_typecheck_result", "Typecheck Result", "类型检查结果"),
  section("section_test_result", "Test Result", "测试结果"),
  section("section_coverage_result", "Coverage Result", "覆盖率结果"),
  section("section_build_result", "Build Result", "构建结果"),
  section("section_smoke_result", "Smoke Result", "冒烟测试结果"),
  section("section_known_failures", "Known Failures", "已知失败"),
];

const ACCEPTANCE_MAPPING_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_acceptance_criterion", "Acceptance Criterion", "验收标准"),
  section("section_evidence", "Evidence", "证据"),
  section("section_status", "Status", "状态"),
  section("section_notes", "Notes", "说明"),
  section("section_human_review", "Human Review", "人工评审"),
];

const FAILURE_FIX_LOG_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_failed_item", "Failed Item", "失败项"),
  section("section_root_cause", "Root Cause", "根因"),
  section("section_fix_applied", "Fix Applied", "修复方案"),
  section("section_re_test_result", "Re-test Result", "回归结果"),
  section("section_remaining_risk", "Remaining Risk", "剩余风险"),
];

const REGRESSION_EVIDENCE_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_regression_scope", "Regression Scope", "回归范围"),
  section("section_commands_run", "Commands Run", "执行命令"),
  section("section_result", "Result", "结果"),
  section(
    "section_previously_broken_behavior",
    "Previously Broken Behavior",
    "此前异常行为",
  ),
  section("section_current_behavior", "Current Behavior", "当前行为"),
  section("section_residual_risk", "Residual Risk", "残留风险"),
];

const FINAL_BUILD_VERDICT_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  section("section_summary", "Summary", "摘要"),
  section("section_acceptance_status", "Acceptance Status", "验收状态"),
  section("section_verification_status", "Verification Status", "验证状态"),
  section("section_remaining_risks", "Remaining Risks", "剩余风险"),
  section("section_release_recommendation", "Release Recommendation", "发布建议"),
  section("section_human_decision", "Human Decision", "人工决策"),
];

export const REQUIRED_SECTIONS_BY_STEP: Readonly<
  Record<string, readonly RequiredSectionDef[]>
> = {
  step_project_brief: PROJECT_BRIEF_REQUIRED_SECTIONS,
  step_scope: SCOPE_REQUIRED_SECTIONS,
  step_prd: PRD_REQUIRED_SECTIONS,
  step_acceptance_criteria: ACCEPTANCE_CRITERIA_REQUIRED_SECTIONS,
  step_technical_architecture: TECHNICAL_ARCHITECTURE_REQUIRED_SECTIONS,
  step_information_architecture: INFORMATION_ARCHITECTURE_REQUIRED_SECTIONS,
  step_data_model: DATA_MODEL_REQUIRED_SECTIONS,
  step_api_contract: API_CONTRACT_REQUIRED_SECTIONS,
  step_test_strategy: TEST_STRATEGY_REQUIRED_SECTIONS,
  step_mvp_plan: MVP_PLAN_REQUIRED_SECTIONS,
  step_build_plan: BUILD_PLAN_REQUIRED_SECTIONS,
  step_implementation_log: IMPLEMENTATION_LOG_REQUIRED_SECTIONS,
  step_change_evidence: CHANGE_EVIDENCE_REQUIRED_SECTIONS,
  step_integration_notes: INTEGRATION_NOTES_REQUIRED_SECTIONS,
  step_verification_report: VERIFICATION_REPORT_REQUIRED_SECTIONS,
  step_acceptance_mapping: ACCEPTANCE_MAPPING_REQUIRED_SECTIONS,
  step_failure_fix_log: FAILURE_FIX_LOG_REQUIRED_SECTIONS,
  step_regression_evidence: REGRESSION_EVIDENCE_REQUIRED_SECTIONS,
  step_final_build_verdict: FINAL_BUILD_VERDICT_REQUIRED_SECTIONS,
};
