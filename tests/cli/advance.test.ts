import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

async function readState(cwd: string) {
  return JSON.parse(
    await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"),
  );
}

async function readEvents(cwd: string) {
  const raw = await fs.readFile(
    join(cwd, ".ocoding", "audit", "audit-events.jsonl"),
    "utf8",
  );
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line));
}

describe("ocn advance", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks when the current step's gate fails (no project-brief yet)", async () => {
    const result = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_GATE_FAILED");
  }, 30_000);

  it("does NOT mutate state.json on block", async () => {
    const before = await readState(project.cwd);
    await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    const after = await readState(project.cwd);
    expect(after.currentStateId).toBe(before.currentStateId);
    expect(after.currentStepId).toBe(before.currentStepId);
  }, 30_000);

  it("advances state when gate passes (project-brief template covers required sections)", async () => {
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const result = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.from.stepId).toBe("step_project_brief");
    expect(parsed.data.to.stepId).toBe("step_scope");

    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_scope");
  }, 30_000);

  it("emits advance audit events with a correlationId on the success path", async () => {
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const result = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    const correlationId = JSON.parse(result.stdout).data.correlationId;
    expect(correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

    const events = await readEvents(project.cwd);
    const flowEvents = events.filter((e) => e.correlationId === correlationId);
    const types = flowEvents.map((e) => e.eventType);
    expect(types).toContain("advance_started");
    expect(types).toContain("artifact_gate_run");
    expect(types).toContain("artifact_gate_passed");
    expect(types).toContain("state_transitioned");
    expect(types).toContain("state_write_succeeded");
    expect(types).toContain("advance_succeeded");
  }, 30_000);

  it("crosses state boundary: scope → state_spec/step_prd", async () => {
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    await spawnOcn(["advance"], { cwd: project.cwd });
    await spawnOcn(["doc", "create", "scope"], { cwd: project.cwd });
    const result = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_spec");
    expect(state.currentStepId).toBe("step_prd");
  }, 60_000);

  it("blocks ERR_IO_OR_CONFIG when project not initialized", async () => {
    const fresh = await createTempProject("ocn-advance-uninit-");
    try {
      const result = await spawnOcn(["advance", "--json"], { cwd: fresh.cwd });
      expect(result.exitCode).toBe(4);
    } finally {
      await fresh.cleanup();
    }
  }, 30_000);
});
