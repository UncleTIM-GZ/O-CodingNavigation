import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { runTaskCheck } from "../../src/core/task/task-check.js";
import { readTaskLedger, verifyHashOf, writeTaskLedger } from "../../src/core/task/task-ledger-store.js";
import type { TaskLedger } from "../../src/types/task.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.5.0 (AM-007 / DEC-032) — `ocn task check` core: frozen-command
// execution is the ONLY path to done; drift refuses; depends gate the default
// resolution; audit trail records task_completed.

const PROFILE_050 = loadSopProfileByVersion("0.5.0");
const ARTIFACT = "docs/11-build-plan.md";
const AC_STUB = "# AC\n\n## Acceptance Criteria\n\n- AC-001: stub one\n- AC-002: stub two\n";

function makeDoc(taskSpecsBody: string): string {
  return [
    "# Build Plan｜构建计划",
    "",
    "## Target Scope｜目标范围",
    "## Files Expected to Change｜预期变更文件",
    "## Implementation Tasks｜实施任务",
    "## Non-goals｜非目标",
    "## Risk Points｜风险点",
    "## Verification Commands｜验证命令",
    "",
    "## Task Specs｜任务规格",
    "",
    taskSpecsBody,
    "",
  ].join("\n");
}

const TASKS_BODY = [
  "### task_alpha",
  "- goal: ship alpha",
  "- traces: AC-001",
  "- verify: true",
  "- dod: alpha done",
  "",
  "### task_boom",
  "- goal: ship boom",
  "- traces: AC-002",
  "- verify: echo boom-tail; exit 3",
  "- dod: boom done",
  "- depends: task_alpha",
].join("\n");

async function freezeLedger(cwd: string, body: string): Promise<void> {
  await fs.writeFile(join(cwd, ARTIFACT), makeDoc(body), "utf8");
  await runGate({ cwd, command: "gate", profile: PROFILE_050 });
  expect(await readTaskLedger(cwd)).not.toBeNull();
}

