import { renderArtifactsYaml } from "./render.js";

// P1-003 — derived from canonical data.ts. Every step that has an artifact
// path is now represented in artifacts.yaml, matching what the runtime
// loader exposes via `artifactPathForStep`.
export const artifactsYaml = renderArtifactsYaml();
