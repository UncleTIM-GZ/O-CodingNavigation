import { describe, expect, it } from "vitest";
import {
  isForwardTransition,
  isKnownLocation,
  nextStepFor,
} from "../../src/core/state-machine/state-machine.js";
import { loadSopProfile } from "../../src/core/sop/loader.js";

const profile = loadSopProfile();

describe("SopProfile state-machine API", () => {
  it("exposes the 8 canonical state IDs in order", () => {
    expect(profile.stateOrder).toEqual([
      "state_discovery",
      "state_spec",
      "state_design",
      "state_plan",
      "state_build",
      "state_verify",
      "state_ship",
      "state_reflect",
    ]);
  });

  // SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. step_scope moved out of
  // state_discovery into state_spec; state_build / state_verify gained
  // wired steps; only state_ship and state_reflect remain stubs.
  it("returns the configured steps for state_discovery (only step_project_brief)", () => {
    expect(profile.stepsForState("state_discovery")).toEqual(["step_project_brief"]);
  });

  it("returns the configured steps for state_spec (3 wired steps: scope, prd, acceptance_criteria)", () => {
    expect(profile.stepsForState("state_spec")).toEqual([
      "step_scope",
      "step_prd",
      "step_acceptance_criteria",
    ]);
  });

  it("returns the configured steps for state_design (6 steps; logic_backbone after data_model under 0.3.0)", () => {
    expect(profile.stepsForState("state_design")).toEqual([
      "step_technical_architecture",
      "step_information_architecture",
      "step_data_model",
      "step_logic_backbone",
      "step_api_contract",
      "step_test_strategy",
    ]);
  });

  it("returns the configured steps for state_plan (mvp_plan, build_plan)", () => {
    expect(profile.stepsForState("state_plan")).toEqual(["step_mvp_plan", "step_build_plan"]);
  });

  it("returns the configured steps for state_build (3 wired steps under 0.2.0)", () => {
    expect(profile.stepsForState("state_build")).toEqual([
      "step_implementation_log",
      "step_change_evidence",
      "step_integration_notes",
    ]);
  });

  it("returns the configured steps for state_verify (5 wired steps under 0.2.0)", () => {
    expect(profile.stepsForState("state_verify")).toEqual([
      "step_verification_report",
      "step_acceptance_mapping",
      "step_failure_fix_log",
      "step_regression_evidence",
      "step_final_build_verdict",
    ]);
  });

  it("returns empty arrays for state stubs that remain in 0.2.0 (state_ship / state_reflect)", () => {
    expect(profile.stepsForState("state_ship")).toEqual([]);
    expect(profile.stepsForState("state_reflect")).toEqual([]);
  });

  it("artifactPathForStep maps to the project-relative doc path", () => {
    expect(profile.artifactPathForStep("step_project_brief")).toBe("docs/00-project-brief.md");
    expect(profile.artifactPathForStep("step_scope")).toBe("docs/01-scope.md");
    expect(profile.artifactPathForStep("step_prd")).toBe("docs/02-prd.md");
    expect(profile.artifactPathForStep("step_acceptance_criteria")).toBe(
      "docs/03-acceptance-criteria.md",
    );
    expect(profile.artifactPathForStep("step_technical_architecture")).toBe(
      "docs/04-technical-architecture.md",
    );
    expect(profile.artifactPathForStep("step_information_architecture")).toBe(
      "docs/05-information-architecture.md",
    );
    expect(profile.artifactPathForStep("step_data_model")).toBe("docs/06-data-model.md");
    // SOP 0.3.0 — logic_backbone at 07, everything from api_contract shifts +1.
    expect(profile.artifactPathForStep("step_logic_backbone")).toBe("docs/07-logic-backbone.md");
    expect(profile.artifactPathForStep("step_api_contract")).toBe("docs/08-api-contract.md");
    expect(profile.artifactPathForStep("step_test_strategy")).toBe("docs/09-test-strategy.md");
    expect(profile.artifactPathForStep("step_mvp_plan")).toBe("docs/10-mvp-plan.md");
    expect(profile.artifactPathForStep("step_build_plan")).toBe("docs/11-build-plan.md");
    expect(profile.artifactPathForStep("step_implementation_log")).toBe(
      "docs/12-implementation-log.md",
    );
    expect(profile.artifactPathForStep("step_change_evidence")).toBe("docs/13-change-evidence.md");
    expect(profile.artifactPathForStep("step_integration_notes")).toBe(
      "docs/14-integration-notes.md",
    );
    expect(profile.artifactPathForStep("step_verification_report")).toBe(
      "docs/15-verification-report.md",
    );
    expect(profile.artifactPathForStep("step_acceptance_mapping")).toBe(
      "docs/16-acceptance-mapping.md",
    );
    expect(profile.artifactPathForStep("step_failure_fix_log")).toBe("docs/17-failure-fix-log.md");
    expect(profile.artifactPathForStep("step_regression_evidence")).toBe(
      "docs/18-regression-evidence.md",
    );
    expect(profile.artifactPathForStep("step_final_build_verdict")).toBe(
      "docs/19-final-build-verdict.md",
    );
  });

  it("artifactPathForStep returns null for unknown steps", () => {
    expect(profile.artifactPathForStep("step_nonexistent")).toBeNull();
  });
});

