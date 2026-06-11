import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { Paths } from "../paths.js";
import { readProjectCommands } from "../readiness/project-config.js";

const execFileP = promisify(execFile);

// AM-006 / DEC-031 — Claude Code PostToolUse-hook engine (matcher Edit|Write).
// Fast feedback only: runs the project's configured `commands.lint` (any
// file) and `commands.typecheck` (TypeScript files only — perf gate) from
// .ocoding/config.yaml. Failure feedback travels back via the caller as
// exit 2 + stderr. Unconfigured → silent no-op; internal errors fail-open.

export interface PostEditOutcome {
  readonly ok: boolean;
  /** Present when ok === false — trimmed command output, ≤ FEEDBACK_MAX. */
  readonly feedback?: string;
}

export interface PostEditOptions {
  readonly cwd: string;
  readonly payload: Record<string, unknown> | null;
}

const COMMAND_TIMEOUT_MS = 60_000;
const FEEDBACK_MAX = 2000;
const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];

function editedFilePath(payload: Record<string, unknown> | null): string | null {
  const toolInput = payload?.["tool_input"];
  if (toolInput === null || typeof toolInput !== "object") return null;
  const filePath = (toolInput as Record<string, unknown>)["file_path"];
  return typeof filePath === "string" ? filePath : null;
}

function isTypescriptFile(filePath: string): boolean {
  return TS_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

/** Keep the TAIL of command output — compilers end with the error summary. */
function tailClip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `…${trimmed.slice(trimmed.length - max + 1)}`;
}

type RunResult = { readonly ok: true } | { readonly ok: false; readonly feedback: string };

async function runFeedbackCommand(cwd: string, command: string): Promise<RunResult> {
  try {
    await execFileP("/bin/sh", ["-c", command], {
      cwd,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true };
  } catch (err) {
    const e = err as { code?: number | string | null; stdout?: string; stderr?: string };
    if (typeof e.code !== "number") {
      return {
        ok: false,
        feedback: `\`${command}\` timed out or could not run｜命令超时或无法执行（60s 上限）。`,
      };
    }
    const output = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
    return {
      ok: false,
      feedback: `\`${command}\` failed｜命令失败：\n${tailClip(output, FEEDBACK_MAX)}`,
    };
  }
}

export async function runPostEditHook(opts: PostEditOptions): Promise<PostEditOutcome> {
  try {
    await fs.access(Paths.stateFile(opts.cwd));
  } catch {
    return { ok: true }; // not an OCN project — never interfere
  }
  const filePath = editedFilePath(opts.payload);
  if (filePath === null) return { ok: true }; // defensive: unexpected payload shape
  try {
    const commands = await readProjectCommands(opts.cwd);
    if (commands.lint !== undefined) {
      const lint = await runFeedbackCommand(opts.cwd, commands.lint);
      if (!lint.ok) return { ok: false, feedback: lint.feedback };
    }
    if (commands.typecheck !== undefined && isTypescriptFile(filePath)) {
      const typecheck = await runFeedbackCommand(opts.cwd, commands.typecheck);
      if (!typecheck.ok) return { ok: false, feedback: typecheck.feedback };
    }
    return { ok: true };
  } catch {
    return { ok: true }; // fail-open: a broken hook must not block edits
  }
}
