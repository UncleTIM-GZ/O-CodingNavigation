import type { Command } from "commander";
import { advanceState } from "../../core/advance/advance-state.js";
import { outputResult } from "../output.js";

export function registerAdvanceCommand(program: Command): void {
  program
    .command("advance")
    .description("Run gate, then advance the project to the next step on pass")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await advanceState({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });
}
