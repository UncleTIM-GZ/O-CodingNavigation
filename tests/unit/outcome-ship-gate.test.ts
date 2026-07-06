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

// SOP 0.9.0 (AM-017) P4b §C — the SHIP gate for step_release, incl. the C-3
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

// docs/03 is the canonical "outcomes expected?" anchor (not the deletable
// projection). It must declare the same outcome AC + command so the frozen
// contract hash matches.
const DOCS03 = [
  "# Acceptance Criteria",
  "",
  "## Acceptance Specs｜验收规格",
  "",
  "### AC-CORE-003",
  "- desc: onboarding under 30m",
  "- kind: outcome",
  `- measure.command: ${PROBE}`,
  "- measure.threshold: >= 1",
  "- measure.source: cases/*.json",
  "- measure.due: state_ship",
  "- measure.timeout: 60",
  "",
].join("\n");

async function writeDocs03(cwd: string): Promise<void> {
  await fs.mkdir(join(cwd, "docs"), { recursive: true });
  await fs.writeFile(join(cwd, "docs", "03-acceptance-criteria.md"), DOCS03, "utf8");
}

/** Full freeze: docs/03 (the anchor) + projection + ledger. */
async function freeze(cwd: string): Promise<void> {
  await writeDocs03(cwd);
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
    await freeze(project.cwd);
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

  it("BLOCKS when docs/03 declares an outcome AC but the ledger is missing", async () => {
    // docs/03 declares the outcome AC; write NO ledger — the one-file-delete
    // bypass the SHIP gate must refuse.
    await writeDocs03(project.cwd);
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("outcome_ledger_missing");
  });

  it("BLOCKS even when BOTH the projection and the ledger are deleted (Finding 2)", async () => {
    // The strengthened C-3: anchor on docs/03, not the deletable .ocoding files.
    // Neither acceptance-specs.json nor outcome-ledger.json exists — docs/03
    // alone forces the block.
    await writeDocs03(project.cwd);
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.reason).toBe("outcome_ledger_missing");
  });

  it("BLOCKS when the ledger JSON is corrupt (unreadable → null)", async () => {
    await writeDocs03(project.cwd);
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

  it("passes when there is no outcome backbone at all (no docs/03, no ledger)", async () => {
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
    await freeze(project.cwd);
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

  it("still evaluates (pass) with the projection deleted — anchors on docs/03 (Finding 1)", async () => {
    await measureOnce(project.cwd, "AC-CORE-003", {
      verdict: "MEASURED_PASS",
      value: 5,
      command: PROBE,
      evidenceHash: "a".repeat(64),
    });
    // Delete the deletable projection — the gate must still work off docs/03 +
    // the ledger + the audit trust root.
    await fs.rm(join(project.cwd, ".ocoding", "acceptance-specs.json"), { force: true });
    const r = await runOutcomeShipGateStep({
      cwd: project.cwd,
      profile: P090,
      currentStateId: "state_ship",
    });
    expect(r.kind).toBe("pass");
  });
});
