import { promises as fs } from "node:fs";
import type { AcceptanceSpecV2 } from "../../types/acceptance-spec.js";
import { OutcomeMeasuredData } from "../../types/outcome-ledger.js";
import { AuditPaths } from "../audit/audit-paths.js";
import { verifyHashOf } from "../task/task-ledger-store.js";
import { canonicalOutcomeEventHash } from "./outcome-hash.js";
import { readOutcomeLedger } from "./outcome-ledger-store.js";

// SOP 0.9.0 (AM-017) — the integrity reconcile. The NEVER-archived, chained
// `outcome_measured` audit subset is the trust root; the ledger is the
// attacker-editable projection. A breach = the ledger claims a measurement the
// (chain-verified) audit does not corroborate. Design (review synthesis):
//   • verify the chain over the whole outcome_measured subset (prevEventHash) —
//     a tail truncation / interior deletion breaks it (DI-H2, Sec-H1).
//   • measurementId-SET membership, scoped to the CURRENT round (scan back to
//     the last cycle_started) — NOT last-vs-last + count, which false-alarms on
//     honest crashes and after `cycle new` (DI-H1/H3/M6).
//   • ledger holds an id absent from audit ⇒ breach (ledger ahead); audit holds
//     trailing ids absent from the ledger ⇒ abandoned (recoverable, not breach).
//   • contractHash drift vs the live projection ⇒ breach (re-freeze required).

export interface IntegrityBreach {
  readonly kind: "chain_broken" | "ledger_ahead" | "field_mismatch" | "contract_drift";
  readonly acId: string;
  readonly detail: string;
}

interface OutcomeEvent {
  readonly data: OutcomeMeasuredData;
  /** index of the last cycle_started at-or-before this event (round scope). */
  readonly round: number;
}

async function readAuditLines(root: string): Promise<string[]> {
  let text: string;
  try {
    text = await fs.readFile(AuditPaths.jsonlFile(root), "utf8");
  } catch {
    return [];
  }
  return text.split("\n").filter((l) => l.trim().length > 0);
}

/** Parse the ordered outcome_measured events + verify the chain. A torn final
 *  line is skipped (DI-H5), not thrown on. Returns a chain break as a breach. */
async function readChainedOutcomeEvents(
  root: string,
): Promise<{ events: OutcomeEvent[]; breach: IntegrityBreach | null }> {
  const lines = await readAuditLines(root);
  const events: OutcomeEvent[] = [];
  let round = 0;
  let prevHash = "";
  for (let i = 0; i < lines.length; i++) {
    let obj: { eventType?: unknown; data?: unknown };
    try {
      obj = JSON.parse(lines[i]!);
    } catch {
      if (i === lines.length - 1) continue; // torn trailing line — tolerate
      continue; // a non-JSON interior line isn't ours to police
    }
    if (obj.eventType === "cycle_started") round++;
    if (obj.eventType !== "outcome_measured") continue;
    const parsed = OutcomeMeasuredData.safeParse(obj.data);
    if (!parsed.success) {
      return { events, breach: breach("chain_broken", "?", "malformed outcome_measured event") };
    }
    if (parsed.data.prevEventHash !== prevHash) {
      return {
        events,
        breach: breach("chain_broken", parsed.data.acId, "outcome audit chain broken (truncation/insert)"),
      };
    }
    prevHash = canonicalOutcomeEventHash(parsed.data);
    events.push({ data: parsed.data, round });
  }
  return { events, breach: null };
}

function breach(kind: IntegrityBreach["kind"], acId: string, detail: string): IntegrityBreach {
  return { kind, acId, detail };
}

/** The prevEventHash a NEW outcome_measured event must carry = the canonical
 *  hash of the latest chained event ("" if none). */
export async function lastOutcomeEventHash(root: string): Promise<string> {
  const { events } = await readChainedOutcomeEvents(root);
  const last = events.at(-1);
  return last === undefined ? "" : canonicalOutcomeEventHash(last.data);
}

function fieldsMatch(a: OutcomeMeasuredData, b: OutcomeMeasuredData): boolean {
  return (
    a.value === b.value &&
    a.verdict === b.verdict &&
    a.commandHash === b.commandHash &&
    a.probeEntryHash === b.probeEntryHash &&
    a.evidenceHash === b.evidenceHash
  );
}

/**
 * Reconcile the ledger against the chained audit + live projection.
 * `null` = consistent. Only current-round events (the max round seen) are the
 * canonical set the ledger's live history is compared against.
 */
export async function reconcileLedgerWithAudit(
  root: string,
  specs: readonly AcceptanceSpecV2[],
): Promise<IntegrityBreach | null> {
  const ledger = await readOutcomeLedger(root);
  if (ledger === null) return null; // nothing frozen yet
  const { events, breach: chainBreach } = await readChainedOutcomeEvents(root);
  if (chainBreach !== null) return chainBreach;

  const currentRound = events.reduce((m, e) => Math.max(m, e.round), 0);
  const byId = new Map<string, OutcomeMeasuredData>();
  for (const e of events) {
    if (e.round === currentRound) byId.set(e.data.measurementId, e.data);
  }

  const contractById = new Map(
    specs.filter((s) => s.kind === "outcome").map((s) => [s.id, verifyHashOf(s.measure.command)]),
  );

  for (const entry of ledger.entries) {
    const liveHash = contractById.get(entry.acId);
    if (liveHash !== undefined && liveHash !== entry.contractHash) {
      return breach("contract_drift", entry.acId, "frozen contract hash differs from docs/03");
    }
    for (const m of entry.history) {
      const audited = byId.get(m.measurementId);
      if (audited === undefined) {
        return breach("ledger_ahead", entry.acId, `measurement ${m.measurementId} not in audit`);
      }
      const asData: OutcomeMeasuredData = {
        acId: entry.acId,
        measurementId: m.measurementId,
        seq: m.seq,
        verdict: m.verdict,
        value: m.value,
        commandHash: m.commandHash,
        probeEntryHash: m.probeEntryHash,
        evidenceHash: m.evidenceHash,
        prevEventHash: audited.prevEventHash,
      };
      if (!fieldsMatch(asData, audited)) {
        return breach("field_mismatch", entry.acId, `measurement ${m.measurementId} differs from audit`);
      }
    }
  }
  return null;
}
