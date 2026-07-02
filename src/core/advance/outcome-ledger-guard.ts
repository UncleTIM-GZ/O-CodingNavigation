import type { BilingualMessage } from "../../types/i18n.js";
import type { OutcomeLedger } from "../../types/outcome-ledger.js";
import type { SopProfile } from "../../types/sop.js";
import { msg } from "../i18n.js";
import { classifyEntry } from "../outcome/outcome-activation.js";
import { readOutcomeLedger } from "../outcome/outcome-ledger-store.js";
import { requiresOutcome } from "../outcome/pin.js";

// SOP 0.9.0 (AM-016) P3 §3.3 — the VERIFY→SHIP outcome guard. Sibling of
// task-ledger-guard (NOT folded into advance-state). 3-way (A-M4): block the
// honest gap (due UNMEASURED / NO_EVIDENCE, unwaived), WARN-but-pass a measured
// failure (OCN sells discipline, not success — a FAIL forces a visible human
// decision, it never blocks), else pass. PURE — the caller supplies the ledger
// + the profile's state order + the target cursor state.

const MAX_IDS = 6;

export type OutcomeGuardResult =
  | { readonly kind: "pass" }
  | { readonly kind: "warn"; readonly message: BilingualMessage; readonly acIds: readonly string[] }
  | {
      readonly kind: "block";
      readonly message: BilingualMessage;
      readonly acIds: readonly string[];
    };

function preview(ids: readonly string[]): string {
  const shown = ids.slice(0, MAX_IDS).join(", ");
  const more = ids.length - Math.min(ids.length, MAX_IDS);
  return more > 0 ? `${shown} (+${more} more)` : shown;
}

export function evaluateOutcomeGuard(
  ledger: OutcomeLedger | null,
  stateOrder: readonly string[],
  targetStateId: string,
): OutcomeGuardResult {
  if (ledger === null) return { kind: "pass" }; // no outcome backbone → legacy pass-through
  const blocking: string[] = [];
  const failed: string[] = [];
  for (const entry of ledger.entries) {
    const cls = classifyEntry(entry, stateOrder, targetStateId);
    if (cls === "blocking") blocking.push(entry.acId);
    else if (cls === "measured_fail") failed.push(entry.acId);
  }
  if (blocking.length > 0) {
    return {
      kind: "block",
      acIds: blocking,
      message: msg(
        `Advance blocked: ${blocking.length} due outcome AC(s) unmeasured — ${preview(blocking)}. Run \`ocn outcome check <ac-id>\` (or waive with a decision), then advance.`,
        `推进被阻：${blocking.length} 条到期效果 AC 尚未测量——${preview(blocking)}。请先 \`ocn outcome check <ac-id>\`（或带决策豁免），再推进。`,
      ),
    };
  }
  if (failed.length > 0) {
    return {
      kind: "warn",
      acIds: failed,
      message: msg(
        `Outcome check: ${failed.length} AC(s) measured FAIL — ${preview(failed)}. This does not block advance. Decide: carry a real number into the next round (cycle/rewind), or record acceptance with \`ocn outcome waive --dec\`.`,
        `效果核对：${failed.length} 条 AC 实测未达标——${preview(failed)}。这不阻塞推进。请决策：带实测数字进入下一轮（cycle/rewind），或用 \`ocn outcome waive --dec\` 记录接受降级。`,
      ),
    };
  }
  return { kind: "pass" };
}

/** Advance-flow shell: dormant below a 0.9.0 pin (byte-identical <0.9.0).
 *  P3 acts on the BLOCK path; the MEASURED_FAIL warn is surfaced when P4 wires
 *  the live SHIP boundary. Returns a block descriptor or null. */
export async function outcomeLedgerGuardOrNull(
  cwd: string,
  profile: SopProfile,
  targetStateId: string,
): Promise<{ readonly message: BilingualMessage; readonly acIds: readonly string[] } | null> {
  if (!requiresOutcome(profile.version)) return null;
  const ledger = await readOutcomeLedger(cwd);
  const result = evaluateOutcomeGuard(ledger, profile.stateOrder, targetStateId);
  return result.kind === "block" ? { message: result.message, acIds: result.acIds } : null;
}
