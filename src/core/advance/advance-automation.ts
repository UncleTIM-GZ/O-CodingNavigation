import type { CommandResult } from "../../types/result.js";
import type { AdvanceResult, StepLocation } from "../../types/state-machine.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { type AutomationSurface, loadAutomation } from "../automation/ai-guard.js";
import { authorizeAiAdvance } from "../automation/authorization.js";
import { writeAutomationRuntime } from "../automation/automation-runtime-store.js";
import { clearFailureCounter, recordAiGateFailure } from "../automation/circuit-breaker.js";
import { msg } from "../i18n.js";
import { blocked } from "../result.js";
import type { SopProfile } from "../../types/sop.js";
import { readTaskLedger } from "../task/task-ledger-store.js";
import type { AdvanceEventBuilder } from "./advance-events.js";

// AM-009 — the auto-mode-specific slices of the advance flow, extracted from
// advance-state.ts so the orchestrator stays a flat sequence of steps (the
// circuit-breaker block was 5 levels deep inline). Runtime projection files
// follow the codebase convention of atomic-write-without-lock (same as
// task-ledger / readiness); under the honest-agent + sequential auto-loop
// model a lost counter increment only delays the breaker by one failure.

export interface AdvanceAutomationContext {
  readonly cwd: string;
  readonly from: StepLocation;
  readonly correlationId: string;
  readonly buildEvent: AdvanceEventBuilder;
  /** A-H1 / C-1 — the PINNED profile, resolved once by the orchestrator so the
   *  auto-mode authorization target and the manual advance compute the same
   *  next step (never the default profile). */
  readonly profile: SopProfile;
}

/** Step 0 — ai_agent callers need the human's grant for the advance TARGET
 *  phase, an un-tripped breaker, and a rationale. Returns the loaded surface
 *  on pass, or a blocked result to surface. */
export async function authorizeAiAdvanceOrBlock(
  ctx: AdvanceAutomationContext,
  rationale: string | undefined,
): Promise<{ surface: AutomationSurface } | { blocked: CommandResult<AdvanceResult> }> {
  const surface = await loadAutomation(ctx.cwd);
  const target = ctx.profile.nextStep(ctx.from.stateId, ctx.from.stepId);
  const refusal = authorizeAiAdvance(
    { ...surface, ...(rationale !== undefined ? { rationale } : {}) },
    target?.stateId ?? null,
  );
  if (refusal === null) return { surface };
  await safeAudit(
    ctx.cwd,
    createAuditEvent(
      ctx.buildEvent("advance_failed", "failed", refusal.message, {
        from: ctx.from,
        reason: refusal.reason,
        rationale: rationale ?? null,
      }),
    ),
  );
  return {
    blocked: blocked("ERR_IO_OR_CONFIG", refusal.message, {
      from: ctx.from,
      reason: refusal.reason,
      correlationId: ctx.correlationId,
    }),
  };
}

export interface BreakerSummary {
  readonly count: number;
  readonly suspended: boolean;
}

/** Failure path — feed the circuit breaker and emit the suspend audit when it
 *  trips. Returns the summary folded into the advance_failed audit + result. */
export async function recordAiGateFailureAndAudit(
  ctx: AdvanceAutomationContext,
  surface: AutomationSurface,
): Promise<BreakerSummary> {
  const outcome = recordAiGateFailure(
    surface.runtime,
    ctx.from.stepId,
    surface.config.circuitBreaker.maxConsecutiveGateFailures,
  );
  await writeAutomationRuntime(ctx.cwd, outcome.runtime);
  const summary: BreakerSummary = {
    count: outcome.runtime.failureCounter?.count ?? 0,
    suspended: outcome.runtime.suspended,
  };
  if (outcome.tripped) {
    await safeAudit(
      ctx.cwd,
      createAuditEvent({
        eventType: "auto_mode_changed",
        result: "success",
        actor: "system",
        source: "cli",
        projectRoot: ctx.cwd,
        currentStateId: ctx.from.stateId,
        currentStepId: ctx.from.stepId,
        command: "advance",
        correlationId: ctx.correlationId,
        message: msg(
          `Circuit breaker tripped: ${summary.count} consecutive gate failures at ${ctx.from.stepId} — auto mode suspended; a human must run \`ocn auto resume\`.`,
          `熔断触发：${ctx.from.stepId} 连续 ${summary.count} 次门禁失败——自动模式已暂停，需人工执行 \`ocn auto resume\` 恢复。`,
        ),
        data: { action: "suspend", stepId: ctx.from.stepId, failureCount: summary.count },
      }),
    );
  }
  return summary;
}

/** Success path — a passing gate clears the consecutive-failure counter and
 *  the success audit carries the decision trace (AI rationale + engine-
 *  assembled machine context, independent of the AI's honesty). */
export async function clearBreakerAndBuildTrace(
  cwd: string,
  surface: AutomationSurface,
  rationale: string | undefined,
): Promise<Record<string, unknown>> {
  const cleared = clearFailureCounter(surface.runtime);
  if (cleared !== surface.runtime) await writeAutomationRuntime(cwd, cleared);
  const ledger = await readTaskLedger(cwd);
  const taskLedger =
    ledger === null
      ? null
      : {
          done: ledger.tasks.filter((t) => t.status === "done").length,
          pending: ledger.tasks.filter((t) => t.status !== "done").length,
        };
  return { rationale, context: { gatePassed: true, taskLedger } };
}