describe("nextStepFor", () => {
  // SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. project_brief is the only
  // step in state_discovery; its successor is state_spec/step_scope.
  it("advances ACROSS states: state_discovery/project_brief → state_spec/step_scope", () => {
    const next = nextStepFor(profile, {
      stateId: "state_discovery",
      stepId: "step_project_brief",
    });
    expect(next).toEqual({ stateId: "state_spec", stepId: "step_scope" });
  });

  it("advances within state_spec: scope → prd", () => {
    const next = nextStepFor(profile, {
      stateId: "state_spec",
      stepId: "step_scope",
    });
    expect(next).toEqual({ stateId: "state_spec", stepId: "step_prd" });
  });

  it("advances state_spec final step into state_design", () => {
    const next = nextStepFor(profile, {
      stateId: "state_spec",
      stepId: "step_acceptance_criteria",
    });
    expect(next).toEqual({
      stateId: "state_design",
      stepId: "step_technical_architecture",
    });
  });

  it("advances within state_design: data_model → logic_backbone (0.3.0)", () => {
    const next = nextStepFor(profile, {
      stateId: "state_design",
      stepId: "step_data_model",
    });
    expect(next).toEqual({ stateId: "state_design", stepId: "step_logic_backbone" });
  });

  it("advances within state_design: logic_backbone → api_contract (0.3.0)", () => {
    const next = nextStepFor(profile, {
      stateId: "state_design",
      stepId: "step_logic_backbone",
    });
    expect(next).toEqual({ stateId: "state_design", stepId: "step_api_contract" });
  });

  it("advances state_design final step (test_strategy) into state_plan/step_mvp_plan", () => {
    const next = nextStepFor(profile, {
      stateId: "state_design",
      stepId: "step_test_strategy",
    });
    expect(next).toEqual({ stateId: "state_plan", stepId: "step_mvp_plan" });
  });

  it("advances within state_plan: mvp_plan → build_plan", () => {
    const next = nextStepFor(profile, {
      stateId: "state_plan",
      stepId: "step_mvp_plan",
    });
    expect(next).toEqual({ stateId: "state_plan", stepId: "step_build_plan" });
  });

  it("advances state_plan final step (build_plan) into state_build/step_implementation_log", () => {
    const next = nextStepFor(profile, {
      stateId: "state_plan",
      stepId: "step_build_plan",
    });
    expect(next).toEqual({
      stateId: "state_build",
      stepId: "step_implementation_log",
    });
  });

  it("advances state_build final step (integration_notes) into state_verify/step_verification_report", () => {
    const next = nextStepFor(profile, {
      stateId: "state_build",
      stepId: "step_integration_notes",
    });
    expect(next).toEqual({
      stateId: "state_verify",
      stepId: "step_verification_report",
    });
  });

  it("advances within state_verify: verification_report → acceptance_mapping", () => {
    const next = nextStepFor(profile, {
      stateId: "state_verify",
      stepId: "step_verification_report",
    });
    expect(next).toEqual({
      stateId: "state_verify",
      stepId: "step_acceptance_mapping",
    });
  });

  it("returns null at the terminal step (state_verify/step_final_build_verdict, since SHIP/REFLECT are stubs)", () => {
    const next = nextStepFor(profile, {
      stateId: "state_verify",
      stepId: "step_final_build_verdict",
    });
    expect(next).toBeNull();
  });

  it("returns null for an unknown step id", () => {
    const next = nextStepFor(profile, {
      stateId: "state_discovery",
      stepId: "step_unknown",
    });
    expect(next).toBeNull();
  });
});

describe("isForwardTransition", () => {
  it("accepts same-state transition (step-within-state advance)", () => {
    expect(isForwardTransition(profile, "state_discovery", "state_discovery")).toBe(true);
  });

  it("accepts forward state transitions", () => {
    expect(isForwardTransition(profile, "state_discovery", "state_spec")).toBe(true);
    expect(isForwardTransition(profile, "state_spec", "state_design")).toBe(true);
    expect(isForwardTransition(profile, "state_plan", "state_build")).toBe(true);
  });

  it("rejects backwards transitions", () => {
    expect(isForwardTransition(profile, "state_spec", "state_discovery")).toBe(false);
    expect(isForwardTransition(profile, "state_reflect", "state_ship")).toBe(false);
  });
});

describe("isKnownLocation", () => {
  it("returns true for valid (state, step) pairs", () => {
    expect(
      isKnownLocation(profile, {
        stateId: "state_spec",
        stepId: "step_prd",
      }),
    ).toBe(true);
  });

  it("returns false when the step does not belong to that state", () => {
    expect(
      isKnownLocation(profile, {
        stateId: "state_design",
        stepId: "step_prd",
      }),
    ).toBe(false);
  });

  it("returns false when step is not in the named state (state_build does not contain step_prd)", () => {
    expect(
      isKnownLocation(profile, {
        stateId: "state_build",
        stepId: "step_prd",
      }),
    ).toBe(false);
  });

  it("returns false for stub states (state_ship / state_reflect) under 0.2.0", () => {
    expect(
      isKnownLocation(profile, {
        stateId: "state_ship",
        stepId: "step_anything",
      }),
    ).toBe(false);
    expect(
      isKnownLocation(profile, {
        stateId: "state_reflect",
        stepId: "step_anything",
      }),
    ).toBe(false);
  });
});
