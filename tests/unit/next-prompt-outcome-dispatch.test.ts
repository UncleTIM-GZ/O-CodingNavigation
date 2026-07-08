import { describe, expect, it } from "vitest";
import {
  resolveOutcomeDispatch,
  buildOutcomeDispatchLines,
} from "../../src/core/execution-navigator/next-prompt-outcome-dispatch.js";
import type { OutcomeLedger } from "../../src/types/outcome-ledger.js";
import type { TaskLedger } from "../../src/types/task.js";

// SOP 0.9.0 (AM-017 / DEC-043) §E.1 — next-prompt outcome dispatch (AC-9).

const STATE_ORDER = [
  "state_discovery",
  "state_spec",
  "state_design",
  "state_plan",
  "state_build",
  "state_verify",
  "state_ship",
  "state_reflect",
];

function ledger(...dues: Array<{ acId: string; due: string }>): OutcomeLedger {
  return {
    version: 1,
    generatedAt: "2026-07-08T00:00:00.000Z",
    entries: dues.map((d) => ({ acId: d.acId, contractHash: "h", due: d.due, history: [] })),
  };
}

const readyTasks: TaskLedger = {
  tasks: [
    {
      id: "T1",
      status: "pending",
      depends: [],
      goal: "g",
      dod: "d",
      traces: [],
      touches: [],
      verifyCommand: "v",
    },
  ],
} as unknown as TaskLedger;

describe("resolveOutcomeDispatch (§E.1)", () => {
  it("returns null when the pin is not outcome-capable", () => {
    expect(
      resolveOutcomeDispatch({
        requiresOutcome: false,
        ledger: ledger({ acId: "AC-1", due: "state_ship" }),
        stateOrder: STATE_ORDER,
        currentStateId: "state_ship",
        taskLedger: null,
      }),
    ).toBeNull();
  });

  it("dispatches a due-unmeasured outcome AC outside BUILD", () => {
    const d = resolveOutcomeDispatch({
      requiresOutcome: true,
      ledger: ledger({ acId: "AC-1", due: "state_ship" }, { acId: "AC-2", due: "state_reflect" }),
      stateOrder: STATE_ORDER,
      currentStateId: "state_ship",
      taskLedger: null,
    });
    // AC-1 is due (state_ship reached); AC-2 (due state_reflect) is not yet.
    expect(d?.acIds).toEqual(["AC-1"]);
  });

  it("does NOT dispatch a not-yet-due outcome AC", () => {
    expect(
      resolveOutcomeDispatch({
        requiresOutcome: true,
        ledger: ledger({ acId: "AC-1", due: "state_ship" }),
        stateOrder: STATE_ORDER,
        currentStateId: "state_spec",
        taskLedger: null,
      }),
    ).toBeNull();
  });

  it("BUILD anti-livelock: a ready build task outranks the outcome", () => {
    expect(
      resolveOutcomeDispatch({
        requiresOutcome: true,
        // due-now at state_build so it WOULD be blocking without the guard
        ledger: ledger({ acId: "AC-1", due: "state_build" }),
        stateOrder: STATE_ORDER,
        currentStateId: "state_build",
        taskLedger: readyTasks,
      }),
    ).toBeNull();
  });

  it("in BUILD with the ledger clear, the due outcome dispatches", () => {
    const d = resolveOutcomeDispatch({
      requiresOutcome: true,
      ledger: ledger({ acId: "AC-1", due: "state_build" }),
      stateOrder: STATE_ORDER,
      currentStateId: "state_build",
      taskLedger: null,
    });
    expect(d?.acIds).toEqual(["AC-1"]);
  });

  it("dispatch lines name `ocn outcome check <id>` and forbid hand-editing", () => {
    const lines = buildOutcomeDispatchLines({ acIds: ["AC-1"] }).join("\n");
    expect(lines).toContain("ocn outcome check AC-1");
    expect(lines).toContain("do NOT edit the ledger by hand");
  });
});
