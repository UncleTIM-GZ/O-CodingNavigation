import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FixtureFiles } from "../helpers/fixtures.js";
import { seedToStepPrd } from "../helpers/seed-state.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// PR #4 — `ocn check` now dispatches by current step. Init lands at
// step_project_brief; these tests exercise step_prd specifically (Skeleton
// Spike acceptance), so we seed state to step_prd directly. The full advance
// chain is covered in tests/cli/advance.test.ts and tests/e2e/skeleton-spike-demo.test.ts.

describe("ocn check", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    await seedToStepPrd(project.cwd);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // @ac AC-SAG-001, AC-PROMPT-002 — blocks PRD missing Scenarios
  it("blocks PRD missing Scenarios with ERR_ARTIFACT_INVALID and exit 2", async () => {
    await fs.copyFile(FixtureFiles.prdMissingScenarios(), join(project.cwd, "docs", "02-prd.md"));
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.message.en).toBe("PRD is missing required section: Scenarios.");
    expect(parsed.message.zh).toBe("PRD 缺少必填章节：Scenarios｜使用场景。");
    expect(parsed.data.artifactPath).toMatch(/02-prd\.md$/);
    expect(parsed.data.status).toBe("blocked");
    expect(parsed.data.missingRequiredSectionIds).toEqual(["section_scenarios"]);
  }, 30_000);

  // @ac AC-SAG-004 — passes PRD with Scenarios
  it("passes PRD with Scenarios with code OK and exit 0", async () => {
    await fs.copyFile(FixtureFiles.prdWithScenarios(), join(project.cwd, "docs", "02-prd.md"));
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.message.en).toBe("PRD passed Skeleton Spike artifact check.");
    expect(parsed.message.zh).toBe("PRD 已通过 Skeleton Spike 产物检查。");
    expect(parsed.data.status).toBe("pass");
  }, 30_000);

  it("blocks when PRD file is missing entirely (exit 2)", async () => {
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.data.missingRequiredSectionIds).toContain("section_scenarios");
  }, 30_000);

  it("text-mode prints bilingual error to stderr on blocked", async () => {
    await fs.copyFile(FixtureFiles.prdMissingScenarios(), join(project.cwd, "docs", "02-prd.md"));
    const result = await spawnOcn(["check"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Scenarios｜使用场景");
    expect(result.stderr).toContain("PRD is missing required section: Scenarios.");
  }, 30_000);

  it("text-mode prints success message to stdout on pass", async () => {
    await fs.copyFile(FixtureFiles.prdWithScenarios(), join(project.cwd, "docs", "02-prd.md"));
    const result = await spawnOcn(["check"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("PRD passed Skeleton Spike artifact check.");
    expect(result.stdout).toContain("PRD 已通过 Skeleton Spike 产物检查。");
  }, 30_000);

  it("template PRD (fresh `ocn doc create prd`) passes the gate", async () => {
    await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("OK");
  }, 30_000);
});

// P1-002 — `ocn check` evaluates the *current* step's artifact (resolved from
// state.json + the SOP profile) instead of always assuming step_prd. These
// tests fire on the very first step (`step_project_brief`) — without seeding
// to step_prd — so any regression to a PRD-only check would surface here.
describe("ocn check — current-step generic (P1-002)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    // No seed: init lands at state_discovery / step_project_brief.
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("passes step_project_brief after `ocn doc create project-brief`", async () => {
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.status).toBe("pass");
    expect(parsed.data.artifactPath).toMatch(/00-project-brief\.md$/);
    expect(parsed.message.en).toContain("step_project_brief");
  }, 30_000);

  it("blocks step_project_brief with exit 2 when artifact is missing", async () => {
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.data.artifactPath).toMatch(/00-project-brief\.md$/);
    // Should suggest the project-brief subcommand, not prd.
    expect(parsed.message.en).toContain("ocn doc create project-brief");
    expect(parsed.message.en).not.toContain("ocn doc create prd");
    expect(parsed.data.missingRequiredSectionIds).toEqual([
      "section_problem",
      "section_goal",
      "section_users",
      "section_success_criteria",
    ]);
  }, 30_000);

  it("blocks step_project_brief when a required section is missing (exit 2)", async () => {
    await fs.writeFile(
      join(project.cwd, "docs", "00-project-brief.md"),
      "# Project Brief\n\n## Problem\n\nx\n\n## Goal\n\nx\n\n## Users\n\nx\n",
      "utf8",
    );
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.data.missingRequiredSectionIds).toEqual(["section_success_criteria"]);
    expect(parsed.message.en).toContain("step_project_brief");
  }, 30_000);

  it("regression: `ocn check` no longer hard-codes step_prd", async () => {
    // Same project as the pass case above but written verbatim here so the
    // intent is impossible to overlook in code review. If anyone reverts to
    // a PRD-only check, this test fails because there is no docs/02-prd.md.
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    let prdExisted = true;
    try {
      await fs.access(join(project.cwd, "docs", "02-prd.md"));
    } catch {
      prdExisted = false;
    }
    expect(prdExisted).toBe(false);

    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.artifactPath).toMatch(/00-project-brief\.md$/);
    expect(parsed.data.artifactPath).not.toMatch(/02-prd\.md$/);
  }, 30_000);
});
