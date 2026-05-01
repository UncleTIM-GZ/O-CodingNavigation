import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LockHandle } from "../../src/core/state/lock.js";
import {
  readState,
  writeStateAtomic,
  writeStateUnlocked,
} from "../../src/core/state/state-store.js";
import type { ProjectState } from "../../src/types/state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

function buildState(overrides: Partial<ProjectState["project"]> = {}): ProjectState {
  return {
    schemaVersion: "1.0",
    project: {
      projectId: overrides.projectId ?? "atom-test",
      name: overrides.name ?? "Atomic Test",
      tier: overrides.tier ?? "minimal",
      sopProfileId: "default-ai-coding-sop",
      sopProfileVersion: "0.1.0",
    },
    currentStateId: "state_spec",
    currentStepId: "step_prd",
    artifacts: {},
    latestGateResult: null,
  };
}

describe("writeStateAtomic — lock + backup + temp + rename", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-atom-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates state.json on the first write and does NOT create a .bak", async () => {
    await writeStateAtomic(project.cwd, buildState());
    const stateFile = join(project.cwd, ".ocoding", "state.json");
    const bakFile = `${stateFile}.bak`;
    await fs.access(stateFile);
    await expect(fs.stat(bakFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("creates .bak on the second write containing the previous state", async () => {
    const first = buildState({ name: "First" });
    const second = buildState({ name: "Second" });
    await writeStateAtomic(project.cwd, first);
    await writeStateAtomic(project.cwd, second);

    const stateFile = join(project.cwd, ".ocoding", "state.json");
    const bakFile = `${stateFile}.bak`;
    const live = JSON.parse(await fs.readFile(stateFile, "utf8"));
    const bak = JSON.parse(await fs.readFile(bakFile, "utf8"));
    expect(live.project.name).toBe("Second");
    expect(bak.project.name).toBe("First");
  });

  it("removes the lock file after a successful write", async () => {
    await writeStateAtomic(project.cwd, buildState());
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("leaves no orphaned tmp file behind on success", async () => {
    await writeStateAtomic(project.cwd, buildState());
    const ocoding = join(project.cwd, ".ocoding");
    const entries = await fs.readdir(ocoding);
    const tmpEntries = entries.filter((e) => e.includes(".tmp"));
    expect(tmpEntries).toEqual([]);
  });

  it("round-trip: writeStateAtomic then readState returns equal state", async () => {
    const written = buildState({ name: "RoundTrip" });
    await writeStateAtomic(project.cwd, written);
    const readBack = await readState(project.cwd);
    expect(readBack).toEqual(written);
  });

  it("a tmp file dropped before rename does not corrupt state.json", async () => {
    // Establish a baseline state.
    const original = buildState({ name: "Original" });
    await writeStateAtomic(project.cwd, original);

    const stateFile = join(project.cwd, ".ocoding", "state.json");
    const originalContent = await fs.readFile(stateFile, "utf8");

    // Simulate a leftover stale tmp file and a partial write that never made
    // it to rename. The atomic protocol must not have touched state.json.
    const orphanTmp = join(
      project.cwd,
      ".ocoding",
      `state.json.${process.pid}.${Date.now()}.tmp.orphan`,
    );
    await fs.writeFile(orphanTmp, "garbage", "utf8");

    // The live state.json must still be intact and equal to the original.
    const stillOriginal = await fs.readFile(stateFile, "utf8");
    expect(stillOriginal).toBe(originalContent);
  });

  it("acquires and releases the lock around writeStateAtomic via the public API", async () => {
    // Earlier this test polled the lock file with `setInterval(..., 1)` to
    // observe the lock-held window. On fast CI runners the entire
    // writeStateAtomic critical section (acquire → backup → temp → rename →
    // release) completed inside a single tick, so the polling never observed
    // the lock and the test flaked (PR #33 attempt 1 hit exactly this — see
    // docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md).
    //
    // The fix routes the assertion through the LockLifecycleHook surface that
    // `acquireLock` / `withLock` already expose. `onAcquired` fires
    // synchronously *while* the lock is held, with the lock file present on
    // disk; `onReleased` fires after the unlink. There is no timing window
    // for the lock to slip past — the hook IS the moment.
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    let acquiredCount = 0;
    let releasedCount = 0;
    let lockFilePresentDuringAcquire = false;
    // Use a single-slot mutable holder so TypeScript doesn't narrow the
    // captured variable to `never` after assignment inside the callback.
    const acquiredHandleSlot: LockHandle[] = [];

    await writeStateAtomic(project.cwd, buildState(), {
      lifecycle: {
        onAcquired: async (handle) => {
          acquiredCount += 1;
          acquiredHandleSlot.push(handle);
          // While the lock is held the file MUST exist on disk. This is the
          // strong invariant the previous polling test was trying to
          // approximate; we now check it deterministically inside the
          // hook callback.
          await fs.access(lockFile);
          lockFilePresentDuringAcquire = true;
        },
        onReleased: () => {
          releasedCount += 1;
        },
      },
    });

    // Lifecycle assertions: exactly one acquire, exactly one release, both
    // observed without polling.
    expect(acquiredCount).toBe(1);
    expect(releasedCount).toBe(1);
    expect(lockFilePresentDuringAcquire).toBe(true);
    expect(acquiredHandleSlot).toHaveLength(1);
    const acquiredHandle = acquiredHandleSlot[0];
    expect(acquiredHandle?.lockFile).toBe(lockFile);
    expect(acquiredHandle?.lockState.pid).toBe(process.pid);

    // Disk assertion (preserved from the original test): after release the
    // lock file must be gone.
    await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("writeStateUnlocked — caller already holds the outer lock", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-atom-unlocked-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("performs the temp+rename without touching the lock file", async () => {
    await writeStateUnlocked(project.cwd, buildState());
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
    await fs.access(join(project.cwd, ".ocoding", "state.json"));
  });

  it("backs up an existing state.json on subsequent writes", async () => {
    await writeStateUnlocked(project.cwd, buildState({ name: "U-First" }));
    await writeStateUnlocked(project.cwd, buildState({ name: "U-Second" }));
    const bak = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json.bak"), "utf8"),
    );
    expect(bak.project.name).toBe("U-First");
  });
});
