import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import type { CycleResult, StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";
import { newCorrelationId } from "../audit/correlation.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import {
  type ArchiveOutcome,
  archiveRoundUnlocked,
  firstStepOf,
  isFsError,
} from "./archive.js";
import { LockTimeoutError, withLock } from "../state/lock.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";

// DEC-033 — `ocn cycle new`: archive this round's `.ocoding` runtime state to
// `.ocoding/cycles/<n>-<ts>/` and open a new round at the profile's first
// step. Rulings: the archive dir name IS the round counter (② — no schema
// field); the audit JSONL is never archived (③ — one continuous log, the
// `cycle_started` event stitches rounds); the new round keeps the current pin
// (④ — upgrading is `ocn sop upgrade`'s job) and keeps the user-owned
// config.yaml live (a copy goes into the archive for the record). docs/
// artifacts are untouched so next-round gates fast-forward over them.

export interface CycleOptions {
  readonly cwd: string;
}

class StaleCycleError extends Error {
  constructor(public readonly observed: StepLocation) {
    super("stale cycle — state changed during cycle new");
    this.name = "StaleCycleError";
  }
}

export async function cycleNew(opts: CycleOptions): Promise<CommandResult<CycleResult>> {
  const correlationId = newCorrelationId();

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

  const buildEvent = (
    result: "success" | "failed",
    message: { en: string; zh: string },
    data: unknown,
    location?: StepLocation,
  ): CreateAuditEventInput => ({
    eventType: "cycle_started",
    result,
    actor: "user",
    source: "cli",
    projectRoot: opts.cwd,
    currentStateId: location?.stateId ?? from.stateId,
    currentStepId: location?.stepId ?? from.stepId,
    command: "cycle",
    correlationId,
    message,
    data,
  });

  const profile = resolveProfileForProject(state.project.sopProfileVersion);
  const to = firstStepOf(profile);
  if (to === null) {
    const message = msg(
      "Cycle refused: the pinned profile declares no steps.",
      "重开被拒：当前 pin 的 profile 未声明任何步骤。",
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent(buildEvent("failed", message, { from, failureReason: "empty_profile" })),
    );
    return blocked("ERR_STATE_MACHINE", message, { from, correlationId });
  }

  const lockFile = join(Paths.ocodingDir(opts.cwd), ".lock");
  const lockHook = makeLockAuditHook({
    projectRoot: opts.cwd,
    command: "cycle",
    currentStateId: from.stateId,
    currentStepId: from.stepId,
    correlationId,
  });

  let outcome: ArchiveOutcome;
  try {
    outcome = await withLock(
      { lockFile, command: "cycle", projectRoot: opts.cwd, lifecycle: lockHook },
      async () => {
        const currentState = await readState(opts.cwd);
        if (
          currentState.currentStateId !== from.stateId ||
          currentState.currentStepId !== from.stepId
        ) {
          throw new StaleCycleError({
            stateId: currentState.currentStateId,
            stepId: currentState.currentStepId,
          });
        }
        return archiveRoundUnlocked(opts.cwd, currentState, profile, to);
      },
    );
  } catch (err) {
    if (err instanceof StaleCycleError) {
      const message = msg(
        `Cycle aborted: project state changed during cycle new (now at ${err.observed.stateId} / ${err.observed.stepId}).`,
        `重开已放弃：重开期间状态被并发改写（当前位于 ${err.observed.stateId} / ${err.observed.stepId}）。`,
      );
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          buildEvent("failed", message, {
            from,
            observed: err.observed,
            failureReason: "stale_state",
          }),
        ),
      );
      return blocked("ERR_STATE_MACHINE", message, { from, correlationId });
    }
    if (err instanceof LockTimeoutError) {
      const message = msg(
        "Could not acquire OCN lock during cycle new. Another OCN process may be running.",
        "重开期间无法获取 OCN 锁，可能有其他 OCN 进程正在运行。",
      );
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          buildEvent("failed", message, {
            from,
            failureReason: "lock_timeout",
            lockFile: err.lockFile,
            waitedMs: err.waitedMs,
          }),
        ),
      );
      return blocked("ERR_IO_OR_CONFIG", message, { from, correlationId });
    }
    if (isFsError(err)) {
      const message = msg(
        `Cycle failed while archiving: ${err.message}`,
        `重开归档失败：${err.message}`,
      );
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          buildEvent("failed", message, { from, failureReason: "archive_io_failed" }),
        ),
      );
      return blocked("ERR_IO_OR_CONFIG", message, { from, correlationId });
    }
    throw err;
  }

  const successMessage = msg(
    `Round ${outcome.round} archived to ${outcome.archiveRelPath}; new round starts at ${to.stateId} / ${to.stepId}.`,
    `第 ${outcome.round} 轮已归档至 ${outcome.archiveRelPath}；新一轮从 ${to.stateId} / ${to.stepId} 开始。`,
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildEvent(
        "success",
        successMessage,
        { from, to, round: outcome.round, archivePath: outcome.archiveRelPath },
        to,
      ),
    ),
  );

  return ok(successMessage, {
    from,
    to,
    round: outcome.round,
    archivePath: outcome.archiveRelPath,
    correlationId,
  });
}
