import { readOutcomeLedger } from "./outcome/outcome-ledger-store.js";
import { latestVerdict } from "./outcome/outcome-verdict.js";

// SOP 0.9.0 (AM-017) P3 §3.5 — the outcome "reality-contact" dashboard, extracted
// so brief.ts stays under 300 lines. Read-only: verdict COUNTS + freshness (days
// since the most recent measurement across all ACs). Deliberately NO synthetic
// "health score" — that would be a heuristic and a new Goodhart target.

export interface OutcomeBriefSummary {
  readonly total: number;
  readonly unmeasured: number;
  readonly measuredPass: number;
  readonly measuredFail: number;
  readonly noEvidence: number;
  readonly waived: number;
  /** Days since the freshest measurement across all ACs; null if never measured. */
  readonly daysSinceFreshest: number | null;
}

function daysSince(iso: string | undefined, now: number): number | null {
  if (iso === undefined) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 86_400_000));
}

/** Returns undefined when no outcome ledger exists (pre-0.9.0 / build-only). */
export async function summarizeOutcome(
  cwd: string,
  now: number,
): Promise<OutcomeBriefSummary | undefined> {
  const ledger = await readOutcomeLedger(cwd);
  if (ledger === null) return undefined;
  const s = { total: 0, unmeasured: 0, measuredPass: 0, measuredFail: 0, noEvidence: 0, waived: 0 };
  let freshest: number | null = null;
  for (const e of ledger.entries) {
    s.total++;
    if (e.waived !== undefined) s.waived++;
    const v = latestVerdict(e);
    if (v === "UNMEASURED") s.unmeasured++;
    else if (v === "MEASURED_PASS") s.measuredPass++;
    else if (v === "MEASURED_FAIL") s.measuredFail++;
    else s.noEvidence++;
    const d = daysSince(e.history.at(-1)?.measuredAt, now);
    if (d !== null) freshest = freshest === null ? d : Math.min(freshest, d);
  }
  return { ...s, daysSinceFreshest: freshest };
}
