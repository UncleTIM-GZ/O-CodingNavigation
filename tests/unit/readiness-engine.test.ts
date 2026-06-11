import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveArtifactPaths, globToRegExp } from "../../src/core/readiness/artifact-resolver.js";
import { evalPredicate } from "../../src/core/readiness/predicate-eval.js";
import { runPathProbe, runCommandProbe } from "../../src/core/readiness/repo-prober.js";
import {
  readReadinessLedger,
  writeReadinessLedger,
} from "../../src/core/readiness/readiness-store.js";
import { evaluateReadiness } from "../../src/core/readiness/evaluator.js";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("readiness glob/resolver (calibration ①: number-agnostic)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("resolves renumbered docs by name stem, first glob wins", async () => {
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
    await fs.writeFile(join(project.cwd, "docs", "10-mvp-plan.md"), "# MVP", "utf8");
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), "# PRD", "utf8");
    const resolved = await resolveArtifactPaths(project.cwd, {
      artifact_mvp_plan: ["*mvp-plan*", "*mvp*"],
      artifact_prd: ["*prd*"],
      artifact_rollback: ["*rollback*"],
    });
    expect(resolved.get("artifact_mvp_plan")).toBe(join("docs", "10-mvp-plan.md"));
    expect(resolved.get("artifact_prd")).toBe(join("docs", "02-prd.md"));
    expect(resolved.get("artifact_rollback")).toBeNull();
  });

  it("glob is case-insensitive and * matches any run", () => {
    expect(globToRegExp("*PRD*").test("02-prd.md")).toBe(true);
    expect(globToRegExp("*.lock").test("requirements.lock")).toBe(true);
    expect(globToRegExp("*.lock").test("lockfile.txt")).toBe(false);
  });
});

describe("readiness repo probes (R4: non-empty + engine-run commands)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("rejects empty shell files (touch deps.lock)", async () => {
    await fs.writeFile(join(project.cwd, "deps.lock"), "", "utf8");
    const empty = await runPathProbe(project.cwd, ["*.lock"]);
    expect(empty.status).toBe("fail");
    await fs.writeFile(join(project.cwd, "deps.lock"), "real content\n", "utf8");
    const real = await runPathProbe(project.cwd, ["*.lock"]);
    expect(real.status).toBe("pass");
  });

  it("matches nested literal-dir patterns", async () => {
    await fs.mkdir(join(project.cwd, ".github", "workflows"), { recursive: true });
    await fs.writeFile(join(project.cwd, ".github", "workflows", "ci.yml"), "name: ci\n", "utf8");
    const probe = await runPathProbe(project.cwd, [".github/workflows/*.yml"]);
    expect(probe.status).toBe("pass");
  });

  it("command probe: unconfigured → unknown (open world), exit 0 → pass, non-zero → fail", async () => {
    const unknown = await runCommandProbe(project.cwd, "test_command_passes", {}, 0);
    expect(unknown.status).toBe("unknown");
    const pass = await runCommandProbe(project.cwd, "test_command_passes", { test: "exit 0" }, 0);
    expect(pass.status).toBe("pass");
    const fail = await runCommandProbe(project.cwd, "test_command_passes", { test: "exit 3" }, 0);
    expect(fail.status).toBe("fail");
  });
});

describe("readiness predicates (closed vocabulary)", () => {
  it("numeric_with_unit passes real numbers, fails non-answers (R3 rationale)", () => {
    expect(evalPredicate("numeric_with_unit", "≥80%").status).toBe("pass");
    expect(evalPredicate("numeric_with_unit", "p95<200ms").status).toBe("pass");
    expect(evalPredicate("numeric_with_unit", "TBD").status).toBe("fail");
    expect(evalPredicate("numeric_with_unit", "可控").status).toBe("fail");
    expect(evalPredicate("numeric_with_unit", "eighty percent").status).toBe("fail");
  });

  it("count_gte counts numbers and lists", () => {
    expect(evalPredicate("count_gte:2", 3).status).toBe("pass");
    expect(evalPredicate("count_gte:2", ["a"]).status).toBe("fail");
    expect(evalPredicate("count_gte:1", ["a"]).status).toBe("pass");
  });

  it("undefined values are unknown, never pass (open world)", () => {
    expect(evalPredicate("not_empty", undefined).status).toBe("unknown");
  });

  it("literal-true predicates reject self-report (R2)", () => {
    expect(evalPredicate(true, "yes really").status).toBe("unknown");
  });
});

