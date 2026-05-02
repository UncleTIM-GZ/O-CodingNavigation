# O'CodingNavigator (OCN)

> Local-first, MCP-first, state-machine-driven **AI coding workflow operating system**.
> CLI: `ocn` · MCP: `ocn-mcp` · License: Apache-2.0
> **Phase**: Phase 2 Complete + beta candidate prep complete · **Status**: pre-GA beta · **Public**: on npm as `@beta` → [`0.1.0-beta.0`](https://www.npmjs.com/package/o-coding-navigation) · GitHub pre-release: [`v0.1.0-beta.0`](https://github.com/UncleTIM-GZ/O-CodingNavigation/releases/tag/v0.1.0-beta.0)

> 📑 This README has two parts:
> **Part 1 — English** (sections 1 – 11) · **Part 2 — 中文版** (§§ A – K)
> 本 README 分两部分阅读：先看英文（§§ 1–11），中文从下方 §A 开始。

---

# Part 1 · English

OCN turns AI coding from continuous-chat improvisation into a navigable, gated, auditable, reviewable systems-engineering process. It is a *navigator*, not an IDE, not a SaaS, not a project-management board.

### Table of contents (English)

**Understand OCN**
1. [What OCN is](#1-what-ocn-is)
2. [Why OCN exists](#2-why-ocn-exists)
3. [Current status](#3-current-status-phase-2-complete--beta-published)

**Use OCN**
4. [Install](#4-install)
5. [First 5 minutes](#5-first-5-minutes)
6. [Core CLI commands](#6-core-cli-commands)
7. [MCP tools](#7-mcp-tools)

**Reference**
8. [Documentation map](#8-documentation-map)
9. [Development](#9-development)
10. [Roadmap](#10-roadmap)
11. [License](#11-license)

---

## Understand OCN

### 1. What OCN is

OCN is the local discipline layer for AI coding. It runs on your machine, persists everything to plain files (Markdown + JSON + JSONL + YAML), exposes a small CLI for humans, and a small MCP server for agents. There is no cloud component.

OCN sells **discipline** — productized as:

- a **state machine** (DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT) with forward-only transitions,
- a **Step Artifact Gate** that blocks advancement when the current step's required sections are missing,
- a **dual-track audit trail** (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`),
- a **safe MCP surface** that lets agents read, prepare, and create artifacts but never advance state, capture decisions, reset the project, or force-release the lock.

OCN is **not** a code generator, an IDE, a SaaS, a project-management tool, a notes app, or a scaffold-only doc factory.

### 2. Why OCN exists

Working with an AI coding agent for any non-trivial task tends to fail in four ways:

| Failure | Symptom |
|---|---|
| **lost** | Nobody — human or AI — knows which step the project is on. |
| **drift** | The agent keeps generating, but each new chunk is further from the original requirement. |
| **amnesia** | A new chat starts and the agent re-derives what the previous chat already decided. |
| **false-completion** | A document exists on disk, but it's missing a required section. The agent declares "done" anyway. |

OCN treats these as the same problem: *the AI coding loop has no rigorous notion of "where we are" and "what counts as done"*. OCN supplies both as code, not as exhortation.

### 3. Current status (Phase 2 Complete + beta published)

| | |
|---|---|
| Phase | **Phase 2 Complete** ([DEC-002](./docs/20-decision-log.md#dec-002phase-2-complete-after-mcp-safe-tools)) + **beta candidate prep complete** ([DEC-018](./docs/20-decision-log.md), [DEC-021](./docs/20-decision-log.md)) |
| Tests | 393 → **459** passed across 71 files (default suite, post-Codex P1/P2 fix train) |
| Coverage | **~83.5%** lines (matches the publish-time gate) |
| npm | currently published — `@beta` → `0.1.0-beta.0` ([report](./docs/reports/2026-05-01-npm-beta-0-publish-report.md)); `@alpha` → `0.1.0-alpha.2` (post-P1-fix-train); `latest` deliberately unchanged at `0.1.0-alpha.0` per [DEC-020](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md) |
| Maturity | **pre-GA beta** — not stable, not GA, not production-ready |
| External host validation | **completed for Claude Desktop on Windows with WSL2** ([DEC-017](./docs/20-decision-log.md), [report](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline remain unverified ([DEC-019](./docs/20-decision-log.md)) |
| MCP transport | stdio only (HTTP/SSE not started) |

**Implemented**

- **CLI**: `init`, `status`, `brief`, `doc create`, `check`, `gate`, `advance` (full list in §6).
- **State machine**: 8 states, forward-only transitions; DISCOVERY → PLAN have stable-ID steps wired (BUILD / VERIFY / SHIP / REFLECT have state IDs only — steps deferred).
- **Step Artifact Gate**: required-section detection with NFKC-normalised heading match for bilingual `Title｜标题` headings.
- **State safety**: `.ocoding/.lock` (5 s timeout + stale recovery), `state.json.bak` rolling backup, atomic temp-rename writes; concurrent-advance race fixed (post-Codex P1).
- **Audit**: dual-track persistence, 16 event types, `correlationId` threading across the entire `ocn advance` event chain.
- **MCP safe tools**: 7 read/prepare/create/log tools over stdio; 4 forbidden tools never registered (full list in §7); `projectRoot` validator + threat model ([`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md)).
- **Real MCP Host validation**: Claude Desktop on Windows with WSL2 validated end-to-end ([DEC-017](./docs/20-decision-log.md), [report](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline remain unverified.
- **Executable example**: [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) walks all 10 v1.0 SOP steps end-to-end via `scripts/smoke.sh`. Bundled fixtures derived verbatim from `src/core/templates/*.ts` so they cannot drift.
- **npm publish discipline**: alpha (`@alpha` → `0.1.0-alpha.2`) and beta (`@beta` → `0.1.0-beta.0`) both publicly published on the npm registry under strict pre-publish checklists, `prepublishOnly` gate, and `files` allowlist. `latest` deliberately unchanged at `0.1.0-alpha.0` per [DEC-020](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md). Annotated git tag `v0.1.0-beta.0` and matching GitHub pre-release published per [DEC-022](./docs/20-decision-log.md).

**Not implemented (deliberately deferred — see §10)**

`ocn doctor`, `ocn reset`, `ocn baseline`, SOP versioning / upgrade, `production` / `full` tiers, mini-CRM dogfood, real-Host validation for Cursor / Cline ([DEC-019](./docs/20-decision-log.md)), remote MCP transport, MCP auth.

---

## Use OCN

### 4. Install

#### 4.1 Recommended: install the beta from npm

```bash
npm install -g o-coding-navigation@beta
```

Verify:

```bash
ocn --version       # 0.1.0-beta.0
ocn --help
ocn-mcp             # starts the MCP stdio server; press Ctrl+C to exit
```

To uninstall: `npm uninstall -g o-coding-navigation`.

#### 4.2 Currently published channels

| Channel | Version | npm tag | Notes |
|---|---|---|---|
| Beta (recommended pre-GA) | `0.1.0-beta.0` | `beta` | Authorised by [DEC-021](./docs/20-decision-log.md); evidence in [`docs/reports/2026-05-01-npm-beta-0-publish-report.md`](./docs/reports/2026-05-01-npm-beta-0-publish-report.md). |
| Alpha (still available) | `0.1.0-alpha.2` | `alpha` | Prior pre-GA channel; ships the same post-P1-fix-train bits. Use only if you need the alpha-line specifically. |
| `latest` (do **not** rely on this for OCN) | `0.1.0-alpha.0` | `latest` | Deliberately unchanged from the historical first publish per [DEC-020](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md). Will only move when a future GA-or-later DEC authorises it. |

Package home: https://www.npmjs.com/package/o-coding-navigation

**Prerequisites**: Node.js ≥ 20 (see `engines` in `package.json`).

> **Note on dist-tags**: per [DEC-020](./docs/20-decision-log.md) and [DEC-021](./docs/20-decision-log.md), `latest` remains intentionally unchanged at `0.1.0-alpha.0` while `beta` (recommended) resolves to `0.1.0-beta.0` and `alpha` (prior pre-GA channel) resolves to `0.1.0-alpha.2`. **Do NOT use untagged `npm install -g o-coding-navigation`** — `latest` is intentionally stale and will only move when a future DEC authorises it. Always install with an explicit selector (`@beta` for the recommended channel, `@alpha` if you need the alpha line specifically). Smoke evidence: [`docs/reports/2026-05-01-npm-global-install-smoke.md`](./docs/reports/2026-05-01-npm-global-install-smoke.md).

> **Pre-GA caveat**: this is a **pre-GA beta** release. The package is not stable, not GA, and not production-ready. **MCP Host validation completed for Claude Desktop on Windows with WSL2** (per [DEC-017](./docs/20-decision-log.md) and [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)); **Cursor and Cline remain unverified** in this release. See [DEC-005](./docs/20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) for the historical caveat.

#### 4.3 Alternative: local development from source

For contributing or local development:

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link              # exposes `ocn` and `ocn-mcp` on PATH
```

To uninstall the global links: `cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`.

If you prefer not to `npm link`, run the CLI in-place via `node /path/to/O-CodingNavigation/dist/cli/index.js …`.

### 5. First 5 minutes

#### 5.1 The minimal happy path

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

#### 5.2 What each command produces

- `init` writes `.ocoding/state.json`, `.ocoding/sop.yaml`, the dual-track audit files, and a `docs/` skeleton.
- `status` reports `currentStateId: state_discovery` / `currentStepId: step_project_brief`.
- `doc create` writes `docs/00-project-brief.md` with bilingual section headings already in place.
- `gate` returns `OK` (exit 0) once the 4 required sections are filled in, or `ERR_GATE_FAILED` (exit 1) with a bilingual list of missing sections.
- `advance` writes a `correlationId`-tagged chain of audit events: `advance_started → artifact_gate_run → artifact_gate_passed → state_transitioned → state_write_succeeded → advance_succeeded`.
- `brief` prints the current-step required sections + AI governance reminders so a coding agent can resume without re-reading docs.

A more detailed walkthrough lives in [`docs/quickstart.md`](./docs/quickstart.md), including the expected file tree and common errors.

#### 5.3 Try the executable example

For an end-to-end example that walks all 10 v1.0 SOP steps against a hermetic temp project, see [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) and run:

```bash
npm run build
bash examples/discovery-to-plan/scripts/smoke.sh
```

The smoke prints the final state and exits with `Discovery-to-plan smoke completed.` It does not modify your environment.

### 6. Core CLI commands

All commands accept `--json` to emit a machine-readable `CommandResult` envelope. Exit codes are stable:

| Exit code | Meaning |
|---|---|
| `0` | OK |
| `1` | gate failed |
| `2` | artifact missing or invalid |
| `3` | state machine error |
| `4` | config / lock / IO error |
| `5` | SOP version incompatibility |

| Command | Purpose | Reads / writes | Audit emission |
|---|---|---|---|
| `ocn init [--tier minimal] [--json]` | Initialise an OCN project in the current directory. | Writes `.ocoding/`, `docs/`, the dual-track audit files. | `project_initialized` + state-write events |
| `ocn status [--json]` | Show current state, current step, the relative path of the current step's artifact, and the next-action hint. | Read-only. | None (avoids log spam — pull-mode) |
| `ocn brief [--json]` | Print the current-step brief for an AI coding session: required sections, governance reminders, uncertainty policy. | Read-only. | None (pull-mode) |
| `ocn doc create <type> [--overwrite] [--json]` | Create one of the 5 supported artifacts from its bundled template. | Writes the artifact under `docs/`. | `artifact_created` |
| `ocn check [--json]` | Check the current step's artifact against its required sections. | Read-only. | `artifact_gate_run` + `artifact_gate_passed` / `artifact_gate_blocked` |
| `ocn gate [--json]` | Read-only artifact gate aggregation for the current step. Same emission as `check`; never mutates state. | Read-only. | `artifact_gate_*` (no `correlationId`) |
| `ocn advance [--json]` | Run gate, then advance to the next step on pass. Lock-protected; never partial. | Writes `state.json` (atomic). | Full advance chain with shared `correlationId` |

`<type>` for `doc create`: `project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`.

`--tier` for `init` accepts `minimal`, `production`, `full` — only `minimal` is enforced today (production / full are accepted but their artifact sets are not yet differentiated).

### 7. MCP tools

OCN's MCP server (`ocn-mcp`) exposes 7 tools over stdio transport. **Wire it into Claude Desktop on Windows with WSL2** — that is the validated Host (per [DEC-017](./docs/20-decision-log.md) and [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline are MCP-aware but are **not yet verified** for OCN — see [DEC-019](./docs/20-decision-log.md) for the support boundary; do not treat them as supported until each has its own validation report.

#### 7.1 Wire into Claude Desktop on Windows + WSL2

Add the OCN entry to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ocn": {
      "command": "wsl.exe",
      "args": ["-e", "ocn-mcp"]
    }
  }
}
```

If `ocn-mcp` is not on the WSL2 `PATH`, replace `"ocn-mcp"` with the absolute path printed by `which ocn-mcp` inside WSL2 (typically the npm global bin, e.g. `/home/<user>/.npm-global/bin/ocn-mcp`). Save the config, fully quit Claude Desktop (system tray included), and reopen — the seven `navigator.*` tools should appear in the tools panel.

Full wiring guidance + per-tool envelopes: [`docs/mcp-usage.md`](./docs/mcp-usage.md). The validation transcript that proved this exact path works lives in [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md).

#### 7.2 Allowed (7)

| Tool | Purpose | Mutates? |
|---|---|---|
| `navigator.where_am_i` | State snapshot. | No |
| `navigator.brief` | Current-step brief. | No |
| `navigator.run_gate` | Read-only gate aggregation. | No |
| `navigator.create_artifact` | Create from the 5-type template registry. | Filesystem only |
| `navigator.capture_log` | Append to `docs/19-dev-log.md` (`type=dev`) or `docs/18-research-log.md` (`type=research`). **`type=decision` is hard-rejected.** | Filesystem only |
| `navigator.detect_sop_version` | Drift between locked profile and bundled OCN SOP. | No |
| `navigator.generate_next_prompt` | Required sections + governance reminder + uncertainty policy + self-check rule. | No |

#### 7.3 Forbidden (4) — NEVER exposed

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

## Reference

### 8. Documentation map

OCN ships its own design baseline under `docs/`. Two governance points worth knowing before reading:

- **Canonical decision log**: [`docs/20-decision-log.md`](./docs/20-decision-log.md). Some historical references say `docs/19-decision-log.md` — those refer to the same file before the path move recorded in [AM-002](./docs/amendments/2026-04-28-decision-log-path-amendment.md).
- **Amendment index**: [`docs/amendments/README.md`](./docs/amendments/README.md). Active divergences from the frozen `docs/00-08` design baseline are recorded as amendments rather than inline edits ([DEC-004](./docs/20-decision-log.md#dec-004frozen-design-docs-amendment-policy)).
- **Frozen design baseline**: `docs/00-project-brief.md` through `docs/08-mvp-plan.md` are Phase-2 design contracts, treated as historical artifacts. New projects initialised via `ocn init` get the SOP v1.1 step layout from the bundled default profile; the OCN repository itself runs against a project-level override per [DEC-003](./docs/20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion).
- **Reports**: [`docs/reports/`](./docs/reports/) — Phase 2 closure, post-alpha P1 fix train (4 reports), Claude Desktop MCP Host validation, alpha.0 / alpha.1 / alpha.2 / beta.0 publish reports, examples F2/F3, beta release marker, bilingual install flow, doc audits, final Codex full-repo audit, post-Codex P1/P2 fix report. Phase 2 baseline lives in [`docs/reports/2026-04-28-phase2-completion-report.md`](./docs/reports/2026-04-28-phase2-completion-report.md).
- **Plans**: [`docs/plans/`](./docs/plans/) holds the planning artifacts for each PR. The active GA Prep plan is [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md).
- **MCP usage**: [`docs/mcp-usage.md`](./docs/mcp-usage.md).

### 9. Development

```bash
npm install
npm run lint           # ESLint (TypeScript-eslint)
npm run typecheck      # tsc --noEmit
npm run test           # vitest run — 459 tests, ~24 s
npm run test:coverage  # adds coverage report
npm run build          # tsc + chmod +x on bin entries
```

The pre-commit hook (Husky 9) runs `lint + typecheck + test` on every commit. CI runs the same checks plus `build` and reports coverage. Hard limits per `CLAUDE.md`: file ≤ 300 lines, function ≤ 50 lines, params ≤ 4, nesting ≤ 3, no raw `any` in exported APIs.

### 10. Roadmap

The GA Prep phase was a documentation, packaging, and operational-readiness audit that ran from Phase 2 closure through the beta candidate preparation track. Most GA Prep PRs are now complete; their evidence lives in [`docs/reports/`](./docs/reports/) and [`docs/20-decision-log.md`](./docs/20-decision-log.md). Original plan: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md).

**GA Prep PRs (status)**

- **PR A** — Docs numbering reconciliation + amendments index. Complete.
- **PR B** — README first-5-minutes + CLI help copy audit. Iterated through multiple passes; latest bilingual install-flow refresh: [`docs/reports/2026-05-02-readme-install-flow-completion.md`](./docs/reports/2026-05-02-readme-install-flow-completion.md).
- **PR C** — MCP `projectRoot` path-traversal audit + threat-model doc. [`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md) is in the repo; `projectRoot` validator hardened by [P1-001](./docs/reports/2026-04-30-post-alpha-codex-audit.md) (`validateInitializedProjectRoot`).
- **PR D** — External MCP Host validation. Claude Desktop on Windows with WSL2 validated (see [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md) and [DEC-017](./docs/20-decision-log.md)). Cursor and Cline remain unverified in separate future work.
- **PR E** — npm publish gating plan + CI stability audit. Publish discipline: [DEC-008](./docs/20-decision-log.md) / [DEC-012](./docs/20-decision-log.md) / [DEC-015](./docs/20-decision-log.md) / [DEC-016](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md) / [DEC-022](./docs/20-decision-log.md). CI matrix expanded to Node 20 + Node 22 ([report](./docs/reports/2026-05-01-ci-node-22-matrix-expansion.md)). Lock-observability flake hardened ([report](./docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md)).
- **PR F** — `examples/` directory plan. F1 + F2 + F3 complete: [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) is an executable smoke that walks all 10 v1.0 SOP steps ([report](./docs/reports/2026-05-01-examples-discovery-to-plan.md)). F4 (top-level "Try the example" link) is the example reference under §5.
- **Post-Codex audit fix train** — final full-repo Codex audit ([report](./docs/reports/2026-05-02-final-codex-full-repo-audit.md)) and P1/P2 closure ([report](./docs/reports/2026-05-02-post-codex-p1-p2-fix-report.md)). Two P3 polish items remain.

**Beyond GA Prep — not in any current plan; each requires its own DEC entry first**

- `ocn doctor`, `ocn reset`, `ocn baseline`
- SOP versioning / upgrade tooling
- Production / full tier artifact-set enforcement
- Mini-CRM dogfood (Tier 2 GA success criterion)
- HTTP / SSE MCP transport, MCP auth, MCP session management
- Cursor / Cline real-Host validation (each Host needs its own DEC-017-style report)
- `latest`-tag movement DEC (currently `latest = 0.1.0-alpha.0` per DEC-020 / DEC-021; will only move when a future DEC authorises it)
- GA promotion DEC (final gate tying together Host scope, `latest` movement, multi-OS / Node 24+ CI, dogfood evidence)

### 11. License

[Apache-2.0](./LICENSE)

---

# Part 2 · 中文版

OCN（O'CodingNavigator）是一套**本地优先、MCP 优先、状态机驱动**的 AI 编程工作流操作系统。它把 AI 编程从"持续聊天式发挥"重塑成可导航、有门禁、可审计、可复盘的系统工程过程。它是一个 *navigator*，不是 IDE，不是 SaaS，不是项目管理工具。

CLI：`ocn`；MCP server：`ocn-mcp`；许可：Apache-2.0。

### 中文目录

**理解 OCN**
- §A. [OCN 是什么](#a-ocn-是什么)
- §B. [OCN 解决什么问题](#b-ocn-解决什么问题)
- §C. [当前状态](#c-当前状态phase-2-完成--beta-已发布)

**使用 OCN**
- §D. [安装](#d-安装)
- §E. [5 分钟上手](#e-5-分钟上手)
- §F. [核心 CLI 命令](#f-核心-cli-命令)
- §G. [MCP 工具](#g-mcp-工具)

**参考资料**
- §H. [文档地图](#h-文档地图)
- §I. [开发](#i-开发)
- §J. [路线图](#j-路线图)
- §K. [许可](#k-许可)

---

## 理解 OCN

### A. OCN 是什么

OCN 是 AI 编程的本地纪律层。所有数据都跑在你自己的机器上，落到纯文本（Markdown + JSON + JSONL + YAML）。它对人提供一个小型 CLI，对 agent 提供一个小型 MCP server，**没有任何云端组件**。

OCN 把"纪律"产品化：

- **状态机**：DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT，单向推进，不可回退；
- **步骤产物门禁（Step Artifact Gate）**：当前 step 的必填章节缺失时，状态推进被阻断；
- **双轨审计链**：`.ocoding/audit/audit-events.jsonl`（机器源）+ `docs/22-audit-trail.md`（人类可读）；
- **安全的 MCP 工具面**：agent 可读、可准备、可创建产物，但**不能**推进状态、记录决策、重置项目、强制释放锁。

OCN **不是**：代码生成器、IDE、SaaS、项目管理工具、笔记应用，也不是只会铺脚手架的"文档工厂"。

### B. OCN 解决什么问题

任何稍微复杂的任务，AI 编程 agent 都倾向于踩四类坑：

| 失效模式 | 表现 |
|---|---|
| **迷路（lost）** | 没人——人或 AI——清楚项目当前在哪一步。 |
| **失控（drift）** | Agent 一直在产出，但每一段都离最初需求更远。 |
| **失忆（amnesia）** | 一开新对话，agent 又把上一个对话已经决定的东西重新推一遍。 |
| **假完成（false-completion）** | 文档存在，但缺关键章节；agent 还是宣布"完成"。 |

OCN 把这四个问题视为同一个问题：*AI 编程闭环缺乏严肃的"我们在哪"和"什么算完成"*。OCN 用代码而不是嘴上嘱咐去回答这两个问题。

### C. 当前状态（Phase 2 完成 + beta 已发布）

| 项目 | 状态 |
|---|---|
| 阶段 | **Phase 2 已完成**（[DEC-002](./docs/20-decision-log.md#dec-002phase-2-complete-after-mcp-safe-tools)）+ **beta 候选准备完成**（[DEC-018](./docs/20-decision-log.md)、[DEC-021](./docs/20-decision-log.md)） |
| 测试 | 71 个测试文件、**459** 个用例全部通过 |
| 覆盖率 | 行覆盖 **约 83.5%**（与发布门一致） |
| npm | 已公开发布——`@beta` → `0.1.0-beta.0`；`@alpha` → `0.1.0-alpha.2`；`latest` 故意保持在 `0.1.0-alpha.0`（详见 [DEC-020](./docs/20-decision-log.md)/[DEC-021](./docs/20-decision-log.md)） |
| 成熟度 | **pre-GA beta**——非稳定、非 GA、非生产可用 |
| 已验证 Host | **Claude Desktop on Windows + WSL2** 已端到端验证（[DEC-017](./docs/20-decision-log.md)、[报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)）。Cursor 与 Cline 暂未验证（[DEC-019](./docs/20-decision-log.md)） |
| MCP 传输 | 仅 stdio（HTTP/SSE 尚未启动） |

**已实现**

- **CLI**：`init`、`status`、`brief`、`doc create`、`check`、`gate`、`advance`（完整列表见 §F）。
- **状态机**：8 个状态，单向推进；DISCOVERY → PLAN 已挂上稳定 ID 的 step，BUILD/VERIFY/SHIP/REFLECT 仅有 state ID。
- **步骤产物门禁**：基于 NFKC 标准化的双语 `Title｜标题` 标题匹配。
- **状态安全**：`.ocoding/.lock`（5 秒超时 + 陈旧锁回收）、`state.json.bak` 滚动备份、临时文件 + atomic rename 写入；并发 `advance` 竞态已在 post-Codex P1 修复中关闭。
- **审计**：双轨持久化、16 种事件类型、`correlationId` 串联整条 `ocn advance` 事件链。
- **MCP 安全工具**：stdio 上 7 个只读/准备/创建/日志类工具，4 个禁用工具不会被注册（详见 §G）；`projectRoot` 校验器 + 威胁模型（[`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md)）。
- **真实 Host 验证**：Claude Desktop on Windows + WSL2 已完成端到端验证（[DEC-017](./docs/20-decision-log.md)、[报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)）。
- **可执行示例**：[`examples/discovery-to-plan/`](./examples/discovery-to-plan/)，`scripts/smoke.sh` 跑完 v1.0 SOP 全部 10 个 step；fixture 直接来源于 `src/core/templates/*.ts`，避免漂移。
- **npm 发布纪律**：alpha 与 beta 都通过严格的预发布清单和 `prepublishOnly` 门发布；`files` allowlist 收敛到 `dist/` + LICENSE + README + `docs/quickstart.md` + `docs/mcp-usage.md`；`v0.1.0-beta.0` 为带注释的 git tag + GitHub pre-release（[DEC-022](./docs/20-decision-log.md)）。

**尚未实现（刻意延后，详见 §J）**

`ocn doctor`、`ocn reset`、`ocn baseline`、SOP 版本/升级工具、`production`/`full` tier、mini-CRM dogfood、Cursor/Cline 真实 Host 验证（[DEC-019](./docs/20-decision-log.md)）、远程 MCP 传输、MCP 鉴权。

---

## 使用 OCN

### D. 安装

#### D.1 推荐：从 npm 安装 beta

```bash
npm install -g o-coding-navigation@beta
```

安装后验证：

```bash
ocn --version       # 0.1.0-beta.0
ocn --help
ocn-mcp             # 启动 MCP stdio server；按 Ctrl+C 退出
```

卸载：`npm uninstall -g o-coding-navigation`。

#### D.2 当前已发布的渠道

| 渠道 | 版本 | npm tag | 说明 |
|---|---|---|---|
| Beta（推荐 pre-GA） | `0.1.0-beta.0` | `beta` | 由 [DEC-021](./docs/20-decision-log.md) 授权；证据见 [`docs/reports/2026-05-01-npm-beta-0-publish-report.md`](./docs/reports/2026-05-01-npm-beta-0-publish-report.md)。 |
| Alpha（仍可用） | `0.1.0-alpha.2` | `alpha` | 之前的 pre-GA 通道；和 beta 同步 P1 修复。**仅当你确实需要 alpha 线时才用它。** |
| `latest`（**不要**对 OCN 直接依赖） | `0.1.0-alpha.0` | `latest` | 按 [DEC-020](./docs/20-decision-log.md)/[DEC-021](./docs/20-decision-log.md) 故意冻结在历史首发版本，仅在未来某个 GA 级 DEC 授权时才会移动。 |

包主页：https://www.npmjs.com/package/o-coding-navigation

**前置依赖**：Node.js ≥ 20（参见 `package.json` 的 `engines`）。

> **关于 dist-tag**：按 DEC-020/DEC-021，`latest` 故意停留在 `0.1.0-alpha.0`，`beta`（推荐）解析到 `0.1.0-beta.0`，`alpha` 解析到 `0.1.0-alpha.2`。**不要使用不带 tag 的 `npm install -g o-coding-navigation`**——`latest` 是故意陈旧的，未来某个 DEC 授权时才会移动。一律用显式选择器：`@beta` 是推荐通道，`@alpha` 仅在你确实要 alpha 线时使用。Smoke 证据：[`docs/reports/2026-05-01-npm-global-install-smoke.md`](./docs/reports/2026-05-01-npm-global-install-smoke.md)。

> **pre-GA 警告**：当前是 **pre-GA beta**，不稳定、非 GA、非生产可用。**MCP Host 验证仅完成于 Claude Desktop on Windows + WSL2**（[DEC-017](./docs/20-decision-log.md)、[报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)）；**Cursor 与 Cline 尚未验证**。历史背景见 [DEC-005](./docs/20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)。

#### D.3 备选：从源码本地开发

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link              # 把 `ocn` 和 `ocn-mcp` 暴露到 PATH
```

卸载本地链接：`cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`。

不想用 `npm link` 也可以直接 `node /path/to/O-CodingNavigation/dist/cli/index.js …`。

### E. 5 分钟上手

#### E.1 最小可行流程

```bash
mkdir ocn-demo && cd ocn-demo

ocn init                        # 创建 .ocoding/ 与 docs/
ocn status                      # state_discovery / step_project_brief

ocn doc create project-brief    # 写出 docs/00-project-brief.md（模板）
# 然后编辑该文件，把 4 个必填章节填好：
#   Problem · Goal · Users · Success Criteria

ocn gate                        # 只读校验，确认门禁通过
ocn advance                     # 跑门禁 + 改状态 + 写审计链
ocn status                      # 已推进到 state_discovery / step_scope

ocn brief                       # 给接管的 AI agent 输出当前 step brief
```

#### E.2 每条命令的预期产出

- `init` 写入 `.ocoding/state.json`、`.ocoding/sop.yaml`、双轨审计文件，以及 `docs/` 骨架。
- `status` 报告 `currentStateId: state_discovery` / `currentStepId: step_project_brief`。
- `doc create` 写出 `docs/00-project-brief.md`，包含双语章节标题。
- `gate` 在 4 个必填章节齐备后返回 `OK`（exit 0），否则返回 `ERR_GATE_FAILED`（exit 1）并列出缺的章节。
- `advance` 会写一整条带 `correlationId` 的审计事件链：`advance_started → artifact_gate_run → artifact_gate_passed → state_transitioned → state_write_succeeded → advance_succeeded`。
- `brief` 输出当前 step 的必填章节 + AI 治理提醒，让接管的 agent 不必重读全部文档。

更详细的 walkthrough 见 [`docs/quickstart.md`](./docs/quickstart.md)，含期望文件树和常见报错。

#### E.3 跑可执行示例

仓库自带一个端到端可执行示例 [`examples/discovery-to-plan/`](./examples/discovery-to-plan/)：

```bash
npm run build
bash examples/discovery-to-plan/scripts/smoke.sh
```

该 smoke 在临时目录里走完 v1.0 SOP 全部 10 个 step，最后打印 `Discovery-to-plan smoke completed.`，不会污染你的环境。

### F. 核心 CLI 命令

所有命令都接受 `--json`，输出机器可读的 `CommandResult`。退出码是稳定契约：

| 退出码 | 含义 |
|---|---|
| `0` | OK |
| `1` | 门禁未通过 |
| `2` | 产物缺失或非法 |
| `3` | 状态机错误 |
| `4` | 配置/锁/IO 错误 |
| `5` | SOP 版本不兼容 |

| 命令 | 用途 | 读/写 | 审计输出 |
|---|---|---|---|
| `ocn init [--tier minimal] [--json]` | 在当前目录初始化 OCN 项目。 | 写 `.ocoding/`、`docs/` 与双轨审计文件。 | `project_initialized` + state-write 事件 |
| `ocn status [--json]` | 显示当前 state、当前 step、当前 step 产物的相对路径，以及下一步动作提示。 | 只读。 | 无（避免 pull 模式刷日志） |
| `ocn brief [--json]` | 输出当前 step 的 brief：必填章节、治理提醒、不确定性策略。 | 只读。 | 无（pull 模式） |
| `ocn doc create <type> [--overwrite] [--json]` | 用模板生成 5 类产物之一。 | 在 `docs/` 写产物。 | `artifact_created` |
| `ocn check [--json]` | 检查当前 step 的产物是否满足必填章节。 | 只读。 | `artifact_gate_run` + `artifact_gate_passed` / `artifact_gate_blocked` |
| `ocn gate [--json]` | 当前 step 的只读门禁聚合。和 `check` 输出相同；不改状态。 | 只读。 | `artifact_gate_*`（无 `correlationId`） |
| `ocn advance [--json]` | 跑门禁，通过后推进到下一 step。带锁保护，永不部分写入。 | 原子写 `state.json`。 | 完整 advance 事件链，共享 `correlationId` |

`doc create` 的 `<type>`：`project-brief`、`scope`、`prd`、`acceptance-criteria`、`technical-architecture`。

`init` 的 `--tier`：`minimal`、`production`、`full`，目前只对 `minimal` 强制约束（`production` / `full` 接受参数但产物集合尚未差异化）。

### G. MCP 工具

OCN 的 MCP server（`ocn-mcp`）通过 stdio 暴露 7 个工具。**唯一已验证的 Host 路径是 Windows + WSL2 + Claude Desktop**（[DEC-017](./docs/20-decision-log.md)、[报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)）。Cursor 与 Cline 都支持 MCP，但暂未对 OCN 完成验证（[DEC-019](./docs/20-decision-log.md)）；在它们各自的验证报告落地之前，**不要把它们当作正式支持路径**。

#### G.1 接入 Windows + WSL2 中的 Claude Desktop

在 Windows 中编辑 `%APPDATA%\Claude\claude_desktop_config.json`，并入：

```json
{
  "mcpServers": {
    "ocn": {
      "command": "wsl.exe",
      "args": ["-e", "ocn-mcp"]
    }
  }
}
```

如果 WSL2 里 `ocn-mcp` 不在 `PATH` 上，把 `"ocn-mcp"` 替换成 `which ocn-mcp` 输出的绝对路径（通常是 npm 全局 bin，如 `/home/<user>/.npm-global/bin/ocn-mcp`）。保存后**完全退出**（含系统托盘）再重启 Claude Desktop，工具面板里应当看到 7 个 `navigator.*` 工具。

完整接入说明与每个工具的输入/输出 envelope：[`docs/mcp-usage.md`](./docs/mcp-usage.md)。验证当时的实际记录见 [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)。

#### G.2 暴露的 7 个工具

| 工具 | 用途 | 是否写入 |
|---|---|---|
| `navigator.where_am_i` | 状态快照。 | 否 |
| `navigator.brief` | 当前 step 的 brief。 | 否 |
| `navigator.run_gate` | 只读门禁聚合。 | 否 |
| `navigator.create_artifact` | 用 5 类模板创建产物。 | 仅文件系统 |
| `navigator.capture_log` | 追加到 `docs/19-dev-log.md`（`type=dev`）或 `docs/18-research-log.md`（`type=research`）；**`type=decision` 强拒**。 | 仅文件系统 |
| `navigator.detect_sop_version` | 比较已落盘 SOP profile 与内置 OCN SOP，输出漂移状态。 | 否 |
| `navigator.generate_next_prompt` | 当前 step 的必填章节 + 治理提醒 + 不确定性策略 + 自检规则。 | 否 |

#### G.3 4 个被禁工具——永远不会暴露

| 工具 | 原因 |
|---|---|
| `navigator.advance_phase` | 状态推进只能由人通过 CLI 触发。 |
| `navigator.capture_decision` | 决策必须反映人的意图；MCP 上的 `capture_log` 已硬拒 `type=decision`。 |
| `navigator.reset_project` | 破坏性操作，必须由人二次确认。 |
| `navigator.force_release_lock` | 会绕过状态安全不变量，仅运维使用。 |

由 `tests/unit/mcp-tool-registry.test.ts` 强制（`ALLOWED ∩ FORBIDDEN = ∅`）。

> 接入 OCN 的 MCP agent 可以读项目状态、渲染下一步 brief、准备产物、跑只读门禁、用模板创建产物、捕获 `dev` / `research` 日志。**不可以**推进状态、记录决策、重置项目、强制释放锁。

完整工具面 + 接入说明：[`docs/mcp-usage.md`](./docs/mcp-usage.md)。

---

## 参考资料

### H. 文档地图

OCN 把自己的设计基线放在 `docs/` 下。开始阅读前两个治理点：

- **决策日志（唯一权威）**：[`docs/20-decision-log.md`](./docs/20-decision-log.md)。早期文档里出现的 `docs/19-decision-log.md` 是同一份文件的旧路径，迁移记录见 [AM-002](./docs/amendments/2026-04-28-decision-log-path-amendment.md)。
- **修订（amendment）索引**：[`docs/amendments/README.md`](./docs/amendments/README.md)。冻结的 `docs/00-08` 设计基线之上的所有有效偏离都以 amendment 形式记录，不就地改动 ([DEC-004](./docs/20-decision-log.md#dec-004frozen-design-docs-amendment-policy))。
- **冻结的设计基线**：`docs/00-project-brief.md` 至 `docs/08-mvp-plan.md` 是 Phase 2 设计契约，作为历史档案对待。新项目通过 `ocn init` 拿到的是内置 SOP v1.1 的 step 布局；OCN 仓库自身按 [DEC-003](./docs/20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion) 跑项目级 override。
- **报告**：[`docs/reports/`](./docs/reports/) ——Phase 2 收口、post-alpha P1 修复（4 篇）、Claude Desktop MCP Host 验证、alpha.0 / alpha.1 / alpha.2 / beta.0 发布报告、examples F2/F3、beta release marker、双语安装流程、文档审计、最终 Codex 全 repo 审计、post-Codex P1/P2 修复报告。Phase 2 基线见 [`docs/reports/2026-04-28-phase2-completion-report.md`](./docs/reports/2026-04-28-phase2-completion-report.md)。
- **计划**：[`docs/plans/`](./docs/plans/)。当前活动的 GA Prep 计划是 [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md)。
- **MCP 用法**：[`docs/mcp-usage.md`](./docs/mcp-usage.md)。

### I. 开发

```bash
npm install
npm run lint           # ESLint（TypeScript-eslint）
npm run typecheck      # tsc --noEmit
npm run test           # vitest run —— 459 个用例，约 24 秒
npm run test:coverage  # 加上覆盖率报告
npm run build          # tsc + 给 bin 入口加 chmod +x
```

pre-commit 钩子（Husky 9）会在每次 commit 前跑 `lint + typecheck + test`。CI 跑同样的检查再加 `build` 与覆盖率上传。`CLAUDE.md` 里的硬约束：单文件 ≤ 300 行、单函数 ≤ 50 行、参数 ≤ 4、嵌套 ≤ 3、对外 API 不许 raw `any`。

### J. 路线图

GA Prep 阶段是从 Phase 2 收口走到 beta candidate 准备的一段文档/打包/运营就绪审计。大部分 GA Prep PR 已完成，证据全在 [`docs/reports/`](./docs/reports/) 与 [`docs/20-decision-log.md`](./docs/20-decision-log.md)。原始计划见 [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md)。

**GA Prep 各 PR 状态**

- **PR A**——文档编号修复 + amendments 索引。已完成。
- **PR B**——README first-5-minutes 与 CLI help 文案审计；最近一次双语安装流程刷新见 [`docs/reports/2026-05-02-readme-install-flow-completion.md`](./docs/reports/2026-05-02-readme-install-flow-completion.md)。
- **PR C**——MCP `projectRoot` 路径穿越审计 + 威胁模型。[`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md) 已合入；`projectRoot` 校验器在 [P1-001](./docs/reports/2026-04-30-post-alpha-codex-audit.md) 中由 `validateInitializedProjectRoot` 加固。
- **PR D**——外部 MCP Host 验证。Claude Desktop on Windows + WSL2 已端到端验证（见 [报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md) 与 [DEC-017](./docs/20-decision-log.md)）；Cursor 与 Cline 留给后续工作。
- **PR E**——npm 发布门禁计划 + CI 稳定性审计。发布纪律：[DEC-008](./docs/20-decision-log.md) / [DEC-012](./docs/20-decision-log.md) / [DEC-015](./docs/20-decision-log.md) / [DEC-016](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md) / [DEC-022](./docs/20-decision-log.md)。CI 矩阵已扩展到 Node 20 + Node 22（[报告](./docs/reports/2026-05-01-ci-node-22-matrix-expansion.md)）。锁观察 flake 已加固（[报告](./docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md)）。
- **PR F**——`examples/` 计划。F1 + F2 + F3 完成：[`examples/discovery-to-plan/`](./examples/discovery-to-plan/) 是端到端可执行 smoke，覆盖 v1.0 SOP 全部 10 个 step（[报告](./docs/reports/2026-05-01-examples-discovery-to-plan.md)）。F4（README 顶层 "Try the example" 链接）即 §E 中的示例引用。
- **post-Codex 审计修复 train**——最终 Codex 全 repo 审计（[报告](./docs/reports/2026-05-02-final-codex-full-repo-audit.md)）与 P1/P2 修复（[报告](./docs/reports/2026-05-02-post-codex-p1-p2-fix-report.md)）；剩两个 P3 polish 项。

**GA Prep 之外——目前不在任何活动计划里，落地前必须先开 DEC**

- `ocn doctor`、`ocn reset`、`ocn baseline`
- SOP 版本/升级工具
- production / full tier 的产物集合差异化
- mini-CRM dogfood（Tier 2 GA 成功条件）
- HTTP / SSE MCP 传输、MCP 鉴权、MCP 会话管理
- Cursor / Cline 真实 Host 验证（每个 Host 都需要 DEC-017 模式的独立验证报告）
- `latest` tag 移动 DEC（当前 `latest = 0.1.0-alpha.0`，按 DEC-020/DEC-021 冻结，仅在未来某个 DEC 授权时移动）
- GA promotion DEC（最终把 Host 范围、`latest` 移动、多 OS / Node 24+ CI 矩阵、dogfood 证据捆在一起的门）

### K. 许可

[Apache-2.0](./LICENSE)
