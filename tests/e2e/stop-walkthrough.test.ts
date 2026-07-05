import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// `ocn stop` — e2e dogfood through the real CLI:
//   ocn init (wires Claude Code by default, AM-013) → ocn stop --yes
//   → state.json is marked stopped, the injected wiring is uninstalled,
//   the brief goes quiet, and advance refuses.

async function readState(cwd: string): Promise<{ stoppedAt: string | null }> {
  return JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("stop walkthrough (e2e)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-e2e-stop-");
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("terminates OCN: marks stopped, uninstalls wiring, goes quiet, refuses advance", async () => {
    // init wired the agent by default → the contract file exists.
    expect(await exists(join(project.cwd, ".claude", "ocn.md"))).toBe(true);

    // Guard: stop refuses without --yes (ERR_IO_OR_CONFIG → exit 4).
    const noYes = await spawnOcn(["stop"], { cwd: project.cwd });
    expect(noYes.exitCode).toBe(4);
    expect((await readState(project.cwd)).stoppedAt).toBeNull();

    // Stop for real.
    const stop = await spawnOcn(["stop", "--yes", "--reason", "planning done"], {
      cwd: project.cwd,
    });
    expect(stop.exitCode).toBe(0);

    // ① state.json is marked stopped.
    expect((await readState(project.cwd)).stoppedAt).not.toBeNull();

    // ② the injected wiring is uninstalled.
    expect(await exists(join(project.cwd, ".claude", "ocn.md"))).toBe(false);
    expect(await exists(join(project.cwd, ".claude", "commands", "ocn-next.md"))).toBe(false);
    const settings = await fs.readFile(join(project.cwd, ".claude", "settings.json"), "utf8");
    expect(settings).not.toContain("ocn hook");
    const claudeMd = await fs.readFile(join(project.cwd, "CLAUDE.md"), "utf8");
    expect(claudeMd).not.toContain("@.claude/ocn.md");

    // ③ the brief goes quiet (still exit 0, but no workflow next step).
    const brief = await spawnOcn(["brief"], { cwd: project.cwd });
    expect(brief.exitCode).toBe(0);
    expect(brief.stdout).toContain("已终止");

    // ④ advance refuses (ERR_STATE_MACHINE → exit 3).
    const advance = await spawnOcn(["advance"], { cwd: project.cwd });
    expect(advance.exitCode).toBe(3);
  });
});
