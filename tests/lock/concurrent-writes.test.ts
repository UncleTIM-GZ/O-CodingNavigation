import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withLock } from "../../src/core/state/lock.js";
import { writeStateAtomic } from "../../src/core/state/state-store.js";
import { ProjectState } from "../../src/types/state.js";
import type { LockState } from "../../src/types/lock.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

function buildState(name: string): ProjectState {
  return {
    schemaVersion: "1.0",
    project: {
      projectId: "concurrent-test",
      name,
      tier: "minimal",
      sopProfileId: "default-ai-coding-sop",
      sopProfileVersion: "0.1.0",
    },
    currentStateId: "state_spec",
    currentStepId: "step_prd",
    artifacts: {},
    latestGateResult: null,
  };
}

describe("Layer 6: Lock / Concurrency", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-concurrent-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("5 concurrent writeStateAtomic calls produce a single valid state.json", async () => {
    const writers = Array.from({ length: 5 }, (_, i) =>
      writeStateAtomic(project.cwd, buildState(`writer-${i}`), {
        retryIntervalMs: 25,
        timeoutMs: 5_000,
      }),
    );
    await Promise.all(writers);

    const stateFile = join(project.cwd, ".ocoding", "state.json");
    const raw = await fs.readFile(stateFile, "utf8");
    const parsed = ProjectState.parse(JSON.parse(raw));
    expect(parsed.project.name).toMatch(/^writer-\d$/);

    // Lock file must be gone after all writers settle.
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });

    // No orphan tmp files left behind.
    const ocoding = await fs.readdir(join(project.cwd, ".ocoding"));
    expect(ocoding.filter((e) => e.endsWith(".tmp"))).toEqual([]);
  });

  it("10 concurrent acquireLock calls — exactly one holds the lock at any moment", async () => {
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    const N = 10;
    let inside = 0;
    let maxInside = 0;
    const order: number[] = [];

    const workers = Array.from({ length: N }, (_, i) =>
      withLock(
        {
          lockFile,
          command: "writeState",
          projectRoot: project.cwd,
          retryIntervalMs: 20,
          timeoutMs: 10_000,
        },
        async () => {
          inside += 1;
          maxInside = Math.max(maxInside, inside);
          order.push(i);
          await new Promise((r) => setTimeout(r, 10));
          inside -= 1;
        },
      ),
    );
    await Promise.all(workers);
    expect(maxInside).toBe(1);
    expect(order).toHaveLength(N);
    await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("stale lock + concurrent acquirers — first reclaims, others queue cleanly", async () => {
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    const stale: LockState = {
      pid: 2_147_483_640,
      createdAt: new Date(Date.now() - 120_000).toISOString(),
      command: "old",
      client: "cli",
      projectRoot: project.cwd,
    };
    await fs.writeFile(lockFile, JSON.stringify(stale), "utf8");

    const N = 4;
    const reclaims: boolean[] = [];
    await Promise.all(
      Array.from({ length: N }, () =>
        withLock(
          {
            lockFile,
            command: "writeState",
            projectRoot: project.cwd,
            retryIntervalMs: 30,
            timeoutMs: 5_000,
            staleThresholdMs: 30_000,
          },
          async (handle) => {
            reclaims.push(handle.reclaimed);
            // Hold briefly so subsequent acquirers actually have to wait.
            await new Promise((r) => setTimeout(r, 5));
          },
        ),
      ),
    );
    expect(reclaims).toHaveLength(N);
    // The first one in must reclaim the stale lock. Later ones acquire a
    // freshly-vacated lock (reclaimed=false). What matters: all N succeed.
    expect(reclaims.some((r) => r === true)).toBe(true);
    await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not produce partial JSON under concurrent writes", async () => {
    // Sample state.json content during concurrent writes — every snapshot must
    // either be empty (file just renamed away — won't happen with rename being
    // atomic) or parse cleanly.
    const stateFile = join(project.cwd, ".ocoding", "state.json");
    const writers = Array.from({ length: 8 }, (_, i) =>
      writeStateAtomic(project.cwd, buildState(`w-${i}`), {
        retryIntervalMs: 20,
        timeoutMs: 10_000,
      }),
    );

    let observedCorrupt = false;
    const sampler = setInterval(() => {
      void (async () => {
        try {
          const raw = await fs.readFile(stateFile, "utf8");
          if (raw.length === 0) return; // not yet written
          ProjectState.parse(JSON.parse(raw)); // throws on corruption
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === "ENOENT") return; // not yet written, fine
          observedCorrupt = true;
        }
      })();
    }, 5);

    try {
      await Promise.all(writers);
    } finally {
      clearInterval(sampler);
    }
    expect(observedCorrupt).toBe(false);
  });
});
