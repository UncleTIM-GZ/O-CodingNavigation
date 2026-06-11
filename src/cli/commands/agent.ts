import type { Command } from "commander";
import { setupAgentIntegration } from "../../core/agent-setup/setup.js";
import { outputResult } from "../output.js";

// AM-006 / DEC-031 — `ocn agent setup`: generate the Claude Code wiring
// (hooks, governance contract, CLAUDE.md import, /ocn-next command).
// Human-only; never exposed over MCP (§4.8 — writes config, same class as init).

export function registerAgentCommand(program: Command): void {
  const agent = program.command("agent").description("AI agent integration (Claude Code)");

  agent
    .command("setup")
    .description(
      "Generate Claude Code wiring: hooks in .claude/settings.json, .claude/ocn.md contract, CLAUDE.md import, /ocn-next command (idempotent)",
    )
    .option("--force", "Back up and rewrite a malformed .claude/settings.json", false)
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { force: boolean; json: boolean }) => {
      const result = await setupAgentIntegration({ cwd: process.cwd(), force: rawOpts.force });
      outputResult(result, { json: rawOpts.json });
    });
}
