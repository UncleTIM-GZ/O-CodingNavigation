import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LockTimeoutError,
  acquireLock,
  releaseLock,
  withLock,
  type LockHandle,
  type LockLifecycleHook,
} from "../../src/core/state/lock.js";
import { makeLockAuditHook } from "../../src/core/audit/lock-audit.js";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import { AuditEvent } from "../../src/types/audit.js";
import type { LockState } from "../../src/types/lock.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const lockPath = (project: TempProject) => join(project.cwd, ".ocoding", ".lock");

async function readEvents(project: TempProject) {
  const raw = await fs.readFile(AuditPaths.jsonlFile(project.cwd), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .map((line) => AuditEvent.parse(JSON.parse(line)));
}

describe("withLock + LockLifecycleHook (synthetic)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-lock-hook-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("calls onAcquired after the lock is taken and onReleased after release", async () => {
    const order: string[] = [];
    const lifecycle: LockLifecycleHook = {
      onAcquired: () => {
        order.push("acquired");
      },
      onReleased: () => {
        order.push("released");
      },
    };

    await withLock(
      {
        lockFile: lockPath(project),
        command: "test",
        projectRoot: project.cwd,
        lifecycle,
      },
      async () => {
        order.push("op");
      },
    );

    expect(order).toEqual(["acquired", "op", "released"]);
  });

  it("calls onTimeout when the lock cannot be acquired", async () => {
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

    let timeoutCalled = false;
    await expect(
      acquireLock({
        lockFile,
        command: "test",
        projectRoot: project.cwd,
        retryIntervalMs: 25,
        timeoutMs: 100,
        lifecycle: {
          onTimeout: () => {
            timeoutCalled = true;
          },
        },
      }),
    ).rejects.toBeInstanceOf(LockTimeoutError);
    expect(timeoutCalled).toBe(true);
  });

  it("calls onStaleRecovered when reclaiming a stale lock", async () => {
    const lockFile = lockPath(project);
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    const stale: LockState = {
      pid: 2_147_483_640,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      command: "stale",
      client: "cli",
      projectRoot: project.cwd,
    };
    await fs.writeFile(lockFile, JSON.stringify(stale), "utf8");

    let recovered = false;
    const handle = await acquireLock({
      lockFile,
      command: "test",
      projectRoot: project.cwd,
      retryIntervalMs: 50,
      timeoutMs: 1_000,
      staleThresholdMs: 30_000,
      lifecycle: {
        onStaleRecovered: () => {
          recovered = true;
        },
      },
    });
    expect(recovered).toBe(true);
    expect(handle.reclaimed).toBe(true);
    await releaseLock(handle);
  });

  it("swallows hook errors and preserves the lock contract", async () => {
    const lifecycle: LockLifecycleHook = {
      onAcquired: () => {
        throw new Error("hook boom");
      },
      onReleased: () => {
        throw new Error("hook boom 2");
      },
    };
    let opRan = false;
    await withLock(
      {
        lockFile: lockPath(project),
        command: "test",
        projectRoot: project.cwd,
        lifecycle,
      },
      async () => {
        opRan = true;
      },
    );
    expect(opRan).toBe(true);
    // Lock must be released regardless of hook errors.
    await expect(fs.stat(lockPath(project))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("makeLockAuditHook integration", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-lock-audit-hook-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("emits lock_acquired and lock_released to JSONL during withLock", async () => {
    const lifecycle = makeLockAuditHook({
      projectRoot: project.cwd,
      command: "writeState",
    });

    await withLock(
      {
        lockFile: lockPath(project),
        command: "writeState",
        projectRoot: project.cwd,
        lifecycle,
      },
      async () => {
        /* no-op */
      },
    );

    const events = await readEvents(project);
    const types = events.map((e) => e.eventType);
    expect(types).toContain("lock_acquired");
    expect(types).toContain("lock_released");
    // Acquired comes before released.
    expect(types.indexOf("lock_acquired")).toBeLessThan(types.indexOf("lock_released"));
  });

  it("emits lock_timeout when acquireLock times out", async () => {
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

    const lifecycle = makeLockAuditHook({
      projectRoot: project.cwd,
      command: "writeState",
    });

    await expect(
      acquireLock({
        lockFile,
        command: "writeState",
        projectRoot: project.cwd,
        retryIntervalMs: 25,
        timeoutMs: 100,
        lifecycle,
      }),
    ).rejects.toBeInstanceOf(LockTimeoutError);

    const events = await readEvents(project);
    const types = events.map((e) => e.eventType);
    expect(types).toContain("lock_timeout");
  });

  it("emits lock_stale_recovered after reclaiming a stale lock", async () => {
    const lockFile = lockPath(project);
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    const stale: LockState = {
      pid: 2_147_483_640,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      command: "stale",
      client: "cli",
      projectRoot: project.cwd,
    };
    await fs.writeFile(lockFile, JSON.stringify(stale), "utf8");

    const lifecycle = makeLockAuditHook({
      projectRoot: project.cwd,
      command: "writeState",
    });

    const handle: LockHandle = await acquireLock({
      lockFile,
      command: "writeState",
      projectRoot: project.cwd,
      retryIntervalMs: 50,
      timeoutMs: 1_000,
      staleThresholdMs: 30_000,
      lifecycle,
    });
    await releaseLock(handle);

    const events = await readEvents(project);
    const types = events.map((e) => e.eventType);
    expect(types).toContain("lock_stale_recovered");
    expect(types).toContain("lock_acquired");
  });
});
