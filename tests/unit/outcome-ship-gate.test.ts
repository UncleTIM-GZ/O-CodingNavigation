import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAcceptanceProjection,
  writeAcceptanceSpecs,
} from "../../src/core/acceptance/acceptance-spec-store.js";
import { runOutcomeShipGateStep } from "../../src/core/gate/outcome-ship-gate-step.js";
import {
  reconcileFrozenContracts,
  writeOutcomeLedger,
} from "../../src/core/outcome/outcome-ledger-store.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";
import { measureOnce } from "./outcome-measure-helper.js";

// SOP 0.9.0 (AM-016) P4b §C — the SHIP gate for step_release, incl. the C-3
// trust-source fix (a deleted/corrupt ledger must NOT ship silently).

const PROBE = "node probe.js";
const OUTCOME_SPECS: readonly AcceptanceSpecV2[] = [
  { kind: "build", id: "AC-INIT-001", desc: "init lands .ocoding", trace: [] },
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

async function freezeProjectionAndLedger(cwd: string): Promise<void> {
  await writeAcceptanceSpecs(cwd, buildAcceptanceProjection(OUTCOME_SPECS, "h", true));
  const ledger = reconcileFrozenContracts(OUTCOME_SPECS, null);
  if (ledger !== null) await writeOutcomeLedger(cwd, ledger);
}

describe("runOutcomeShipGateStep — self-guard", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-ship-gate-");
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("skips when the cursor is not in state_ship", async () => {
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_verify",
    });
    expect(r.kind).toBe("skip");
  });

  it("skips (dormant) below a 0.9.0 pin even at state_ship", async () => {
    await freezeProjectionAndLedger(project.cwd);
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P080,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("skip");
  });
});

describe("runOutcomeShipGateStep — C-3 trust source", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-ship-c3-");
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("BLOCKS when outcome contracts were frozen but the ledger is missing", async () => {
    // Freeze the projection (outcome AC exists) but write NO ledger — the
    // one-file-delete bypass the SHIP gate must refuse.
    await writeAcceptanceSpecs(project.cwd, buildAcceptanceProjection(OUTCOME_SPECS, "h", true));
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("outcome_ledger_missing");
  });

  it("BLOCKS when the ledger JSON is corrupt (unreadable → null)", async () => {
    await writeAcceptanceSpecs(project.cwd, buildAcceptanceProjection(OUTCOME_SPECS, "h", true));
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(join(project.cwd, ".ocoding", "outcome-ledger.json"), "{not json", "utf8");
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("outcome_ledger_missing");
  });

  it("passes when there is no outcome backbone at all (no projection, no ledger)", async () => {
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("pass");
  });
});

describe("runOutcomeShipGateStep — measurement verdicts", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-ship-verdict-");
    await freezeProjectionAndLedger(project.cwd);
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("BLOCKS a due-but-unmeasured outcome AC", async () => {
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("outcome_unmeasured");
  });

  it("passes once the due outcome AC measures PASS", async () => {
    await measureOnce(project.cwd, "AC-CORE-003", {
      verdict: "MEASURED_PASS",
      value: 5,
      command: PROBE,
      evidenceHash: "a".repeat(64),
    });
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("pass");
  });

  it("BLOCKS an unwaived MEASURED_FAIL (must decide before release)", async () => {
    await measureOnce(project.cwd, "AC-CORE-003", {
      verdict: "MEASURED_FAIL",
      value: 0,
      command: PROBE,
      evidenceHash: "b".repeat(64),
    });
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("outcome_measured_fail_undecided");
  });
});
