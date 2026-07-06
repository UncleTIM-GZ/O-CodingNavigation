import type { RequiredSectionDef } from "../../../types/artifact.js";
import type { StateId } from "../../../types/state.js";
import {
  PROFILE_ID as PROFILE_ID_080,
  REQUIRED_SECTIONS_BY_STEP as REQUIRED_SECTIONS_BY_STEP_080,
  SCHEMA_VERSION as SCHEMA_VERSION_080,
  STATE_DEFS as STATE_DEFS_080,
  STATE_ORDER as STATE_ORDER_080,
  STEPS_BY_STATE as STEPS_BY_STATE_080,
  type StepDef as StepDef080,
} from "../0.8.0/data.js";

// SOP 0.9.0 (AM-016 / DEC-042) — 0.8.0 + the Outcome Backbone activation.
//
// This is the first profile whose state machine crosses PAST
// `step_final_build_verdict`: it wires the two previously-empty terminal
// states with one step each —
//   • state_ship    → step_release          (no artifact; a cross-cutting
//                      SHIP gate enforces the outcome ledger — see P4b)
//   • state_reflect  → step_evolution_report (docs/23-evolution-report.md;
//                      a REFLECT gate mechanically cross-checks its
//                      `### Outcome References` against the frozen ledger)
//
// Everything else is inherited from 0.8.0 verbatim. STEPS_BY_STATE is a
// SHALLOW COPY with only state_ship / state_reflect replaced — the frozen
// 0.8.0 object (and the base 0.3.0 object it shares) is never mutated, so
// `stepsForState("state_ship")` on a <0.9.0 pin stays empty (regression-
// pinned in the loader tests). States, state order, and every step 00–19
// keep their 0.8.0 identity; `ocn sop upgrade` cursor compatibility holds
// because no existing step id changes.
//
// 0.8.0 (and earlier) stay frozen and importable (`ocn init --sop-version …`).

export const PROFILE_ID = PROFILE_ID_080;
export const PROFILE_VERSION = "0.9.0";
export const SCHEMA_VERSION = SCHEMA_VERSION_080;

export type StepDef = StepDef080;

export const STATE_DEFS = STATE_DEFS_080;
export const STATE_ORDER = STATE_ORDER_080;

// Shallow copy: replace ONLY the two terminal-state step arrays. Spread keeps
// the 0.8.0 object frozen (no shared-reference mutation — the loader asserts
// 0.8.0's state_ship stays []).
export const STEPS_BY_STATE: Readonly<Record<StateId, readonly StepDef[]>> = {
  ...STEPS_BY_STATE_080,
  state_ship: [{ stepId: "step_release", artifactPath: null }],
  state_reflect: [{ stepId: "step_evolution_report", artifactPath: "docs/23-evolution-report.md" }],
};

// REFLECT artifact carries a machine-checked `### Outcome References` section
// (canonical English + bilingual aliases, levels 2-3 — same shape as every
// other required section). The REFLECT gate (P4b) parses it and cross-checks
// each line against the frozen outcome ledger; the section gate only requires
// its presence. `step_release` has no artifact → no required sections.
const OUTCOME_REFERENCES_SECTION: RequiredSectionDef = {
  id: "section_outcome_references",
  canonical: "Outcome References",
  aliases: ["Outcome References｜结果引用", "结果引用"],
  allowedLevels: [2, 3],
};

export const REQUIRED_SECTIONS_BY_STEP: Readonly<Record<string, readonly RequiredSectionDef[]>> = {
  ...REQUIRED_SECTIONS_BY_STEP_080,
  step_evolution_report: [OUTCOME_REFERENCES_SECTION],
};
