import type { Command } from "commander";
import { getExecStatus } from "../../core/execution-navigator/exec-status.js";
import { runWithCommonFlags } from "../lib/run-with-common-flags.js";
import { validateProjectRoot } from "../lib/validate-cli-flags.js";

// `ocn exec` — Execution Navigator surface (DEC-024).
//
// PR 2 (MVP 1): `exec status` reads local git evidence + OCN project state.
// Read-only. No GitHub API. No `.ocoding/execution` writes. No git mutation.

interface ExecStatusOpts {
  readonly cwd: string;
}

interface RawOpts {
  readonly json?: boolean;
  readonly projectRoot?: string;
}

export function registerExecCommand(program: Command): void {
  const exec = program
    .command("exec")
    .description("Execution Navigator (DEC-024) — read-only evidence surface");

  exec
    .command("status")
    .description("Show local execution evidence (git status, recent commits, OCN project state)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .option(
      "--project-root <path>",
      "Absolute path to the project root (defaults to current working directory)",
    )
    .action(async (rawOpts: RawOpts) => {
      await runWithCommonFlags(
        {
          validate: (raw) => {
            const r = raw as RawOpts;
            const root = validateProjectRoot(r.projectRoot);
            if (!root.ok) return root;
            return { ok: true, value: { cwd: root.value } satisfies ExecStatusOpts };
          },
        },
        rawOpts,
        async (opts) => getExecStatus({ cwd: opts.cwd }),
      );
    });
}
