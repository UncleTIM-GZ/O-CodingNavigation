import { describe, expect, it } from "vitest";
import {
  PROFILE_ID,
  PROFILE_VERSION,
  REQUIRED_SECTIONS_BY_STEP,
  STATE_DEFS,
  STEPS_BY_STATE,
} from "../../src/sops/default-ai-coding-sop/0.2.0/data.js";
import {
  canonicalSopSnapshotSignals,
  renderArtifactsYaml,
  renderGatesYaml,
  renderSopYaml,
} from "../../src/sops/default-ai-coding-sop/0.2.0/render.js";
import { artifactsYaml as bundledArtifactsYaml } from "../../src/sops/default-ai-coding-sop/0.2.0/artifacts.js";
import { gatesYaml as bundledGatesYaml } from "../../src/sops/default-ai-coding-sop/0.2.0/gates.js";
import { sopYaml as bundledSopYaml } from "../../src/sops/default-ai-coding-sop/0.2.0/sop.js";
import { loadSopProfile } from "../../src/core/sop/loader.js";

// DEC-023 — pin the deterministic SOP 0.2.0 renderer outputs. Mirrors the
// 0.1.0 render test (tests/unit/sop-render.test.ts) so the runtime switch
// in PR 3 / PR 4 of the SOP 0.2.0 6-PR sequence has a stable shape to wire
// against. PR 1 does NOT change runtime defaults — `loadSopProfile()` still
// returns 0.1.0; assertions at the bottom guard that explicitly.

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

describe("sop 0.2.0 — canonical YAML emission", () => {
  it("renderSopYaml() includes the 0.2.0 profile header (id + version + schemaVersion)", () => {
    const yaml = renderSopYaml();
    expect(yaml).toMatch(`profile: ${PROFILE_ID}`);
    expect(yaml).toMatch(`version: ${PROFILE_VERSION}`);
    expect(yaml).toMatch(/schemaVersion: "1\.0"/);
  });

  it("renderSopYaml() lists every state from STATE_DEFS in canonical order", () => {
    const yaml = renderSopYaml();
    const indices = ALL_V2_STATES.map((id) => yaml.indexOf(`id: ${id}`));
    indices.forEach((idx, i) =>
      expect(idx, `state ${ALL_V2_STATES[i]} present in sop.yaml`).toBeGreaterThanOrEqual(0),
    );
    for (let i = 1; i < indices.length; i++) {
      const prev = indices[i - 1] ?? -1;
      const curr = indices[i] ?? -1;
      expect(curr, `state ${ALL_V2_STATES[i]} after ${ALL_V2_STATES[i - 1]}`).toBeGreaterThan(prev);
    }
  });

  it("renderSopYaml() lists every wired step (19 total) and SHIP/REFLECT have empty step arrays", () => {
    const yaml = renderSopYaml();
    for (const stepId of ALL_V2_WIRED_STEPS) {
      expect(yaml, `step ${stepId} present in sop.yaml`).toContain(`- ${stepId}`);
    }
    // SHIP and REFLECT remain stubs — explicit `steps: []` rendering.
    expect(yaml).toMatch(/id: state_ship[\s\S]*?steps: \[\]/);
    expect(yaml).toMatch(/id: state_reflect[\s\S]*?steps: \[\]/);
  });

  it("renderGatesYaml() emits exactly 19 gate entries (one per wired step)", () => {
    const yaml = renderGatesYaml();
    for (const stepId of ALL_V2_WIRED_STEPS) {
      expect(yaml, `gate ${stepId} present in gates.yaml`).toContain(`${stepId}:`);
    }
    // Count colon-prefixed step lines to assert no extra gates leaked in.
    const matches = yaml.match(/^ {2}step_[a-z0-9_]+:$/gm) ?? [];
    expect(matches.length).toBe(19);
  });

  it("renderGatesYaml() expands required sections for every wired step", () => {
    const yaml = renderGatesYaml();
    for (const [stepId, sections] of Object.entries(REQUIRED_SECTIONS_BY_STEP)) {
      for (const section of sections) {
        expect(yaml, `${section.id} appears under ${stepId}`).toContain(`- ${section.id}`);
      }
    }
  });

  it("renderArtifactsYaml() lists every artifact path in canonical order", () => {
    const yaml = renderArtifactsYaml();
    for (const state of STATE_DEFS) {
      for (const step of STEPS_BY_STATE[state.id]) {
        if (step.artifactPath === null) continue;
        const artifactId = step.stepId.replace(/^step_/, "artifact_");
        expect(yaml, `${artifactId} listed`).toContain(`${artifactId}:`);
        expect(yaml, `${artifactId} → ${step.artifactPath}`).toContain(
          `path: ${step.artifactPath}`,
        );
        expect(yaml, `${artifactId} requiredForSteps`).toContain(`- ${step.stepId}`);
      }
    }
  });

  it("renderArtifactsYaml() emits exactly 19 artifact entries", () => {
    const yaml = renderArtifactsYaml();
    for (const path of ALL_V2_ARTIFACT_PATHS) {
      expect(yaml, `${path} mapped`).toContain(`path: ${path}`);
    }
    const pathLines = yaml.match(/^ {4}path: docs\//gm) ?? [];
    expect(pathLines.length).toBe(19);
  });

  it("renderer output is deterministic — repeated calls return identical strings", () => {
    expect(renderSopYaml()).toBe(renderSopYaml());
    expect(renderGatesYaml()).toBe(renderGatesYaml());
    expect(renderArtifactsYaml()).toBe(renderArtifactsYaml());
  });

  it("bundled sop/gates/artifacts modules re-export the rendered strings", () => {
    expect(bundledSopYaml).toBe(renderSopYaml());
    expect(bundledGatesYaml).toBe(renderGatesYaml());
    expect(bundledArtifactsYaml).toBe(renderArtifactsYaml());
  });

  it("canonicalSopSnapshotSignals() includes every state and wired step", () => {
    const signals = canonicalSopSnapshotSignals();
    for (const stateId of ALL_V2_STATES) {
      expect(signals).toContain(stateId);
    }
    for (const stepId of ALL_V2_WIRED_STEPS) {
      expect(signals).toContain(stepId);
    }
  });
});

describe("sop 0.2.0 — runtime cutover guard (now 0.8.0, AM-015 / DEC-041)", () => {
  // AM-015 — the runtime default is now 0.8.0. These guards pin that
  // behavior; reverting the loader to an older default would break them.
  it("loadSopProfile() returns 0.8.0 by default (AM-015)", () => {
    const profile = loadSopProfile();
    expect(profile.id).toBe("default-ai-coding-sop");
    expect(profile.version).toBe("0.8.0");
  });

  it("loaded profile YAML is the 0.2.0 rendering with all 19 wired steps", () => {
    const profile = loadSopProfile();
    // 0.2.0 introduces step_build_plan / step_implementation_log etc. They
    // MUST appear in the runtime sop.yaml string.
    expect(profile.sopYaml).toContain("step_build_plan");
    expect(profile.sopYaml).toContain("step_implementation_log");
    expect(profile.sopYaml).toContain("step_final_build_verdict");
  });
});
