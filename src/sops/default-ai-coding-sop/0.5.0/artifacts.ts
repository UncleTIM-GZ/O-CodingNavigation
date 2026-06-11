import { renderArtifactsYaml } from "./render.js";

// SOP 0.5.0 bundled artifacts.yaml — derived from canonical 0.5.0 data.ts
// (identical to 0.4.0: the task backbone adds no authored artifact; the task
// ledger is a machine projection under .ocoding/, not a docs/ artifact).
export const artifactsYaml = renderArtifactsYaml();
