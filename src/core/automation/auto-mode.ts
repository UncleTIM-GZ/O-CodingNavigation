import { join } from "node:path";
import type { AuditActor } from "../../types/audit.js";
import type { AutomationConfig, AutomationRuntime } from "../../types/automation.js";
import type { CommandResult } from "../../types/result.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";
import { newCorrelationId } from "../audit/correlation.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { LockTimeoutError, withLock } from "../state/lock.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { readAutomationConfig, writeAutomationConfig } from "./automation-config.js";
import {
  DEFAULT_AUTOMATION_RUNTIME,
  readAutomationRuntime,
  writeAutomationRuntime,
} from "./automation-runtime-store.js";

// AM-009 / DEC-034 — `ocn auto` switch core. The switch is the AUTHORIZATION
// EVENT: a human turning a phase on is what converts "advance is human-only"
// into "advance is human-authorized" for that phase. Hence it is itself
// human-only (ai_agent refused), CLI-only (never over MCP), and every
// on/off/resume writes an `auto_mode_changed` push audit event. `status` is
// pull-mode and writes nothing (§4.7).

export type AutoPhaseArg = "1" | "2" | "all";
export type AutoSwitchAction = "on" | "off" | "resume";

export interface AutoStatusPayload {
  readonly config: AutomationConfig;
  readonly runtime: AutomationRuntime;
  /** Present on switch results only — ties the audit events of one invocation. */
  readonly correlationId?: string;
}

export interface AutoSwitchOptions {
  readonly cwd: string;
  readonly action: AutoSwitchAction;
  readonly phase?: AutoPhaseArg;
  readonly actor: AuditActor;
}

const PHASE_LABEL: Record<AutoPhaseArg, { en: string; zh: string }> = {
  "1": { en: "phase 1 (DISCOVERY→PLAN)", zh: "第一阶段（DISCOVERY→PLAN）" },
  "2": { en: "phase 2 (BUILD→VERIFY)", zh: "第二阶段（BUILD→VERIFY）" },
  all: { en: "both phases", zh: "两个阶段（全自动）" },
};

function notInitialized<T>(): CommandResult<T> {
  return blocked(
    "ERR_IO_OR_CONFIG",
    msg(
      "OCN is not initialized in this directory. Run `ocn init` first.",
      "当前目录未初始化 OCN，请先执行 `ocn init`。",
    ),
  );
}

