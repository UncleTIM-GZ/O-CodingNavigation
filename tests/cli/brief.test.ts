import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("ocn brief", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // @ac AC-BRIEF-001 — brief contains current state / step / artifact
  it("includes currentStateId, currentStepId, and current artifact path", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.currentStateId).toBe("state_discovery");
    expect(parsed.data.currentStepId).toBe("step_project_brief");
    expect(parsed.data.currentArtifactPath).toMatch(/00-project-brief\.md$/);
  }, 30_000);

  // @ac AC-BRIEF-002 — brief includes AI Governance Reminder
  it("includes AI Governance Reminder", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.aiGovernanceReminder).toMatch(/blocked artifact|advance/i);
  }, 30_000);

  // @ac AC-BRIEF-002 — brief includes Uncertainty Policy
  it("includes Uncertainty Policy", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.uncertaintyPolicy).toMatch(/数据不足|insufficient/i);
  }, 30_000);

  it("text-mode brief shows AI Governance Reminder + Uncertainty Policy headers", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["brief"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/AI Governance Reminder/);
    expect(result.stdout).toMatch(/Uncertainty Policy/);
  }, 30_000);

  it("reports current artifact status as 'missing' before the project-brief is created", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const result = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.currentArtifactStatus).toBe("missing");
    // After PR #4, init lands at step_project_brief whose required sections
    // are problem/goal/users/success_criteria.
    expect(parsed.data.currentBlockers).toContain("section_problem");
    expect(parsed.data.currentBlockers).toContain("section_goal");
  }, 30_000);
});
