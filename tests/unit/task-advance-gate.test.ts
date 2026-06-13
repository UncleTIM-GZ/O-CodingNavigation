import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { taskLedgerGuardOrNull } from "../../src/core/advance/task-ledger-guard.js";
import { initProject } from "../../src/core/init.js";
import { verifyHashOf, writeTaskLedger } from "../../src/core/task/task-ledger-store.js";
import { readState } from "../../src/core/state/state-store.js";
import { getTemplate } from "../../src/core/templates/index.js";
import type { LedgerTask, TaskLedger } from "../../src/types/task.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.5.0 (AM-007 / DEC-032) — transition gate out of state_build:
// 任务台账不清，不准进 VERIFY。 The flow test runs on a 0.3.0-pinned project so
// the section gate is the only artifact gate in play (the readiness gate of
// 0.4.0+ would block a sparse temp project before the guard is reached) —
// the guard itself reads only the ledger and is profile-independent.

function ledgerTask(id: string, status: "pending" | "done"): LedgerTask {
  return {
    id,
    goal: "g",
    traces: ["AC-001"],
    touches: [],
    verifyCommand: "true",
    verifyHash: verifyHashOf("true"),
    dod: "d",
    depends: [],
    status,
    evidence:
      status === "done"
        ? { ranAt: "2026-06-12T00:00:00.000Z", exitCode: 0, commandHash: verifyHashOf("true") }
        : null,
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

describe("advance — task ledger transition gate (SOP 0.5.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-task-advance-");
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.3.0" });
    // Last BUILD step; its artifact gate passes with the bundled template.
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_integration_notes",
    });
    await fs.writeFile(
      join(project.cwd, "docs", "14-integration-notes.md"),
      getTemplate("integration-notes").template,
      "utf8",
    );
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks ERR_GATE_FAILED when the ledger has pending tasks, listing their ids", async () => {
    await writeTaskLedger(
      project.cwd,
      makeLedger([ledgerTask("task_a", "done"), ledgerTask("task_b", "pending")]),
    );
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      expect(result.message.en).toContain("task_b");
      expect(result.message.en).not.toContain("task_a");
      expect(result.message.zh).toContain("不准进入 VERIFY");
    }
  });

  it("proceeds into state_verify once every task is done", async () => {
    await writeTaskLedger(
      project.cwd,
      makeLedger([ledgerTask("task_a", "done"), ledgerTask("task_b", "done")]),
    );
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.to?.stateId).toBe("state_verify");
      expect(result.data?.to?.stepId).toBe("step_verification_report");
    }
  });

  it("no ledger (0.3.0 legacy) → advance proceeds unchanged", async () => {
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.to?.stateId).toBe("state_verify");
  });

  it("blocks intra-build advance while tasks pending (task-first, AM-010)", async () => {
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_implementation_log",
    });
    await fs.writeFile(
      join(project.cwd, "docs", "12-implementation-log.md"),
      getTemplate("implementation-log").template,
      "utf8",
    );
    await writeTaskLedger(project.cwd, makeLedger([ledgerTask("task_a", "pending")]));
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      expect(result.message.en).toContain("task_a");
      expect(result.message.en).toContain("/ocn-next");
      expect(result.message.zh).toContain("/ocn-next");
      // intra-build refusal must NOT claim a VERIFY crossing
      expect(result.message.zh).not.toContain("不准进入 VERIFY");
    }
    // cursor must not have moved
    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_build");
    expect(state.currentStepId).toBe("step_implementation_log");
  });

  it("walks forward within state_build once tasks are done", async () => {
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_implementation_log",
    });
    await fs.writeFile(
      join(project.cwd, "docs", "12-implementation-log.md"),
      getTemplate("implementation-log").template,
      "utf8",
    );
    await writeTaskLedger(project.cwd, makeLedger([ledgerTask("task_a", "done")]));
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.to?.stateId).toBe("state_build");
      expect(result.data?.to?.stepId).toBe("step_change_evidence");
    }
  });
});

describe("taskLedgerGuardOrNull — unit semantics", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-task-guard-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  const FROM = { stateId: "state_build", stepId: "step_integration_notes" } as const;
  const NEXT = { stateId: "state_verify", stepId: "step_verification_report" } as const;

  it("lists at most 6 pending ids and counts the remainder", async () => {
    const tasks = Array.from({ length: 8 }, (_, i) => ledgerTask(`task_t${i}`, "pending"));
    await writeTaskLedger(project.cwd, makeLedger(tasks));
    const block = await taskLedgerGuardOrNull(project.cwd, FROM, NEXT);
    expect(block).not.toBeNull();
    expect(block?.pendingTaskIds).toHaveLength(8);
    expect(block?.message.en).toContain("task_t5");
    expect(block?.message.en).not.toContain("task_t6");
    expect(block?.message.en).toContain("+2 more");
  });

  it("returns null when entering BUILD (from outside) and for absent ledgers", async () => {
    expect(await taskLedgerGuardOrNull(project.cwd, FROM, NEXT)).toBeNull(); // no ledger
    await writeTaskLedger(project.cwd, makeLedger([ledgerTask("task_a", "pending")]));
    // entry into BUILD (from.stateId !== state_build) is never guarded
    expect(
      await taskLedgerGuardOrNull(
        project.cwd,
        { stateId: "state_plan", stepId: "step_build_plan" },
        { stateId: "state_build", stepId: "step_implementation_log" },
      ),
    ).toBeNull();
  });

  it("blocks intra-build forward moves with a task-first message (AM-010)", async () => {
    await writeTaskLedger(project.cwd, makeLedger([ledgerTask("task_a", "pending")]));
    const block = await taskLedgerGuardOrNull(
      project.cwd,
      { stateId: "state_build", stepId: "step_implementation_log" },
      { stateId: "state_build", stepId: "step_change_evidence" },
    );
    expect(block).not.toBeNull();
    expect(block?.pendingTaskIds).toEqual(["task_a"]);
    expect(block?.message.en).toContain("/ocn-next");
    expect(block?.message.en).toContain("task_a");
    expect(block?.message.zh).not.toContain("不准进入 VERIFY");
  });
});
