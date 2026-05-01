import { describe, expect, it } from "vitest";
import { loadSopProfile } from "../../src/core/sop/loader.js";

describe("sop/loader.loadSopProfile", () => {
  it("returns the default profile with id and version", () => {
    const profile = loadSopProfile();
    expect(profile.id).toBe("default-ai-coding-sop");
    expect(profile.version).toBe("0.1.0");
  });

  it("provides yaml strings for sop / gates / artifacts / config", () => {
    const profile = loadSopProfile();
    expect(profile.sopYaml).toMatch(/profile: default-ai-coding-sop/);
    expect(profile.gatesYaml).toMatch(/section_scenarios/);
    expect(profile.artifactsYaml).toMatch(/02-prd\.md/);
    expect(profile.defaultConfigYaml).toMatch(/tier: minimal/);
  });

  // P1-003 — runtime profile and persisted YAML are now derived from the
  // same data.ts. These assertions pin both surfaces to the same step set so
  // the historical Skeleton-Spike-only snapshot can never come back.
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
      ["step_api_contract", "docs/07-api-contract.md"],
      ["step_test_strategy", "docs/08-test-strategy.md"],
      ["step_mvp_plan", "docs/09-mvp-plan.md"],
    ];
    for (const [stepId, runtimePath] of checks) {
      expect(profile.artifactPathForStep(stepId)).toBe(runtimePath);
      expect(profile.artifactsYaml).toContain(`path: ${runtimePath}`);
    }
  });

  it("returns 5 required sections for step_prd", () => {
    const profile = loadSopProfile();
    const required = profile.requiredSectionsForStep("step_prd");
    expect(required.map((r) => r.id)).toEqual([
      "section_problem",
      "section_goals",
      "section_users",
      "section_scenarios",
      "section_requirements",
    ]);
  });

  it("returns empty array for unknown step", () => {
    const profile = loadSopProfile();
    expect(profile.requiredSectionsForStep("step_unknown")).toEqual([]);
  });

  it("scenarios section has all required aliases", () => {
    const profile = loadSopProfile();
    const required = profile.requiredSectionsForStep("step_prd");
    const scenarios = required.find((r) => r.id === "section_scenarios");
    expect(scenarios?.aliases).toContain("Scenarios｜使用场景");
    expect(scenarios?.aliases).toContain("使用场景");
    expect(scenarios?.aliases).toContain("Use Cases");
    expect(scenarios?.aliases).toContain("User Scenarios");
    expect(scenarios?.aliases).toContain("用户场景");
  });
});
