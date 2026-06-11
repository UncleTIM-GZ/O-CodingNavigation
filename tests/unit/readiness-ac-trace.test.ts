import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectTestNodes,
  nodeMatchesScenario,
  traceScenarios,
} from "../../src/core/readiness/test-collector.js";
import { evaluateReadiness } from "../../src/core/readiness/evaluator.js";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { getTemplate } from "../../src/core/templates/index.js";
import { readinessYaml } from "../../src/sops/default-ai-coding-sop/0.4.0/readiness.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// P3 spike — AC→test trace (R2: engine-collected node names; comments never
// count). Output format validated against a real `pytest --collect-only -q`
// run (lines of `tests/file.py::test_name` + a "N tests collected" footer).

describe("test collector", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("unconfigured → unconfigured (open world)", async () => {
    const c = await collectTestNodes(project.cwd, undefined);
    expect(c.status).toBe("unconfigured");
  });

  it("parses pytest-style output, dropping the collected-count footer", async () => {
    const fake =
      "printf 'tests/a.py::test_ac_f01_extract\\ntests/a.py::test_ac_f02_flow\\n\\n2 tests collected in 0.01s\\n'";
    const c = await collectTestNodes(project.cwd, fake);
    expect(c.status).toBe("ok");
    expect(c.nodes).toEqual(["tests/a.py::test_ac_f01_extract", "tests/a.py::test_ac_f02_flow"]);
  });

  it("a failing lister with no output → failed", async () => {
    const c = await collectTestNodes(project.cwd, "exit 2");
    expect(c.status).toBe("failed");
  });
});

describe("scenario matching (token-sequence, prefix-collision safe)", () => {
  it("matches IDs across naming conventions", () => {
    expect(nodeMatchesScenario("tests/a.py::test_ac_f01_extract", "AC-F01")).toBe(true);
    expect(nodeMatchesScenario("tests/a.py::test_AC_F01", "AC-F01")).toBe(true);
    expect(nodeMatchesScenario("src/x.test.ts > scenario C plan rejected", "Scenario C")).toBe(
      true,
    );
  });

  it("does NOT match prefix collisions or comments-style absence", () => {
    expect(nodeMatchesScenario("tests/a.py::test_ac_f011_other", "AC-F01")).toBe(false);
    expect(nodeMatchesScenario("tests/a.py::test_unrelated", "AC-F01")).toBe(false);
  });
});

describe("trace verdicts", () => {
  const okCollection = {
    status: "ok",
    nodes: ["tests/a.py::test_ac_f01_x", "tests/a.py::test_ac_f02_y"],
    detail: "",
  } as const;

  it("all traced → pass; missing → fail with the missing IDs listed", () => {
    expect(traceScenarios(["AC-F01", "AC-F02"], okCollection).status).toBe("pass");
    const fail = traceScenarios(["AC-F01", "AC-F03"], okCollection);
    expect(fail.status).toBe("fail");
    expect(fail.note).toContain("AC-F03");
  });

  it("empty declared list must not vacuously pass (gaming resistance)", () => {
    expect(traceScenarios([], okCollection).status).toBe("unknown");
  });
});

describe("evaluator integration — shipped rulebook qa gate flips", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  async function setupProject(scenarioLine: string, listCmd: string): Promise<void> {
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
    await fs.mkdir(join(project.cwd, "tests"), { recursive: true });
    await fs.mkdir(join(project.cwd, ".git"), { recursive: true });
    const acceptance = getTemplate("acceptance-criteria").template.replace(
      "fields: {}",
      `fields:\n  scenarios: ${scenarioLine}`,
    );
    await fs.writeFile(join(project.cwd, "docs", "03-acceptance-criteria.md"), acceptance, "utf8");
    await fs.writeFile(join(project.cwd, "tests", "test_x.py"), "def test_ac_f01(): pass", "utf8");
    void listCmd; // command passed via evaluateReadiness opts below
  }

  it("qa verdict: PASS when every scenario traces; FAIL when one does not", async () => {
    const rulebook = parseReadinessRulebook(readinessYaml).rulebook;
    expect(rulebook).not.toBeNull();
    await setupProject('["AC-F01"]', "");
    const commands = {
      test: "true",
      test_list: "printf 'tests/test_x.py::test_ac_f01\\n'",
    };
    const pass = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook!,
      projectTier: "minimal",
      commands,
    });
    expect(pass.checks.find((c) => c.id === "rdy_qa_engineer")?.verdict).toBe("PASS");

    // Declare a second scenario with no collected test → FAIL, named in detail.
    const acceptance = getTemplate("acceptance-criteria").template.replace(
      "fields: {}",
      'fields:\n  scenarios: ["AC-F01", "AC-F09"]',
    );
    await fs.writeFile(join(project.cwd, "docs", "03-acceptance-criteria.md"), acceptance, "utf8");
    const fail = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook!,
      projectTier: "minimal",
      commands,
    });
    const qa = fail.checks.find((c) => c.id === "rdy_qa_engineer");
    expect(qa?.verdict).toBe("FAIL");
    expect(qa?.detail).toContain("AC-F09");
  });

  it("no test_list configured → qa stays UNKNOWN (never silently passes)", async () => {
    const rulebook = parseReadinessRulebook(readinessYaml).rulebook;
    await setupProject('["AC-F01"]', "");
    const ledger = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook!,
      projectTier: "minimal",
      commands: { test: "true" },
    });
    expect(ledger.checks.find((c) => c.id === "rdy_qa_engineer")?.verdict).toBe("UNKNOWN");
  });
});
