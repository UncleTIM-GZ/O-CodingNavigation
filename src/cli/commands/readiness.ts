import type { Command } from "commander";
import { listReadiness } from "../../core/readiness/readiness.js";
import { waiveReadiness } from "../../core/readiness/waive.js";
import { outputResult } from "../output.js";

// SOP 0.4.0 (AM-004) — `ocn readiness list` + `ocn readiness waive` (P4,
// human-only; never exposed over MCP per §4.8).

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

  readiness
    .command("waive")
    .description(
      "Conditionally waive a readiness check (probe re-verified every gate; expires on state change)",
    )
    .argument("<checkId>", "Readiness check id (e.g. rdy_network_engineer)")
    .requiredOption("--reason <reason>", "Why this check does not apply here")
    .requiredOption(
      "--probe <command>",
      "Precondition probe — executed via `/bin/sh -c` on every gate run; exit 0 = precondition holds. Keep it a lightweight check (e.g. `test -f`, `grep`).",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (checkId: string, rawOpts: { reason: string; probe: string; json: boolean }) => {
      const result = await waiveReadiness({
        cwd: process.cwd(),
        checkId,
        reason: rawOpts.reason,
        probe: rawOpts.probe,
      });
      outputResult(result, { json: rawOpts.json });
    });
}
