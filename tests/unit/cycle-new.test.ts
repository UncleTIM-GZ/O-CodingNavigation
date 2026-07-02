import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { cycleNew } from "../../src/core/cycle/cycle-new.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { readState } from "../../src/core/state/state-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-033 P2 — `cycleNew` engine behavior (rulings ②③④):
//   - archives the round's runtime state to .ocoding/cycles/<n>-<ts>/
//     (round number = archive dir name, no schema change);
//   - the audit log is NOT archived — one JSONL spans all cycles, with
//     `cycle_started` stitching rounds together (方案甲);
//   - the new round keeps the current pin (upgrade is `ocn sop upgrade`'s
//     job) and keeps the user-owned config.yaml live;
//   - docs/ artifacts stay untouched so gates fast-forward next round.

interface AuditEventLike {
  readonly eventType: string;
  readonly result: string;
  readonly command?: string;
  readonly correlationId?: string;
  readonly data?: {
    round?: number;
    archivePath?: string;
    failureReason?: string;
    from?: { stateId: string; stepId: string };
    to?: { stateId: string; stepId: string };
  };
}

async function readEvents(cwd: string): Promise<AuditEventLike[]> {
  const raw = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line) as AuditEventLike);
}

async function listCycleDirs(cwd: string): Promise<string[]> {
  return (await fs.readdir(join(cwd, ".ocoding", "cycles"))).sort();
}

