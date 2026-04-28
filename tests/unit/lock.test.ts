import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_STALE_THRESHOLD_MS,
  LockTimeoutError,
  acquireLock,
  isProcessAlive,
  isStaleLockState,
  releaseLock,
  withLock,
} from "../../src/core/state/lock.js";
import type { LockState } from "../../src/types/lock.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const lockPath = (project: TempProject) => join(project.cwd, ".ocoding", ".lock");

describe("isStaleLockState (pure)", () => {
  const baseState: LockState = {
    pid: 99,
    createdAt: new Date("2026-04-28T12:00:00.000Z").toISOString(),
    command: "writeState",
    client: "cli",
    projectRoot: "/tmp/x",
  };

  it("returns false for a fresh lock even if pid is dead", () => {
    expect(
      isStaleLockState({
        state: baseState,
        now: new Date("2026-04-28T12:00:05.000Z"),
        staleThresholdMs: DEFAULT_STALE_THRESHOLD_MS,
        pidAlive: false,
      }),
    ).toBe(false);
  });

  it("returns false for an old lock with an alive pid", () => {
    expect(
      isStaleLockState({
        state: baseState,
        now: new Date("2026-04-28T12:01:00.000Z"),
        staleThresholdMs: DEFAULT_STALE_THRESHOLD_MS,
        pidAlive: true,
      }),
    ).toBe(false);
  });

  it("returns true for an old lock with a dead pid", () => {
    expect(
      isStaleLockState({
        state: baseState,
        now: new Date("2026-04-28T12:01:00.000Z"),
        staleThresholdMs: DEFAULT_STALE_THRESHOLD_MS,
        pidAlive: false,
      }),
    ).toBe(true);
  });
});

describe("isProcessAlive", () => {
  it("returns true for the current process pid", async () => {
    expect(await isProcessAlive(process.pid)).toBe(true);
  });

  it("returns false for a clearly-bogus pid", async () => {
    // 2_147_483_640 is near the max int — unlikely to be a live pid on the host.
    expect(await isProcessAlive(2_147_483_640)).toBe(false);
  });

  it("returns false for non-positive input", async () => {
    expect(await isProcessAlive(0)).toBe(false);
    expect(await isProcessAlive(-1)).toBe(false);
  });
});

describe("acquireLock / releaseLock", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-lock-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates the lock file with the current pid", async () => {
    const handle = await acquireLock({
      lockFile: lockPath(project),
      command: "writeState",
      projectRoot: project.cwd,
    });
    const raw = await fs.readFile(handle.lockFile, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.pid).toBe(process.pid);
    expect(parsed.command).toBe("writeState");
    expect(parsed.client).toBe("cli");
    expect(parsed.projectRoot).toBe(project.cwd);
    expect(parsed.createdAt).toMatch(/Z$/);
    expect(handle.reclaimed).toBe(false);
    await releaseLock(handle);
  });

  it("releaseLock removes the lock file", async () => {
    const handle = await acquireLock({
      lockFile: lockPath(project),
      command: "writeState",
      projectRoot: project.cwd,
    });
    await releaseLock(handle);
    await expect(fs.stat(handle.lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("releaseLock is a no-op when the file has already been removed", async () => {
    const handle = await acquireLock({
      lockFile: lockPath(project),
      command: "writeState",
      projectRoot: project.cwd,
    });
    await fs.unlink(handle.lockFile);
    await expect(releaseLock(handle)).resolves.toBeUndefined();
  });

  it("times out when the lock is held by an alive pid (using process.pid as the holder)", async () => {
    // Hand-craft a fresh lock owned by this very process — never stale, never reclaimable.
    const lockFile = lockPath(project);
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    const occupied: LockState = {
      pid: process.pid,
      createdAt: new Date().toISOString(),
      command: "occupied",
      client: "cli",
      projectRoot: project.cwd,
    };
    await fs.writeFile(lockFile, JSON.stringify(occupied), "utf8");

    await expect(
      acquireLock({
        lockFile,
        command: "writeState",
        projectRoot: project.cwd,
        retryIntervalMs: 50,
        timeoutMs: 250,
      }),
    ).rejects.toBeInstanceOf(LockTimeoutError);
  });

  it("reclaims a stale lock (old timestamp + dead pid)", async () => {
    const lockFile = lockPath(project);
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    const stale: LockState = {
      pid: 2_147_483_640, // not a real pid
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      command: "stale",
      client: "cli",
      projectRoot: project.cwd,
    };
    await fs.writeFile(lockFile, JSON.stringify(stale), "utf8");

    const handle = await acquireLock({
      lockFile,
      command: "writeState",
      projectRoot: project.cwd,
      retryIntervalMs: 50,
      timeoutMs: 1_000,
      staleThresholdMs: 30_000,
    });
    expect(handle.reclaimed).toBe(true);
    expect(handle.lockState.pid).toBe(process.pid);
    await releaseLock(handle);
  });

  it("treats an unparseable lock file as not-stale-yet, then times out", async () => {
    const lockFile = lockPath(project);
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(lockFile, "this is not json", "utf8");

    await expect(
      acquireLock({
        lockFile,
        command: "writeState",
        projectRoot: project.cwd,
        retryIntervalMs: 50,
        timeoutMs: 200,
      }),
    ).rejects.toBeInstanceOf(LockTimeoutError);
  });
});

describe("withLock", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-with-lock-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("acquires, runs the operation, and releases the lock", async () => {
    let observedLockExists = false;
    const result = await withLock(
      {
        lockFile: lockPath(project),
        command: "writeState",
        projectRoot: project.cwd,
      },
      async () => {
        observedLockExists = await fs
          .stat(lockPath(project))
          .then(() => true)
          .catch(() => false);
        return 42;
      },
    );
    expect(result).toBe(42);
    expect(observedLockExists).toBe(true);
    await expect(fs.stat(lockPath(project))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("releases the lock even when the operation throws", async () => {
    await expect(
      withLock(
        {
          lockFile: lockPath(project),
          command: "writeState",
          projectRoot: project.cwd,
        },
        async () => {
          throw new Error("boom");
        },
      ),
    ).rejects.toThrow("boom");
    await expect(fs.stat(lockPath(project))).rejects.toMatchObject({ code: "ENOENT" });
  });

  // PR #4 §2.1 — onReleased must fire even when releaseLock throws.
  it("calls onReleased even when fs.unlink throws a non-ENOENT error", async () => {
    // Prepare: pre-acquire the lock so it exists, then sabotage fs.unlink so
    // releaseLock throws on the first invocation.
    const { vi } = await import("vitest");
    const lockFile = lockPath(project);
    let onReleasedCalled = false;

    const originalUnlink = fs.unlink.bind(fs);
    let unlinkCallCount = 0;
    const unlinkSpy = vi.spyOn(fs, "unlink").mockImplementation(async (...args) => {
      unlinkCallCount += 1;
      if (unlinkCallCount === 1) {
        throw Object.assign(new Error("perm denied"), { code: "EACCES" });
      }
      return originalUnlink(...(args as Parameters<typeof originalUnlink>));
    });

    try {
      await expect(
        withLock(
          {
            lockFile,
            command: "test",
            projectRoot: project.cwd,
            lifecycle: {
              onReleased: () => {
                onReleasedCalled = true;
              },
            },
          },
          async () => undefined,
        ),
      ).rejects.toThrow();
    } finally {
      unlinkSpy.mockRestore();
      // Cleanup: ensure no orphan lock blocks subsequent tests.
      await fs.unlink(lockFile).catch(() => undefined);
    }

    expect(onReleasedCalled).toBe(true);
  });
});
