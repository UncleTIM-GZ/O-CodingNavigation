# AM-002: Decision Log Canonical Path Move

## Status
Accepted

## Date
2026-04-28

## Supersedes
`docs/19-decision-log.md` (canonical decision-log path under OCN's original layout)

## Applies to

This amendment governs every reference to the OCN decision log file across the repository. The references that pre-date this amendment include — non-exhaustively:

- Frozen design docs: `docs/00-project-brief.md`, `docs/01-scope.md`, `docs/02-prd.md`, `docs/03-acceptance-criteria.md`, `docs/04-information-architecture.md`, `docs/05-data-model.md`, `docs/06-api-contract.md`, `docs/07-test-strategy.md`, `docs/08-mvp-plan.md`.
- Plan files under `docs/plans/` (Phase-2 plans for state safety, audit, full FSM, MCP).
- `docs/amendments/2026-04-28-audit-storage-path-amendment.md` (AM-001 references DEC-001's old path).
- `CLAUDE.md`, `.claude/rules.md`, `.claude/anti-patterns.md`.
- `implementation-notes.md`.
- Any historical PR description, commit message, or issue body that links the decision log by path.

These references continue to read `docs/19-decision-log.md`. They are historical and must be interpreted through this amendment.

## Context

During Phase 2 closure (PR #7 — Phase 2 completion report and DEC-002), the decision log file was moved from `docs/19-decision-log.md` to `docs/20-decision-log.md` so it aligns with the canonical documentation map adopted in Phase 2.

The rename happened via `git mv` so the file's content history (DEC-001, DEC-002) is preserved at the new path. PR #7 merged the rename and the GA Prep Gap Review plan (PR #8) carried the new path forward in §3.6. PR A — this amendment — formalises the move under the [DEC-004 Frozen Design Docs Amendment Policy](../20-decision-log.md#dec-004frozen-design-docs-amendment-policy).

## Decision

The canonical decision-log path is now:

```
docs/20-decision-log.md
```

DEC-001 through the present-day DEC entries all live in this single append-only file. The path `docs/19-decision-log.md` no longer exists on `main`.

## Impact

- **New documentation must reference** `docs/20-decision-log.md`. This includes all GA Prep PRs (B, C, D, E, F) and all subsequent plans, amendments, reports, and READMEs.
- **Historical documentation is not modified** for this path move (per DEC-004). The references listed under *Applies to* remain as they were when those documents were written, and a reader who follows them is expected to consult this amendment.
- **Tooling and code** are unaffected. No source code references the decision-log path; the file is human-narrative only.
- **External readers** consulting the OCN repository today will see two phenomena:
  1. `docs/00-08` and historical plans speak of `docs/19-decision-log.md`.
  2. The actual file is at `docs/20-decision-log.md`.
  This amendment, indexed in [`docs/amendments/README.md`](./README.md), is the bridge that explains the divergence.

## Migration note

- **Do NOT bulk rewrite frozen `docs/00-08` solely for this path move.** Per DEC-004, structural path moves are recorded as amendments rather than as inline edits to frozen docs.
- **Do NOT rewrite historical plans or amendment files** for this path move. They are historical artifacts of when they were written.
- **DO update** `docs/amendments/README.md`'s "Current amendments" index when adding new amendments (this amendment is already indexed there).
- **DO write new docs** with the canonical path `docs/20-decision-log.md` from the start.
- **DO link to this amendment** if a new doc must explain why the historical references differ.

A future re-baseline PR (deliberately deferred — see [`docs/amendments/README.md`](./README.md) §8) may consolidate amendments back into a new edition of the frozen design docs. Until that happens, this amendment is the canonical statement.

## References

- **Originating PR**: PR #7 — `docs: record Phase 2 completion and decision log canonical path` (merged `2b632e5` at `2026-04-28T23:42:24Z`). The commit `aa63568` performs the `git mv`.
- **Policy basis**: [DEC-004 — Frozen Design Docs Amendment Policy](../20-decision-log.md#dec-004frozen-design-docs-amendment-policy).
- **Numbering policy companion**: [DEC-003 — Documentation Numbering Policy after SOP v1.1](../20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion).
- **Phase 2 Completion Report** §8 row 6 (`docs/amendments/` consolidation gap that triggered this amendment): [`docs/reports/2026-04-28-phase2-completion-report.md`](../reports/2026-04-28-phase2-completion-report.md).
- **GA Prep Gap Review Plan** §3.6 (amendments consolidation gap): [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](../plans/2026-04-28-ga-prep-gap-review-plan.md).
