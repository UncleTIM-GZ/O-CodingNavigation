import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-033 P3 — `ocn cycle new` CLI surface: mandatory --yes (ruling ⑩ —
// archiving the whole runtime state needs explicit confirmation), bilingual
// + --json dual rendering, stable exit codes (§5.1).

async function readState(cwd: string) {
  return JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
}

describe("ocn cycle new (pinned 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-cycle-");
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("exits 4 (ERR_IO_OR_CONFIG) without --yes and changes nothing", async () => {
    const before = await readState(project.cwd);
    const result = await spawnOcn(["cycle", "new", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");

    const after = await readState(project.cwd);
    expect(after.currentStepId).toBe(before.currentStepId);
    await expect(fs.access(join(project.cwd, ".ocoding", "cycles"))).rejects.toThrow();
  }, 30_000);

  it("exits 4 on an uninitialized directory (with --yes)", async () => {
    const bare = await createTempProject("ocn-cli-cycle-bare-");
    try {
      const result = await spawnOcn(["cycle", "new", "--yes", "--json"], { cwd: bare.cwd });
      expect(result.exitCode).toBe(4);
      expect(JSON.parse(result.stdout).code).toBe("ERR_IO_OR_CONFIG");
    } finally {
      await bare.cleanup();
    }
  }, 30_000);

  it("archives the round and restarts with --yes: exit 0, payload, state reset", async () => {
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const advanced = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    expect(advanced.exitCode).toBe(0);

    const result = await spawnOcn(["cycle", "new", "--yes", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.round).toBe(1);
    expect(parsed.data.archivePath).toMatch(/^\.ocoding\/cycles\/1-/);
    expect(parsed.data.from).toEqual({ stateId: "state_spec", stepId: "step_scope" });
    expect(parsed.data.to).toEqual({
      stateId: "state_discovery",
      stepId: "step_project_brief",
    });

    const state = await readState(project.cwd);
    expect(state.currentStepId).toBe("step_project_brief");
    expect(state.project.sopProfileVersion).toBe("0.3.0");
  }, 30_000);

  it("renders bilingual text on the human path", async () => {
    const result = await spawnOcn(["cycle", "new", "--yes"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("已归档");
    expect(result.stdout).toContain("archived");
  }, 30_000);

  it("appears in ocn --help", async () => {
    const result = await spawnOcn(["--help"], { cwd: project.cwd });
    expect(result.stdout).toContain("cycle");
  }, 30_000);
});
