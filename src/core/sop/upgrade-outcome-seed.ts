import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { SopProfile } from "../../types/sop.js";
import { evaluateAcceptanceSpecs } from "../acceptance/acceptance-gate.js";
import {
  readOutcomeLedger,
  reconcileFrozenContracts,
  writeLedgerUnlocked,
} from "../outcome/outcome-ledger-store.js";
import { requiresOutcome } from "../outcome/pin.js";

// SOP 0.9.0 (AM-017 / DEC-043) §F — `ocn sop upgrade` outcome-ledger seed.
//
// A project upgraded past `step_acceptance_criteria` never re-runs the
// acceptance gate, so its outcome contracts are never frozen — a VERIFY→SHIP
// walk then hits the C-3 "missing ledger" block with no way to `ocn outcome
// check`. This seeds the ledger at upgrade time from the already-authored
// docs/03, mirroring the gate's freeze side-effect.
//
// Ordering + reentrancy invariants (drive-plan §F / H-1) — the caller runs this
// INSIDE the upgrade critical section, BEFORE moving the pin:
//   1. snapshots → seed → pin. Pin-before-seed would let a failed retry hit the
//      same-version noop guard and never seed again (→ 0.9.0 pin, no ledger, C-3).
//   2. Projection capability comes from the TARGET `profile`, not the persisted
//      (still-old) pin — else the pin-aware projection emits v1 and seeds nothing.
//   3. `writeLedgerUnlocked` (the caller holds `.ocoding/.lock`; the public
//      `writeOutcomeLedger` re-locks the same lock → self-deadlock).
//   4. Skip only when an existing ledger PARSES (non-null) — a corrupt file is
//      re-seeded, not preserved.

/** Seed `.ocoding/outcome-ledger.json` from docs/03 when the target profile is
 *  outcome-capable and docs/03 declares ≥1 well-formed outcome AC. No-op (never
 *  throws on absence / defects / build-only docs): the acceptance gate re-freezes
 *  on any later re-run, so a skipped seed is recoverable, a wrong seed is not.
 *  Only genuine IO failures (write errors) propagate — the caller aborts the
 *  upgrade before moving the pin. */
export async function seedOutcomeLedgerUnlocked(cwd: string, profile: SopProfile): Promise<void> {
  if (!requiresOutcome(profile.version)) return;
  // Idempotent: a valid ledger already covers this project.
  if ((await readOutcomeLedger(cwd)) !== null) return;

  const relArtifact = profile.artifactPathForStep("step_acceptance_criteria");
  if (relArtifact === null) return;

  let content: string;
  try {
    content = await fs.readFile(join(cwd, relArtifact), "utf8");
  } catch {
    return; // no docs/03 → nothing to seed
  }

  // Build the v2 projection with the TARGET profile's capability (invariant #2).
  const outcome = evaluateAcceptanceSpecs(content, requiresOutcome(profile.version));
  // Structural defects → leave it to the acceptance gate to surface on re-run.
  if (!outcome.ok || outcome.projection === undefined || outcome.projection.version !== 2) return;

  const ledger = reconcileFrozenContracts(outcome.projection.items, null);
  if (ledger === null) return; // build-only projection, no outcome specs

  await writeLedgerUnlocked(cwd, ledger); // IO error here propagates → caller aborts
}
