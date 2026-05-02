# Build Plan｜构建计划

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Target Scope, Files Expected to Change,
> Implementation Tasks, Non-goals, Risk Points, Verification Commands.

## Target Scope｜目标范围

This build delivers `mtt` v1.0.0 with all four commands (`add`, `list`,
`done`, `rm`), atomic JSON storage, bilingual error envelope, smoke +
perf tests, and a publishable npm package. Nothing more.

## Files Expected to Change｜预期变更文件

```
package.json
tsconfig.json
src/cli/index.ts
src/cli/commands/add.ts
src/cli/commands/list.ts
src/cli/commands/done.ts
src/cli/commands/rm.ts
src/core/store.ts
src/core/task.ts
src/types/task.ts
tests/unit/store.test.ts
tests/unit/task.test.ts
tests/integration/round-trip.test.ts
tests/perf/list-tag.bench.ts
scripts/smoke.sh
```

## Implementation Tasks｜实施任务

1. Bootstrap project (M1) — package.json, tsconfig, commander entry,
   `mtt --version` test.
2. Define types + Zod schemas (`src/types/task.ts`).
3. Implement `core/store.ts` with `tmp + rename` atomic write.
4. Implement `core/task.ts` pure helpers.
5. Implement `cli/commands/add.ts`.
6. Implement `cli/commands/list.ts` (incl. `--tag` and `--json`).
7. Implement `cli/commands/done.ts`.
8. Implement `cli/commands/rm.ts`.
9. Add bilingual error envelope to every command path.
10. Write `scripts/smoke.sh`.
11. Write `tests/perf/list-tag.bench.ts`; record threshold in
    `docs/14-verification-report.md`.

## Non-goals｜非目标

- Multi-user sync, web GUI, MCP server.
- `mtt edit`, `mtt rename`, recurring tasks.
- Pluggable storage backends (SQLite, Redis, etc).

## Risk Points｜风险点

- The atomic-write protocol must use a temp file in the **same** directory
  as the target — cross-device `rename` fails silently on some platforms.
  Mitigation: explicit unit test pinning the temp dir to the target's
  parent.
- Zod parse errors must include enough context to debug a corrupt file.
  Mitigation: wrap parse failures into `ERR_IO` with a path hint.

## Verification Commands｜验证命令

A reviewer must run:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
bash scripts/smoke.sh
```

All must exit 0. Coverage must hit the thresholds in
`docs/08-test-strategy.md`.
