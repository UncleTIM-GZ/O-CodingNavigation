# Technical Architecture｜技术架构

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Product Form, Runtime, Language, Frameworks,
> Storage, Integration, Deployment Form, Non-goals, Decision Matrix,
> Constraints, Risks, Final Decision.

## Product Form｜产品形态

A standalone npm CLI binary. No daemon, no embedded server, no MCP surface
in v1.

## Runtime｜运行时

Node.js >= 20. ESM only. Linux, macOS, and Windows-via-WSL2 are tier-1
targets. Native Windows cmd.exe is excluded (see Scope §Exclusions).

## Language｜开发语言

TypeScript with `strict: true`. No raw `any` in any exported function
signature; all I/O boundaries validated with Zod.

## Frameworks｜框架

- **commander** — argument parsing (matches OCN's own choice).
- **zod** — runtime schema validation for tasks loaded from disk.
- **vitest** — unit + integration tests.

No web framework, no ORM, no DI container.

## Storage｜存储方案

Single JSON file at `~/.mtt/tasks.json`. Envelope:

```jsonc
{
  "schemaVersion": 1,
  "tasks": [
    { "id": "01HF...", "title": "...", "status": "todo", "tag": "work", "createdAt": "2026-05-02T...Z" }
  ]
}
```

IDs are ULIDs (sortable, prefix-free).

## Integration｜集成

- Filesystem only. No outbound HTTP, no auth provider, no observability
  backend.
- Optional shell completion script ships in v1.1 (out of scope for v1).

## Deployment Form｜部署形态

`npm install -g mtt` installs the binary. CI publishes pre-built `dist/`
to npm; consumers do not transpile at install time.

## Non-goals｜非目标

- A persistent background process, file-watcher, or daemon mode.
- A pluggable storage backend (SQLite, etc) — single JSON file only.
- Cross-machine sync of any kind.

## Decision Matrix｜决策矩阵

| Option       | Speed | Simplicity | Crash-safe | Verdict        |
| ------------ | ----- | ---------- | ---------- | -------------- |
| Single JSON  | High  | High       | With write strategy | **Chosen** |
| SQLite       | Med   | Low        | High       | Overkill v1    |
| Append log   | High  | Med        | High       | Hard to query  |

## Constraints｜约束

- No native modules — pure JavaScript only so the install never compiles.
- No telemetry, no opt-out network calls.
- Minimal direct dependencies (commander, zod, ulid).

## Risks｜风险

- **Concurrent writers** could race the JSON file. Mitigation: in v1,
  document "single shell at a time"; v1.1 may add a `.lock` file like OCN.
- **Schema migration** could surprise users. Mitigation: `schemaVersion`
  on the envelope plus a single forward-migration on read.

## Final Decision｜最终决策

Ship `mtt` as a Node 20+ TypeScript CLI built on commander + zod, storing
tasks in a single human-readable JSON file written atomically via
`tmp + rename`. Nothing more in v1.
