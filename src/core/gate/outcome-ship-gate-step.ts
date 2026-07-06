import type { BilingualMessage } from "../../types/i18n.js";
import type { SopProfile } from "../../types/sop.js";
import { msg } from "../i18n.js";
import { evaluateOutcomeGuard } from "../advance/outcome-ledger-guard.js";
import { docsOutcomeSpecs } from "../outcome/outcome-contract-source.js";
import { reconcileLedgerWithAudit } from "../outcome/outcome-integrity.js";
import { readOutcomeLedger } from "../outcome/outcome-ledger-store.js";
import { requiresOutcome } from "../outcome/pin.js";

// SOP 0.9.0 (AM-017) P4b §C — the SHIP gate for `step_release`. `step_release`
// has NO required artifact, so the gate runner would auto-pass it in the
// null-artifact branch; this closure is called there (and, defensively, in the
// normal-pass path) with an internal `state_ship` self-guard — mirroring the
// readinessOrNull / contractDriftOrNull cross-cutting idiom. Discriminated
// kinds {skip|pass|io_error|blocked} so the runner maps exit codes centrally.
//
// C-3 (CRITICAL) — the gate must NOT trust ledger *presence*. Three code paths
// treat `ledger === null` as "legacy pass" (no outcome backbone). A project that
// FROZE outcome contracts at SPEC and then had `.ocoding/outcome-ledger.json`
// deleted or corrupted would otherwise ship silently — the sixth false-
// completion class, bypassed by removing one file. So the SHIP gate first
// consults an INDEPENDENT trust source (the frozen acceptance projection): if
// outcome ACs are known to exist but the ledger is null/invalid → blocked.

export type ShipGateResult =
  | { readonly kind: "skip" }
  | { readonly kind: "pass"; readonly message: BilingualMessage }
  | { readonly kind: "io_error"; readonly message: BilingualMessage }
  | { readonly kind: "blocked"; readonly message: BilingualMessage; readonly reason: string };

export interface ShipGateStepOptions {
  readonly cwd: string;
  readonly profile: SopProfile;
  readonly currentStateId: string;
}

export async function runOutcomeShipGateStep(opts: ShipGateStepOptions): Promise<ShipGateResult> {
  // Self-guard: only SHIP, only a 0.9.0+ pin (byte-identical dormant below).
  if (opts.currentStateId !== "state_ship") return { kind: "skip" };
  if (!requiresOutcome(opts.profile.version)) return { kind: "skip" };

  try {
    // Anchor "were outcomes expected?" on docs/03 — the canonical human contract
    // OUTSIDE .ocoding, kept across cycle new. A file-tampering attacker can
    // delete the derived `.ocoding` projection AND ledger; they cannot make
    // docs/03's frozen outcome ACs vanish without the acceptance gate re-freezing
    // to a genuinely outcome-free contract next round (review Findings 1 & 2).
    const contractSpecs = await docsOutcomeSpecs(opts.cwd, opts.profile);
    const outcomeExpected = contractSpecs.length > 0;
    const ledger = await readOutcomeLedger(opts.cwd);

    // C-3 — outcome contracts are declared, but the ledger is gone/corrupt.
    if (outcomeExpected && ledger === null) {
      return {
        kind: "blocked",
        reason: "outcome_ledger_missing",
        message: msg(
          "Ship blocked: docs/03 declares outcome AC(s) but `.ocoding/outcome-ledger.json` is missing or unreadable. Restore it or re-freeze via the acceptance gate, then run `ocn outcome check`.",
          "发布被阻：docs/03 声明了效果 AC，但 `.ocoding/outcome-ledger.json` 缺失或损坏。请恢复该文件或经验收门重新冻结，再执行 `ocn outcome check`。",
        ),
      };
    }

    // No outcome backbone at all (no declared outcome AC and no ledger) → nothing
    // to enforce at SHIP; pass. (An absent ledger with outcomeExpected was already
    // blocked above.)
    if (ledger === null) {
      return { kind: "pass", message: shipPassMessage() };
    }

    // Tamper / drift against the never-archived audit trust root. Run WHENEVER a
    // ledger exists (not gated on the deletable projection — Finding 1): the
    // chain + measurementId-membership checks are projection-independent; the
    // contract-drift arm uses docs/03's specs.
    const breach = await reconcileLedgerWithAudit(opts.cwd, contractSpecs);
    if (breach !== null) {
      return {
        kind: "blocked",
        reason: `outcome_integrity_${breach.kind}`,
        message: msg(
          `Ship blocked: outcome ledger integrity breach (${breach.kind}, ${breach.acId}). ${breach.detail}`,
          `发布被阻：效果台账完整性异常（${breach.kind}，${breach.acId}）。${breach.detail}`,
        ),
      };
    }

    // Due unmeasured (block) OR unwaived MEASURED_FAIL (warn at advance, but a
    // HARD block at SHIP — "carry a real number, or waive with a decision,
    // before you release"). classifyEntry already treats a waived FAIL as ok.
    const guard = evaluateOutcomeGuard(ledger, opts.profile.stateOrder, "state_ship");
    if (guard.kind === "block") {
      return { kind: "blocked", reason: "outcome_unmeasured", message: guard.message };
    }
    if (guard.kind === "warn") {
      return {
        kind: "blocked",
        reason: "outcome_measured_fail_undecided",
        message: msg(
          `Ship blocked: ${guard.acIds.length} outcome AC(s) measured FAIL and are not waived. Before release, either carry a real number into the next round (\`ocn cycle new\` / \`ocn rewind\`) or record acceptance with \`ocn outcome waive --dec\`.`,
          `发布被阻：${guard.acIds.length} 条效果 AC 实测未达标且未豁免。发布前请：带实测数字进入下一轮（\`ocn cycle new\` / \`ocn rewind\`），或用 \`ocn outcome waive --dec\` 记录接受。`,
        ),
      };
    }
    return { kind: "pass", message: shipPassMessage() };
  } catch (err) {
    return {
      kind: "io_error",
      message: msg(
        `Ship gate could not evaluate the outcome ledger: ${(err as Error).message}`,
        `发布门无法评估效果台账：${(err as Error).message}`,
      ),
    };
  }
}

function shipPassMessage(): BilingualMessage {
  return msg(
    "Ship gate passed: every due outcome AC is measured (or waived with a decision).",
    "发布门通过：每条到期效果 AC 均已测量（或带决策豁免）。",
  );
}
