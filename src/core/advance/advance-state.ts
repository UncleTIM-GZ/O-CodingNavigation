import type { AuditActor } from "../../types/audit.js";
import type { CommandResult } from "../../types/result.js";
import type { AdvanceResult, GateResult, StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import { newCorrelationId } from "../audit/correlation.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { type AutomationSurface, loadAutomation } from "../automation/ai-guard.js";
import { authorizeAiAdvance } from "../automation/authorization.js";
import { recordAiGateFailure, clearFailureCounter } from "../automation/circuit-breaker.js";
import { writeAutomationRuntime } from "../automation/automation-runtime-store.js";
import { runGate } from "../gate/gate-runner.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { loadSopProfile } from "../sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { readTaskLedger } from "../task/task-ledger-store.js";
import { makeAdvanceEventBuilder } from "./advance-events.js";
import { applyAdvanceTransition, emitTransitionAudits } from "./advance-transition.js";
import { taskLedgerGuardOrNull } from "./task-ledger-guard.js";

// `ocn advance` orchestrator. The lock-protected mutation and audit plumbing
// live in advance-transition.ts / advance-events.ts (AM-009 size split).

export interface AdvanceOptions {
  readonly cwd: string;
  /** AM-009 — caller identity for the audit trail. Defaults to "user". */
  readonly actor?: AuditActor;
  /** AM-009 — mandatory for ai_agent callers: the decision trace
   *  (background / evidence / action) recorded in the audit events. */
  readonly rationale?: string;
}

/** Compact machine context appended to ai_agent advance audits — independent
 *  of the AI's self-reported rationale (decision-trace layer 2). */
async function ledgerSummary(cwd: string): Promise<{ done: number; pending: number } | null> {
  const ledger = await readTaskLedger(cwd);
  if (ledger === null) return null;
  const done = ledger.tasks.filter((t) => t.status === "done").length;
  return { done, pending: ledger.tasks.length - done };
}

export async function advanceState(opts: AdvanceOptions): Promise<CommandResult<AdvanceResult>> {
  const correlationId = newCorrelationId();
  const actor = opts.actor ?? "user";

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
  const buildEvent = makeAdvanceEventBuilder({ cwd: opts.cwd, from, correlationId, actor });

  // 0. AM-009 — ai_agent callers need the human's automation grant for the
  // advance TARGET phase, an un-tripped circuit breaker, and a rationale.
  let automation: AutomationSurface | null = null;
  if (actor === "ai_agent") {
    automation = await loadAutomation(opts.cwd);
    const target = loadSopProfile().nextStep(from.stateId, from.stepId);
    const refusal = authorizeAiAdvance(
      { ...automation, ...(opts.rationale !== undefined ? { rationale: opts.rationale } : {}) },
      target?.stateId ?? null,
    );
    if (refusal !== null) {
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          buildEvent("advance_failed", "failed", refusal.message, {
            from,
            reason: refusal.reason,
            rationale: opts.rationale ?? null,
          }),
        ),
      );
      return blocked("ERR_IO_OR_CONFIG", refusal.message, {
        from,
        reason: refusal.reason,
        correlationId,
      });
    }
  }

  // 1. advance_started
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildEvent(
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
    actor,
    source: "cli",
    command: "advance",
  });

  // 3a. Gate blocked → emit advance_failed; no state mutation. An ai_agent
  // failure also feeds the circuit breaker (consecutive failures on the same
  // step suspend auto mode — AM-009).
  if (!gate.ok) {
    const gateData = gate.data as GateResult | undefined;
    const reason = gate.code === "ERR_GATE_FAILED" ? "gate_blocked" : gate.code;
    let breaker: { count: number; suspended: boolean } | undefined;
    if (automation !== null) {
      const outcome = recordAiGateFailure(
        automation.runtime,
        from.stepId,
        automation.config.circuitBreaker.maxConsecutiveGateFailures,
      );
      await writeAutomationRuntime(opts.cwd, outcome.runtime);
      breaker = {
        count: outcome.runtime.failureCounter?.count ?? 0,
        suspended: outcome.runtime.suspended,
      };
      if (outcome.tripped) {
        await safeAudit(
          opts.cwd,
          createAuditEvent({
            eventType: "auto_mode_changed",
            result: "success",
            actor: "system",
            source: "cli",
            projectRoot: opts.cwd,
            currentStateId: from.stateId,
            currentStepId: from.stepId,
            command: "advance",
            correlationId,
            message: msg(
              `Circuit breaker tripped: ${breaker.count} consecutive gate failures at ${from.stepId} — auto mode suspended; a human must run \`ocn auto resume\`.`,
              `熔断触发：${from.stepId} 连续 ${breaker.count} 次门禁失败——自动模式已暂停，需人工执行 \`ocn auto resume\` 恢复。`,
            ),
            data: { action: "suspend", stepId: from.stepId, failureCount: breaker.count },
          }),
        );
      }
    }
    const failMessage = msg(
      `Advance blocked: gate failed at ${from.stateId} / ${from.stepId}.`,
      `推进被阻：在 ${from.stateId} / ${from.stepId} 处门禁未通过。`,
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        buildEvent("advance_failed", "failed", failMessage, {
          from,
          reason,
          gate: gateData,
          ...(automation !== null ? { rationale: opts.rationale, breaker } : {}),
        }),
      ),
    );
    const advanceData: AdvanceResult = {
      from,
      ...(gateData !== undefined ? { gate: gateData } : {}),
      correlationId,
    };
    return blocked("ERR_GATE_FAILED", failMessage, {
      ...advanceData,
      ...(breaker ? { breaker } : {}),
    });
  }

  // 3b. Gate passed → compute next step.
  const profile = loadSopProfile();
  const next = profile.nextStep(from.stateId, from.stepId);

  if (next === null) {
    // DEC-033 (ruling ⑨) — no machine judgement at the terminal: just point
    // the human at the two legal ways forward.
    const failMessage = msg(
      `No next step after ${from.stateId} / ${from.stepId}; this is the terminal step. Start the next round with \`ocn cycle new --yes\`, or rework this round with \`ocn rewind --to <step> --reason ...\`.`,
      `${from.stateId} / ${from.stepId} 之后没有下一步：已到达终点。可用 \`ocn cycle new --yes\` 收档重开新一轮，或用 \`ocn rewind --to <step> --reason ...\` 轮内返工。`,
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        buildEvent("advance_failed", "failed", failMessage, {
          from,
          reason: "no_next_step",
        }),
      ),
    );
    const advanceData: AdvanceResult = { from, correlationId };
    return blocked("ERR_STATE_MACHINE", failMessage, advanceData);
  }

  // 3c. SOP 0.5.0 (AM-007 / DEC-032) — task backbone transition gate:
  // 任务台账不清，不准进 VERIFY。No ledger → legacy pass-through.
  const ledgerBlock = await taskLedgerGuardOrNull(opts.cwd, from, next);
  if (ledgerBlock !== null) {
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        buildEvent("advance_failed", "failed", ledgerBlock.message, {
          from,
          reason: "task_ledger_pending",
          pendingTaskIds: ledgerBlock.pendingTaskIds,
        }),
      ),
    );
    const advanceData: AdvanceResult = { from, correlationId };
    return blocked("ERR_GATE_FAILED", ledgerBlock.message, advanceData);
  }

  // 4. Lock-protected state mutation (stale-check inside).
  const transitionFailure = await applyAdvanceTransition({
    cwd: opts.cwd,
    from,
    next,
    correlationId,
    buildEvent,
  });
  if (transitionFailure !== null) return transitionFailure;

  // 5. Emit state_transitioned + state_write_succeeded + advance_succeeded.
  await emitTransitionAudits(opts.cwd, from, next, buildEvent);

  // AM-009 — a passing gate resets the consecutive-failure counter, and the
  // ai_agent success audit carries the decision trace: the AI's rationale
  // plus engine-assembled machine context (independent of the AI's honesty).
  let trace: Record<string, unknown> = {};
  if (automation !== null) {
    const cleared = clearFailureCounter(automation.runtime);
    if (cleared !== automation.runtime) await writeAutomationRuntime(opts.cwd, cleared);
    trace = {
      rationale: opts.rationale,
      context: { gatePassed: true, taskLedger: await ledgerSummary(opts.cwd) },
    };
  }

  const successMessage = msg(
    `Advance succeeded: ${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}.`,
    `推进成功：${from.stateId} / ${from.stepId} → ${next.stateId} / ${next.stepId}。`,
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      buildEvent(
        "advance_succeeded",
        "success",
        successMessage,
        { from, to: next, ...trace },
        next,
      ),
    ),
  );

  return ok(successMessage, { from, to: next, correlationId });
}
