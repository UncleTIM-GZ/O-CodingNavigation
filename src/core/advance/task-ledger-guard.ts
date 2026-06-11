import type { BilingualMessage } from "../../types/i18n.js";
import type { StepLocation } from "../../types/state-machine.js";
import { msg } from "../i18n.js";
import { readTaskLedger } from "../task/task-ledger-store.js";

// SOP 0.5.0 (AM-007 / DEC-032) — transition gate out of state_build:
// 任务台账不清，不准进 VERIFY。 When a task ledger exists and still carries
// pending tasks, `ocn advance` may not cross the build→verify boundary —
// this is the defense against the "receipt-only run-through" (a full SOP
// round passing every gate with zero implementation ever scheduled).
// Ledger absent (older pins / pre-gate) → legacy pass-through, zero regression.

const MAX_IDS_IN_MESSAGE = 6;

export interface TaskLedgerGuardBlock {
  readonly message: BilingualMessage;
  readonly pendingTaskIds: readonly string[];
}

export async function taskLedgerGuardOrNull(
  cwd: string,
  from: StepLocation,
  next: StepLocation,
): Promise<TaskLedgerGuardBlock | null> {
  if (from.stateId !== "state_build" || next.stateId === "state_build") return null;
  const ledger = await readTaskLedger(cwd);
  if (ledger === null) return null;
  const pendingTaskIds = ledger.tasks.filter((t) => t.status === "pending").map((t) => t.id);
  if (pendingTaskIds.length === 0) return null;
  const preview = pendingTaskIds.slice(0, MAX_IDS_IN_MESSAGE).join(", ");
  const more = pendingTaskIds.length - Math.min(pendingTaskIds.length, MAX_IDS_IN_MESSAGE);
  const moreEn = more > 0 ? ` (+${more} more)` : "";
  const moreZh = more > 0 ? `（另有 ${more} 个）` : "";
  return {
    pendingTaskIds,
    message: msg(
      `Advance blocked: the task ledger still has ${pendingTaskIds.length} pending task(s) — ${preview}${moreEn}. Check them off with \`ocn task check\`, or revise the build plan and re-run the gate (\`ocn check\`).`,
      `推进被阻：任务台账尚有 ${pendingTaskIds.length} 个未清任务——${preview}${moreZh}。任务台账未清，不准进入 VERIFY；请用 \`ocn task check\` 勾销，或修订 build plan 后重过门禁（\`ocn check\`）。`,
    ),
  };
}
