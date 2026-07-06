import type { Threshold, ThresholdOp } from "../../types/outcome.js";

// SOP 0.9.0 (AM-016 / DEC-042) — the threshold mini-language, in ONE module so
// parse-time validation (invalid_threshold defect) and runtime comparison can
// never diverge (two parsers = two truths — architecture review L2). PURE, no IO.

// Operators tried longest-first so ">= 1" parses as (">=", 1), never (">", "= 1").
const OPERATORS: readonly ThresholdOp[] = [">=", "<=", "==", "!=", ">", "<"];

export interface ThresholdParseResult {
  readonly ok: boolean;
  /** Present iff ok. */
  readonly threshold?: Threshold;
  /** Present iff not ok — human-readable reason for the invalid_threshold defect. */
  readonly reason?: string;
}

/** Parse a single-comparison threshold string, e.g. `">= 1"`, `"< 0.55"`. */
export function parseThreshold(raw: string): ThresholdParseResult {
  const trimmed = raw.trim();
  for (const op of OPERATORS) {
    if (!trimmed.startsWith(op)) continue;
    const rest = trimmed.slice(op.length).trim();
    if (rest.length === 0) {
      return { ok: false, reason: `threshold "${trimmed}" has no value after "${op}"` };
    }
    const value = Number(rest);
    if (!Number.isFinite(value)) {
      return { ok: false, reason: `threshold value is not a finite number: "${rest}"` };
    }
    // op ∈ enum and value is finite → the schema can't reject; build directly.
    return { ok: true, threshold: { op, value } };
  }
  return { ok: false, reason: `threshold must start with one of: ${OPERATORS.join(" ")}` };
}

/** Total, exhaustive comparison. Exact float equality is the contract (no epsilon). */
export function compareThreshold(actual: number, threshold: Threshold): boolean {
  const { op, value } = threshold;
  switch (op) {
    case ">=":
      return actual >= value;
    case "<=":
      return actual <= value;
    case ">":
      return actual > value;
    case "<":
      return actual < value;
    case "==":
      return actual === value;
    case "!=":
      return actual !== value;
    default: {
      const _exhaustive: never = op;
      return _exhaustive;
    }
  }
}
