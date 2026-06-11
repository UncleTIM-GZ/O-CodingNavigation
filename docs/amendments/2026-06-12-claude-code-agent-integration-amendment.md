# Amendment AM-006 — Claude Code Agent Integration (`ocn agent setup` + `ocn hook *`)

**Status**: Accepted (implemented)

## Date

2026-06-12

## Supersedes

None (additive CLI surface; no frozen contract is contradicted, but the
surface and IO conventions below are not described by `docs/06-api-contract.md`).

## Applies to

- `docs/06-api-contract.md` — new CLI commands outside the frozen catalog:
  `ocn agent setup [--force] [--json]`, `ocn hook stop`, `ocn hook post-edit`.
- `docs/05-data-model.md` §12.15 — audit taxonomy gains `agent_setup_completed`.
- `.ocoding/config.yaml` `commands:` — two new OPTIONAL keys `lint` and
  `typecheck` (agent-hook fast feedback; **not** readiness probes, **not**
  part of the R4 frozen snapshot, which hashes only tier/build/test/test_list).
- First OCN-written files outside `docs/` + `.ocoding/`:
  `.claude/settings.json` (merge-only), `.claude/ocn.md` (OCN-owned),
  `.claude/commands/ocn-next.md` (OCN-owned), `CLAUDE.md` (append-once import).
- `src/core/agent-hooks/*`, `src/core/agent-setup/*`, `src/cli/commands/{agent,hook}.ts`,
  `src/cli/lib/hook-stdin.ts` (new); `src/core/paths.ts`, `src/types/audit.ts`,
  `src/core/readiness/project-config.ts` (modified).

## Context

DEC-024/DEC-028 made OCN generate agent briefs (`next-prompt`) and enforce
gates (`check`), but wiring them into a real Claude Code session — Stop hook
re-running the gate, PostToolUse lint/typecheck feedback, a session-loaded
governance contract, a per-task slash command — was a hand-maintained runbook.
Hand-wiring drifts and is skipped; discipline OCN cannot mechanically enforce
is discipline that does not exist (the product's core thesis). This amendment
productizes the runbook.

## Divergence

### New machine-facing IO convention (hook handlers)

`ocn hook stop` / `ocn hook post-edit` deliberately **bypass the
CommandResult envelope** (`docs/06` §2.5): they read the Claude Code hook
payload from stdin and emit the raw hook contract —

| Handler | Trigger | Blocking output | Pass output |
|---|---|---|---|
| `hook stop` | Claude ends a turn | stdout `{"decision":"block","reason":<bilingual gate message + fix hints, ≤1500 chars>}` + exit 0 | exit 0, silent |
| `hook post-edit` | after Edit/Write | stderr feedback tail (≤2000 chars) + exit 2 | exit 0, silent |

Policies: `stop_hook_active` honored (loop protection); uninitialized
directories are silent no-ops; engine errors **fail open** with a stderr
warning — a broken hook must never wedge a session; `ocn check` stays the
authoritative verdict. `hook stop` reuses `checkCurrentArtifact`, so its
audit emission is a normal gate run.

### `ocn agent setup` (human-only, never MCP)

Idempotent, merge-not-overwrite generator (details in DEC-031): settings
hooks carry a `command -v ocn` guard because `.claude/settings.json` is a
committed, team-shared file; OCN-owned files (`ocn.md`, `ocn-next.md`) are
regenerated verbatim; `CLAUDE.md` only ever gains one import line; a
malformed settings file aborts before any write (`--force` backs up and
rewrites). Audited as `agent_setup_completed` (push).

## Verification

`tests/unit/agent-hooks-{stop,post-edit}.test.ts`,
`tests/unit/agent-setup{,-settings-merge}.test.ts`,
`tests/cli/{hook,agent-setup}.test.ts` — 27 cases incl. loop protection,
fail-open, extension-gated typecheck, merge/idempotence/malformed-JSON
all-or-nothing, append-once CLAUDE.md.
