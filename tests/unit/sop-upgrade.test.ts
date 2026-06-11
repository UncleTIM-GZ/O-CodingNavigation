import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProject } from "../../src/core/init.js";
import { upgradeSopProfile } from "../../src/core/sop/upgrade.js";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-029 / AM-005 — `ocn sop upgrade` core. Forward-only re-pin: snapshots
// rewritten, config.yaml preserved (user-owned), cursor + artifacts untouched.

async function readStateJson(cwd: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function projectOf(state: Record<string, unknown>): Record<string, unknown> {
  return state["project"] as Record<string, unknown>;
}

describe("upgradeSopProfile (DEC-029)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("upgrades 0.3.0 → 0.4.0: pin moved, rulebook snapshotted, backup written", async () => {
    await initProject({ cwd: project.cwd }); // pins the runtime default (0.3.0)
    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.4.0" });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) throw new Error("expected ok with data");
    expect(result.data.fromVersion).toBe("0.3.0");
    expect(result.data.toVersion).toBe("0.4.0");
    expect(result.data.applied).toBe(true);

    const state = await readStateJson(project.cwd);
    expect(projectOf(state)["sopProfileVersion"]).toBe("0.4.0");
    const rules = await fs.readFile(join(project.cwd, ".ocoding", "readiness-rules.yaml"), "utf8");
    expect(rules).toContain("version: 0.4.0");
    await expect(
      fs.stat(join(project.cwd, ".ocoding", "state.json.bak")),
    ).resolves.toBeDefined();
  });

  it("preserves cursor and artifacts mid-pipeline; preserves user-edited config.yaml", async () => {
    await initProject({ cwd: project.cwd });
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_implementation_log",
    });
    const configFile = join(project.cwd, ".ocoding", "config.yaml");
    const userConfig = "commands:\n  build: npm run build\n  test: npm test\n";
    await fs.writeFile(configFile, userConfig, "utf8");

    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.4.0" });
    expect(result.ok).toBe(true);

    const state = await readStateJson(project.cwd);
    expect(state["currentStateId"]).toBe("state_build");
    expect(state["currentStepId"]).toBe("step_implementation_log");
    expect(projectOf(state)["sopProfileVersion"]).toBe("0.4.0");
    expect(await fs.readFile(configFile, "utf8")).toBe(userConfig);
  });

  it("--plan validates and reports without writing", async () => {
    await initProject({ cwd: project.cwd });
    const result = await upgradeSopProfile({
      cwd: project.cwd,
      targetVersion: "0.4.0",
      plan: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) throw new Error("expected ok with data");
    expect(result.data.planOnly).toBe(true);
    expect(result.data.applied).toBe(false);
    expect(result.data.snapshotFiles.length).toBeGreaterThan(0);

    const state = await readStateJson(project.cwd);
    expect(projectOf(state)["sopProfileVersion"]).toBe("0.3.0");
    await expect(
      fs.stat(join(project.cwd, ".ocoding", "readiness-rules.yaml")),
    ).rejects.toThrow();
  });

  it("is an ok no-op when already pinned to the target", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.4.0" });
    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.4.0" });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) throw new Error("expected ok with data");
    expect(result.data.applied).toBe(false);
  });

  it("blocks an unknown target version with ERR_SOP_VERSION", async () => {
    await initProject({ cwd: project.cwd });
    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "9.9.9" });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_SOP_VERSION");
  });

  it("blocks a downgrade with ERR_SOP_VERSION", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.4.0" });
    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.3.0" });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_SOP_VERSION");
  });

  it("blocks an uninitialized directory with ERR_IO_OR_CONFIG", async () => {
    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.4.0" });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });

  it("appends a sop_upgraded audit event with from/to versions", async () => {
    await initProject({ cwd: project.cwd });
    await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.4.0" });
    const jsonl = await fs.readFile(AuditPaths.jsonlFile(project.cwd), "utf8");
    const events = jsonl
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const upgraded = events.find((e) => e["eventType"] === "sop_upgraded");
    expect(upgraded).toBeDefined();
    const data = upgraded?.["data"] as Record<string, unknown>;
    expect(data["fromVersion"]).toBe("0.3.0");
    expect(data["toVersion"]).toBe("0.4.0");
  });

  it("heals snapshot drift: a tampered sop.yaml is restored to canonical content", async () => {
    await initProject({ cwd: project.cwd });
    const sopFile = join(project.cwd, ".ocoding", "sop.yaml");
    await fs.writeFile(sopFile, "# tampered\n", "utf8");
    await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.4.0" });
    const restored = await fs.readFile(sopFile, "utf8");
    expect(restored).not.toBe("# tampered\n");
    expect(restored).toContain("state_discovery");
  });
});
