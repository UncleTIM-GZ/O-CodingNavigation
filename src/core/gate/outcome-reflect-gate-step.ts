import type { BilingualMessage } from "../../types/i18n.js";
import type { OutcomeLedger } from "../../types/outcome-ledger.js";
import type { SopProfile } from "../../types/sop.js";
import { msg } from "../i18n.js";
import { docsOutcomeSpecs } from "../outcome/outcome-contract-source.js";
import { readOutcomeLedger } from "../outcome/outcome-ledger-store.js";
import { parseOutcomeReferences } from "../outcome/outcome-references-parser.js";
import { requiresOutcome } from "../outcome/pin.js";

// SOP 0.9.0 (AM-016) P4b §D.1 — the REFLECT gate for step_evolution_report.
// Unlike SHIP (a null-artifact closure), this step HAS an artifact
// (docs/23-evolution-report.md), so it runs in the runner's normal step-keyed
// branch after the required-section gate passes. It mechanically cross-checks
// each `### Outcome References` line against the frozen ledger's current-round
// history — zero content judgement, pure ledger-JSON vs markdown comparison:
//   1. every parsed reference's measurementId must exist for that acId with the
//      EXACT same value (DI-M5: key on measurementId, not measuredAt);
//   2. every UNWAIVED outcome AC must be referenced at least once (no cherry-
//      picking only the winning number);
//   3. any malformed reference line blocks (fail-closed).

const MAX_SHOWN = 6;

export type ReflectGateResult =
  | { readonly kind: "skip" }
  | { readonly kind: "pass"; readonly message: BilingualMessage }
  | { readonly kind: "io_error"; readonly message: BilingualMessage }
  | { readonly kind: "blocked"; readonly message: BilingualMessage; readonly reason: string };

export interface ReflectGateStepOptions {
  readonly cwd: string;
  readonly profile: SopProfile;
  readonly currentStepId: string;
  readonly content: string;
}

interface MeasurementRef {
  readonly acId: string;
  readonly value: number | null;
}

/** measurementId → { acId, value } across the whole (per-round) ledger. */
function indexMeasurements(ledger: OutcomeLedger): Map<string, MeasurementRef> {
  const index = new Map<string, MeasurementRef>();
  for (const entry of ledger.entries) {
    for (const m of entry.history) {
      index.set(m.measurementId, { acId: entry.acId, value: m.value });
    }
  }
  return index;
}

/** The round's unwaived outcome ACs = the ledger's frozen entries minus waivers.
 *  The ledger IS the authoritative per-round outcome-contract set (frozen from
 *  docs/03 by the acceptance gate) — coverage is derived from it, not the
 *  deletable projection. */
function unwaivedOutcomeAcIds(ledger: OutcomeLedger): readonly string[] {
  return ledger.entries.filter((e) => e.waived === undefined).map((e) => e.acId);
}

function preview(ids: readonly string[]): string {
  const shown = ids.slice(0, MAX_SHOWN).join(", ");
  const more = ids.length - Math.min(ids.length, MAX_SHOWN);
  return more > 0 ? `${shown} (+${more} more)` : shown;
}

export async function runOutcomeReflectGateStep(
  opts: ReflectGateStepOptions,
): Promise<ReflectGateResult> {
  if (opts.currentStepId !== "step_evolution_report") return { kind: "skip" };
  if (!requiresOutcome(opts.profile.version)) return { kind: "skip" };

  try {
    // Anchor "were outcomes expected?" on docs/03 (canonical, non-.ocoding,
    // kept across cycle new) — not the deletable projection (review Finding 2).
    const contractSpecs = await docsOutcomeSpecs(opts.cwd, opts.profile);
    if (contractSpecs.length === 0) return { kind: "pass", message: passMessage() };

    const ledger = await readOutcomeLedger(opts.cwd);
    if (ledger === null) {
      return {
        kind: "blocked",
        reason: "outcome_ledger_missing",
        message: msg(
          "Reflect blocked: docs/03 declares outcome AC(s) but `.ocoding/outcome-ledger.json` is missing or unreadable.",
          "复盘被阻：docs/03 声明了效果 AC，但 `.ocoding/outcome-ledger.json` 缺失或损坏。",
        ),
      };
    }

    const parsed = parseOutcomeReferences(opts.content);
    if (parsed.malformed.length > 0) {
      return {
        kind: "blocked",
        reason: "malformed_reference",
        message: msg(
          `Reflect blocked: ${parsed.malformed.length} malformed Outcome Reference line(s). Each must read \`- <ac-id>: value=<n> @ <measurementId>\`. First: ${parsed.malformed[0]}`,
          `复盘被阻：${parsed.malformed.length} 行结果引用格式错误。每行须为 \`- <ac-id>: value=<n> @ <measurementId>\`。首个：${parsed.malformed[0]}`,
        ),
      };
    }

    const measurements = indexMeasurements(ledger);
    for (const ref of parsed.references) {
      const found = measurements.get(ref.measurementId);
      if (found === undefined || found.acId !== ref.acId) {
        return {
          kind: "blocked",
          reason: "reference_not_in_ledger",
          message: msg(
            `Reflect blocked: ${ref.acId} references measurement ${ref.measurementId}, which is not in the ledger for that AC.`,
            `复盘被阻：${ref.acId} 引用的测量 ${ref.measurementId} 不在该 AC 的台账中。`,
          ),
        };
      }
      if (found.value !== ref.value) {
        return {
          kind: "blocked",
          reason: "reference_value_mismatch",
          message: msg(
            `Reflect blocked: ${ref.acId} reports value=${ref.value} but the ledger records ${found.value} for measurement ${ref.measurementId}.`,
            `复盘被阻：${ref.acId} 报告 value=${ref.value}，但台账中该测量 ${ref.measurementId} 记录为 ${found.value}。`,
          ),
        };
      }
    }

    const referencedAcIds = new Set(parsed.references.map((r) => r.acId));
    const uncovered = unwaivedOutcomeAcIds(ledger).filter((id) => !referencedAcIds.has(id));
    if (uncovered.length > 0) {
      return {
        kind: "blocked",
        reason: "outcome_ac_unreferenced",
        message: msg(
          `Reflect blocked: ${uncovered.length} unwaived outcome AC(s) are not referenced in the evolution report — ${preview(uncovered)}. Reference each with its measured value + measurementId.`,
          `复盘被阻：${uncovered.length} 条未豁免效果 AC 未在演进报告中引用——${preview(uncovered)}。请逐条引用其实测值 + measurementId。`,
        ),
      };
    }

    return { kind: "pass", message: passMessage() };
  } catch (err) {
    return {
      kind: "io_error",
      message: msg(
        `Reflect gate could not evaluate outcome references: ${(err as Error).message}`,
        `复盘门无法核对结果引用：${(err as Error).message}`,
      ),
    };
  }
}

function passMessage(): BilingualMessage {
  return msg(
    "Reflect gate passed: every outcome reference matches the ledger and every unwaived outcome AC is referenced.",
    "复盘门通过：每条结果引用与台账一致，且每条未豁免效果 AC 均已引用。",
  );
}
