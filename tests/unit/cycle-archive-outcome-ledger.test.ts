import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAcceptanceProjection,
  writeAcceptanceSpecs,
} from "../../src/core/acceptance/acceptance-spec-store.js";
import { cycleNew } from "../../src/core/cycle/cycle-new.js";
import { initProject } from "../../src/core/init.js";
import {
  reconcileFrozenContracts,
  writeOutcomeLedger,
} from "../../src/core/outcome/outcome-ledger-store.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.9.0 (AM-016) P4b §D.2 / AC-14 — the outcome ledger is per-round LIVE
// state: `cycle new` MUST MOVE it into the round archive so the new round
// starts with no live ledger (verdict + waiver reset). The audit JSONL is NOT
// archived (one continuous log spans rounds).

const SPECS: readonly AcceptanceSpecV2[] = [
  {
    kind: "outcome",
    id: "AC-CORE-003",
    desc: "onboarding under 30m",
    trace: [],
    measure: {
      command: "node probe.js",
      threshold: { op: ">=", value: 1 },
      source: "cases/*.json",
      due: "state_ship",
      timeoutSeconds: 60,
    },
  },
];

describe("cycle new archives the outcome ledger (AC-14)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-cycle-outcome-");
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.9.0" });
    await writeAcceptanceSpecs(project.cwd, buildAcceptanceProjection(SPECS, "h", true));
    const ledger = reconcileFrozenContracts(SPECS, null);
    if (ledger !== null) await writeOutcomeLedger(project.cwd, ledger);
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("moves outcome-ledger.json out of .ocoding into the round archive", async () => {
    const live = join(project.cwd, ".ocoding", "outcome-ledger.json");
    await expect(fs.access(live)).resolves.toBeUndefined(); // present before

    const result = await cycleNew({ cwd: project.cwd });
    expect(result.ok).toBe(true);

    // Gone from the live .ocoding dir → the new round has no live ledger.
    await expect(fs.access(live)).rejects.toThrow();

    // Present under the single archived round dir.
    const cyclesDir = join(project.cwd, ".ocoding", "cycles");
    const rounds = await fs.readdir(cyclesDir);
    expect(rounds).toHaveLength(1);
    const archived = join(cyclesDir, rounds[0]!, "outcome-ledger.json");
    await expect(fs.access(archived)).resolves.toBeUndefined();

    // The audit JSONL is NOT archived — it stays live (one continuous log).
    await expect(
      fs.access(join(project.cwd, ".ocoding", "audit", "audit-events.jsonl")),
    ).resolves.toBeUndefined();
  });
});
