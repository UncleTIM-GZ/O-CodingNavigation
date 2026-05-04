import type { Command } from "commander";
import { skeletonResult } from "../../core/execution-navigator/skeleton.js";
import { outputResult } from "../output.js";

// `ocn next-prompt` — Execution Navigator skeleton (DEC-024 PR 1).
// Eventually generates an agent prompt for Claude Code / Codex / LFG. Currently skeleton.
export function registerNextPromptCommand(program: Command): void {
  program
    .command("next-prompt")
    .description("Generate the next agent prompt (skeleton — agent prompt generator not yet implemented)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action((rawOpts: { json: boolean }) => {
      const result = skeletonResult("next_prompt");
      outputResult(result, { json: rawOpts.json });
    });
}
