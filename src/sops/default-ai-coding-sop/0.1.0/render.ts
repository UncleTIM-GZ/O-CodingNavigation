import {
  PROFILE_ID,
  PROFILE_VERSION,
  REQUIRED_SECTIONS_BY_STEP,
  SCHEMA_VERSION,
  STATE_DEFS,
  STEPS_BY_STATE,
} from "./data.js";

// P1-003 — render the canonical SOP profile data into the YAML strings that
// `ocn init` writes under .ocoding/. Hand-rolled emission (rather than
// js-yaml stringify) keeps line ordering stable and the output diffable
// against fixtures and hash-based drift checks. Every field in the rendered
// output is derived from `data.ts` so the persisted snapshot can never drift
// from the runtime profile.

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
  // pipeline order shown by `ocn status`/`ocn brief`.
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

// P1-003 — used by detect_sop_version to decide whether a persisted
// .ocoding/sop.yaml is the canonical rendering or a legacy/skeleton drift.
// We don't parse the YAML (the loader doesn't either today); we look for
// stable canonical signals — every step id that the runtime profile claims
// to know about. A file missing any of these is a legacy/skeleton snapshot.
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
