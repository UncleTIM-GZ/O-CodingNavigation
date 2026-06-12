import type { Command } from "commander";
import { cycleNew } from "../../core/cycle/cycle-new.js";
import { msg } from "../../core/i18n.js";
import { blocked } from "../../core/result.js";
import { exitIfAiAgent, resolveActorOrExit } from "../cli-actor.js";
import { outputResult } from "../output.js";

// DEC-033 P3 — `ocn cycle new --yes`: archive this round, open the next one.
// Human-only, CLI-only (never exposed via MCP). `--yes` is mandatory (ruling
// ⑩ — the command relocates the whole `.ocoding` runtime state; precedent:
// contract §25.6 requires confirmation for reset --hard). Missing
// confirmation maps to ERR_IO_OR_CONFIG (exit 4), consistent with §5.1.

interface CycleCliOptions {
  readonly yes: boolean;
  readonly json: boolean;
}

export function registerCycleCommand(program: Command): void {
  const cycle = program
    .command("cycle")
    .description("Round lifecycle: archive this round and start the next (DEC-033)");

  cycle
    .command("new")
    .description(
      "Archive this round's runtime state to .ocoding/cycles/<n>-<ts>/ and restart at the first step (docs/ kept; audit log stays continuous)",
    )
    .option("--yes", "Confirm archiving the whole .ocoding runtime state", false)
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: CycleCliOptions) => {
      exitIfAiAgent(resolveActorOrExit(undefined, rawOpts.json), "ocn cycle new", rawOpts.json);
      if (!rawOpts.yes) {
        outputResult(
          blocked(
            "ERR_IO_OR_CONFIG",
            msg(
              "Cycle refused: `cycle new` archives this round's entire runtime state — confirm with --yes.",
              "重开被拒：`cycle new` 会归档本轮全部运行时状态——请加 --yes 确认。",
            ),
          ),
          { json: rawOpts.json },
        );
        return;
      }
      const result = await cycleNew({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });
}
