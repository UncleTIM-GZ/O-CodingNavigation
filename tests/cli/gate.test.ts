import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedToStepPrd } from "../helpers/seed-state.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. PRD requires the 0.2.0
// section set; the legacy "missing Scenarios" / fixture path no longer
// applies. Use the bundled PRD template (covers all 0.2.0 sections) for
// pass cases and an empty body for blocked cases.

describe("ocn gate", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns blocked when the current step's artifact is missing", async () => {
    const result = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_GATE_FAILED");
    expect(parsed.data.status).toBe("blocked");
    expect(parsed.data.currentStepId).toBe("step_project_brief");
  }, 30_000);

  it("returns pass when PRD has all 0.2.0 required sections (bundled template)", async () => {
    await seedToStepPrd(project.cwd);
    await spawnOcn(["doc", "create", "prd", "--overwrite"], { cwd: project.cwd });
    const result = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.status).toBe("pass");
    expect(parsed.data.currentStepId).toBe("step_prd");
  }, 30_000);

  it("returns blocked with all 0.2.0 PRD required sections when PRD body is empty", async () => {
    await seedToStepPrd(project.cwd);
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), "# PRD\n", "utf8");
    const result = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.missingRequiredSectionIds).toEqual([
      "section_product_form",
      "section_user_roles",
      "section_user_flow",
      "section_core_features",
      "section_non_functional_requirements",
      "section_acceptance_preconditions",
      "section_non_goals",
    ]);
  }, 30_000);

  it("does NOT mutate state.json", async () => {
    const stateBefore = await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8");
    await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    const stateAfter = await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8");
    expect(stateAfter).toBe(stateBefore);
  }, 30_000);

  it("blocks ERR_IO_OR_CONFIG (exit 4) when project not initialized", async () => {
    const fresh = await createTempProject("ocn-gate-uninit-");
    try {
      const result = await spawnOcn(["gate", "--json"], { cwd: fresh.cwd });
      expect(result.exitCode).toBe(4);
    } finally {
      await fresh.cleanup();
    }
  }, 30_000);
});
