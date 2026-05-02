import { renderGatesYaml } from "./render.js";

// DEC-023 — derived from canonical 0.2.0 data.ts. The persisted gates.yaml
// covers every wired step (19 in total) — every step gets a gate entry,
// even file-existence-only ones with empty requiredSections.
export const gatesYaml = renderGatesYaml();
