import { describe, expect, it } from "vitest";
import { isSectionId, isStateId, isStepId } from "../../src/core/id.js";

describe("stable id helpers", () => {
  // @ac AC-STATE-003
  it("recognizes valid state ids from the enum", () => {
    expect(isStateId("state_spec")).toBe(true);
    expect(isStateId("state_design")).toBe(true);
  });

  it("rejects unknown state ids", () => {
    expect(isStateId("state_unknown")).toBe(false);
    expect(isStateId("STATE_SPEC")).toBe(false);
  });

  it("recognizes step_ prefix", () => {
    expect(isStepId("step_prd")).toBe(true);
    expect(isStepId("step_acceptance_criteria")).toBe(true);
  });

  it("rejects non-step strings", () => {
    expect(isStepId("prd")).toBe(false);
    expect(isStepId("3")).toBe(false);
  });

  it("recognizes section_ prefix", () => {
    expect(isSectionId("section_scenarios")).toBe(true);
  });

  it("rejects non-section strings", () => {
    expect(isSectionId("scenarios")).toBe(false);
  });
});
