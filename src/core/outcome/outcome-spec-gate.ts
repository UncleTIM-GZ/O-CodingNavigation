import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AcceptanceProjection, AcceptanceSpecV2 } from "../../types/acceptance-spec.js";
import type { OutcomeWaiver } from "../../types/outcome-ledger.js";
import type { BilingualMessage } from "../../types/i18n.js";
import { msg } from "../i18n.js";
import { decExists } from "./dec-log.js";
import { readOutcomeLedger } from "./outcome-ledger-store.js";
import { requiresOutcome } from "./pin.js";

// SOP 0.9.0 (AM-016) P3 §3.1 — the SPEC gate. Runs at step_acceptance_criteria
// AFTER the acceptance gate passes, but ONLY for a >=0.9.0 pin (caller gates on
// `requiresOutcome`). Closes the "process is complete but nothing measurable was
// promised" hole: a SPEC must declare >=1 outcome AC, OR record a project-level
// no-outcome waiver whose DEC is real. PURE — no IO; the caller supplies docs/20.

export interface OutcomeSpecGateInput {
  readonly specs: readonly AcceptanceSpecV2[];
  readonly noOutcomeWaiver: OutcomeWaiver | undefined;
  readonly decLogContent: string;
}

export interface OutcomeSpecGateOutcome {
  readonly ok: boolean;
  readonly message: BilingualMessage;
  readonly reason?: string;
}

const pass = (n: number): OutcomeSpecGateOutcome => ({
  ok: true,
  message: msg(
    `Outcome requirement satisfied (${n} outcome AC(s) declared).`,
    `效果要求已满足（声明了 ${n} 条效果 AC）。`,
  ),
});

const block = (reason: string, en: string, zh: string): OutcomeSpecGateOutcome => ({
  ok: false,
  reason,
  message: msg(en, zh),
});

export function evaluateOutcomeSpecGate(input: OutcomeSpecGateInput): OutcomeSpecGateOutcome {
  const outcomeCount = input.specs.filter((s) => s.kind === "outcome").length;
  const waiver = input.noOutcomeWaiver;

  // Mutual exclusion — a project either commits to outcomes or explicitly opts out.
  if (outcomeCount > 0 && waiver !== undefined) {
    return block(
      "waiver_outcome_conflict",
      "A project-level no-outcome waiver cannot coexist with declared outcome ACs — remove one.",
      "项目级 no-outcome 豁免不能与已声明的效果 AC 并存——请二选一。",
    );
  }
  if (outcomeCount > 0) return pass(outcomeCount);

  // No outcome ACs — only a valid, DEC-backed waiver lets SPEC pass.
  if (waiver === undefined) {
    return block(
      "no_outcome_ac",
      "SPEC declares no outcome AC. Add a `kind: outcome` AC to docs/03, or record `ocn outcome waive --no-outcome --dec <id> --reason …`.",
      "SPEC 未声明任何效果 AC。请在 docs/03 加一条 `kind: outcome` 的 AC，或执行 `ocn outcome waive --no-outcome --dec <id> --reason …`。",
    );
  }
  if (!decExists(input.decLogContent, waiver.dec)) {
    return block(
      "waiver_dec_missing",
      `The no-outcome waiver cites ${waiver.dec}, which is not a declared decision in docs/20 — the waiver is void.`,
      `no-outcome 豁免引用了 ${waiver.dec}，但它不是 docs/20 中已声明的决策——豁免失效。`,
    );
  }
  return {
    ok: true,
    message: msg(
      `No outcome AC, but a valid no-outcome waiver (${waiver.dec}) is on record.`,
      `无效果 AC，但已记录有效的 no-outcome 豁免（${waiver.dec}）。`,
    ),
  };
}

function projectionSpecsV2(projection: AcceptanceProjection): readonly AcceptanceSpecV2[] {
  if (projection.version === 2) return projection.items;
  return projection.items.map((s) => ({ kind: "build" as const, ...s }));
}

/** IO shell for the runner: dormant below a 0.9.0 pin (byte-identical <0.9.0).
 *  Returns a block descriptor or null (pass). */
export async function outcomeSpecGateBlockOrNull(
  cwd: string,
  profileVersion: string,
  projection: AcceptanceProjection,
): Promise<{ readonly message: BilingualMessage; readonly reason: string } | null> {
  if (!requiresOutcome(profileVersion)) return null;
  const ledger = await readOutcomeLedger(cwd);
  let decLogContent = "";
  try {
    decLogContent = await fs.readFile(join(cwd, "docs", "20-decision-log.md"), "utf8");
  } catch {
    decLogContent = "";
  }
  const result = evaluateOutcomeSpecGate({
    specs: projectionSpecsV2(projection),
    noOutcomeWaiver: ledger?.noOutcomeWaiver,
    decLogContent,
  });
  return result.ok
    ? null
    : { message: result.message, reason: result.reason ?? "outcome_spec_gate" };
}
