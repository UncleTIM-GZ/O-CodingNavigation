import type { OutcomeLedgerEntry } from "../../types/outcome-ledger.js";
import { blocksAdvance, latestVerdict } from "./outcome-verdict.js";

// SOP 0.9.0 (AM-016) P3 §3.2 — precise activation (AM-014 precedent). An
// outcome AC is enforced only from its `due` state onward; before that it is
// DEFERRED (non-blocking, "forthcoming"). Fail-safe: an unresolvable due state
// (not in the profile's state order) enforces from gate 1 — never "never due".

/** Has the cursor at `atStateId` reached (or passed) `dueStateId`? */
export function dueReached(
  stateOrder: readonly string[],
  atStateId: string,
  dueStateId: string,
): boolean {
  const dueIdx = stateOrder.indexOf(dueStateId);
  if (dueIdx === -1) return true; // unresolvable due → fail-safe: enforce now
  const atIdx = stateOrder.indexOf(atStateId);
  if (atIdx === -1) return true; // unknown cursor → enforce (don't silently skip)
  return atIdx >= dueIdx;
}

export type EntryActivation = "deferred" | "blocking" | "measured_fail" | "ok";

/** Classify one entry for a cursor at `atStateId` (activation + verdict). */
export function classifyEntry(
  entry: OutcomeLedgerEntry,
  stateOrder: readonly string[],
  atStateId: string,
): EntryActivation {
  if (!dueReached(stateOrder, atStateId, entry.due)) return "deferred";
  if (blocksAdvance(entry)) return "blocking";
  if (entry.waived === undefined && latestVerdict(entry) === "MEASURED_FAIL") {
    return "measured_fail";
  }
  return "ok";
}
