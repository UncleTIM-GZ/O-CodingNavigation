import type { Command } from "commander";
import { listReadiness } from "../../core/readiness/readiness.js";
import { outputResult } from "../output.js";

// SOP 0.4.0 (AM-004) — `ocn readiness list`. Waivers (`ocn readiness waive`)
// ship in P4 (waive-with-probe + TTL + audited), not here.

export function registerReadinessCommand(program: Command): void {
  const readiness = program
    .command("readiness")
    .description("Role-based readiness checks (SOP 0.4.0+)");

  readiness
    .command("list")
    .description("Evaluate all readiness checks and print the verdict table")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await listReadiness({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });
}
