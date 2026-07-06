import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAcceptanceSpecs } from "../../src/core/acceptance/acceptance-spec-store.js";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { loadSopProfile } from "../../src/core/sop/loader.js";
import { acceptanceCriteriaTemplate } from "../../src/core/templates/acceptance-criteria.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.9.0 (AM-017 / DEC-043) — from-scratch walkthrough on the DEFAULT
// profile (no explicit sopVersion → proves the 0.9.0 cutover / activation).
// Every prior e2e pins ≤0.8.0; this one dogfoods the Outcome Backbone being
// live by default: the 22-step machine wires SHIP/REFLECT, and the SPEC gate
// now requires a machine-parseable outcome AC (AC-7).

const ARTIFACT = "docs/03-acceptance-criteria.md";

async function readStateJson(cwd: string): Promise<Record<string, unknown>> {
  return JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
}

function withSpecs(...lines: string[]): string {
  return acceptanceCriteriaTemplate.replace(
    "## Acceptance Specs｜验收规格\n",
    ["## Acceptance Specs｜验收规格", "", ...lines, ""].join("\n"),
  );
}

describe("outcome backbone — from-scratch default (0.9.0) walkthrough", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-outcome-walkthrough-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("fresh init defaults to 0.9.0 with SHIP/REFLECT wired (22 steps)", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    const state = await readStateJson(project.cwd);
    expect((state["project"] as Record<string, unknown>)["sopProfileVersion"]).toBe("0.9.0");

    const profile = loadSopProfile();
    expect(profile.stepsForState("state_ship")).toEqual(["step_release"]);
    expect(profile.stepsForState("state_reflect")).toEqual(["step_evolution_report"]);
    let total = 0;
    for (const s of profile.stateOrder) total += profile.stepsForState(s).length;
    expect(total).toBe(22);
  });

  it("SPEC gate blocks a build-only AC set (AC-7) and passes once an outcome AC is authored", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    await seedState(project.cwd, {
      currentStateId: "state_spec",
      currentStepId: "step_acceptance_criteria",
    });

    // 1) Build-only ACs: the acceptance gate freezes, but the outcome-spec gate
    //    blocks — a 0.9.0 project must declare at least one measurable outcome.
    await fs.writeFile(
      join(project.cwd, ARTIFACT),
      withSpecs("### AC-INIT-001", "- desc: minimal init lands .ocoding", "- priority: P0"),
      "utf8",
    );
    const blocked = await runGate({ cwd: project.cwd, command: "gate" });
    expect(blocked.ok).toBe(false);

    // 2) Add a machine-parseable outcome AC → the SPEC outcome gate is satisfied
    //    (a sparse project may still be held by readiness, never by the outcome
    //    or acceptance ERR_ARTIFACT_INVALID/gate).
    await fs.writeFile(
      join(project.cwd, ARTIFACT),
      withSpecs(
        "### AC-INIT-001",
        "- desc: minimal init lands .ocoding",
        "",
        "### AC-ADOPT-001",
        "- desc: onboarding completions are measured",
        "- kind: outcome",
        "- measure.command: node scripts/probe.js",
        "- measure.threshold: >= 1",
        "- measure.source: out/*.json",
        "- measure.due: state_ship",
        "- measure.timeout: 60",
      ),
      "utf8",
    );
    const result = await runGate({ cwd: project.cwd, command: "gate" });
    if (!result.ok) expect(result.code).not.toBe("ERR_ARTIFACT_INVALID");

    // 3) The v2 projection is frozen and carries the outcome spec + its contract.
    const projection = await readAcceptanceSpecs(project.cwd);
    expect(projection?.version).toBe(2);
    const outcomeSpec = projection?.items.find((s) => s.id === "AC-ADOPT-001");
    expect(outcomeSpec?.kind).toBe("outcome");
  });
});
