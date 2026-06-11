import { renderSopYaml } from "./render.js";

// SOP 0.5.0 bundled sop.yaml — derived from the canonical 0.5.0 data.ts via
// the renderer. States and steps are inherited from 0.4.0 unchanged (the task
// backbone is a build-plan section + cross-cutting check-off loop, not a step).
export const sopYaml = renderSopYaml();
