// SOP 0.5.0 bundled readiness rulebook — byte-identical to 0.4.0 (AM-004 /
// DEC-028); the task backbone (AM-007 / DEC-032) adds no readiness rules.
// Re-exported so the profile registry references a per-version module
// uniformly and a future 0.5.x rulebook revision has an obvious home.
export { readinessYaml } from "../0.4.0/readiness.js";
