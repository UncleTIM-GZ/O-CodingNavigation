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
