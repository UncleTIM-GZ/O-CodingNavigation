import { renderGatesYaml } from "./render.js";

// SOP 0.7.0 bundled gates.yaml — derived from the canonical 0.7.0 data.ts.
// Per-step section gates are inherited from 0.5.0 unchanged (step_build_plan
// keeps section_task_specs — AM-007/DEC-032); DEC-039 changes only the
// version number.
export const gatesYaml = renderGatesYaml();
