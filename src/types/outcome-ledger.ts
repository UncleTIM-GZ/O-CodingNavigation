import { z } from "zod";

// SOP 0.9.0 (AM-017 / DEC-043) — Outcome Backbone｜效果主干 P2.
//
// `.ocoding/outcome-ledger.json` — the per-AC measurement history. zod is the
// single source of truth AND the integrity boundary: `readOutcomeLedger`
// safeParses (never a raw `as`), so a malformed / hand-corrupted ledger is
// caught at the door. Design corrections folded in from the P2–P4 review
// synthesis (docs/plans/2026-07-02-feat-outcome-backbone-p2-p4-execution-plan.md):
//
//   • verdict stores 3 states; UNMEASURED = empty history (computed, not stored).
//   • value===null ⟺ NO_EVIDENCE, and MEASURED_* ⟹ evidenceHash!=="" — enforced
//     at PARSE via superRefine, so a hand-edited desync is rejected, not caught
//     late (TS-H4).
//   • NO in-file `prevEntryHash` chain: it lives inside the attacker-editable
//     file so it has zero adversarial value (Simplicity-#1). The real trust
//     root is the CHAINED `outcome_measured` audit subset (`OutcomeMeasuredData`
//     + prevEventHash). A free write-time monotonic `seq` catches accidental
//     truncation.

const ISO_UTC = z.string().regex(/Z$/, "measuredAt must be ISO 8601 UTC ending Z");
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const STATE_ID_RE = /^state_/;
/** A frozen command / probe-entry / evidence hash: sha256 hex, or "" for the
 *  sentinels (evidenceHash "" ⟺ zero-hit; probeEntryHash "" ⟺ unresolved). */
const HashOrEmpty = z.union([z.string().regex(SHA256_RE), z.literal("")]);

/** Stored verdicts. UNMEASURED is a COMPUTED state (empty history), never an
 *  enum member — see `latestVerdict` in core/outcome/outcome-verdict.ts. */
export const OutcomeVerdict = z.enum(["NO_EVIDENCE", "MEASURED_PASS", "MEASURED_FAIL"]);
export type OutcomeVerdict = z.infer<typeof OutcomeVerdict>;

/** A single evidence file's fingerprint. NO mtime — it's forgeable and a plain
 *  `git checkout` flips it, producing false drift (security review). */
export const EvidenceFile = z
  .object({
    path: z.string().min(1),
    sha256: z.string().regex(SHA256_RE),
    bytes: z.number().int().nonnegative(),
  })
  .strict();
export type EvidenceFile = z.infer<typeof EvidenceFile>;

/** One appended measurement. `seq` is the 0-based position in the acId's
 *  history (monotonic; a truncation shows as a gap). */
export const OutcomeMeasurement = z
  .object({
    measuredAt: ISO_UTC,
    seq: z.number().int().nonnegative(),
    verdict: OutcomeVerdict,
    value: z.number().finite().nullable(), // null ⟺ NO_EVIDENCE (superRefine)
    commandHash: z.string().regex(SHA256_RE), // frozen measure.command at measure time
    probeEntryHash: HashOrEmpty, // probe program entry file (伪造留痕); "" ⟺ unresolved
    evidenceHash: HashOrEmpty, // merged source snapshot; "" ⟺ zero-hit
    evidenceFiles: z.array(EvidenceFile),
    durationMs: z.number().int().nonnegative(),
    measurementId: z.string().regex(ULID_RE), // pairs with the outcome_measured audit event
  })
  .strict()
  .superRefine((m, ctx) => {
    const noEvidence = m.verdict === "NO_EVIDENCE";
    if (noEvidence !== (m.value === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "value===null must hold iff verdict===NO_EVIDENCE",
        path: ["value"],
      });
    }
    if (!noEvidence && m.evidenceHash === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "a MEASURED_* verdict requires a non-empty evidenceHash (zero-hit ⇒ NO_EVIDENCE)",
        path: ["evidenceHash"],
      });
    }
  });
export type OutcomeMeasurement = z.infer<typeof OutcomeMeasurement>;

/** The typed `data` payload of an `outcome_measured` audit event — the chained
 *  trust root. Written and re-read via safeParse (never `as`); a parse failure
 *  of a historical event is itself a breach signal. Deliberately small (no
 *  evidenceFiles) to stay under MAX_AUDIT_LINE_BYTES. `prevEventHash` chains the
 *  whole outcome_measured subset so a tail truncation / interior deletion in the
 *  never-archived JSONL is detectable. */
export const OutcomeMeasuredData = z
  .object({
    acId: z.string().min(1),
    measurementId: z.string().regex(ULID_RE),
    seq: z.number().int().nonnegative(),
    verdict: OutcomeVerdict,
    value: z.number().finite().nullable(),
    commandHash: z.string().regex(SHA256_RE),
    probeEntryHash: HashOrEmpty,
    evidenceHash: HashOrEmpty,
    /** sha256 of the prior outcome_measured event's canonical form; "" for the
     *  first ever outcome measurement. */
    prevEventHash: HashOrEmpty,
  })
  .strict();
export type OutcomeMeasuredData = z.infer<typeof OutcomeMeasuredData>;

/** An escape hatch. `dec` is only a REFERENCE — the gate re-verifies the DEC
 *  exists in docs/20 every run (readiness waive-with-probe precedent). */
export const OutcomeWaiver = z
  .object({
    dec: z.string().min(1),
    reason: z.string().min(1),
    at: ISO_UTC,
  })
  .strict();
export type OutcomeWaiver = z.infer<typeof OutcomeWaiver>;

export const OutcomeLedgerEntry = z
  .object({
    acId: z.string().min(1),
    contractHash: z.string().regex(SHA256_RE), // frozen verifyHashOf(measure.command)
    due: z.string().regex(STATE_ID_RE), // AM-014 dueState; enforce from here on
    history: z.array(OutcomeMeasurement), // append-only; last element = current verdict
    waived: OutcomeWaiver.optional(), // live state (reset on cycle new), NOT frozen contract
  })
  .strict();
export type OutcomeLedgerEntry = z.infer<typeof OutcomeLedgerEntry>;

export const OutcomeLedger = z
  .object({
    version: z.literal(1),
    generatedAt: ISO_UTC,
    entries: z.array(OutcomeLedgerEntry),
    noOutcomeWaiver: OutcomeWaiver.optional(), // project-level no-outcome escape (P3 SPEC gate)
  })
  .strict();
export type OutcomeLedger = z.infer<typeof OutcomeLedger>;
