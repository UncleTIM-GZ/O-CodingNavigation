import { describe, expect, it } from "vitest";
import { matchSection, normalizeHeading } from "../../src/core/artifact/required-section-matcher.js";
import type { Heading, RequiredSectionDef } from "../../src/types/artifact.js";

const SCENARIOS: RequiredSectionDef = {
  id: "section_scenarios",
  canonical: "Scenarios",
  aliases: [
    "Scenarios｜使用场景",
    "使用场景",
    "Use Cases",
    "User Scenarios",
    "用户场景",
  ],
  allowedLevels: [2, 3],
};

const heading = (level: number, text: string): Heading => ({ level, text, line: 1 });

describe("normalizeHeading (NFKC fold)", () => {
  // @ac plan §16.4 — verifies NFKC folds U+FF5C "｜" to ASCII "|"
  it("folds full-width vertical line to ASCII pipe", () => {
    expect(normalizeHeading("Scenarios｜使用场景")).toBe("scenarios|使用场景");
  });

  it("lowercases ASCII letters and trims surrounding whitespace", () => {
    expect(normalizeHeading("  SCENARIOS  ")).toBe("scenarios");
  });

  it("collapses internal whitespace runs to a single space", () => {
    expect(normalizeHeading("Use   Cases")).toBe("use cases");
  });
});

describe("matchSection (canonical + aliases)", () => {
  // @ac AC-SECTION-002 — canonical heading
  it("matches the canonical heading", () => {
    expect(matchSection([heading(2, "Scenarios")], SCENARIOS)).toBe(true);
  });

  // @ac AC-SECTION-003 — English alias
  it("matches an English alias (Use Cases)", () => {
    expect(matchSection([heading(2, "Use Cases")], SCENARIOS)).toBe(true);
  });

  it("matches an English alias (User Scenarios)", () => {
    expect(matchSection([heading(3, "User Scenarios")], SCENARIOS)).toBe(true);
  });

  // @ac AC-SECTION-004 — Chinese alias
  it("matches the canonical bilingual heading with full-width pipe", () => {
    expect(matchSection([heading(2, "Scenarios｜使用场景")], SCENARIOS)).toBe(true);
  });

  it("matches the same heading with ASCII pipe (NFKC fold)", () => {
    expect(matchSection([heading(2, "Scenarios|使用场景")], SCENARIOS)).toBe(true);
  });

  it("matches a standalone Chinese heading", () => {
    expect(matchSection([heading(2, "使用场景")], SCENARIOS)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchSection([heading(2, "SCENARIOS")], SCENARIOS)).toBe(true);
    expect(matchSection([heading(3, "scenarios")], SCENARIOS)).toBe(true);
  });

  // @ac AC-SECTION-005 — heading level out of range
  it("rejects heading at disallowed level (level 1)", () => {
    expect(matchSection([heading(1, "Scenarios")], SCENARIOS)).toBe(false);
  });

  it("rejects heading at disallowed level (level 4)", () => {
    expect(matchSection([heading(4, "Scenarios")], SCENARIOS)).toBe(false);
  });

  it("rejects unrelated headings", () => {
    expect(matchSection([heading(2, "Scenario")], SCENARIOS)).toBe(false);
    expect(matchSection([heading(2, "Background")], SCENARIOS)).toBe(false);
  });
});
