// SOP 0.5.0 (AM-007 / DEC-032) — BUILD-state task dispatch for next-prompt.
//
// Pure helpers over PromptInputs. When the project sits in `state_build` and
// the task ledger has pending work, the nine-section brief dispatches the
// FIRST pending task whose depends are all done — instead of the generic
// "advance the current doc step" objective that caused the receipt-only
// run-through (proposal §1). Ledger absent / no pending → callers fall back
// to the legacy behavior byte-for-byte (zero regression for ≤0.4.0 pins).

import type { LedgerTask } from "../../types/task.js";
import type { PromptInputs } from "./next-prompt-shapes.js";

export interface BlockedPendingTask {
  readonly id: string;
  readonly blockedBy: readonly string[];
}

export type TaskDispatch =
  | { readonly kind: "task"; readonly task: LedgerTask }
  | { readonly kind: "all_blocked"; readonly pending: readonly BlockedPendingTask[] };

export function resolveTaskDispatch(input: PromptInputs): TaskDispatch | null {
  const ledger = input.taskLedger;
  if (ledger === undefined || ledger === null) return null;
  if (input.ocn.currentStateId !== "state_build") return null;
  const done = new Set(ledger.tasks.filter((t) => t.status === "done").map((t) => t.id));
  const pending = ledger.tasks.filter((t) => t.status === "pending");
  if (pending.length === 0) return null;
  const ready = pending.find((t) => t.depends.every((d) => done.has(d)));
  if (ready !== undefined) return { kind: "task", task: ready };
  return {
    kind: "all_blocked",
    pending: pending.map((t) => ({
      id: t.id,
      blockedBy: t.depends.filter((d) => !done.has(d)),
    })),
  };
}

export function buildTaskObjective(dispatch: TaskDispatch): string {
  if (dispatch.kind === "all_blocked") {
    const lines = dispatch.pending.map((p) => `${p.id} (blocked by ${p.blockedBy.join(", ")})`);
    return `All pending tasks in the ledger are blocked by unmet depends: ${lines.join("; ")}. Resolve the dependencies (run \`ocn task check\` on them) or revise the build plan and re-run the gate.`;
  }
  const t = dispatch.task;
  const phase = t.phase !== undefined ? ` Phase: ${t.phase}.` : "";
  return `Implement task \`${t.id}\` from the build-plan task ledger. Goal: ${t.goal}. DoD: ${t.dod}. Traces: ${t.traces.join(", ")}.${phase}`;
}

export function buildTaskAllowedWork(task: LedgerTask): readonly string[] {
  const scope = task.touches.length > 0 ? task.touches.join(", ") : "per the build plan";
  return [
    `- implement within the task's touches scope (${scope}): code + tests, TDD, traced to the task's AC ids`,
    "- update the build receipts (implementation log / change evidence / integration notes) with REAL evidence referencing the task id",
  ];
}

export function taskVerificationCommands(task: LedgerTask): readonly string[] {
  return [task.verifyCommand, `ocn task check ${task.id}`];
}

export function taskStopCondition(task: LedgerTask): string {
  return `task ${task.id} DoD reached and \`ocn task check ${task.id}\` passes`;
}
