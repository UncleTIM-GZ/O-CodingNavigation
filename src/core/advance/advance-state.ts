import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import type { AdvanceResult, GateResult, StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";
import { newCorrelationId } from "../audit/correlation.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "../audit/index.js";
import { runGate } from "../gate/gate-runner.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { loadSopProfile } from "../sop/loader.js";
import { LockTimeoutError, withLock } from "../state/lock.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
  writeStateUnlocked,
} from "../state/state-store.js";

export interface AdvanceOptions {
  readonly cwd: string;
}

type AdvanceEventType =
  | "advance_started"
  | "advance_succeeded"
  | "advance_failed"
  | "state_transitioned"
  | "state_write_succeeded";

export async function advanceState(
  opts: AdvanceOptions,
): Promise<CommandResult<AdvanceResult>> {
  const correlationId = newCorrelationId();

  // Read state once outside the lock to derive context for audit emission.
  let state: ProjectState;
  try {
    state = await readState(opts.cwd);
  } catch (err) {
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

  const from: StepLocation = {
    stateId: state.currentStateId,
    stepId: state.currentStepId,
  };

  const buildAdvanceEvent = (
    eventType: AdvanceEventType,
    result: "executed" | "success" | "failed",
    message: { en: string; zh: string },
    data?: unknown,
    nextLocation?: StepLocation,
  ): CreateAuditEventInput => ({
    eventType,
    result,
    actor: "user",
    source: "cli",
    projectRoot: opts.cwd,
    currentStateId: nextLocation?.stateId ?? from.stateId,
    currentStepId: nextLocation?.stepId ?? from.stepId,
    command: "advance",
    correlationId,
    message,
    ...(data !== undefined ? { data } : {}),
  });

  // 1. advance_started
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildAdvanceEvent(
        "advance_started",
        "executed",
        msg(
          `Advance started from ${from.stateId} / ${from.stepId}.`,
          `开始从 ${from.stateId} / ${from.stepId} 推进。`,
        ),
        { from },
      ),
    ),
  );

  // 2. Run gate (carries the same correlationId via runGate's parameter).
  const gate = await runGate({
    cwd: opts.cwd,
    correlationId,
    actor: "user",
    source: "cli",
    command: "advance",
  });

  // 3a. Gate blocked → emit advance_failed; no state mutation.
  if (!gate.ok) {
    const gateData = gate.data as GateResult | undefined;
    const reason = gate.code === "ERR_GATE_FAILED" ? "gate_blocked" : gate.code;
    const failMessage = msg(
      `Advance blocked: gate failed at ${from.stateId} / ${from.stepId}.`,
      `推进被阻：在 ${from.stateId} / ${from.stepId} 处门禁未通过。`,
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        buildAdvanceEvent("advance_failed", "failed", failMessage, {
          from,
          reason,
          gate: gateData,
        }),
      ),
    );
    const advanceData: AdvanceResult = {
      from,
      ...(gateData !== undefined ? { gate: gateData } : {}),
      correlationId,
    };
    return blocked("ERR_GATE_FAILED", failMessage, advanceData);
  }

  // 3b. Gate passed → compute next step.
  const profile = loadSopProfile();
  const next = profile.nextStep(from.stateId, from.stepId);

  if (next === null) {
    const failMessage = msg(
      `No next step after ${from.stateId} / ${from.stepId}; this is the terminal step.`,
      `${from.stateId} / ${from.stepId} 之后没有下一步：已到达终点。`,
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        buildAdvanceEvent("advance_failed", "failed", failMessage, {
          from,
          reason: "no_next_step",
        }),
      ),
    );
    const advanceData: AdvanceResult = { from, correlationId };
    return blocked("ERR_STATE_MACHINE", failMessage, advanceData);
  }

  // 4. Lock-protected state mutation.
  const lockFile = join(Paths.ocodingDir(opts.cwd), ".lock");
  const lockHook = makeLockAuditHook({
    projectRoot: opts.cwd,
    command: "advance",
    currentStateId: from.stateId,
    currentStepId: from.stepId,
  });

  try {
    await withLock(
      {
        lockFile,
        command: "advance",
        projectRoot: opts.cwd,
        lifecycle: lockHook,
      },
      async () => {
        // Re-read inside the lock to guard against a concurrent-advance race.
        const currentState = await readState(opts.cwd);
        const newState: ProjectState = {
          ...currentState,
          currentStateId: next.stateId,
          currentStepId: next.stepId,
        };
        await writeStateUnlocked(opts.cwd, newState);
      },
    );
  } catch (err) {
    if (err instanceof LockTimeoutError) {
      const failMessage = msg(
        "Could not acquire OCN lock during advance. Another OCN process may be running.",
        "推进期间无法获取 OCN 锁，可能有其他 OCN 进程正在运行。",
      );
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          buildAdvanceEvent("advance_failed", "failed", failMessage, {
            from,
            reason: "lock_timeout",
            lockFile: err.lockFile,
            waitedMs: err.waitedMs,
          }),
        ),
      );
      const advanceData: AdvanceResult = { from, correlationId };
      return blocked("ERR_IO_OR_CONFIG", failMessage, advanceData);
    }
    throw err;
  }

  // 5. Emit state_transitioned + state_write_succeeded + advance_succeeded.
  const transitionMessage = msg(
    `State transitioned: ${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}.`,
    `状态已推进：${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}。`,
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildAdvanceEvent(
        "state_transitioned",
        "success",
        transitionMessage,
        { from, to: next },
        next,
      ),
    ),
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildAdvanceEvent(
        "state_write_succeeded",
        "success",
        msg(
          `state.json updated to ${next.stateId} / ${next.stepId}.`,
          `state.json 已更新为 ${next.stateId} / ${next.stepId}。`,
        ),
        { from, to: next, stateFile: Paths.stateFile(opts.cwd) },
        next,
      ),
    ),
  );

  const successMessage = msg(
    `Advance succeeded: ${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}.`,
    `推进成功：${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}。`,
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildAdvanceEvent(
        "advance_succeeded",
        "success",
        successMessage,
        { from, to: next },
        next,
      ),
    ),
  );

  return ok(successMessage, { from, to: next, correlationId });
}
