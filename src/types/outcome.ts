import { z } from "zod";

// SOP 0.9.0 (AM-016 / DEC-042) — Outcome Backbone｜效果主干.
//
// Type layer (P1) for outcome-type acceptance criteria. An `### AC-*` block may
// carry `kind: build | outcome` (default `build`, so pre-0.9.0 docs are
// byte-identical). An `outcome` spec MUST carry a measurement contract: a
// deterministic probe command (frozen by hash, reusing the task-backbone R4
// verifyHashOf), a single-comparison threshold, and an evidence source. See
// docs/outcome-backbone-proposal.md + docs/plans/2026-07-02-outcome-backbone-0.9.0-upgrade-plan.md §3.

/** Single-comparison operators (裁决 2 — no ranges). */
export const ThresholdOp = z.enum([">=", "<=", ">", "<", "==", "!="]);
export type ThresholdOp = z.infer<typeof ThresholdOp>;

/**
 * A parsed threshold — the raw string (e.g. `">= 1"`) is a boundary artifact and
 * never survives past the parser; every comparison site consumes {op, value}.
 * `value` is `.finite()` so a probe emitting Infinity/NaN can never satisfy a
 * comparison (would otherwise be a false MEASURED_PASS — security review).
 */
export const Threshold = z
  .object({
    op: ThresholdOp,
    value: z.number().finite(),
  })
  .strict();
export type Threshold = z.infer<typeof Threshold>;

/** `build` (constructed artifact) vs `outcome` (measured reality). */
export const AcceptanceKind = z.enum(["build", "outcome"]);
export type AcceptanceKind = z.infer<typeof AcceptanceKind>;

/**
 * Measurement contract carried by an outcome AC. `command` is frozen by hash on
 * a passing acceptance gate (drift → refuse). `due` is the AM-014 dueState (the
 * SOP state from which the outcome gate enforces; default state_ship).
 * `timeoutSeconds` is bounded (≤600) so a frozen runaway can't hang a delegated
 * `ocn outcome check`.
 */
export const MeasureContract = z
  .object({
    command: z.string().min(1),
    threshold: Threshold,
    source: z.string().min(1),
    due: z.string().default("state_ship"),
    timeoutSeconds: z.number().int().positive().max(600).default(60),
  })
  .strict();
export type MeasureContract = z.infer<typeof MeasureContract>;
