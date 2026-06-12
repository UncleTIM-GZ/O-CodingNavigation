import type { AutomationRuntime } from "../../types/automation.js";
import { nowIsoUtc } from "../time.js";

// AM-009 / DEC-034 — circuit breaker. N consecutive ai_agent gate failures on
// the SAME step suspend auto mode (token-burn / broken-gate protection).
// Pure transition functions: callers persist the returned runtime and emit
// the `auto_mode_changed` (action=suspend, actor=system) audit event when
// `tripped` is true. Un-suspending is `ocn auto resume` — human-only.

export const CIRCUIT_BREAKER_REASON = "circuit_breaker_tripped";

export interface BreakerOutcome {
  readonly runtime: AutomationRuntime;
  /** True exactly on the failure that crossed the threshold. */
  readonly tripped: boolean;
}

export function recordAiGateFailure(
  runtime: AutomationRuntime,
  stepId: string,
  maxConsecutiveGateFailures: number,
): BreakerOutcome {
  if (runtime.suspended) return { runtime, tripped: false };
  const count = runtime.failureCounter?.stepId === stepId ? runtime.failureCounter.count + 1 : 1;
  if (count >= maxConsecutiveGateFailures) {
    return {
      runtime: {
        ...runtime,
        suspended: true,
        suspendedAt: nowIsoUtc(),
        suspendedReason: CIRCUIT_BREAKER_REASON,
        failureCounter: { stepId, count },
      },
      tripped: true,
    };
  }
  return { runtime: { ...runtime, failureCounter: { stepId, count } }, tripped: false };
}

/** Clear the consecutive-failure counter (gate passed / human intervened).
 *  Deliberately never clears `suspended` — that is `ocn auto resume`'s job. */
export function clearFailureCounter(runtime: AutomationRuntime): AutomationRuntime {
  if (runtime.failureCounter === null) return runtime;
  return { ...runtime, failureCounter: null };
}
