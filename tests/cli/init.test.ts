import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("ocn init", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // @ac AC-INIT-001 — minimal tier initialization
  it("creates .ocoding/{state.json,sop.yaml,gates.yaml,config.yaml} and docs/", async () => {
    const result = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);

    const stateRaw = await fs.readFile(
      join(project.cwd, ".ocoding", "state.json"),
      "utf8",
    );
    const state = JSON.parse(stateRaw);
    expect(state.schemaVersion).toBe("1.0");
    expect(state.currentStateId).toBe("state_spec");
    expect(state.currentStepId).toBe("step_prd");
    expect(state.project.tier).toBe("minimal");
    expect(state.project.sopProfileId).toBe("default-ai-coding-sop");
    expect(state.project.sopProfileVersion).toBe("0.1.0");

    await fs.access(join(project.cwd, ".ocoding", "sop.yaml"));
    await fs.access(join(project.cwd, ".ocoding", "gates.yaml"));
    await fs.access(join(project.cwd, ".ocoding", "config.yaml"));
    await fs.access(join(project.cwd, "docs"));
  }, 30_000);

  // @ac AC-INIT-002 — default tier when omitted = minimal
  it("defaults to minimal tier when --tier is omitted", async () => {
    const result = await spawnOcn(["init"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const state = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(state.project.tier).toBe("minimal");
  }, 30_000);

  it("blocks when .ocoding/ already exists (exit code 4)", async () => {
    const first = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(first.exitCode).toBe(0);
    const second = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(second.exitCode).toBe(4);
    expect(second.stderr).toMatch(/already initialized|已经初始化/);
  }, 30_000);

  it("emits structured CommandResult JSON when --json", async () => {
    const result = await spawnOcn(["init", "--tier", "minimal", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.currentStateId).toBe("state_spec");
    expect(parsed.data.currentStepId).toBe("step_prd");
  }, 30_000);
});
