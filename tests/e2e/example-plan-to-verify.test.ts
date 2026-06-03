import { existsSync, promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 5 (DEC-023) — vitest mirror of
// `examples/plan-to-verify/scripts/smoke.sh`. Wires the example into the
// standard `npm run test` surface so the example fixtures cannot rot
// silently. The shell smoke remains the human-runnable entry point;
// this test reproduces its behaviour against the example's docs/ in TS so
// it works whether or not `dist/` is present (spawnOcn falls back to tsx).
//
// What this test does NOT change:
//   - the CI workflow (no `.github/workflows/ci.yml` edit; the existing
//     pipeline already builds before testing, so spawnOcn picks up dist).
//   - any source / runtime code (the example was added without modifying
//     gate / advance / check core logic).
//   - any other test (the bundled-template flow is already covered by
//     tests/cli/sop-0.2-full-flow.test.ts; this test is the
//     example-fixture sibling).

interface Step {
  readonly stateId: string;
  readonly stepId: string;
  readonly artifactPath: string;
}

const FULL_PATH: readonly Step[] = [
  {
    stateId: "state_discovery",
    stepId: "step_project_brief",
    artifactPath: "docs/00-project-brief.md",
  },
  { stateId: "state_spec", stepId: "step_scope", artifactPath: "docs/01-scope.md" },
  { stateId: "state_spec", stepId: "step_prd", artifactPath: "docs/02-prd.md" },
  {
    stateId: "state_spec",
    stepId: "step_acceptance_criteria",
    artifactPath: "docs/03-acceptance-criteria.md",
  },
  {
    stateId: "state_design",
    stepId: "step_technical_architecture",
    artifactPath: "docs/04-technical-architecture.md",
  },
  {
    stateId: "state_design",
    stepId: "step_information_architecture",
    artifactPath: "docs/05-information-architecture.md",
  },
  { stateId: "state_design", stepId: "step_data_model", artifactPath: "docs/06-data-model.md" },
  { stateId: "state_design", stepId: "step_api_contract", artifactPath: "docs/07-api-contract.md" },
  {
    stateId: "state_design",
    stepId: "step_test_strategy",
    artifactPath: "docs/08-test-strategy.md",
  },
  {
    stateId: "state_design",
    stepId: "step_logic_backbone",
    artifactPath: "docs/19-logic-backbone.md",
  },
  { stateId: "state_plan", stepId: "step_mvp_plan", artifactPath: "docs/09-mvp-plan.md" },
  { stateId: "state_plan", stepId: "step_build_plan", artifactPath: "docs/10-build-plan.md" },
  {
    stateId: "state_build",
    stepId: "step_implementation_log",
    artifactPath: "docs/11-implementation-log.md",
  },
  {
    stateId: "state_build",
    stepId: "step_change_evidence",
    artifactPath: "docs/12-change-evidence.md",
  },
  {
    stateId: "state_build",
    stepId: "step_integration_notes",
    artifactPath: "docs/13-integration-notes.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_verification_report",
    artifactPath: "docs/14-verification-report.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_acceptance_mapping",
    artifactPath: "docs/15-acceptance-mapping.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_failure_fix_log",
    artifactPath: "docs/16-failure-fix-log.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_regression_evidence",
    artifactPath: "docs/17-regression-evidence.md",
  },
  {
    stateId: "state_verify",
    stepId: "step_final_build_verdict",
    artifactPath: "docs/18-final-build-verdict.md",
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..");
const EXAMPLE_DOCS_DIR = resolve(REPO_ROOT, "examples", "plan-to-verify", "docs");
const SMOKE_SCRIPT = resolve(REPO_ROOT, "examples", "plan-to-verify", "scripts", "smoke.sh");

describe("examples/plan-to-verify — fixture smoke (SOP 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-example-p2v-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("ships exactly 20 example doc fixtures matching FULL_PATH order", async () => {
    const expected = FULL_PATH.map((s) => s.artifactPath.split("/").pop());
    const actual = (await fs.readdir(EXAMPLE_DOCS_DIR)).filter((n) => n.endsWith(".md")).sort();
    expect(actual.sort()).toEqual([...expected].sort());
  });

  it("ships the smoke script and marks it executable", async () => {
    expect(existsSync(SMOKE_SCRIPT)).toBe(true);
    const stat = await fs.stat(SMOKE_SCRIPT);
    // bash interprets the script regardless of mode; this assertion just
    // documents the maintainer expectation.
    expect((stat.mode & 0o111) !== 0).toBe(true);
  });

  it("walks all 20 wired SOP 0.3.0 steps using the example docs and terminates cleanly", async () => {
    const cwd = project.cwd;

    // 1. ocn init — fresh DISCOVERY state under SOP 0.3.0.
    const initRes = await spawnOcn(["init", "--tier", "minimal"], { cwd });
    expect(initRes.exitCode, `init failed: ${initRes.stderr}`).toBe(0);

    const initState = JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
    expect(initState.project.sopProfileVersion).toBe("0.3.0");
    expect(initState.currentStateId).toBe("state_discovery");
    expect(initState.currentStepId).toBe("step_project_brief");

    // 2. Copy the example docs into the temp project's docs/.
    await fs.mkdir(join(cwd, "docs"), { recursive: true });
    const docNames = (await fs.readdir(EXAMPLE_DOCS_DIR)).filter((n) => n.endsWith(".md"));
    for (const name of docNames) {
      await fs.copyFile(join(EXAMPLE_DOCS_DIR, name), join(cwd, "docs", name));
    }

    // 3. Walk all 19 steps. status → check → gate → advance.
    for (let i = 0; i < FULL_PATH.length; i++) {
      const here = FULL_PATH[i]!;

      const statusRes = await spawnOcn(["status", "--json"], { cwd });
      expect(statusRes.exitCode, `status before ${here.stepId}`).toBe(0);
      const status = JSON.parse(statusRes.stdout);
      expect(status.data.currentStateId, `state at iteration ${i + 1}`).toBe(here.stateId);
      expect(status.data.currentStepId, `step at iteration ${i + 1}`).toBe(here.stepId);

      const checkRes = await spawnOcn(["check", "--json"], { cwd });
      expect(
        checkRes.exitCode,
        `check failed at ${here.stepId}: ${checkRes.stdout}\n${checkRes.stderr}`,
      ).toBe(0);
      const check = JSON.parse(checkRes.stdout);
      expect(check.ok).toBe(true);
      expect(check.data.status).toBe("pass");

      const gateRes = await spawnOcn(["gate", "--json"], { cwd });
      expect(
        gateRes.exitCode,
        `gate failed at ${here.stepId}: ${gateRes.stdout}\n${gateRes.stderr}`,
      ).toBe(0);
      const gate = JSON.parse(gateRes.stdout);
      expect(gate.ok).toBe(true);
      expect(gate.data.status).toBe("pass");

      if (i < FULL_PATH.length - 1) {
        const advRes = await spawnOcn(["advance", "--json"], { cwd });
        expect(advRes.exitCode, `advance from ${here.stepId}`).toBe(0);
        const adv = JSON.parse(advRes.stdout);
        expect(adv.ok).toBe(true);
        expect(adv.data.from.stepId).toBe(here.stepId);
        expect(adv.data.to.stepId).toBe(FULL_PATH[i + 1]!.stepId);
      }
    }

    // 4. Terminal advance must fail with ERR_STATE_MACHINE.
    const terminalRes = await spawnOcn(["advance", "--json"], { cwd });
    expect(terminalRes.exitCode).toBe(3);
    const terminal = JSON.parse(terminalRes.stdout);
    expect(terminal.ok).toBe(false);
    expect(terminal.code).toBe("ERR_STATE_MACHINE");

    // 5. Final state must be state_verify / step_final_build_verdict.
    const finalState = JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
    expect(finalState.currentStateId).toBe("state_verify");
    expect(finalState.currentStepId).toBe("step_final_build_verdict");
  }, 240_000);
});
