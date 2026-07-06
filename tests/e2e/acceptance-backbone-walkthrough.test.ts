import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAcceptanceSpecs } from "../../src/core/acceptance/acceptance-spec-store.js";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { acceptanceCriteriaTemplate } from "../../src/core/templates/acceptance-criteria.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.8.0 (AM-015 / DEC-041) — from-scratch walkthrough on the DEFAULT
// profile (no explicit sopVersion → proves the 0.8.0 cutover). The generated
// acceptance-criteria template carries only a commented Acceptance Specs block,
// so the gate blocks until real AC blocks are authored — then it freezes the
// projection. Closes the dogfood blind spot that all prior e2e pin 0.3.0.

const ARTIFACT = "docs/03-acceptance-criteria.md";

async function readStateJson(cwd: string): Promise<Record<string, unknown>> {
  return JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
}

describe("acceptance backbone — from-scratch pinned-0.8.0 walkthrough", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-acceptance-walkthrough-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("fresh init pins 0.8.0; template blocks (no_specs); authored specs pass and freeze the projection", async () => {
    // 1) Fresh init pinned to 0.8.0 (the default is now 0.9.0; this suite
    //    exercises the 0.8.0 acceptance cutover specifically).
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.8.0" });
    const state = await readStateJson(project.cwd);
    expect((state["project"] as Record<string, unknown>)["sopProfileVersion"]).toBe("0.8.0");

    await seedState(project.cwd, {
      currentStateId: "state_spec",
      currentStepId: "step_acceptance_criteria",
    });

    // 2) The generated template (all required sections + a COMMENTED Acceptance
    //    Specs block) passes the section gate but blocks the acceptance gate.
    await fs.writeFile(join(project.cwd, ARTIFACT), acceptanceCriteriaTemplate, "utf8");
    const blockedResult = await runGate({ cwd: project.cwd, command: "gate" });
    expect(blockedResult.ok).toBe(false);
    if (!blockedResult.ok) {
      expect(blockedResult.code).toBe("ERR_ARTIFACT_INVALID");
      const data = blockedResult.data as { blockingReasons?: readonly string[] };
      expect(data.blockingReasons).toContain("acceptance_spec_defects");
    }
    expect(await readAcceptanceSpecs(project.cwd)).toBeNull();

    // 3) Author real AC blocks under the Acceptance Specs heading → gate passes
    //    the acceptance stage and freezes the projection.
    const authored = acceptanceCriteriaTemplate.replace(
      "## Acceptance Specs｜验收规格\n",
      [
        "## Acceptance Specs｜验收规格",
        "",
        "### AC-INIT-001",
        "- desc: minimal init lands .ocoding and state.json is state_discovery",
        "- priority: P0",
        "",
        "### AC-GATE-001",
        "- desc: gate aggregates the current state's step gate",
        "",
      ].join("\n"),
    );
    await fs.writeFile(join(project.cwd, ARTIFACT), authored, "utf8");
    const result = await runGate({ cwd: project.cwd, command: "gate" });
    // The acceptance gate no longer blocks; a sparse project may still be held
    // by the later readiness gate, but never by ERR_ARTIFACT_INVALID.
    if (!result.ok) expect(result.code).not.toBe("ERR_ARTIFACT_INVALID");
    const projection = await readAcceptanceSpecs(project.cwd);
    expect(projection?.items.map((s) => s.id)).toEqual(["AC-INIT-001", "AC-GATE-001"]);
  });
});
