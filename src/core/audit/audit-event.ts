import { ulid } from "ulid";
import type { AuditEvent } from "../../types/audit.js";
import type { BilingualMessage } from "../../types/i18n.js";

// Factory for AuditEvent. Deterministic-friendly: accepts injected `now()` and
// `generateId()` for unit tests. Uses ULID by default — already in deps from
// PR #1. ULID gives lexicographic sort matching wall-clock order.

export interface CreateAuditEventInput {
  readonly eventType: AuditEvent["eventType"];
  readonly result: AuditEvent["result"];
  readonly actor: AuditEvent["actor"];
  readonly source: AuditEvent["source"];
  readonly projectRoot: string;
  readonly message: BilingualMessage;
  readonly currentStateId?: string;
  readonly currentStepId?: string;
  readonly relatedArtifactIds?: readonly string[];
  readonly relatedPaths?: readonly string[];
  readonly command?: string;
  readonly correlationId?: string;
  readonly data?: unknown;
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  const now = (input.now ?? (() => new Date()))();
  const id = (input.generateId ?? ulid)();

  // Build the object respecting `exactOptionalPropertyTypes: true` — only set
  // optional fields when the caller actually provided them.
  const event: AuditEvent = {
    eventId: id,
    eventType: input.eventType,
    result: input.result,
    timestamp: now.toISOString(),
    actor: input.actor,
    source: input.source,
    projectRoot: input.projectRoot,
    message: input.message,
  };

  if (input.currentStateId !== undefined) event.currentStateId = input.currentStateId;
  if (input.currentStepId !== undefined) event.currentStepId = input.currentStepId;
  if (input.relatedArtifactIds !== undefined && input.relatedArtifactIds.length > 0) {
    event.relatedArtifactIds = [...input.relatedArtifactIds];
  }
  if (input.relatedPaths !== undefined && input.relatedPaths.length > 0) {
    event.relatedPaths = [...input.relatedPaths];
  }
  if (input.command !== undefined) event.command = input.command;
  if (input.correlationId !== undefined) event.correlationId = input.correlationId;
  if (input.data !== undefined) event.data = input.data;

  return event;
}
