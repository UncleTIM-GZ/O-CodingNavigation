import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FixtureFiles } from "../helpers/fixtures.js";
import { seedToStepPrd } from "../helpers/seed-state.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

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

  it("returns pass when PRD has all required sections (after seeding to step_prd)", async () => {
    await seedToStepPrd(project.cwd);
    await fs.copyFile(
      FixtureFiles.prdWithScenarios(),
      join(project.cwd, "docs", "02-prd.md"),
    );
    const result = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.status).toBe("pass");
    expect(parsed.data.currentStepId).toBe("step_prd");
  }, 30_000);

  it("returns blocked when PRD missing Scenarios", async () => {
    await seedToStepPrd(project.cwd);
    await fs.copyFile(
      FixtureFiles.prdMissingScenarios(),
      join(project.cwd, "docs", "02-prd.md"),
    );
    const result = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.missingRequiredSectionIds).toEqual(["section_scenarios"]);
  }, 30_000);

  it("does NOT mutate state.json", async () => {
    const stateBefore = await fs.readFile(
      join(project.cwd, ".ocoding", "state.json"),
      "utf8",
    );
    await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    const stateAfter = await fs.readFile(
      join(project.cwd, ".ocoding", "state.json"),
      "utf8",
    );
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
