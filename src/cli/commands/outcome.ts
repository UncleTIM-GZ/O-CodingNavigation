import type { Command } from "commander";
import { runOutcomeCheck } from "../../core/outcome/outcome-check.js";
import { listOutcomes } from "../../core/outcome/outcome-list.js";
import { runOutcomeWaive } from "../../core/outcome/outcome-waive.js";
import { exitIfAiAgent, resolveActorOrExit } from "../cli-actor.js";
import { outputResult } from "../output.js";

// SOP 0.9.0 (AM-016) — Outcome Backbone CLI surface.
//   ocn outcome check <ac-id>  — run the FROZEN probe; append the verdict
//   ocn outcome list           — pull-mode ledger overview (no audit)
//   ocn outcome waive …        — human-only escape hatch (per-AC / --no-outcome)
// HUMAN-authorized like `task check`; never exposed over MCP (7-tool whitelist).

export function registerOutcomeCommand(program: Command): void {
  const outcome = program
    .command("outcome")
    .description("Outcome backbone — measured-reality ledger (SOP 0.9.0+)");

  outcome
    .command("list")
    .description("Show the outcome ledger (AC / verdict / days-since-measure / waived)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await listOutcomes({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });

  outcome
    .command("check")
    .description("Run an outcome AC's frozen probe and append the measured verdict")
    .argument("<acId>", "Outcome AC id (e.g. AC-PERF-001)")
    .option("--actor <actor>", "Caller identity override (user|ai_agent)")
    .option("--rationale <text>", "AI decision trace (mandatory for ai_agent)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(
      async (
        acId: string,
        rawOpts: { actor?: string; rationale?: string; json: boolean },
      ) => {
        const actor = resolveActorOrExit(rawOpts.actor, rawOpts.json);
        const result = await runOutcomeCheck({
          cwd: process.cwd(),
          acId,
          actor,
          ...(rawOpts.rationale !== undefined ? { rationale: rawOpts.rationale } : {}),
        });
        outputResult(result, { json: rawOpts.json });
      },
    );

  outcome
    .command("waive")
    .description("Record an outcome escape hatch (human-only): per-AC or project-level --no-outcome")
    .argument("[acId]", "Outcome AC id (omit with --no-outcome)")
    .requiredOption("--dec <id>", "Decision-log id justifying the waiver (e.g. DEC-042)")
    .requiredOption("--reason <text>", "Why this outcome is waived")
    .option("--no-outcome", "Project-level no-outcome waiver instead of per-AC", false)
    .option("--actor <actor>", "Caller identity override (user|ai_agent)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(
      async (
        acId: string | undefined,
        rawOpts: { dec: string; reason: string; outcome: boolean; actor?: string; json: boolean },
      ) => {
        const actor = resolveActorOrExit(rawOpts.actor, rawOpts.json);
        // Hard human-only zone — refuse ai_agent in every mode (like cycle new).
        exitIfAiAgent(actor, "ocn outcome waive", rawOpts.json);
        // commander maps `--no-outcome` to rawOpts.outcome === false.
        const noOutcome = rawOpts.outcome === false;
        const result = await runOutcomeWaive({
          cwd: process.cwd(),
          dec: rawOpts.dec,
          reason: rawOpts.reason,
          actor,
          ...(noOutcome ? { noOutcome: true } : {}),
          ...(acId !== undefined ? { acId } : {}),
        });
        outputResult(result, { json: rawOpts.json });
      },
    );
}
