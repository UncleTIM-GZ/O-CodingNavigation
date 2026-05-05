import type { Command } from "commander";
import { generateVerdictDraft } from "../../core/execution-navigator/verdict-draft.js";
import { SUPPORTED_MODES } from "../../core/execution-navigator/verdict-draft-constants.js";
import type { VerdictDraftMode } from "../../core/execution-navigator/types.js";
import { runWithCommonFlags } from "../lib/run-with-common-flags.js";
import {
  validateMode,
  validateModeRequiresPr,
  validatePrNumber,
  validateProjectRoot,
} from "../lib/validate-cli-flags.js";

// `ocn verdict draft` — Execution Navigator MVP 6 (DEC-024 PR 7).
// Read-only, deterministic evidence-derived verdict draft generator. Reads
// local git, OCN state, the acceptance evidence map, verification status,
// and optionally GitHub PR evidence. No LLM, no mutation, no command
// execution from inside the implementation. The command does NOT auto-decide
// — it produces an auditable draft to help a human decide.

interface VerdictOpts {
  readonly cwd: string;
  readonly mode: VerdictDraftMode;
  readonly prNumber: number | null;
}

interface RawOpts {
  readonly json?: boolean;
  readonly projectRoot?: string;
  readonly pr?: string;
  readonly mode?: string;
}

export function registerVerdictCommand(program: Command): void {
  const verdict = program
    .command("verdict")
    .description("Execution Navigator verdict surface (DEC-024) — read-only");

  verdict
    .command("draft")
    .description(
      "Draft an evidence-derived final verdict from local git, OCN state, acceptance map, verification status, and optional GitHub PR (read-only)",
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
            const mode = validateMode<VerdictDraftMode>(
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
              value: { cwd: root.value, mode: mode.value, prNumber } satisfies VerdictOpts,
            };
          },
        },
        rawOpts,
        async (opts, runner) =>
          generateVerdictDraft({
            cwd: opts.cwd,
            mode: opts.mode,
            ...(opts.prNumber !== null ? { prNumber: opts.prNumber, runner } : {}),
          }),
      );
    });
}
