import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// P4 — waiver precondition probes. Deliberately SHORT timeout (10s, vs the
// 120s build/test command probes): a precondition is meant to be a
// lightweight fact check (`grep`-/`test -f`-class), and it runs on every
// gate evaluation. Timeout or non-zero exit = precondition does not hold =
// the waiver is void (open world: doubt never relaxes a gate).

const WAIVER_PROBE_TIMEOUT_MS = 10_000;

export interface WaiverProbeResult {
  readonly ok: boolean;
  readonly detail: string;
}

export async function runWaiverProbe(root: string, probe: string): Promise<WaiverProbeResult> {
  try {
    await execFileP("/bin/sh", ["-c", probe], { cwd: root, timeout: WAIVER_PROBE_TIMEOUT_MS });
    return { ok: true, detail: `precondition holds (\`${probe}\` exited 0)` };
  } catch (err) {
    const code = (err as { code?: number | string }).code;
    return {
      ok: false,
      detail: `precondition failed (\`${probe}\` → ${typeof code === "number" ? `exit ${code}` : "timeout/error"})`,
    };
  }
}
