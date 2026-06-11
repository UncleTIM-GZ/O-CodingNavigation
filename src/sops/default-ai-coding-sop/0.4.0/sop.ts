import { renderSopYaml } from "./render.js";

// SOP 0.4.0 bundled sop.yaml — derived from the canonical 0.4.0 data.ts via
// the renderer. States and steps are inherited from 0.3.0 unchanged (the
// readiness gate is cross-cutting, not a step).
export const sopYaml = renderSopYaml();
