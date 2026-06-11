import type { BilingualMessage } from "../../types/i18n.js";
import type { CommandResult } from "../../types/result.js";
import type { SopProfile } from "../../types/sop.js";
import type { ProjectState } from "../../types/state.js";
import { blocked } from "../result.js";
import { runReadinessGate } from "./readiness-gate.js";

// SOP 0.4.0 (AM-004) — shared invocation of the readiness cross-cutting gate
// for a single step, used by BOTH `ocn check` and the gate runner so the two
// paths cannot drift. Readiness is cross-cutting: it runs whether or not the
// step has a required artifact (it validates the repo + all docs, not this
// step's artifact). Returns a blocked CommandResult when readiness is unmet,
// else null (pass / profile has no rulebook).

export interface ReadinessStepOptions<T> {
  readonly cwd: string;
  readonly profile: SopProfile;
  readonly state: ProjectState;
  /** W1 — false for read-only callers (MCP): probe commands are not run. */
  readonly executeCommands: boolean;
  /** Builds the caller-specific blocked payload (GateResult vs CheckData). */
  readonly buildBlockedData: () => T;
  /** Caller-specific audit emission (different ctx per call site). */
  readonly emitAudit: (
    message: BilingualMessage,
    blockingIds: readonly string[],
  ) => Promise<void>;
}

export async function readinessStepBlockOrNull<T>(
  opts: ReadinessStepOptions<T>,
): Promise<CommandResult<T> | null> {
  if (opts.profile.readinessYaml === undefined) return null;
  const readiness = await runReadinessGate({
    cwd: opts.cwd,
    profile: opts.profile,
    state: opts.state,
    executeCommands: opts.executeCommands,
  });
  if (readiness.ok) return null;
  await opts.emitAudit(
    readiness.message,
    readiness.blocking.map((c) => c.id),
  );
  return blocked("ERR_GATE_FAILED", readiness.message, opts.buildBlockedData());
}
