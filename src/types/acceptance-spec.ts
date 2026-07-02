import { z } from "zod";
import { MeasureContract } from "./outcome.js";

// SOP 0.8.0 (AM-015 / DEC-041) — Acceptance Backbone｜验收主干.
//
// Single source of truth for the acceptance-spec / projection shapes. The
// acceptance-criteria artifact (docs/03) carries a machine-parsed
// `## Acceptance Specs｜验收规格` section; on a passing acceptance gate the
// engine freezes the validated specs into `.ocoding/acceptance-specs.json`,
// which becomes the canonical machine source for build-plan `traces` binding
// and evidence-map input. See docs/acceptance-backbone-proposal.md.

// Full-match id check: starts "AC", then any run of [A-Z0-9.-], ending in a
// digit. Accepts AC-001 / AC1 / AC-INIT-001 / AC.001 (normalised downstream).
// Deliberately a SINGLE-STAR char class (no nested quantifier) so it is linear:
// this regex runs via `.test()` on every `### ` heading id in docs/03, and the
// earlier structured form `AC[-.]?(?:[A-Z][A-Z0-9]*[-.]?)*\d+$` backtracked
// catastrophically on a long uppercase heading with no trailing digit (ReDoS).
export const ACCEPTANCE_ID_RE = /^AC[A-Z0-9.-]*[0-9]$/;

export const AcceptanceSpec = z
  .object({
    /** Canonical AC id (normaliseAcId form, e.g. AC-001 / AC-INIT-001). */
    id: z.string().regex(ACCEPTANCE_ID_RE, {
      message: "acceptance id must match AC-<DOMAIN>-<n>",
    }),
    /** Human-readable criterion text — the free-text signal evidence-map runs on. */
    desc: z.string().min(1),
    /** Optional Given/When/Then structure — folded into criterion text downstream. */
    given: z.string().optional(),
    when: z.string().optional(),
    then: z.string().optional(),
    /** Display/grouping label only — never a pointer. */
    priority: z.string().optional(),
    /** Optional pointers to requirement ids (FR-…/NFR-…); informational. */
    trace: z.array(z.string()).default([]),
  })
  .strict();
export type AcceptanceSpec = z.infer<typeof AcceptanceSpec>;

// SOP 0.9.0 (AM-016) — Outcome Backbone: the v2 spec carries `kind` and, for
// outcome ACs, a measurement contract. Discriminated on `kind` so `measure` is
// required-iff-outcome and unrepresentable on a build spec (illegal states can't
// be constructed). The v1 `AcceptanceSpec` above stays frozen for read-compat.
export const BuildAcceptanceSpec = AcceptanceSpec.extend({ kind: z.literal("build") }).strict();
export const OutcomeAcceptanceSpec = AcceptanceSpec.extend({
  kind: z.literal("outcome"),
  measure: MeasureContract,
}).strict();
export const AcceptanceSpecV2 = z.discriminatedUnion("kind", [
  BuildAcceptanceSpec,
  OutcomeAcceptanceSpec,
]);
export type AcceptanceSpecV2 = z.infer<typeof AcceptanceSpecV2>;

const ISO_UTC = z.string().regex(/Z$/, "generatedAt must be ISO 8601 UTC ending Z");

// The frozen projection is versioned and read as a discriminated union. v1 (the
// pre-0.9.0 shape) is emitted whenever every spec is build, so build-only docs
// stay byte-identical; v2 (carrying kind/measure) is emitted only once an
// outcome spec is present, so P2 (`ocn outcome check`) can read the contract.
export const AcceptanceProjectionV1 = z
  .object({
    version: z.literal(1),
    generatedAt: ISO_UTC,
    /** sha256 hex of the raw `## Acceptance Specs` section text at gate-pass time. */
    specsHash: z.string(),
    items: z.array(AcceptanceSpec),
  })
  .strict();
export const AcceptanceProjectionV2 = z
  .object({
    version: z.literal(2),
    generatedAt: ISO_UTC,
    specsHash: z.string(),
    items: z.array(AcceptanceSpecV2),
  })
  .strict();
export const AcceptanceProjection = z.discriminatedUnion("version", [
  AcceptanceProjectionV1,
  AcceptanceProjectionV2,
]);
export type AcceptanceProjection = z.infer<typeof AcceptanceProjection>;
