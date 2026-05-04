// PR-B / M5 — risk-flag lookup table extracted from verdict-draft-assembly.
//
// Lookup table covering every VerdictDraftRiskFlag member. Declaring the
// constant with type `Record<VerdictDraftRiskFlag, true>` forces TypeScript
// to flag any future addition to the union that isn't represented here
// (drift detection: a new union member would produce TS2741 here).

import type { VerdictDraftRiskFlag } from "./types.js";

export const VERDICT_DRAFT_RISK_FLAG_LOOKUP: Readonly<
  Record<VerdictDraftRiskFlag, true>
> = Object.freeze({
  "working-tree-dirty": true,
  "not-a-git-repository": true,
  "no-commits": true,
  "detached-head": true,
  "git-not-found": true,
  "ocn-state-unreadable": true,
  "acceptance-file-missing": true,
  "no-acceptance-criteria": true,
  "coverage-partial": true,
  "coverage-missing": true,
  "human-review-required": true,
  "github-evidence-unavailable": true,
  "draft-pr": true,
  "closed-pr": true,
  "merge-conflict-or-unclean": true,
  "ci-failing": true,
  "ci-pending": true,
  "no-checks-found": true,
  "changes-requested": true,
  "no-review-yet": true,
  "large-diff": true,
  "many-files-changed": true,
  "source-change-without-test-change": true,
  "test-change-without-source-change": true,
  "docs-only-change": true,
  "workflow-changed": true,
  "package-metadata-changed": true,
  "verification-blocked": true,
  "verification-partial": true,
});

// Narrow an arbitrary string into the VerdictDraftRiskFlag union, dropping
// the value (returning false) if it isn't a member. Drift in the union is
// caught at compile time by the lookup table above.
export function isVerdictDraftRiskFlag(s: string): s is VerdictDraftRiskFlag {
  return Object.prototype.hasOwnProperty.call(VERDICT_DRAFT_RISK_FLAG_LOOKUP, s);
}
