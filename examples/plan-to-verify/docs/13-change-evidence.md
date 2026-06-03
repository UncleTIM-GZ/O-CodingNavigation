# Change Evidence｜变更证据

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Git Diff Summary, Files Added,
> Files Modified, Files Deleted, Migration or Config Impact,
> Evidence Links or Commands.
>
> The diff stats and links below are **illustrative example evidence** —
> shown to demonstrate what change-evidence looks like for an `mtt`-style
> project, not derived from a real commit in this OCN repository.

## Git Diff Summary｜Git 差异摘要

Illustrative `git diff --shortstat` for the v1.0.0 build:

```
 14 files changed, 612 insertions(+), 0 deletions(-)
```

Branch base: `main@a1b2c3d` → head: `feat/mtt-v1@e4f5a6b`.

## Files Added｜新增文件

| Path                                  | Purpose                                  |
| ------------------------------------- | ---------------------------------------- |
| `src/cli/index.ts`                    | commander entry.                         |
| `src/cli/commands/add.ts`             | `mtt add <title> [--tag]`.               |
| `src/cli/commands/list.ts`            | `mtt list [--tag] [--json]`.             |
| `src/cli/commands/done.ts`            | `mtt done <id>`.                         |
| `src/cli/commands/rm.ts`              | `mtt rm <id>`.                           |
| `src/core/store.ts`                   | Atomic JSON read / write.                |
| `src/core/task.ts`                    | Pure task helpers.                       |
| `src/types/task.ts`                   | Zod schemas + TS types.                  |
| `tests/unit/store.test.ts`            | Store unit coverage.                     |
| `tests/unit/task.test.ts`             | Pure helpers unit coverage.              |
| `tests/integration/round-trip.test.ts`| End-to-end CLI round-trip.               |
| `tests/perf/list-tag.bench.ts`        | 500-task `list --tag` perf assertion.    |
| `scripts/smoke.sh`                    | Shell smoke against the built binary.    |

## Files Modified｜修改文件

| Path           | Change                                                     |
| -------------- | ---------------------------------------------------------- |
| `package.json` | Added scripts; added `commander`, `zod`, `ulid` dependencies. |

## Files Deleted｜删除文件

None. v1.0.0 is greenfield.

## Migration or Config Impact｜迁移或配置影响

- New on-disk file at `~/.mtt/tasks.json` (created on first run).
- `schemaVersion: 1` is the only value in v1; future increments require
  a forward migration in `core/store.ts`.
- No environment variables added in v1.

## Evidence Links or Commands｜证据链接或命令

- PR (illustrative): `https://github.com/example/mtt/pull/42`.
- CI run (illustrative): `https://github.com/example/mtt/actions/runs/123456`.
- A reviewer can reproduce by running `npm ci && npm run build &&
  bash scripts/smoke.sh` against the head commit.
