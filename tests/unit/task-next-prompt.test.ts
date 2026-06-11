import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateNextPrompt } from "../../src/core/execution-navigator/next-prompt.js";
import { initProject } from "../../src/core/init.js";
import { verifyHashOf, writeTaskLedger } from "../../src/core/task/task-ledger-store.js";
import type { LedgerTask, TaskLedger } from "../../src/types/task.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.5.0 (AM-007 / DEC-032) — next-prompt BUILD-state dispatch. With a
// pending ledger the brief dispatches the first ready task; without a ledger
// the legacy objective is unchanged (zero regression for ≤0.4.0 pins).

function ledgerTask(partial: Partial<LedgerTask> & { id: string }): LedgerTask {
  return {
    goal: "ship the runtime skeleton",
    traces: ["AC-001", "AC-002"],
    touches: ["score_risk"],
    verifyCommand: "pytest tests/test_runtime.py -q",
    verifyHash: verifyHashOf("pytest tests/test_runtime.py -q"),
    dod: "all signatures executable",
    depends: [],
    phase: "P0",
    status: "pending",
    evidence: null,
    ...partial,
  };
}

function makeLedger(tasks: readonly LedgerTask[]): TaskLedger {
  return {
    version: 1,
    generatedAt: "2026-06-12T00:00:00.000Z",
    buildPlanHash: "x".repeat(64),
    tasks: [...tasks],
  };
}

describe("next-prompt — BUILD-state task dispatch (SOP 0.5.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-task-prompt-");
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.5.0" });
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_implementation_log",
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("dispatches the first pending task with cleared depends", async () => {
    await writeTaskLedger(
      project.cwd,
      makeLedger([
        ledgerTask({ id: "task_done_one", status: "done" }),
        ledgerTask({ id: "task_alpha" }),
        ledgerTask({ id: "task_beta", depends: ["task_alpha"] }),
      ]),
    );
    const result = await generateNextPrompt({
      cwd: project.cwd,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    const prompt = result.ok ? (result.data?.prompt ?? "") : "";
    expect(prompt).toContain("Implement task `task_alpha`");
    expect(prompt).toContain("ship the runtime skeleton");
    expect(prompt).toContain("DoD: all signatures executable");
    expect(prompt).toContain("AC-001, AC-002");
    expect(prompt).toContain("Phase: P0");
    expect(prompt).toContain("pytest tests/test_runtime.py -q");
    expect(prompt).toContain("ocn task check task_alpha");
    expect(prompt).toContain("touches scope (score_risk)");
    expect(prompt).toContain("build receipts");
    expect(prompt).toContain("DoD reached and `ocn task check task_alpha` passes");
  });

  it("states it when every pending task is blocked by unmet depends", async () => {
    await writeTaskLedger(
      project.cwd,
      makeLedger([
        ledgerTask({ id: "task_a", depends: ["task_b"] }),
        ledgerTask({ id: "task_b", depends: ["task_a"] }),
      ]),
    );
    const result = await generateNextPrompt({
      cwd: project.cwd,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    const prompt = result.ok ? (result.data?.prompt ?? "") : "";
    expect(prompt).toContain("blocked by unmet depends");
    expect(prompt).toContain("task_a");
    expect(prompt).toContain("task_b");
  });

  it("no ledger → legacy objective unchanged (byte-compatible fallback)", async () => {
    const result = await generateNextPrompt({
      cwd: project.cwd,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    const prompt = result.ok ? (result.data?.prompt ?? "") : "";
    expect(prompt).toContain(
      "Advance OCN current step `step_implementation_log` (state `state_build`).",
    );
    expect(prompt).not.toContain("ocn task check");
  });

  it("ledger with zero pending tasks → legacy objective unchanged", async () => {
    await writeTaskLedger(
      project.cwd,
      makeLedger([ledgerTask({ id: "task_alpha", status: "done" })]),
    );
    const result = await generateNextPrompt({
      cwd: project.cwd,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    const prompt = result.ok ? (result.data?.prompt ?? "") : "";
    expect(prompt).toContain("Advance OCN current step `step_implementation_log`");
  });

  it("outside state_build the ledger does not change the objective", async () => {
    await seedState(project.cwd, {
      currentStateId: "state_plan",
      currentStepId: "step_build_plan",
    });
    await writeTaskLedger(project.cwd, makeLedger([ledgerTask({ id: "task_alpha" })]));
    const result = await generateNextPrompt({
      cwd: project.cwd,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    const prompt = result.ok ? (result.data?.prompt ?? "") : "";
    expect(prompt).toContain("Advance OCN current step `step_build_plan`");
  });
});
