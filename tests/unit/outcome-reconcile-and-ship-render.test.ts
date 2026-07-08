import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateBrief } from "../../src/core/brief.js";
import { reconcileFrozenContracts } from "../../src/core/outcome/outcome-ledger-store.js";
import { getStatus } from "../../src/core/status.js";
import { initProject } from "../../src/core/init.js";
import { verifyHashOf } from "../../src/core/task/task-ledger-store.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import type { OutcomeLedger, OutcomeMeasurement } from "../../src/types/outcome-ledger.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.9.0 (AM-017 / DEC-043) §H — edge coverage the drive plan flagged:
//   • reconcileFrozenContracts with prev≠null (the rework path: rewind → edit
//     docs/03 → re-freeze against a LIVE ledger).
//   • brief / status render at the SHIP / REFLECT cursor without crashing.

const outcomeSpec = (id: string, command: string): AcceptanceSpecV2 => ({
  kind: "outcome",
  id,
  desc: "d",
  trace: [],
  measure: {
    command,
    threshold: { op: ">=", value: 1 },
    source: "out/*.json",
    due: "state_ship",
    timeoutSeconds: 60,
  },
});

const measurement = (): OutcomeMeasurement => ({
  measuredAt: "2026-07-08T00:00:00.000Z",
  seq: 0,
  verdict: "MEASURED_PASS",
  value: 1,
  commandHash: verifyHashOf("node probe.js"),
  probeEntryHash: "",
  evidenceHash: "",
  evidenceFiles: [],
  durationMs: 0,
  measurementId: "M-0001",
});

describe("reconcileFrozenContracts — prev ≠ null (rework path, §H)", () => {
  it("preserves history + waiver when the command (contract) is unchanged", () => {
    const prev: OutcomeLedger = {
      version: 1,
      generatedAt: "2026-07-08T00:00:00.000Z",
      entries: [
        {
          acId: "AC-1",
          contractHash: verifyHashOf("node probe.js"),
          due: "state_ship",
          history: [measurement()],
          waived: { dec: "DEC-050", reason: "r", at: "2026-07-08T00:00:00.000Z" },
        },
      ],
    };
    const next = reconcileFrozenContracts([outcomeSpec("AC-1", "node probe.js")], prev);
    const entry = next?.entries.find((e) => e.acId === "AC-1");
    expect(entry?.history).toHaveLength(1);
    expect(entry?.waived?.dec).toBe("DEC-050");
  });

  it("resets history + drops waiver when the command changed (referee changed)", () => {
    const prev: OutcomeLedger = {
      version: 1,
      generatedAt: "2026-07-08T00:00:00.000Z",
      entries: [
        {
          acId: "AC-1",
          contractHash: verifyHashOf("node probe.js"),
          due: "state_ship",
          history: [measurement()],
          waived: { dec: "DEC-050", reason: "r", at: "2026-07-08T00:00:00.000Z" },
        },
      ],
    };
    const next = reconcileFrozenContracts([outcomeSpec("AC-1", "node probe-v2.js")], prev);
    const entry = next?.entries.find((e) => e.acId === "AC-1");
    expect(entry?.history).toEqual([]);
    expect(entry?.waived).toBeUndefined();
    expect(entry?.contractHash).toBe(verifyHashOf("node probe-v2.js"));
  });
});

describe("brief / status render at SHIP + REFLECT (§H)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-ship-render-");
    await initProject({ cwd: project.cwd, tier: "minimal" }); // 0.9.0 default
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("brief at state_ship / step_release does not crash and reports no required artifact", async () => {
    await seedState(project.cwd, { currentStateId: "state_ship", currentStepId: "step_release" });
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.currentStepId).toBe("step_release");
      expect(result.data?.currentArtifactStatus).toBe("not_applicable");
    }
  });

  it("status at state_reflect / step_evolution_report points at docs/23", async () => {
    await seedState(project.cwd, {
      currentStateId: "state_reflect",
      currentStepId: "step_evolution_report",
    });
    const result = await getStatus({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.currentArtifactPath).toContain("23-evolution-report.md");
    }
  });
});
