import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runStopHook } from "../../src/core/agent-hooks/stop-hook.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-006 / DEC-031 — Stop-hook engine. Fail-open policy: the hook must never
// wedge a session; `ocn check` stays the authoritative verdict.

describe("runStopHook (AM-006)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("allows when stop_hook_active is true (loop protection)", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const outcome = await runStopHook({
      cwd: project.cwd,
      payload: { stop_hook_active: true },
    });
    expect(outcome.action).toBe("allow");
    expect(outcome.reason).toBeUndefined();
  });

  it("allows silently in an uninitialized directory", async () => {
    const outcome = await runStopHook({ cwd: project.cwd, payload: {} });
    expect(outcome.action).toBe("allow");
    expect(outcome.warning).toBeUndefined();
  });

  it("blocks with bilingual reason + trailer when the artifact is missing", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const outcome = await runStopHook({ cwd: project.cwd, payload: {} });
    expect(outcome.action).toBe("block");
    expect(outcome.reason).toContain("OCN gate blocked");
    expect(outcome.reason).toContain("OCN 门禁未通过");
    expect(outcome.reason).toContain("ocn doc create");
    expect(outcome.reason).toContain("修复后重试，或交还人工处理");
  });

  it("blocks naming missing required sections", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const artifact = join(project.cwd, "docs", "00-project-brief.md");
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
    await fs.writeFile(artifact, "# Project Brief\n\nno required sections here\n", "utf8");
    const outcome = await runStopHook({ cwd: project.cwd, payload: {} });
    expect(outcome.action).toBe("block");
    expect(outcome.reason).toContain("missing required sections");
  });

  it("allows when the current artifact passes the gate (pinned 0.3.0)", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const created = await createArtifact({ cwd: project.cwd, type: "project-brief" });
    expect(created.ok).toBe(true);
    const outcome = await runStopHook({ cwd: project.cwd, payload: {} });
    expect(outcome.action).toBe("allow");
  });

  it("fails open with a warning when the check itself cannot run", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    // state.json present but unparsable → readState throws StateInvalidError
    // inside checkCurrentArtifact… which returns blocked, not throw. To force
    // a THROW, make state.json a directory: fs.readFile rejects with EISDIR.
    const stateFile = join(project.cwd, ".ocoding", "state.json");
    await fs.rm(stateFile);
    await fs.mkdir(stateFile);
    const outcome = await runStopHook({ cwd: project.cwd, payload: {} });
    expect(outcome.action).toBe("allow");
    expect(outcome.warning).toContain("allowing stop");
  });

  it("truncates long reasons but keeps the trailer", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const outcome = await runStopHook({ cwd: project.cwd, payload: {} });
    expect(outcome.action).toBe("block");
    expect((outcome.reason ?? "").length).toBeLessThanOrEqual(1600);
    expect(outcome.reason?.endsWith("修复后重试，或交还人工处理。")).toBe(true);
  });
});
