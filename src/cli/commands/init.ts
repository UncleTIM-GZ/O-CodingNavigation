import type { Command } from "commander";
import { initProject } from "../../core/init.js";
import { outputResult } from "../output.js";
import type { Tier } from "../../types/state.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize an OCN project in the current directory")
    .option(
      "-t, --tier <tier>",
      "Project tier: minimal | production | full",
      "minimal",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { tier: string; json: boolean }) => {
      const tier = rawOpts.tier as Tier;
      const result = await initProject({ cwd: process.cwd(), tier });
      outputResult(result, { json: rawOpts.json });
    });
}
