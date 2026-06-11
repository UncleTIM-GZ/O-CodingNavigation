import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-007 / DEC-032 — CLI integration for `ocn task list` / `ocn task check`
// on a 0.5.0 project: gate freezes the ledger, list reads it, check runs the
// frozen command and flips pending → done.

const AC_STUB = "# AC\n\n## Acceptance Criteria\n\n- AC-001: stub one\n";

const BUILD_PLAN = [
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
  "### task_smoke",
  "- goal: smoke the loop",
  "- traces: AC-001",
  "- verify: true",
  "- dod: loop demonstrated",
  "",
].join("\n");

describe("ocn task (SOP 0.5.0 / AM-007)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-task-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("`ocn task --help` lists the list and check subcommands", async () => {
    const help = await spawnOcn(["task", "--help"], { cwd: project.cwd });
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain("list");
    expect(help.stdout).toContain("check");
  }, 30_000);

  it("task list without a ledger → ok with ledger:false and the bilingual hint", async () => {
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.5.0"], { cwd: project.cwd });
    const result = await spawnOcn(["task", "list", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("task.list");
    expect(parsed.data.ledger).toBe(false);
    expect(parsed.data.tasks).toEqual([]);
    expect(parsed.message.zh).toContain("build plan 门禁");
  }, 30_000);

  it("task list / task check block (exit 4) when OCN is not initialized", async () => {
    const result = await spawnOcn(["task", "list", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("full loop: gate freezes ledger → list shows pending → check → list shows done", async () => {
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.5.0"], { cwd: project.cwd });
    await seedState(project.cwd, {
      currentStateId: "state_plan",
      currentStepId: "step_build_plan",
    });
    await fs.writeFile(join(project.cwd, "docs", "03-acceptance-criteria.md"), AC_STUB, "utf8");
    await fs.writeFile(join(project.cwd, "docs", "11-build-plan.md"), BUILD_PLAN, "utf8");

    // The gate freezes the ledger after the section + task gates pass; the
    // sparse temp project may still exit 1 on the (later) readiness gate.
    const gate = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    expect([0, 1]).toContain(gate.exitCode);
    await fs.access(join(project.cwd, ".ocoding", "task-ledger.json"));

    const listBefore = await spawnOcn(["task", "list", "--json"], { cwd: project.cwd });
    expect(listBefore.exitCode).toBe(0);
    const before = JSON.parse(listBefore.stdout);
    expect(before.data.ledger).toBe(true);
    expect(before.data.tasks).toEqual([
      {
        id: "task_smoke",
        phase: null,
        status: "pending",
        traces: ["AC-001"],
        verifyCommand: "true",
      },
    ]);

    const check = await spawnOcn(["task", "check", "--json"], { cwd: project.cwd });
    expect(check.exitCode).toBe(0);
    const checked = JSON.parse(check.stdout);
    expect(checked.ok).toBe(true);
    expect(checked.data.taskId).toBe("task_smoke");
    expect(checked.data.status).toBe("done");

    const listAfter = await spawnOcn(["task", "list", "--json"], { cwd: project.cwd });
    const after = JSON.parse(listAfter.stdout);
    expect(after.data.tasks[0].status).toBe("done");
    expect(after.message.zh).toContain("已勾销 1");
  }, 60_000);

  it("gate blocks exit 2 on task-spec defects (dangling trace)", async () => {
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.5.0"], { cwd: project.cwd });
    await seedState(project.cwd, {
      currentStateId: "state_plan",
      currentStepId: "step_build_plan",
    });
    await fs.writeFile(join(project.cwd, "docs", "03-acceptance-criteria.md"), AC_STUB, "utf8");
    await fs.writeFile(
      join(project.cwd, "docs", "11-build-plan.md"),
      BUILD_PLAN.replace("- traces: AC-001", "- traces: AC-404"),
      "utf8",
    );
    const gate = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
    expect(gate.exitCode).toBe(2);
    const parsed = JSON.parse(gate.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.message.en).toContain("AC-404");
  }, 30_000);
});
