import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("ocn init", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // @ac AC-INIT-001 — minimal tier initialization
  it("creates .ocoding/{state.json,sop.yaml,gates.yaml,config.yaml} and docs/", async () => {
    const result = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);

    const stateRaw = await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8");
    const state = JSON.parse(stateRaw);
    expect(state.schemaVersion).toBe("1.0");
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_project_brief");
    expect(state.project.tier).toBe("minimal");
    expect(state.project.sopProfileId).toBe("default-ai-coding-sop");
    // SOP 0.3.0 (AM-003 / DEC-025) — fresh init pins to 0.3.0.
    expect(state.project.sopProfileVersion).toBe("0.3.0");

    await fs.access(join(project.cwd, ".ocoding", "sop.yaml"));
    await fs.access(join(project.cwd, ".ocoding", "gates.yaml"));
    await fs.access(join(project.cwd, ".ocoding", "config.yaml"));
    // P1-003 — artifacts.yaml is now persisted as part of the SOP snapshot.
    await fs.access(join(project.cwd, ".ocoding", "artifacts.yaml"));
    await fs.access(join(project.cwd, "docs"));
  }, 30_000);

  // P1-003 — guard against a regression to the Skeleton Spike snapshot. The
  // persisted .ocoding/sop.yaml must list every state and step the runtime
  // claims to know about; previously it carried only state_spec / step_prd.
  it("persisted .ocoding/sop.yaml covers every v1.0 state and step", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const sopYaml = await fs.readFile(join(project.cwd, ".ocoding", "sop.yaml"), "utf8");
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
      expect(sopYaml).toContain(`id: ${stateId}`);
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
      // SOP 0.2.0 PR 4 — wired build/verify steps must persist.
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
      expect(sopYaml).toContain(`- ${stepId}`);
    }
  }, 30_000);

  // @ac AC-INIT-002 — default tier when omitted = minimal
  it("defaults to minimal tier when --tier is omitted", async () => {
    const result = await spawnOcn(["init"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const state = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(state.project.tier).toBe("minimal");
  }, 30_000);

  it("blocks when .ocoding/ already exists (exit code 4)", async () => {
    const first = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(first.exitCode).toBe(0);
    const second = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(second.exitCode).toBe(4);
    expect(second.stderr).toMatch(/already initialized|已经初始化/);
  }, 30_000);

  it("emits structured CommandResult JSON when --json", async () => {
    const result = await spawnOcn(["init", "--tier", "minimal", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.currentStateId).toBe("state_discovery");
    expect(parsed.data.currentStepId).toBe("step_project_brief");
  }, 30_000);
});
