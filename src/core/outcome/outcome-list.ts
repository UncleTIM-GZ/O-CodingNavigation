import type { CommandResult } from "../../types/result.js";
import { msg } from "../i18n.js";
import { ok } from "../result.js";
import { readOutcomeLedger } from "./outcome-ledger-store.js";
import { latestVerdict, type ComputedVerdict } from "./outcome-verdict.js";

// SOP 0.9.0 (AM-016) — `ocn outcome list` (pull-mode, NO audit — §4.7 parity
// with `task list`). Read-only projection of the outcome ledger: per-AC
// computed verdict + days since last measurement + waived flag. No synthetic
// "health score" — just the verdict counts and freshness (invariant §3.5).

export interface OutcomeListRow {
  readonly acId: string;
  readonly verdict: ComputedVerdict;
  readonly daysSinceMeasure: number | null;
  readonly waived: boolean;
}

export interface OutcomeListData {
  readonly command: "outcome.list";
  readonly rows: readonly OutcomeListRow[];
  readonly noOutcomeWaiver: boolean;
}

function daysSince(iso: string | undefined, now: number): number | null {
  if (iso === undefined) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

export async function listOutcomes(opts: { cwd: string }): Promise<CommandResult<OutcomeListData>> {
  const ledger = await readOutcomeLedger(opts.cwd);
  if (ledger === null) {
    return ok(
      msg(
        "No outcome ledger yet (no outcome AC frozen). Add a kind: outcome AC to docs/03 and pass `ocn check`.",
        "尚无效果台账（未冻结任何效果 AC）。在 docs/03 加一条 kind: outcome 的 AC 并通过 `ocn check`。",
      ),
      { command: "outcome.list", rows: [], noOutcomeWaiver: false } satisfies OutcomeListData,
    );
  }
  const now = Date.now();
  const rows: OutcomeListRow[] = ledger.entries.map((e) => ({
    acId: e.acId,
    verdict: latestVerdict(e),
    daysSinceMeasure: daysSince(e.history.at(-1)?.measuredAt, now),
    waived: e.waived !== undefined,
  }));
  return ok(
    msg(
      `Outcome ledger: ${rows.length} AC(s).`,
      `效果台账：${rows.length} 条效果 AC。`,
    ),
    {
      command: "outcome.list",
      rows,
      noOutcomeWaiver: ledger.noOutcomeWaiver !== undefined,
    } satisfies OutcomeListData,
  );
}
