import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 4 (DEC-023) — full-flow CLI smoke covering all 19 wired
// steps via the spawned `ocn` binary. The unit-level walk is in
// tests/unit/sop-0.2-advance-full-flow.test.ts; this file ensures the
// commander layer + render layer + dist build all play together.

interface Step {
  readonly stateId: string;
  readonly stepId: string;
  readonly docType: string;
  readonly artifactPath: string;
}

const FULL_PATH: readonly Step[] = [
  {
    stateId: "state_discovery",
    stepId: "step_project_brief",
    docType: "project-brief",
    artifactPath: "docs/00-project-brief.md",
  },
  {
    stateId: "state_spec",
    stepId: "step_scope",
    docType: "scope",
    artifactPath: "docs/01-scope.md",
  },
  { stateId: "state_spec", stepId: "step_prd", docType: "prd", artifactPath: "docs/02-prd.md" },
  {
    stateId: "state_spec",
    stepId: "step_acceptance_criteria",
    docType: "acceptance-criteria",
    artifactPath: "docs/03-acceptance-criteria.md",
  },
  {
    stateId: "state_design",
    stepId: "step_technical_architecture",
    docType: "technical-architecture",
    artifactPath: "docs/04-technical-architecture.md",
  },
  {
    stateId: "state_design",
    stepId: "step_information_architecture",
    docType: "information-architecture",
    artifactPath: "docs/05-information-architecture.md",
  },
  {
    stateId: "state_design",
    stepId: "step_data_model",
    docType: "data-model",
    artifactPath: "docs/06-data-model.md",
  },
  {
    stateId: "state_design",
    stepId: "step_logic_backbone",
    docType: "logic-backbone",
    artifactPath: "docs/07-logic-backbone.md",
  },
  {
    stateId: "state_design",
    stepId: "step_api_contract",
    docType: "api-contract",
    artifactPath: "docs/08-api-contract.md",
  },
  {
    stateId: "state_design",
    stepId: "step_test_strategy",
    docType: "test-strategy",
    artifactPath: "docs/09-test-strategy.md",
  },
  {
    stateId: "state_plan",
    stepId: "step_mvp_plan",
    docType: "mvp-plan",
    artifactPath: "docs/10-mvp-plan.md",
  },
  {
    stateId: "state_plan",
    stepId: "step_build_plan",
    docType: "build-plan",
    artifactPath: "docs/11-build-plan.md",
  },
  {
    stateId: "state_build",
    stepId: "step_implementation_log",
    docType: "implementation-log",
    artifactPath: "docs/12-implementation-log.md",
  },
  {
    stateId: "state_build",
    stepId: "step_change_evidence",
    docType: "change-evidence",
    artifactPath: "docs/13-change-evidence.md",
  },
  {
    stateId: "state_build",
    stepId: "step_integration_notes",
    docType: "integration-notes",
    artifactPath: "docs/14-integration-notes.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_verification_report",
    docType: "verification-report",
    artifactPath: "docs/15-verification-report.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_acceptance_mapping",
    docType: "acceptance-mapping",
    artifactPath: "docs/16-acceptance-mapping.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_failure_fix_log",
    docType: "failure-fix-log",
    artifactPath: "docs/17-failure-fix-log.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_regression_evidence",
    docType: "regression-evidence",
    artifactPath: "docs/18-regression-evidence.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_final_build_verdict",
    docType: "final-build-verdict",
    artifactPath: "docs/19-final-build-verdict.md",
  },
];

