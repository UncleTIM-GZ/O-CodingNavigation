import { z } from "zod";

// SOP 0.4.0 (AM-004 / DEC-028) — readiness rulebook schema. Single source of
// truth for the role-based cross-cutting readiness gate: the bundled YAML in
// the SOP profile is parsed and validated against these schemas, and every
// downstream type is inferred from them.
//
// Design laws encoded here (rulebook header R1–R4):
//   R1 — blocks carry pointers/parameters, never conclusions; predicate
//        values are a closed vocabulary, free-form booleans are rejected
//        except the literal `true` (engine-derived predicates only).
//   R3 — severity is block|warn; un-anchorable declarations ship as warn.

/** Rulebook-side tiers (team-size vocabulary, sourced from oprocess). */
export const ReadinessTier = z.enum(["solo", "team", "platform"]);
export type ReadinessTier = z.infer<typeof ReadinessTier>;

/**
 * Project config `project.tier` (minimal|production|full) → rulebook tier.
 * Locked decision: map in the engine; the existing Tier enum is unchanged.
 */
export const TIER_MAP: Readonly<Record<string, ReadinessTier>> = Object.freeze({
  minimal: "solo",
  production: "team",
  full: "platform",
});

export const ReadinessLayer = z.enum(["strategy", "architecture", "delivery", "operations"]);
export type ReadinessLayer = z.infer<typeof ReadinessLayer>;

export const ReadinessSeverity = z.enum(["block", "warn"]);
export type ReadinessSeverity = z.infer<typeof ReadinessSeverity>;

/** Per-check verdicts. Open world: the default is UNKNOWN, never PASS.
 *  AM-014 — DEFERRED: a block check whose inputs are not yet due in the SOP
 *  order. Non-blocking (≠ FAIL/UNKNOWN); surfaced as forthcoming. */
export const ReadinessVerdict = z.enum(["PASS", "FAIL", "UNKNOWN", "WAIVED", "NA", "DEFERRED"]);
export type ReadinessVerdict = z.infer<typeof ReadinessVerdict>;

/**
 * Closed predicate vocabulary (deterministic, no LLM):
 *   not_empty | exists | within_limit | numeric_with_unit
 *   count_gte:<n> | enum_in:<...> | xref:<artifact.field>
 * plus the YAML boolean literal `true` (engine-derived predicates only).
 */
const PREDICATE_STRING_PATTERN =
  /^(not_empty|exists|within_limit|numeric_with_unit|count_gte:\d+|enum_in:.+|xref:.+)$/;

export const ReadinessPredicate = z.union([
  z.literal(true),
  z.string().regex(PREDICATE_STRING_PATTERN, {
    message: "unknown predicate (closed vocabulary; see rulebook header)",
  }),
]);
export type ReadinessPredicate = z.infer<typeof ReadinessPredicate>;

/**
 * Derived check fields: the engine computes these itself (R2 — if the engine
 * can run it, self-report is void). They are exempt from the lint rule
 * "check field ⊆ requires-declared fields" because their inputs are engine
 * capabilities, not document fields. P0–P2 evaluates them as UNKNOWN
 * (engine capability not yet shipped: AC-trace = P3, metrics = P3+).
 */
export const DERIVED_CHECK_FIELDS: ReadonlySet<string> = new Set([
  "each_acceptance_scenario_has_test_ref",
  "each_scenario_has_impl_or_test_ref",
  "ci_runs_tests",
  "gated_advance",
  "process_events_vs_tier_ceiling",
]);

export const ReadinessFixHint = z.object({ zh: z.string().min(1), en: z.string().min(1) }).strict();
export type ReadinessFixHint = z.infer<typeof ReadinessFixHint>;

