# MVP Plan｜MVP 计划

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Milestones, Task Breakdown, Build Order,
> Verification Plan, Cutline, Known Risks.

## Milestones｜里程碑

| Milestone | Signal of completion                                       |
| --------- | ---------------------------------------------------------- |
| M1 — Skeleton | `mtt --version` prints; commander wires four no-op commands. |
| M2 — Storage  | `core/store.ts` reads + atomically writes the JSON envelope.  |
| M3 — Commands | All four commands implemented and unit-tested.             |
| M4 — Polish   | Smoke + perf test + bilingual error envelope + README.     |

## Task Breakdown｜任务分解

- M1: bootstrap `package.json`, `tsconfig`, commander skeleton, version flag.
- M2: implement `readStore`, `writeStore` with `tmp + rename`, Zod parse.
- M3: implement `add`, `list`, `done`, `rm`, with bilingual error envelope.
- M4: write `scripts/smoke.sh`; seed 500-task fixture; benchmark `list --tag`.

## Build Order｜构建顺序

1. M1 — runs no-op smoke (`mtt --version` exits 0).
2. M2 — unit tests for the store layer.
3. M3 — one command at a time: `add` → `list` → `done` → `rm`.
4. M4 — smoke + perf, then polish docs.

## Verification Plan｜验证计划

- M1: `mtt --version` returns 0 and prints `1.0.0`.
- M2: vitest unit tests for store (>=95% coverage).
- M3: vitest integration tests for each command end-to-end.
- M4: `bash scripts/smoke.sh` exits 0; perf test passes 50 ms threshold.

## Cutline｜切线

- Must-have: M1 + M2 + M3 (the four commands).
- Should-have: M4 polish.
- Nice-to-have: shell completion script (deferred to v1.1).

If running behind schedule, drop shell completion and `--json` for `add`
(keep it for `list`).

## Known Risks｜已知风险

- Atomic-write strategy may misbehave on some filesystems (e.g. NFS).
  Mitigation: document supported filesystems; future v1.1 may add an
  fsync option.
- Performance threshold (50 ms) is CI-runner-dependent. Mitigation:
  record runner identity in the verification report.
