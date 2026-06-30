import { renderSopYaml } from "./render.js";

// SOP 0.7.0 bundled sop.yaml — derived from the canonical 0.7.0 data.ts via
// the renderer. States and steps are inherited from 0.5.0 unchanged (DEC-039
// is a version-unification bump, not a content change); only the header
// `version` reads 0.7.0.
export const sopYaml = renderSopYaml();
