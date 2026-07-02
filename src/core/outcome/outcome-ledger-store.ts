import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import type { AcceptanceSpecV2 } from "../../types/acceptance-spec.js";
import {
  OutcomeLedger,
  type OutcomeLedgerEntry,
  type OutcomeMeasuredData,
  type OutcomeMeasurement,
} from "../../types/outcome-ledger.js";
import { verifyHashOf } from "../task/task-ledger-store.js";
import { nowIsoUtc } from "../time.js";
import { Paths } from "../paths.js";
import { withLock } from "../state/lock.js";

// SOP 0.9.0 (AM-016) — `.ocoding/outcome-ledger.json` store. Unlike the task /
// acceptance stores (lock-less temp+rename), this uses the REAL state-store
// lock + backup: `appendMeasurement` is a read-modify-write that phase-2 auto
// mode can drive concurrently, so a lost update is a live risk (invariant §1.2).

function ledgerLockOpts(root: string) {
  return {
    lockFile: join(Paths.ocodingDir(root), ".lock"),
    command: "outcomeLedger",
    projectRoot: root,
  };
}

async function writeLedgerUnlocked(root: string, ledger: OutcomeLedger): Promise<void> {
  const file = Paths.outcomeLedgerFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  try {
    await fs.copyFile(file, `${file}.bak`);
  } catch {
    /* no prior ledger — nothing to back up */
  }
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(ledger, null, 2) + "\n", "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

export async function readOutcomeLedger(root: string): Promise<OutcomeLedger | null> {
  let text: string;
  try {
    text = await fs.readFile(Paths.outcomeLedgerFile(root), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = OutcomeLedger.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeOutcomeLedger(root: string, ledger: OutcomeLedger): Promise<void> {
  await withLock(ledgerLockOpts(root), async () => {
    await writeLedgerUnlocked(root, ledger);
  });
}

export class OutcomeEntryNotFoundError extends Error {
  constructor(public readonly acId: string) {
    super(`no outcome ledger entry for ${acId}`);
    this.name = "OutcomeEntryNotFoundError";
  }
}

export interface AppendPlan {
  readonly measurement: OutcomeMeasurement;
  readonly auditData: OutcomeMeasuredData;
}

/**
 * Read-modify-write of one AC's history inside the store lock. Ordering
 * (invariant §1.3): the caller's `commitAudit` appends the `outcome_measured`
 * event BEFORE the ledger rename — a non-swallowing write whose success gates
 * the rename (arch M2). `make` receives the monotonic `seq` and the prior
 * event-chain hash so the audit event links the trust root.
 */
export async function appendMeasurement(
  root: string,
  acId: string,
  make: (ctx: { seq: number; prevEventHash: string }) => Promise<AppendPlan>,
  commitAudit: (auditData: OutcomeMeasuredData) => Promise<void>,
  readPrevHash: () => Promise<string>,
): Promise<OutcomeMeasurement> {
  return withLock(ledgerLockOpts(root), async () => {
    const ledger = await readOutcomeLedger(root);
    if (ledger === null) throw new OutcomeEntryNotFoundError(acId);
    const idx = ledger.entries.findIndex((e) => e.acId === acId);
    if (idx === -1) throw new OutcomeEntryNotFoundError(acId);
    const entry = ledger.entries[idx]!;
    const seq = entry.history.length; // monotonic: next index
    // Chain head read INSIDE the lock so concurrent appends can't fork the chain.
    const prevEventHash = await readPrevHash();
    const plan = await make({ seq, prevEventHash });
    await commitAudit(plan.auditData); // audit-first, throws on failure → no rename
    const nextEntry: OutcomeLedgerEntry = {
      ...entry,
      history: [...entry.history, plan.measurement],
    };
    const nextEntries = ledger.entries.map((e, i) => (i === idx ? nextEntry : e));
    await writeLedgerUnlocked(root, { ...ledger, entries: nextEntries, generatedAt: nowIsoUtc() });
    return plan.measurement;
  });
}

/** Set / update a per-AC waiver (human-only). */
export async function setOutcomeWaiver(
  root: string,
  acId: string,
  waiver: OutcomeLedgerEntry["waived"],
): Promise<void> {
  await withLock(ledgerLockOpts(root), async () => {
    const ledger = (await readOutcomeLedger(root)) ?? emptyLedger();
    const has = ledger.entries.some((e) => e.acId === acId);
    if (!has) throw new OutcomeEntryNotFoundError(acId);
    const entries = ledger.entries.map((e) =>
      e.acId === acId ? { ...e, ...(waiver !== undefined ? { waived: waiver } : {}) } : e,
    );
    await writeLedgerUnlocked(root, { ...ledger, entries, generatedAt: nowIsoUtc() });
  });
}

/** Project-level no-outcome waiver (human-only). Seeds an empty ledger if none
 *  exists yet — a pure-build project can still record the escape hatch. */
export async function setNoOutcomeWaiver(
  root: string,
  waiver: NonNullable<OutcomeLedger["noOutcomeWaiver"]>,
): Promise<void> {
  await withLock(ledgerLockOpts(root), async () => {
    const ledger = (await readOutcomeLedger(root)) ?? emptyLedger();
    await writeLedgerUnlocked(root, {
      ...ledger,
      noOutcomeWaiver: waiver,
      generatedAt: nowIsoUtc(),
    });
  });
}

function emptyLedger(): OutcomeLedger {
  return { version: 1, generatedAt: nowIsoUtc(), entries: [] };
}

/**
 * Freeze contracts as a side-effect of the acceptance gate passing (invariant
 * §8 — no `ocn outcome freeze` command). For each outcome spec, seed an entry
 * whose `contractHash = verifyHashOf(measure.command)`; carry existing history
 * ONLY when the contract hash is unchanged (an edited command resets to
 * UNMEASURED — the referee changed, mirroring the task ledger). Build-only docs
 * touch nothing (returns without writing when there are no outcome specs).
 */
export function reconcileFrozenContracts(
  specs: readonly AcceptanceSpecV2[],
  prev: OutcomeLedger | null,
): OutcomeLedger | null {
  const outcomeSpecs = specs.filter((s) => s.kind === "outcome");
  if (outcomeSpecs.length === 0) return null;
  const prevById = new Map((prev?.entries ?? []).map((e) => [e.acId, e]));
  const entries: OutcomeLedgerEntry[] = outcomeSpecs.map((s) => {
    const contractHash = verifyHashOf(s.measure.command);
    const carried = prevById.get(s.id);
    const keepHistory = carried !== undefined && carried.contractHash === contractHash;
    return {
      acId: s.id,
      contractHash,
      due: s.measure.due,
      history: keepHistory ? carried.history : [],
      ...(keepHistory && carried.waived !== undefined ? { waived: carried.waived } : {}),
    };
  });
  return {
    version: 1,
    generatedAt: nowIsoUtc(),
    entries,
    ...(prev?.noOutcomeWaiver !== undefined ? { noOutcomeWaiver: prev.noOutcomeWaiver } : {}),
  };
}
