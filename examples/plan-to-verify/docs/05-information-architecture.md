# Information Architecture｜信息架构

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Navigation Structure, Page or Module Map,
> Object Hierarchy, User Entry Points, State and Permission Notes.

## Navigation Structure｜导航结构

`mtt` has no GUI navigation. The CLI command surface is the navigation:

```
mtt
├── add <title> [--tag <tag>]
├── list [--tag <tag>] [--json]
├── done <id>
└── rm <id>
```

`mtt --help` and `mtt <command> --help` are first-class — they substitute
for breadcrumbs in a GUI product.

## Page or Module Map｜页面或模块地图

| Module           | Purpose                                            | Source path                |
| ---------------- | -------------------------------------------------- | -------------------------- |
| `cli/index`      | commander entrypoint, dispatches to command files. | `src/cli/index.ts`         |
| `cli/commands/*` | One file per CLI command (add, list, done, rm).    | `src/cli/commands/*.ts`    |
| `core/store`     | Atomic read / write of `tasks.json`.               | `src/core/store.ts`        |
| `core/task`      | Pure task helpers (create, mark-done, filter).     | `src/core/task.ts`         |
| `types`          | Zod schemas + inferred TS types.                   | `src/types/task.ts`        |

## Object Hierarchy｜对象层级

```
TaskStore (envelope)
└── tasks: Task[]
    └── Task
        ├── id: ULID
        ├── title: string
        ├── status: "todo" | "done"
        ├── tag?: string
        └── createdAt: ISO 8601 UTC string
```

Only `TaskStore` is persisted. `Task` is read-modify-write through it.

## User Entry Points｜用户入口

- `mtt --help` (root entry).
- `mtt <command>` (direct command entry).
- Pipe-friendly: `mtt list --json | jq '.data[]'` is a documented entry
  for downstream tooling.

## State and Permission Notes｜状态与权限说明

- Single-user, single-machine. The owner of the home directory is the
  implicit "owner" role; no further permission model.
- Empty-state: a fresh `mtt list` prints `No tasks. Try \`mtt add "..."\`.`
- `done` and `rm` against an unknown id exit non-zero with code
  `ERR_TASK_NOT_FOUND` and a bilingual error message.
