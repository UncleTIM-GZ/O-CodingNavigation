import type { LockHandle, LockLifecycleHook, LockTimeoutError } from "../state/lock.js";
import type { AuditEvent } from "../../types/audit.js";
import { msg } from "../i18n.js";
import { createAuditEvent } from "./audit-event.js";
import { safeAudit } from "./audit-writer.js";

// Builds a LockLifecycleHook that emits the four lock-related audit events.
// The hook never acquires any lock and never calls writeState — it just
// constructs an AuditEvent and routes through safeAudit (which itself never
// throws). See plan §3.6.

export interface LockAuditHookContext {
  readonly projectRoot: string;
  readonly command: string;
  readonly currentStateId?: string;
  readonly currentStepId?: string;
}

export function makeLockAuditHook(ctx: LockAuditHookContext): LockLifecycleHook {
  const baseEvent = (
    eventType: AuditEvent["eventType"],
    result: AuditEvent["result"],
    message: AuditEvent["message"],
    extra?: { handle?: LockHandle; data?: Record<string, unknown> },
  ): AuditEvent => {
    const data: Record<string, unknown> = { ...(extra?.data ?? {}) };
    if (extra?.handle) {
      data["lockFile"] = extra.handle.lockFile;
      data["lockOwnerPid"] = extra.handle.lockState.pid;
      data["lockOwnerCommand"] = extra.handle.lockState.command;
      data["reclaimed"] = extra.handle.reclaimed;
    }
    return createAuditEvent({
      eventType,
      result,
      actor: "system",
      source: "core",
      projectRoot: ctx.projectRoot,
      command: ctx.command,
      ...(ctx.currentStateId !== undefined ? { currentStateId: ctx.currentStateId } : {}),
      ...(ctx.currentStepId !== undefined ? { currentStepId: ctx.currentStepId } : {}),
      message,
      data,
    });
  };

  return {
    onAcquired: async (handle: LockHandle) => {
      await safeAudit(
        ctx.projectRoot,
        baseEvent(
          "lock_acquired",
          "success",
          msg(
            `Lock acquired at ${handle.lockFile}.`,
            `已获取锁：${handle.lockFile}。`,
          ),
          { handle },
        ),
      );
    },
    onReleased: async (handle: LockHandle) => {
      await safeAudit(
        ctx.projectRoot,
        baseEvent(
          "lock_released",
          "success",
          msg(
            `Lock released at ${handle.lockFile}.`,
            `已释放锁：${handle.lockFile}。`,
          ),
          { handle },
        ),
      );
    },
    onTimeout: async (err: LockTimeoutError) => {
      await safeAudit(
        ctx.projectRoot,
        baseEvent(
          "lock_timeout",
          "failed",
          msg(
            `Lock acquisition timed out at ${err.lockFile} after ${err.waitedMs}ms.`,
            `获取锁超时：${err.lockFile}，等待 ${err.waitedMs}ms。`,
          ),
          {
            data: {
              lockFile: err.lockFile,
              waitedMs: err.waitedMs,
            },
          },
        ),
      );
    },
    onStaleRecovered: async (handle: LockHandle) => {
      await safeAudit(
        ctx.projectRoot,
        baseEvent(
          "lock_stale_recovered",
          "detected",
          msg(
            `Stale lock recovered at ${handle.lockFile}.`,
            `已回收陈旧锁：${handle.lockFile}。`,
          ),
          { handle },
        ),
      );
    },
  };
}
