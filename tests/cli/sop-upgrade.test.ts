import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-029 / AM-005 — CLI integration for `ocn sop upgrade`. The end-to-end
// motivation: a project initialized on an older profile can move to 0.4.0 so
// readiness commands stop blocking with ERR_SOP_VERSION.

describe("ocn sop upgrade (DEC-029)", () => {
  let project: TempProject;

  beforeEach(async () => {
    // Explicit 0.3.0 pin preserves the upgrade-from-0.3.0 scenario now that
    // default init pins 0.4.0 (DEC-030).
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("upgrades to 0.4.0 and unblocks readiness list (was exit 5)", async () => {
    const before = await spawnOcn(["readiness", "list", "--json"], { cwd: project.cwd });
    expect(before.exitCode).toBe(5);

    const upgrade = await spawnOcn(["sop", "upgrade", "--target", "0.4.0", "--json"], {
      cwd: project.cwd,
    });
    expect(upgrade.exitCode).toBe(0);
    const parsed = JSON.parse(upgrade.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("sop.upgrade");
    expect(parsed.data.fromVersion).toBe("0.3.0");
    expect(parsed.data.toVersion).toBe("0.4.0");
    expect(parsed.data.applied).toBe(true);

    const after = await spawnOcn(["readiness", "list", "--json"], { cwd: project.cwd });
    expect(after.exitCode).toBe(0);
    const afterParsed = JSON.parse(after.stdout);
    expect(afterParsed.data.command).toBe("readiness.list");
  }, 60_000);

  it("--plan is a dry-run: exit 0, pin unchanged", async () => {
    const result = await spawnOcn(["sop", "upgrade", "--target", "0.4.0", "--plan", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.planOnly).toBe(true);
    expect(parsed.data.applied).toBe(false);
    const state = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(state.project.sopProfileVersion).toBe("0.3.0");
  }, 30_000);

  it("rejects an unknown target with exit 5", async () => {
    const result = await spawnOcn(["sop", "upgrade", "--target", "9.9.9", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(5);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_SOP_VERSION");
  }, 30_000);

  it("lists sop upgrade in help output", async () => {
    const help = await spawnOcn(["sop", "--help"], { cwd: project.cwd });
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain("upgrade");
  }, 30_000);
});
