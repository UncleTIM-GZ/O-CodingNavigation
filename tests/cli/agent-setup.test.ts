import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-006 / DEC-031 — CLI integration for `ocn agent setup`.

describe("ocn agent setup (AM-006)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("configures a fresh project: exit 0, four files in the CommandResult", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["agent", "setup", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("agent.setup");
    expect(parsed.data.files).toHaveLength(4);
  }, 30_000);

  it("blocks with exit 4 in an uninitialized directory", async () => {
    const result = await spawnOcn(["agent", "setup", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("lists agent setup in help output", async () => {
    const help = await spawnOcn(["agent", "--help"], { cwd: project.cwd });
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain("setup");
  }, 30_000);
});
