import { promises as fs } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REQUIRED_SECTIONS_BY_STEP,
  STATE_DEFS,
  STEPS_BY_STATE,
} from "../../src/sops/default-ai-coding-sop/0.2.0/data.js";
import { parseHeadings } from "../../src/core/artifact/markdown-parser.js";
import { matchSection } from "../../src/core/artifact/required-section-matcher.js";
import { DOC_TYPES, type DocType, getTemplate } from "../../src/core/templates/index.js";
import { writeArtifact } from "../../src/core/artifact/template-writer.js";
import { createTempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 2 (DEC-023) — every artifact id 00-18 of the SOP 0.2.0
// profile MUST have a registered template, and every required section that
// the 0.2.0 gates.ts pulls from data.ts MUST be present in the generated
// template (matched via the same matcher the gate runner uses).
//
// PR 3 wires 0.2.0 into the runtime gate. If a required heading is missing
// here, PR 3 will produce empty templates that fail their own gate on first
// use — exactly what these tests guard against.

interface TemplateExpectation {
  readonly stepId: string;
  readonly artifactPath: string;
  readonly docType: DocType;
}

function deriveExpectations(): readonly TemplateExpectation[] {
  const out: TemplateExpectation[] = [];
  for (const state of STATE_DEFS) {
    for (const step of STEPS_BY_STATE[state.id]) {
      if (step.artifactPath === null) continue;
      // Map step id -> doc type by stripping the "step_" prefix and using
      // the same kebab transform the registry uses.
      const docType = step.stepId.replace(/^step_/, "").replace(/_/g, "-") as DocType;
      out.push({ stepId: step.stepId, artifactPath: step.artifactPath, docType });
    }
  }
  return out;
}

const EXPECTATIONS = deriveExpectations();

describe("SOP 0.2.0 template coverage — every artifact id 00-18 has a template", () => {
  it("derives 19 wired artifact expectations from data.ts", () => {
    expect(EXPECTATIONS).toHaveLength(19);
  });

  for (const exp of EXPECTATIONS) {
    it(`registers a template for ${exp.docType} (${exp.stepId} -> ${exp.artifactPath})`, () => {
      expect(DOC_TYPES).toContain(exp.docType);
      const entry = getTemplate(exp.docType);
      // Path now comes from the active SOP profile (artifactPathForStep), not
      // the registry — 0.3.0 renumbered, so the registry path is version-
      // independent metadata and no longer equals the 0.2.0 profile path.
      expect(entry.template.length).toBeGreaterThan(0);
    });
  }
});

describe("SOP 0.2.0 template coverage — every required section heading is present", () => {
  for (const exp of EXPECTATIONS) {
    const required = REQUIRED_SECTIONS_BY_STEP[exp.stepId] ?? [];
    if (required.length === 0) {
      it(`${exp.docType} has no required sections in 0.2.0 (skipped)`, () => {
        expect(required).toHaveLength(0);
      });
      continue;
    }
    it(`${exp.docType} template satisfies all ${required.length} 0.2.0 required sections`, () => {
      const entry = getTemplate(exp.docType);
      const headings = parseHeadings(entry.template);
      const missing: string[] = [];
      for (const section of required) {
        if (!matchSection(headings, section)) {
          missing.push(section.id);
        }
      }
      expect(missing).toEqual([]);
    });
  }
});

describe("SOP 0.2.0 template coverage — focus check on the 9 new strong-gated steps", () => {
  const NEW_DOC_TYPES: readonly DocType[] = [
    "build-plan",
    "implementation-log",
    "change-evidence",
    "integration-notes",
    "verification-report",
    "acceptance-mapping",
    "failure-fix-log",
    "regression-evidence",
    "final-build-verdict",
  ];

  it("registers a template for every new 10-18 artifact id", () => {
    for (const docType of NEW_DOC_TYPES) {
      expect(DOC_TYPES).toContain(docType);
      const entry = getTemplate(docType);
      expect(entry.template.length).toBeGreaterThan(0);
    }
  });

  it("each 10-18 template covers every 0.2.0 required section without mismatch", () => {
    const failures: Array<{ docType: DocType; missing: string[] }> = [];
    for (const docType of NEW_DOC_TYPES) {
      const entry = getTemplate(docType);
      const stepId = `step_${docType.replace(/-/g, "_")}`;
      const required = REQUIRED_SECTIONS_BY_STEP[stepId] ?? [];
      const headings = parseHeadings(entry.template);
      const missing = required.filter((s) => !matchSection(headings, s)).map((s) => s.id);
      if (missing.length > 0) failures.push({ docType, missing });
    }
    expect(failures).toEqual([]);
  });
});

describe("SOP 0.2.0 template coverage — template-writer round-trip", () => {
  it("writes each new 10-18 template to its expected path", async () => {
    const project = await createTempProject();
    try {
      const newTypes: readonly DocType[] = [
        "build-plan",
        "implementation-log",
        "change-evidence",
        "integration-notes",
        "verification-report",
        "acceptance-mapping",
        "failure-fix-log",
        "regression-evidence",
        "final-build-verdict",
      ];
      for (const docType of newTypes) {
        const entry = getTemplate(docType);
        const target = join(project.cwd, entry.relativePath);
        await writeArtifact(target, entry.template);
        const written = await fs.readFile(target, "utf8");
        expect(written).toBe(entry.template);
      }
    } finally {
      await project.cleanup();
    }
  });
});
