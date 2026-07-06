import { renderGatesYaml } from "./render.js";

// SOP 0.9.0 bundled gates.yaml — derived from the canonical 0.9.0 data.ts.
// Adds step_evolution_report → section_outcome_references. step_release has no
// required section (null artifact); its enforcement is the cross-cutting SHIP
// gate, not a per-step section gate.
export const gatesYaml = renderGatesYaml();
