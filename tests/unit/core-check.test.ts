import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkCurrentArtifact } from "../../src/core/check.js";
import { initProject } from "../../src/core/init.js";
import { seedState, seedToStepPrd } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. Project brief now requires
// 7 sections (Problem, Goal, Users, Success Criteria, Constraints, Risks,
// Non-goals). PRD requires the 0.2.0 set (Product Form / User Roles / etc),
// not Scenarios.
const PROJECT_BRIEF_VALID =
  "# Project Brief\n" +
  "\n## Problem\n\nx\n" +
  "\n## Goal\n\nx\n" +
  "\n## Users\n\nx\n" +
  "\n## Success Criteria\n\nx\n" +
  "\n## Constraints\n\nx\n" +
  "\n## Risks\n\nx\n" +
  "\n## Non-goals\n\nx\n";

const PROJECT_BRIEF_MISSING_SUCCESS_CRITERIA =
  "# Project Brief\n" +
  "\n## Problem\n\nx\n" +
  "\n## Goal\n\nx\n" +
  "\n## Users\n\nx\n" +
  "\n## Constraints\n\nx\n" +
  "\n## Risks\n\nx\n" +
  "\n## Non-goals\n\nx\n";

describe("core/check.checkCurrentArtifact (PRD via 0.2.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
    await seedToStepPrd(project.cwd);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks when PRD file does not exist (0.2.0 PRD required sections)", async () => {
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      const data = result.data as { missingRequiredSectionIds: readonly string[] };
      expect(data.missingRequiredSectionIds).toEqual([
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

  it("returns pass + OK when PRD bundled template covers all 0.2.0 required sections", async () => {
    const { getTemplate } = await import("../../src/core/templates/index.js");
    const entry = getTemplate("prd");
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), entry.template, "utf8");
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.status).toBe("pass");
    }
  });
});

// P1-002 — `ocn check` previously short-circuited to ERR_STATE_MACHINE for any
// non-PRD current step. These cases prove that check now resolves the artifact
// + required sections from the SOP profile via state.json.currentStepId.
describe("core/check.checkCurrentArtifact — current-step generic", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
    // No seed — `ocn init` lands at state_discovery / step_project_brief, the
    // very first step. That is the step P1-002 explicitly broke before.
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("passes step_project_brief when 00-project-brief.md has all required sections", async () => {
    await fs.writeFile(
      join(project.cwd, "docs", "00-project-brief.md"),
      PROJECT_BRIEF_VALID,
      "utf8",
    );
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toBe("OK");
      expect(result.data?.status).toBe("pass");
      expect(result.data?.artifactPath).toMatch(/00-project-brief\.md$/);
      expect(result.data?.missingRequiredSectionIds).toEqual([]);
      expect(result.message.en).toContain("step_project_brief");
    }
  });

  it("blocks step_project_brief when Success Criteria is missing", async () => {
    await fs.writeFile(
      join(project.cwd, "docs", "00-project-brief.md"),
      PROJECT_BRIEF_MISSING_SUCCESS_CRITERIA,
      "utf8",
    );
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      const data = result.data as {
        artifactPath: string;
        missingRequiredSectionIds: readonly string[];
      };
      expect(data.missingRequiredSectionIds).toEqual(["section_success_criteria"]);
      expect(data.artifactPath).toMatch(/00-project-brief\.md$/);
      expect(result.message.en).toContain("step_project_brief");
      expect(result.message.en).toContain("section_success_criteria");
    }
  });

  it("blocks step_project_brief when artifact file is missing entirely", async () => {
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      // Bilingual message must guide the user toward the *correct* doc subcommand —
      // project-brief, not prd. This guards against the original P1-002 wording bug.
      expect(result.message.en).toContain("step_project_brief");
      expect(result.message.en).toContain("ocn doc create project-brief");
      expect(result.message.en).not.toContain("ocn doc create prd");
      const data = result.data as {
        artifactPath: string;
        missingRequiredSectionIds: readonly string[];
      };
      expect(data.artifactPath).toMatch(/00-project-brief\.md$/);
      // SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. project_brief now
      // requires 7 sections.
      expect(data.missingRequiredSectionIds).toEqual([
        "section_problem",
        "section_goal",
        "section_users",
        "section_success_criteria",
        "section_constraints",
        "section_risks",
        "section_non_goals",
      ]);
    }
  });

  it("returns ERR_STATE_MACHINE when currentStepId is unknown to the SOP profile", async () => {
    await seedState(project.cwd, {
      currentStateId: "state_discovery",
      currentStepId: "step_made_up",
    });
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_STATE_MACHINE");
      expect(result.message.en).toContain("step_made_up");
    }
  });

  // The headline regression: prove `checkCurrentArtifact` no longer hard-codes
  // step_prd. If anyone reverts the SOP-driven dispatch, the project_brief
  // pass case below would fail because no PRD file exists in the project.
  it("regression: does not hard-code step_prd — passes project_brief without any PRD file", async () => {
    await fs.writeFile(
      join(project.cwd, "docs", "00-project-brief.md"),
      PROJECT_BRIEF_VALID,
      "utf8",
    );
    const prdPath = join(project.cwd, "docs", "02-prd.md");
    let prdExisted = true;
    try {
      await fs.access(prdPath);
    } catch {
      prdExisted = false;
    }
    expect(prdExisted).toBe(false);

    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.artifactPath).toMatch(/00-project-brief\.md$/);
      expect(result.data?.artifactPath).not.toMatch(/02-prd\.md$/);
    }
  });
});
