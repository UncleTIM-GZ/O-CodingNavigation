import type { Command } from "commander";
import { skeletonResult } from "../../core/execution-navigator/skeleton.js";
import { outputResult } from "../output.js";

// `ocn exec status` — Execution Navigator skeleton (DEC-024 PR 1).
// No evidence ingestion. No git read. No file creation. No project mutation.
export function registerExecCommand(program: Command): void {
  const exec = program
    .command("exec")
    .description("Execution Navigator (DEC-024) — read-only evidence surface (skeleton)");

  exec
    .command("status")
    .description("Show Execution Navigator status (skeleton — local-git ingestion not yet implemented)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action((rawOpts: { json: boolean }) => {
      const result = skeletonResult("exec.status");
      outputResult(result, { json: rawOpts.json });
    });
}