describe("runTaskCheck (SOP 0.5.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-task-check-");
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.5.0" });
    await seedState(project.cwd, {
      currentStateId: "state_plan",
      currentStepId: "step_build_plan",
    });
    await fs.writeFile(join(project.cwd, "docs", "03-acceptance-criteria.md"), AC_STUB, "utf8");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("ledger absent → blocked ERR_ARTIFACT_INVALID", async () => {
    const result = await runTaskCheck({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_ARTIFACT_INVALID");
  });

  it("happy path: exit 0 → done + evidence + task_completed audit event", async () => {
    await freezeLedger(project.cwd, TASKS_BODY);
    const result = await runTaskCheck({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.taskId).toBe("task_alpha");
      expect(result.data?.status).toBe("done");
      expect(result.data?.exitCode).toBe(0);
    }
    const ledger = await readTaskLedger(project.cwd);
    const alpha = ledger?.tasks.find((t) => t.id === "task_alpha");
    expect(alpha?.status).toBe("done");
    expect(alpha?.evidence?.exitCode).toBe(0);
    expect(alpha?.evidence?.commandHash).toBe(verifyHashOf("true"));
    expect(alpha?.evidence?.ranAt.endsWith("Z")).toBe(true);

    const jsonl = await fs.readFile(
      join(project.cwd, ".ocoding", "audit", "audit-events.jsonl"),
      "utf8",
    );
    expect(jsonl).toContain('"task_completed"');
    expect(jsonl).toContain("task_alpha");
  });

  it("failing command → ERR_GATE_FAILED with the output tail", async () => {
    await freezeLedger(project.cwd, TASKS_BODY);
    await runTaskCheck({ cwd: project.cwd }); // task_alpha → done
    const result = await runTaskCheck({ cwd: project.cwd, taskId: "task_boom" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      const data = result.data as { exitCode?: number | null; outputTail?: string };
      expect(data.exitCode).toBe(3);
      expect(data.outputTail).toContain("boom-tail");
    }
    const ledger = await readTaskLedger(project.cwd);
    expect(ledger?.tasks.find((t) => t.id === "task_boom")?.status).toBe("pending");
  });

  it("drift: editing the verify command in the doc refuses with a re-gate instruction", async () => {
    await freezeLedger(project.cwd, TASKS_BODY);
    // Edit the doc WITHOUT re-running the gate — the frozen hash no longer matches.
    await fs.writeFile(
      join(project.cwd, ARTIFACT),
      makeDoc(TASKS_BODY.replace("- verify: true", "- verify: rm -rf /tmp/evil")),
      "utf8",
    );
    const result = await runTaskCheck({ cwd: project.cwd, taskId: "task_alpha" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      expect(result.message.zh).toContain("漂移");
      expect(result.message.en).toContain("drifted");
    }
  });

  it("drift: a task that vanished from the doc also refuses", async () => {
    await freezeLedger(project.cwd, TASKS_BODY);
    const withoutAlpha = TASKS_BODY.split("\n").slice(6).join("\n"); // drop task_alpha block
    await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc(withoutAlpha), "utf8");
    const result = await runTaskCheck({ cwd: project.cwd, taskId: "task_alpha" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.en).toContain("drifted");
  });

  it("default resolution honors depends: after alpha is done, boom is dispatched", async () => {
    await freezeLedger(project.cwd, TASKS_BODY);
    await runTaskCheck({ cwd: project.cwd }); // alpha done
    const result = await runTaskCheck({ cwd: project.cwd }); // next pending with deps clear = boom
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const data = result.data as { taskId?: string | null };
      expect(data.taskId).toBe("task_boom");
    }
  });

  it("every pending task blocked by unmet depends → ERR_GATE_FAILED naming the blockers", async () => {
    // Hand-built ledger (such a shape cannot pass the gate; the resolver must
    // still answer deterministically).
    const ledger: TaskLedger = {
      version: 1,
      generatedAt: "2026-06-12T00:00:00.000Z",
      buildPlanHash: "x",
      tasks: [
        {
          id: "task_a",
          goal: "g",
          traces: ["AC-001"],
          touches: [],
          verifyCommand: "true",
          verifyHash: verifyHashOf("true"),
          dod: "d",
          depends: ["task_b"],
          status: "pending",
          evidence: null,
        },
        {
          id: "task_b",
          goal: "g",
          traces: ["AC-001"],
          touches: [],
          verifyCommand: "true",
          verifyHash: verifyHashOf("true"),
          dod: "d",
          depends: ["task_a"],
          status: "pending",
          evidence: null,
        },
      ],
    };
    await writeTaskLedger(project.cwd, ledger);
    const result = await runTaskCheck({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      expect(result.message.en).toContain("task_a");
      expect(result.message.en).toContain("task_b");
    }
  });

  it("explicit unknown id → ERR_ARTIFACT_INVALID", async () => {
    await freezeLedger(project.cwd, TASKS_BODY);
    const result = await runTaskCheck({ cwd: project.cwd, taskId: "task_nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_ARTIFACT_INVALID");
  });

  it("rerunning a done task re-executes and refreshes the evidence", async () => {
    await freezeLedger(project.cwd, TASKS_BODY);
    await runTaskCheck({ cwd: project.cwd, taskId: "task_alpha" });
    // Age the evidence so the refresh is observable.
    const ledger = await readTaskLedger(project.cwd);
    expect(ledger).not.toBeNull();
    if (ledger === null) return;
    await writeTaskLedger(project.cwd, {
      ...ledger,
      tasks: ledger.tasks.map((t) =>
        t.id === "task_alpha" && t.evidence !== null
          ? { ...t, evidence: { ...t.evidence, ranAt: "2020-01-01T00:00:00.000Z" } }
          : t,
      ),
    });
    const rerun = await runTaskCheck({ cwd: project.cwd, taskId: "task_alpha" });
    expect(rerun.ok).toBe(true);
    const after = await readTaskLedger(project.cwd);
    const alpha = after?.tasks.find((t) => t.id === "task_alpha");
    expect(alpha?.status).toBe("done");
    expect(alpha?.evidence?.ranAt).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("all tasks done → ok no-op with taskId null", async () => {
    await freezeLedger(
      project.cwd,
      ["### task_alpha", "- goal: g", "- traces: AC-001", "- verify: true", "- dod: d"].join("\n"),
    );
    await runTaskCheck({ cwd: project.cwd });
    const result = await runTaskCheck({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.taskId).toBeNull();
  });
});
