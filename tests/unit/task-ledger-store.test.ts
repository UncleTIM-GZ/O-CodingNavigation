import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskLedger, TaskSpec } from "../../src/types/task.js";
import {
  buildLedger,
  readTaskLedger,
  sha256Hex,
  verifyHashOf,
  writeTaskLedger,
} from "../../src/core/task/task-ledger-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.5.0 (AM-007 / DEC-032) — ledger store: defensive reads, atomic writes,
// and the done-carry semantics (id + verifyHash must BOTH hold).

function spec(id: string, verifyCommand: string): TaskSpec {
  return {
    id,
    goal: "g",
    traces: ["AC-001"],
    touches: [],
    verifyCommand,
    verifyHash: verifyHashOf(verifyCommand),
    dod: "d",
    depends: [],
  };
}

describe("task-ledger-store", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-task-ledger-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("readTaskLedger returns null when the file is absent", async () => {
    expect(await readTaskLedger(project.cwd)).toBeNull();
  });

  it("readTaskLedger returns null on invalid JSON / invalid schema", async () => {
    const file = join(project.cwd, ".ocoding", "task-ledger.json");
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(file, "{not json", "utf8");
    expect(await readTaskLedger(project.cwd)).toBeNull();
    await fs.writeFile(file, JSON.stringify({ version: 2, tasks: [] }), "utf8");
    expect(await readTaskLedger(project.cwd)).toBeNull();
  });

  it("write/read roundtrip preserves the ledger byte-semantics", async () => {
    const ledger = buildLedger([spec("task_a", "true")], null, sha256Hex("section"));
    await writeTaskLedger(project.cwd, ledger);
    const back = await readTaskLedger(project.cwd);
    expect(back).toEqual(ledger);
    // No stray temp files left behind (atomic temp+rename).
    const entries = await fs.readdir(join(project.cwd, ".ocoding"));
    expect(entries.filter((e) => e.includes(".tmp"))).toEqual([]);
  });

  it("buildLedger starts every task pending with null evidence", () => {
    const ledger = buildLedger([spec("task_a", "true")], null, "hash");
    expect(ledger.version).toBe(1);
    expect(ledger.buildPlanHash).toBe("hash");
    expect(ledger.generatedAt.endsWith("Z")).toBe(true);
    expect(ledger.tasks[0]?.status).toBe("pending");
    expect(ledger.tasks[0]?.evidence).toBeNull();
  });

  it("buildLedger carries done + evidence only for same id AND same verifyHash", () => {
    const prev: TaskLedger = {
      version: 1,
      generatedAt: "2026-06-12T00:00:00.000Z",
      buildPlanHash: "old",
      tasks: [
        {
          ...spec("task_keep", "true"),
          status: "done",
          evidence: { ranAt: "2026-06-12T00:00:00.000Z", exitCode: 0, commandHash: verifyHashOf("true") },
        },
        {
          ...spec("task_changed", "true"),
          status: "done",
          evidence: { ranAt: "2026-06-12T00:00:00.000Z", exitCode: 0, commandHash: verifyHashOf("true") },
        },
      ],
    };
    const next = buildLedger(
      [spec("task_keep", "true"), spec("task_changed", "false"), spec("task_new", "true")],
      prev,
      "new",
    );
    const byId = new Map(next.tasks.map((t) => [t.id, t]));
    expect(byId.get("task_keep")?.status).toBe("done");
    expect(byId.get("task_keep")?.evidence).not.toBeNull();
    // verify command changed → hash changed → reset to pending.
    expect(byId.get("task_changed")?.status).toBe("pending");
    expect(byId.get("task_changed")?.evidence).toBeNull();
    expect(byId.get("task_new")?.status).toBe("pending");
  });

  it("verifyHashOf hashes the TRIMMED command", () => {
    expect(verifyHashOf("  true \n")).toBe(verifyHashOf("true"));
    expect(verifyHashOf("true")).toMatch(/^[0-9a-f]{64}$/);
  });
});
