# Product Requirements Document｜产品需求文档

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Product Form, User Roles, User Flow,
> Core Features, Non-functional Requirements, Acceptance Preconditions,
> Non-goals.

## Product Form｜产品形态

A single npm-distributed CLI binary (`mtt`) that reads and writes a single
JSON file under the user's home directory. No background daemon, no
network surface.

## User Roles｜用户角色

- **Owner**: the human running the CLI. Can perform all four commands.
  This is the only role in v1.

## User Flow｜用户流程

1. Owner runs `mtt add "write release notes"` — task is appended to
   `~/.mtt/tasks.json` with status `todo`.
2. Owner runs `mtt list` — sees all open tasks with id, status, tag.
3. Owner runs `mtt done <id>` — marks task `done`; it stays in the file
   for history.
4. Owner runs `mtt rm <id>` — removes the task entirely.

## Core Features｜核心功能

1. Atomic create / read / update / delete of tasks in a single JSON file.
2. Status transitions: `todo → in_progress → done` (the optional middle
   state is set via `mtt start <id>`, deferred to v1.1; v1 ships only
   `todo` and `done`).
3. Tag filter on `list`: `mtt list --tag work`.
4. JSON output mode (`--json`) suitable for piping into other tools.

## Non-functional Requirements｜非功能性需求

- `mtt list` returns within 50 ms on a 500-task store.
- All writes are atomic; an interrupted write leaves the previous good
  file intact.
- Errors print a one-line bilingual (English + 中文) message and a
  non-zero exit code.

## Acceptance Preconditions｜验收前置条件

- Test environment has Node.js >= 20.
- A writable temp directory exists (used for fixture stores during
  integration tests).
- The `mtt` binary is built (`npm run build`) before integration tests run.

## Non-goals｜非目标

- A web UI, mobile app, or browser extension.
- Multi-user permissions or row-level access.
- Recurring tasks, calendaring, or rich text in task descriptions.
