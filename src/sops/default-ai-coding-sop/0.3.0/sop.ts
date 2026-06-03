import { renderSopYaml } from "./render.js";

// SOP 0.3.0 bundled sop.yaml — derived from the canonical 0.3.0 data.ts via the
// renderer. Includes the new step_logic_backbone under state_design.
export const sopYaml = renderSopYaml();
