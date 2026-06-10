import { renderArtifactsYaml } from "./render.js";

// SOP 0.4.0 bundled artifacts.yaml — derived from canonical 0.4.0 data.ts
// (identical to 0.3.0: readiness adds no authored artifact).
export const artifactsYaml = renderArtifactsYaml();
