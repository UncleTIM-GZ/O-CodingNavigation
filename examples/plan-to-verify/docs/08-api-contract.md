# API Contract｜接口契约

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Endpoints, Request Schema, Response Schema,
> Error Shape, Authentication or Authorization, Compatibility Notes.

`mtt` has no HTTP API in v1. The "API" surface is the CLI command
contract; this document captures the `--json` envelope every command
prints so downstream tooling can rely on it.

## Endpoints｜接口

| Command           | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `mtt add <title>` | Append a new task with status `todo`.    |
| `mtt list`        | Print all tasks (optionally tag-filtered). |
| `mtt done <id>`   | Mark the task as `done`.                 |
| `mtt rm <id>`     | Remove the task entirely.                |

## Request Schema｜请求结构

Each command accepts positional and option arguments validated by Zod.

```ts
const AddArgs = z.object({
  title: z.string().min(1).max(200),
  tag: z.string().max(32).optional(),
});

const ListArgs = z.object({
  tag: z.string().max(32).optional(),
  json: z.boolean().default(false),
});

const DoneArgs = z.object({ id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/) });
const RmArgs   = z.object({ id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/) });
```

## Response Schema｜响应结构

`--json` mode prints a single line of JSON to stdout matching:

```ts
type CommandResult<T> = {
  ok: boolean;
  code: "OK" | "ERR_TASK_NOT_FOUND" | "ERR_INVALID_INPUT" | "ERR_IO";
  data: T | null;
  message: { en: string; zh: string };
};
```

Per-command `data` payloads:

| Command | `data` shape                          |
| ------- | ------------------------------------- |
| add     | `{ task: Task }`                      |
| list    | `{ tasks: Task[] }`                   |
| done    | `{ task: Task }`                      |
| rm      | `{ id: string }`                      |

## Error Shape｜错误结构

Errors reuse the same envelope with `ok: false`, a non-`OK` `code`, and
`data: null`. Exit codes:

| Code                  | Exit | When                                           |
| --------------------- | ---- | ---------------------------------------------- |
| `OK`                  | 0    | Success.                                       |
| `ERR_INVALID_INPUT`   | 2    | Zod parse failure for any argument.            |
| `ERR_TASK_NOT_FOUND`  | 3    | `done` / `rm` against an unknown id.           |
| `ERR_IO`              | 4    | Read or atomic-write failure on `tasks.json`.  |

## Authentication or Authorization｜认证或授权

None. Single-user single-machine. The implicit "owner" is the user the
process runs as. No role checks, no token checks.

## Compatibility Notes｜兼容性说明

- The `--json` envelope is **stable** across v1.x. Adding fields is
  allowed; removing or renaming is a major-version-only change.
- Exit codes 0–4 are reserved; future codes will use 5+.
- Bilingual `message.en` / `message.zh` are intentional — downstream
  tooling must read `code`, not the human-readable message.
