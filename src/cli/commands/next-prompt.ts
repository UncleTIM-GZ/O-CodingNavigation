import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Command } from "commander";
import { generateNextPrompt } from "../../core/execution-navigator/next-prompt.js";
import {
  defaultGhRunner,
  type GhRunner,
} from "../../core/execution-navigator/github-pr-runner.js";
import {
  SUPPORTED_AGENTS,
  SUPPORTED_MODES,
} from "../../core/execution-navigator/next-prompt-templates.js";
import type {
  NextPromptAgent,
  NextPromptMode,
} from "../../core/execution-navigator/types.js";
import { blocked } from "../../core/result.js";
import { msg } from "../../core/i18n.js";
import { outputResult } from "../output.js";

// `ocn next-prompt` — Execution Navigator MVP 4 (DEC-024 PR 5).
// Read-only, deterministic agent prompt generator. Composes existing readers
// (local git, OCN state, acceptance map, optional GitHub PR) into a markdown
// prompt body. No LLM, no network call, no mutation, no file writes.

function isValidPrNumber(raw: string): boolean {
  if (!/^[1-9][0-9]*$/.test(raw)) return false;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0;
}

function isAgent(raw: string): raw is NextPromptAgent {
  return (SUPPORTED_AGENTS as readonly string[]).includes(raw);
}

function isMode(raw: string): raw is NextPromptMode {
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

// Same fixture-runner injection mechanism MVP 2 introduced.
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
    .option(
      "--agent <name>",
      `Target agent (${SUPPORTED_AGENTS.join(" | ")})`,
      "generic",
    )
    .option(
      "--mode <name>",
      `Prompt mode (${SUPPORTED_MODES.join(" | ")})`,
      "continue",
    )
    .option("--issue <text>", "Free-form issue description to override the current objective")
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

      const agentRaw = rawOpts.agent ?? "generic";
      if (!isAgent(agentRaw)) {
        const failure = blocked(
          "ERR_ARTIFACT_INVALID",
          msg(
            `Invalid --agent "${agentRaw}". Expected one of: ${SUPPORTED_AGENTS.join(", ")}.`,
            `--agent "${agentRaw}" 无效，必须是以下之一：${SUPPORTED_AGENTS.join(", ")}。`,
          ),
          { argument: "--agent", received: agentRaw },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }

      const modeRaw = rawOpts.mode ?? "continue";
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

      const cwd = rawOpts.projectRoot ?? process.cwd();
      const runner = pickRunnerFromEnv() ?? defaultGhRunner();
      const result = await generateNextPrompt({
        cwd,
        agent: agentRaw,
        mode: modeRaw,
        ...(rawOpts.issue !== undefined ? { issue: rawOpts.issue } : {}),
        ...(prNumber !== undefined ? { prNumber, runner } : {}),
      });
      outputResult(result, { json: rawOpts.json });
    });
}
