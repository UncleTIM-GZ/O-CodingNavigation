import { describe, expect, it } from "vitest";
import { evaluateOutcomeSpecGate } from "../../src/core/outcome/outcome-spec-gate.js";
import { declaredDecIds, decExists, normaliseDecId } from "../../src/core/outcome/dec-log.js";
import { requiresOutcome, versionAtLeast } from "../../src/core/outcome/pin.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import type { OutcomeWaiver } from "../../src/types/outcome-ledger.js";

const build = (id: string): AcceptanceSpecV2 => ({ kind: "build", id, desc: "d", trace: [] });
const outcome = (id: string): AcceptanceSpecV2 => ({
  kind: "outcome",
  id,
  desc: "d",
  trace: [],
  measure: { command: "p.js", threshold: { op: ">=", value: 1 }, source: "d/**", due: "state_ship", timeoutSeconds: 5 },
});
const waiver = (dec: string): OutcomeWaiver => ({ dec, reason: "r", at: "2026-07-02T00:00:00.000Z" });
const DEC_LOG = "# Decision Log\n\n### DEC-042 Outcome Backbone\n- **DEC-041** Acceptance\n";

describe("dec-log parser", () => {
  it("normalises leading zeros (DEC-042 ≡ DEC-42)", () => {
    expect(normaliseDecId("DEC-042")).toBe("DEC-42");
    expect(normaliseDecId("dec-42")).toBe("DEC-42");
    expect(normaliseDecId("not a dec")).toBeNull();
  });
  it("collects declared ids from headings and list items, not prose", () => {
    const ids = declaredDecIds(DEC_LOG + "\nsome prose mentioning DEC-999 mid-sentence.\n");
    expect(ids.has("DEC-42")).toBe(true);
    expect(ids.has("DEC-41")).toBe(true);
    expect(ids.has("DEC-999")).toBe(false); // prose mention doesn't declare
  });
  it("decExists matches normalised ids", () => {
    expect(decExists(DEC_LOG, "DEC-42")).toBe(true);
    expect(decExists(DEC_LOG, "DEC-042")).toBe(true);
    expect(decExists(DEC_LOG, "DEC-777")).toBe(false);
  });
});

describe("pin capability", () => {
  it("versionAtLeast is numeric", () => {
    expect(versionAtLeast("0.9.0", "0.9.0")).toBe(true);
    expect(versionAtLeast("0.8.0", "0.9.0")).toBe(false);
    expect(versionAtLeast("0.10.0", "0.9.0")).toBe(true);
  });
  it("requiresOutcome only for >=0.9.0", () => {
    expect(requiresOutcome("0.8.0")).toBe(false);
    expect(requiresOutcome("0.9.0")).toBe(true);
  });
});

describe("evaluateOutcomeSpecGate", () => {
  it("passes when >=1 outcome AC is declared", () => {
    const r = evaluateOutcomeSpecGate({ specs: [build("AC-1"), outcome("AC-2")], noOutcomeWaiver: undefined, decLogContent: "" });
    expect(r.ok).toBe(true);
  });
  it("blocks when no outcome AC and no waiver", () => {
    const r = evaluateOutcomeSpecGate({ specs: [build("AC-1")], noOutcomeWaiver: undefined, decLogContent: "" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_outcome_ac");
  });
  it("blocks when the no-outcome waiver cites a missing DEC", () => {
    const r = evaluateOutcomeSpecGate({ specs: [build("AC-1")], noOutcomeWaiver: waiver("DEC-777"), decLogContent: DEC_LOG });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("waiver_dec_missing");
  });
  it("passes with a valid DEC-backed no-outcome waiver", () => {
    const r = evaluateOutcomeSpecGate({ specs: [build("AC-1")], noOutcomeWaiver: waiver("DEC-042"), decLogContent: DEC_LOG });
    expect(r.ok).toBe(true);
  });
  it("blocks when a waiver coexists with declared outcome ACs (mutual exclusion)", () => {
    const r = evaluateOutcomeSpecGate({ specs: [outcome("AC-2")], noOutcomeWaiver: waiver("DEC-042"), decLogContent: DEC_LOG });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("waiver_outcome_conflict");
  });
});
