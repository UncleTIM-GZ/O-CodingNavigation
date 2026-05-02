import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateBrief } from "../../src/core/brief.js";
import { initProject } from "../../src/core/init.js";
import { seedToStepPrd } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("core/brief.generateBrief", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("includes state, step, AI Governance reminder and Uncertainty Policy", async () => {
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.currentStateId).toBe("state_discovery");
    expect(result.data?.currentStepId).toBe("step_project_brief");
    expect(result.data?.aiGovernanceReminder).toMatch(/blocked artifact|advance/i);
    expect(result.data?.uncertaintyPolicy).toMatch(/数据不足|insufficient/i);
  });

  it("reports artifact status 'missing' before the project-brief is created", async () => {
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.currentArtifactStatus).toBe("missing");
      expect(result.data?.currentBlockers.length).toBeGreaterThan(0);
    }
  });

  it("reports artifact status 'blocked' when PRD body is empty (after seeding to step_prd)", async () => {
    // SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. PRD requires the 0.2.0
    // section set, not Scenarios. An empty PRD body must report all 7
    // 0.2.0 PRD required sections as blockers.
    await seedToStepPrd(project.cwd);
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), "# PRD\n", "utf8");
    const result = await generateBrief({ cwd: project.cwd });
    if (result.ok) {
      expect(result.data?.currentArtifactStatus).toBe("blocked");
      expect(result.data?.currentBlockers).toEqual([
        "section_product_form",
        "section_user_roles",
        "section_user_flow",
        "section_core_features",
        "section_non_functional_requirements",
        "section_acceptance_preconditions",
        "section_non_goals",
      ]);
    }
  });

  it("reports artifact status 'pass' when PRD has all 0.2.0 required sections (after seeding to step_prd)", async () => {
    await seedToStepPrd(project.cwd);
    const { getTemplate } = await import("../../src/core/templates/index.js");
    const entry = getTemplate("prd");
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), entry.template, "utf8");
    const result = await generateBrief({ cwd: project.cwd });
    if (result.ok) {
      expect(result.data?.currentArtifactStatus).toBe("pass");
      expect(result.data?.currentBlockers).toEqual([]);
    }
  });
});
