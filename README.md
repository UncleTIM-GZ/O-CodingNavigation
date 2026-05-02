# O'CodingNavigator (OCN)

> Local-first, MCP-first, state-machine-driven **AI coding workflow operating system**.
> CLI: `ocn` · MCP: `ocn-mcp` · License: Apache-2.0
> **Phase**: Phase 2 Complete + beta candidate prep complete · **Status**: pre-GA beta · **Public**: on npm as `@beta` → [`0.1.0-beta.0`](https://www.npmjs.com/package/o-coding-navigation) · GitHub pre-release: [`v0.1.0-beta.0`](https://github.com/UncleTIM-GZ/O-CodingNavigation/releases/tag/v0.1.0-beta.0)

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

## 3. Current status (Phase 2 Complete + beta published)

| | |
|---|---|
| Phase | **Phase 2 Complete** ([DEC-002](./docs/20-decision-log.md#dec-002phase-2-complete-after-mcp-safe-tools)) + **beta candidate prep complete** ([DEC-018](./docs/20-decision-log.md), [DEC-021](./docs/20-decision-log.md)) |
| Tests | 393 → **449** passed across 68 files (default suite, post-beta-candidate work) |
| Coverage | **83.47%** lines (matches the publish-time gate) |
| npm | currently published — `@beta` → `0.1.0-beta.0` ([report](./docs/reports/2026-05-01-npm-beta-0-publish-report.md)); `@alpha` → `0.1.0-alpha.2` (post-P1-fix-train); `latest` deliberately unchanged at `0.1.0-alpha.0` per [DEC-020](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md) |
| Maturity | **pre-GA beta** — not stable, not GA, not production-ready |
| External host validation | **completed for Claude Desktop on Windows with WSL2** ([DEC-017](./docs/20-decision-log.md), [report](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline remain unverified ([DEC-019](./docs/20-decision-log.md)) |
| MCP transport | stdio only (HTTP/SSE not started) |

### ✅ Implemented

- **CLI**: `init`, `status`, `brief`, `doc create`, `check`, `gate`, `advance` (full list in §6).
- **State machine**: 8 states, forward-only transitions; DISCOVERY → PLAN have stable-ID steps wired (BUILD / VERIFY / SHIP / REFLECT have state IDs only — steps deferred).
- **Step Artifact Gate**: required-section detection with NFKC-normalised heading match for bilingual `Title｜标题` headings.
- **State safety**: `.ocoding/.lock` (5s timeout + stale recovery), `state.json.bak` rolling backup, atomic temp-rename writes.
- **Audit**: dual-track persistence, 16 event types, `correlationId` threading across the entire `ocn advance` event chain.
- **MCP safe tools**: 7 read/prepare/create/log tools over stdio; 4 forbidden tools never registered (full list in §7); `projectRoot` validator + threat model ([`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md)).
- **Real MCP Host validation**: Claude Desktop on Windows with WSL2 validated end-to-end ([DEC-017](./docs/20-decision-log.md), [report](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline remain unverified.
- **Executable example**: [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) walks all 10 v1.0 SOP steps end-to-end via `scripts/smoke.sh`. Bundled fixtures derived verbatim from `src/core/templates/*.ts` so they cannot drift.
- **npm publish discipline**: alpha (`@alpha` → `0.1.0-alpha.2`) and beta (`@beta` → `0.1.0-beta.0`) both publicly published on the npm registry under strict pre-publish checklists, `prepublishOnly` gate, and `files` allowlist. `latest` deliberately unchanged at `0.1.0-alpha.0` per [DEC-020](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md). Annotated git tag `v0.1.0-beta.0` and matching GitHub pre-release published per [DEC-022](./docs/20-decision-log.md).

### ❌ Not implemented (deliberately deferred — see §10)

`ocn doctor`, `ocn reset`, `ocn baseline`, SOP versioning / upgrade, `production` / `full` tiers, mini-CRM dogfood, real-Host validation for Cursor / Cline ([DEC-019](./docs/20-decision-log.md)), remote MCP transport, MCP auth.

---

## 4. Install｜安装

### Recommended: beta from npm｜推荐通过 npm 安装 beta

```bash
npm install -g o-coding-navigation@beta
```

Verify:

```bash
ocn --version       # 0.1.0-beta.0
ocn --help
ocn-mcp        # starts the MCP stdio server; press Ctrl+C to exit
```

> **中文说明｜Chinese summary**
> 当前推荐使用 `@beta` 通道全局安装：`npm install -g o-coding-navigation@beta`。
> 安装后用 `ocn --version` 验证版本号是否为 `0.1.0-beta.0`，再用 `ocn --help` 确认命令可用。
> 暂时不要使用不带 tag 的 `npm install -g o-coding-navigation`：npm 的 `latest` 仍故意指向旧的 `0.1.0-alpha.0`，是否移动 `latest` 留待后续决策（详见 §"Note on dist-tags"）。

**Currently published**:

| Channel | Version | npm tag | Notes |
|---|---|---|---|
| Beta (recommended pre-GA) | `0.1.0-beta.0` | `beta` | Authorised by [DEC-021](./docs/20-decision-log.md); evidence in [`docs/reports/2026-05-01-npm-beta-0-publish-report.md`](./docs/reports/2026-05-01-npm-beta-0-publish-report.md). |
| Alpha (still available) | `0.1.0-alpha.2` | `alpha` | Prior pre-GA channel; ships the same post-P1-fix-train bits. Use only if you need the alpha-line specifically. |
| `latest` (do **not** rely on this for OCN) | `0.1.0-alpha.0` | `latest` | Deliberately unchanged from the historical first publish per [DEC-020](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md). Will only move when a future GA-or-later DEC authorises it. |

Package home: https://www.npmjs.com/package/o-coding-navigation

**Prerequisites**: Node.js ≥ 20 (see `engines` in `package.json`).

> **Note on dist-tags**: per [DEC-020](./docs/20-decision-log.md) and [DEC-021](./docs/20-decision-log.md), `latest` remains intentionally unchanged at `0.1.0-alpha.0` while `beta` (recommended) resolves to `0.1.0-beta.0` and `alpha` (prior pre-GA channel) resolves to `0.1.0-alpha.2`. **Do NOT use untagged `npm install -g o-coding-navigation`** — `latest` is intentionally stale and will only move when a future DEC authorises it. Always install with an explicit selector (`@beta` for the recommended channel, `@alpha` if you need the alpha line specifically). Smoke evidence: [`docs/reports/2026-05-01-npm-global-install-smoke.md`](./docs/reports/2026-05-01-npm-global-install-smoke.md).

> **Pre-GA caveat**: this is a **pre-GA beta** release. The package is not stable, not GA, and not production-ready. **MCP Host validation completed for Claude Desktop on Windows with WSL2** (per [DEC-017](./docs/20-decision-log.md) and [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)); **Cursor and Cline remain unverified** in this release. See [DEC-005](./docs/20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) for the historical caveat.

To uninstall: `npm uninstall -g o-coding-navigation`.

### Alternative: local development from source

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

---

## 5. First 5 minutes｜首次使用

> **中文说明｜Chinese summary**
> 在一个新目录里跑 `ocn init` 初始化项目，然后用 `ocn status` 查看当前状态机步骤；用 `ocn doc create project-brief` 生成项目简报模板，编辑填好 4 个必填章节（Problem / Goal / Users / Success Criteria）；再用 `ocn check` 或 `ocn gate` 验证当前 step 的产物是否合规；通过后用 `ocn advance` 推进到下一个 step。最后 `ocn brief` 为接管的 AI agent 输出当前 step 的 brief。

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

### Try the example｜运行示例

For an executable end-to-end example that walks all 10 v1.0 SOP steps against a hermetic temp project, see [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) and run:

```bash
npm run build
bash examples/discovery-to-plan/scripts/smoke.sh
```

The smoke prints the final state and exits with `Discovery-to-plan smoke completed.` It does not modify your environment.

> **中文说明｜Chinese summary**
> 仓库自带一个端到端可执行示例 [`examples/discovery-to-plan/`](./examples/discovery-to-plan/)：先 `npm run build`，然后 `bash examples/discovery-to-plan/scripts/smoke.sh`，会在临时目录里跑完 v1.0 SOP 的全部 10 个 step，最后打印 `Discovery-to-plan smoke completed.`，不会污染你的环境。

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

## 7. MCP tools｜MCP 工具

OCN's MCP server (`ocn-mcp`) exposes 7 tools over stdio transport. **Wire it into Claude Desktop on Windows with WSL2** — that is the validated Host (per [DEC-017](./docs/20-decision-log.md) and [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline are MCP-aware but are **not yet verified** for OCN — see [DEC-019](./docs/20-decision-log.md) for the support boundary; do not treat them as supported until each has its own validation report.

> **中文说明｜Chinese summary**
> 当前已通过真实 Host 验证的路径是 **Windows + WSL2 + Claude Desktop**（参见 [DEC-017](./docs/20-decision-log.md) 与 [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)）。
> Cursor 和 Cline 暂未完成验证，不应视为正式支持路径。每个 Host 都需要独立的验证报告（DEC-017 模式）才能加入支持声明。

### Wire into Claude Desktop on Windows + WSL2｜在 Windows + WSL2 中接入 Claude Desktop

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

> **中文说明｜Chinese summary**
> 在 Windows 中编辑 `%APPDATA%\Claude\claude_desktop_config.json`，把上面的 JSON 段并入 `mcpServers`。
> 如果 WSL2 里 `ocn-mcp` 不在 `PATH` 上，把 `"ocn-mcp"` 替换成 `which ocn-mcp` 输出的绝对路径。
> 保存后**完全退出**（含系统托盘）再重启 Claude Desktop，即可看到 7 个 `navigator.*` 工具。

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
- **Reports**: [`docs/reports/`](./docs/reports/) — Phase 2 closure, post-alpha P1 fix train (4 reports), Claude Desktop MCP Host validation, alpha.0 / alpha.1 / alpha.2 / beta.0 publish reports, examples F2/F3, beta release marker, bilingual install flow, doc audits. Phase 2 baseline lives in [`docs/reports/2026-04-28-phase2-completion-report.md`](./docs/reports/2026-04-28-phase2-completion-report.md).
- **Plans**: [`docs/plans/`](./docs/plans/) holds the planning artifacts for each PR. The active GA Prep plan is [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md).
- **MCP usage**: [`docs/mcp-usage.md`](./docs/mcp-usage.md).

---

## 9. Development

```bash
npm install
npm run lint           # ESLint (TypeScript-eslint)
npm run typecheck      # tsc --noEmit
npm run test           # vitest run — 449 tests, ~3s
npm run test:coverage  # adds coverage report
npm run build          # tsc + chmod +x on bin entries
```

The pre-commit hook (Husky 9) runs `lint + typecheck + test` on every commit. CI runs the same checks plus `build` and reports coverage. Hard limits per `CLAUDE.md`: file ≤ 300 lines, function ≤ 50 lines, params ≤ 4, nesting ≤ 3, no raw `any` in exported APIs.

---

## 10. Roadmap

The GA Prep phase was a documentation, packaging, and operational-readiness audit that ran from Phase 2 closure through the beta candidate preparation track. Most GA Prep PRs are now complete; their evidence lives in [`docs/reports/`](./docs/reports/) and [`docs/20-decision-log.md`](./docs/20-decision-log.md). Original plan: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md).

- ✅ **PR A** — Docs numbering reconciliation + amendments index.
- ✅ **PR B** — README first-5-minutes + CLI help copy audit. Iterated through multiple passes; latest bilingual install-flow refresh: [`docs/reports/2026-05-02-readme-install-flow-completion.md`](./docs/reports/2026-05-02-readme-install-flow-completion.md).
- ✅ **PR C** — MCP `projectRoot` path-traversal audit + threat-model doc. [`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md) is in the repo; `projectRoot` validator hardened by [P1-001](./docs/reports/2026-04-30-post-alpha-codex-audit.md) (`validateInitializedProjectRoot`).
- 🟢 **PR D** — External MCP Host validation. Claude Desktop on Windows with WSL2 validated (see [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md) and [DEC-017](./docs/20-decision-log.md)). Cursor and Cline remain unverified in separate future work.
- ✅ **PR E** — npm publish gating plan + CI stability audit. Publish discipline: [DEC-008](./docs/20-decision-log.md) / [DEC-012](./docs/20-decision-log.md) / [DEC-015](./docs/20-decision-log.md) / [DEC-016](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md) / [DEC-022](./docs/20-decision-log.md). CI matrix expanded to Node 20 + Node 22 ([report](./docs/reports/2026-05-01-ci-node-22-matrix-expansion.md)). Lock-observability flake hardened ([report](./docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md)).
- 🟢 **PR F** — `examples/` directory plan. F1 + F2 + F3 complete: [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) is an executable smoke that walks all 10 v1.0 SOP steps ([report](./docs/reports/2026-05-01-examples-discovery-to-plan.md)). F4 (top-level "Try the example" link) is the example reference under §5.

Beyond GA Prep, the following are **deliberately not part of any current plan** and require their own DEC entry before implementation begins:

- `ocn doctor`, `ocn reset`, `ocn baseline`
- SOP versioning / upgrade tooling
- Production / full tier artifact-set enforcement
- Mini-CRM dogfood (Tier 2 GA success criterion)
- HTTP / SSE MCP transport, MCP auth, MCP session management
- Cursor / Cline real-Host validation (each Host needs its own DEC-017-style report)
- `latest`-tag movement DEC (currently `latest = 0.1.0-alpha.0` per DEC-020 / DEC-021; will only move when a future DEC authorises it)
- GA promotion DEC (final gate tying together Host scope, `latest` movement, multi-OS / Node 24+ CI, dogfood evidence)

---

## 11. License

[Apache-2.0](./LICENSE)
