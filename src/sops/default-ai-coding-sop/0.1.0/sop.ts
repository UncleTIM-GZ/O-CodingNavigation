import { renderSopYaml } from "./render.js";

// P1-003 — the bundled SOP YAML is now derived from `data.ts` via the
// canonical renderer instead of a hand-written skeleton snapshot. Keeping
// this module gives consumers (including loader.ts) a stable named import
// while guaranteeing single-source consistency with the runtime profile.
export const sopYaml = renderSopYaml();
