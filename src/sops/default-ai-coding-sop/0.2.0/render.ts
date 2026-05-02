import {
  PROFILE_ID,
  PROFILE_VERSION,
  REQUIRED_SECTIONS_BY_STEP,
  SCHEMA_VERSION,
  STATE_DEFS,
  STEPS_BY_STATE,
} from "./data.js";

// DEC-023 — render the canonical SOP 0.2.0 profile data into the YAML strings
// that a future `ocn init` (PR 3 / PR 4 of the SOP 0.2.0 6-PR sequence) will
// write under .ocoding/. Hand-rolled emission (rather than js-yaml stringify)
// keeps line ordering stable and the output diffable against fixtures and
// hash-based drift checks. Every field in the rendered output is derived
// from `data.ts` so the persisted snapshot can never drift from the runtime
// profile.
//
// In PR 1 these renderers exist as importable functions only — no runtime
// consumer calls them in default init. The runtime switch is deferred per
// the SOP 0.2.0 plan (docs/plans/2026-05-02-sop-0.2-strong-gated-build-
// verify-plan.md). Tests in tests/unit/sop-0.2-render.test.ts pin the
// determinism contract for that future wiring.

const NEWLINE = "\n";

function header(): string {
  return [
    `profile: ${PROFILE_ID}`,
    `version: ${PROFILE_VERSION}`,
    `schemaVersion: "${SCHEMA_VERSION}"`,
  ].join(NEWLINE);
}

export function renderSopYaml(): string {
  const lines: string[] = [];
  lines.push(header());
  lines.push("states:");
  for (const state of STATE_DEFS) {
    lines.push(`  - id: ${state.id}`);
    lines.push(`    name: ${state.name}`);
    lines.push(`    purpose: ${state.purpose}`);
    const steps = STEPS_BY_STATE[state.id];
    if (steps.length === 0) {
      lines.push(`    steps: []`);
    } else {
      lines.push(`    steps:`);
      for (const step of steps) {
        lines.push(`      - ${step.stepId}`);
      }
    }
  }
  return lines.join(NEWLINE) + NEWLINE;
}

export function renderGatesYaml(): string {
  const lines: string[] = [];
  lines.push("gates:");

  // Walk in canonical state/step order so the rendered file matches the
  // pipeline order shown by `ocn status`/`ocn brief` once 0.2.0 is wired.
  for (const state of STATE_DEFS) {
    for (const step of STEPS_BY_STATE[state.id]) {
      const required = REQUIRED_SECTIONS_BY_STEP[step.stepId] ?? [];
      lines.push(`  ${step.stepId}:`);
      if (required.length === 0) {
        lines.push(`    requiredSections: []`);
      } else {
        lines.push(`    requiredSections:`);
        for (const section of required) {
          lines.push(`      - ${section.id}`);
        }
      }
    }
  }
  return lines.join(NEWLINE) + NEWLINE;
}

function artifactIdForStep(stepId: string): string {
  return stepId.replace(/^step_/, "artifact_");
}

export function renderArtifactsYaml(): string {
  const lines: string[] = [];
  lines.push("artifacts:");

  for (const state of STATE_DEFS) {
    for (const step of STEPS_BY_STATE[state.id]) {
      if (step.artifactPath === null) continue;
      const artifactId = artifactIdForStep(step.stepId);
      lines.push(`  ${artifactId}:`);
      lines.push(`    path: ${step.artifactPath}`);
      lines.push(`    requiredForSteps:`);
      lines.push(`      - ${step.stepId}`);
    }
  }
  return lines.join(NEWLINE) + NEWLINE;
}

// Used by a future detect_sop_version extension to decide whether a persisted
// .ocoding/sop.yaml is the canonical 0.2.0 rendering or a legacy/skeleton
// drift. We don't parse the YAML; we look for stable canonical signals —
// every state id and step id that the 0.2.0 profile claims to know about.
export function canonicalSopSnapshotSignals(): readonly string[] {
  const signals: string[] = [];
  for (const state of STATE_DEFS) {
    signals.push(state.id);
    for (const step of STEPS_BY_STATE[state.id]) {
      signals.push(step.stepId);
    }
  }
  return signals;
}
