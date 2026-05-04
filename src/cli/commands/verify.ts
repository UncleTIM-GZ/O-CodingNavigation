import type { Command } from "commander";
import { summarizeVerifyStatus } from "../../core/execution-navigator/verify-status.js";
import { SUPPORTED_MODES } from "../../core/execution-navigator/verify-status-constants.js";
import type { VerifyStatusMode } from "../../core/execution-navigator/types.js";
import { runWithCommonFlags } from "../lib/run-with-common-flags.js";
import {
  validateMode,
  validateModeRequiresPr,
  validatePrNumber,
  validateProjectRoot,
} from "../lib/validate-cli-flags.js";

// `ocn verify status` — Execution Navigator MVP 5 (DEC-024 PR 6).
// Read-only, deterministic verification status summarizer. Reads
// `package.json` scripts, local git evidence, OCN state, the acceptance
// evidence map, and (optionally) GitHub PR checks. No LLM, no mutation,
// no command execution from inside the implementation.

interface VerifyOpts {
  readonly cwd: string;
  readonly mode: VerifyStatusMode;
  readonly prNumber: number | null;
}

interface RawOpts {
  readonly json?: boolean;
  readonly projectRoot?: string;
  readonly pr?: string;
  readonly mode?: string;
}

export function registerVerifyCommand(program: Command): void {
  const verify = program
    .command("verify")
    .description("Execution Navigator verification surface (DEC-024) — read-only");

  verify
    .command("status")
    .description(
      "Summarize verification status from package scripts, local git, acceptance map, and optional GitHub PR (read-only)",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .option(
      "--project-root <path>",
      "Absolute path to the project root (defaults to current working directory)",
    )
    .option("--pr <number>", "Optional GitHub PR number for additional evidence")
    .option("--mode <name>", `Evidence mode (${SUPPORTED_MODES.join(" | ")})`, "combined")
    .action(async (rawOpts: RawOpts) => {
      await runWithCommonFlags(
        {
          validate: (raw) => {
            const r = raw as RawOpts;
            const root = validateProjectRoot(r.projectRoot);
            if (!root.ok) return root;
            const mode = validateMode<VerifyStatusMode>(
              r.mode ?? "combined",
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
            const requiresPr = validateModeRequiresPr(mode.value, prNumber, "pr");
            if (!requiresPr.ok) return requiresPr;
            return {
              ok: true,
              value: { cwd: root.value, mode: mode.value, prNumber } satisfies VerifyOpts,
            };
          },
        },
        rawOpts,
        async (opts, runner) =>
          summarizeVerifyStatus({
            cwd: opts.cwd,
            mode: opts.mode,
            ...(opts.prNumber !== null ? { prNumber: opts.prNumber, runner } : {}),
          }),
      );
    });
}
