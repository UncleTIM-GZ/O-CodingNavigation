import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { evaluateAcceptanceSpecs } from "../../src/core/acceptance/acceptance-gate.js";
import { resolveAcceptanceSpecs } from "../../src/core/acceptance/acceptance-source.js";
import {
  buildAcceptanceProjection,
  writeAcceptanceSpecs,
} from "../../src/core/acceptance/acceptance-spec-store.js";
import { loadAcceptanceFromProject } from "../../src/core/execution-navigator/acceptance-loader.js";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { readTaskLedger } from "../../src/core/task/task-ledger-store.js";
import type { AcceptanceSpec } from "../../src/types/acceptance-spec.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.8.0 (AM-015) — the projection is the canonical AC source; the legacy
// markdown parse is a back-compat fallback (pre-0.8.0 pins / gate-not-passed).

const SPECS: readonly AcceptanceSpec[] = [
  {
    id: "AC-INIT-001",
    desc: "init lands .ocoding",
    given: "empty dir",
    when: "ocn init",
    trace: [],
  },
  { id: "AC-GATE-001", desc: "gate aggregates step gates", trace: [] },
];

describe("acceptance source: projection-first with markdown fallback", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-acceptance-source-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("loadAcceptanceFromProject reads the projection when present (id + folded text)", async () => {
    await writeAcceptanceSpecs(project.cwd, buildAcceptanceProjection(SPECS, "hash"));
    const { result } = await loadAcceptanceFromProject(project.cwd);
    expect(result.found).toBe(true);
    expect(result.criteria.map((c) => c.id)).toEqual(["AC-INIT-001", "AC-GATE-001"]);
    // Given/When are folded into the criterion text so the evidence heuristics see them.
    expect(result.criteria[0]?.text).toContain("init lands .ocoding");
    expect(result.criteria[0]?.text).toContain("ocn init");
    expect(result.criteria[0]?.originalId).toBe("AC-INIT-001");
    expect(result.criteria.every((c) => c.generatedId === false)).toBe(true);
  });

  it("falls back to markdown parse when no projection exists", async () => {
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
    await fs.writeFile(
      join(project.cwd, "docs", "03-acceptance-criteria.md"),
      "# AC\n\nAC-INIT-001｜from markdown\n",
      "utf8",
    );
    const { result } = await loadAcceptanceFromProject(project.cwd);
    expect(result.found).toBe(true);
    expect(result.criteria.map((c) => c.id)).toEqual(["AC-INIT-001"]);
    expect(result.criteria[0]?.text).toBe("from markdown");
  });

  it("build-plan traces resolve against the projection ids alone (docs/03 markdown irrelevant)", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.8.0" });
    await writeAcceptanceSpecs(project.cwd, buildAcceptanceProjection(SPECS, "hash"));
    await seedState(project.cwd, {
      currentStateId: "state_plan",
      currentStepId: "step_build_plan",
    });
    const buildPlan = [
      "# Build Plan｜构建计划",
      "## Target Scope｜目标范围",
      "## Files Expected to Change｜预期变更文件",
      "## Implementation Tasks｜实施任务",
      "## Non-goals｜非目标",
      "## Risk Points｜风险点",
      "## Verification Commands｜验证命令",
      "## Task Specs｜任务规格",
      "",
      "### task_alpha",
      "- goal: g",
      "- traces: AC-INIT-001", // defined only in the projection
      "- verify: true",
      "- dod: d",
    ].join("\n");
    await fs.writeFile(join(project.cwd, "docs", "11-build-plan.md"), buildPlan, "utf8");

    const result = await runGate({
      cwd: project.cwd,
      command: "gate",
      profile: loadSopProfileByVersion("0.8.0"),
    });
    // The task gate must NOT report a dangling trace — the id came from the
    // projection. A sparse project may still be blocked later by readiness.
    if (!result.ok) expect(result.code).not.toBe("ERR_ARTIFACT_INVALID");
    const ledger = await readTaskLedger(project.cwd);
    expect(ledger?.tasks.map((t) => t.id)).toEqual(["task_alpha"]);
  });
});

// AM-015 review — staleness guard: the projection is used only while docs/03's
// Acceptance Specs section is byte-unchanged since the gate; a post-gate edit
// wins so a deleted AC is not falsely-green and an added AC is not falsely-blocked.
describe("acceptance source: staleness guard", () => {
  let project: TempProject;
  const D03 = "docs/03-acceptance-criteria.md";

  const specsDoc = (blocks: readonly string[]): string =>
    ["# Acceptance Criteria", "", "## Acceptance Specs｜验收规格", "", ...blocks, ""].join("\n");

  async function freezeFrom(content: string): Promise<void> {
    const outcome = evaluateAcceptanceSpecs(content);
    if (outcome.projection === undefined) throw new Error("expected a projection");
    await writeAcceptanceSpecs(project.cwd, outcome.projection);
  }

  beforeEach(async () => {
    project = await createTempProject("ocn-acceptance-stale-");
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("unchanged docs/03 → uses the frozen projection", async () => {
    const doc = specsDoc(["### AC-001", "- desc: a", "", "### AC-002", "- desc: b"]);
    await fs.writeFile(join(project.cwd, D03), doc, "utf8");
    await freezeFrom(doc);
    const specs = await resolveAcceptanceSpecs(project.cwd, D03);
    expect(specs?.map((s) => s.id)).toEqual(["AC-001", "AC-002"]);
  });

  it("post-gate ADD → the added AC is honored (no false dangling block)", async () => {
    const before = specsDoc(["### AC-001", "- desc: a"]);
    await fs.writeFile(join(project.cwd, D03), before, "utf8");
    await freezeFrom(before); // projection has only AC-001
    const after = specsDoc(["### AC-001", "- desc: a", "", "### AC-002", "- desc: b"]);
    await fs.writeFile(join(project.cwd, D03), after, "utf8");
    const specs = await resolveAcceptanceSpecs(project.cwd, D03);
    expect(specs?.map((s) => s.id)).toEqual(["AC-001", "AC-002"]);
  });

  it("post-gate DELETE → the removed AC vanishes (no false-green trace)", async () => {
    const before = specsDoc(["### AC-001", "- desc: a", "", "### AC-002", "- desc: b"]);
    await fs.writeFile(join(project.cwd, D03), before, "utf8");
    await freezeFrom(before); // projection has AC-001 + AC-002
    const after = specsDoc(["### AC-001", "- desc: a"]);
    await fs.writeFile(join(project.cwd, D03), after, "utf8");
    const specs = await resolveAcceptanceSpecs(project.cwd, D03);
    expect(specs?.map((s) => s.id)).toEqual(["AC-001"]);
  });

  it("no projection yet → live structured parse (loader is not garbled by field bullets, #6)", async () => {
    const doc = specsDoc(["### AC-001", "- desc: the real criterion", "- given: g"]);
    await fs.writeFile(join(project.cwd, D03), doc, "utf8");
    const { result } = await loadAcceptanceFromProject(project.cwd);
    // Exactly one criterion (the AC block); the `- desc:`/`- given:` field
    // bullets must NOT register as extra generated criteria.
    expect(result.criteria.map((c) => c.id)).toEqual(["AC-001"]);
    expect(result.criteria[0]?.text).toContain("the real criterion");
  });
});
