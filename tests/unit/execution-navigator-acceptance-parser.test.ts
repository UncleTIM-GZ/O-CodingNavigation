import { describe, expect, it } from "vitest";
import {
  emptyAcceptanceParseResult,
  normaliseAcId,
  parseAcceptanceCriteria,
} from "../../src/core/execution-navigator/acceptance-parser.js";

const PATH = "docs/03-acceptance-criteria.md";

describe("normaliseAcId", () => {
  it("zero-pads short numeric tails", () => {
    expect(normaliseAcId("AC-1")).toBe("AC-001");
    expect(normaliseAcId("AC1")).toBe("AC-001");
    expect(normaliseAcId("AC-001")).toBe("AC-001");
    expect(normaliseAcId("AC.001")).toBe("AC-001");
  });

  it("preserves multi-segment domain ids and zero-pads the trailing number", () => {
    expect(normaliseAcId("AC-INIT-1")).toBe("AC-INIT-001");
    expect(normaliseAcId("AC-INIT-001")).toBe("AC-INIT-001");
    expect(normaliseAcId("AC.INIT.1")).toBe("AC-INIT-001");
    expect(normaliseAcId("AC-DOMAIN-100")).toBe("AC-DOMAIN-100");
  });

  it("uppercases lowercase input", () => {
    expect(normaliseAcId("ac-init-1")).toBe("AC-INIT-001");
  });
});

describe("parseAcceptanceCriteria — explicit AC id formats", () => {
  it("parses bullet AC-NNN form", () => {
    const md = "- AC-001 User can run ocn init.\n- AC-002 ocn check fails when section missing.\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.found).toBe(true);
    expect(r.criteriaCount).toBe(2);
    expect(r.criteria[0]?.id).toBe("AC-001");
    expect(r.criteria[0]?.text).toBe("User can run ocn init.");
    expect(r.criteria[0]?.generatedId).toBe(false);
    expect(r.criteria[0]?.sourceLine).toBe(1);
    expect(r.criteria[1]?.id).toBe("AC-002");
    expect(r.criteria[1]?.sourceLine).toBe(2);
  });

  it("parses bullet **AC-NNN** bold form", () => {
    const md = "- **AC-002** Bold prefixed criterion.\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(1);
    expect(r.criteria[0]?.id).toBe("AC-002");
    expect(r.criteria[0]?.text).toBe("Bold prefixed criterion.");
  });

  it("parses heading AC-NNN form like `### AC-003 ...`", () => {
    const md = "### AC-003 Heading-form criterion.\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(1);
    expect(r.criteria[0]?.id).toBe("AC-003");
    expect(r.criteria[0]?.text).toBe("Heading-form criterion.");
  });

  it("parses heading with full-width pipe and en/em dash separators", () => {
    const md =
      "## AC-INIT-001｜minimal tier 初始化\n## AC-005 — em dash separator\n## AC-006 – en dash separator\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(3);
    expect(r.criteria[0]?.id).toBe("AC-INIT-001");
    expect(r.criteria[0]?.text).toBe("minimal tier 初始化");
    expect(r.criteria[1]?.id).toBe("AC-005");
    expect(r.criteria[1]?.text).toBe("em dash separator");
    expect(r.criteria[2]?.id).toBe("AC-006");
    expect(r.criteria[2]?.text).toBe("en dash separator");
  });
});

describe("parseAcceptanceCriteria — checklist items", () => {
  it("parses unchecked and checked checklist criteria with explicit ids", () => {
    const md = "- [ ] AC-001 unchecked criterion\n- [x] AC-002 checked criterion\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(2);
    expect(r.criteria[0]?.id).toBe("AC-001");
    expect(r.criteria[0]?.checked).toBe(false);
    expect(r.criteria[1]?.id).toBe("AC-002");
    expect(r.criteria[1]?.checked).toBe(true);
  });
});

