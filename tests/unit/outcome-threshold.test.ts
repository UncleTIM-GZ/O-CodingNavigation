import { describe, expect, it } from "vitest";
import { compareThreshold, parseThreshold } from "../../src/core/outcome/threshold.js";

// SOP 0.9.0 (AM-017) — threshold mini-language: one module for parse-time
// validation and runtime comparison.

describe("parseThreshold", () => {
  it("parses each single-comparison operator", () => {
    expect(parseThreshold(">= 1")).toEqual({ ok: true, threshold: { op: ">=", value: 1 } });
    expect(parseThreshold("<= 0.55")).toEqual({ ok: true, threshold: { op: "<=", value: 0.55 } });
    expect(parseThreshold("> 0")).toEqual({ ok: true, threshold: { op: ">", value: 0 } });
    expect(parseThreshold("< -3")).toEqual({ ok: true, threshold: { op: "<", value: -3 } });
    expect(parseThreshold("== 42")).toEqual({ ok: true, threshold: { op: "==", value: 42 } });
    expect(parseThreshold("!= 0")).toEqual({ ok: true, threshold: { op: "!=", value: 0 } });
  });

  it("matches the longest operator first (>= is not parsed as >)", () => {
    const r = parseThreshold(">=1");
    expect(r.ok).toBe(true);
    expect(r.threshold).toEqual({ op: ">=", value: 1 });
  });

  it("rejects a non-finite value (Infinity / 1e400 / NaN)", () => {
    expect(parseThreshold(">= Infinity").ok).toBe(false);
    expect(parseThreshold(">= 1e400").ok).toBe(false);
    expect(parseThreshold(">= NaN").ok).toBe(false);
  });

  it("rejects a missing value and an unknown operator", () => {
    expect(parseThreshold(">=").ok).toBe(false);
    expect(parseThreshold("~ 1").ok).toBe(false);
    expect(parseThreshold("1").ok).toBe(false);
  });
});

describe("compareThreshold", () => {
  it("evaluates each operator", () => {
    expect(compareThreshold(2, { op: ">=", value: 1 })).toBe(true);
    expect(compareThreshold(0, { op: ">=", value: 1 })).toBe(false);
    expect(compareThreshold(1, { op: "<=", value: 1 })).toBe(true);
    expect(compareThreshold(2, { op: ">", value: 1 })).toBe(true);
    expect(compareThreshold(1, { op: "<", value: 1 })).toBe(false);
    expect(compareThreshold(42, { op: "==", value: 42 })).toBe(true);
    expect(compareThreshold(42, { op: "!=", value: 42 })).toBe(false);
  });
});
