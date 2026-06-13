import { join } from "node:path";
import type { AuditActor } from "../../types/audit.js";
import type { CommandResult } from "../../types/result.js";
import type { RewindResult, StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";
import { newCorrelationId } from "../audit/correlation.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "../audit/index.js";
import { loadAutomation } from "../automation/ai-guard.js";
import { authorizeAiRewind } from "../automation/authorization.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import { LockTimeoutError, withLock } from "../state/lock.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
  writeStateUnlocked,
} from "../state/state-store.js";
import { resolveRewindTarget } from "./rewind-target.js";

// DEC-033 — controlled cursor rewind (`ocn rewind`). Human-only, CLI-only:
// moves the cursor STRICTLY backwards within the current round, under the
// same lock + stale-check + backup/atomic-rename discipline as advance, and
// records the move as a `cursor_rewind` push audit event. The timeline only
// ever moves forward; the cursor may move back. Rewind grants no gate
// exemption — every advance after a rewind re-runs the full gate stack.

export interface RewindOptions {
  readonly cwd: string;
  readonly targetStepId: string;
  /** Mandatory non-empty justification — a rewind without a reason is
   *  refused (mirrors readiness waive / advance override). */
  readonly reason: string;
  /** AM-009 — caller identity. ai_agent is authorized for exactly ONE shape:
   *  the milestone-loop rewind to step_build_plan from BUILD/VERIFY under
   *  phase-2 auto mode; everything else stays human-only. */
  readonly actor?: AuditActor;
}

/** Sentinel thrown inside the lock when a concurrent writer has already
 *  moved the cursor away from the pre-lock position. */
class StaleRewindError extends Error {
  constructor(public readonly observed: StepLocation) {
    super("stale rewind — state changed during rewind");
    this.name = "StaleRewindError";
  }
}

interface RewindContext {
  readonly cwd: string;
  readonly correlationId: string;
  readonly from: StepLocation;
  readonly actor: AuditActor;
}

function buildEvent(
  ctx: RewindContext,
  result: "success" | "failed",
  message: { en: string; zh: string },
  data: unknown,
  location?: StepLocation,
): CreateAuditEventInput {
  return {
    eventType: "cursor_rewind",
    result,
    actor: ctx.actor,
    source: "cli",
    projectRoot: ctx.cwd,
    currentStateId: location?.stateId ?? ctx.from.stateId,
    currentStepId: location?.stepId ?? ctx.from.stepId,
    command: "rewind",
    correlationId: ctx.correlationId,
    message,
    data,
  };
}

async function auditFailure(
  ctx: RewindContext,
  message: { en: string; zh: string },
  failureReason: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await safeAudit(
    ctx.cwd,
    createAuditEvent(
      buildEvent(ctx, "failed", message, { from: ctx.from, failureReason, ...extra }),
    ),
  );
}

function readBlockedResult(err: unknown): CommandResult<RewindResult> {
  if (err instanceof StateNotFoundError) {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        "OCN is not initialized in this directory. Run `ocn init` first.",
        "当前目录未初始化 OCN，请先执行 `ocn init`。",
      ),
    );
  }
  if (err instanceof StateInvalidError) {
    return blocked(
      "ERR_STATE_MACHINE",
      msg("state.json is invalid.", "state.json 内容不合法。"),
      undefined,
      err.issues,
    );
  }
  throw err;
}

