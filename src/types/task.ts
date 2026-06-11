import { z } from "zod";

// SOP 0.5.0 (AM-007 / DEC-032) — Task Backbone｜任务主干.
//
// Single source of truth for the task-spec / task-ledger shapes. The build
// plan (docs/11-build-plan.md) carries a machine-parsed `## Task Specs｜任务规格`
// section; on a passing build-plan gate the engine freezes each task's verify
// command (hash) into `.ocoding/task-ledger.json`. Completion is decided ONLY
// by `ocn task check` running the frozen command (exit 0) — no manual-done
// channel. See docs/task-backbone-proposal.md.

// Stable id convention (§4.2): task_ prefix, lowercase snake.
export const TASK_ID_RE = /^task_[a-z0-9_]+$/;

const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export const TaskStatus = z.enum(["pending", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSpec = z
  .object({
    id: z.string().regex(TASK_ID_RE, {
      message: "task id must match ^task_[a-z0-9_]+$",
    }),
    goal: z.string().min(1),
    /** Canonical AC ids (normaliseAcId form, e.g. AC-003 / AC-INIT-001). */
    traces: z.array(z.string()).min(1),
    /** Logic-graph node ids (optional anchoring into the logic backbone). */
    touches: z.array(z.string()).default([]),
    /** The deterministic acceptance command, frozen at gate-pass time. */
    verifyCommand: z.string().min(1),
    /** sha256 hex of the trimmed verify command (R4 freeze). */
    verifyHash: z.string().regex(SHA256_HEX_RE, { message: "verifyHash must be sha256 hex" }),
    /** Definition of done — prose, for humans. */
    dod: z.string().min(1),
    depends: z.array(z.string()).default([]),
    /** Display/grouping label only — never a pointer. */
    phase: z.string().optional(),
    /** Verify-command timeout in seconds (default 120 at execution time). */
    timeoutSeconds: z.number().int().min(1).max(600).optional(),
  })
  .strict();
export type TaskSpec = z.infer<typeof TaskSpec>;

export const TaskEvidence = z
  .object({
    ranAt: z.string().regex(/Z$/, "ranAt must be ISO 8601 UTC ending Z"),
    exitCode: z.number(),
    /** Hash of the command that actually ran — must equal verifyHash. */
    commandHash: z.string(),
  })
  .strict();
export type TaskEvidence = z.infer<typeof TaskEvidence>;

export const LedgerTask = TaskSpec.extend({
  status: TaskStatus,
  evidence: TaskEvidence.nullable(),
}).strict();
export type LedgerTask = z.infer<typeof LedgerTask>;

export const TaskLedger = z
  .object({
    version: z.literal(1),
    generatedAt: z.string().regex(/Z$/, "generatedAt must be ISO 8601 UTC ending Z"),
    /** sha256 hex of the raw `## Task Specs` section text at gate-pass time. */
    buildPlanHash: z.string(),
    tasks: z.array(LedgerTask),
  })
  .strict();
export type TaskLedger = z.infer<typeof TaskLedger>;
