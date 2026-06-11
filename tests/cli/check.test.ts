import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedToStepPrd } from "../helpers/seed-state.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// PR #4 — `ocn check` now dispatches by current step. Init lands at
// step_project_brief; these tests exercise step_prd specifically by seeding
// state. SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. PRD now requires the
// 0.2.0 section set (Product Form / User Roles / etc), not Scenarios.

describe("ocn check (step_prd, pinned 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    // Pinned to the frozen 0.3.0 profile — these tests exercise the section
    // gate mechanics without the 0.4.0 readiness cross-cutting gate.
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
    await seedToStepPrd(project.cwd);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks PRD with empty body (reports all 0.2.0 PRD required sections)", async () => {
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), "# PRD\n", "utf8");
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.data.artifactPath).toMatch(/02-prd\.md$/);
    expect(parsed.data.status).toBe("blocked");
    expect(parsed.data.missingRequiredSectionIds).toEqual([
      "section_product_form",
      "section_user_roles",
      "section_user_flow",
      "section_core_features",
      "section_non_functional_requirements",
      "section_acceptance_preconditions",
      "section_non_goals",
    ]);
  }, 30_000);

  it("passes PRD when the bundled template is created (covers all 0.2.0 sections)", async () => {
    await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.status).toBe("pass");
  }, 30_000);

  it("blocks when PRD file is missing entirely (exit 2)", async () => {
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.data.missingRequiredSectionIds).toContain("section_product_form");
  }, 30_000);

  it("text-mode prints bilingual blocked message to stderr", async () => {
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), "# PRD\n", "utf8");
    const result = await spawnOcn(["check"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    // 0.2.0 PRD message uses the PRD-flavoured pluralisation in check.ts —
    // "PRD is missing required sections: ..." with each missing 0.2.0 section
    // id listed.
    expect(result.stderr).toContain("PRD is missing required sections");
    expect(result.stderr).toContain("section_product_form");
    expect(result.stderr).toContain("PRD 缺少必填章节");
  }, 30_000);
});

// P1-002 — `ocn check` evaluates the *current* step's artifact (resolved from
// state.json + the SOP profile) instead of always assuming step_prd. These
// tests fire on the very first step (`step_project_brief`) — without seeding
// to step_prd — so any regression to a PRD-only check would surface here.
describe("ocn check — current-step generic (P1-002, pinned 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
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

  it("blocks step_project_brief with exit 2 when artifact is missing (reports 7 0.2.0 sections)", async () => {
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.data.artifactPath).toMatch(/00-project-brief\.md$/);
    // Should suggest the project-brief subcommand, not prd.
    expect(parsed.message.en).toContain("ocn doc create project-brief");
    expect(parsed.message.en).not.toContain("ocn doc create prd");
    // SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. project_brief now
    // requires 7 sections.
    expect(parsed.data.missingRequiredSectionIds).toEqual([
      "section_problem",
      "section_goal",
      "section_users",
      "section_success_criteria",
      "section_constraints",
      "section_risks",
      "section_non_goals",
    ]);
  }, 30_000);

  it("blocks step_project_brief when one required section is missing (exit 2)", async () => {
    // Write a body that has 6 of the 7 required sections; missing
    // section_success_criteria.
    const body =
      "# Project Brief\n" +
      "\n## Problem\n\nx\n" +
      "\n## Goal\n\nx\n" +
      "\n## Users\n\nx\n" +
      "\n## Constraints\n\nx\n" +
      "\n## Risks\n\nx\n" +
      "\n## Non-goals\n\nx\n";
    await fs.writeFile(join(project.cwd, "docs", "00-project-brief.md"), body, "utf8");
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
