import { z } from "zod";

// AM-009 / DEC-034 — optional Auto Mode. `AutomationConfig` lives in the
// user-owned .ocoding/config.yaml (`automation:` block) and expresses HUMAN
// INTENT: which phases the operator has delegated to the AI agent.
// `AutomationRuntime` lives in .ocoding/automation-runtime.json and holds
// MACHINE state (circuit breaker). The split matters: a circuit-breaker trip
// suspends automation without revoking the human's grant — `ocn auto resume`
// clears the runtime, the config stays as the human wrote it.

export const AutomationCircuitBreaker = z
  .object({
    /** Consecutive gate failures on the SAME step before auto mode suspends. */
    maxConsecutiveGateFailures: z.number().int().min(1).max(20).default(5),
  })
  .strict();
export type AutomationCircuitBreaker = z.infer<typeof AutomationCircuitBreaker>;

export const AutomationConfig = z
  .object({
    /** phase1 — in-phase advances across DISCOVERY → SPEC → DESIGN → PLAN. */
    phase1: z.boolean().default(false),
    /** phase2 — advances into/within BUILD → VERIFY, plus `ocn task check`. */
    phase2: z.boolean().default(false),
    circuitBreaker: AutomationCircuitBreaker.default({ maxConsecutiveGateFailures: 5 }),
  })
  .strict();
export type AutomationConfig = z.infer<typeof AutomationConfig>;

export const AutomationFailureCounter = z
  .object({
    stepId: z.string().regex(/^step_/),
    count: z.number().int().min(0),
  })
  .strict();
export type AutomationFailureCounter = z.infer<typeof AutomationFailureCounter>;

export const AutomationRuntime = z
  .object({
    schemaVersion: z.literal("1.0"),
    suspended: z.boolean(),
    suspendedAt: z.string().regex(/Z$/, "must be ISO 8601 UTC ending Z").nullable(),
    suspendedReason: z.string().nullable(),
    failureCounter: AutomationFailureCounter.nullable(),
  })
  .strict();
export type AutomationRuntime = z.infer<typeof AutomationRuntime>;
