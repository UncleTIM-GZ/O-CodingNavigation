import { describe, expect, it } from "vitest";
import { parseAcceptanceSpecs } from "../../src/core/acceptance/acceptance-spec-parser.js";

// SOP 0.8.0 (AM-015) — acceptance spec block parser. Mirrors the task-spec
// parser tests: inline markdown, structural defects, fence/comment exclusion.

const SECTION = (body: string): string =>
  ["# Acceptance Criteria", "", "## Acceptance Specs｜验收规格", "", body, ""].join("\n");

describe("parseAcceptanceSpecs", () => {
  it("parses spec blocks and normalises ids", () => {
    const md = SECTION(
      [
        "### AC-INIT-001",
        "- desc: minimal tier 初始化后 .ocoding/ 落盘",
        "- priority: P0",
        "",
        "### AC-PR-01",
        "- desc: 双口径输出",
        "- trace: FR-1, FR-2",
      ].join("\n"),
    );
    const r = parseAcceptanceSpecs(md);
    expect(r.found).toBe(true);
    expect(r.defects).toEqual([]);
    expect(r.specs.map((s) => s.id)).toEqual(["AC-INIT-001", "AC-PR-001"]);
    expect(r.specs[0]?.desc).toBe("minimal tier 初始化后 .ocoding/ 落盘");
    expect(r.specs[0]?.priority).toBe("P0");
    expect(r.specs[1]?.trace).toEqual(["FR-1", "FR-2"]);
  });

  it("captures given/when/then", () => {
    const md = SECTION(
      ["### AC-001", "- desc: d", "- given: g", "- when: w", "- then: t"].join("\n"),
    );
    const s = parseAcceptanceSpecs(md).specs[0];
    expect(s).toMatchObject({ given: "g", when: "w", then: "t" });
  });

  it("flags a missing section as no_specs (found:false)", () => {
    const r = parseAcceptanceSpecs("# Acceptance Criteria\n\n## Acceptance Items\n- foo\n");
    expect(r.found).toBe(false);
    expect(r.defects).toEqual([{ code: "no_specs" }]);
  });

  it("flags an empty Acceptance Specs section as no_specs", () => {
    const r = parseAcceptanceSpecs(SECTION(""));
    expect(r.found).toBe(true);
    expect(r.defects).toEqual([{ code: "no_specs" }]);
  });

  it("flags a duplicate id (after normalisation)", () => {
    const md = SECTION(
      ["### AC-PR-01", "- desc: a", "", "### AC-PR-001", "- desc: b"].join("\n"),
    );
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toContainEqual({ code: "duplicate_id", specId: "AC-PR-001" });
    expect(r.specs).toHaveLength(1); // first kept
  });

  it("flags an invalid id and a missing desc", () => {
    const md = SECTION(["### Not-An-Ac", "- desc: x", "", "### AC-002", "- priority: P1"].join("\n"));
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toContainEqual({ code: "invalid_id", specId: "Not-An-Ac" });
    expect(r.defects).toContainEqual({ code: "missing_field", specId: "AC-002", field: "desc" });
  });

  it("ignores fenced examples and HTML comments", () => {
    const md = SECTION(
      [
        "<!--",
        "### AC-900",
        "- desc: commented example",
        "-->",
        "```",
        "### AC-901",
        "- desc: fenced example",
        "```",
        "### AC-003",
        "- desc: real",
      ].join("\n"),
    );
    const r = parseAcceptanceSpecs(md);
    expect(r.specs.map((s) => s.id)).toEqual(["AC-003"]);
  });

  it("warns on unknown keys without failing", () => {
    const md = SECTION(["### AC-004", "- desc: d", "- bogus: v"].join("\n"));
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toEqual([]);
    expect(r.warnings.some((w) => /unknown key "bogus"/.test(w))).toBe(true);
  });
});
