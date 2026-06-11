import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseReadinessBlock } from "../../src/core/artifact/readiness-block-parser.js";
import { evaluateReadiness } from "../../src/core/readiness/evaluator.js";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { getTemplate } from "../../src/core/templates/index.js";
import { readinessYaml } from "../../src/sops/default-ai-coding-sop/0.4.0/readiness.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// P2 — every carrier template ships an inert, schema-valid ocn-readiness
// stub; filling a stub flips the corresponding check from UNKNOWN to a real
// verdict against the SHIPPED rulebook (not a toy one).

const CARRIERS = [
  { type: "project-brief", slug: "artifact_brief" },
  { type: "scope", slug: "artifact_scope" },
  { type: "prd", slug: "artifact_prd" },
  { type: "mvp-plan", slug: "artifact_mvp_plan" },
  { type: "test-strategy", slug: "artifact_test_strategy" },
] as const;

describe("readiness template stubs (P2)", () => {
  for (const carrier of CARRIERS) {
    it(`${carrier.type} template carries a valid empty stub for ${carrier.slug}`, () => {
      const parsed = parseReadinessBlock(getTemplate(carrier.type).template);
      expect(parsed.found).toBe(true);
      expect(parsed.errors).toEqual([]);
      expect(parsed.block?.artifact).toBe(carrier.slug);
      expect(parsed.block?.fields).toEqual({});
    });
  }
});

describe("filling a stub flips UNKNOWN → verdict (shipped rulebook)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("prd block values drive rdy_ba and rdy_ciso", async () => {
    const rulebook = parseReadinessRulebook(readinessYaml).rulebook;
    expect(rulebook).not.toBeNull();
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });

    const empty = getTemplate("prd").template;
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), empty, "utf8");
    const before = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook!,
      projectTier: "minimal",
      commands: {},
    });
    expect(before.checks.find((c) => c.id === "rdy_ba")?.verdict).toBe("UNKNOWN");
    expect(before.checks.find((c) => c.id === "rdy_ciso")?.verdict).toBe("UNKNOWN");

    const filled = empty.replace(
      "fields: {}",
      "fields:\n  requirements: 5\n  security_constraints: 0",
    );
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), filled, "utf8");
    const after = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook!,
      projectTier: "minimal",
      commands: {},
    });
    expect(after.checks.find((c) => c.id === "rdy_ba")?.verdict).toBe("PASS"); // 5 >= 1
    expect(after.checks.find((c) => c.id === "rdy_ciso")?.verdict).toBe("FAIL"); // 0 < 1
  });
});
