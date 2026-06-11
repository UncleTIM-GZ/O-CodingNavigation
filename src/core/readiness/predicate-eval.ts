import { DERIVED_CHECK_FIELDS, type ReadinessPredicate } from "../../types/readiness.js";

// SOP 0.4.0 — closed predicate vocabulary, deterministic evaluation (no LLM).
// Values come from embedded `ocn-readiness` blocks (R1: pointers/parameters,
// never conclusions) or repo probes; an absent value is UNKNOWN, never PASS.

export type PredicateStatus = "pass" | "fail" | "unknown";

export interface PredicateOutcome {
  readonly status: PredicateStatus;
  readonly note: string;
}

/** Honest non-answers that numeric_with_unit exists to reject (R3 rationale:
 *  these are only banned where a real number is obtainable). */
const NON_ANSWERS = /^(tbd|t\.b\.d\.|n\/a|na|待定|可控|后续评估|后续|未定|todo)$/i;

function evalNumericWithUnit(value: string): PredicateOutcome {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { status: "unknown", note: "empty value" };
  if (NON_ANSWERS.test(trimmed)) {
    return { status: "fail", note: `"${trimmed}" is a non-answer, not a number with unit` };
  }
  const hasDigit = /\d/.test(trimmed);
  const hasUnit = /[%a-zA-Z¥$€一-鿿]/.test(trimmed.replace(/\d|[.,\s]/g, ""));
  if (hasDigit && hasUnit) return { status: "pass", note: trimmed };
  return { status: "fail", note: `"${trimmed}" lacks ${hasDigit ? "a unit" : "a number"}` };
}

function evalCountGte(value: unknown, min: number): PredicateOutcome {
  if (typeof value === "number") {
    return value >= min
      ? { status: "pass", note: `${value} >= ${min}` }
      : { status: "fail", note: `${value} < ${min}` };
  }
  if (Array.isArray(value)) {
    return value.length >= min
      ? { status: "pass", note: `${value.length} items >= ${min}` }
      : { status: "fail", note: `${value.length} items < ${min}` };
  }
  return { status: "unknown", note: "value is neither a count nor a list" };
}

function evalEnumIn(value: unknown, spec: string): PredicateOutcome {
  const allowed = spec
    .replace(/^\[|\]$/g, "")
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const v = String(value).trim();
  return allowed.includes(v)
    ? { status: "pass", note: v }
    : { status: "fail", note: `"${v}" not in [${allowed.join(", ")}]` };
}

/**
 * Evaluate one predicate against a declared value. `exists` on artifact
 * fields and the literal-`true` repo facts are resolved by the evaluator
 * (they need filesystem / probe context); everything else is pure.
 */
export function evalPredicate(predicate: ReadinessPredicate, value: unknown): PredicateOutcome {
  if (value === undefined || value === null) {
    return { status: "unknown", note: "no declared value" };
  }
  if (predicate === true) {
    // Engine-derived assertion — never satisfiable by a declared value (R2).
    return { status: "unknown", note: "engine-derived assertion; self-report is void" };
  }
  if (predicate === "not_empty") {
    const ok =
      (typeof value === "string" && value.trim().length > 0) ||
      (Array.isArray(value) && value.length > 0) ||
      typeof value === "number";
    return ok
      ? { status: "pass", note: "non-empty" }
      : { status: "fail", note: "empty value" };
  }
  if (predicate === "numeric_with_unit") {
    return evalNumericWithUnit(String(value));
  }
  if (predicate.startsWith("count_gte:")) {
    return evalCountGte(value, Number(predicate.slice("count_gte:".length)));
  }
  if (predicate.startsWith("enum_in:")) {
    return evalEnumIn(value, predicate.slice("enum_in:".length));
  }
  if (predicate === "exists" || predicate.startsWith("xref:") || predicate === "within_limit") {
    // exists → resolved against the filesystem by the evaluator;
    // xref / within_limit → engine capabilities shipping in P3+.
    return { status: "unknown", note: `predicate "${predicate}" needs engine context` };
  }
  return { status: "unknown", note: `unhandled predicate "${predicate}"` };
}

export function isDerivedField(field: string): boolean {
  return DERIVED_CHECK_FIELDS.has(field);
}
