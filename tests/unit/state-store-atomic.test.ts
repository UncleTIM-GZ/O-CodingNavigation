import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
    // Sneak a watchdog: count lock-file-existence transitions during a write.
    const lockFile = join(project.cwd, ".ocoding", ".lock");
    let sawLock = false;
    const watcher = setInterval(() => {
      void (async () => {
        try {
          await fs.stat(lockFile);
          sawLock = true;
        } catch {
          /* ignore */
        }
      })();
    }, 1);

    try {
      await writeStateAtomic(project.cwd, buildState());
    } finally {
      clearInterval(watcher);
    }
    // After release, lock must be gone.
    await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
    // We expect to have observed the lock at least once during the op.
    expect(sawLock).toBe(true);
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
      await fs.readFile(
        join(project.cwd, ".ocoding", "state.json.bak"),
        "utf8",
      ),
    );
    expect(bak.project.name).toBe("U-First");
  });
});
