# O'CodingNavigator (OCN)

> Open-source, local-first, MCP-first, state-machine driven **AI Coding workflow operating system**.
> CLI: `ocn` · License: Apache-2.0 · Status: pre-alpha (Skeleton Spike)

OCN turns AI Coding from continuous-chat improvisation into a navigable, verifiable, rollback-safe, auditable, reviewable systems-engineering process. Read the design contracts in [`docs/`](./docs).

## Quick start (Skeleton Spike)

```bash
# install
npm install
npm run build
npm link              # exposes `ocn` on PATH

# in any empty project directory
ocn init --tier minimal
ocn status
ocn brief
ocn doc create prd
# edit docs/02-prd.md
ocn check             # ⇒ blocked / pass with bilingual message
```

Skeleton Spike validates the core thesis: **OCN detects artifact false-completion** (e.g. PRD missing `Scenarios｜使用场景`) and refuses to advance.

## Skeleton Spike scope

Implemented:
- `ocn init`, `ocn status`, `ocn brief`, `ocn doc create prd`, `ocn check`
- `CommandResult` envelope + `--json` flag
- Bilingual error messages (`zh` + `en`)
- Stable string IDs (`state_*`, `step_*`, `section_*`)
- Required-section detection with full-width pipe `｜` normalization (NFKC)

Deferred to Phase 2 (NOT implemented in spike):
- `ocn advance`, `ocn baseline`, `ocn doctor`, `ocn reset`, `ocn sop`, `ocn log`
- Full state-machine progression
- Lock + backup + atomic state writes
- Audit event subsystem
- Minimal MCP server
- Tier `production` / `full`

See [`docs/08-mvp-plan.md`](./docs/08-mvp-plan.md) and the latest plan in `docs/plans/` for details.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run test:coverage
```

Pre-commit hook runs lint + typecheck + test (Husky 9). CI runs the same plus build + coverage upload.

## Project rules

See [`CLAUDE.md`](./CLAUDE.md) and [`.claude/`](./.claude). Highlights:
- **Stable string IDs only** — no numeric step pointers, ever.
- **ISO 8601 UTC** times ending `Z`.
- **BilingualMessage** `{ en, zh }` for all user-facing output.
- **Pure core, effectful edges** — `src/core/` is presentation-free.

## License

[Apache-2.0](./LICENSE)
