import type { AuditActor } from "../../types/audit.js";
import type { CommandResult } from "../../types/result.js";
import type { AdvanceResult, GateResult, StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import { newCorrelationId } from "../audit/correlation.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import type { AutomationSurface } from "../automation/ai-guard.js";
import { runGate } from "../gate/gate-runner.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import { outcomeLedgerGuardOrNull } from "./outcome-ledger-guard.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import {
  type AdvanceAutomationContext,
  type BreakerSummary,
  authorizeAiAdvanceOrBlock,
  clearBreakerAndBuildTrace,
  recordAiGateFailureAndAudit,
} from "./advance-automation.js";
import { makeAdvanceEventBuilder } from "./advance-events.js";
import { applyAdvanceTransition, emitTransitionAudits } from "./advance-transition.js";
import { taskLedgerGuardOrNull } from "./task-ledger-guard.js";

// `ocn advance` orchestrator. Lock-protected mutation + audit plumbing live in
// advance-transition.ts / advance-events.ts; the AM-009 auto-mode slices
// (authorization, circuit breaker, decision trace) live in
// advance-automation.ts — this file stays a flat sequence of steps.

export interface AdvanceOptions {
  readonly cwd: string;
  /** AM-009 — caller identity for the audit trail. Defaults to "user". */
  readonly actor?: AuditActor;
  /** AM-009 — mandatory for ai_agent callers: the decision trace
   *  (background / evidence / action) recorded in the audit events. */
  readonly rationale?: string;
}

function notInitialized(err: unknown): CommandResult<AdvanceResult> | null {
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
  return null;
}

export async function advanceState(opts: AdvanceOptions): Promise<CommandResult<AdvanceResult>> {
  const correlationId = newCorrelationId();
  const actor = opts.actor ?? "user";

  let state: ProjectState;
  try {
    state = await readState(opts.cwd);
  } catch (err) {
    const handled = notInitialized(err);
    if (handled !== null) return handled;
    throw err;
  }

  const from: StepLocation = { stateId: state.currentStateId, stepId: state.currentStepId };
  // A-H1 / C-1 — resolve the PINNED profile once and thread it through every
  // nextStep + guard consumer below. A 0.8.0-pinned project must keep its own
  // terminal (step_final_build_verdict) even after the default flips to 0.9.0;
  // resolving here (not `loadSopProfile()`) guarantees the manual and auto-mode
  // paths compute the identical next step — the two call sites cannot diverge.
  const profile = resolveProfileForProject(state.project.sopProfileVersion);
  const buildEvent = makeAdvanceEventBuilder({ cwd: opts.cwd, from, correlationId, actor });
  const autoCtx: AdvanceAutomationContext = {
    cwd: opts.cwd,
    from,
    correlationId,
    buildEvent,
    profile,
  };

  // 0. AM-009 — ai_agent callers need the human's grant + un-tripped breaker.
  let automation: AutomationSurface | null = null;
  if (actor === "ai_agent") {
    const authorized = await authorizeAiAdvanceOrBlock(autoCtx, opts.rationale);
    if ("blocked" in authorized) return authorized.blocked;
    automation = authorized.surface;
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
  // failure also feeds the circuit breaker.
  if (!gate.ok) {
    const gateData = gate.data as GateResult | undefined;
    const reason = gate.code === "ERR_GATE_FAILED" ? "gate_blocked" : gate.code;
    let breaker: BreakerSummary | undefined;
    if (automation !== null) breaker = await recordAiGateFailureAndAudit(autoCtx, automation);
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
    return blocked("ERR_GATE_FAILED", failMessage, {
      from,
      ...(gateData !== undefined ? { gate: gateData } : {}),
      correlationId,
      ...(breaker ? { breaker } : {}),
    });
  }

  // 3b. Gate passed → compute next step from the PINNED profile (A-H1 / C-1).
  const next = profile.nextStep(from.stateId, from.stepId);
  if (next === null) {
    // DEC-033 (ruling ⑨) — no machine judgement at the terminal: point the
    // human at the two legal ways forward.
    const failMessage = msg(
      `No next step after ${from.stateId} / ${from.stepId}; this is the terminal step. Start the next round with \`ocn cycle new --yes\`, or rework this round with \`ocn rewind --to <step> --reason ...\`.`,
      `${from.stateId} / ${from.stepId} 之后没有下一步：已到达终点。可用 \`ocn cycle new --yes\` 收档重开新一轮，或用 \`ocn rewind --to <step> --reason ...\` 轮内返工。`,
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        buildEvent("advance_failed", "failed", failMessage, { from, reason: "no_next_step" }),
      ),
    );
    return blocked("ERR_STATE_MACHINE", failMessage, { from, correlationId });
  }

  // 3c. SOP 0.5.0 (AM-007 / DEC-032), widened by AM-010 / DEC-035 — task-first
  // gate: 任务台账不清，不准在 BUILD 内前进（含 BUILD 内步进）。No ledger → legacy pass-through.
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
    return blocked("ERR_GATE_FAILED", ledgerBlock.message, { from, correlationId });
  }

  // 3d. SOP 0.9.0 (AM-016) P3 §3.3 — outcome guard on the VERIFY→SHIP boundary
  // (dormant <0.9.0: requiresOutcome is false, so byte-identical). Blocks a
  // forward move to a state at/after a due outcome AC's due-state while that AC
  // is unmeasured/no-evidence (unwaived). MEASURED_FAIL never blocks.
  const outcomeBlock = await outcomeLedgerGuardOrNull(opts.cwd, profile, next.stateId);
  if (outcomeBlock !== null) {
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        buildEvent("advance_failed", "failed", outcomeBlock.message, {
          from,
          reason: "outcome_unmeasured",
          outcomeAcIds: outcomeBlock.acIds,
        }),
      ),
    );
    return blocked("ERR_GATE_FAILED", outcomeBlock.message, { from, correlationId });
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
  const trace =
    automation !== null
      ? await clearBreakerAndBuildTrace(opts.cwd, automation, opts.rationale)
      : {};
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
