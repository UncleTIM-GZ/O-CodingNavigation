# Scope｜范围

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): In Scope, Out of Scope, Technical Constraints,
> Completion Boundary, Exclusions, Assumptions.

## In Scope｜范围内

- Four core commands: `mtt add`, `mtt list`, `mtt done <id>`, `mtt rm <id>`.
- Local JSON storage at `~/.mtt/tasks.json` with atomic writes.
- A single optional `--tag` filter on `list`.
- Plain-text and `--json` output for every command.

## Out of Scope｜范围外

- Sync to cloud, encryption at rest, or multi-device merging.
- Edit / rename of an existing task in v1 (delete + add is the workflow).
- Notifications, reminders, calendar import.

## Technical Constraints｜技术约束

- Node.js >= 20 only; no transpilation target older than ES2022.
- TypeScript with `strict: true`; no `any` in exported API.
- Storage layer must use `tmp + rename` for atomicity.
- No external network calls at runtime.

## Completion Boundary｜完成边界

`mtt` v1 is "done" when:

1. All four commands ship with passing unit and integration tests.
2. `mtt list` round-trips a 500-task fixture in under 50 ms locally.
3. A clean-machine `npm install -g mtt` boots and prints `mtt --version`.

## Exclusions｜排除项

- Windows native (cmd.exe) shell is **excluded** for v1; WSL2 is the
  supported Windows path.
- Non-Linux mobile environments are excluded.
- Multi-user file locking is excluded — single-user single-machine only.

## Assumptions｜假设

- Users have a writable `$HOME` directory.
- Users own a Node.js >= 20 install (or are willing to install one).
- The on-disk file is single-tenant (no concurrent terminal writes are
  expected in the same session).
