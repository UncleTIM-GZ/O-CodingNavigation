import { describe, expect, it } from "vitest";
import { evaluateOutcomeGuard } from "../../src/core/advance/outcome-ledger-guard.js";
import { classifyEntry, dueReached } from "../../src/core/outcome/outcome-activation.js";
import type {
  OutcomeLedger,
  OutcomeLedgerEntry,
  OutcomeMeasurement,
  OutcomeVerdict,
} from "../../src/types/outcome-ledger.js";

const ORDER = ["state_discovery", "state_spec", "state_verify", "state_ship", "state_reflect"];

const measurement = (verdict: OutcomeVerdict, value: number | null): OutcomeMeasurement => ({
  measuredAt: "2026-07-02T00:00:00.000Z",
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

const entry = (over: Partial<OutcomeLedgerEntry>): OutcomeLedgerEntry => ({
  acId: over.acId ?? "AC-1",
  contractHash: "c".repeat(64),
  due: over.due ?? "state_ship",
  history: over.history ?? [],
  ...(over.waived !== undefined ? { waived: over.waived } : {}),
});

const ledger = (entries: OutcomeLedgerEntry[]): OutcomeLedger => ({
  version: 1,
  generatedAt: "2026-07-02T00:00:00.000Z",
  entries,
});

describe("dueReached / classifyEntry", () => {
  it("DEFERRED before the due state; enforced at/after", () => {
    expect(dueReached(ORDER, "state_spec", "state_ship")).toBe(false);
    expect(dueReached(ORDER, "state_ship", "state_ship")).toBe(true);
    expect(dueReached(ORDER, "state_reflect", "state_ship")).toBe(true);
  });
  it("fail-safe: an unresolvable due state enforces from gate 1", () => {
    expect(dueReached(ORDER, "state_spec", "state_bogus")).toBe(true);
  });
  it("classifies deferred / blocking / measured_fail / ok", () => {
    expect(classifyEntry(entry({ history: [] }), ORDER, "state_spec")).toBe("deferred");
    expect(classifyEntry(entry({ history: [] }), ORDER, "state_ship")).toBe("blocking");
    expect(classifyEntry(entry({ history: [measurement("MEASURED_FAIL", 0)] }), ORDER, "state_ship")).toBe("measured_fail");
    expect(classifyEntry(entry({ history: [measurement("MEASURED_PASS", 5)] }), ORDER, "state_ship")).toBe("ok");
    expect(classifyEntry(entry({ history: [measurement("NO_EVIDENCE", null)] }), ORDER, "state_ship")).toBe("blocking");
  });
  it("a waived entry is never blocking", () => {
    const w = entry({ history: [], waived: { dec: "DEC-1", reason: "r", at: "2026-07-02T00:00:00.000Z" } });
    expect(classifyEntry(w, ORDER, "state_ship")).toBe("ok");
  });
});

describe("evaluateOutcomeGuard (3-way)", () => {
  it("null ledger → pass (legacy)", () => {
    expect(evaluateOutcomeGuard(null, ORDER, "state_ship").kind).toBe("pass");
  });
  it("blocks on a due unmeasured AC", () => {
    const r = evaluateOutcomeGuard(ledger([entry({ history: [] })]), ORDER, "state_ship");
    expect(r.kind).toBe("block");
    if (r.kind === "block") expect(r.acIds).toEqual(["AC-1"]);
  });
  it("does not block before the due state (deferred)", () => {
    expect(evaluateOutcomeGuard(ledger([entry({ history: [] })]), ORDER, "state_spec").kind).toBe("pass");
  });
  it("MEASURED_FAIL warns but does not block", () => {
    const r = evaluateOutcomeGuard(ledger([entry({ history: [measurement("MEASURED_FAIL", 0)] })]), ORDER, "state_ship");
    expect(r.kind).toBe("warn");
  });
  it("blocking takes precedence over a separate measured-fail", () => {
    const r = evaluateOutcomeGuard(
      ledger([
        entry({ acId: "AC-1", history: [] }),
        entry({ acId: "AC-2", history: [measurement("MEASURED_FAIL", 0)] }),
      ]),
      ORDER,
      "state_ship",
    );
    expect(r.kind).toBe("block");
  });
  it("all measured-pass → pass", () => {
    const r = evaluateOutcomeGuard(ledger([entry({ history: [measurement("MEASURED_PASS", 9)] })]), ORDER, "state_ship");
    expect(r.kind).toBe("pass");
  });
});