async function requireInitialized(cwd: string): Promise<CommandResult<never> | null> {
  try {
    await readState(cwd);
    return null;
  } catch (err) {
    if (err instanceof StateNotFoundError) return notInitialized();
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
}

export async function autoStatus(cwd: string): Promise<CommandResult<AutoStatusPayload>> {
  const guard = await requireInitialized(cwd);
  if (guard !== null) return guard;
  const config = await readAutomationConfig(cwd);
  const runtime = await readAutomationRuntime(cwd);
  const phases = describeEnabled(config);
  return ok(
    msg(
      `Auto mode: ${phases.en}${runtime.suspended ? " — SUSPENDED (circuit breaker); run `ocn auto resume`" : ""}.`,
      `自动模式：${phases.zh}${runtime.suspended ? "——已熔断暂停，请执行 `ocn auto resume` 恢复" : ""}。`,
    ),
    { config, runtime },
  );
}

function describeEnabled(config: AutomationConfig): { en: string; zh: string } {
  if (config.phase1 && config.phase2) return { en: "ON for both phases", zh: "两个阶段均已开启" };
  if (config.phase1) return { en: "ON for phase 1 only", zh: "仅第一阶段开启" };
  if (config.phase2) return { en: "ON for phase 2 only", zh: "仅第二阶段开启" };
  return { en: "OFF (fully manual)", zh: "关闭（全手动）" };
}

function applySwitch(
  config: AutomationConfig,
  action: AutoSwitchAction,
  phase: AutoPhaseArg,
): AutomationConfig {
  const enabled = action === "on";
  return {
    ...config,
    phase1: phase === "1" || phase === "all" ? enabled : config.phase1,
    phase2: phase === "2" || phase === "all" ? enabled : config.phase2,
  };
}

export async function autoSwitch(
  opts: AutoSwitchOptions,
): Promise<CommandResult<AutoStatusPayload>> {
  if (opts.actor !== "user") {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        "`ocn auto` is the human authorization switch — it is human-only and refuses ai_agent callers.",
        "`ocn auto` 是人工授权开关——仅限人类执行，拒绝 ai_agent 调用。",
      ),
      { reason: "automation_switch_human_only" },
    );
  }
  if (opts.action === "on" && opts.phase === undefined) {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        "`ocn auto on` requires an explicit --phase <1|2|all> — no accidental full automation.",
        "`ocn auto on` 必须显式指定 --phase <1|2|all>——避免误开全自动。",
      ),
      { reason: "automation_phase_required" },
    );
  }
  const guard = await requireInitialized(opts.cwd);
  if (guard !== null) return guard;

  const correlationId = newCorrelationId();
  const phase: AutoPhaseArg = opts.phase ?? "all";
  const lockFile = join(Paths.ocodingDir(opts.cwd), ".lock");
  const lockHook = makeLockAuditHook({
    projectRoot: opts.cwd,
    command: `auto ${opts.action}`,
    correlationId,
  });

  let before: AutoStatusPayload;
  let after: AutoStatusPayload;
  try {
    [before, after] = await withLock(
      { lockFile, command: `auto ${opts.action}`, projectRoot: opts.cwd, lifecycle: lockHook },
      async () => {
        const prevConfig = await readAutomationConfig(opts.cwd);
        const prevRuntime = await readAutomationRuntime(opts.cwd);
        const nextConfig =
          opts.action === "resume" ? prevConfig : applySwitch(prevConfig, opts.action, phase);
        // Every switch action clears the circuit breaker: the human just
        // looked at the project — stale failure history must not outlive that.
        const nextRuntime = DEFAULT_AUTOMATION_RUNTIME;
        if (opts.action !== "resume") await writeAutomationConfig(opts.cwd, nextConfig);
        await writeAutomationRuntime(opts.cwd, nextRuntime);
        return [
          { config: prevConfig, runtime: prevRuntime },
          { config: nextConfig, runtime: nextRuntime },
        ];
      },
    );
  } catch (err) {
    if (err instanceof LockTimeoutError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          "Could not acquire OCN lock for `ocn auto`. Another OCN process may be running.",
          "`ocn auto` 期间无法获取 OCN 锁，可能有其他 OCN 进程正在运行。",
        ),
        { reason: "lock_timeout", correlationId },
      );
    }
    throw err;
  }

  const message = switchMessage(opts.action, phase, after.config);
  const event: CreateAuditEventInput = {
    eventType: "auto_mode_changed",
    result: "success",
    actor: "user",
    source: "cli",
    projectRoot: opts.cwd,
    command: `auto ${opts.action}`,
    correlationId,
    message,
    data: {
      action: opts.action,
      phase: opts.action === "resume" ? undefined : phase,
      before: { ...summarize(before.config), suspended: before.runtime.suspended },
      after: { ...summarize(after.config), suspended: after.runtime.suspended },
    },
  };
  await safeAudit(opts.cwd, createAuditEvent(event));
  return ok(message, { ...after, correlationId });
}

function summarize(config: AutomationConfig): { phase1: boolean; phase2: boolean } {
  return { phase1: config.phase1, phase2: config.phase2 };
}

function switchMessage(
  action: AutoSwitchAction,
  phase: AutoPhaseArg,
  after: AutomationConfig,
): { en: string; zh: string } {
  if (action === "resume") {
    return msg(
      "Auto mode resumed — circuit breaker cleared; delegation continues per config.",
      "自动模式已恢复——熔断已清除，按当前配置继续委托。",
    );
  }
  const label = PHASE_LABEL[phase];
  const now = describeEnabled(after);
  if (action === "on") {
    return msg(
      `Auto mode ON for ${label.en}. Gates still run in full; circuit breaker and human-only zones stay active. Now: ${now.en}.`,
      `自动模式已开启：${label.zh}。所有门禁照常运行；熔断器与人工专属禁区仍然生效。当前：${now.zh}。`,
    );
  }
  return msg(
    `Auto mode OFF for ${label.en}. Now: ${now.en}.`,
    `自动模式已关闭：${label.zh}。当前：${now.zh}。`,
  );
}
