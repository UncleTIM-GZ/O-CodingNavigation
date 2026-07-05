import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import type { StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";
import { newCorrelationId } from "../audit/correlation.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "../audit/index.js";
import { teardownAgentIntegration, type TeardownFile } from "../agent-setup/teardown.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { LockTimeoutError, withLock } from "../state/lock.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
  writeStateUnlocked,
} from "../state/state-store.js";
import { nowIsoUtc } from "../time.js";
import { isStopped } from "./stopped.js";

// `ocn stop` — terminate OCN for this project (engine/CLI feature, NOT an SOP
// bump). One-way: writes the `stoppedAt` marker into state.json under the lock
// (so every runtime surface goes quiet) and then uninstalls the injected
// Claude Code wiring (teardown). Human-only, CLI-only — never exposed over MCP.
// Structural sibling of `cycle new` / `rewind`: single audit event type
// (project_stopped, result success|failed + data.failureReason), stale-check
// inside the lock, identical error mapping.

export interface StopOptions {
  readonly cwd: string;
  readonly reason?: string;
}

export interface StopData {
  readonly from: StepLocation;
  readonly stoppedAt: string;
  readonly teardown: readonly TeardownFile[];
  readonly correlationId: string;
}

class StaleStopError extends Error {
  constructor(public readonly observed: StepLocation) {
    super("stale stop — state changed during ocn stop");
    this.name = "StaleStopError";
  }
}

function isFsError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && typeof (err as NodeJS.ErrnoException).code === "string";
}

export async function stopProject(opts: StopOptions): Promise<CommandResult<StopData>> {
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

  const from: StepLocation = { stateId: state.currentStateId, stepId: state.currentStepId };

  const buildEvent = (
    result: "success" | "failed",
    message: { en: string; zh: string },
    data: unknown,
  ): CreateAuditEventInput => ({
    eventType: "project_stopped",
    result,
    actor: "user",
    source: "cli",
    projectRoot: opts.cwd,
    currentStateId: from.stateId,
    currentStepId: from.stepId,
    command: "stop",
    correlationId,
    message,
    data,
  });

  // Idempotent: already stopped → no state re-write, but RE-RUN teardown so a
  // retry can finish an uninstall that a prior run left partial (the first stop
  // is fail-open on teardown; teardown itself is idempotent). This is the only
  // way to complete a half-uninstalled project.
  if (isStopped(state)) {
    let teardownFiles: readonly TeardownFile[] = [];
    try {
      teardownFiles = (await teardownAgentIntegration({ cwd: opts.cwd })).files;
    } catch {
      // fail-open: a teardown hiccup must not turn an idempotent retry into an error.
    }
    return ok(msg("OCN is already stopped for this project.", "本项目的 OCN 已处于终止状态。"), {
      from,
      stoppedAt: state.stoppedAt as string,
      teardown: teardownFiles,
      correlationId,
    });
  }

  const lockFile = join(Paths.ocodingDir(opts.cwd), ".lock");
  const lockHook = makeLockAuditHook({
    projectRoot: opts.cwd,
    command: "stop",
    currentStateId: from.stateId,
    currentStepId: from.stepId,
    correlationId,
  });

  let stoppedAt: string;
  try {
    stoppedAt = await withLock(
      { lockFile, command: "stop", projectRoot: opts.cwd, lifecycle: lockHook },
      async () => {
        const current = await readState(opts.cwd);
        if (current.currentStateId !== from.stateId || current.currentStepId !== from.stepId) {
          throw new StaleStopError({
            stateId: current.currentStateId,
            stepId: current.currentStepId,
          });
        }
        const ts = nowIsoUtc();
        await writeStateUnlocked(opts.cwd, { ...current, stoppedAt: ts });
        return ts;
      },
    );
  } catch (err) {
    if (err instanceof StaleStopError) {
      const message = msg(
        `Stop aborted: project state changed during ocn stop (now at ${err.observed.stateId} / ${err.observed.stepId}).`,
        `终止已放弃：终止期间状态被并发改写（当前位于 ${err.observed.stateId} / ${err.observed.stepId}）。`,
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
        "Could not acquire OCN lock during ocn stop. Another OCN process may be running.",
        "终止期间无法获取 OCN 锁，可能有其他 OCN 进程正在运行。",
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
        `Stop failed while writing state: ${err.message}`,
        `终止写入状态失败：${err.message}`,
      );
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          buildEvent("failed", message, { from, failureReason: "state_write_failed" }),
        ),
      );
      return blocked("ERR_IO_OR_CONFIG", message, { from, correlationId });
    }
    throw err;
  }

  // State is committed. Uninstall the Claude Code wiring — fail-open: a teardown
  // hiccup must NOT undo the stop; it downgrades to a warning in the audit.
  let teardownFiles: readonly TeardownFile[] = [];
  let teardownWarning: string | undefined;
  try {
    teardownFiles = (await teardownAgentIntegration({ cwd: opts.cwd })).files;
  } catch (err) {
    teardownWarning = err instanceof Error ? err.message : String(err);
  }

  const successMessage = msg(
    `OCN stopped at ${from.stateId} / ${from.stepId}. The runtime no longer drives this project and the Claude Code wiring was uninstalled. You are in free self-development mode.`,
    `OCN 已在 ${from.stateId} / ${from.stepId} 终止。运行时不再驱动本项目，Claude Code 集成已卸载。已进入自由自我开发模式。`,
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildEvent("success", successMessage, {
        from,
        stoppedAt,
        ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
        teardown: teardownFiles,
        ...(teardownWarning !== undefined ? { teardownWarning } : {}),
      }),
    ),
  );

  return ok(successMessage, { from, stoppedAt, teardown: teardownFiles, correlationId });
}
