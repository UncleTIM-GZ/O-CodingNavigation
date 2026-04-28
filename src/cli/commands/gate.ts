import type { Command } from "commander";
import { runGate } from "../../core/gate/gate-runner.js";
import { outputResult } from "../output.js";

export function registerGateCommand(program: Command): void {
  program
    .command("gate")
    .description("Run the artifact gate against the current step (read-only)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await runGate({ cwd: process.cwd(), command: "gate" });
      outputResult(result, { json: rawOpts.json });
    });
}
