import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAcceptanceSpecs } from "../../src/core/acceptance/acceptance-spec-store.js";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.8.0 (AM-015 / DEC-041) — acceptance backbone gate via the gate runner
// on a 0.8.0-pinned project at step_acceptance_criteria. The acceptance gate
// runs AFTER the section gate; on pass it freezes .ocoding/acceptance-specs.json.

const PROFILE_080 = loadSopProfileByVersion("0.8.0");
const ARTIFACT = "docs/03-acceptance-criteria.md";

function makeDoc(specsBody: string): string {
  return [
    "# Acceptance Criteria｜验收标准",
    "",
    "## Acceptance Items｜验收项",
    "## Evidence Method｜证据方法",
    "## Pass Criteria｜通过标准",
    "## Failure Criteria｜失败标准",
    "## Human Review Requirement｜人工评审要求",
    "",
    "## Acceptance Specs｜验收规格",
    "",
    specsBody,
    "",
  ].join("\n");
}

const VALID_SPECS = [
  "### AC-INIT-001",
  "- desc: init lands .ocoding and state.json is state_discovery",
  "- priority: P0",
  "",
  "### AC-GATE-001",
  "- desc: gate aggregates the current state's step gate",
].join("\n");

async function gateOnce(cwd: string): Promise<Awaited<ReturnType<typeof runGate>>> {
  return runGate({ cwd, command: "gate", profile: PROFILE_080 });
}

describe("runGate — step_acceptance_criteria acceptance backbone (SOP 0.8.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-acceptance-gate-");
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.8.0" });
    await seedState(project.cwd, {
      currentStateId: "state_spec",
      currentStepId: "step_acceptance_criteria",
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("valid specs → projection frozen (before any later gate)", async () => {
    await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc(VALID_SPECS), "utf8");
    const result = await gateOnce(project.cwd);
    // A later gate (readiness) may still block a sparse project — but never the
    // acceptance gate, and the projection MUST already be frozen.
    if (!result.ok) expect(result.code).not.toBe("ERR_ARTIFACT_INVALID");
    const projection = await readAcceptanceSpecs(project.cwd);
    expect(projection).not.toBeNull();
    expect(projection?.items.map((s) => s.id)).toEqual(["AC-INIT-001", "AC-GATE-001"]);
    expect(projection?.items[0]?.priority).toBe("P0");
    expect(projection?.specsHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("empty Acceptance Specs block → blocked (ERR_ARTIFACT_INVALID), no projection", async () => {
    await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc("<!-- none yet -->"), "utf8");
    const result = await gateOnce(project.cwd);
    // Section gate passes (heading present); acceptance gate blocks on no_specs.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      const data = result.data as { blockingReasons?: readonly string[] };
      expect(data.blockingReasons).toContain("acceptance_spec_defects");
    }
    expect(await readAcceptanceSpecs(project.cwd)).toBeNull();
  });

  it("duplicate id / missing desc / invalid id each block ERR_ARTIFACT_INVALID", async () => {
    const cases: readonly string[] = [
      ["### AC-PR-01", "- desc: a", "", "### AC-PR-001", "- desc: b"].join("\n"),
      ["### AC-001", "- priority: P0"].join("\n"),
      ["### Not-An-Ac", "- desc: x"].join("\n"),
    ];
    for (const body of cases) {
      await fs.writeFile(join(project.cwd, ARTIFACT), makeDoc(body), "utf8");
      const result = await gateOnce(project.cwd);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("ERR_ARTIFACT_INVALID");
    }
  });

  it("does NOT run the acceptance gate on a 0.7.0 profile (no section requirement)", async () => {
    const p070 = await createTempProject("ocn-acceptance-gate-070-");
    try {
      await initProject({ cwd: p070.cwd, tier: "minimal", sopVersion: "0.7.0" });
      await seedState(p070.cwd, {
        currentStateId: "state_spec",
        currentStepId: "step_acceptance_criteria",
      });
      // 0.7.0 docs/03 without an Acceptance Specs section — section gate passes
      // (acceptance gate never activates), so no ERR_ARTIFACT_INVALID, no projection.
      const doc = makeDoc(VALID_SPECS).replace("## Acceptance Specs｜验收规格", "## Notes");
      await fs.writeFile(join(p070.cwd, ARTIFACT), doc, "utf8");
      const result = await runGate({
        cwd: p070.cwd,
        command: "gate",
        profile: loadSopProfileByVersion("0.7.0"),
      });
      if (!result.ok) expect(result.code).not.toBe("ERR_ARTIFACT_INVALID");
      expect(await readAcceptanceSpecs(p070.cwd)).toBeNull();
    } finally {
      await p070.cleanup();
    }
  });
});
