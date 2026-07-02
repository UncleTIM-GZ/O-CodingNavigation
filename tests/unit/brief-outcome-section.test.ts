import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { summarizeOutcome } from "../../src/core/brief-outcome-section.js";
import { writeOutcomeLedger } from "../../src/core/outcome/outcome-ledger-store.js";
import type { OutcomeLedger, OutcomeMeasurement } from "../../src/types/outcome-ledger.js";

const m = (verdict: OutcomeMeasurement["verdict"], value: number | null, at: string): OutcomeMeasurement => ({
  measuredAt: at,
  seq: 0,
  verdict,
  value,
  commandHash: "a".repeat(64),
  probeEntryHash: "",
  evidenceHash: verdict === "NO_EVIDENCE" ? "" : "b".repeat(64),
  evidenceFiles: [],
  durationMs: 0,
  measurementId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
});

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), "ocn-brief-"));
  await fs.mkdir(join(root, ".ocoding"), { recursive: true });
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("summarizeOutcome", () => {
  it("returns undefined when no ledger exists", async () => {
    expect(await summarizeOutcome(root, Date.now())).toBeUndefined();
  });

  it("counts verdicts + waived and reports freshness", async () => {
    const now = Date.parse("2026-07-10T00:00:00.000Z");
    const ledger: OutcomeLedger = {
      version: 1,
      generatedAt: "2026-07-02T00:00:00.000Z",
      entries: [
        { acId: "AC-1", contractHash: "c".repeat(64), due: "state_ship", history: [m("MEASURED_PASS", 9, "2026-07-08T00:00:00.000Z")] },
        { acId: "AC-2", contractHash: "c".repeat(64), due: "state_ship", history: [m("MEASURED_FAIL", 0, "2026-07-05T00:00:00.000Z")] },
        { acId: "AC-3", contractHash: "c".repeat(64), due: "state_ship", history: [] },
        { acId: "AC-4", contractHash: "c".repeat(64), due: "state_ship", history: [], waived: { dec: "DEC-1", reason: "r", at: "2026-07-02T00:00:00.000Z" } },
      ],
    };
    await writeOutcomeLedger(root, ledger);
    const s = await summarizeOutcome(root, now);
    expect(s).toMatchObject({
      total: 4,
      measuredPass: 1,
      measuredFail: 1,
      unmeasured: 2,
      waived: 1,
      daysSinceFreshest: 2, // freshest = AC-1 @ 07-08 → 2 days before 07-10
    });
  });
});