describe("ocn — SOP 0.3.0 full 20-step flow (CLI)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-fullflow-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // SOP 0.5.0 (DEC-032) — fresh default init now pins 0.5.0 and snapshots
  // the readiness rulebook alongside the classic snapshot files.
  it("fresh `ocn init` writes 0.5.0 state.json + snapshot files", async () => {
    const initRes = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(initRes.exitCode).toBe(0);

    const state = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(state.project.sopProfileVersion).toBe("0.5.0");
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_project_brief");

    const sopYaml = await fs.readFile(join(project.cwd, ".ocoding", "sop.yaml"), "utf8");
    expect(sopYaml).toMatch(/version: 0\.5\.0/);
    expect(sopYaml).toContain("step_final_build_verdict");
    expect(sopYaml).toContain("step_logic_backbone");

    const artifactsYaml = await fs.readFile(
      join(project.cwd, ".ocoding", "artifacts.yaml"),
      "utf8",
    );
    expect(artifactsYaml).toContain("docs/19-final-build-verdict.md");
    expect(artifactsYaml).toContain("docs/07-logic-backbone.md");

    const configYaml = await fs.readFile(join(project.cwd, ".ocoding", "config.yaml"), "utf8");
    expect(configYaml).toContain("0.5.0");

    await fs.access(join(project.cwd, ".ocoding", "readiness-rules.yaml"));
  }, 30_000);

  it("walks all 20 steps via doc create + advance and terminates cleanly at step_final_build_verdict (pinned 0.3.0)", async () => {
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });

    for (let i = 0; i < FULL_PATH.length; i++) {
      const here = FULL_PATH[i]!;

      // status confirms we're at the expected location.
      const statusRes = await spawnOcn(["status", "--json"], { cwd: project.cwd });
      expect(statusRes.exitCode, `status before ${here.stepId}`).toBe(0);
      const status = JSON.parse(statusRes.stdout);
      expect(status.data.currentStateId, `state at iteration ${i}`).toBe(here.stateId);
      expect(status.data.currentStepId, `step at iteration ${i}`).toBe(here.stepId);

      // doc create.
      const docRes = await spawnOcn(["doc", "create", here.docType], { cwd: project.cwd });
      expect(docRes.exitCode, `doc create ${here.docType}`).toBe(0);

      // gate must pass.
      const gateRes = await spawnOcn(["gate", "--json"], { cwd: project.cwd });
      expect(gateRes.exitCode, `gate after ${here.docType}`).toBe(0);
      const gate = JSON.parse(gateRes.stdout);
      expect(gate.ok).toBe(true);
      expect(gate.data.status).toBe("pass");

      if (i < FULL_PATH.length - 1) {
        const advRes = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
        expect(advRes.exitCode, `advance from ${here.stepId}`).toBe(0);
        const adv = JSON.parse(advRes.stdout);
        expect(adv.ok).toBe(true);
        expect(adv.data.from.stepId).toBe(here.stepId);
        expect(adv.data.to.stepId).toBe(FULL_PATH[i + 1]!.stepId);
      }
    }

    // After step_final_build_verdict, advance must fail with ERR_STATE_MACHINE.
    const terminalRes = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    expect(terminalRes.exitCode).toBe(3);
    const terminal = JSON.parse(terminalRes.stdout);
    expect(terminal.ok).toBe(false);
    expect(terminal.code).toBe("ERR_STATE_MACHINE");

    // Final state must be state_verify / step_final_build_verdict.
    const finalState = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(finalState.currentStateId).toBe("state_verify");
    expect(finalState.currentStepId).toBe("step_final_build_verdict");
  }, 240_000);

  it("brief at step_final_build_verdict reports pass with no blockers (pinned 0.3.0)", async () => {
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
    // Walk to step_final_build_verdict via the canonical FULL_PATH.
    for (let i = 0; i < FULL_PATH.length; i++) {
      const here = FULL_PATH[i]!;
      await spawnOcn(["doc", "create", here.docType], { cwd: project.cwd });
      if (i < FULL_PATH.length - 1) {
        const advRes = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
        expect(advRes.exitCode).toBe(0);
      }
    }
    const briefRes = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    expect(briefRes.exitCode).toBe(0);
    const brief = JSON.parse(briefRes.stdout);
    expect(brief.data.currentStateId).toBe("state_verify");
    expect(brief.data.currentStepId).toBe("step_final_build_verdict");
    expect(brief.data.currentArtifactStatus).toBe("pass");
    expect(brief.data.currentBlockers).toEqual([]);
  }, 240_000);
});
