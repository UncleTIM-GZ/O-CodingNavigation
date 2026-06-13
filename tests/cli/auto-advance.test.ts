import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-009 / DEC-034 — advance enforcement: ai_agent advances need the human's
// phase grant + rationale; gate failures feed the circuit breaker; humans are
// never affected by suspension. Pinned to 0.3.0 so the gate stack stays
// simple (no readiness) — auto mode is an engine feature, pin-independent.

const AI = { OCN_ACTOR: "ai_agent" };

async function readAuditEvents(cwd: string): Promise<Array<Record<string, unknown>>> {
  let text: string;
  try {
    text = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

async function readRuntime(cwd: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(
      await fs.readFile(join(cwd, ".ocoding", "automation-runtime.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function setBreakerThreshold(cwd: string, n: number): Promise<void> {
  const file = join(cwd, ".ocoding", "config.yaml");
  const text = await fs.readFile(file, "utf8");
  await fs.writeFile(
    file,
    text.replace(/maxConsecutiveGateFailures: \d+/, `maxConsecutiveGateFailures: ${n}`),
    "utf8",
  );
}

describe("ocn advance — auto-mode enforcement (AM-009, pinned 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-auto-adv-");
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("manual mode: ai_agent advance is refused (exit 4, automation_not_enabled), audited as ai_agent", async () => {
    const result = await spawnOcn(["advance", "--json"], { cwd: project.cwd, env: AI });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
    expect(parsed.data.reason).toBe("automation_not_enabled");

    const fail = (await readAuditEvents(project.cwd)).find(
      (e) => e["eventType"] === "advance_failed",
    );
    expect(fail?.["actor"]).toBe("ai_agent");
  }, 30_000);

  it("phase1 on but no --rationale: refused with automation_rationale_required", async () => {
    await spawnOcn(["auto", "on", "--phase", "1", "--json"], { cwd: project.cwd });
    const result = await spawnOcn(["advance", "--json"], { cwd: project.cwd, env: AI });
    expect(result.exitCode).toBe(4);
    expect(JSON.parse(result.stdout).data.reason).toBe("automation_rationale_required");
  }, 30_000);

  it("phase1 on + rationale: ai advance succeeds; audit carries actor=ai_agent, rationale and machine context", async () => {
    await spawnOcn(["auto", "on", "--phase", "1", "--json"], { cwd: project.cwd });
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const result = await spawnOcn(
      ["advance", "--rationale", "背景:project brief 完成; 依据:gate 全绿; 操作:advance", "--json"],
      { cwd: project.cwd, env: AI },
    );
    expect(result.exitCode).toBe(0);

    const success = (await readAuditEvents(project.cwd)).find(
      (e) => e["eventType"] === "advance_succeeded",
    ) as { actor: string; data: { rationale: string; context: { gatePassed: boolean } } };
    expect(success.actor).toBe("ai_agent");
    expect(success.data.rationale).toContain("依据");
    expect(success.data.context.gatePassed).toBe(true);
  }, 30_000);

  it("PLAN→BUILD boundary belongs to phase 2: refused under phase1-only, before the gate runs", async () => {
    await spawnOcn(["auto", "on", "--phase", "1", "--json"], { cwd: project.cwd });
    await seedState(project.cwd, {
      currentStateId: "state_plan",
      currentStepId: "step_build_plan",
    });
    const result = await spawnOcn(["advance", "--rationale", "cross", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(result.exitCode).toBe(4);
    expect(JSON.parse(result.stdout).data.reason).toBe("automation_not_enabled");
  }, 30_000);

  it("circuit breaker: N consecutive ai gate failures suspend auto mode; humans unaffected; resume clears", async () => {
    await spawnOcn(["auto", "on", "--phase", "1", "--json"], { cwd: project.cwd });
    await setBreakerThreshold(project.cwd, 2);

    // No project-brief yet → the gate fails. Two ai failures trip the breaker.
    const first = await spawnOcn(["advance", "--rationale", "try 1", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(first.exitCode).toBe(1);
    expect((await readRuntime(project.cwd))?.["suspended"]).toBe(false);

    const second = await spawnOcn(["advance", "--rationale", "try 2", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(second.exitCode).toBe(1);
    const runtime = await readRuntime(project.cwd);
    expect(runtime?.["suspended"]).toBe(true);

    const suspend = (await readAuditEvents(project.cwd)).find(
      (e) =>
        e["eventType"] === "auto_mode_changed" &&
        (e["data"] as { action: string }).action === "suspend",
    ) as { actor: string; data: { failureCount: number } };
    expect(suspend.actor).toBe("system");
    expect(suspend.data.failureCount).toBe(2);

    // Third ai attempt: refused outright (suspended), gate not even run.
    const third = await spawnOcn(["advance", "--rationale", "try 3", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(third.exitCode).toBe(4);
    expect(JSON.parse(third.stdout).data.reason).toBe("automation_suspended");

    // The human is never blocked by suspension: gate failure (1), not refusal (4).
    const human = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    expect(human.exitCode).toBe(1);

    // Human resume re-arms automation.
    await spawnOcn(["auto", "resume", "--json"], { cwd: project.cwd });
    const after = await spawnOcn(["advance", "--rationale", "try again", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(after.exitCode).toBe(1);
    expect((await readRuntime(project.cwd))?.["suspended"]).toBe(false);
  }, 60_000);

  it("a passing gate resets the consecutive-failure counter", async () => {
    await spawnOcn(["auto", "on", "--phase", "1", "--json"], { cwd: project.cwd });
    await spawnOcn(["advance", "--rationale", "will fail", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect((await readRuntime(project.cwd))?.["failureCounter"]).not.toBeNull();
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const pass = await spawnOcn(["advance", "--rationale", "gate green now", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(pass.exitCode).toBe(0);
    expect((await readRuntime(project.cwd))?.["failureCounter"]).toBeNull();
  }, 30_000);

  it("rejects an invalid actor value fast (exit 4)", async () => {
    const result = await spawnOcn(["advance", "--actor", "robot", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(4);
    expect(JSON.parse(result.stdout).data.reason).toBe("invalid_actor");
  }, 30_000);
});
