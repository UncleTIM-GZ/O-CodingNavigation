import { describe, expect, it } from "vitest";
import { describeAcceptanceDefect } from "../../src/core/acceptance/acceptance-validator.js";
import type { AcceptanceDefect } from "../../src/core/acceptance/acceptance-spec-parser.js";

// SOP 0.8.0 (AM-015) — every acceptance defect code renders a bilingual message
// with the offending id/field interpolated.

const CASES: readonly AcceptanceDefect[] = [
  { code: "no_specs" },
  { code: "duplicate_id", specId: "AC-PR-001" },
  { code: "invalid_id", specId: "Nope" },
  { code: "missing_field", specId: "AC-002", field: "desc" },
  // SOP 0.9.0 (AM-016) — outcome measurement contract defects.
  { code: "invalid_kind", specId: "AC-005", field: "outome" },
  { code: "missing_measure_field", specId: "AC-003", field: "measure.command" },
  { code: "invalid_threshold", specId: "AC-004", field: "bad" },
  { code: "invalid_due", specId: "AC-004", field: "SHIP" },
  { code: "invalid_timeout", specId: "AC-007", field: "999999" },
];

describe("describeAcceptanceDefect", () => {
  it("renders a non-empty en+zh message for every code", () => {
    for (const defect of CASES) {
      const m = describeAcceptanceDefect(defect);
      expect(m.en.length).toBeGreaterThan(0);
      expect(m.zh.length).toBeGreaterThan(0);
    }
  });

  it("interpolates the offending id and field", () => {
    expect(describeAcceptanceDefect({ code: "duplicate_id", specId: "AC-PR-001" }).en).toContain(
      "AC-PR-001",
    );
    const missing = describeAcceptanceDefect({
      code: "missing_field",
      specId: "AC-002",
      field: "desc",
    });
    expect(missing.zh).toContain("AC-002");
    expect(missing.en).toContain("desc");
  });
});
