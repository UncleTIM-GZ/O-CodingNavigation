import { readinessYaml as readinessYaml040 } from "../0.4.0/readiness.js";

// SOP 0.7.0 readiness rulebook (AM-014 / DEC-040) — the 0.4.0 rulebook content
// verbatim, plus the top-level `precise_activation: true` flag that turns on
// just-in-time activation: every block check is enforced only from its
// dependency-derived deadline state onward (DEFERRED before that), so the
// first-step readiness cliff is gone while every gate still fires at exactly
// the right state (不提前且不缺失). 0.4.0/0.5.0 stay frozen (no flag → today's
// always-enforced behavior). The flag is a top-level YAML key, prepended to
// the frozen 0.4.0 mapping (key order is irrelevant in YAML).
export const readinessYaml = `precise_activation: true\n${readinessYaml040}`;
