import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runProbe, verdictFor } from "../../src/core/outcome/probe-runner.js";
import type { MeasureContract } from "../../src/types/outcome.js";

// SOP 0.9.0 (AM-016) P2 — the probe executor's tri-state mapping is the first
// anti-forgery boundary: exit 0 with a bad last line is exec_error (never a
// silent "measured"), exit 20 is no_evidence, non-finite values are rejected.

const measure = (over: Partial<MeasureContract>): MeasureContract => ({
  command: over.command ?? "true",
  threshold: over.threshold ?? { op: ">=", value: 1 },
  source: over.source ?? "dist/**",
  due: over.due ?? "state_ship",
  timeoutSeconds: over.timeoutSeconds ?? 5,
});

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), "ocn-probe-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("runProbe tri-state", () => {
  it("exit 0 with a valid {metric,value} last line → measured", async () => {
    const r = await runProbe(root, measure({ command: `echo '{"metric":"p95","value":180}'` }));
    expect(r.outcome).toEqual({ status: "measured", metric: "p95", value: 180 });
  });

  it("exit 20 → no_evidence (NOT a failure)", async () => {
    const r = await runProbe(root, measure({ command: "exit 20" }));
    expect(r.outcome.status).toBe("no_evidence");
  });

  it("exit 0 but last line is not JSON → exec_error (never measured)", async () => {
    const r = await runProbe(root, measure({ command: "echo hello" }));
    expect(r.outcome.status).toBe("exec_error");
  });

  it("exit 0 but JSON missing value → exec_error", async () => {
    const r = await runProbe(root, measure({ command: `echo '{"metric":"m"}'` }));
    expect(r.outcome.status).toBe("exec_error");
  });

  it.each(["Infinity", "NaN", "1e400"])("non-finite value %s → exec_error", async (v) => {
    // JSON can't carry Infinity/NaN literally; a probe emitting them stringifies
    // to Infinity/NaN (invalid JSON) or 1e400 → Infinity after parse — both rejected.
    const r = await runProbe(root, measure({ command: `echo '{"metric":"m","value":${v}}'` }));
    expect(r.outcome.status).toBe("exec_error");
  });

  it("string-number value → exec_error (no coercion)", async () => {
    const r = await runProbe(root, measure({ command: `echo '{"metric":"m","value":"1"}'` }));
    expect(r.outcome.status).toBe("exec_error");
  });

  it("__proto__ key does not pollute and is stripped → still measured", async () => {
    const cmd = `echo '{"__proto__":{"polluted":true},"metric":"m","value":5}'`;
    const r = await runProbe(root, measure({ command: cmd }));
    expect(r.outcome).toEqual({ status: "measured", metric: "m", value: 5 });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("a diagnostic extra field is tolerated (strip, not strict) → measured", async () => {
    const cmd = `echo '{"metric":"m","value":5,"unit":"ms"}'`;
    const r = await runProbe(root, measure({ command: cmd }));
    expect(r.outcome).toEqual({ status: "measured", metric: "m", value: 5 });
  });

  it("nonzero non-20 exit → exec_error", async () => {
    const r = await runProbe(root, measure({ command: "exit 3" }));
    expect(r.outcome.status).toBe("exec_error");
  });

  it("timeout → exec_error (no fake value)", async () => {
    const r = await runProbe(root, measure({ command: "sleep 5", timeoutSeconds: 1 }));
    expect(r.outcome.status).toBe("exec_error");
  });

  it("reads only the LAST non-empty line", async () => {
    const r = await runProbe(
      root,
      measure({ command: `printf 'noise\\n{"metric":"m","value":9}\\n'` }),
    );
    expect(r.outcome).toEqual({ status: "measured", metric: "m", value: 9 });
  });
});

describe("verdictFor", () => {
  it("measured PASS/FAIL by threshold; no_evidence → NO_EVIDENCE", () => {
    const th = { op: ">=" as const, value: 100 };
    expect(verdictFor({ status: "measured", value: 180 }, th)).toBe("MEASURED_PASS");
    expect(verdictFor({ status: "measured", value: 50 }, th)).toBe("MEASURED_FAIL");
    expect(verdictFor({ status: "no_evidence" }, th)).toBe("NO_EVIDENCE");
  });
});
