import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  OutcomeEntryNotFoundError,
  readOutcomeLedger,
  reconcileFrozenContracts,
  setNoOutcomeWaiver,
  setOutcomeWaiver,
  writeOutcomeLedger,
} from "../../src/core/outcome/outcome-ledger-store.js";
import { latestVerdict, blocksAdvance } from "../../src/core/outcome/outcome-verdict.js";
import { verifyHashOf } from "../../src/core/task/task-ledger-store.js";
import { OutcomeMeasurement, type OutcomeLedger } from "../../src/types/outcome-ledger.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import { measureOnce } from "./outcome-measure-helper.js";

const outcomeSpec = (id: string, command: string): AcceptanceSpecV2 => ({
  kind: "outcome",
  id,
  desc: "d",
  trace: [],
  measure: { command, threshold: { op: ">=", value: 1 }, source: "dist/**", due: "state_ship", timeoutSeconds: 5 },
});

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), "ocn-led-"));
  await fs.mkdir(join(root, ".ocoding"), { recursive: true });
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("reconcileFrozenContracts", () => {
  it("returns null for a build-only project (no outcome specs)", () => {
    const specs: AcceptanceSpecV2[] = [{ kind: "build", id: "AC-1", desc: "d", trace: [] }];
    expect(reconcileFrozenContracts(specs, null)).toBeNull();
  });

  it("seeds an entry with contractHash = verifyHashOf(command), empty history", () => {
    const led = reconcileFrozenContracts([outcomeSpec("AC-P-1", "node probe.js")], null);
    expect(led?.entries[0]).toMatchObject({
      acId: "AC-P-1",
      contractHash: verifyHashOf("node probe.js"),
      due: "state_ship",
      history: [],
    });
  });

  it("carries history when the contract hash is unchanged, resets when it changes", () => {
    const first = reconcileFrozenContracts([outcomeSpec("AC-P-1", "node probe.js")], null)!;
    const withHistory: OutcomeLedger = {
      ...first,
      entries: first.entries.map((e) => ({
        ...e,
        history: [validMeasurement()],
      })),
    };
    const unchanged = reconcileFrozenContracts([outcomeSpec("AC-P-1", "node probe.js")], withHistory)!;
    expect(unchanged.entries[0]!.history).toHaveLength(1); // carried

    const changed = reconcileFrozenContracts([outcomeSpec("AC-P-1", "node probe2.js")], withHistory)!;
    expect(changed.entries[0]!.history).toHaveLength(0); // referee changed → reset
  });
});

describe("appendMeasurement", () => {
  it("appends with monotonic seq and preserves order", async () => {
    await writeOutcomeLedger(root, reconcileFrozenContracts([outcomeSpec("AC-P-1", "node probe.js")], null)!);
    await measureOnce(root, "AC-P-1", { verdict: "MEASURED_FAIL", value: 0, command: "node probe.js", evidenceHash: "a".repeat(64) });
    await measureOnce(root, "AC-P-1", { verdict: "MEASURED_PASS", value: 5, command: "node probe.js", evidenceHash: "b".repeat(64) });
    const led = await readOutcomeLedger(root);
    const hist = led!.entries[0]!.history;
    expect(hist.map((m) => m.seq)).toEqual([0, 1]);
    expect(latestVerdict(led!.entries[0]!)).toBe("MEASURED_PASS"); // last element, not max ts
  });

  it("throws OutcomeEntryNotFoundError for an unknown AC", async () => {
    await writeOutcomeLedger(root, reconcileFrozenContracts([outcomeSpec("AC-P-1", "node probe.js")], null)!);
    await expect(
      measureOnce(root, "AC-NOPE", { verdict: "MEASURED_PASS", value: 1, command: "x", evidenceHash: "c".repeat(64) }),
    ).rejects.toBeInstanceOf(OutcomeEntryNotFoundError);
  });
});

describe("waivers", () => {
  it("setOutcomeWaiver marks an entry non-blocking; setNoOutcomeWaiver records project-level", async () => {
    await writeOutcomeLedger(root, reconcileFrozenContracts([outcomeSpec("AC-P-1", "node probe.js")], null)!);
    await setOutcomeWaiver(root, "AC-P-1", { dec: "DEC-043", reason: "pivot", at: new Date().toISOString() });
    const led = await readOutcomeLedger(root);
    expect(led!.entries[0]!.waived?.dec).toBe("DEC-043");
    expect(blocksAdvance(led!.entries[0]!)).toBe(false); // waived → never blocks
    await setNoOutcomeWaiver(root, { dec: "DEC-043", reason: "no outcome", at: new Date().toISOString() });
    expect((await readOutcomeLedger(root))!.noOutcomeWaiver?.dec).toBe("DEC-043");
  });
});

describe("OutcomeMeasurement schema biconditionals", () => {
  it("rejects MEASURED_PASS with value null", () => {
    expect(OutcomeMeasurement.safeParse({ ...validMeasurement(), verdict: "MEASURED_PASS", value: null }).success).toBe(false);
  });
  it("rejects NO_EVIDENCE with a non-null value", () => {
    expect(OutcomeMeasurement.safeParse({ ...validMeasurement(), verdict: "NO_EVIDENCE", value: 5, evidenceHash: "" }).success).toBe(false);
  });
  it("rejects MEASURED_* with an empty evidenceHash", () => {
    expect(OutcomeMeasurement.safeParse({ ...validMeasurement(), evidenceHash: "" }).success).toBe(false);
  });
  it("accepts a well-formed MEASURED_PASS", () => {
    expect(OutcomeMeasurement.safeParse(validMeasurement()).success).toBe(true);
  });
});

function validMeasurement() {
  return {
    measuredAt: "2026-07-02T00:00:00.000Z",
    seq: 0,
    verdict: "MEASURED_PASS" as const,
    value: 5,
    commandHash: "a".repeat(64),
    probeEntryHash: "",
    evidenceHash: "b".repeat(64),
    evidenceFiles: [],
    durationMs: 0,
    measurementId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  };
}
