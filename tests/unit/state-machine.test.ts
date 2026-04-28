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

  it("returns the configured steps for state_discovery", () => {
    expect(profile.stepsForState("state_discovery")).toEqual([
      "step_project_brief",
      "step_scope",
    ]);
  });

  it("returns the configured steps for state_design (5 steps including technical-architecture first)", () => {
    expect(profile.stepsForState("state_design")).toEqual([
      "step_technical_architecture",
      "step_information_architecture",
      "step_data_model",
      "step_api_contract",
      "step_test_strategy",
    ]);
  });

  it("returns empty arrays for state stubs (state_build / state_verify / state_ship / state_reflect)", () => {
    expect(profile.stepsForState("state_build")).toEqual([]);
    expect(profile.stepsForState("state_verify")).toEqual([]);
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
    expect(profile.artifactPathForStep("step_data_model")).toBe(
      "docs/06-data-model.md",
    );
    expect(profile.artifactPathForStep("step_api_contract")).toBe(
      "docs/07-api-contract.md",
    );
    expect(profile.artifactPathForStep("step_test_strategy")).toBe(
      "docs/08-test-strategy.md",
    );
    expect(profile.artifactPathForStep("step_mvp_plan")).toBe("docs/09-mvp-plan.md");
  });

  it("artifactPathForStep returns null for unknown steps", () => {
    expect(profile.artifactPathForStep("step_nonexistent")).toBeNull();
  });
});

describe("nextStepFor", () => {
  it("advances within state_discovery: project_brief → scope", () => {
    const next = nextStepFor(profile, {
      stateId: "state_discovery",
      stepId: "step_project_brief",
    });
    expect(next).toEqual({ stateId: "state_discovery", stepId: "step_scope" });
  });

  it("advances ACROSS states: scope → state_spec/step_prd", () => {
    const next = nextStepFor(profile, {
      stateId: "state_discovery",
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

  it("advances within state_design", () => {
    const next = nextStepFor(profile, {
      stateId: "state_design",
      stepId: "step_data_model",
    });
    expect(next).toEqual({
      stateId: "state_design",
      stepId: "step_api_contract",
    });
  });

  it("advances state_design final step into state_plan", () => {
    const next = nextStepFor(profile, {
      stateId: "state_design",
      stepId: "step_test_strategy",
    });
    expect(next).toEqual({ stateId: "state_plan", stepId: "step_mvp_plan" });
  });

  it("returns null at the terminal step (state_plan/step_mvp_plan, since BUILD+ are stubs)", () => {
    const next = nextStepFor(profile, {
      stateId: "state_plan",
      stepId: "step_mvp_plan",
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

  it("returns false for stub states with no steps", () => {
    expect(
      isKnownLocation(profile, {
        stateId: "state_build",
        stepId: "step_prd",
      }),
    ).toBe(false);
  });
});
