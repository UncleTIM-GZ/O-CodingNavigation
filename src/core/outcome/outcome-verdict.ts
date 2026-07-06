import type { OutcomeLedgerEntry, OutcomeVerdict } from "../../types/outcome-ledger.js";

// SOP 0.9.0 (AM-017) — the computed verdict layer. UNMEASURED is NOT a stored
// enum value; it is the absence of any history entry. "Latest" is the LAST
// array element (append order), never max(measuredAt) — a forged future
// timestamp must not be able to jump the queue (invariant §1.5).

/** UNMEASURED (empty history) ∪ the three stored verdicts. */
export type ComputedVerdict = "UNMEASURED" | OutcomeVerdict;

export function latestVerdict(entry: OutcomeLedgerEntry): ComputedVerdict {
  const last = entry.history.at(-1);
  return last === undefined ? "UNMEASURED" : last.verdict;
}

/** Would this AC block a forward move past its due state? Blocks the honest
 *  gap (unmeasured / no-evidence), never a measured failure — OCN sells
 *  discipline, not success (invariant §6). A waived AC never blocks. */
export function blocksAdvance(entry: OutcomeLedgerEntry): boolean {
  if (entry.waived !== undefined) return false;
  const v = latestVerdict(entry);
  switch (v) {
    case "UNMEASURED":
    case "NO_EVIDENCE":
      return true;
    case "MEASURED_PASS":
    case "MEASURED_FAIL":
      return false;
    default: {
      const _exhaustive: never = v;
      return _exhaustive;
    }
  }
}
