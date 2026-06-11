import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { readTaskLedger, verifyHashOf, writeTaskLedger } from "../../src/core/task/task-ledger-store.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.5.0 (AM-007 / DEC-032) — task backbone gate via the gate runner on a
// 0.5.0-pinned project at step_build_plan. The task gate runs AFTER the
// section gate and BEFORE readiness, so the ledger is frozen even when the
// (open-world) readiness gate subsequently blocks a sparse test project.

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

const VALID_TASKS = [
  "### task_alpha",
  "- goal: ship alpha",
  "- traces: AC-001",
  "- verify: true",
  "- dod: alpha done",
  "",
  "### task_beta",
  "- goal: ship beta",
  "- traces: AC-002",
  "- verify: echo beta",
  "- dod: beta done",
  "- depends: task_alpha",
].join("\n");

async function gateOnce(cwd: string): Promise<Awaited<ReturnType<typeof runGate>>> {
  return runGate({ cwd, command: "gate", profile: PROFILE_050 });
}

describe("runGate — step_build_plan task backbone (SOP 0.5.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-task-gate-");
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

  it("blocks (ERR_ARTIFACT_INVALID) listing the defects; no ledger is written", async () => {
    const body = [
      "### task_alpha",
      "- goal: ship alpha",
      "- traces: AC-999", // dangling trace
      "- verify: true",
      "- dod: alpha done",
      "- depends: task_ghost", // dangling depends
    ].join("\n");
    await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc(body), "utf8");
    const result = await gateOnce(project.cwd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      const data = result.data as { blockingReasons?: readonly string[] };
      expect(data.blockingReasons).toContain("task_spec_defects");
      expect(result.message.zh).toContain("AC-999");
      expect(result.message.en).toContain("task_ghost");
    }
    expect(await readTaskLedger(project.cwd)).toBeNull();
  });

  it("blocks with no_tasks when the section carries zero task blocks", async () => {
    await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc("<!-- no tasks yet -->"), "utf8");
    const result = await gateOnce(project.cwd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_ARTIFACT_INVALID");
  });

  it("valid tasks → ledger written with frozen verify hashes (before readiness)", async () => {
    await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc(VALID_TASKS), "utf8");
    const result = await gateOnce(project.cwd);
    // A sparse test project may still be blocked by the readiness gate — but
    // never by the task gate, and the ledger MUST already be frozen.
    if (!result.ok) {
      const data = result.data as { blockingReasons?: readonly string[] };
      expect(data.blockingReasons).toEqual(["readiness_not_met"]);
    }
    const ledger = await readTaskLedger(project.cwd);
    expect(ledger).not.toBeNull();
    expect(ledger?.tasks.map((t) => t.id)).toEqual(["task_alpha", "task_beta"]);
    expect(ledger?.tasks[0]?.verifyHash).toBe(verifyHashOf("true"));
    expect(ledger?.tasks[1]?.verifyHash).toBe(verifyHashOf("echo beta"));
    expect(ledger?.tasks.every((t) => t.status === "pending" && t.evidence === null)).toBe(true);
    expect(ledger?.buildPlanHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("re-gating after an UNRELATED edit keeps done status; editing a done task's verify resets it", async () => {
    await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc(VALID_TASKS), "utf8");
    await gateOnce(project.cwd);
    const first = await readTaskLedger(project.cwd);
    expect(first).not.toBeNull();
    if (first === null) return;

    // Mark task_alpha done (as `ocn task check` would after exit 0).
    await writeTaskLedger(project.cwd, {
      ...first,
      tasks: first.tasks.map((t) =>
        t.id === "task_alpha"
          ? {
              ...t,
              status: "done" as const,
              evidence: { ranAt: "2026-06-12T00:00:00.000Z", exitCode: 0, commandHash: t.verifyHash },
            }
          : t,
      ),
    });

    // Unrelated edit (prose outside the task blocks) → done survives re-gate.
    await fs.writeFile(
      join(project.cwd, ARTIFACT),
      makeDoc(VALID_TASKS).replace("## Risk Points｜风险点", "## Risk Points｜风险点\n\nnew prose"),
      "utf8",
    );
    await gateOnce(project.cwd);
    const second = await readTaskLedger(project.cwd);
    expect(second?.tasks.find((t) => t.id === "task_alpha")?.status).toBe("done");
    expect(second?.tasks.find((t) => t.id === "task_alpha")?.evidence).not.toBeNull();

    // Editing the done task's verify command → hash changes → reset to pending.
    await fs.writeFile(
      join(project.cwd, ARTIFACT),
      makeDoc(VALID_TASKS.replace("- verify: true", "- verify: false")),
      "utf8",
    );
    await gateOnce(project.cwd);
    const third = await readTaskLedger(project.cwd);
    expect(third?.tasks.find((t) => t.id === "task_alpha")?.status).toBe("pending");
    expect(third?.tasks.find((t) => t.id === "task_alpha")?.evidence).toBeNull();
  });

  it("does NOT run the task gate on a 0.4.0 profile (no section_task_specs requirement)", async () => {
    const project040 = await createTempProject("ocn-task-gate-040-");
    try {
      await initProject({ cwd: project040.cwd, tier: "minimal", sopVersion: "0.4.0" });
      await seedState(project040.cwd, {
        currentStateId: "state_plan",
        currentStepId: "step_build_plan",
      });
      // 0.4.0 build plan without any Task Specs section — section gate passes
      // (task gate never activates), so no ERR_ARTIFACT_INVALID and no ledger.
      const doc040 = makeDoc(VALID_TASKS).replace("## Task Specs｜任务规格", "## Notes");
      await fs.writeFile(join(project040.cwd, ARTIFACT), doc040, "utf8");
      const result = await runGate({
        cwd: project040.cwd,
        command: "gate",
        profile: loadSopProfileByVersion("0.4.0"),
      });
      if (!result.ok) {
        expect(result.code).not.toBe("ERR_ARTIFACT_INVALID");
      }
      expect(await readTaskLedger(project040.cwd)).toBeNull();
    } finally {
      await project040.cleanup();
    }
  });
});
