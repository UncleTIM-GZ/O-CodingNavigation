import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-009 — governance text follows the automation grant on every surface:
// `ocn brief` (reminder + automation field) and the execution-navigator
// `ocn next-prompt` (Automation loop section). Manual mode stays identical
// to pre-AM-009 output (covered by the untouched existing brief/next-prompt
// tests; spot-checked here).

describe("governance surfaces under auto mode (AM-009)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-auto-gov-");
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("manual brief keeps the legacy reminder and has no automation field", async () => {
    const result = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.aiGovernanceReminder).toContain("AI must NOT advance project state");
    expect(parsed.data.automation).toBeUndefined();
  });

  it("auto-mode brief swaps the advance ban for the delegation grant and exposes automation status", async () => {
    await spawnOcn(["auto", "on", "--phase", "all", "--json"], { cwd: project.cwd });
    const result = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.aiGovernanceReminder).toContain("AUTO MODE (AM-009)");
    expect(parsed.data.aiGovernanceReminder).not.toContain("AI must NOT advance project state");
    expect(parsed.data.automation).toEqual({ phase1: true, phase2: true, suspended: false });
  });

  it("manual next-prompt has no Automation loop section", async () => {
    const result = await spawnOcn(["next-prompt", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.prompt).not.toContain("## Automation loop");
  });

  it("auto-mode next-prompt appends the Automation loop with machine stop conditions", async () => {
    await spawnOcn(["auto", "on", "--phase", "all", "--json"], { cwd: project.cwd });
    const result = await spawnOcn(["next-prompt", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.prompt).toContain("## Automation loop");
    expect(parsed.data.prompt).toContain("OCN_ACTOR=ai_agent ocn advance --rationale");
    expect(parsed.data.prompt).toContain("STOP and hand back to the human");
    expect(parsed.data.prompt).toContain("ocn rewind --to step_build_plan");
  });

  it("agent setup writes settings with env.OCN_ACTOR=ai_agent", async () => {
    const setup = await spawnOcn(["agent", "setup", "--json"], { cwd: project.cwd });
    expect(setup.exitCode).toBe(0);
    const settings = JSON.parse(
      await fs.readFile(join(project.cwd, ".claude", "settings.json"), "utf8"),
    ) as { env?: Record<string, string> };
    expect(settings.env?.["OCN_ACTOR"]).toBe("ai_agent");
  });
});
