import type { Command } from "commander";
import { skeletonResult } from "../../core/execution-navigator/skeleton.js";
import { outputResult } from "../output.js";

// `ocn verdict draft` — Execution Navigator skeleton (DEC-024 PR 1).
// Eventually drafts the evidence-derived final build verdict. Currently skeleton.
export function registerVerdictCommand(program: Command): void {
  const verdict = program
    .command("verdict")
    .description("Execution Navigator verdict surface (DEC-024) — read-only (skeleton)");

  verdict
    .command("draft")
    .description("Draft an evidence-derived final verdict (skeleton — evidence-derived final verdict not yet implemented)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action((rawOpts: { json: boolean }) => {
      const result = skeletonResult("verdict.draft");
      outputResult(result, { json: rawOpts.json });
    });
}
