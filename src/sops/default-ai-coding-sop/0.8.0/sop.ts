import { renderSopYaml } from "./render.js";

// SOP 0.8.0 bundled sop.yaml — derived from the canonical 0.8.0 data.ts via
// the renderer. States and steps are inherited from 0.7.0 unchanged (the
// acceptance backbone adds a section, not a step); only the header `version`
// reads 0.8.0.
export const sopYaml = renderSopYaml();
