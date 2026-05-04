import type { Command } from "commander";
import { skeletonResult } from "../../core/execution-navigator/skeleton.js";
import { outputResult } from "../output.js";

// `ocn evidence map` — Execution Navigator skeleton (DEC-024 PR 1).
// Maps acceptance criteria to evidence in a future PR. Currently skeleton.
export function registerEvidenceCommand(program: Command): void {
  const evidence = program
    .command("evidence")
    .description("Execution Navigator evidence surface (DEC-024) — read-only (skeleton)");

  evidence
    .command("map")
    .description("Map acceptance criteria to evidence (skeleton — AC evidence mapping not yet implemented)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action((rawOpts: { json: boolean }) => {
      const result = skeletonResult("evidence.map");
      outputResult(result, { json: rawOpts.json });
    });
}
