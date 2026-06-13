import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import type { AdvanceResult, StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked } from "../result.js";
import { LockTimeoutError, withLock } from "../state/lock.js";
import { readState, writeStateUnlocked } from "../state/state-store.js";
import type { AdvanceEventBuilder } from "./advance-events.js";

// Lock-protected cursor mutation for `ocn advance`, extracted verbatim from
// advance-state.ts (AM-009 size split). Stale-check semantics unchanged: the
// second of two racing advances observes the moved cursor and aborts with a
// structured ERR_STATE_MACHINE instead of overwriting newer state.

/** Sentinel thrown from inside the lock when a concurrent advance has already
 *  moved the project past `from`. */
class StaleAdvanceError extends Error {
  constructor(public readonly observed: StepLocation) {
    super("stale advance — state changed during advance");
    this.name = "StaleAdvanceError";
  }
}

export interface ApplyTransitionArgs {
  readonly cwd: string;
  readonly from: StepLocation;
  readonly next: StepLocation;
  readonly correlationId: string;
  readonly buildEvent: AdvanceEventBuilder;
}

/** Returns null on success, or the blocked CommandResult to surface. */
export async function applyAdvanceTransition(
  args: ApplyTransitionArgs,
): Promise<CommandResult<AdvanceResult> | null> {
  const { cwd, from, next, correlationId, buildEvent } = args;
  const lockFile = join(Paths.ocodingDir(cwd), ".lock");
  const lockHook = makeLockAuditHook({
    projectRoot: cwd,
    command: "advance",
    currentStateId: from.stateId,
    currentStepId: from.stepId,
    correlationId,
  });

  try {
    await withLock({ lockFile, command: "advance", projectRoot: cwd, lifecycle: lockHook }, async () => {
      // Re-read inside the lock to detect concurrent advance.
      const currentState = await readState(cwd);
      if (
        currentState.currentStateId !== from.stateId ||
        currentState.currentStepId !== from.stepId
      ) {
        throw new StaleAdvanceError({
          stateId: currentState.currentStateId,
          stepId: currentState.currentStepId,
        });
      }
      const newState: ProjectState = {
        ...currentState,
        currentStateId: next.stateId,
        currentStepId: next.stepId,
      };
      await writeStateUnlocked(cwd, newState);
    });
    return null;
  } catch (err) {
    if (err instanceof StaleAdvanceError) {
      const failMessage = msg(
        `Advance aborted: project state changed during advance (now at ${err.observed.stateId} / ${err.observed.stepId}).`,
        `推进已放弃：在推进期间状态被并发改写（当前位于 ${err.observed.stateId} / ${err.observed.stepId}）。`,
      );
      await safeAudit(
        cwd,
        createAuditEvent(
          buildEvent("advance_failed", "failed", failMessage, {
            from,
            observed: err.observed,
            reason: "stale_state",
          }),
        ),
      );
      return blocked("ERR_STATE_MACHINE", failMessage, { from, correlationId });
    }
    if (err instanceof LockTimeoutError) {
      const failMessage = msg(
        "Could not acquire OCN lock during advance. Another OCN process may be running.",
        "推进期间无法获取 OCN 锁，可能有其他 OCN 进程正在运行。",
      );
      await safeAudit(
        cwd,
        createAuditEvent(
          buildEvent("advance_failed", "failed", failMessage, {
            from,
            reason: "lock_timeout",
            lockFile: err.lockFile,
            waitedMs: err.waitedMs,
          }),
        ),
      );
      return blocked("ERR_IO_OR_CONFIG", failMessage, { from, correlationId });
    }
    throw err;
  }
}

/** Step-5 success audits (state_transitioned + state_write_succeeded). */
export async function emitTransitionAudits(
  cwd: string,
  from: StepLocation,
  next: StepLocation,
  buildEvent: AdvanceEventBuilder,
): Promise<void> {
  await safeAudit(
    cwd,
    createAuditEvent(
      buildEvent(
        "state_transitioned",
        "success",
        msg(
          `State transitioned: ${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}.`,
          `状态已推进：${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}。`,
        ),
        { from, to: next },
        next,
      ),
    ),
  );
  await safeAudit(
    cwd,
    createAuditEvent(
      buildEvent(
        "state_write_succeeded",
        "success",
        msg(
          `state.json updated to ${next.stateId} / ${next.stepId}.`,
          `state.json 已更新为 ${next.stateId} / ${next.stepId}。`,
        ),
        { from, to: next, stateFile: Paths.stateFile(cwd) },
        next,
      ),
    ),
  );
}
