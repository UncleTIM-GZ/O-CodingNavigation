import { describe, expect, it } from "vitest";
import { parseHeadings } from "../../src/core/artifact/markdown-parser.js";

describe("markdown heading parser", () => {
  // @ac AC-SECTION-001 — Markdown AST (heading extraction)
  it("extracts ATX headings at all levels", () => {
    const md = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n`;
    const headings = parseHeadings(md);
    expect(headings.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(headings.map((h) => h.text)).toEqual(["H1", "H2", "H3", "H4", "H5", "H6"]);
  });

  it("trims surrounding whitespace from heading text", () => {
    const md = `##   Spaced Heading   \n`;
    const headings = parseHeadings(md);
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text).toBe("Spaced Heading");
  });

  it("ignores text inside fenced code blocks", () => {
    const md = "## Real\n\n```\n## Inside Fence\n```\n\n## Real Two\n";
    const headings = parseHeadings(md);
    expect(headings.map((h) => h.text)).toEqual(["Real", "Real Two"]);
  });

  it("captures heading line numbers (1-indexed)", () => {
    const md = `intro\n\n## Second Line Group\n`;
    const headings = parseHeadings(md);
    expect(headings[0]?.line).toBe(3);
  });

  it("ignores indented or non-ATX lines", () => {
    const md = `text # not a heading\n  ## indented (still ATX) ${" "}\n`;
    const headings = parseHeadings(md);
    // Indented "  ##" does not start at column 0 — current parser rejects it.
    expect(headings).toHaveLength(0);
  });

  it("returns empty array for non-markdown input", () => {
    expect(parseHeadings("")).toEqual([]);
    expect(parseHeadings("just plain text\nwith multiple lines\n")).toEqual([]);
  });

  it("handles full-width pipe in heading text without modifying it", () => {
    const md = `## Scenarios｜使用场景\n`;
    const headings = parseHeadings(md);
    expect(headings[0]?.text).toBe("Scenarios｜使用场景");
  });
});
