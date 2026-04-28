import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runGateTool } from "../../src/mcp/tools/run-gate.js";
import { initProject } from "../../src/core/init.js";
import { readState } from "../../src/core/state/state-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("navigator.run_gate", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns blocked when current step's artifact is missing", async () => {
    const result = await runGateTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_GATE_FAILED");
  });

  it("does NOT mutate state.json", async () => {
    const before = await readState(project.cwd);
    await runGateTool.handler({ projectRoot: project.cwd });
    const after = await readState(project.cwd);
    expect(after.currentStateId).toBe(before.currentStateId);
    expect(after.currentStepId).toBe(before.currentStepId);
  });

  it("emits artifact_gate_run + artifact_gate_blocked into JSONL", async () => {
    await runGateTool.handler({ projectRoot: project.cwd });
    const raw = await fs.readFile(
      join(project.cwd, ".ocoding", "audit", "audit-events.jsonl"),
      "utf8",
    );
    const events = raw
      .trimEnd()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line));
    const types = events.map((e) => e.eventType);
    expect(types).toContain("artifact_gate_run");
    expect(types).toContain("artifact_gate_blocked");
  });
});
