# Data Model｜数据模型

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Entities, Fields, Relationships,
> Constraints, Indexes or Access Patterns, Migration Notes.

## Entities｜实体

- **TaskStore** — the persisted envelope written to `~/.mtt/tasks.json`.
  Contains the schema version and the ordered list of tasks.
- **Task** — a single tracked work item.

## Fields｜字段

### TaskStore

| Field           | Type     | Required | Default | Description                            |
| --------------- | -------- | -------- | ------- | -------------------------------------- |
| `schemaVersion` | `number` | yes      | `1`     | Forward-migration marker.              |
| `tasks`         | `Task[]` | yes      | `[]`    | Ordered list of tasks (insertion order). |

### Task

| Field       | Type                         | Required | Default | Description                              |
| ----------- | ---------------------------- | -------- | ------- | ---------------------------------------- |
| `id`        | ULID string                  | yes      | —       | Sortable unique id.                      |
| `title`     | non-empty string (<= 200 ch) | yes      | —       | Short human description.                 |
| `status`    | `"todo" \| "done"`           | yes      | `"todo"`| Lifecycle marker.                        |
| `tag`       | string (<= 32 ch)            | no       | —       | Optional label for `list --tag`.         |
| `createdAt` | ISO 8601 UTC string          | yes      | now     | Timestamp ending with `Z`.               |

## Relationships｜关系

- `TaskStore` 1–N `Task`. No inter-task references in v1.
- No foreign keys, no nested objects beyond the envelope.

## Constraints｜约束

- `Task.id` must be unique within `TaskStore.tasks`.
- `Task.status` is restricted by Zod enum.
- `Task.title` must be a non-empty string after trim.
- `Task.createdAt` must end with `Z` (ISO 8601 UTC).

## Indexes or Access Patterns｜索引或访问模式

- The store is small (target <= 1000 tasks). Read = full file load.
- `list --tag` is a linear scan; benchmarked at < 50 ms on 500 tasks.
- No B-tree, no hash index. If the store grows past 10k items in v2+,
  consider chunking by month or moving to SQLite.

## Migration Notes｜迁移说明

- `schemaVersion: 1` is the only shipped version in v1.
- On read, if `schemaVersion` is missing, infer `1` and rewrite on the
  next save.
- Future versions must add fields as optional and bump `schemaVersion`.
- Removing or renaming fields requires a new major version of `mtt`.
