import type { BilingualMessage } from "../../types/i18n.js";
import type { StepLocation } from "../../types/state-machine.js";
import { msg } from "../i18n.js";
import { readTaskLedger } from "../task/task-ledger-store.js";

// SOP 0.5.0 (AM-007 / DEC-032), widened by AM-010 / DEC-035 — task-first gate
// for any forward advance inside state_build:
// 任务台账不清，不准在 BUILD 内前进（含 BUILD 内步进，不止 BUILD→VERIFY 边界）。
// AM-007 originally guarded only the build→verify boundary; the Lattice dogfood
// showed an agent walking the cursor to the last BUILD doc step with tasks still
// pending — receipts written before the work. AM-010 collects the debt earlier:
// while a ledger has pending tasks, the cursor may not move forward at all in
// BUILD, forcing task-first (drain via `/ocn-next` + `ocn task check`).
// Ledger absent (older pins / pre-gate) → legacy pass-through, zero regression.

const MAX_IDS_IN_MESSAGE = 6;

export interface TaskLedgerGuardBlock {
  readonly message: BilingualMessage;
  readonly pendingTaskIds: readonly string[];
}

function blockMessage(
  pendingTaskIds: readonly string[],
  crossesToVerify: boolean,
): BilingualMessage {
  const preview = pendingTaskIds.slice(0, MAX_IDS_IN_MESSAGE).join(", ");
  const more = pendingTaskIds.length - Math.min(pendingTaskIds.length, MAX_IDS_IN_MESSAGE);
  const moreEn = more > 0 ? ` (+${more} more)` : "";
  const moreZh = more > 0 ? `（另有 ${more} 个）` : "";
  const count = pendingTaskIds.length;
  if (crossesToVerify) {
    return msg(
      `Advance blocked: the task ledger still has ${count} pending task(s) — ${preview}${moreEn}. Check them off with \`ocn task check\`, or revise the build plan and re-run the gate (\`ocn check\`).`,
      `推进被阻：任务台账尚有 ${count} 个未清任务——${preview}${moreZh}。任务台账未清，不准进入 VERIFY；请用 \`ocn task check\` 勾销，或修订 build plan 后重过门禁（\`ocn check\`）。`,
    );
  }
  return msg(
    `Advance blocked: BUILD has ${count} pending task(s) — ${preview}${moreEn}. Drain them first with \`/ocn-next\` + \`ocn task check\` (task-first); the cursor can't move forward in BUILD until the ledger is clear.`,
    `推进被阻：BUILD 阶段尚有 ${count} 个未清任务——${preview}${moreZh}。请先用 \`/ocn-next\` 派发 + \`ocn task check\` 勾销（task-first）；台账未清前游标不得在 BUILD 内前进。`,
  );
}

export async function taskLedgerGuardOrNull(
  cwd: string,
  from: StepLocation,
  next: StepLocation,
): Promise<TaskLedgerGuardBlock | null> {
  if (from.stateId !== "state_build") return null;
  const ledger = await readTaskLedger(cwd);
  if (ledger === null) return null;
  const pendingTaskIds = ledger.tasks.filter((t) => t.status === "pending").map((t) => t.id);
  if (pendingTaskIds.length === 0) return null;
  return {
    pendingTaskIds,
    message: blockMessage(pendingTaskIds, next.stateId !== "state_build"),
  };
}
