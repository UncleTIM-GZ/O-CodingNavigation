import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("core/init.initProject", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates the four .ocoding files with correct content", async () => {
    const result = await initProject({ cwd: project.cwd, tier: "minimal" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.currentStateId).toBe("state_discovery");
    expect(result.data?.currentStepId).toBe("step_project_brief");

    const stateRaw = await fs.readFile(join(project.cwd, ".ocoding/state.json"), "utf8");
    const state = JSON.parse(stateRaw);
    expect(state.schemaVersion).toBe("1.0");
    expect(state.project.tier).toBe("minimal");
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_project_brief");

    const sopYaml = await fs.readFile(join(project.cwd, ".ocoding/sop.yaml"), "utf8");
    expect(sopYaml).toMatch(/profile: default-ai-coding-sop/);
    expect(sopYaml).toMatch(/version: 0\.1\.0/);
    const gatesYaml = await fs.readFile(join(project.cwd, ".ocoding/gates.yaml"), "utf8");
    expect(gatesYaml).toMatch(/section_scenarios/);
    const configYaml = await fs.readFile(join(project.cwd, ".ocoding/config.yaml"), "utf8");
    expect(configYaml).toMatch(/tier: minimal/);
  });

  it("defaults tier to minimal when omitted", async () => {
    const result = await initProject({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.tier).toBe("minimal");
  });

  it("blocks with ERR_IO_OR_CONFIG when .ocoding/ already exists", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    const second = await initProject({ cwd: project.cwd, tier: "minimal" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("ERR_IO_OR_CONFIG");
  });

  it("uses provided projectName and projectId", async () => {
    const result = await initProject({
      cwd: project.cwd,
      tier: "minimal",
      projectId: "custom-id",
      projectName: "Custom Name",
    });
    expect(result.ok).toBe(true);
    const state = JSON.parse(await fs.readFile(join(project.cwd, ".ocoding/state.json"), "utf8"));
    expect(state.project.projectId).toBe("custom-id");
    expect(state.project.name).toBe("Custom Name");
  });
});
