# Project Brief｜项目简报

> Example artifact for the **Mini Task Tracker CLI** (`mtt`) walkthrough.
> Required sections (SOP 0.2.0): Problem, Goal, Users, Success Criteria,
> Constraints, Risks, Non-goals.

## Problem｜问题

Solo builders and small teams keep ad-hoc task lists in random text files,
chat threads, and sticky notes. Items get forgotten, duplicated across
surfaces, or lost when a tab is closed. A heavyweight tool (Jira, Linear)
is overkill for the early days; a 1-binary local CLI is right-sized.

中文要点：个人和小团队经常用零散的笔记跟踪任务，容易丢失或重复；又没有
必要上重型工具。一个本地 CLI 工具刚刚好。

## Goal｜目标

Ship a single-binary CLI (`mtt`) that lets a user create, list, complete,
and delete tasks stored in a local JSON file — fast enough to use during a
work session, simple enough to explain in one paragraph.

## Users｜用户

- **Primary**: solo builders running a terminal all day who want a frictionless
  task list adjacent to their code.
- **Secondary**: small (2-3 person) teams sharing a tracked file via git for
  lightweight coordination.

## Success Criteria｜成功标准

- A new user can run `mtt add "task"` within 60 seconds of `npm install`.
- `mtt list` returns within 50 ms on a 500-task store.
- The on-disk JSON file is human-readable and survives a process crash mid-write.
- All four core commands (`add`, `list`, `done`, `rm`) are covered by tests.

## Constraints｜约束

- Node.js >= 20 (matches OCN's own runtime constraint).
- Single binary distributed via npm; no daemon, no cloud.
- Storage is a single JSON file under `~/.mtt/tasks.json`.
- No GUI, no web surface, no MCP server in v1.

## Risks｜风险

- Concurrent writes from two terminals could corrupt the file. Mitigation:
  use `tmp file + rename` write strategy similar to OCN's state store.
- Schema drift if we ever add fields. Mitigation: version field on the
  envelope plus a one-time forward migration on read.

## Non-goals｜非目标

- Multi-user sync, OAuth, or any network surface.
- Recurring tasks, calendars, or notifications.
- A TUI or web GUI.
- Project / label hierarchies beyond a single `tag` string per task.
