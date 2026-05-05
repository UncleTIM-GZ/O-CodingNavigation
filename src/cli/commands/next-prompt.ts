import type { Command } from "commander";
import { generateNextPrompt } from "../../core/execution-navigator/next-prompt.js";
import {
  SUPPORTED_AGENTS,
  SUPPORTED_MODES,
} from "../../core/execution-navigator/next-prompt-templates.js";
import type {
  NextPromptAgent,
  NextPromptMode,
} from "../../core/execution-navigator/types.js";
import { runWithCommonFlags } from "../lib/run-with-common-flags.js";
import {
  validateMode,
  validatePrNumber,
  validateProjectRoot,
} from "../lib/validate-cli-flags.js";

// `ocn next-prompt` — Execution Navigator MVP 4 (DEC-024 PR 5).
// Read-only, deterministic agent prompt generator. Composes existing readers
// (local git, OCN state, acceptance map, optional GitHub PR) into a markdown
// prompt body. No LLM, no network call, no mutation, no file writes.

interface NextPromptOpts {
  readonly cwd: string;
  readonly agent: NextPromptAgent;
  readonly mode: NextPromptMode;
  readonly issue?: string;
  readonly prNumber: number | null;
}

interface RawOpts {
  readonly json?: boolean;
  readonly projectRoot?: string;
  readonly pr?: string;
  readonly agent?: string;
  readonly mode?: string;
  readonly issue?: string;
}

export function registerNextPromptCommand(program: Command): void {
  program
    .command("next-prompt")
    .description(
      "Generate the next agent prompt deterministically from local git, OCN state, acceptance map, and optional GitHub PR (read-only)",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .option(
      "--project-root <path>",
      "Absolute path to the project root (defaults to current working directory)",
    )
    .option("--pr <number>", "Optional GitHub PR number for additional evidence")
    .option("--agent <name>", `Target agent (${SUPPORTED_AGENTS.join(" | ")})`, "generic")
    .option("--mode <name>", `Prompt mode (${SUPPORTED_MODES.join(" | ")})`, "continue")
    .option("--issue <text>", "Free-form issue description to override the current objective")
    .action(async (rawOpts: RawOpts) => {
      await runWithCommonFlags(
        {
          validate: (raw) => {
            const r = raw as RawOpts;
            const root = validateProjectRoot(r.projectRoot);
            if (!root.ok) return root;
            const agent = validateMode<NextPromptAgent>(
              r.agent ?? "generic",
              SUPPORTED_AGENTS,
              "--agent",
            );
            if (!agent.ok) return agent;
            const mode = validateMode<NextPromptMode>(
              r.mode ?? "continue",
              SUPPORTED_MODES,
              "--mode",
            );
            if (!mode.ok) return mode;
            let prNumber: number | null = null;
            if (typeof r.pr === "string") {
              const pr = validatePrNumber(r.pr, "--pr");
              if (!pr.ok) return pr;
              prNumber = pr.value;
            }
            const value: NextPromptOpts = {
              cwd: root.value,
              agent: agent.value,
              mode: mode.value,
              prNumber,
              ...(r.issue !== undefined ? { issue: r.issue } : {}),
            };
            return { ok: true, value };
          },
        },
        rawOpts,
        async (opts, runner) =>
          generateNextPrompt({
            cwd: opts.cwd,
            agent: opts.agent,
            mode: opts.mode,
            ...(opts.issue !== undefined ? { issue: opts.issue } : {}),
            ...(opts.prNumber !== null ? { prNumber: opts.prNumber, runner } : {}),
          }),
      );
    });
}
