import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { readState } from "../../src/core/state/state-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

async function readEvents(cwd: string) {
  const raw = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line));
}

describe("advanceState", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks when the current step's artifact gate fails (no project-brief yet)", async () => {
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
    }
  });

  it("does NOT mutate state when blocked", async () => {
    await advanceState({ cwd: project.cwd });
    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_project_brief");
  });

  it("emits advance_started + advance_failed (sharing one correlationId) on block", async () => {
    await advanceState({ cwd: project.cwd });
    const events = await readEvents(project.cwd);
    const startEv = events.find((e) => e.eventType === "advance_started");
    const failEv = events.find((e) => e.eventType === "advance_failed");
    expect(startEv).toBeDefined();
    expect(failEv).toBeDefined();
    expect(startEv.correlationId).toBeDefined();
    expect(failEv.correlationId).toBe(startEv.correlationId);
  });

  it("advances to state_spec/step_scope when project_brief gate passes (under 0.2.0)", async () => {
    // SOP 0.2.0 PR 4 (DEC-023) — project_brief is the only step in
    // state_discovery; its successor is state_spec/step_scope.
    await createArtifact({ cwd: project.cwd, type: "project-brief" });
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_spec");
    expect(state.currentStepId).toBe("step_scope");
  });

  it("crosses state boundary: scope → state_spec/step_prd (within state_spec under 0.2.0)", async () => {
    await createArtifact({ cwd: project.cwd, type: "project-brief" });
    await advanceState({ cwd: project.cwd });
    await createArtifact({ cwd: project.cwd, type: "scope" });
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_spec");
    expect(state.currentStepId).toBe("step_prd");
  });

  it("emits state_transitioned + state_write_succeeded + advance_succeeded on pass", async () => {
    await createArtifact({ cwd: project.cwd, type: "project-brief" });
    await advanceState({ cwd: project.cwd });
    const events = await readEvents(project.cwd);
    const advanceFlow = events.filter((e) => typeof e.correlationId === "string");
    const types = advanceFlow.map((e) => e.eventType);
    expect(types).toContain("advance_started");
    expect(types).toContain("artifact_gate_run");
    expect(types).toContain("artifact_gate_passed");
    expect(types).toContain("state_transitioned");
    expect(types).toContain("state_write_succeeded");
    expect(types).toContain("advance_succeeded");
  });

  it("returns ERR_STATE_MACHINE at the terminal step (state_verify / step_final_build_verdict)", async () => {
    // SOP 0.3.0 default — walk all 20 steps via the bundled templates. Every
    // step now has required sections; using the bundled template guarantees a
    // passing gate (the logic-backbone template ships a valid graph).
    const types: readonly string[] = [
      "project-brief",
      "scope",
      "prd",
      "acceptance-criteria",
      "technical-architecture",
      "information-architecture",
      "data-model",
      "logic-backbone",
      "api-contract",
      "test-strategy",
      "mvp-plan",
      "build-plan",
      "implementation-log",
      "change-evidence",
      "integration-notes",
      "verification-report",
      "acceptance-mapping",
      "failure-fix-log",
      "regression-evidence",
      "final-build-verdict",
    ];
    // For each step, create the artifact then advance. The 19th advance
    // attempts to leave step_final_build_verdict and should fail with
    // ERR_STATE_MACHINE because SHIP/REFLECT remain stubs.
    for (let i = 0; i < types.length - 1; i++) {
      await createArtifact({ cwd: project.cwd, type: types[i]! });
      const r = await advanceState({ cwd: project.cwd });
      expect(r.ok, `advance after ${types[i]}`).toBe(true);
    }

    // Now at state_verify / step_final_build_verdict. Create the artifact
    // then attempt one more advance.
    await createArtifact({ cwd: project.cwd, type: types[types.length - 1]! });
    const stateBeforeTerminal = await readState(project.cwd);
    expect(stateBeforeTerminal.currentStateId).toBe("state_verify");
    expect(stateBeforeTerminal.currentStepId).toBe("step_final_build_verdict");

    const terminalAdvance = await advanceState({ cwd: project.cwd });
    expect(terminalAdvance.ok).toBe(false);
    if (!terminalAdvance.ok) {
      expect(terminalAdvance.code).toBe("ERR_STATE_MACHINE");
    }
  }, 120_000);
});
