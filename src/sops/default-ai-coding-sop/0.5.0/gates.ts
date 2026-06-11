import { renderGatesYaml } from "./render.js";

// SOP 0.5.0 bundled gates.yaml — derived from canonical 0.5.0 data.ts.
// Delta vs 0.4.0: step_build_plan additionally requires section_task_specs
// (AM-007 / DEC-032); all other per-step section gates are identical.
export const gatesYaml = renderGatesYaml();
