// SOP 0.9.0 (AM-017) P3 — pin-awareness. The Outcome Backbone gates (SPEC
// requirement, zero_tasks relaxation, VERIFY→SHIP guard) are dormant below a
// 0.9.0 pin: a <0.9.0 project must behave byte-identically. P4 adds the 0.9.0
// profile that makes `requiresOutcome` true. Version compare is numeric so a
// string like "0.10.0" would sort correctly if it ever exists.

function parts(v: string): readonly number[] {
  return v.split(".").map((n) => Number.parseInt(n, 10) || 0);
}

/** True iff `version` >= `min` (semver-ish, major.minor.patch). */
export function versionAtLeast(version: string, min: string): boolean {
  const a = parts(version);
  const b = parts(min);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai !== bi) return ai > bi;
  }
  return true; // equal
}

export const OUTCOME_MIN_VERSION = "0.9.0";

/** Does this pinned profile version enforce the Outcome Backbone gates? */
export function requiresOutcome(version: string): boolean {
  return versionAtLeast(version, OUTCOME_MIN_VERSION);
}
