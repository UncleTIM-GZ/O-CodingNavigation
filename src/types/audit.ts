import { z } from "zod";
import { BilingualMessage } from "./i18n.js";

// PR #3 — Audit + Event Foundation. The verbatim event taxonomy from user §V.
// Subset of the wider taxonomy in docs/05-data-model.md §12.15 — future PRs add
// state_transition_*, advance_*, sop_version_*, etc.

export const AuditEventType = z.enum([
  "project_initialized",
  "state_write_started",
  "state_write_succeeded",
  "state_write_failed",
  "lock_acquired",
  "lock_released",
  "lock_timeout",
  "lock_stale_recovered",
  "artifact_created",
  "artifact_gate_run",
  "artifact_gate_blocked",
  "artifact_gate_passed",
]);
export type AuditEventType = z.infer<typeof AuditEventType>;

export const AuditResult = z.enum([
  "success",
  "failed",
  "blocked",
  "pass",
  "warning",
  "detected",
  "executed",
]);
export type AuditResult = z.infer<typeof AuditResult>;

export const AuditActor = z.enum(["user", "system", "ai_agent"]);
export type AuditActor = z.infer<typeof AuditActor>;

export const AuditSource = z.enum(["cli", "core", "test"]);
export type AuditSource = z.infer<typeof AuditSource>;

// ULID format: 26 chars in Crockford Base32 (excludes I, L, O, U).
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export const AuditEvent = z
  .object({
    eventId: z.string().regex(ULID_REGEX, "ULID required (26 chars Crockford Base32)"),
    eventType: AuditEventType,
    result: AuditResult,
    timestamp: z.string().regex(/Z$/, "timestamp must be ISO 8601 UTC ending Z"),
    actor: AuditActor,
    source: AuditSource,
    projectRoot: z.string().min(1),
    currentStateId: z.string().regex(/^state_/).optional(),
    currentStepId: z.string().regex(/^step_/).optional(),
    relatedArtifactIds: z.array(z.string()).optional(),
    relatedPaths: z.array(z.string()).optional(),
    command: z.string().optional(),
    message: BilingualMessage,
    data: z.unknown().optional(),
  })
  .strict();
export type AuditEvent = z.infer<typeof AuditEvent>;
