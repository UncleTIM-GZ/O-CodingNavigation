import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-009 / DEC-034 — `ocn auto` switch surface. The switch itself is
// human-only (refuses OCN_ACTOR=ai_agent), CLI-only (never via MCP), and
// every on/off/resume is a push audit event (`auto_mode_changed`); status is
// pull-mode and writes nothing (§4.7 precedent).

async function readAuditEvents(cwd: string): Promise<Array<Record<string, unknown>>> {
  let text: string;
  try {
    text = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function autoModeEvents(cwd: string): Promise<Array<Record<string, unknown>>> {
  return (await readAuditEvents(cwd)).filter((e) => e["eventType"] === "auto_mode_changed");
}

describe("ocn auto (AM-009)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-auto-");
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("status: exit 0, manual defaults, and writes NO audit event (pull mode)", async () => {
    const result = await spawnOcn(["auto", "status", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.config).toEqual({
      phase1: false,
      phase2: false,
      circuitBreaker: { maxConsecutiveGateFailures: 5 },
    });
    expect(parsed.data.runtime.suspended).toBe(false);
    expect(await autoModeEvents(project.cwd)).toEqual([]);
  }, 30_000);

  it("on requires --phase (exit 4, nothing changes)", async () => {
    const result = await spawnOcn(["auto", "on", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(4);
    expect(JSON.parse(result.stdout).code).toBe("ERR_IO_OR_CONFIG");
    expect(await autoModeEvents(project.cwd)).toEqual([]);
  }, 30_000);

  it("rejects an invalid --phase value with exit 4", async () => {
    const result = await spawnOcn(["auto", "on", "--phase", "3", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(4);
    expect(JSON.parse(result.stdout).code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("on --phase 1: persists to config.yaml, audits with before/after, status reflects", async () => {
    const result = await spawnOcn(["auto", "on", "--phase", "1", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.config.phase1).toBe(true);
    expect(parsed.data.config.phase2).toBe(false);

    const configText = await fs.readFile(join(project.cwd, ".ocoding", "config.yaml"), "utf8");
    expect(configText).toContain("automation:");
    expect(configText).toContain("phase1: true");

    const events = await autoModeEvents(project.cwd);
    expect(events).toHaveLength(1);
    const event = events[0] as {
      actor: string;
      result: string;
      data: { action: string; before: { phase1: boolean }; after: { phase1: boolean } };
    };
    expect(event.actor).toBe("user");
    expect(event.result).toBe("success");
    expect(event.data.action).toBe("on");
    expect(event.data.before.phase1).toBe(false);
    expect(event.data.after.phase1).toBe(true);

    const status = await spawnOcn(["auto", "status", "--json"], { cwd: project.cwd });
    expect(JSON.parse(status.stdout).data.config.phase1).toBe(true);
  }, 30_000);

  it("on --phase all then off (default all): both phases toggle, two more audit events", async () => {
    await spawnOcn(["auto", "on", "--phase", "all", "--json"], { cwd: project.cwd });
    const off = await spawnOcn(["auto", "off", "--json"], { cwd: project.cwd });
    expect(off.exitCode).toBe(0);
    const parsed = JSON.parse(off.stdout);
    expect(parsed.data.config.phase1).toBe(false);
    expect(parsed.data.config.phase2).toBe(false);

    const events = await autoModeEvents(project.cwd);
    expect(events.map((e) => (e["data"] as { action: string }).action)).toEqual(["on", "off"]);
  }, 30_000);

  it("off --phase 2 only turns phase2 off, phase1 stays on", async () => {
    await spawnOcn(["auto", "on", "--phase", "all", "--json"], { cwd: project.cwd });
    const off = await spawnOcn(["auto", "off", "--phase", "2", "--json"], { cwd: project.cwd });
    expect(off.exitCode).toBe(0);
    const parsed = JSON.parse(off.stdout);
    expect(parsed.data.config.phase1).toBe(true);
    expect(parsed.data.config.phase2).toBe(false);
  }, 30_000);

  it("the switch is human-only: OCN_ACTOR=ai_agent is refused (exit 4), config untouched", async () => {
    const result = await spawnOcn(["auto", "on", "--phase", "1", "--json"], {
      cwd: project.cwd,
      env: { OCN_ACTOR: "ai_agent" },
    });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
    expect(parsed.data?.reason).toBe("automation_switch_human_only");

    const status = await spawnOcn(["auto", "status", "--json"], { cwd: project.cwd });
    expect(JSON.parse(status.stdout).data.config.phase1).toBe(false);
  }, 30_000);

  it("resume clears a suspended runtime and audits action=resume", async () => {
    await spawnOcn(["auto", "on", "--phase", "1", "--json"], { cwd: project.cwd });
    const runtimeFile = join(project.cwd, ".ocoding", "automation-runtime.json");
    await fs.writeFile(
      runtimeFile,
      JSON.stringify({
        schemaVersion: "1.0",
        suspended: true,
        suspendedAt: "2026-06-13T00:00:00.000Z",
        suspendedReason: "circuit_breaker_tripped",
        failureCounter: { stepId: "step_project_brief", count: 5 },
      }),
      "utf8",
    );

    const result = await spawnOcn(["auto", "resume", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.runtime.suspended).toBe(false);
    expect(parsed.data.runtime.failureCounter).toBeNull();

    const events = await autoModeEvents(project.cwd);
    expect((events.at(-1)?.["data"] as { action: string }).action).toBe("resume");
  }, 30_000);

  it("exits 4 on an uninitialized directory", async () => {
    const bare = await createTempProject("ocn-cli-auto-bare-");
    try {
      const result = await spawnOcn(["auto", "on", "--phase", "1", "--json"], {
        cwd: bare.cwd,
      });
      expect(result.exitCode).toBe(4);
      expect(JSON.parse(result.stdout).code).toBe("ERR_IO_OR_CONFIG");
    } finally {
      await bare.cleanup();
    }
  }, 30_000);

  it("renders bilingual text on the human path", async () => {
    const result = await spawnOcn(["auto", "on", "--phase", "1"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("自动模式");
    expect(result.stdout).toMatch(/[Aa]uto mode/);
  }, 30_000);

  it("appears in ocn --help", async () => {
    const result = await spawnOcn(["--help"], { cwd: project.cwd });
    expect(result.stdout).toContain("auto");
  }, 30_000);
});
