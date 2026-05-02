# Implementation Log｜实现日志

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Files Changed, Change Summary, Commands Run,
> Deviations from Plan, Open Issues.
>
> The commands and outputs below are **illustrative example evidence** —
> they describe what an `mtt` author would record after building v1, not
> a real build that this OCN example invokes.

## Files Changed｜已变更文件

Per the build plan, the following files were created or updated during
v1.0.0 development:

- `package.json` — added scripts (`build`, `lint`, `typecheck`, `test`,
  `smoke`).
- `tsconfig.json` — `strict: true`, ES2022 target, ESM.
- `src/cli/index.ts` — commander entry; wires four subcommands.
- `src/cli/commands/{add,list,done,rm}.ts` — one file per command.
- `src/core/store.ts` — atomic read / write of `~/.mtt/tasks.json`.
- `src/core/task.ts` — pure task helpers (createTask, markDone, filterByTag).
- `src/types/task.ts` — Zod schemas + inferred TS types.
- `tests/unit/{store,task}.test.ts` — unit coverage.
- `tests/integration/round-trip.test.ts` — end-to-end CLI round-trip.
- `tests/perf/list-tag.bench.ts` — 500-task perf test.
- `scripts/smoke.sh` — end-to-end shell smoke against built binary.

## Change Summary｜变更摘要

- Implemented all four commands behind a commander entry.
- Atomic writes use `tmp + fs.rename` in the target's parent directory.
- Bilingual error envelope shipped on every error path.
- Performance test passes the 50 ms threshold on the GitHub Actions
  ubuntu-latest runner.
- Coverage hit 96% in `core/`, 84% in `cli/`, 91% project-wide — above
  the thresholds in `docs/08-test-strategy.md`.

## Commands Run｜执行命令

Example local validation sequence (illustrative):

```bash
npm ci
npm run lint            # 0 warnings
npm run typecheck       # tsc --noEmit pass
npm run test            # 47 passed, 0 failed
npm run test:coverage   # core 96%, cli 84%, project 91%
npm run build           # dist/ generated
bash scripts/smoke.sh   # smoke completed
```

## Deviations from Plan｜与计划的偏差

- `--json` flag was added to `add` after all (originally cut in the
  build plan's cutline) — adding it cost only ~10 lines and unblocked
  one downstream tooling case.
- The benchmark threshold ended up being measured at 27 ms on the CI
  runner (well under the 50 ms target); recorded in
  `docs/14-verification-report.md`.

## Open Issues｜遗留问题

- Shell completion script — deferred to v1.1 per the cutline.
- NFS / network-filesystem testing — not exercised in v1; documented as
  an unsupported target and tracked for v1.1.
