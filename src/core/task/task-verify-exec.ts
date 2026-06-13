import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LedgerTask } from "../../types/task.js";

// Frozen verify-command executor for `ocn task check`, extracted from
// task-check.ts (AM-009 size split). Semantics unchanged: exit 0 is the only
// done signal; a timeout/kill reports exitCode null, never a fake number.

const execFileP = promisify(execFile);
const DEFAULT_TIMEOUT_SECONDS = 120;
const MAX_OUTPUT_TAIL = 2000;
const MAX_BUFFER_BYTES = 1024 * 1024;

export interface ExecOutcome {
  readonly exitCode: number | null;
  readonly outputTail: string;
  /** AM-009 decision trace — engine-measured wall-clock duration. */
  readonly durationMs: number;
}

export async function executeVerify(cwd: string, task: LedgerTask): Promise<ExecOutcome> {
  const timeoutMs = (task.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1000;
  const startedMs = Date.now();
  try {
    const { stdout, stderr } = await execFileP("/bin/sh", ["-c", task.verifyCommand], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER_BYTES,
    });
    return {
      exitCode: 0,
      outputTail: `${stdout}${stderr}`.slice(-MAX_OUTPUT_TAIL),
      durationMs: Date.now() - startedMs,
    };
  } catch (err) {
    // A timeout/kill has a non-numeric (or null) code — report it honestly
    // rather than as a fake exit code (mirrors repo-prober.ts).
    const e = err as { code?: number | string | null; stdout?: string; stderr?: string };
    const exitCode = typeof e.code === "number" ? e.code : null;
    return {
      exitCode,
      outputTail: `${e.stdout ?? ""}${e.stderr ?? ""}`.slice(-MAX_OUTPUT_TAIL),
      durationMs: Date.now() - startedMs,
    };
  }
}