export const ReadinessRule = z
  .object({
    id: z.string().regex(/^rdy_[a-z0-9_]+$/),
    /** Exactly one accountable role per check (RACI unique-Accountable). */
    role: z.string().regex(/^[a-z0-9_]+$/),
    layer: ReadinessLayer,
    concern: z.string().min(1),
    tier_required: z.array(ReadinessTier).min(1),
    /** `artifact_<slug>.<field>` or `repo.<fact>` references. */
    requires: z.array(z.string().min(1)),
    severity: ReadinessSeverity,
    scenario: z.string().min(1),
    check: z.record(z.string(), ReadinessPredicate),
    fix_hint: ReadinessFixHint,
    waivable: z.boolean().optional(),
    /** Declared anchor (e.g. verify_xref) — informational until P3+. */
    anchor: z.string().optional(),
    fail_code: z.string().optional(),
    /** AM-014 — explicit per-rule enforcement deadline (a STEP id; overrides
     *  the derived `dueStep`). Only honored when the rulebook sets
     *  `precise_activation`. */
    enforced_from: z
      .string()
      .regex(/^step_[a-z0-9_]+$/)
      .optional(),
  })
  .strict();
export type ReadinessRule = z.infer<typeof ReadinessRule>;

export const PathProbe = z
  .object({ type: z.literal("path"), any: z.array(z.string().min(1)).min(1) })
  .strict();
export const CommandProbe = z
  .object({ type: z.literal("command"), run: z.string().min(1), expect_exit: z.number().int() })
  .strict();
export const RepoProbe = z.discriminatedUnion("type", [PathProbe, CommandProbe]);
export type RepoProbe = z.infer<typeof RepoProbe>;

/**
 * P4 — a conditional waiver (waive-with-probe). Granted human-only via
 * `ocn readiness waive`; the precondition probe (shell command, exit 0 =
 * precondition holds) is re-verified at EVERY gate run, and the waiver
 * expires when the project leaves the state it was granted in.
 */
export const ReadinessWaiver = z
  .object({
    checkId: z.string().regex(/^rdy_[a-z0-9_]+$/),
    reason: z.string().min(1).max(500),
    probe: z.string().min(1).max(500),
    /** State the waiver was granted in; stale outside it (re-affirm). */
    stateId: z.string().regex(/^state_[a-z0-9_]+$/),
    grantedAt: z.string(),
  })
  .strict();
export type ReadinessWaiver = z.infer<typeof ReadinessWaiver>;

export const ReadinessWaiverFile = z.object({ waivers: z.array(ReadinessWaiver) }).strict();
export type ReadinessWaiverFile = z.infer<typeof ReadinessWaiverFile>;

/** Per-check evaluated outcome persisted in the ledger. */
export const ReadinessCheckOutcome = z
  .object({
    id: z.string(),
    role: z.string(),
    layer: ReadinessLayer,
    severity: ReadinessSeverity,
    verdict: ReadinessVerdict,
    /** Field-level notes (which predicate failed / which input is missing). */
    detail: z.string(),
    fixHint: ReadinessFixHint,
    /** P4 — present when this verdict is WAIVED. */
    waived: z.object({ reason: z.string(), grantedAt: z.string() }).strict().optional(),
  })
  .strict();
export type ReadinessCheckOutcome = z.infer<typeof ReadinessCheckOutcome>;

/** `.ocoding/readiness.json` — machine projection of the last evaluation. */
export const ReadinessLedger = z
  .object({
    evaluatedAt: z.string(),
    tier: ReadinessTier,
    rulebookVersion: z.string(),
    checks: z.array(ReadinessCheckOutcome),
  })
  .strict();
export type ReadinessLedger = z.infer<typeof ReadinessLedger>;

export const ReadinessRulebook = z
  .object({
    version: z.string().min(1),
    /** Bundled draft carries a sample tier; the engine reads the project
     *  config tier instead — this field is parsed but ignored. */
    tier: ReadinessTier.optional(),
    source: z.string().optional(),
    fail_code_default: z.string().optional(),
    /** AM-014 — opt into just-in-time activation: a block check is enforced
     *  only from its dependency-derived deadline state onward (DEFERRED before
     *  that). Absent/false → today's always-enforced behavior (0.4.0/0.5.0). */
    precise_activation: z.boolean().optional(),
    artifact_aliases: z.record(z.string().regex(/^artifact_[a-z0-9_]+$/), z.array(z.string())),
    repo_probes: z.record(z.string().regex(/^[a-z0-9_]+$/), RepoProbe),
    checks: z.array(ReadinessRule).min(1),
  })
  .strict();
export type ReadinessRulebook = z.infer<typeof ReadinessRulebook>;
