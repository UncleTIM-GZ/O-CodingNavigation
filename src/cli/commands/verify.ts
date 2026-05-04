import type { Command } from "commander";
import { skeletonResult } from "../../core/execution-navigator/skeleton.js";
import { outputResult } from "../output.js";

// `ocn verify status` — Execution Navigator skeleton (DEC-024 PR 1).
// Eventually rolls up CI / smoke / AC mapping / open issues. Currently skeleton.
export function registerVerifyCommand(program: Command): void {
  const verify = program
    .command("verify")
    .description("Execution Navigator verification surface (DEC-024) — read-only (skeleton)");

  verify
    .command("status")
    .description("Summarize verification status (skeleton — verification status summariser not yet implemented)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action((rawOpts: { json: boolean }) => {
      const result = skeletonResult("verify.status");
      outputResult(result, { json: rawOpts.json });
    });
}
