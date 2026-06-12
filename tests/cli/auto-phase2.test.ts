import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-009 / DEC-034 — phase-2 delegation: `ocn task check` for ai_agent (the
// frozen-command judgement is unchanged) and the milestone-loop rewind (Owner
// ruling 2026-06-13: multi-P build plans complete without a human between
// milestones — the ONLY ai-delegable rewind shape). Plus the hard human-only
// zones that no mode ever delegates.

const AI = { OCN_ACTOR: "ai_agent" };

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

async function readAuditEvents(cwd: string): Promise<Array<Record<string, unknown>>> {
  const text = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

/** init 0.5.0 → freeze the ledger at step_build_plan → move into BUILD. */
async function setupBuildProject(project: TempProject): Promise<void> {
  await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.5.0"], { cwd: project.cwd });
  await seedState(project.cwd, {
    currentStateId: "state_plan",
    currentStepId: "step_build_plan",
  });
  await fs.writeFile(join(project.cwd, "docs", "03-acceptance-criteria.md"), AC_STUB, "utf8");
  await fs.writeFile(join(project.cwd, "docs", "11-build-plan.md"), BUILD_PLAN, "utf8");
  const gate = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
  expect([0, 1]).toContain(gate.exitCode);
  await fs.access(join(project.cwd, ".ocoding", "task-ledger.json"));
  await seedState(project.cwd, {
    currentStateId: "state_build",
    currentStepId: "step_implementation_log",
  });
}

describe("ocn task check / rewind — phase-2 delegation (AM-009)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-auto-p2-");
    await setupBuildProject(project);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("ai task check is refused without the phase-2 grant", async () => {
    const result = await spawnOcn(
      ["task", "check", "--rationale", "verify task_smoke", "--json"],
      { cwd: project.cwd, env: AI },
    );
    expect(result.exitCode).toBe(4);
    expect(JSON.parse(result.stdout).data.reason).toBe("automation_not_enabled");
  }, 30_000);

  it("phase2 on: ai task check runs the frozen command; audit carries rationale + frozen command + duration", async () => {
    await spawnOcn(["auto", "on", "--phase", "2", "--json"], { cwd: project.cwd });

    const noRationale = await spawnOcn(["task", "check", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(noRationale.exitCode).toBe(4);
    expect(JSON.parse(noRationale.stdout).data.reason).toBe("automation_rationale_required");

    const result = await spawnOcn(
      ["task", "check", "--rationale", "背景:task_smoke; 依据:冻结命令 true; 操作:check", "--json"],
      { cwd: project.cwd, env: AI },
    );
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).data.status).toBe("done");

    const completed = (await readAuditEvents(project.cwd)).find(
      (e) => e["eventType"] === "task_completed",
    ) as {
      actor: string;
      data: { rationale: string; frozenCommand: string; durationMs: number };
    };
    expect(completed.actor).toBe("ai_agent");
    expect(completed.data.rationale).toContain("依据");
    expect(completed.data.frozenCommand).toBe("true");
    expect(typeof completed.data.durationMs).toBe("number");
  }, 30_000);

  it("milestone rewind: ai may rewind ONLY to step_build_plan from BUILD/VERIFY under phase 2", async () => {
    await spawnOcn(["auto", "on", "--phase", "2", "--json"], { cwd: project.cwd });

    const wrongTarget = await spawnOcn(
      ["rewind", "--to", "step_prd", "--reason", "trying to escape", "--json"],
      { cwd: project.cwd, env: AI },
    );
    expect(wrongTarget.exitCode).toBe(4);

    const milestone = await spawnOcn(
      ["rewind", "--to", "step_build_plan", "--reason", "P0 完成，回拨追加 P1 任务", "--json"],
      { cwd: project.cwd, env: AI },
    );
    expect(milestone.exitCode).toBe(0);
    const parsed = JSON.parse(milestone.stdout);
    expect(parsed.data.to.stepId).toBe("step_build_plan");

    const rewindEvent = (await readAuditEvents(project.cwd))
      .filter((e) => e["eventType"] === "cursor_rewind")
      .at(-1) as { actor: string; result: string };
    expect(rewindEvent.actor).toBe("ai_agent");
    expect(rewindEvent.result).toBe("success");
  }, 30_000);

  it("ai milestone rewind is refused without phase 2 (human-only fallback intact)", async () => {
    const result = await spawnOcn(
      ["rewind", "--to", "step_build_plan", "--reason", "P0 done", "--json"],
      { cwd: project.cwd, env: AI },
    );
    expect(result.exitCode).toBe(4);

    const human = await spawnOcn(
      ["rewind", "--to", "step_build_plan", "--reason", "human rework", "--json"],
      { cwd: project.cwd },
    );
    expect(human.exitCode).toBe(0);
  }, 30_000);

  it("hard human-only zones refuse ai_agent in every mode: cycle new / readiness waive / sop upgrade", async () => {
    await spawnOcn(["auto", "on", "--phase", "all", "--json"], { cwd: project.cwd });

    const cycle = await spawnOcn(["cycle", "new", "--yes", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(cycle.exitCode).toBe(4);
    expect(JSON.parse(cycle.stdout).data.reason).toBe("automation_human_only");

    const waive = await spawnOcn(
      ["readiness", "waive", "rdy_network_engineer", "--reason", "r", "--probe", "true", "--json"],
      { cwd: project.cwd, env: AI },
    );
    expect(waive.exitCode).toBe(4);
    expect(JSON.parse(waive.stdout).data.reason).toBe("automation_human_only");

    const upgrade = await spawnOcn(["sop", "upgrade", "--plan", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(upgrade.exitCode).toBe(4);
    expect(JSON.parse(upgrade.stdout).data.reason).toBe("automation_human_only");
  }, 30_000);
});
