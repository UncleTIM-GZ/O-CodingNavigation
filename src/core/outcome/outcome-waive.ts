import type { AuditActor } from "../../types/audit.js";
import type { CommandResult } from "../../types/result.js";
import type { OutcomeWaiver } from "../../types/outcome-ledger.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { nowIsoUtc } from "../time.js";
import {
  OutcomeEntryNotFoundError,
  setNoOutcomeWaiver,
  setOutcomeWaiver,
} from "./outcome-ledger-store.js";

// SOP 0.9.0 (AM-017) — `ocn outcome waive` core. HUMAN-ONLY hard zone (the CLI
// refuses ai_agent before reaching here). Two shapes: per-AC (`--ac-id`) writes
// entry.waived; project-level (`--no-outcome`) writes ledger.noOutcomeWaiver.
// `--dec` is only a REFERENCE recorded here — the SPEC/SHIP gates (P3/P4)
// re-verify the DEC exists in docs/20 on every run.

export interface OutcomeWaiveOptions {
  readonly cwd: string;
  readonly dec: string;
  readonly reason: string;
  readonly acId?: string;
  readonly noOutcome?: boolean;
  readonly actor?: AuditActor;
}

export interface OutcomeWaiveData {
  readonly command: "outcome.waive";
  readonly acId: string | null;
  readonly scope: "per_ac" | "no_outcome";
}

export async function runOutcomeWaive(
  opts: OutcomeWaiveOptions,
): Promise<CommandResult<OutcomeWaiveData>> {
  const both = opts.noOutcome === true && opts.acId !== undefined;
  const neither = opts.noOutcome !== true && opts.acId === undefined;
  if (both || neither) {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        "Pass exactly one of `<ac-id>` or `--no-outcome`.",
        "请恰好提供 `<ac-id>` 或 `--no-outcome` 其一。",
      ),
    );
  }
  const waiver: OutcomeWaiver = { dec: opts.dec, reason: opts.reason, at: nowIsoUtc() };
  const scope = opts.noOutcome === true ? "no_outcome" : "per_ac";
  try {
    if (opts.noOutcome === true) {
      await setNoOutcomeWaiver(opts.cwd, waiver);
    } else {
      await setOutcomeWaiver(opts.cwd, opts.acId!, waiver);
    }
  } catch (err) {
    if (err instanceof OutcomeEntryNotFoundError) {
      return blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `No frozen outcome AC "${err.acId}" to waive — freeze it via \`ocn check\` first.`,
          `没有可豁免的已冻结效果 AC "${err.acId}"——请先 \`ocn check\` 冻结。`,
        ),
      );
    }
    throw err;
  }
  await safeAudit(
    opts.cwd,
    createAuditEvent({
      eventType: "outcome_waived",
      result: "success",
      actor: opts.actor ?? "user",
      source: "cli",
      projectRoot: opts.cwd,
      command: "outcome waive",
      message: msg(
        `Outcome waiver recorded (${scope}, ${opts.dec}).`,
        `已记录效果豁免（${scope}，${opts.dec}）。`,
      ),
      data: { scope, dec: opts.dec, ...(opts.acId !== undefined ? { acId: opts.acId } : {}) },
    }),
  );
  return ok(
    msg(
      `Outcome waiver recorded (${scope}, ${opts.dec}). The gate re-verifies ${opts.dec} exists on every run.`,
      `已记录效果豁免（${scope}，${opts.dec}）。门禁每次运行都会复验 ${opts.dec} 是否存在。`,
    ),
    { command: "outcome.waive", acId: opts.acId ?? null, scope } satisfies OutcomeWaiveData,
  );
}
