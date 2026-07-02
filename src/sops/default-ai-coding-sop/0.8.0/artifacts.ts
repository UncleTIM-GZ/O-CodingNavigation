import { renderArtifactsYaml } from "./render.js";

// SOP 0.8.0 bundled artifacts.yaml — derived from the canonical 0.8.0 data.ts
// (identical artifact paths to 0.7.0: the acceptance backbone adds a section
// to docs/03, not a new artifact).
export const artifactsYaml = renderArtifactsYaml();
