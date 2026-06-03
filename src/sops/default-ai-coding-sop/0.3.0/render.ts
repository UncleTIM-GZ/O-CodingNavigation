import {
  PROFILE_ID,
  PROFILE_VERSION,
  REQUIRED_SECTIONS_BY_STEP,
  SCHEMA_VERSION,
  STATE_DEFS,
  STEPS_BY_STATE,
} from "./data.js";

// SOP 0.3.0 — renders the canonical 0.3.0 profile data into the YAML snapshot
// strings persisted under .ocoding/. Identical hand-rolled emission to 0.2.0
// (stable line ordering, diffable against fixtures); only the data source
// differs (it now includes step_logic_backbone). Every field derives from
// data.ts so the snapshot can never drift from the runtime profile.

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
  for (const state of STATE_DEFS) {
    for (const step of STEPS_BY_STATE[state.id]) {
      const required = REQUIRED_SECTIONS_BY_STEP[step.stepId] ?? [];
      lines.push(`  ${step.stepId}:`);
      if (required.length === 0) {
        lines.push(`    requiredSections: []`);
      } else {
        lines.push(`    requiredSections:`);
        for (const sectionDef of required) {
          lines.push(`      - ${sectionDef.id}`);
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
