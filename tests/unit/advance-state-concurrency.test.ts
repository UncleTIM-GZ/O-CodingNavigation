import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { readState } from "../../src/core/state/state-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// Post-Codex P1 fix — concurrent advance race regression coverage.
//
// Pre-fix, advanceState computed `next` from a pre-lock `readState` and
// blindly wrote it inside the lock without re-checking whether the state had
// already moved. Two interleaved advance calls from the same `from` could
// double-advance OR a stale caller could overwrite a newer in-lock state with
// an older target.
//
// Post-fix contract:
//   - At most one of the concurrent calls succeeds in the same transition.
//   - The other call returns ok=false with code=ERR_STATE_MACHINE and
//     reason='stale_state' in the audit trail.
//   - The on-disk state.json is never invalid.
//   - The audit trail does not record two `state_transitioned` events for
//     the same one transition (i.e. no double-advance).

interface AuditEventLike {
  readonly eventType: string;
  readonly command?: string;
  readonly correlationId?: string;
  readonly data?: { reason?: string; from?: { stateId: string; stepId: string } };
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

// Init also emits a state_write_succeeded event (command="init.write-state").
// The race tests care only about advance-flow events.
function advanceEvents(events: readonly AuditEventLike[]): AuditEventLike[] {
  return events.filter((e) => e.command === "advance");
}

describe("advanceState — concurrent advance race", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-advance-race-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
    // Make the gate pass so both concurrent calls reach the lock-protected
    // mutation path. Otherwise a blocked call never tests the race.
    await createArtifact({ cwd: project.cwd, type: "project-brief" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("two concurrent advance calls produce at most one state transition", async () => {
    const [a, b] = await Promise.all([
      advanceState({ cwd: project.cwd }),
      advanceState({ cwd: project.cwd }),
    ]);

    const successes = [a, b].filter((r) => r.ok);
    const failures = [a, b].filter((r) => !r.ok);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    const failure = failures[0]!;
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.code).toBe("ERR_STATE_MACHINE");
    }

    // Final on-disk state must be the single legitimate next step
    // (state_discovery / step_scope), not the original `from` and not a
    // skipped target.
    const finalState = await readState(project.cwd);
    expect(finalState.currentStateId).toBe("state_discovery");
    expect(finalState.currentStepId).toBe("step_scope");
  });

  it("audit trail records exactly one state_transitioned event for the single transition", async () => {
    await Promise.all([advanceState({ cwd: project.cwd }), advanceState({ cwd: project.cwd })]);

    const events = advanceEvents(await readEvents(project.cwd));
    const transitions = events.filter((e) => e.eventType === "state_transitioned");
    expect(transitions.length).toBe(1);

    const stateWrites = events.filter((e) => e.eventType === "state_write_succeeded");
    expect(stateWrites.length).toBe(1);

    const succeeded = events.filter((e) => e.eventType === "advance_succeeded");
    expect(succeeded.length).toBe(1);

    // The losing call must surface as advance_failed with reason 'stale_state'.
    const stale = events.filter(
      (e) => e.eventType === "advance_failed" && e.data?.reason === "stale_state",
    );
    expect(stale.length).toBe(1);
  });

  it("state.json remains schema-valid throughout the race", async () => {
    await Promise.all([advanceState({ cwd: project.cwd }), advanceState({ cwd: project.cwd })]);
    // readState calls ProjectState.safeParse; if the file is corrupt or
    // partially written, this throws StateInvalidError.
    const final = await readState(project.cwd);
    expect(final.currentStateId).toBeTypeOf("string");
    expect(final.currentStepId).toBeTypeOf("string");
  });

  it("survives a 100-iteration in-process stress loop with no double-advance", async () => {
    // 100 fresh races. Each iteration: fresh project, advance the gate to
    // pass, race two advance calls, assert exactly-one-success.
    for (let i = 0; i < 100; i++) {
      const p = await createTempProject(`ocn-advance-race-loop-${i}-`);
      try {
        await initProject({ cwd: p.cwd, tier: "minimal" });
        await createArtifact({ cwd: p.cwd, type: "project-brief" });

        const [a, b] = await Promise.all([
          advanceState({ cwd: p.cwd }),
          advanceState({ cwd: p.cwd }),
        ]);
        const okCount = [a, b].filter((r) => r.ok).length;
        expect(okCount, `iteration ${i} produced ${okCount} successes`).toBe(1);

        const final = await readState(p.cwd);
        expect(final.currentStepId, `iteration ${i} state`).toBe("step_scope");
      } finally {
        await p.cleanup();
      }
    }
  }, 60_000);
});
