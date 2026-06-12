import type { Command } from "commander";
import { rewindState } from "../../core/rewind/rewind-state.js";
import { msg } from "../../core/i18n.js";
import { blocked } from "../../core/result.js";
import { resolveActorOrExit } from "../cli-actor.js";
import { outputResult } from "../output.js";

// DEC-033 P1 — `ocn rewind --to <step> --reason <text>`: controlled in-round
// cursor rollback. Human-only, CLI-only (never exposed via MCP, CLAUDE.md
// §4.8). Flag presence is validated here so a usage error maps to
// ERR_IO_OR_CONFIG (exit 4) instead of a commander usage crash; everything
// else (target legality, lock, audit) is the engine's job.

interface RewindCliOptions {
  readonly to?: string;
  readonly reason?: string;
  readonly actor?: string;
  readonly json: boolean;
}

export function registerRewindCommand(program: Command): void {
  program
    .command("rewind")
    .description(
      "Rewind the cursor to a strictly-earlier step in this round (audited; docs/ untouched)",
    )
    .option("--to <stepId>", "Target step id (stable string id, e.g. step_build_plan)")
    .option("--reason <text>", "Mandatory justification, recorded in the audit trail")
    .option("--actor <actor>", "Caller identity override (user|ai_agent)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: RewindCliOptions) => {
      if (rawOpts.to === undefined || rawOpts.to.trim().length === 0) {
        outputResult(
          blocked(
            "ERR_IO_OR_CONFIG",
            msg("Rewind refused: --to <stepId> is required.", "回拨被拒：必须提供 --to <stepId>。"),
          ),
          { json: rawOpts.json },
        );
        return;
      }
      if (rawOpts.reason === undefined || rawOpts.reason.trim().length === 0) {
        outputResult(
          blocked(
            "ERR_IO_OR_CONFIG",
            msg(
              "Rewind refused: --reason is mandatory and must be non-empty.",
              "回拨被拒：--reason 为必填且不能为空。",
            ),
          ),
          { json: rawOpts.json },
        );
        return;
      }
      const actor = resolveActorOrExit(rawOpts.actor, rawOpts.json);
      const result = await rewindState({
        cwd: process.cwd(),
        targetStepId: rawOpts.to,
        reason: rawOpts.reason,
        actor,
      });
      outputResult(result, { json: rawOpts.json });
    });
}
