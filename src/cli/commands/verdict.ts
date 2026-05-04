import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Command } from "commander";
import { generateVerdictDraft } from "../../core/execution-navigator/verdict-draft.js";
import { SUPPORTED_MODES } from "../../core/execution-navigator/verdict-draft-constants.js";
import {
  defaultGhRunner,
  isReadOnlyInvocation,
  type GhRunner,
} from "../../core/execution-navigator/github-pr-runner.js";
import type { VerdictDraftMode } from "../../core/execution-navigator/types.js";
import { blocked } from "../../core/result.js";
import { msg } from "../../core/i18n.js";
import { outputResult } from "../output.js";

// `ocn verdict draft` — Execution Navigator MVP 6 (DEC-024 PR 7).
// Read-only, deterministic evidence-derived verdict draft generator. Reads
// local git, OCN state, the acceptance evidence map, verification status,
// and optionally GitHub PR evidence. No LLM, no mutation, no command
// execution from inside the implementation. The command does NOT auto-decide
// — it produces an auditable draft to help a human decide.

function isValidPrNumber(raw: string): boolean {
  if (!/^[1-9][0-9]*$/.test(raw)) return false;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0;
}

function isMode(raw: string): raw is VerdictDraftMode {
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

// Same fixture-runner injection mechanism MVP 2/3/4/5 introduced. Used by tests
// to seed canned `gh` responses without spawning a real `gh` process.
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

// The fixture runner activates ONLY in test contexts — either NODE_ENV ===
// "test" or the explicit OCN_TEST_MODE === "1" opt-in. Production binaries
// ignore OCN_TEST_GH_RUNNER_FIXTURES entirely and fall through to
// `defaultGhRunner()`.
function pickRunnerFromEnv(): GhRunner | undefined {
  if (process.env["NODE_ENV"] !== "test" && process.env["OCN_TEST_MODE"] !== "1") {
    return undefined;
  }
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
          msg("mode `pr` requires `--pr <number>`.", "--mode `pr` 必须搭配 `--pr <number>` 使用。"),
          { argument: "--mode", received: "pr" },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }

      const cwd = rawOpts.projectRoot ?? process.cwd();
      const runner = pickRunnerFromEnv() ?? defaultGhRunner();
      const result = await generateVerdictDraft({
        cwd,
        mode: modeRaw,
        ...(prNumber !== undefined ? { prNumber, runner } : {}),
      });
      outputResult(result, { json: rawOpts.json });
    });
}
