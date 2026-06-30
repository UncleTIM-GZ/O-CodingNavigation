import { renderArtifactsYaml } from "./render.js";

// SOP 0.7.0 bundled artifacts.yaml — derived from the canonical 0.7.0 data.ts
// (identical to 0.5.0: no authored artifact change in DEC-039).
export const artifactsYaml = renderArtifactsYaml();
