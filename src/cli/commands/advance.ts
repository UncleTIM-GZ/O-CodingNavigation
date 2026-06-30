import type { Command } from "commander";
import { advanceState } from "../../core/advance/advance-state.js";
import { resolveActorOrExit } from "../cli-actor.js";
import { outputResult } from "../output.js";

// AM-009 — `--actor`/`OCN_ACTOR` identify the caller; ai_agent advances are
// authorized per-phase by the human's `ocn auto` grant and must carry
// `--rationale` (decision trace). Human calls are unchanged.

interface AdvanceCliOptions {
  readonly actor?: string;
  readonly human?: boolean;
  readonly rationale?: string;
  readonly json: boolean;
}

export function registerAdvanceCommand(program: Command): void {
  program
    .command("advance")
    .description("Run gate, then advance the project to the next step on pass")
    .option("--actor <actor>", "Caller identity override (user|ai_agent)")
    .option(
      "-H, --human",
      "Run as the human operator (shorthand for --actor user); overrides OCN_ACTOR=ai_agent in an agent session",
    )
    .option(
      "--rationale <text>",
      "AI decision trace: background / evidence / action (mandatory for ai_agent)",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: AdvanceCliOptions) => {
      // --human is sugar for `--actor user`; an explicit --actor still wins.
      const actorFlag = rawOpts.actor ?? (rawOpts.human === true ? "user" : undefined);
      const actor = resolveActorOrExit(actorFlag, rawOpts.json);
      const result = await advanceState({
        cwd: process.cwd(),
        actor,
        ...(rawOpts.rationale !== undefined ? { rationale: rawOpts.rationale } : {}),
      });
      outputResult(result, { json: rawOpts.json });
    });
}
