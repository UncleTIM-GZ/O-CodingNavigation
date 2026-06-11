import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkConfigDrift, commitConfigSnapshot } from "../../src/core/readiness/freeze-check.js";
import { readFrozenConfig } from "../../src/core/readiness/freeze-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// P5 (R4) — referee-input drift detection over .ocoding/readiness-frozen.json.

describe("readiness config freeze (R4 drift detection)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("never freezes 'empty' (no snapshot while all commands unset)", async () => {
    const result = await checkConfigDrift(project.cwd, "minimal", {});
    expect(result).toEqual({ drifts: [], snapshotWritten: false });
    expect(await readFrozenConfig(project.cwd)).toBeNull();
  });

  it("captures the baseline on first non-empty sight, zero drift", async () => {
    const result = await checkConfigDrift(project.cwd, "minimal", { test: "pytest" });
    expect(result.drifts).toEqual([]);
    expect(result.snapshotWritten).toBe(true);
    const frozen = await readFrozenConfig(project.cwd);
    expect(frozen?.commands.test).toBe("pytest");
    expect(frozen?.tier).toBe("minimal");
    expect(frozen?.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reports command drift WITHOUT updating the snapshot (audit-first order)", async () => {
    await checkConfigDrift(project.cwd, "minimal", { test: "pytest" });
    const result = await checkConfigDrift(project.cwd, "minimal", { test: "echo ok" });
    expect(result.drifts).toEqual([{ key: "test", from: "pytest", to: "echo ok" }]);
    expect(result.snapshotWritten).toBe(false);
    // Snapshot unchanged until the caller commits (post-audit).
    expect((await readFrozenConfig(project.cwd))?.commands.test).toBe("pytest");
    await commitConfigSnapshot(project.cwd, "minimal", { test: "echo ok" });
    expect((await readFrozenConfig(project.cwd))?.commands.test).toBe("echo ok");
  });

  it("a key going away IS drift; tier change IS drift", async () => {
    await checkConfigDrift(project.cwd, "minimal", { build: "make", test: "pytest" });
    const gone = await checkConfigDrift(project.cwd, "minimal", { test: "pytest" });
    expect(gone.drifts).toEqual([{ key: "build", from: "make", to: "" }]);
    const tier = await checkConfigDrift(project.cwd, "production", {
      build: "make",
      test: "pytest",
    });
    expect(tier.drifts.map((d) => d.key)).toContain("tier");
  });

  it("a corrupt snapshot is treated as absent and rebuilt defensively", async () => {
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(join(project.cwd, ".ocoding", "readiness-frozen.json"), "{broken", "utf8");
    const result = await checkConfigDrift(project.cwd, "minimal", { test: "pytest" });
    expect(result.drifts).toEqual([]);
    expect(result.snapshotWritten).toBe(true);
    expect((await readFrozenConfig(project.cwd))?.commands.test).toBe("pytest");
  });
});
