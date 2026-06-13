import type { AuditActor } from "../../types/audit.js";
import type { StepLocation } from "../../types/state-machine.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";

// Advance-flow audit event plumbing, extracted from advance-state.ts (AM-009
// made the orchestrator grow past the 300-line limit). Behavior-preserving:
// same event taxonomy, same correlation threading; `actor` became a parameter
// so auto-mode advances are attributable to ai_agent.

export type AdvanceEventType =
  | "advance_started"
  | "advance_succeeded"
  | "advance_failed"
  | "state_transitioned"
  | "state_write_succeeded";

export interface AdvanceEventContext {
  readonly cwd: string;
  readonly from: StepLocation;
  readonly correlationId: string;
  readonly actor: AuditActor;
}

export type AdvanceEventBuilder = (
  eventType: AdvanceEventType,
  result: "executed" | "success" | "failed",
  message: { en: string; zh: string },
  data?: unknown,
  nextLocation?: StepLocation,
) => CreateAuditEventInput;

export function makeAdvanceEventBuilder(ctx: AdvanceEventContext): AdvanceEventBuilder {
  return (eventType, result, message, data, nextLocation) => ({
    eventType,
    result,
    actor: ctx.actor,
    source: "cli",
    projectRoot: ctx.cwd,
    currentStateId: nextLocation?.stateId ?? ctx.from.stateId,
    currentStepId: nextLocation?.stepId ?? ctx.from.stepId,
    command: "advance",
    correlationId: ctx.correlationId,
    message,
    ...(data !== undefined ? { data } : {}),
  });
}
