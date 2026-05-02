import { renderArtifactsYaml } from "./render.js";

// DEC-023 — derived from canonical 0.2.0 data.ts. Every wired step is
// represented in artifacts.yaml (19 artifact entries, docs/00–18).
export const artifactsYaml = renderArtifactsYaml();
