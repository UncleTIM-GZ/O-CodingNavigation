// SOP 0.9.0 (AM-017 / DEC-043) §E.1 — outcome dispatch for next-prompt (AC-9).
//
// When a due outcome AC is unmeasured, the next-step prompt should point the AI
// at `ocn outcome check <ac-id>` rather than the generic "advance the doc step"
// objective — the reality-contact number is the actual pending work. Pure
// helpers; the orchestrator pre-computes the dispatch (it holds the profile +
// ledger) so the assembler stays pure. Priority (BUILD anti-livelock): inside
// `state_build` with a ready pending build task, the task wins — an unmeasured
// outcome (usually due at SHIP) must not preempt the build itself. Outside BUILD
// or once the ledger is clear, the due-unmeasured outcome takes the prompt.

import type { OutcomeLedger } from "../../types/outcome-ledger.js";
import type { TaskLedger } from "../../types/task.js";
import { classifyEntry } from "../outcome/outcome-activation.js";

export interface OutcomeDispatch {
  readonly acIds: readonly string[];
}

export interface ResolveOutcomeDispatchArgs {
  readonly requiresOutcome: boolean;
  readonly ledger: OutcomeLedger | null;
  readonly stateOrder: readonly string[];
  readonly currentStateId: string | null;
  readonly taskLedger: TaskLedger | null;
}

function hasReadyBuildTask(taskLedger: TaskLedger | null): boolean {
  if (taskLedger === null) return false;
  const done = new Set(taskLedger.tasks.filter((t) => t.status === "done").map((t) => t.id));
  return taskLedger.tasks.some(
    (t) => t.status === "pending" && t.depends.every((d) => done.has(d)),
  );
}

export function resolveOutcomeDispatch(args: ResolveOutcomeDispatchArgs): OutcomeDispatch | null {
  if (!args.requiresOutcome || args.ledger === null || args.currentStateId === null) return null;
  // BUILD anti-livelock: a ready build task outranks a (usually SHIP-due) outcome.
  if (args.currentStateId === "state_build" && hasReadyBuildTask(args.taskLedger)) return null;

  const acIds = args.ledger.entries
    .filter((e) => classifyEntry(e, args.stateOrder, args.currentStateId!) === "blocking")
    .map((e) => e.acId);
  if (acIds.length === 0) return null;
  return { acIds };
}

export function buildOutcomeDispatchLines(dispatch: OutcomeDispatch): readonly string[] {
  return [
    "A due outcome acceptance criterion is UNMEASURED — measure it before advancing:",
    ...dispatch.acIds.map(
      (id) => `- run \`ocn outcome check ${id}\` (runs the frozen probe command; do NOT edit the ledger by hand)`,
    ),
    "If the probe cannot yet produce evidence, build/wire the thing it measures first — never fabricate the number.",
  ];
}

export function outcomeStopCondition(dispatch: OutcomeDispatch): string {
  return `every due outcome AC is measured (\`ocn outcome check\` run for ${dispatch.acIds.join(", ")})`;
}
