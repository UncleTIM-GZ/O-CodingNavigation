import { describe, expect, it } from "vitest";
import {
  PROFILE_ID,
  PROFILE_VERSION,
  REQUIRED_SECTIONS_BY_STEP,
  STATE_DEFS,
  STATE_ORDER,
  STEPS_BY_STATE,
} from "../../src/sops/default-ai-coding-sop/0.2.0/data.js";

// DEC-023 — pin the SOP 0.2.0 profile data shape so future PRs in the
// strong-gated build/verify sequence cannot silently rename or drop steps,
// artifacts, or required sections. Every assertion below mirrors the plan
// in docs/plans/2026-05-02-sop-0.2-strong-gated-build-verify-plan.md and
// the canonical step / artifact map listed in DEC-023.

const ALL_V2_STATES = [
  "state_discovery",
  "state_spec",
  "state_design",
  "state_plan",
  "state_build",
  "state_verify",
  "state_ship",
  "state_reflect",
] as const;

const ALL_V2_WIRED_STEPS = [
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
  "step_build_plan",
  "step_implementation_log",
  "step_change_evidence",
  "step_integration_notes",
  "step_verification_report",
  "step_acceptance_mapping",
  "step_failure_fix_log",
  "step_regression_evidence",
  "step_final_build_verdict",
] as const;

const ALL_V2_ARTIFACT_PATHS = [
  "docs/00-project-brief.md",
  "docs/01-scope.md",
  "docs/02-prd.md",
  "docs/03-acceptance-criteria.md",
  "docs/04-technical-architecture.md",
  "docs/05-information-architecture.md",
  "docs/06-data-model.md",
  "docs/07-api-contract.md",
  "docs/08-test-strategy.md",
  "docs/09-mvp-plan.md",
  "docs/10-build-plan.md",
  "docs/11-implementation-log.md",
  "docs/12-change-evidence.md",
  "docs/13-integration-notes.md",
  "docs/14-verification-report.md",
  "docs/15-acceptance-mapping.md",
  "docs/16-failure-fix-log.md",
  "docs/17-regression-evidence.md",
  "docs/18-final-build-verdict.md",
] as const;

describe("sop 0.2.0 — profile data integrity", () => {
  it("declares the canonical profile id and version", () => {
    expect(PROFILE_ID).toBe("default-ai-coding-sop");
    expect(PROFILE_VERSION).toBe("0.2.0");
  });

  it("STATE_DEFS includes all 8 v1.0 states in canonical order", () => {
    expect(STATE_DEFS.map((s) => s.id)).toEqual(ALL_V2_STATES);
    expect(STATE_ORDER).toEqual(ALL_V2_STATES);
  });

  it("declares exactly 19 wired steps across DISCOVERY → VERIFY", () => {
    const wired: string[] = [];
    for (const stateId of STATE_ORDER) {
      for (const step of STEPS_BY_STATE[stateId]) {
        wired.push(step.stepId);
      }
    }
    expect(wired.length).toBe(19);
    expect(wired).toEqual(ALL_V2_WIRED_STEPS);
  });

  it("SHIP and REFLECT remain stub states with empty step arrays", () => {
    expect(STEPS_BY_STATE["state_ship"]).toEqual([]);
    expect(STEPS_BY_STATE["state_reflect"]).toEqual([]);
  });

  it("artifact paths 00–18 match the DEC-023 plan exactly", () => {
    const paths: string[] = [];
    for (const stateId of STATE_ORDER) {
      for (const step of STEPS_BY_STATE[stateId]) {
        if (step.artifactPath !== null) paths.push(step.artifactPath);
      }
    }
    expect(paths).toEqual(ALL_V2_ARTIFACT_PATHS);
  });

  it("every wired step has a non-null artifact path", () => {
    for (const stateId of STATE_ORDER) {
      for (const step of STEPS_BY_STATE[stateId]) {
        expect(step.artifactPath, `${step.stepId} has artifact path`).not.toBeNull();
      }
    }
  });

  it("every wired step has at least one required section (no 00–18 step is empty)", () => {
    for (const stepId of ALL_V2_WIRED_STEPS) {
      const sections = REQUIRED_SECTIONS_BY_STEP[stepId];
      expect(sections, `${stepId} has required sections defined`).toBeDefined();
      expect(sections!.length, `${stepId} has ≥ 1 required section`).toBeGreaterThan(0);
    }
  });

  it("no duplicate step IDs anywhere in STEPS_BY_STATE", () => {
    const seen = new Set<string>();
    for (const stateId of STATE_ORDER) {
      for (const step of STEPS_BY_STATE[stateId]) {
        expect(seen.has(step.stepId), `duplicate step id ${step.stepId}`).toBe(false);
        seen.add(step.stepId);
      }
    }
    expect(seen.size).toBe(19);
  });

  it("no duplicate artifact paths", () => {
    const seen = new Set<string>();
    for (const stateId of STATE_ORDER) {
      for (const step of STEPS_BY_STATE[stateId]) {
        if (step.artifactPath === null) continue;
        expect(
          seen.has(step.artifactPath),
          `duplicate artifact path ${step.artifactPath}`,
        ).toBe(false);
        seen.add(step.artifactPath);
      }
    }
    expect(seen.size).toBe(19);
  });

  it("every required-section entry uses a stable section_ id and provides aliases", () => {
    for (const [stepId, sections] of Object.entries(REQUIRED_SECTIONS_BY_STEP)) {
      for (const section of sections) {
        expect(section.id, `${stepId} → section.id starts with section_`).toMatch(
          /^section_[a-z0-9_]+$/,
        );
        expect(section.canonical.length, `${stepId} → ${section.id} has canonical title`).toBeGreaterThan(
          0,
        );
        expect(section.aliases.length, `${stepId} → ${section.id} has at least one alias`).toBeGreaterThan(
          0,
        );
        expect(section.allowedLevels).toContain(2);
      }
    }
  });

  it("required-section ids are unique within each step", () => {
    for (const [stepId, sections] of Object.entries(REQUIRED_SECTIONS_BY_STEP)) {
      const ids = sections.map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size, `${stepId} has duplicate section ids`).toBe(ids.length);
    }
  });

  // DEC-023 — sample required sections per step to make accidental wording
  // drift impossible without an explicit test update.
  it("step_project_brief required sections match DEC-023 wording", () => {
    expect(REQUIRED_SECTIONS_BY_STEP["step_project_brief"]?.map((s) => s.canonical)).toEqual([
      "Problem",
      "Goal",
      "Users",
      "Success Criteria",
      "Constraints",
      "Risks",
      "Non-goals",
    ]);
  });

  it("step_final_build_verdict required sections match DEC-023 wording", () => {
    expect(
      REQUIRED_SECTIONS_BY_STEP["step_final_build_verdict"]?.map((s) => s.canonical),
    ).toEqual([
      "Summary",
      "Acceptance Status",
      "Verification Status",
      "Remaining Risks",
      "Release Recommendation",
      "Human Decision",
    ]);
  });

  it("step_verification_report required sections include the seven verification surfaces", () => {
    expect(
      REQUIRED_SECTIONS_BY_STEP["step_verification_report"]?.map((s) => s.canonical),
    ).toEqual([
      "Lint Result",
      "Typecheck Result",
      "Test Result",
      "Coverage Result",
      "Build Result",
      "Smoke Result",
      "Known Failures",
    ]);
  });
});
