import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOP_PROFILE_VERSION,
  KNOWN_SOP_PROFILE_VERSIONS,
  isKnownSopProfileVersion,
  loadSopProfile,
  loadSopProfileByVersion,
  resolveProfileForProject,
} from "../../src/core/sop/loader.js";

// SOP 0.9.0 (AM-017 / DEC-043) — P4a: profile registered + importable, default
// still 0.8.0. These tests pin the A-H1 / C-1 terminal-leak invariant and the
// shallow-copy isolation BEFORE the P4b runtime-default flip, so the flip lands
// on already-green regressions.

describe("SOP 0.9.0 profile registration (P4a)", () => {
  it("is a known, resolvable profile version", () => {
    expect(isKnownSopProfileVersion("0.9.0")).toBe(true);
    expect(KNOWN_SOP_PROFILE_VERSIONS).toContain("0.9.0");
  });

  it("the runtime default is now 0.9.0 (activation, AM-017 / DEC-043)", () => {
    expect(DEFAULT_SOP_PROFILE_VERSION).toBe("0.9.0");
    expect(loadSopProfile().version).toBe("0.9.0");
  });

  it("wires state_ship → step_release and state_reflect → step_evolution_report", () => {
    const p090 = loadSopProfileByVersion("0.9.0");
    expect(p090.stepsForState("state_ship")).toEqual(["step_release"]);
    expect(p090.stepsForState("state_reflect")).toEqual(["step_evolution_report"]);
    expect(p090.artifactPathForStep("step_release")).toBeNull();
    expect(p090.artifactPathForStep("step_evolution_report")).toBe("docs/23-evolution-report.md");
    expect(p090.requiredSectionsForStep("step_evolution_report").map((s) => s.id)).toContain(
      "section_outcome_references",
    );
  });
});

describe("A-H1 / C-1 — nextStep is pin-isolated (no terminal leak)", () => {
  it("0.8.0-pinned project keeps step_final_build_verdict as its terminal", () => {
    const p080 = resolveProfileForProject("0.8.0");
    expect(p080.nextStep("state_verify", "step_final_build_verdict")).toBeNull();
  });

  it("0.9.0 crosses past the old terminal: verdict → release → evolution → null", () => {
    const p090 = resolveProfileForProject("0.9.0");
    expect(p090.nextStep("state_verify", "step_final_build_verdict")).toEqual({
      stateId: "state_ship",
      stepId: "step_release",
    });
    expect(p090.nextStep("state_ship", "step_release")).toEqual({
      stateId: "state_reflect",
      stepId: "step_evolution_report",
    });
    expect(p090.nextStep("state_reflect", "step_evolution_report")).toBeNull();
  });
});

describe("Risk 2 — shallow copy does not pollute the frozen 0.8.0 profile", () => {
  it("0.8.0 state_ship / state_reflect stay empty after 0.9.0 registers", () => {
    const p080 = loadSopProfileByVersion("0.8.0");
    expect(p080.stepsForState("state_ship")).toEqual([]);
    expect(p080.stepsForState("state_reflect")).toEqual([]);
    // …and 0.8.0's terminal is still the final build verdict.
    expect(p080.nextStep("state_verify", "step_final_build_verdict")).toBeNull();
  });
});
