# Acceptance Criteria｜验收标准

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Acceptance Items, Evidence Method,
> Pass Criteria, Failure Criteria, Human Review Requirement.

## Acceptance Items｜验收项

1. **AC-001 — `mtt add` creates a persistent task.**
2. **AC-002 — `mtt list` shows every non-deleted task with id and status.**
3. **AC-003 — `mtt done <id>` marks a task as `done` and persists.**
4. **AC-004 — `mtt rm <id>` removes a task and persists.**
5. **AC-005 — `mtt list --tag <tag>` filters by tag and returns within 50 ms
   on a 500-task fixture.**
6. **AC-006 — Atomic write: an interrupted write leaves the previous good
   file untouched.**
7. **AC-007 — Every command accepts `--json` and prints a parseable JSON
   envelope.**

## Evidence Method｜证据方法

| Item   | Evidence kind                                                         |
| ------ | --------------------------------------------------------------------- |
| AC-001 | Vitest unit + integration: `add → readFile → expect content`.         |
| AC-002 | Integration: seed 3 tasks, run `list`, assert stdout contents.        |
| AC-003 | Integration: add → done → readFile → expect status=done.              |
| AC-004 | Integration: add → rm → readFile → expect missing.                    |
| AC-005 | Performance test: seed 500 tasks → list --tag → assert < 50 ms.       |
| AC-006 | Failure-injection unit test: kill process mid-write → assert old data. |
| AC-007 | CLI test: every command spawned with `--json` → JSON.parse(stdout).   |

## Pass Criteria｜通过标准

- AC-001..004: corresponding test exits 0; assertion messages all match.
- AC-005: measured wall-clock < 50 ms on the CI runner; recorded in
  `docs/14-verification-report.md`.
- AC-006: failure-injection harness reports "previous file intact".
- AC-007: every command's `--json` output `JSON.parse`s without error.

## Failure Criteria｜失败标准

- Any AC test exits non-zero, throws, or times out.
- AC-005: measured time > 75 ms on the same runner.
- AC-006: previous file is corrupt or missing after the failure-injection.
- AC-007: any `--json` output is not valid JSON.

## Human Review Requirement｜人工评审要求

- AC-005 (performance) and AC-006 (atomic-write) require human reviewer
  sign-off in `docs/15-acceptance-mapping.md` because automated thresholds
  alone do not capture intent (e.g. "is 50 ms still fast enough?").
- AC-001..004, AC-007 are fully automatable; human review is "spot-check"
  during PR review.
