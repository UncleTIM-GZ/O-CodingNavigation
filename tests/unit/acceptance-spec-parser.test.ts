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
    const md = SECTION(["### AC-PR-01", "- desc: a", "", "### AC-PR-001", "- desc: b"].join("\n"));
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toContainEqual({ code: "duplicate_id", specId: "AC-PR-001" });
    expect(r.specs).toHaveLength(1); // first kept
  });

  it("flags an invalid id and a missing desc", () => {
    const md = SECTION(
      ["### Not-An-Ac", "- desc: x", "", "### AC-002", "- priority: P1"].join("\n"),
    );
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

  it("classifies a long uppercase heading as invalid_id without catastrophic backtracking (ReDoS guard)", () => {
    // A `### ` heading that starts AC, is a long uppercase run, and has no
    // trailing digit is the ReDoS trigger for the old nested-quantifier regex.
    // With the linear regex this returns promptly; a hang would time the test out.
    const md = SECTION(["### ACCEPTANCECRITERIAVALIDATIONSECTIONNODIGIT", "- desc: x"].join("\n"));
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toContainEqual({
      code: "invalid_id",
      specId: "ACCEPTANCECRITERIAVALIDATIONSECTIONNODIGIT",
    });
  });

  it("warns on unknown keys without failing", () => {
    const md = SECTION(["### AC-004", "- desc: d", "- bogus: v"].join("\n"));
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toEqual([]);
    expect(r.warnings.some((w) => /unknown key "bogus"/.test(w))).toBe(true);
  });

  // SOP 0.9.0 (AM-016) — Outcome Backbone: kind + measurement contract.

  it("defaults a spec with no kind to build and carries no measure", () => {
    const s = parseAcceptanceSpecs(SECTION(["### AC-001", "- desc: d"].join("\n"))).specs[0];
    expect(s?.kind).toBe("build");
    expect(s?.measure).toBeUndefined();
  });

  it("parses a well-formed outcome AC with a full measurement contract", () => {
    const md = SECTION(
      [
        "### AC-CORE-3",
        "- desc: 新用户 30 分钟内完成首份 artifact",
        "- kind: outcome",
        "- measure.command: node scripts/probe-onboarding.js",
        "- measure.threshold: >= 1",
        "- measure.source: case-records/onboarding/*.json",
        "- measure.due: state_ship",
        "- measure.timeout: 90",
      ].join("\n"),
    );
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toEqual([]);
    expect(r.specs[0]?.kind).toBe("outcome");
    expect(r.specs[0]?.measure).toEqual({
      command: "node scripts/probe-onboarding.js",
      threshold: { op: ">=", value: 1 },
      source: "case-records/onboarding/*.json",
      due: "state_ship",
      timeoutSeconds: 90,
    });
  });

  it("defaults measure.due and measure.timeout when omitted", () => {
    const md = SECTION(
      [
        "### AC-002",
        "- desc: d",
        "- kind: outcome",
        "- measure.command: run.sh",
        "- measure.threshold: > 0.5",
        "- measure.source: out/*.json",
      ].join("\n"),
    );
    const m = parseAcceptanceSpecs(md).specs[0]?.measure;
    expect(m?.due).toBe("state_ship");
    expect(m?.timeoutSeconds).toBe(60);
  });

  it("flags missing measurement fields on an outcome AC", () => {
    const md = SECTION(["### AC-003", "- desc: d", "- kind: outcome"].join("\n"));
    const r = parseAcceptanceSpecs(md);
    const fields = r.defects.filter((d) => d.code === "missing_measure_field").map((d) => d.field);
    expect(fields).toEqual(["measure.command", "measure.threshold", "measure.source"]);
    expect(r.specs[0]?.measure).toBeUndefined();
  });

  it("flags an invalid threshold and an invalid due", () => {
    const md = SECTION(
      [
        "### AC-004",
        "- desc: d",
        "- kind: outcome",
        "- measure.command: c",
        "- measure.threshold: ~ 1",
        "- measure.source: s",
        "- measure.due: SHIP",
      ].join("\n"),
    );
    const r = parseAcceptanceSpecs(md);
    expect(r.defects.some((d) => d.code === "invalid_threshold" && d.specId === "AC-004")).toBe(
      true,
    );
    expect(r.defects.some((d) => d.code === "invalid_due" && d.specId === "AC-004")).toBe(true);
  });

  it("flags an unknown kind", () => {
    const md = SECTION(["### AC-005", "- desc: d", "- kind: outome"].join("\n"));
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toContainEqual({ code: "invalid_kind", specId: "AC-005", field: "outome" });
  });

  it("warns when measure fields appear on a build spec (likely a missing kind: outcome)", () => {
    const md = SECTION(
      ["### AC-006", "- desc: d", "- measure.command: c", "- measure.threshold: >= 1"].join("\n"),
    );
    const r = parseAcceptanceSpecs(md);
    expect(r.defects).toEqual([]);
    expect(r.specs[0]?.kind).toBe("build");
    expect(r.warnings.some((w) => /measure\.\* fields ignored/.test(w))).toBe(true);
  });
});
