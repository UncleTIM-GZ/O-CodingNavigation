import { z } from "zod";

// SOP 0.8.0 (AM-015 / DEC-041) — Acceptance Backbone｜验收主干.
//
// Single source of truth for the acceptance-spec / projection shapes. The
// acceptance-criteria artifact (docs/03) carries a machine-parsed
// `## Acceptance Specs｜验收规格` section; on a passing acceptance gate the
// engine freezes the validated specs into `.ocoding/acceptance-specs.json`,
// which becomes the canonical machine source for build-plan `traces` binding
// and evidence-map input. See docs/acceptance-backbone-proposal.md.

// Full-match form of AC_ID_RE (acceptance-parser-helpers.ts): AC-<DOMAIN?>-<n>.
// Accepts AC-001 / AC1 / AC-INIT-001 / AC.001 (normalised to AC-…-NNN downstream).
export const ACCEPTANCE_ID_RE = /^AC[-.]?(?:[A-Z][A-Z0-9]*[-.]?)*\d+$/;

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

export const AcceptanceProjection = z
  .object({
    version: z.literal(1),
    generatedAt: z.string().regex(/Z$/, "generatedAt must be ISO 8601 UTC ending Z"),
    /** sha256 hex of the raw `## Acceptance Specs` section text at gate-pass time. */
    specsHash: z.string(),
    items: z.array(AcceptanceSpec),
  })
  .strict();
export type AcceptanceProjection = z.infer<typeof AcceptanceProjection>;
