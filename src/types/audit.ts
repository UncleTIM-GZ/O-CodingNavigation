import { z } from "zod";
import { BilingualMessage } from "./i18n.js";

// PR #3 — Audit + Event Foundation. The verbatim event taxonomy from user §V.
// PR #4 — extended with advance-flow events + optional correlationId.
// Subset of the wider taxonomy in docs/05-data-model.md §12.15 — future PRs add
// sop_version_*, doctor_*, reset_*, etc.

export const AuditEventType = z.enum([
  // PR #3 base taxonomy
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
  // PR #4 advance flow
  "advance_started",
  "advance_succeeded",
  "advance_failed",
  "state_transitioned",
  // SOP 0.4.0 (AM-004) readiness P4/P5
  "readiness_waived",
  "readiness_config_changed",
  // DEC-029 / AM-005 — `ocn sop upgrade` (plan + apply)
  "sop_version_diff_detected",
  "sop_upgraded",
  // AM-006 / DEC-031 — Claude Code agent integration
  "agent_setup_completed",
  // AM-007 / DEC-032 — task backbone: a task's frozen verify command exited 0
  // and the ledger entry flipped to done (push event, `ocn task check`).
  "task_completed",
  // DEC-033 — controlled cursor rewind (`ocn rewind`, push event). Distinct
  // from the contract-§25 `reset_executed` (file-deletion reset) by ruling:
  // rewind moves the cursor backwards, it never deletes files. Deliberately a
  // SINGLE event type for success and failure (result: success|failed +
  // data.failureReason), per proposal §3.3 — rewind is one atomic decision,
  // not a multi-phase flow like advance_started/.../advance_succeeded.
  "cursor_rewind",
  // DEC-033 — `ocn cycle new` (push event): the round was archived and a new
  // round opened. Same single-type design as cursor_rewind (result:
  // success|failed + data.failureReason). The audit JSONL itself is never
  // archived (ruling ③ — one continuous log spans all cycles), so this event
  // is the stitch between rounds.
  "cycle_started",
  // AM-009 / DEC-034 — auto-mode switch lifecycle (`ocn auto on/off/resume`
  // plus the engine-initiated circuit-breaker suspend). Same single-type
  // design as cursor_rewind: result success|failed, data.action
  // ("on"|"off"|"resume"|"suspend") + before/after phases. The on/off/resume
  // events are human-only by construction (the switch refuses ai_agent), so
  // this slice of the audit log stays trustworthy even though actor labels
  // are a governance signature rather than a security boundary.
  "auto_mode_changed",
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
    currentStateId: z
      .string()
      .regex(/^state_/)
      .optional(),
    currentStepId: z
      .string()
      .regex(/^step_/)
      .optional(),
    relatedArtifactIds: z.array(z.string()).optional(),
    relatedPaths: z.array(z.string()).optional(),
    command: z.string().optional(),
    // PR #4 — correlationId ties together every audit event emitted by a
    // single `ocn advance` invocation (advance_started, gate_*,
    // state_transitioned, state_write_succeeded, advance_succeeded|failed).
    // ULID format same as eventId for downstream tooling consistency.
    correlationId: z.string().regex(ULID_REGEX, "correlationId must be ULID").optional(),
    message: BilingualMessage,
    data: z.unknown().optional(),
  })
  .strict();
export type AuditEvent = z.infer<typeof AuditEvent>;
