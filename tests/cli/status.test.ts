import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("ocn status", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // @ac AC-STATUS-001 — basic status output
  it("returns currentStateId and currentStepId after init", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["status"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("state_spec");
    expect(result.stdout).toContain("step_prd");
    expect(result.stdout).toMatch(/Project:|项目/);
  }, 30_000);

  it("emits CommandResult with current state/step in --json mode", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["status", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.currentStateId).toBe("state_spec");
    expect(parsed.data.currentStepId).toBe("step_prd");
    expect(typeof parsed.data.nextAction).toBe("string");
  }, 30_000);

  it("blocks with ERR_IO_OR_CONFIG when project not initialized", async () => {
    const result = await spawnOcn(["status", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);
});
