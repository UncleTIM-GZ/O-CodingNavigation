import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { rewindState } from "../../src/core/rewind/rewind-state.js";
import { readState } from "../../src/core/state/state-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-033 P0 — concurrent rewind race (mirrors advance-state-concurrency):
// rewind re-reads state inside the lock and compares against the pre-lock
// cursor. When two rewinds race from the same position, at most one wins;
// the loser returns a structured ERR_STATE_MACHINE stale result instead of
// double-writing, and the on-disk state stays valid.

interface AuditEventLike {
  readonly eventType: string;
  readonly result: string;
  readonly command?: string;
  readonly data?: { failureReason?: string };
}

async function readEvents(cwd: string): Promise<AuditEventLike[]> {
  const file = join(cwd, ".ocoding", "audit", "audit-events.jsonl");
  const raw = await fs.readFile(file, "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line) as AuditEventLike);
}

describe("rewindState — concurrent rewind race", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-rewind-race-");
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.3.0" });
    await createArtifact({ cwd: project.cwd, type: "project-brief" });
    const advanced = await advanceState({ cwd: project.cwd });
    expect(advanced.ok).toBe(true);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("at most one of two racing rewinds succeeds; the loser reports stale state", async () => {
    const [a, b] = await Promise.all([
      rewindState({
        cwd: project.cwd,
        targetStepId: "step_project_brief",
        reason: "racer A",
      }),
      rewindState({
        cwd: project.cwd,
        targetStepId: "step_project_brief",
        reason: "racer B",
      }),
    ]);

    const outcomes = [a, b];
    const wins = outcomes.filter((r) => r.ok);
    const losses = outcomes.filter((r) => !r.ok);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    expect(losses[0]?.code).toBe("ERR_STATE_MACHINE");

    // On-disk state is valid and points at the rewind target exactly once.
    const state = await readState(project.cwd);
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_project_brief");

    // Exactly one success event; the loser left a stale_state failure.
    const events = await readEvents(project.cwd);
    const successes = events.filter(
      (e) => e.eventType === "cursor_rewind" && e.result === "success",
    );
    expect(successes).toHaveLength(1);
    const stales = events.filter(
      (e) =>
        e.eventType === "cursor_rewind" &&
        e.result === "failed" &&
        e.data?.failureReason === "stale_state",
    );
    expect(stales).toHaveLength(1);
  });
});
