import { describe, expect, it } from "vitest";
import {
  PROFILE_ID,
  PROFILE_VERSION,
  REQUIRED_SECTIONS_BY_STEP,
  STATE_DEFS,
  STEPS_BY_STATE,
} from "../../src/sops/default-ai-coding-sop/0.1.0/data.js";
import {
  canonicalSopSnapshotSignals,
  renderArtifactsYaml,
  renderGatesYaml,
  renderSopYaml,
} from "../../src/sops/default-ai-coding-sop/0.1.0/render.js";
import { loadSopProfile } from "../../src/core/sop/loader.js";

// P1-003 — these tests pin the canonical SOP renderer to the runtime profile
// so the persisted .ocoding/*.yaml can never drift from what the loader
// claims to know about. If a step is added to data.ts, every assertion
// below has to be updated in the same PR — that is the point.

const ALL_V1_STEPS = [
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
] as const;

const ALL_V1_STATES = [
  "state_discovery",
  "state_spec",
  "state_design",
  "state_plan",
  "state_build",
  "state_verify",
  "state_ship",
  "state_reflect",
] as const;

describe("sop/render — canonical YAML emission", () => {
  it("renderSopYaml() includes the profile header (id + version + schemaVersion)", () => {
    const yaml = renderSopYaml();
    expect(yaml).toMatch(`profile: ${PROFILE_ID}`);
    expect(yaml).toMatch(`version: ${PROFILE_VERSION}`);
    expect(yaml).toMatch(/schemaVersion: "1\.0"/);
  });

  it("renderSopYaml() lists every state from STATE_DEFS in canonical order", () => {
    const yaml = renderSopYaml();
    const indices = ALL_V1_STATES.map((id) => yaml.indexOf(`id: ${id}`));
    indices.forEach((idx, i) =>
      expect(idx, `state ${ALL_V1_STATES[i]} present in sop.yaml`).toBeGreaterThanOrEqual(0),
    );
    // Order check: monotonically increasing offsets ⇒ ordered emission.
    for (let i = 1; i < indices.length; i++) {
      const prev = indices[i - 1] ?? -1;
      const curr = indices[i] ?? -1;
      expect(curr, `state ${ALL_V1_STATES[i]} after ${ALL_V1_STATES[i - 1]}`).toBeGreaterThan(
        prev,
      );
    }
  });

  it("renderSopYaml() lists every step the runtime claims to know about", () => {
    const yaml = renderSopYaml();
    for (const stepId of ALL_V1_STEPS) {
      expect(yaml, `step ${stepId} present in sop.yaml`).toContain(`- ${stepId}`);
    }
  });

  it("renderGatesYaml() emits a gate entry for every step (including artifact-only ones)", () => {
    const yaml = renderGatesYaml();
    for (const stepId of ALL_V1_STEPS) {
      expect(yaml, `gate ${stepId} present in gates.yaml`).toContain(`${stepId}:`);
    }
  });

  it("renderGatesYaml() expands required sections for the 5 steps that have them", () => {
    const yaml = renderGatesYaml();
    for (const [stepId, sections] of Object.entries(REQUIRED_SECTIONS_BY_STEP)) {
      for (const section of sections) {
        expect(yaml, `${section.id} appears under ${stepId}`).toContain(`- ${section.id}`);
      }
    }
  });

  it("renderArtifactsYaml() lists every artifact path mapped by the runtime", () => {
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

  it("loadSopProfile() reuses the rendered YAML strings", () => {
    const profile = loadSopProfile();
    expect(profile.sopYaml).toBe(renderSopYaml());
    expect(profile.gatesYaml).toBe(renderGatesYaml());
    expect(profile.artifactsYaml).toBe(renderArtifactsYaml());
  });

  it("canonicalSopSnapshotSignals() includes every state and step", () => {
    const signals = canonicalSopSnapshotSignals();
    for (const stateId of ALL_V1_STATES) {
      expect(signals).toContain(stateId);
    }
    for (const stepId of ALL_V1_STEPS) {
      expect(signals).toContain(stepId);
    }
  });

  it("the legacy Skeleton Spike snapshot fails canonical signals", () => {
    const legacySkeleton = `profile: default-ai-coding-sop
version: 0.1.0
schemaVersion: "1.0"
states:
  - id: state_spec
    name: SPEC
    purpose: Form structured PRD and acceptance criteria
    steps:
      - step_prd
`;
    const signals = canonicalSopSnapshotSignals();
    const missing = signals.filter((s) => !legacySkeleton.includes(s));
    // The legacy snapshot only knows state_spec / step_prd, so almost every
    // canonical signal must be missing. This guards against accidentally
    // reverting `data.ts` to a skeleton-only set.
    expect(missing.length, `legacy snapshot misses ≥ 8 canonical signals`).toBeGreaterThan(8);
  });
});
