import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAcceptanceProjection,
  writeAcceptanceSpecs,
} from "../../src/core/acceptance/acceptance-spec-store.js";
import { runOutcomeReflectGateStep } from "../../src/core/gate/outcome-reflect-gate-step.js";
import {
  reconcileFrozenContracts,
  setOutcomeWaiver,
  writeOutcomeLedger,
} from "../../src/core/outcome/outcome-ledger-store.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";
import { measureOnce } from "./outcome-measure-helper.js";

// SOP 0.9.0 (AM-016) P4b §D.1 — the REFLECT gate mechanically cross-checks the
// `### Outcome References` block against the frozen ledger's current-round history.

const PROBE = "node probe.js";
const SPECS: readonly AcceptanceSpecV2[] = [
  {
    kind: "outcome",
    id: "AC-CORE-003",
    desc: "onboarding under 30m",
    trace: [],
    measure: {
      command: PROBE,
      threshold: { op: ">=", value: 1 },
      source: "cases/*.json",
      due: "state_ship",
      timeoutSeconds: 60,
    },
  },
];
const P090 = loadSopProfileByVersion("0.9.0");
const P080 = loadSopProfileByVersion("0.8.0");

const report = (body: string): string =>
  ["# Evolution Report", "", "## Outcome References", "", body, ""].join("\n");

async function freeze(cwd: string): Promise<void> {
  await writeAcceptanceSpecs(cwd, buildAcceptanceProjection(SPECS, "h", true));
  const ledger = reconcileFrozenContracts(SPECS, null);
  if (ledger !== null) await writeOutcomeLedger(cwd, ledger);
}

async function measurePass(cwd: string, value: number): Promise<string> {
  return measureOnce(cwd, "AC-CORE-003", {
    verdict: "MEASURED_PASS",
    value,
    command: PROBE,
    evidenceHash: "a".repeat(64),
  });
}

describe("runOutcomeReflectGateStep", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-reflect-");
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("skips off-step or below a 0.9.0 pin", async () => {
    expect(
      (
        await runOutcomeReflectGateStep({
          cwd: project.cwd,
          profile: P090,
          currentStepId: "step_prd",
          content: "",
        })
      ).kind,
    ).toBe("skip");
    expect(
      (
        await runOutcomeReflectGateStep({
          cwd: project.cwd,
          profile: P080,
          currentStepId: "step_evolution_report",
          content: "",
        })
      ).kind,
    ).toBe("skip");
  });

  it("passes with an accurate, complete reference block", async () => {
    await freeze(project.cwd);
    const mid = await measurePass(project.cwd, 42);
    const r = await runOutcomeReflectGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStepId: "step_evolution_report",
      content: report(`- AC-CORE-003: value=42 @ ${mid}`),
    });
    expect(r.kind).toBe("pass");
  });

  it("blocks a value mismatch against the ledger", async () => {
    await freeze(project.cwd);
    const mid = await measurePass(project.cwd, 42);
    const r = await runOutcomeReflectGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStepId: "step_evolution_report",
      content: report(`- AC-CORE-003: value=999 @ ${mid}`),
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("reference_value_mismatch");
  });

  it("blocks a measurementId not in the ledger", async () => {
    await freeze(project.cwd);
    await measurePass(project.cwd, 42);
    const r = await runOutcomeReflectGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStepId: "step_evolution_report",
      content: report("- AC-CORE-003: value=42 @ 01JNOTREAL"),
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("reference_not_in_ledger");
  });

  it("blocks when an unwaived outcome AC is unreferenced (no cherry-picking)", async () => {
    await freeze(project.cwd);
    await measurePass(project.cwd, 42);
    const r = await runOutcomeReflectGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStepId: "step_evolution_report",
      content: report("Nothing referenced."),
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("outcome_ac_unreferenced");
  });

  it("blocks a malformed reference line (fail-closed)", async () => {
    await freeze(project.cwd);
    await measurePass(project.cwd, 42);
    const r = await runOutcomeReflectGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStepId: "step_evolution_report",
      content: report("- AC-CORE-003: 42 (no measurementId)"),
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("malformed_reference");
  });

  it("does not require a waived outcome AC to be referenced", async () => {
    await freeze(project.cwd);
    await setOutcomeWaiver(project.cwd, "AC-CORE-003", {
      dec: "DEC-042",
      reason: "accepted degradation this round",
      at: "2026-07-03T00:00:00.000Z",
    });
    const r = await runOutcomeReflectGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStepId: "step_evolution_report",
      content: report("Waived AC needs no reference."),
    });
    expect(r.kind).toBe("pass");
  });
});
