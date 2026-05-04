import type { Command } from "commander";
import { analyzeGithubPr } from "../../core/execution-navigator/github-pr.js";
import { runWithCommonFlags } from "../lib/run-with-common-flags.js";
import {
  validatePrNumber,
  validateProjectRoot,
} from "../lib/validate-cli-flags.js";

// `ocn github analyze-pr <number>` — Execution Navigator MVP 2 (DEC-024 PR 3).
// Read-only GitHub PR evidence reader. Spawns only `gh auth status` and
// `gh pr view --json ...`. Never invokes a `gh` write subcommand.

interface AnalyzeOpts {
  readonly prNumber: number;
  readonly cwd: string;
}

interface RawOpts {
  readonly json?: boolean;
  readonly projectRoot?: string;
}

export function registerGithubCommand(program: Command): void {
  const github = program
    .command("github")
    .description("Execution Navigator GitHub surface (DEC-024) — read-only");

  github
    .command("analyze-pr")
    .description("Analyze a GitHub PR (read-only via gh CLI)")
    .argument("<number>", "Pull request number (positive integer)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .option(
      "--project-root <path>",
      "Absolute path to the project root (defaults to current working directory)",
    )
    .action(async (rawNumber: string, rawOpts: RawOpts) => {
      // Validation order matters for backward compatibility: PR-number
      // validation runs before project-root validation (positional argument
      // first). The combined raw view is `{ rawNumber, ...rawOpts }`.
      await runWithCommonFlags(
        {
          validate: () => {
            const pr = validatePrNumber(rawNumber, "number");
            if (!pr.ok) return pr;
            const root = validateProjectRoot(rawOpts.projectRoot);
            if (!root.ok) return root;
            return {
              ok: true,
              value: { prNumber: pr.value, cwd: root.value } satisfies AnalyzeOpts,
            };
          },
        },
        rawOpts,
        async (opts, runner) =>
          analyzeGithubPr({ prNumber: opts.prNumber, cwd: opts.cwd, runner }),
      );
    });
}
