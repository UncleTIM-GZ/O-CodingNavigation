import { describe, expect, it } from "vitest";
import { computeArtifactGateStatus } from "../../src/core/artifact/gate-status.js";
import type { Heading, RequiredSectionDef } from "../../src/types/artifact.js";

const required: readonly RequiredSectionDef[] = [
  {
    id: "section_problem",
    canonical: "Problem",
    aliases: ["Problem｜问题", "问题"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_scenarios",
    canonical: "Scenarios",
    aliases: ["Scenarios｜使用场景", "使用场景"],
    allowedLevels: [2, 3],
  },
];

const heading = (level: number, text: string): Heading => ({ level, text, line: 1 });

describe("computeArtifactGateStatus", () => {
  // @ac AC-SAG-004 — pass / blocked tri-state (warning reserved for Phase 2)
  it("returns pass when all required sections are present", () => {
    const result = computeArtifactGateStatus({
      artifactPath: "docs/02-prd.md",
      headings: [heading(2, "Problem"), heading(2, "Scenarios")],
      required,
    });
    expect(result.status).toBe("pass");
    expect(result.missingRequiredSectionIds).toEqual([]);
  });

  // @ac AC-SAG-001 — artifact exists but missing required section is blocked
  it("returns blocked with the missing section id when one is missing", () => {
    const result = computeArtifactGateStatus({
      artifactPath: "docs/02-prd.md",
      headings: [heading(2, "Problem")],
      required,
    });
    expect(result.status).toBe("blocked");
    expect(result.missingRequiredSectionIds).toEqual(["section_scenarios"]);
  });

  it("returns all missing section ids when several are absent", () => {
    const result = computeArtifactGateStatus({
      artifactPath: "docs/02-prd.md",
      headings: [],
      required,
    });
    expect(result.status).toBe("blocked");
    expect(result.missingRequiredSectionIds).toEqual([
      "section_problem",
      "section_scenarios",
    ]);
  });

  it("preserves the artifactPath input verbatim", () => {
    const result = computeArtifactGateStatus({
      artifactPath: "/abs/path/02-prd.md",
      headings: [],
      required: [],
    });
    expect(result.artifactPath).toBe("/abs/path/02-prd.md");
  });
});
