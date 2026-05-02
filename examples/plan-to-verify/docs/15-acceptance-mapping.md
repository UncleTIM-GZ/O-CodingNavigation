# Acceptance Mapping｜验收映射

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Acceptance Criterion, Evidence, Status,
> Notes, Human Review.
>
> Cross-references `docs/03-acceptance-criteria.md` items AC-001..AC-007.
> The reviewer name and date below are **illustrative example evidence**.

## Acceptance Criterion｜验收标准

| Item   | Wording (from docs/03)                                                    |
| ------ | ------------------------------------------------------------------------- |
| AC-001 | `mtt add` creates a persistent task.                                      |
| AC-002 | `mtt list` shows every non-deleted task with id and status.               |
| AC-003 | `mtt done <id>` marks a task as `done` and persists.                      |
| AC-004 | `mtt rm <id>` removes a task and persists.                                |
| AC-005 | `mtt list --tag <tag>` filters by tag and returns within 50 ms on 500.    |
| AC-006 | Atomic write: an interrupted write leaves the previous good file intact.  |
| AC-007 | Every command accepts `--json` and prints a parseable JSON envelope.      |

## Evidence｜证据

| Item   | Evidence                                                                 |
| ------ | ------------------------------------------------------------------------ |
| AC-001 | `tests/integration/round-trip.test.ts: "add persists"` — vitest pass.    |
| AC-002 | `tests/integration/round-trip.test.ts: "list shows all"` — vitest pass.  |
| AC-003 | `tests/integration/round-trip.test.ts: "done persists"` — vitest pass.   |
| AC-004 | `tests/integration/round-trip.test.ts: "rm persists"` — vitest pass.     |
| AC-005 | `tests/perf/list-tag.bench.ts` recorded 27 ms (limit 50 ms).             |
| AC-006 | `tests/unit/store.test.ts: "interrupted write"` — vitest pass.           |
| AC-007 | `tests/integration/round-trip.test.ts: "json envelope"` — vitest pass.   |

## Status｜状态

| Item   | Status |
| ------ | ------ |
| AC-001 | pass   |
| AC-002 | pass   |
| AC-003 | pass   |
| AC-004 | pass   |
| AC-005 | pass   |
| AC-006 | pass   |
| AC-007 | pass   |

## Notes｜说明

- AC-005 was measured on `ubuntu-latest` (Node 20). On a slower runner the
  threshold may need to be revisited — see Remaining Risks in
  `docs/18-final-build-verdict.md`.
- AC-006 uses a process-kill harness inside vitest; the harness is
  documented at the top of `tests/unit/store.test.ts`.

## Human Review｜人工评审

- **Reviewer**: Tim Ou (illustrative).
- **Date**: 2026-05-02.
- AC-005 and AC-006 carry explicit human sign-off per
  `docs/03-acceptance-criteria.md` §Human Review Requirement.