describe("cycleNew", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cycle-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks with ERR_IO_OR_CONFIG when the project is not initialized", async () => {
    const result = await cycleNew({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });

  describe("on an initialized 0.3.0 project advanced one step", () => {
    beforeEach(async () => {
      await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.3.0" });
      await createArtifact({ cwd: project.cwd, type: "project-brief" });
      const advanced = await advanceState({ cwd: project.cwd });
      expect(advanced.ok).toBe(true);
    });

    it("archives the round, resets the cursor to the first step, keeps the pin", async () => {
      const result = await cycleNew({ cwd: project.cwd });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok result");
      expect(result.data?.round).toBe(1);
      expect(result.data?.from).toEqual({ stateId: "state_spec", stepId: "step_scope" });
      expect(result.data?.to).toEqual({
        stateId: "state_discovery",
        stepId: "step_project_brief",
      });

      const state = await readState(project.cwd);
      expect(state.currentStateId).toBe("state_discovery");
      expect(state.currentStepId).toBe("step_project_brief");
      expect(state.project.sopProfileVersion).toBe("0.3.0");
      expect(state.latestGateResult).toBeNull();

      const dirs = await listCycleDirs(project.cwd);
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toMatch(/^1-/);
      // The archived round's state.json is the pre-cycle one.
      const archived = JSON.parse(
        await fs.readFile(
          join(project.cwd, ".ocoding", "cycles", dirs[0] ?? "", "state.json"),
          "utf8",
        ),
      );
      expect(archived.currentStepId).toBe("step_scope");
    });

    it("archives the acceptance-specs projection into the round dir (AM-015)", async () => {
      // Projection-first reads (acceptance-loader / readAcIds) must not bind the
      // new round to the prior round's frozen AC ids — the projection is per-round.
      const specsFile = join(project.cwd, ".ocoding", "acceptance-specs.json");
      await fs.writeFile(specsFile, JSON.stringify({ version: 1, items: [] }), "utf8");
      const result = await cycleNew({ cwd: project.cwd });
      expect(result.ok).toBe(true);
      await expect(fs.stat(specsFile)).rejects.toThrow(); // moved out of live .ocoding/
      const dirs = await listCycleDirs(project.cwd);
      await expect(
        fs.stat(join(project.cwd, ".ocoding", "cycles", dirs[0] ?? "", "acceptance-specs.json")),
      ).resolves.toBeDefined();
    });

    it("keeps the audit log live and continuous: old events + cycle_started in one JSONL", async () => {
      const before = await readEvents(project.cwd);
      expect(before.some((e) => e.eventType === "state_transitioned")).toBe(true);

      const result = await cycleNew({ cwd: project.cwd });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok result");

      const events = await readEvents(project.cwd);
      // Continuity: pre-cycle events are still in the same file.
      expect(events.some((e) => e.eventType === "state_transitioned")).toBe(true);
      const started = events.filter((e) => e.eventType === "cycle_started");
      expect(started).toHaveLength(1);
      expect(started[0]?.data?.round).toBe(1);
      expect(started[0]?.data?.archivePath).toMatch(/^\.ocoding\/cycles\/1-/);
      expect(started[0]?.data?.from).toEqual({ stateId: "state_spec", stepId: "step_scope" });
      expect(started[0]?.correlationId).toBe(result.data?.correlationId);
    });

    it("keeps user-owned config.yaml live and re-renders profile snapshots", async () => {
      const configBefore = await fs.readFile(join(project.cwd, ".ocoding", "config.yaml"), "utf8");
      const result = await cycleNew({ cwd: project.cwd });
      expect(result.ok).toBe(true);

      const configAfter = await fs.readFile(join(project.cwd, ".ocoding", "config.yaml"), "utf8");
      expect(configAfter).toBe(configBefore);
      // Profile-owned snapshots exist again for the new round.
      const sop = await fs.readFile(join(project.cwd, ".ocoding", "sop.yaml"), "utf8");
      expect(sop.length).toBeGreaterThan(0);
    });

    it("moves the task ledger into the archive when present", async () => {
      const ledgerPath = join(project.cwd, ".ocoding", "task-ledger.json");
      await fs.writeFile(ledgerPath, '{"tasks":[]}\n', "utf8");

      const result = await cycleNew({ cwd: project.cwd });
      expect(result.ok).toBe(true);

      await expect(fs.access(ledgerPath)).rejects.toThrow();
      const dirs = await listCycleDirs(project.cwd);
      const archivedLedger = await fs.readFile(
        join(project.cwd, ".ocoding", "cycles", dirs[0] ?? "", "task-ledger.json"),
        "utf8",
      );
      expect(archivedLedger).toContain("tasks");
    });

    it("moves the contract graph projection into the archive when present (AM-012 review #2)", async () => {
      const graphPath = join(project.cwd, ".ocoding", "contract-graph.json");
      await fs.writeFile(graphPath, '{"endpoints":[],"calls":[],"violations":[]}\n', "utf8");

      const result = await cycleNew({ cwd: project.cwd });
      expect(result.ok).toBe(true);

      await expect(fs.access(graphPath)).rejects.toThrow();
      const dirs = await listCycleDirs(project.cwd);
      const archived = await fs.readFile(
        join(project.cwd, ".ocoding", "cycles", dirs[0] ?? "", "contract-graph.json"),
        "utf8",
      );
      expect(archived).toContain("endpoints");
    });

    it("leaves docs/ artifacts untouched for next-round gate fast-forward", async () => {
      const briefPath = join(project.cwd, "docs", "00-project-brief.md");
      const before = await fs.readFile(briefPath, "utf8");
      await cycleNew({ cwd: project.cwd });
      const after = await fs.readFile(briefPath, "utf8");
      expect(after).toBe(before);
    });

    it("numbers the second cycle round 2", async () => {
      const first = await cycleNew({ cwd: project.cwd });
      expect(first.ok).toBe(true);
      // Move one step into round 2 so the second cycle archives a distinct position.
      const advanced = await advanceState({ cwd: project.cwd });
      expect(advanced.ok).toBe(true);

      const second = await cycleNew({ cwd: project.cwd });
      expect(second.ok).toBe(true);
      if (!second.ok) throw new Error("expected ok result");
      expect(second.data?.round).toBe(2);

      const dirs = await listCycleDirs(project.cwd);
      expect(dirs).toHaveLength(2);
      expect(dirs.some((d) => d.startsWith("1-"))).toBe(true);
      expect(dirs.some((d) => d.startsWith("2-"))).toBe(true);
    });

    it("loser of a concurrent cycle race reports stale state; only one archive is created", async () => {
      const [a, b] = await Promise.all([
        cycleNew({ cwd: project.cwd }),
        cycleNew({ cwd: project.cwd }),
      ]);
      const outcomes = [a, b];
      const wins = outcomes.filter((r) => r.ok);
      const losses = outcomes.filter((r) => !r.ok);
      expect(wins).toHaveLength(1);
      expect(losses).toHaveLength(1);
      expect(losses[0]?.code).toBe("ERR_STATE_MACHINE");

      const dirs = await listCycleDirs(project.cwd);
      expect(dirs).toHaveLength(1);

      const events = await readEvents(project.cwd);
      const successes = events.filter(
        (e) => e.eventType === "cycle_started" && e.result === "success",
      );
      expect(successes).toHaveLength(1);
    });
  });
});
