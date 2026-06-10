import { renderGatesYaml } from "./render.js";

// SOP 0.4.0 bundled gates.yaml — derived from canonical 0.4.0 data.ts.
// Per-step section gates are identical to 0.3.0; the readiness gate is
// cross-cutting and rule-driven (see ./readiness.ts), so it has no per-step
// entry here.
export const gatesYaml = renderGatesYaml();
