import type { Command } from "commander";
import { getStatus } from "../../core/status.js";
import { outputResult } from "../output.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current OCN project state, step, and next action")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await getStatus({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });
}
