import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditEvent } from "../../src/types/audit.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// P4 — `ocn readiness waive` CLI integration (audit assertions follow the
// tests/cli/audit-check.test.ts pattern).

async function readEvents(cwd: string): Promise<AuditEvent[]> {
  const file = join(cwd, ".ocoding", "audit", "audit-events.jsonl");
  const text = await fs.readFile(file, "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => AuditEvent.parse(JSON.parse(l)));
}

describe("ocn readiness waive (P4)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.4.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("grants a conditional waiver: file written, audited, list shows WAIVED", async () => {
    const waive = await spawnOcn(
      [
        "readiness",
        "waive",
        "rdy_service_desk_analyst",
        "--reason",
        "内部工具暂无外部用户",
        "--probe",
        "true",
        "--json",
      ],
      { cwd: project.cwd },
    );
    expect(waive.exitCode).toBe(0);
    const waiversText = await fs.readFile(
      join(project.cwd, ".ocoding", "readiness-waivers.yaml"),
      "utf8",
    );
    expect(waiversText).toContain("rdy_service_desk_analyst");

    const events = await readEvents(project.cwd);
    const waived = events.find((e) => e.eventType === "readiness_waived");
    expect(waived).toBeDefined();
    expect((waived?.data as Record<string, unknown>)["checkId"]).toBe("rdy_service_desk_analyst");
    expect((waived?.data as Record<string, unknown>)["stateId"]).toBe("state_discovery");

    const list = await spawnOcn(["readiness", "list", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(list.stdout);
    const check = parsed.data.ledger.checks.find(
      (c: { id: string }) => c.id === "rdy_service_desk_analyst",
    );
    expect(check.verdict).toBe("WAIVED");
    expect(parsed.message.en).toContain("WAIVED 1");
  }, 30_000);

  it("rejects unknown check ids", async () => {
    const result = await spawnOcn(
      ["readiness", "waive", "rdy_ghost", "--reason", "x", "--probe", "true", "--json"],
      { cwd: project.cwd },
    );
    expect(result.exitCode).toBe(2);
  }, 30_000);

  it("rejects waivable:false checks (rdy_qa_engineer)", async () => {
    const result = await spawnOcn(
      ["readiness", "waive", "rdy_qa_engineer", "--reason", "x", "--probe", "true", "--json"],
      { cwd: project.cwd },
    );
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout || result.stderr);
    expect(parsed.message.zh).toContain("不可豁免");
    await expect(
      fs.stat(join(project.cwd, ".ocoding", "readiness-waivers.yaml")),
    ).rejects.toThrow();
  }, 30_000);

  it("refuses to grant when the precondition probe fails (no dead waivers)", async () => {
    const result = await spawnOcn(
      [
        "readiness",
        "waive",
        "rdy_service_desk_analyst",
        "--reason",
        "x",
        "--probe",
        "exit 1",
        "--json",
      ],
      { cwd: project.cwd },
    );
    expect(result.exitCode).toBe(1);
    await expect(
      fs.stat(join(project.cwd, ".ocoding", "readiness-waivers.yaml")),
    ).rejects.toThrow();
  }, 30_000);
});
