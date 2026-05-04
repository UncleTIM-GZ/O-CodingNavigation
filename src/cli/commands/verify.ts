import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Command } from "commander";
import { summarizeVerifyStatus } from "../../core/execution-navigator/verify-status.js";
import { SUPPORTED_MODES } from "../../core/execution-navigator/verify-status-constants.js";
import {
  defaultGhRunner,
  type GhRunner,
} from "../../core/execution-navigator/github-pr-runner.js";
import type { VerifyStatusMode } from "../../core/execution-navigator/types.js";
import { blocked } from "../../core/result.js";
import { msg } from "../../core/i18n.js";
import { outputResult } from "../output.js";

// `ocn verify status` — Execution Navigator MVP 5 (DEC-024 PR 6).
// Read-only, deterministic verification status summarizer. Reads
// `package.json` scripts, local git evidence, OCN state, the acceptance
// evidence map, and (optionally) GitHub PR checks. No LLM, no mutation,
// no command execution from inside the implementation.

function isValidPrNumber(raw: string): boolean {
  if (!/^[1-9][0-9]*$/.test(raw)) return false;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0;
}

function isMode(raw: string): raw is VerifyStatusMode {
  return (SUPPORTED_MODES as readonly string[]).includes(raw);
}

interface FixtureEntry {
  readonly args: readonly string[];
  readonly ok?: boolean;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly code?: "ENOENT" | "EXIT_NONZERO" | "OTHER";
  readonly exitCode?: number;
  readonly message?: string;
}

// Same fixture-runner injection mechanism MVP 2/3/4 introduced. Used by tests
// to seed canned `gh` responses without spawning a real `gh` process.
function createFixtureRunner(fixturePath: string): GhRunner {
  const raw = readFileSync(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as { entries: readonly FixtureEntry[] };
  return {
    async run(args: readonly string[]) {
      const match = parsed.entries.find(
        (e) => e.args.length === args.length && e.args.every((a, i) => a === args[i]),
      );
      if (match === undefined) {
        return {
          ok: false as const,
          code: "OTHER" as const,
          message: `fixture-runner: no entry for ${args.join(" ")}`,
        };
      }
      if (match.ok === false) {
        const errorEntry: {
          ok: false;
          code: "ENOENT" | "EXIT_NONZERO" | "OTHER";
          message: string;
          stdout?: string;
          stderr?: string;
          exitCode?: number;
        } = {
          ok: false,
          code: match.code ?? "EXIT_NONZERO",
          message: match.message ?? "fixture-runner failure",
        };
        if (match.stdout !== undefined) errorEntry.stdout = match.stdout;
        if (match.stderr !== undefined) errorEntry.stderr = match.stderr;
        if (match.exitCode !== undefined) errorEntry.exitCode = match.exitCode;
        return errorEntry;
      }
      return {
        ok: true as const,
        stdout: match.stdout ?? "",
        stderr: match.stderr ?? "",
      };
    },
  };
}

function pickRunnerFromEnv(): GhRunner | undefined {
  const fixturePath = process.env["OCN_TEST_GH_RUNNER_FIXTURES"];
  if (typeof fixturePath !== "string" || fixturePath.length === 0) return undefined;
  return createFixtureRunner(fixturePath);
}

interface RawOpts {
  readonly json: boolean;
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
    .option(
      "--mode <name>",
      `Evidence mode (${SUPPORTED_MODES.join(" | ")})`,
      "combined",
    )
    .action(async (rawOpts: RawOpts) => {
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

      const modeRaw = rawOpts.mode ?? "combined";
      if (!isMode(modeRaw)) {
        const failure = blocked(
          "ERR_ARTIFACT_INVALID",
          msg(
            `Invalid --mode "${modeRaw}". Expected one of: ${SUPPORTED_MODES.join(", ")}.`,
            `--mode "${modeRaw}" 无效，必须是以下之一：${SUPPORTED_MODES.join(", ")}。`,
          ),
          { argument: "--mode", received: modeRaw },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }

      let prNumber: number | undefined;
      if (typeof rawOpts.pr === "string") {
        if (!isValidPrNumber(rawOpts.pr)) {
          const failure = blocked(
            "ERR_ARTIFACT_INVALID",
            msg(
              `Invalid PR number "${rawOpts.pr}". Expected a positive integer (e.g. 42).`,
              `PR 编号 "${rawOpts.pr}" 无效，必须是正整数（例如 42）。`,
            ),
            { argument: "--pr", received: rawOpts.pr },
          );
          outputResult(failure, { json: rawOpts.json });
          return;
        }
        prNumber = Number(rawOpts.pr);
      }

      if (modeRaw === "pr" && prNumber === undefined) {
        const failure = blocked(
          "ERR_ARTIFACT_INVALID",
          msg(
            "mode `pr` requires `--pr <number>`.",
            "--mode `pr` 必须搭配 `--pr <number>` 使用。",
          ),
          { argument: "--mode", received: "pr" },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }

      const cwd = rawOpts.projectRoot ?? process.cwd();
      const runner = pickRunnerFromEnv() ?? defaultGhRunner();
      const result = await summarizeVerifyStatus({
        cwd,
        mode: modeRaw,
        ...(prNumber !== undefined ? { prNumber, runner } : {}),
      });
      outputResult(result, { json: rawOpts.json });
    });
}