describe("readiness evaluator + store", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  const RULEBOOK = `
version: 0.0.1
artifact_aliases:
  artifact_prd: ["*prd*"]
repo_probes:
  git_initialized: { type: path, any: [".git/"] }
checks:
  - id: rdy_solo_doc
    role: ba
    layer: architecture
    concern: requirements
    tier_required: [solo, team, platform]
    requires: [artifact_prd.requirements]
    severity: block
    scenario: "Given prd When check Then requirements >= 1"
    check:
      requirements: count_gte:1
    fix_hint: { zh: "补需求", en: "Add requirements" }
  - id: rdy_solo_repo
    role: developer
    layer: delivery
    concern: substrate
    tier_required: [solo, team, platform]
    requires: [repo.git_initialized]
    severity: block
    scenario: "Given repo When check Then git initialized"
    check:
      git_initialized: true
    fix_hint: { zh: "git init", en: "git init" }
  - id: rdy_platform_only
    role: it_finance_analyst
    layer: strategy
    concern: cost
    tier_required: [platform]
    requires: [artifact_prd.monthly_cost]
    severity: warn
    scenario: "Given prd When brief Then cost numeric"
    check:
      monthly_cost: numeric_with_unit
    fix_hint: { zh: "估成本", en: "Estimate cost" }
`;

  function rulebook(): ReturnType<typeof parseReadinessRulebook>["rulebook"] {
    const parsed = parseReadinessRulebook(RULEBOOK);
    expect(parsed.errors).toEqual([]);
    return parsed.rulebook;
  }

  it("tier-filters (minimal→solo), open-world UNKNOWNs, repo probe verdicts", async () => {
    await fs.mkdir(join(project.cwd, ".git"), { recursive: true });
    const ledger = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook()!,
      projectTier: "minimal",
      commands: {},
    });
    expect(ledger.tier).toBe("solo");
    const byId = new Map(ledger.checks.map((c) => [c.id, c]));
    expect(byId.get("rdy_platform_only")?.verdict).toBe("NA");
    expect(byId.get("rdy_solo_repo")?.verdict).toBe("PASS"); // .git/ exists
    expect(byId.get("rdy_solo_doc")?.verdict).toBe("UNKNOWN"); // no prd doc at all
  });

  it("executeCommands:false skips command probes → UNKNOWN (W1, read-only)", async () => {
    await fs.mkdir(join(project.cwd, ".git"), { recursive: true });
    const rb = parseReadinessRulebook(`
version: 0.0.1
artifact_aliases: {}
repo_probes:
  test_command_passes: { type: command, run: "<cmd>", expect_exit: 0 }
checks:
  - id: rdy_cmd
    role: qa_engineer
    layer: delivery
    concern: tests
    tier_required: [solo]
    requires: [repo.test_command_passes]
    severity: block
    scenario: "Given repo When check Then tests pass"
    check:
      test_command_passes: true
    fix_hint: { zh: "跑测试", en: "run tests" }
`).rulebook;
    const exec = await evaluateReadiness({
      root: project.cwd,
      rulebook: rb!,
      projectTier: "minimal",
      commands: { test: "exit 0" },
      executeCommands: true,
    });
    expect(exec.checks.find((c) => c.id === "rdy_cmd")?.verdict).toBe("PASS");
    const readonly = await evaluateReadiness({
      root: project.cwd,
      rulebook: rb!,
      projectTier: "minimal",
      commands: { test: "exit 0" },
      executeCommands: false,
    });
    const c = readonly.checks.find((x) => x.id === "rdy_cmd");
    expect(c?.verdict).toBe("UNKNOWN");
    expect(c?.detail).toContain("read-only");
  });

  it("declared block values flip UNKNOWN→PASS/FAIL; ledger roundtrips", async () => {
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
    await fs.writeFile(
      join(project.cwd, "docs", "02-prd.md"),
      "# PRD\n\n```ocn-readiness\nartifact: artifact_prd\nfields:\n  requirements: 3\n```\n",
      "utf8",
    );
    const ledger = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook()!,
      projectTier: "minimal",
      commands: {},
    });
    const doc = ledger.checks.find((c) => c.id === "rdy_solo_doc");
    expect(doc?.verdict).toBe("PASS");
    const repo = ledger.checks.find((c) => c.id === "rdy_solo_repo");
    expect(repo?.verdict).toBe("FAIL"); // no .git this time

    await writeReadinessLedger(project.cwd, ledger);
    const back = await readReadinessLedger(project.cwd);
    expect(back).toEqual(ledger);
  });
});
