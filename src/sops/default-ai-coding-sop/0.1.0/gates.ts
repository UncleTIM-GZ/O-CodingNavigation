import { renderGatesYaml } from "./render.js";

// P1-003 — derived from canonical data.ts. The persisted gates.yaml now
// covers every step the runtime knows about, not just step_prd.
export const gatesYaml = renderGatesYaml();