describe("parseAcceptanceCriteria — auto-generated ids under acceptance section", () => {
  it("generates sequential AC-001/002/003 for un-id'd bullets under the heading", () => {
    const md = [
      "## Acceptance Criteria",
      "",
      "- User can run ocn init.",
      "- ocn check blocks missing sections.",
      "- ocn brief returns context.",
      "",
    ].join("\n");
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(3);
    expect(r.criteria.map((c) => c.id)).toEqual(["AC-001", "AC-002", "AC-003"]);
    expect(r.criteria.every((c) => c.generatedId)).toBe(true);
  });

  it("parses numbered list items under acceptance heading", () => {
    const md = [
      "## Acceptance Items",
      "",
      "1. User can run ocn init.",
      "2. ocn check blocks missing sections.",
      "",
    ].join("\n");
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(2);
    expect(r.criteria[0]?.id).toBe("AC-001");
    expect(r.criteria[0]?.generatedId).toBe(true);
  });

  it("recognises Chinese acceptance heading 验收标准", () => {
    const md = ["## 验收标准", "", "- 用户可以执行 ocn init。", ""].join("\n");
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(1);
    expect(r.criteria[0]?.id).toBe("AC-001");
  });

  it("does NOT auto-generate ids outside an acceptance section", () => {
    const md = ["## Background", "", "- This is just an unrelated bullet.", ""].join("\n");
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(0);
  });
});

describe("parseAcceptanceCriteria — normalisation and edge cases", () => {
  it("normalises AC-1 / AC1 to AC-001 (and treats both as the same id → second is a duplicate)", () => {
    const md = "- AC-1 short id\n- AC1 squished id\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    // Both normalise to AC-001, so the second is dropped as a duplicate.
    expect(r.criteriaCount).toBe(1);
    expect(r.criteria[0]?.id).toBe("AC-001");
    expect(r.warnings.some((w) => /duplicate/i.test(w))).toBe(true);
  });

  it("normalises AC-1 to AC-001 and AC-2 to AC-002 when both are distinct", () => {
    const md = "- AC-1 first\n- AC-2 second\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteria.map((c) => c.id)).toEqual(["AC-001", "AC-002"]);
  });

  it("emits a duplicate-id warning and keeps first occurrence", () => {
    const md = "- AC-001 first occurrence\n- AC-001 second occurrence\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(1);
    expect(r.criteria[0]?.text).toBe("first occurrence");
    expect(r.warnings.some((w) => /duplicate/i.test(w))).toBe(true);
  });

  it("emits an empty-text warning when the criterion has no body", () => {
    const md = "- AC-001\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(0);
    expect(r.warnings.some((w) => /empty/.test(w))).toBe(true);
  });

  it("records correct 1-indexed source line numbers", () => {
    const md = ["", "", "- AC-001 line three", "", "- AC-002 line five", ""].join("\n");
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(2);
    expect(r.criteria[0]?.sourceLine).toBe(3);
    expect(r.criteria[1]?.sourceLine).toBe(5);
  });

  it("tolerates liberal whitespace and trailing CRs", () => {
    const md = "  -   AC-001   spaced criterion  \r\n";
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(1);
    expect(r.criteria[0]?.text).toBe("spaced criterion");
  });

  it("ignores nested bullets (only top-level criteria are parsed)", () => {
    const md = [
      "## Acceptance Criteria",
      "",
      "- AC-001 Top-level criterion.",
      "    - Nested detail that should not become a criterion.",
      "",
    ].join("\n");
    const r = parseAcceptanceCriteria(md, { path: PATH });
    expect(r.criteriaCount).toBe(1);
    expect(r.criteria[0]?.id).toBe("AC-001");
  });
});

describe("emptyAcceptanceParseResult", () => {
  it("returns a defensive empty shape", () => {
    const r = emptyAcceptanceParseResult(PATH);
    expect(r.found).toBe(false);
    expect(r.criteriaCount).toBe(0);
    expect(r.criteria).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});
