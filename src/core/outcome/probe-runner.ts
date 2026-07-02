import { spawn } from "node:child_process";
import { z } from "zod";
import type { MeasureContract } from "../../types/outcome.js";
import type { OutcomeVerdict } from "../../types/outcome-ledger.js";
import { compareThreshold } from "./threshold.js";

// SOP 0.9.0 (AM-016) — the probe executor. Runs the FROZEN measure.command
// verbatim under /bin/sh and reads the last stdout line as `{metric,value}`.
// Pure execution + mapping; the ledger write and evidence snapshot live
// elsewhere. Hardening folded from the security review:
//   • spawn (not execFile) for real process-group control, so we bound stdout
//     MANUALLY — spawn has no maxBuffer (Sec-H2/M1).
//   • the frozen command is the ONE shell value; acId/metric/source are never
//     interpolated (no injection surface beyond the human-frozen command).
//   • timeout → SIGTERM then SIGKILL to the process GROUP, guarded on a real
//     positive pid; POSIX-only, with a documented single-process fallback.
//   • last-line JSON via zod strip (NOT .strict): a probe emitting a diagnostic
//     field must not become a false exec_error; prototype-pollution safety comes
//     from reading ONLY metric/value, never spreading (TS-M4 vs Sec-M4).

const MAX_STDOUT_BYTES = 1024 * 1024; // 1MB hard cap; overflow → exec_error
const MAX_LAST_LINE_BYTES = 64 * 1024; // a legit reading line is tiny
const NO_EVIDENCE_EXIT = 20; // probe-side convention; NOT an ocn exit code
const SIGKILL_GRACE_MS = 2000;

/** value is .finite() so a probe emitting NaN/Infinity/1e400 can never satisfy
 *  a comparison (a false MEASURED_PASS otherwise). No coerce — a string "1"
 *  must fail, not silently parse. */
const ProbeReading = z.object({ metric: z.string().min(1), value: z.number().finite() });

/** Closed union — exit 0 with a non-`{metric,value}` last line is exec_error,
 *  never a silent "measured" (P1 typescript review). */
export type ProbeOutcome =
  | { readonly status: "measured"; readonly metric: string; readonly value: number }
  | { readonly status: "no_evidence" }
  | { readonly status: "exec_error"; readonly detail: string };

export interface ProbeResult {
  readonly outcome: ProbeOutcome;
  readonly durationMs: number;
}

interface RawRun {
  readonly code: number | null;
  readonly stdout: string;
  readonly overflowed: boolean;
  readonly timedOut: boolean;
  readonly spawnError?: string;
}

function killGroup(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!Number.isInteger(pid) || pid === undefined || pid <= 0) return;
  try {
    // Negative pid → the whole detached process group (POSIX). On platforms
    // where this throws (Windows), the natural single-process kill on spawn
    // teardown is the fallback — documented degradation, not a crash.
    process.kill(-pid, signal);
  } catch {
    /* group already gone, or unsupported platform */
  }
}

function runShell(cwd: string, command: string, timeoutMs: number): Promise<RawRun> {
  return new Promise((resolve) => {
    const child = spawn("/bin/sh", ["-c", command], { cwd, detached: true });
    const chunks: Buffer[] = [];
    let total = 0;
    let overflowed = false;
    let timedOut = false;
    let settled = false;
    let killTimer: NodeJS.Timeout | undefined;
    const finish = (r: RawRun): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killTimer !== undefined) clearTimeout(killTimer); // don't hold the loop / kill a dead pid
      resolve(r);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup(child.pid, "SIGTERM");
      // Escalate to SIGKILL after a grace window; cleared by finish on natural exit.
      killTimer = setTimeout(() => killGroup(child.pid, "SIGKILL"), SIGKILL_GRACE_MS);
    }, timeoutMs);
    child.stdout.on("data", (buf: Buffer) => {
      if (overflowed) return;
      total += buf.length;
      if (total > MAX_STDOUT_BYTES) {
        overflowed = true;
        killGroup(child.pid, "SIGKILL");
        return;
      }
      chunks.push(buf);
    });
    child.on("error", (err) =>
      finish({ code: null, stdout: "", overflowed, timedOut, spawnError: err.message }),
    );
    child.on("close", (code) =>
      finish({ code, stdout: Buffer.concat(chunks).toString("utf8"), overflowed, timedOut }),
    );
  });
}

function lastNonEmptyLine(stdout: string): string {
  const lines = stdout.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i]?.trim() ?? "";
    if (t.length > 0) return t;
  }
  return "";
}

function mapRun(run: RawRun): ProbeOutcome {
  if (run.spawnError !== undefined) return { status: "exec_error", detail: run.spawnError };
  if (run.overflowed) return { status: "exec_error", detail: "probe stdout exceeded 1MB" };
  if (run.timedOut || run.code === null) return { status: "exec_error", detail: "probe timed out" };
  if (run.code === NO_EVIDENCE_EXIT) return { status: "no_evidence" };
  if (run.code !== 0) return { status: "exec_error", detail: `probe exited ${run.code}` };
  const line = lastNonEmptyLine(run.stdout);
  if (Buffer.byteLength(line, "utf8") > MAX_LAST_LINE_BYTES) {
    return { status: "exec_error", detail: "probe last line exceeds 64KB" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { status: "exec_error", detail: "probe last line is not JSON" };
  }
  const reading = ProbeReading.safeParse(parsed);
  if (!reading.success)
    return { status: "exec_error", detail: "probe last line is not {metric,value}" };
  // Read ONLY the two validated keys — never spread `parsed` (prototype pollution).
  return { status: "measured", metric: reading.data.metric, value: reading.data.value };
}

export async function runProbe(cwd: string, measure: MeasureContract): Promise<ProbeResult> {
  const startedMs = Date.now();
  const run = await runShell(cwd, measure.command, measure.timeoutSeconds * 1000);
  return { outcome: mapRun(run), durationMs: Date.now() - startedMs };
}

/** Verdict for a value-bearing outcome. exec_error is handled at the call site
 *  (exit 4, no write) so this narrows to the two verdict-bearing arms and its
 *  `never` guard stays meaningful (TS-M2). */
export function verdictFor(
  outcome: { status: "measured"; value: number } | { status: "no_evidence" },
  threshold: MeasureContract["threshold"],
): OutcomeVerdict {
  switch (outcome.status) {
    case "measured":
      return compareThreshold(outcome.value, threshold) ? "MEASURED_PASS" : "MEASURED_FAIL";
    case "no_evidence":
      return "NO_EVIDENCE";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}
