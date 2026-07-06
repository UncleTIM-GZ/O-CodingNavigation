import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProject } from "../../src/core/init.js";
import { runOutcomeCheck } from "../../src/core/outcome/outcome-check.js";
import { runOutcomeWaive } from "../../src/core/outcome/outcome-waive.js";
import { listOutcomes } from "../../src/core/outcome/outcome-list.js";
import {
  reconcileFrozenContracts,
  readOutcomeLedger,
  writeOutcomeLedger,
} from "../../src/core/outcome/outcome-ledger-store.js";
import { latestVerdict } from "../../src/core/outcome/outcome-verdict.js";
import { Paths } from "../../src/core/paths.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";

// SOP 0.9.0 (AM-017) P2 — the `ocn outcome check/waive` command flow end to
// end (core level, no CLI spawn): drift refusal (exit 2), exec_error (exit 4,
// no write), and the human-only waive refusal for ai_agent.

const AC = "AC-PERF-001";

const docWith = (command: string): string =>
  [
    "# Acceptance Criteria",
    "",
    "## Acceptance Specs｜验收规格",
    "",
    `### ${AC}`,
    "- desc: p95 latency under target",
    "- kind: outcome",
    `- measure.command: ${command}`,
    "- measure.threshold: <= 200",
    "- measure.source: dist/**",
    "- measure.due: state_ship",
    "",
  ].join("\n");

const spec = (command: string): AcceptanceSpecV2 => ({
  kind: "outcome",
  id: AC,
  desc: "p95 latency under target",
  trace: [],
  measure: {
    command,
    threshold: { op: "<=", value: 200 },
    source: "dist/**",
    due: "state_ship",
    timeoutSeconds: 5,
  },
});

let project: TempProject;
let cwd: string;

async function freeze(command: string): Promise<void> {
  await fs.writeFile(join(cwd, "docs", "03-acceptance-criteria.md"), docWith(command));
  await writeOutcomeLedger(
    cwd,
    reconcileFrozenContracts([spec(command)], await readOutcomeLedger(cwd))!,
  );
}

beforeEach(async () => {
  project = await createTempProject();
  cwd = project.cwd;
  await initProject({ cwd, tier: "minimal", sopVersion: "0.8.0" });
  await fs.mkdir(join(cwd, "docs"), { recursive: true });
  await fs.mkdir(join(cwd, "dist"), { recursive: true });
  await fs.writeFile(join(cwd, "dist", "out.json"), "{}"); // non-empty evidence
  await seedState(cwd, { currentStateId: "state_verify", currentStepId: "step_validation_report" });
});
afterEach(async () => {
  await project.cleanup();
});

describe("ocn outcome check flow", () => {
  it("measures a PASS and appends the verdict (exit 0)", async () => {
    await freeze(`echo '{"metric":"p95","value":180}'`);
    const r = await runOutcomeCheck({ cwd, acId: AC });
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ verdict: "MEASURED_PASS", value: 180 });
    const led = await readOutcomeLedger(cwd);
    expect(latestVerdict(led!.entries[0]!)).toBe("MEASURED_PASS");
  });

  it("measures MEASURED_FAIL without blocking (records, does not error out)", async () => {
    await freeze(`echo '{"metric":"p95","value":500}'`);
    const r = await runOutcomeCheck({ cwd, acId: AC });
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ verdict: "MEASURED_FAIL" });
  });

  it("zero-hit evidence forces NO_EVIDENCE even when the probe returns a value", async () => {
    await fs.rm(join(cwd, "dist"), { recursive: true, force: true }); // no source files
    await freeze(`echo '{"metric":"p95","value":10}'`);
    const r = await runOutcomeCheck({ cwd, acId: AC });
    expect(r.data).toMatchObject({ verdict: "NO_EVIDENCE", value: null });
  });

  it("contract-hash drift refuses with ERR_ARTIFACT_INVALID (exit 2), no measurement", async () => {
    await freeze(`echo '{"metric":"p95","value":180}'`);
    // Edit docs/03 command AFTER freezing → the live hash drifts from the frozen one.
    await fs.writeFile(
      join(cwd, "docs", "03-acceptance-criteria.md"),
      docWith("node other-probe.js"),
    );
    const r = await runOutcomeCheck({ cwd, acId: AC });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_ARTIFACT_INVALID");
    const led = await readOutcomeLedger(cwd);
    expect(led!.entries[0]!.history).toHaveLength(0); // nothing written
  });

  it("probe exec_error refuses with ERR_IO_OR_CONFIG (exit 4), no measurement", async () => {
    await freeze("exit 3");
    const r = await runOutcomeCheck({ cwd, acId: AC });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_IO_OR_CONFIG");
    const led = await readOutcomeLedger(cwd);
    expect(led!.entries[0]!.history).toHaveLength(0);
  });

  it("unknown / non-outcome AC → ERR_ARTIFACT_INVALID", async () => {
    await freeze(`echo '{"metric":"p95","value":180}'`);
    const r = await runOutcomeCheck({ cwd, acId: "AC-DOES-NOT-EXIST-1" });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_ARTIFACT_INVALID");
  });

  it("hand-edited ledger → next check reconcile fails (exit 2)", async () => {
    await freeze(`echo '{"metric":"p95","value":180}'`);
    await runOutcomeCheck({ cwd, acId: AC });
    const led = await readOutcomeLedger(cwd);
    led!.entries[0]!.history[0]!.value = 1; // forge a passing number
    await fs.writeFile(Paths.outcomeLedgerFile(cwd), JSON.stringify(led, null, 2));
    const r = await runOutcomeCheck({ cwd, acId: AC });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_ARTIFACT_INVALID");
  });
});

describe("ocn outcome list / waive", () => {
  it("list shows the frozen AC as UNMEASURED before any check", async () => {
    await freeze(`echo '{"metric":"p95","value":180}'`);
    const r = await listOutcomes({ cwd });
    if (!r.ok) throw new Error("expected ok");
    expect(r.data?.rows).toEqual([
      { acId: AC, verdict: "UNMEASURED", daysSinceMeasure: null, waived: false },
    ]);
  });

  it("per-AC waive records a DEC and marks the entry waived", async () => {
    await freeze(`echo '{"metric":"p95","value":180}'`);
    const r = await runOutcomeWaive({ cwd, acId: AC, dec: "DEC-043", reason: "pivot" });
    expect(r.ok).toBe(true);
    const led = await readOutcomeLedger(cwd);
    expect(led!.entries[0]!.waived?.dec).toBe("DEC-043");
  });
});
