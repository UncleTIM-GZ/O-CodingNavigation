import type { AuditActor } from "../types/audit.js";
import { InvalidActorError, resolveActor } from "../core/automation/actor.js";
import { msg } from "../core/i18n.js";
import { blocked } from "../core/result.js";
import { outputResult } from "./output.js";

// AM-009 — shared CLI-layer actor handling. `outputResult` exits the process,
// so both helpers either return a usable value or never return.

export function resolveActorOrExit(flag: string | undefined, json: boolean): AuditActor {
  try {
    return resolveActor(flag);
  } catch (err) {
    if (err instanceof InvalidActorError) {
      outputResult(
        blocked("ERR_IO_OR_CONFIG", msg(err.message, err.message), { reason: err.reason }),
        { json },
      );
    }
    throw err;
  }
}

/** Hard human-only zone: cycle new / readiness waive / sop upgrade — refused
 *  for ai_agent in EVERY mode, including full auto. */
export function exitIfAiAgent(actor: AuditActor, commandLabel: string, json: boolean): void {
  if (actor !== "ai_agent") return;
  outputResult(
    blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        `\`${commandLabel}\` is human-only in every mode — auto mode never delegates it.`,
        `\`${commandLabel}\` 在任何模式下都是人工专属——自动模式不委托该操作。`,
      ),
      { reason: "automation_human_only" },
    ),
    { json },
  );
}
