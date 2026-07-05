import type { Command } from "commander";
import { stopProject } from "../../core/stop/stop-project.js";
import { msg } from "../../core/i18n.js";
import { blocked } from "../../core/result.js";
import { exitIfAiAgent, resolveActorOrExit } from "../cli-actor.js";
import { outputResult } from "../output.js";

// `ocn stop` — terminate OCN for this project (engine/CLI feature, NOT an SOP
// bump). Marks state.json stopped and uninstalls the injected Claude Code
// wiring — one-way. Human-only, CLI-only (never exposed via MCP). `--yes` is
// mandatory (it uninstalls files + halts the workflow); missing confirmation
// maps to ERR_IO_OR_CONFIG (exit 4), consistent with `cycle new`.

interface StopCliOptions {
  readonly yes: boolean;
  readonly json: boolean;
  readonly reason?: string;
}

export function registerStopCommand(program: Command): void {
  program
    .command("stop")
    .description(
      "Terminate OCN for this project: mark it stopped and uninstall the Claude Code wiring (one-way, human-only). Enter free self-development.",
    )
    .option("--reason <text>", "Why you are stopping OCN (recorded in the audit trail)")
    .option("--yes", "Confirm terminating OCN and uninstalling the wiring", false)
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: StopCliOptions) => {
      exitIfAiAgent(resolveActorOrExit(undefined, rawOpts.json), "ocn stop", rawOpts.json);
      if (!rawOpts.yes) {
        outputResult(
          blocked(
            "ERR_IO_OR_CONFIG",
            msg(
              "Stop refused: `ocn stop` terminates OCN and uninstalls the Claude Code wiring — confirm with --yes.",
              "终止被拒：`ocn stop` 会终止 OCN 并卸载 Claude Code 集成——请加 --yes 确认。",
            ),
          ),
          { json: rawOpts.json },
        );
        return;
      }
      const result = await stopProject({
        cwd: process.cwd(),
        ...(rawOpts.reason !== undefined ? { reason: rawOpts.reason } : {}),
      });
      outputResult(result, { json: rawOpts.json });
    });
}
