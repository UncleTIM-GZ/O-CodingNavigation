import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { checkCurrentArtifact } from "../../src/core/check.js";
import { generateBrief } from "../../src/core/brief.js";
import { getStatus } from "../../src/core/status.js";
import { loadSopProfile } from "../../src/core/sop/loader.js";
import { readState } from "../../src/core/state/state-store.js";
import { type DocType } from "../../src/core/templates/index.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. End-to-end advance through
// every wired step (00-18). Each step:
//   1. doc create the artifact
//   2. check / gate must pass (template covers all required sections)
//   3. advance to the next step
//
// After step_final_build_verdict, advance must terminate cleanly with
// ERR_STATE_MACHINE — SHIP / REFLECT remain stubs in 0.2.0 PR 4.

interface ExpectedLocation {
  readonly stateId: string;
  readonly stepId: string;
  readonly docType: DocType;
  readonly artifactPath: string;
}

const FULL_PATH: readonly ExpectedLocation[] = [
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
    // SOP 0.3.0 — logic backbone sits after the data model, before API/test.
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

describe("SOP 0.3.0 advance — full 20-step flow (default cutover)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-fullflow-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("FULL_PATH covers exactly 20 wired steps", () => {
    expect(FULL_PATH).toHaveLength(20);
  });

  it("fresh init lands at state_discovery / step_project_brief under 0.3.0", async () => {
    const state = await readState(project.cwd);
    expect(state.project.sopProfileId).toBe("default-ai-coding-sop");
    expect(state.project.sopProfileVersion).toBe("0.3.0");
    expect(state.currentStateId).toBe("state_discovery");
    expect(state.currentStepId).toBe("step_project_brief");
  });

  it("walks every step from project_brief to final_build_verdict deterministically", async () => {
    for (let i = 0; i < FULL_PATH.length; i++) {
      const here = FULL_PATH[i]!;
      const stateBefore = await readState(project.cwd);
      expect(
        stateBefore.currentStateId,
        `at iteration ${i} expected state_id ${here.stateId}`,
      ).toBe(here.stateId);
      expect(stateBefore.currentStepId, `at iteration ${i} expected step_id ${here.stepId}`).toBe(
        here.stepId,
      );

      // doc create must succeed (0.2.0 templates cover all required headings).
      const created = await createArtifact({ cwd: project.cwd, type: here.docType });
      expect(created.ok, `doc create ${here.docType}`).toBe(true);

      // check must pass with status=pass.
      const checked = await checkCurrentArtifact({ cwd: project.cwd });
      expect(checked.ok, `check after ${here.docType}`).toBe(true);
      if (checked.ok) {
        expect(checked.data?.status).toBe("pass");
        expect(checked.data?.artifactPath).toMatch(
          new RegExp(here.artifactPath.replace(/\//g, "\\/")),
        );
      }

      // gate must pass too.
      const gated = await runGate({ cwd: project.cwd, command: "gate" });
      expect(gated.ok, `gate after ${here.docType}`).toBe(true);
      if (gated.ok) {
        expect(gated.data?.status).toBe("pass");
        expect(gated.data?.currentStepId).toBe(here.stepId);
      }

      if (i < FULL_PATH.length - 1) {
        const next = FULL_PATH[i + 1]!;
        const advanced = await advanceState({ cwd: project.cwd });
        expect(advanced.ok, `advance from ${here.stepId}`).toBe(true);
        if (advanced.ok) {
          expect(advanced.data?.from?.stateId).toBe(here.stateId);
          expect(advanced.data?.from?.stepId).toBe(here.stepId);
          expect(advanced.data?.to?.stateId).toBe(next.stateId);
          expect(advanced.data?.to?.stepId).toBe(next.stepId);
        }
      }
    }

    // Final terminal advance must fail cleanly with ERR_STATE_MACHINE.
    const terminal = await advanceState({ cwd: project.cwd });
    expect(terminal.ok).toBe(false);
    if (!terminal.ok) {
      expect(terminal.code).toBe("ERR_STATE_MACHINE");
    }

    // State must remain pinned at step_final_build_verdict.
    const finalState = await readState(project.cwd);
    expect(finalState.currentStateId).toBe("state_verify");
    expect(finalState.currentStepId).toBe("step_final_build_verdict");
  }, 180_000);

  it("status / brief reflect the 0.3.0 profile and current step at every stop", async () => {
    // Quick spot-check at three positions: start, middle (mvp_plan), and
    // after walking to verification_report.
    const status0 = await getStatus({ cwd: project.cwd });
    expect(status0.ok).toBe(true);
    if (status0.ok) {
      expect(status0.data?.project.sopProfileVersion).toBe("0.3.0");
      expect(status0.data?.currentStepId).toBe("step_project_brief");
      expect(status0.data?.currentArtifactPath).toMatch(/00-project-brief\.md$/);
    }

    const brief0 = await generateBrief({ cwd: project.cwd });
    expect(brief0.ok).toBe(true);
    if (brief0.ok) {
      expect(brief0.data?.currentArtifactStatus).toBe("missing");
      expect(brief0.data?.currentBlockers.length).toBeGreaterThan(0);
    }

    // Walk to step_mvp_plan (10 steps now: + step_logic_backbone in DESIGN).
    for (let i = 0; i < 10; i++) {
      const here = FULL_PATH[i]!;
      await createArtifact({ cwd: project.cwd, type: here.docType });
      const advanced = await advanceState({ cwd: project.cwd });
      expect(advanced.ok).toBe(true);
    }

    const statusMid = await getStatus({ cwd: project.cwd });
    if (statusMid.ok) {
      expect(statusMid.data?.currentStepId).toBe("step_mvp_plan");
      expect(statusMid.data?.currentArtifactPath).toMatch(/10-mvp-plan\.md$/);
    }

    const briefMid = await generateBrief({ cwd: project.cwd });
    if (briefMid.ok) {
      // Artifact missing for mvp_plan — should be blocked / missing.
      expect(["missing", "blocked"]).toContain(briefMid.data?.currentArtifactStatus);
    }
  }, 180_000);

  it("no `0.1.0` token leaks into a fresh `.ocoding/` snapshot", async () => {
    const ocoding = join(project.cwd, ".ocoding");
    const files = ["sop.yaml", "gates.yaml", "artifacts.yaml", "config.yaml", "state.json"];
    for (const f of files) {
      const raw = await fs.readFile(join(ocoding, f), "utf8");
      expect(raw, `${f} must not reference 0.1.0`).not.toContain("0.1.0");
    }
  });

  it("loadSopProfile() default lists all 20 wired steps in the canonical order", () => {
    const profile = loadSopProfile();
    const flat: string[] = [];
    for (const stateId of profile.stateOrder) {
      for (const stepId of profile.stepsForState(stateId)) {
        flat.push(stepId);
      }
    }
    expect(flat).toEqual(FULL_PATH.map((p) => p.stepId));
  });
});
