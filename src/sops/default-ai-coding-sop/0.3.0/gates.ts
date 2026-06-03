import { renderGatesYaml } from "./render.js";

// SOP 0.3.0 bundled gates.yaml — derived from canonical 0.3.0 data.ts. Adds a
// gate entry for step_logic_backbone (20 wired steps total).
export const gatesYaml = renderGatesYaml();