export async function rewindState(opts: RewindOptions): Promise<CommandResult<RewindResult>> {
  const correlationId = newCorrelationId();

  let state: ProjectState;
  try {
    state = await readState(opts.cwd);
  } catch (err) {
    return readBlockedResult(err);
  }

  const from: StepLocation = {
    stateId: state.currentStateId,
    stepId: state.currentStepId,
  };
  const actor = opts.actor ?? "user";
  const ctx: RewindContext = { cwd: opts.cwd, correlationId, from, actor };

  // AM-009 — milestone-loop authorization for ai_agent callers (--reason
  // doubles as the rationale; it is already mandatory below).
  if (actor === "ai_agent") {
    const automation = await loadAutomation(opts.cwd);
    const refusal = authorizeAiRewind(
      { ...automation, rationale: opts.reason },
      { fromStateId: from.stateId, targetStepId: opts.targetStepId },
    );
    if (refusal !== null) {
      await auditFailure(ctx, refusal.message, refusal.reason, {
        targetStepId: opts.targetStepId,
        reason: opts.reason,
      });
      return blocked("ERR_IO_OR_CONFIG", refusal.message, { from, correlationId });
    }
  }

  if (opts.reason.trim().length === 0) {
    const message = msg(
      "Rewind refused: --reason is mandatory and must be non-empty.",
      "回拨被拒：--reason 为必填且不能为空。",
    );
    await auditFailure(ctx, message, "empty_reason", { targetStepId: opts.targetStepId });
    return blocked("ERR_IO_OR_CONFIG", message, { from, correlationId });
  }

  const profile = resolveProfileForProject(state.project.sopProfileVersion);
  const resolution = resolveRewindTarget(profile, from, opts.targetStepId);
  if (!resolution.ok) {
    const message = msg(
      `Rewind refused (${resolution.failure}): target ${opts.targetStepId} must exist in the pinned profile and be strictly earlier than ${from.stateId} / ${from.stepId}.`,
      `回拨被拒（${resolution.failure}）：目标 ${opts.targetStepId} 必须存在于当前 pin 的 profile 且严格早于 ${from.stateId} / ${from.stepId}。`,
    );
    await auditFailure(ctx, message, resolution.failure, {
      targetStepId: opts.targetStepId,
      reason: opts.reason,
    });
    return blocked("ERR_STATE_MACHINE", message, { from, correlationId });
  }
  const to = resolution.to;

  const lockFile = join(Paths.ocodingDir(opts.cwd), ".lock");
  const lockHook = makeLockAuditHook({
    projectRoot: opts.cwd,
    command: "rewind",
    currentStateId: from.stateId,
    currentStepId: from.stepId,
    correlationId,
  });

  try {
    await withLock(
      { lockFile, command: "rewind", projectRoot: opts.cwd, lifecycle: lockHook },
      async () => {
        // Re-read inside the lock: a concurrent advance/rewind may have moved
        // the cursor; writing the pre-lock target would overwrite newer state.
        const currentState = await readState(opts.cwd);
        if (
          currentState.currentStateId !== from.stateId ||
          currentState.currentStepId !== from.stepId
        ) {
          throw new StaleRewindError({
            stateId: currentState.currentStateId,
            stepId: currentState.currentStepId,
          });
        }
        const newState: ProjectState = {
          ...currentState,
          currentStateId: to.stateId,
          currentStepId: to.stepId,
          // The previous gate verdict described the old position — meaningless
          // at the rewind target (proposal §3.4).
          latestGateResult: null,
        };
        await writeStateUnlocked(opts.cwd, newState);
      },
    );
  } catch (err) {
    if (err instanceof StaleRewindError) {
      const message = msg(
        `Rewind aborted: project state changed during rewind (now at ${err.observed.stateId} / ${err.observed.stepId}).`,
        `回拨已放弃：回拨期间状态被并发改写（当前位于 ${err.observed.stateId} / ${err.observed.stepId}）。`,
      );
      await auditFailure(ctx, message, "stale_state", {
        observed: err.observed,
        reason: opts.reason,
      });
      return blocked("ERR_STATE_MACHINE", message, { from, correlationId });
    }
    if (err instanceof LockTimeoutError) {
      const message = msg(
        "Could not acquire OCN lock during rewind. Another OCN process may be running.",
        "回拨期间无法获取 OCN 锁，可能有其他 OCN 进程正在运行。",
      );
      await auditFailure(ctx, message, "lock_timeout", {
        lockFile: err.lockFile,
        waitedMs: err.waitedMs,
        reason: opts.reason,
      });
      return blocked("ERR_IO_OR_CONFIG", message, { from, correlationId });
    }
    throw err;
  }

  const successMessage = msg(
    `Cursor rewound: ${from.stateId} / ${from.stepId} → ${to.stateId} / ${to.stepId}.`,
    `游标已回拨：${from.stateId} / ${from.stepId} → ${to.stateId} / ${to.stepId}。`,
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildEvent(ctx, "success", successMessage, { from, to, reason: opts.reason }, to),
    ),
  );

  return ok(successMessage, { from, to, reason: opts.reason, correlationId });
}
