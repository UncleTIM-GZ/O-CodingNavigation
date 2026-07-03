import { describe, expect, it } from "vitest";
import { parseOutcomeReferences } from "../../src/core/outcome/outcome-references-parser.js";

// SOP 0.9.0 (AM-016) P4b §D.1 — the Outcome References parser is pure and TOTAL:
// it never throws; a malformed line becomes a `malformed` record so the REFLECT
// gate's coverage rule fails closed.

const SECTION = (body: string): string =>
  ["# Evolution Report", "", "## Outcome References｜结果引用", "", body, ""].join("\n");

describe("parseOutcomeReferences", () => {
  it("parses well-formed reference lines", () => {
    const r = parseOutcomeReferences(
      SECTION(["- AC-CORE-003: value=42 @ 01J8XYZ", "- AC-PERF-001: value=0.95 @ 01J8ABC"].join("\n")),
    );
    expect(r.malformed).toEqual([]);
    expect(r.references).toEqual([
      { acId: "AC-CORE-003", value: 42, measurementId: "01J8XYZ" },
      { acId: "AC-PERF-001", value: 0.95, measurementId: "01J8ABC" },
    ]);
  });

  it("records malformed lines (missing @, non-numeric value) without throwing", () => {
    const r = parseOutcomeReferences(
      SECTION(
        [
          "- AC-A: value=1 @ M1",
          "- AC-B: value=notnum @ M2",
          "- AC-C: 42 @ M3",
          "- garbage line",
        ].join("\n"),
      ),
    );
    expect(r.references).toEqual([{ acId: "AC-A", value: 1, measurementId: "M1" }]);
    expect(r.malformed).toHaveLength(3);
  });

  it("ignores prose and blank lines under the heading", () => {
    const r = parseOutcomeReferences(
      SECTION(["Some narrative about the round.", "", "- AC-A: value=1 @ M1"].join("\n")),
    );
    expect(r.references).toHaveLength(1);
    expect(r.malformed).toEqual([]);
  });

  it("returns empty when the section is absent, and never throws on garbage", () => {
    expect(parseOutcomeReferences("# No references here\n\nrandom **markdown**")).toEqual({
      references: [],
      malformed: [],
    });
    expect(() => parseOutcomeReferences("###\n- : value= @ ")).not.toThrow();
  });

  it("stops at the next heading", () => {
    const md = [
      "## Outcome References",
      "- AC-A: value=1 @ M1",
      "## Next Section",
      "- AC-B: value=2 @ M2",
    ].join("\n");
    const r = parseOutcomeReferences(md);
    expect(r.references).toEqual([{ acId: "AC-A", value: 1, measurementId: "M1" }]);
  });
});
