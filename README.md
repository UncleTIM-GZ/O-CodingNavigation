# O'CodingNavigator (OCN)

> Local-first, MCP-first, state-machine-driven **AI coding workflow operating system**.
> CLI: `ocn` · MCP: `ocn-mcp` · License: Apache-2.0
> **Phase**: Phase 2 Complete · **Status**: internal alpha · **Public**: not yet on npm

OCN turns AI coding from continuous-chat improvisation into a navigable, gated, auditable, reviewable systems-engineering process. It is a *navigator*, not an IDE, not a SaaS, not a project-management board.

---

## 1. What OCN is

OCN is the local discipline layer for AI coding. It runs on your machine, persists everything to plain files (Markdown + JSON + JSONL + YAML), exposes a small CLI for humans, and a small MCP server for agents. There is no cloud component.

OCN sells **discipline** — productized as:

- a **state machine** (DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT) with forward-only transitions,
- a **Step Artifact Gate** that blocks advancement when the current step's required sections are missing,
- a **dual-track audit trail** (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`),
- a **safe MCP surface** that lets agents read, prepare, and create artifacts but never advance state, capture decisions, reset the project, or force-release the lock.

OCN is **not** a code generator, an IDE, a SaaS, a project-management tool, a notes app, or a scaffold-only doc factory.

---

## 2. Why OCN exists

Working with an AI coding agent for any non-trivial task tends to fail in four ways:

| Failure | Symptom |
|---|---|
| **迷路 (lost)** | Nobody — human or AI — knows which step the project is on. |
| **失控 (drift)** | The agent keeps generating, but each new chunk is further from the original requirement. |
| **失忆 (amnesia)** | A new chat starts and the agent re-derives what the previous chat already decided. |
| **假完成 (false-completion)** | A document exists on disk, but it's missing a required section. The agent declares "done" anyway. |

OCN treats these as the same problem: *the AI coding loop has no rigorous notion of "where we are" and "what counts as done"*. OCN supplies both as code, not as exhortation.

---

## 3. Current status (Phase 2 Complete)

| | |
|---|---|
| Phase | **Phase 2 Complete** ([DEC-002](./docs/20-decision-log.md#dec-002phase-2-complete-after-mcp-safe-tools)) |
| Tests | 312 passed across 61 files |
| Coverage | 83.88% lines / 84.61% branches / 90.40% functions |
| Public release | Not on npm yet — install via `git clone` (§4) |
| MCP transport | stdio only (HTTP/SSE not started) |

### ✅ Implemented

- **CLI**: `init`, `status`, `brief`, `doc create`, `check`, `gate`, `advance` (full list in §6).
- **State machine**: 8 states, forward-only transitions; DISCOVERY → PLAN have stable-ID steps wired (BUILD / VERIFY / SHIP / REFLECT have state IDs only — steps deferred).
- **Step Artifact Gate**: required-section detection with NFKC-normalised heading match for bilingual `Title｜标题` headings.
- **State safety**: `.ocoding/.lock` (5s timeout + stale recovery), `state.json.bak` rolling backup, atomic temp-rename writes.
- **Audit**: dual-track persistence, 16 event types, `correlationId` threading across the entire `ocn advance` event chain.
- **MCP safe tools**: 7 read/prepare/create/log tools over stdio; 4 forbidden tools never registered (full list in §7).

### ❌ Not implemented (deliberately deferred — see §10)

`ocn doctor`, `ocn reset`, `ocn baseline`, SOP versioning / upgrade, `production` / `full` tiers, mini-CRM dogfood, npm publish, remote MCP transport, MCP auth, examples directory, threat-model document.

---

## 4. Install / local setup

OCN is **not on npm yet**. Install from source:

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link
```

This puts both `ocn` (the CLI) and `ocn-mcp` (the MCP stdio server) on your PATH.

**Prerequisites**: Node.js ≥ 20 (see `engines` in `package.json`).

To uninstall the global links: `cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`.

If you prefer not to `npm link`, run the CLI in-place via `node /path/to/O-CodingNavigation/dist/cli/index.js …`.

---

## 5. First 5 minutes

```bash
mkdir ocn-demo && cd ocn-demo

ocn init                        # creates .ocoding/ and docs/
ocn status                      # state_discovery / step_project_brief

ocn doc create project-brief    # creates docs/00-project-brief.md (template)
# Now edit docs/00-project-brief.md and fill in the 4 required sections:
#   Problem · Goal · Users · Success Criteria

ocn gate                        # read-only — confirms the gate now passes
ocn advance                     # gate + state mutation + audit trail
ocn status                      # state_discovery / step_scope (advanced)

ocn brief                       # session brief for an AI coding agent
```

Expected outputs:
- `init` writes `.ocoding/state.json`, `.ocoding/sop.yaml`, the dual-track audit files, and a `docs/` skeleton.
- `status` reports `currentStateId: state_discovery` / `currentStepId: step_project_brief`.
- `doc create` writes `docs/00-project-brief.md` with bilingual section headings already in place.
- `gate` returns `OK` (exit 0) once the 4 required sections are filled in, or `ERR_GATE_FAILED` (exit 1) with a bilingual list of missing sections.
- `advance` writes a `correlationId`-tagged chain of audit events: `advance_started → artifact_gate_run → artifact_gate_passed → state_transitioned → state_write_succeeded → advance_succeeded`.
- `brief` prints the current-step required sections + AI governance reminders so a coding agent can resume without re-reading docs.

A more detailed walkthrough lives in [`docs/quickstart.md`](./docs/quickstart.md), including the expected file tree and common errors.

---

## 6. Core CLI commands

All commands accept `--json` to emit a machine-readable `CommandResult` envelope. Exit codes are stable: `0` OK, `1` gate failed, `2` artifact missing or invalid, `3` state machine error, `4` config / lock / IO error, `5` SOP version incompatibility.

| Command | Purpose | Reads / writes | Audit emission |
|---|---|---|---|
| `ocn init [--tier minimal] [--json]` | Initialise an OCN project in the current directory. | Writes `.ocoding/`, `docs/`, the dual-track audit files. | `project_initialized` + state-write events |
| `ocn status [--json]` | Show current state, step, last gate result. | Read-only. | None (avoids log spam — pull-mode) |
| `ocn brief [--json]` | Print the current-step brief for an AI coding session: required sections, governance reminders, uncertainty policy. | Read-only. | None (pull-mode) |
| `ocn doc create <type> [--overwrite] [--json]` | Create one of the 5 supported artifacts from its bundled template. | Writes the artifact under `docs/`. | `artifact_created` |
| `ocn check [--json]` | Check the current step's artifact against its required sections. | Read-only. | `artifact_gate_run` + `artifact_gate_passed` / `artifact_gate_blocked` |
| `ocn gate [--json]` | Read-only artifact gate aggregation for the current step. Same emission as `check`; never mutates state. | Read-only. | `artifact_gate_*` (no `correlationId`) |
| `ocn advance [--json]` | Run gate, then advance to the next step on pass. Lock-protected; never partial. | Writes `state.json` (atomic). | Full advance chain with shared `correlationId` |

`<type>` for `doc create`: `project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`.

`--tier` for `init` accepts `minimal`, `production`, `full` — only `minimal` is enforced today (production / full are accepted but their artifact sets are not yet differentiated).

---

## 7. MCP tools

OCN's MCP server (`ocn-mcp`) exposes 7 tools over stdio transport. Wire it into any MCP-aware host (e.g. Claude Desktop, Cursor, Cline).

### Allowed (7)

| Tool | Purpose | Mutates? |
|---|---|---|
| `navigator.where_am_i` | State snapshot. | No |
| `navigator.brief` | Current-step brief. | No |
| `navigator.run_gate` | Read-only gate aggregation. | No |
| `navigator.create_artifact` | Create from the 5-type template registry. | Filesystem only |
| `navigator.capture_log` | Append to `docs/19-dev-log.md` (`type=dev`) or `docs/18-research-log.md` (`type=research`). **`type=decision` is hard-rejected.** | Filesystem only |
| `navigator.detect_sop_version` | Drift between locked profile and bundled OCN SOP. | No |
| `navigator.generate_next_prompt` | Required sections + governance reminder + uncertainty policy + self-check rule. | No |

### Forbidden (4) — NEVER exposed

| Tool | Why kept off MCP |
|---|---|
| `navigator.advance_phase` | State advancement is human-only via the CLI. |
| `navigator.capture_decision` | Decisions reflect human intent. The exposed `capture_log` rejects `type=decision`. |
| `navigator.reset_project` | Destructive; twice-confirm flow is human-only. |
| `navigator.force_release_lock` | Bypasses state-safety invariants; operator-only. |

Enforced by `tests/unit/mcp-tool-registry.test.ts` (`ALLOWED ∩ FORBIDDEN = ∅`).

> An MCP agent connected to OCN can read project state, render the next-step brief, prepare artifacts, run the read-only gate, create from the template registry, and capture `dev` / `research` logs. It **cannot** advance state, capture decisions, reset the project, or force-release the lock.

Full surface + wiring instructions: [`docs/mcp-usage.md`](./docs/mcp-usage.md).

---

## 8. Documentation map

OCN ships its own design baseline under `docs/`. Two governance points worth knowing before reading:

- **Canonical decision log**: [`docs/20-decision-log.md`](./docs/20-decision-log.md). Some historical references say `docs/19-decision-log.md` — those refer to the same file before the path move recorded in [AM-002](./docs/amendments/2026-04-28-decision-log-path-amendment.md).
- **Amendment index**: [`docs/amendments/README.md`](./docs/amendments/README.md). Active divergences from the frozen `docs/00-08` design baseline are recorded as amendments rather than inline edits ([DEC-004](./docs/20-decision-log.md#dec-004frozen-design-docs-amendment-policy)).
- **Frozen design baseline**: `docs/00-project-brief.md` through `docs/08-mvp-plan.md` are Phase-2 design contracts, treated as historical artifacts. New projects initialised via `ocn init` get the SOP v1.1 step layout from the bundled default profile; the OCN repository itself runs against a project-level override per [DEC-003](./docs/20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion).
- **Reports**: [`docs/reports/2026-04-28-phase2-completion-report.md`](./docs/reports/2026-04-28-phase2-completion-report.md) records Phase 2 closure, the per-PR timeline, and the GA Prep gap matrix.
- **Plans**: [`docs/plans/`](./docs/plans/) holds the planning artifacts for each PR. The active GA Prep plan is [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md).
- **MCP usage**: [`docs/mcp-usage.md`](./docs/mcp-usage.md).

---

## 9. Development

```bash
npm install
npm run lint           # ESLint (TypeScript-eslint)
npm run typecheck      # tsc --noEmit
npm run test           # vitest run — 312 tests, ~3s
npm run test:coverage  # adds coverage report
npm run build          # tsc + chmod +x on bin entries
```

The pre-commit hook (Husky 9) runs `lint + typecheck + test` on every commit. CI runs the same checks plus `build` and reports coverage. Hard limits per `CLAUDE.md`: file ≤ 300 lines, function ≤ 50 lines, params ≤ 4, nesting ≤ 3, no raw `any` in exported APIs.

---

## 10. Roadmap (GA Prep — not yet implemented)

The GA Prep phase is a documentation, packaging, and operational-readiness audit. **No GA Prep work changes runtime behaviour today.** Tracked in [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md):

- ✅ **PR A** — Docs numbering reconciliation + amendments index (merged).
- 🟡 **PR B** — README first-5-minutes + CLI help copy audit (this PR).
- ⬜ **PR C** — MCP `projectRoot` path-traversal audit + threat-model doc.
- ⬜ **PR D** — External MCP host validation (Claude Desktop / Cursor / Cline smoke tests).
- ⬜ **PR E** — npm publish gating plan + CI stability audit.
- ⬜ **PR F** — `examples/` directory plan.

Beyond GA Prep, the following are **deliberately not part of any current plan** and require their own DEC entry before implementation begins:

- `ocn doctor`, `ocn reset`, `ocn baseline`
- SOP versioning / upgrade tooling
- Production / full tier artifact-set enforcement
- Mini-CRM dogfood (Tier 2 GA success criterion)
- HTTP / SSE MCP transport, MCP auth, MCP session management
- Public npm publish

---

## 11. License

[Apache-2.0](./LICENSE)
