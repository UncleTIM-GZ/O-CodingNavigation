import { renderGatesYaml } from "./render.js";

// SOP 0.8.0 bundled gates.yaml — derived from the canonical 0.8.0 data.ts.
// Per-step section gates are inherited from 0.7.0 with one addition:
// step_acceptance_criteria gains section_acceptance_specs (AM-015/DEC-041).
export const gatesYaml = renderGatesYaml();
