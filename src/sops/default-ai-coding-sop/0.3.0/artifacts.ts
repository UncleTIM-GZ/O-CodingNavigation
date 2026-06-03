import { renderArtifactsYaml } from "./render.js";

// SOP 0.3.0 bundled artifacts.yaml — derived from canonical 0.3.0 data.ts.
// Adds artifact_logic_backbone (docs/19-logic-backbone.md).
export const artifactsYaml = renderArtifactsYaml();
