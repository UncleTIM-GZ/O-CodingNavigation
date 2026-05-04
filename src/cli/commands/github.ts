import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Command } from "commander";
import { analyzeGithubPr } from "../../core/execution-navigator/github-pr.js";
import {
  defaultGhRunner,
  isReadOnlyInvocation,
  type GhRunner,
} from "../../core/execution-navigator/github-pr-runner.js";
import { blocked } from "../../core/result.js";
import { msg } from "../../core/i18n.js";
import { outputResult } from "../output.js";

// Validates that the argument is a positive-integer PR number.
function isValidPrNumber(raw: string): boolean {
  if (!/^[1-9][0-9]*$/.test(raw)) return false;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0;
}

// Test injection hook. The fixture runner activates ONLY in test contexts —
// either NODE_ENV === "test" (set by vitest) or OCN_TEST_MODE === "1" (an
// explicit opt-in for non-vitest test harnesses). Production binaries that
// happen to have OCN_TEST_GH_RUNNER_FIXTURES set in the environment will
// ignore it and fall through to `defaultGhRunner()`.
function pickRunnerFromEnv(): GhRunner | undefined {
  if (process.env["NODE_ENV"] !== "test" && process.env["OCN_TEST_MODE"] !== "1") {
    return undefined;
  }
  const fixturePath = process.env["OCN_TEST_GH_RUNNER_FIXTURES"];
  if (typeof fixturePath !== "string" || fixturePath.length === 0) return undefined;
  return createFixtureRunner(fixturePath);
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

function createFixtureRunner(fixturePath: string): GhRunner {
  const raw = readFileSync(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as { entries: readonly FixtureEntry[] };
  return {
    async run(args: readonly string[]) {
      // Defence-in-depth: refuse non-allowlisted invocations before consulting
      // fixtures. A buggy fixture file that describes a write call must be
      // rejected at the runner boundary regardless of fixture content.
      if (!isReadOnlyInvocation(args)) {
        return {
          ok: false as const,
          code: "OTHER" as const,
          message: "refused: gh runner only permits read-only subcommands",
        };
      }
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

// `ocn github analyze-pr <number>` — Execution Navigator MVP 2 (DEC-024 PR 3).
// Read-only GitHub PR evidence reader. Spawns only `gh auth status` and
// `gh pr view --json ...`. Never invokes a `gh` write subcommand.
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
    .action(async (rawNumber: string, rawOpts: { json: boolean; projectRoot?: string }) => {
      if (!isValidPrNumber(rawNumber)) {
        const failure = blocked(
          "ERR_ARTIFACT_INVALID",
          msg(
            `Invalid PR number "${rawNumber}". Expected a positive integer (e.g. 42).`,
            `PR 编号 "${rawNumber}" 无效，必须是正整数（例如 42）。`,
          ),
          { argument: "number", received: rawNumber },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }
      const cwd = rawOpts.projectRoot ?? process.cwd();
      if (rawOpts.projectRoot !== undefined && !isAbsolute(rawOpts.projectRoot)) {
        const failure = blocked(
          "ERR_IO_OR_CONFIG",
          msg(
            `--project-root must be an absolute path (got: ${rawOpts.projectRoot}).`,
            `--project-root 必须是绝对路径（当前值：${rawOpts.projectRoot}）。`,
          ),
          { argument: "--project-root", received: "non-absolute-path" },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }

      const runner = pickRunnerFromEnv() ?? defaultGhRunner();
      const result = await analyzeGithubPr({
        prNumber: Number(rawNumber),
        cwd,
        runner,
      });
      outputResult(result, { json: rawOpts.json });
    });
}
