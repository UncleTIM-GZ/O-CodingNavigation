import { renderSopYaml } from "./render.js";

// SOP 0.9.0 bundled sop.yaml — derived from the canonical 0.9.0 data.ts via the
// renderer. Unlike 0.8.0 (which inherited 0.7.0's steps verbatim), 0.9.0 adds
// step_release under state_ship and step_evolution_report under state_reflect,
// so the SHIP/REFLECT states now render their steps instead of `steps: []`.
export const sopYaml = renderSopYaml();
