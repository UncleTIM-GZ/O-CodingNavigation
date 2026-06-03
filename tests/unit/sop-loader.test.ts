import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOP_PROFILE_VERSION,
  loadSopProfile,
  loadSopProfileByVersion,
} from "../../src/core/sop/loader.js";

// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. The default `loadSopProfile()`
// now returns 0.2.0; 0.1.0 remains importable via `loadSopProfileByVersion`
// for tests that explicitly pin the legacy profile, but no default runtime
// path goes through 0.1.0 any more.

describe("sop/loader.loadSopProfile", () => {
  it("returns the default profile pinned to 0.3.0", () => {
    const profile = loadSopProfile();
    expect(profile.id).toBe("default-ai-coding-sop");
    expect(profile.version).toBe("0.3.0");
    expect(DEFAULT_SOP_PROFILE_VERSION).toBe("0.3.0");
  });

  it("provides yaml strings for sop / gates / artifacts / config", () => {
    const profile = loadSopProfile();
    expect(profile.sopYaml).toMatch(/profile: default-ai-coding-sop/);
    expect(profile.sopYaml).toMatch(/version: 0\.3\.0/);
    expect(profile.gatesYaml).toMatch(/section_product_form/);
    expect(profile.artifactsYaml).toMatch(/02-prd\.md/);
    expect(profile.artifactsYaml).toMatch(/19-final-build-verdict\.md/);
    expect(profile.artifactsYaml).toMatch(/07-logic-backbone\.md/);
    expect(profile.defaultConfigYaml).toMatch(/tier: minimal/);
    expect(profile.defaultConfigYaml).toMatch(/version: 0\.3\.0/);
  });

  // Ensures runtime profile + persisted snapshot share the same (0.2.0) shape.
  it("rendered sop.yaml covers every state and step the runtime claims", () => {
    const profile = loadSopProfile();
    const expectedStates = [
      "state_discovery",
      "state_spec",
      "state_design",
      "state_plan",
      "state_build",
      "state_verify",
      "state_ship",
      "state_reflect",
    ];
    for (const stateId of expectedStates) {
      expect(profile.sopYaml).toContain(`id: ${stateId}`);
    }
    const expectedSteps = [
      "step_project_brief",
      "step_scope",
      "step_prd",
      "step_acceptance_criteria",
      "step_technical_architecture",
      "step_information_architecture",
      "step_data_model",
      "step_api_contract",
      "step_test_strategy",
      "step_mvp_plan",
      "step_build_plan",
      "step_implementation_log",
      "step_change_evidence",
      "step_integration_notes",
      "step_verification_report",
      "step_acceptance_mapping",
      "step_failure_fix_log",
      "step_regression_evidence",
      "step_final_build_verdict",
    ];
    for (const stepId of expectedSteps) {
      expect(profile.sopYaml).toContain(`- ${stepId}`);
    }
  });

  it("rendered artifacts.yaml maps each step to the same path the runtime exposes", () => {
    const profile = loadSopProfile();
    const checks: ReadonlyArray<readonly [string, string]> = [
      ["step_project_brief", "docs/00-project-brief.md"],
      ["step_scope", "docs/01-scope.md"],
      ["step_prd", "docs/02-prd.md"],
      ["step_acceptance_criteria", "docs/03-acceptance-criteria.md"],
      ["step_technical_architecture", "docs/04-technical-architecture.md"],
      ["step_information_architecture", "docs/05-information-architecture.md"],
      ["step_data_model", "docs/06-data-model.md"],
      ["step_logic_backbone", "docs/07-logic-backbone.md"],
      ["step_api_contract", "docs/08-api-contract.md"],
      ["step_test_strategy", "docs/09-test-strategy.md"],
      ["step_mvp_plan", "docs/10-mvp-plan.md"],
      ["step_build_plan", "docs/11-build-plan.md"],
      ["step_implementation_log", "docs/12-implementation-log.md"],
      ["step_change_evidence", "docs/13-change-evidence.md"],
      ["step_integration_notes", "docs/14-integration-notes.md"],
      ["step_verification_report", "docs/15-verification-report.md"],
      ["step_acceptance_mapping", "docs/16-acceptance-mapping.md"],
      ["step_failure_fix_log", "docs/17-failure-fix-log.md"],
      ["step_regression_evidence", "docs/18-regression-evidence.md"],
      ["step_final_build_verdict", "docs/19-final-build-verdict.md"],
    ];
    for (const [stepId, runtimePath] of checks) {
      expect(profile.artifactPathForStep(stepId)).toBe(runtimePath);
      expect(profile.artifactsYaml).toContain(`path: ${runtimePath}`);
    }
  });

  it("returns 7 required sections for step_prd under 0.2.0", () => {
    const profile = loadSopProfile();
    const required = profile.requiredSectionsForStep("step_prd");
    expect(required.map((r) => r.id)).toEqual([
      "section_product_form",
      "section_user_roles",
      "section_user_flow",
      "section_core_features",
      "section_non_functional_requirements",
      "section_acceptance_preconditions",
      "section_non_goals",
    ]);
  });

  it("returns empty array for unknown step", () => {
    const profile = loadSopProfile();
    expect(profile.requiredSectionsForStep("step_unknown")).toEqual([]);
  });

  it("loadSopProfileByVersion('0.1.0') still returns the legacy profile (10 wired steps, scenarios required)", () => {
    const profile = loadSopProfileByVersion("0.1.0");
    expect(profile.version).toBe("0.1.0");
    const required = profile.requiredSectionsForStep("step_prd");
    const ids = required.map((r) => r.id);
    expect(ids).toContain("section_scenarios");
    let total = 0;
    for (const stateId of profile.stateOrder) {
      total += profile.stepsForState(stateId).length;
    }
    expect(total).toBe(10);
  });

  it("loadSopProfileByVersion('0.3.0') is identical to the default", () => {
    const def = loadSopProfile();
    const v030 = loadSopProfileByVersion("0.3.0");
    expect(def.version).toBe(v030.version);
    expect(def.sopYaml).toBe(v030.sopYaml);
    expect(def.gatesYaml).toBe(v030.gatesYaml);
    expect(def.artifactsYaml).toBe(v030.artifactsYaml);
  });
});
