import type { Command } from "commander";
import { generateBrief } from "../../core/brief.js";
import { outputResult } from "../output.js";

export function registerBriefCommand(program: Command): void {
  program
    .command("brief")
    .description("Generate hot-memory brief for the current AI Coding session")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await generateBrief({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });
}
