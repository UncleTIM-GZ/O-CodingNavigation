import { isAbsolute } from "node:path";
import type { Command } from "commander";
import { getExecStatus } from "../../core/execution-navigator/exec-status.js";
import { msg } from "../../core/i18n.js";
import { blocked } from "../../core/result.js";
import { outputResult } from "../output.js";

// `ocn exec` — Execution Navigator surface (DEC-024).
//
// PR 2 (MVP 1): `exec status` reads local git evidence + OCN project state.
// Read-only. No GitHub API. No `.ocoding/execution` writes. No git mutation.
export function registerExecCommand(program: Command): void {
  const exec = program
    .command("exec")
    .description("Execution Navigator (DEC-024) — read-only evidence surface");

  exec
    .command("status")
    .description(
      "Show local execution evidence (git status, recent commits, OCN project state)",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .option(
      "--project-root <path>",
      "Absolute path to the project root (defaults to current working directory)",
    )
    .action(async (rawOpts: { json: boolean; projectRoot?: string }) => {
      const cwd = rawOpts.projectRoot ?? process.cwd();
      if (rawOpts.projectRoot !== undefined && !isAbsolute(rawOpts.projectRoot)) {
        const failure = blocked(
          "ERR_IO_OR_CONFIG",
          msg(
            `--project-root must be an absolute path (got: ${rawOpts.projectRoot}).`,
            `--project-root 必须是绝对路径（当前值：${rawOpts.projectRoot}）。`,
          ),
          { argument: "--project-root", received: rawOpts.projectRoot },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }
      const result = await getExecStatus({ cwd });
      outputResult(result, { json: rawOpts.json });
    });
}
