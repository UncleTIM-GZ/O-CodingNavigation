# Integration Notes｜集成说明

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Integration Points, Data Flow Impact,
> API Impact, UI Impact, Environment Impact, Rollback Notes.

## Integration Points｜集成点

- **Local filesystem** — single integration point. The store reads and
  writes `~/.mtt/tasks.json` and a sibling temp file during atomic writes.
- **Shell** — invoked through `bash`, `zsh`, or PowerShell-via-WSL2.
  No shell-specific syntax in scripts; all shebangs are `#!/usr/bin/env bash`.
- **npm registry** — install / update path. No outbound calls at runtime.

## Data Flow Impact｜数据流影响

```
user shell ──► commander entry ──► command file ──► core/store ──► tasks.json
                                                          ▲
                                                          │
                                                  atomic temp ─► rename
```

No queues, no jobs, no streaming. All flows are synchronous.

## API Impact｜API 影响

- New CLI surface (4 commands) per `docs/08-api-contract.md`.
- New stable `--json` envelope. Adding fields is allowed; removing or
  renaming requires a `mtt` major-version bump.

## UI Impact｜UI 影响

No graphical UI. The text output style is documented per command:

- `mtt list` default mode prints `id  status  tag  title` columns.
- `mtt list --json` prints a single-line envelope (one per process run).
- Accessibility: text-only, no color requirements; works under `TERM=dumb`.

## Environment Impact｜环境影响

- Node.js >= 20 required (matches OCN's own constraint).
- New file at `~/.mtt/tasks.json` (created lazily).
- No new environment variables in v1.
- No new ports, no new daemons, no new system services.

## Rollback Notes｜回滚说明

- Uninstall: `npm uninstall -g mtt` removes the binary.
- The store file at `~/.mtt/tasks.json` is **not** removed by uninstall
  (intentional — protects user data). To roll back fully, delete the
  file manually.
- Downgrading from v1.x to a future v0.x is not supported and is not a
  documented path; v1 is the starting point.
