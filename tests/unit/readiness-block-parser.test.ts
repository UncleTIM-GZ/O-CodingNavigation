import { describe, expect, it } from "vitest";
import { parseReadinessBlock } from "../../src/core/artifact/readiness-block-parser.js";

const VALID = `# Doc

\`\`\`ocn-readiness
artifact: artifact_prd
fields:
  requirements: 3
  value_proposition: "for solo builders"
  stop_conditions: ["GA = pass rate >= 95%"]
\`\`\`
`;

describe("ocn-readiness block parser (R1: pointers, never conclusions)", () => {
  it("parses a valid block", () => {
    const parsed = parseReadinessBlock(VALID);
    expect(parsed.found).toBe(true);
    expect(parsed.errors).toEqual([]);
    expect(parsed.block?.artifact).toBe("artifact_prd");
    expect(parsed.block?.fields["requirements"]).toBe(3);
  });

  it("returns found=false when no block is present", () => {
    const parsed = parseReadinessBlock("# Doc\n\nprose only\n");
    expect(parsed.found).toBe(false);
    expect(parsed.block).toBeNull();
  });

  it("ignores plain yaml fences (no tag fallback — prevents false positives)", () => {
    const parsed = parseReadinessBlock("```yaml\nartifact: artifact_prd\nfields: {}\n```\n");
    expect(parsed.found).toBe(false);
  });

  it("R1: rejects boolean field values (conclusions are schema-illegal)", () => {
    const bad = VALID.replace("requirements: 3", "backup_restore_tested: true");
    const parsed = parseReadinessBlock(bad);
    expect(parsed.found).toBe(true);
    expect(parsed.block).toBeNull();
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown top-level keys (strict schema)", () => {
    const bad = VALID.replace("fields:", "passed: yes\nfields:");
    const parsed = parseReadinessBlock(bad);
    expect(parsed.block).toBeNull();
  });
});
