// SOP 0.7.0 bundled readiness rulebook — byte-identical to 0.5.0/0.4.0
// (AM-004 / DEC-028). DEC-039 is a version-unification bump with no readiness
// content change, so the rulebook is re-exported. (The readiness "precise
// per-gate activation" revision — AM-014 — will, when accepted, land here as
// 0.7.0's own rulebook, diverging from this re-export.)
export { readinessYaml } from "../0.5.0/readiness.js";
