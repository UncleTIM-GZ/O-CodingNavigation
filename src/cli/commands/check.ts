import type { Command } from "commander";
import { checkCurrentArtifact } from "../../core/check.js";
import { outputResult } from "../output.js";

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description("Check the current step's artifact against its required sections")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await checkCurrentArtifact({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });
}
