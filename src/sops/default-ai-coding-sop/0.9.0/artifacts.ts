import { renderArtifactsYaml } from "./render.js";

// SOP 0.9.0 bundled artifacts.yaml — derived from the canonical 0.9.0 data.ts.
// Adds artifact_evolution_report (docs/23-evolution-report.md). step_release
// produces no artifact.
export const artifactsYaml = renderArtifactsYaml();
