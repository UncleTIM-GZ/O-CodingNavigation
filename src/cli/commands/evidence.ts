import type { Command } from "commander";
import { generateEvidenceMap } from "../../core/execution-navigator/evidence-map-runner.js";
import { runWithCommonFlags } from "../lib/run-with-common-flags.js";
import {
  validatePrNumber,
  validateProjectRoot,
} from "../lib/validate-cli-flags.js";

// `ocn evidence map` — Execution Navigator MVP 3 (DEC-024 PR 4).
// Read-only acceptance evidence mapper. Reads docs/03-acceptance-criteria.md,
// local git evidence, OCN state, and optionally GitHub PR evidence when
// `--pr <n>` is provided. No LLM, no mutation, no file writes.

interface EvidenceMapOpts {
  readonly cwd: string;
  readonly prNumber: number | null;
}

interface RawOpts {
  readonly json?: boolean;
  readonly projectRoot?: string;
  readonly pr?: string;
}

export function registerEvidenceCommand(program: Command): void {
  const evidence = program
    .command("evidence")
    .description("Execution Navigator evidence surface (DEC-024) — read-only");

  evidence
    .command("map")
    .description("Map acceptance criteria to git / GitHub evidence (read-only)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .option(
      "--project-root <path>",
      "Absolute path to the project root (defaults to current working directory)",
    )
    .option("--pr <number>", "Optional GitHub PR number for additional evidence")
    .action(async (rawOpts: RawOpts) => {
      await runWithCommonFlags(
        {
          validate: (raw) => {
            const r = raw as RawOpts;
            const root = validateProjectRoot(r.projectRoot);
            if (!root.ok) return root;
            let prNumber: number | null = null;
            if (typeof r.pr === "string") {
              const pr = validatePrNumber(r.pr, "--pr");
              if (!pr.ok) return pr;
              prNumber = pr.value;
            }
            return {
              ok: true,
              value: { cwd: root.value, prNumber } satisfies EvidenceMapOpts,
            };
          },
        },
        rawOpts,
        async (opts, runner) =>
          generateEvidenceMap({
            cwd: opts.cwd,
            ...(opts.prNumber !== null ? { prNumber: opts.prNumber, runner } : {}),
          }),
      );
    });
}
