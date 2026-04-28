# Amendment AM-001 — Audit Storage Path Reconciliation

**Date**: 2026-04-28
**Status**: Active (lands with PR #4)
**Affects**: `docs/05-data-model.md`, `docs/06-api-contract.md`
**Originating PR**: #4 — Full State Machine + Gate + Advance (pre-PR §2.2)

---

## 1. Purpose

This is the first entry in `docs/amendments/`. The convention going forward:

> **Amendments record decisions that supersede the locked design docs (`docs/00-08`) without rewriting them.** Each future PR appends a new amendment file rather than editing locked design docs.

This particular amendment reconciles a discrepancy surfaced during PR #3 (audit subsystem) implementation between the implementation and the original design doc references.

---

## 2. The discrepancy

The original design referenced these audit storage paths:

| Reference | Location |
|---|---|
| `.ocoding/events/audit-events.jsonl` | `docs/05-data-model.md` (multiple sections) + `docs/06-api-contract.md` (multiple sections) |
| `docs/21-audit-trail.md` | `docs/00-project-brief.md` §12 + `docs/05-data-model.md` |

PR #3's user-supplied implementation spec (the body of the LFG prompt) called for these paths:

| Reference | Location |
|---|---|
| `.ocoding/audit/audit-events.jsonl` | user §IV |
| `docs/22-audit-trail.md` | user §IV + §VII |

PR #3 followed the user spec verbatim. The implementation now ships with the second set of paths.

---

## 3. Decision

The **canonical audit storage paths** as of 2026-04-28 are:

```
.ocoding/audit/audit-events.jsonl     ← machine source of truth (JSONL)
docs/22-audit-trail.md                ← human-readable narrative (Markdown)
```

The earlier design references are **superseded** by this amendment. The implementation does NOT change.

### 3.1 Rationale

- `.ocoding/audit/` (vs `.ocoding/events/`) reads naturally — audit IS what we're persisting; "events" was a more generic term that risks expanding scope into non-audit telemetry later.
- `docs/22-audit-trail.md` (vs `docs/21-audit-trail.md`) preserves a clean numbering with a `docs/21-` slot reserved for a future artifact ("observability snapshot" candidate per `docs/00-project-brief.md` §12 mapping).
- The user-supplied PR #3 spec was the most recent definitive specification at implementation time.

### 3.2 Why NOT edit `docs/05-data-model.md` / `docs/06-api-contract.md` directly

CLAUDE.md §10 codifies "do NOT edit `docs/00-08` once they are locked design contracts." Amendments under `docs/amendments/` provide an append-only superseding mechanism so the locked docs remain the historical baseline and amendments trace the divergence.

A future re-baseline PR may consolidate amendments back into `docs/00-08` once Phase 2 stabilizes (post-PR #5 / GA). Until then, `docs/amendments/` is the source of truth for any deviation.

---

## 4. Code locations honoring this amendment

After PR #4 lands:

- `src/core/audit/audit-paths.ts` — `AuditPaths.jsonlFile()` → `.ocoding/audit/audit-events.jsonl`; `AuditPaths.markdownFile()` → `docs/22-audit-trail.md`.
- `src/core/audit/audit-jsonl.ts` — appends to the path returned by `AuditPaths.jsonlFile`.
- `src/core/audit/audit-markdown.ts` — appends to the path returned by `AuditPaths.markdownFile`.
- All tests assume the new paths.

---

## 5. Forward compatibility

If a future amendment reverts to `.ocoding/events/` and `docs/21-audit-trail.md`, that amendment must:

1. Land in `docs/amendments/<date>-audit-storage-path-revert.md`.
2. Update `src/core/audit/audit-paths.ts` and tests.
3. Provide a migration helper (script) for projects with existing `.ocoding/audit/` directories.

No such reversal is currently planned.

---

## 6. References

- `implementation-notes.md` §9.4 — original Amendment Needed flag from PR #3.
- `docs/19-decision-log.md` DEC-001 — Phase 2 entry decision.
- `docs/plans/2026-04-28-feat-ocn-phase2-audit-event-foundation-plan.md` — PR #3 plan.
- `docs/plans/2026-04-28-feat-ocn-phase2-full-state-machine-gate-advance-plan.md` — PR #4 plan (pre-PR §2.2 references this amendment).
