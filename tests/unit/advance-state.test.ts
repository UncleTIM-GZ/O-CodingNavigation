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

  it("advances to step_scope when project_brief gate passes", async () => {
    await createArtifact({ cwd: project.cwd, type: "project-brief" });
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_scope");
  });

  it("crosses state boundary: scope → state_spec/step_prd", async () => {
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

  it("returns ERR_STATE_MACHINE at the terminal step (state_plan / step_mvp_plan)", async () => {
    // Walk all the way to step_mvp_plan via templates.
    const types: ReadonlyArray<{ type: string }> = [
      { type: "project-brief" },
      { type: "scope" },
      { type: "prd" },
      { type: "acceptance-criteria" },
      { type: "technical-architecture" },
    ];
    for (const t of types) {
      await createArtifact({ cwd: project.cwd, type: t.type });
      const r = await advanceState({ cwd: project.cwd });
      expect(r.ok).toBe(true);
    }
    // Now at state_design / step_information_architecture. Walk the rest of
    // state_design + state_plan/step_mvp_plan (steps with empty required
    // sections — gate auto-passes once an artifact exists).
    const remainingPaths = [
      "docs/05-information-architecture.md",
      "docs/06-data-model.md",
      "docs/07-api-contract.md",
      "docs/08-test-strategy.md",
      "docs/09-mvp-plan.md",
    ];
    for (let i = 0; i < remainingPaths.length - 1; i++) {
      const p = remainingPaths[i]!;
      await fs.writeFile(join(project.cwd, p), "# placeholder\n", "utf8");
      const r = await advanceState({ cwd: project.cwd });
      expect(r.ok).toBe(true);
    }
    // Now at state_plan / step_mvp_plan. Create the final artifact then
    // attempt one more advance — should fail because there is no next step
    // (BUILD/VERIFY/SHIP/REFLECT have no steps in PR #4).
    await fs.writeFile(
      join(project.cwd, remainingPaths[remainingPaths.length - 1]!),
      "# placeholder\n",
      "utf8",
    );
    const stateBeforeTerminal = await readState(project.cwd);
    expect(stateBeforeTerminal.currentStateId).toBe("state_plan");
    expect(stateBeforeTerminal.currentStepId).toBe("step_mvp_plan");

    const terminalAdvance = await advanceState({ cwd: project.cwd });
    expect(terminalAdvance.ok).toBe(false);
    if (!terminalAdvance.ok) {
      expect(terminalAdvance.code).toBe("ERR_STATE_MACHINE");
    }
  }, 60_000);
});
