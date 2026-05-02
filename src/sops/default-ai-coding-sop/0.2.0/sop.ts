import { renderSopYaml } from "./render.js";

// DEC-023 — the bundled SOP 0.2.0 YAML is derived from `data.ts` via the
// canonical renderer. Mirrors the 0.1.0 module shape so future runtime
// wiring (PR 3 / PR 4 of the SOP 0.2.0 6-PR sequence) can swap profile
// versions by changing one import path. PR 1 only exposes this string
// for tests and downstream consumers; default `loadSopProfile()`
// continues to return 0.1.0.
export const sopYaml = renderSopYaml();
