import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("core/init.initProject", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates the .ocoding snapshot files with correct content (0.7.0 default, DEC-039)", async () => {
    const result = await initProject({ cwd: project.cwd, tier: "minimal" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.currentStateId).toBe("state_discovery");
    expect(result.data?.currentStepId).toBe("step_project_brief");

    const stateRaw = await fs.readFile(join(project.cwd, ".ocoding/state.json"), "utf8");
    const state = JSON.parse(stateRaw);
    expect(state.schemaVersion).toBe("1.0");
    expect(state.project.tier).toBe("minimal");
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_project_brief");

    const sopYaml = await fs.readFile(join(project.cwd, ".ocoding/sop.yaml"), "utf8");
    expect(sopYaml).toMatch(/profile: default-ai-coding-sop/);
    // SOP 0.9.0 default (AM-017 / DEC-043) — fresh init writes the 0.9.0 snapshot.
    expect(sopYaml).toMatch(/version: 0\.9\.0/);
    expect(state.project.sopProfileVersion).toBe("0.9.0");
    const gatesYaml = await fs.readFile(join(project.cwd, ".ocoding/gates.yaml"), "utf8");
    // 0.2.0 PRD requires section_product_form (not section_scenarios).
    expect(gatesYaml).toMatch(/section_product_form/);
    // AM-007 / DEC-032 — build plan additionally gates on section_task_specs.
    expect(gatesYaml).toMatch(/section_task_specs/);
    const configYaml = await fs.readFile(join(project.cwd, ".ocoding/config.yaml"), "utf8");
    expect(configYaml).toMatch(/tier: minimal/);
    expect(configYaml).toMatch(/version: 0\.9\.0/);

    // AM-004 / DEC-030 — fresh 0.4.0+ init also writes the readiness rulebook.
    const readinessYaml = await fs.readFile(
      join(project.cwd, ".ocoding/readiness-rules.yaml"),
      "utf8",
    );
    expect(readinessYaml.length).toBeGreaterThan(0);

    // P1-003 — artifacts.yaml is now part of the persisted snapshot.
    const artifactsYaml = await fs.readFile(join(project.cwd, ".ocoding/artifacts.yaml"), "utf8");
    expect(artifactsYaml).toMatch(/artifact_prd:/);
    expect(artifactsYaml).toMatch(/path: docs\/02-prd\.md/);
    expect(artifactsYaml).toMatch(/artifact_final_build_verdict:/);
    expect(artifactsYaml).toMatch(/path: docs\/19-final-build-verdict\.md/);
  });

  // P1-003 — exercises the full canonical snapshot. If anyone reverts data.ts
  // to a skeleton-only set, every assertion below fails together.
  it("persists a canonical sop.yaml/gates.yaml/artifacts.yaml that mirrors the runtime profile", async () => {
    const result = await initProject({ cwd: project.cwd, tier: "minimal" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.artifactsFile).toMatch(/\.ocoding\/artifacts\.yaml$/);

    const sopYaml = await fs.readFile(join(project.cwd, ".ocoding/sop.yaml"), "utf8");
    const gatesYaml = await fs.readFile(join(project.cwd, ".ocoding/gates.yaml"), "utf8");
    const artifactsYaml = await fs.readFile(join(project.cwd, ".ocoding/artifacts.yaml"), "utf8");

    const states = [
      "state_discovery",
      "state_spec",
      "state_design",
      "state_plan",
      "state_build",
      "state_verify",
      "state_ship",
      "state_reflect",
    ];
    for (const stateId of states) {
      expect(sopYaml, `${stateId} appears in persisted sop.yaml`).toContain(`id: ${stateId}`);
    }

    const steps = [
      "step_project_brief",
      "step_scope",
      "step_prd",
      "step_acceptance_criteria",
      "step_technical_architecture",
      "step_information_architecture",
      "step_data_model",
      "step_api_contract",
      "step_test_strategy",
      "step_mvp_plan",
      // SOP 0.2.0 PR 4 — wired build/verify steps must persist too.
      "step_build_plan",
      "step_implementation_log",
      "step_change_evidence",
      "step_integration_notes",
      "step_verification_report",
      "step_acceptance_mapping",
      "step_failure_fix_log",
      "step_regression_evidence",
      "step_final_build_verdict",
    ];
    for (const stepId of steps) {
      expect(sopYaml, `${stepId} appears in persisted sop.yaml`).toContain(`- ${stepId}`);
      expect(gatesYaml, `${stepId} gate appears in persisted gates.yaml`).toContain(`${stepId}:`);
    }

    const artifactPaths = [
      "docs/00-project-brief.md",
      "docs/01-scope.md",
      "docs/02-prd.md",
      "docs/03-acceptance-criteria.md",
      "docs/04-technical-architecture.md",
      "docs/05-information-architecture.md",
      "docs/06-data-model.md",
      "docs/08-api-contract.md",
      "docs/09-test-strategy.md",
      "docs/10-mvp-plan.md",
      "docs/11-build-plan.md",
      "docs/12-implementation-log.md",
      "docs/13-change-evidence.md",
      "docs/14-integration-notes.md",
      "docs/15-verification-report.md",
      "docs/16-acceptance-mapping.md",
      "docs/17-failure-fix-log.md",
      "docs/18-regression-evidence.md",
      "docs/19-final-build-verdict.md",
    ];
    for (const path of artifactPaths) {
      expect(artifactsYaml, `${path} mapped in artifacts.yaml`).toContain(`path: ${path}`);
    }
  });

  it("defaults tier to minimal when omitted", async () => {
    const result = await initProject({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.tier).toBe("minimal");
  });

  it("blocks with ERR_IO_OR_CONFIG when .ocoding/ already exists", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    const second = await initProject({ cwd: project.cwd, tier: "minimal" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("ERR_IO_OR_CONFIG");
  });

  it("uses provided projectName and projectId", async () => {
    const result = await initProject({
      cwd: project.cwd,
      tier: "minimal",
      projectId: "custom-id",
      projectName: "Custom Name",
    });
    expect(result.ok).toBe(true);
    const state = JSON.parse(await fs.readFile(join(project.cwd, ".ocoding/state.json"), "utf8"));
    expect(state.project.projectId).toBe("custom-id");
    expect(state.project.name).toBe("Custom Name");
  });
});
