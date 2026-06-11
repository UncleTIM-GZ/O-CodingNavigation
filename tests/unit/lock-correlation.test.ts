import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { makeLockAuditHook } from "../../src/core/audit/lock-audit.js";
import { withLock } from "../../src/core/state/lock.js";
import { AuditEvent } from "../../src/types/audit.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

async function readEvents(cwd: string) {
  const raw = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => AuditEvent.parse(JSON.parse(line)));
}

describe("PR #5 §4 — lock events accept correlationId", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    // Pinned to 0.3.0 — these tests exercise advance/gate mechanics on the
    // frozen 0.3.0 profile (the 0.4.0 readiness gate would block pass paths).
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.3.0" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("makeLockAuditHook threads correlationId into every emitted lock event", async () => {
    const { newCorrelationId } = await import("../../src/core/audit/correlation.js");
    const correlationId = newCorrelationId();
    const lockHook = makeLockAuditHook({
      projectRoot: project.cwd,
      command: "test",
      correlationId,
    });

    const lockFile = join(project.cwd, ".ocoding", ".lock");
    await withLock(
      {
        lockFile,
        command: "test",
        projectRoot: project.cwd,
        lifecycle: lockHook,
      },
      async () => {
        /* no-op */
      },
    );

    const events = await readEvents(project.cwd);
    // Filter to events emitted by THIS withLock call (command="test"); init's
    // own lock events also live in the JSONL but were emitted with command="init"
    // and no correlationId.
    const lockEvents = events.filter(
      (e) =>
        (e.eventType === "lock_acquired" || e.eventType === "lock_released") &&
        e.command === "test",
    );
    expect(lockEvents.length).toBeGreaterThan(0);
    for (const e of lockEvents) {
      expect(e.correlationId).toBe(correlationId);
    }
  });

  it("advance flow: lock_acquired and lock_released share advance correlationId", async () => {
    await createArtifact({ cwd: project.cwd, type: "project-brief" });
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const correlationId = result.data!.correlationId;

    const events = await readEvents(project.cwd);
    const lockAcquired = events.find(
      (e) => e.eventType === "lock_acquired" && e.correlationId === correlationId,
    );
    const lockReleased = events.find(
      (e) => e.eventType === "lock_released" && e.correlationId === correlationId,
    );
    expect(lockAcquired).toBeDefined();
    expect(lockReleased).toBeDefined();
  });

  it("lock hook without correlationId still works (backwards compat)", async () => {
    const lockHook = makeLockAuditHook({
      projectRoot: project.cwd,
      command: "test",
    });
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    await withLock(
      {
        lockFile,
        command: "test",
        projectRoot: project.cwd,
        lifecycle: lockHook,
      },
      async () => {
        /* no-op */
      },
    );
    const events = await readEvents(project.cwd);
    const lockEvents = events.filter(
      (e) => e.eventType === "lock_acquired" || e.eventType === "lock_released",
    );
    // No correlationId thread when not provided.
    const recent = lockEvents.slice(-2);
    for (const e of recent) {
      expect(e.correlationId).toBeUndefined();
    }
  });
});
