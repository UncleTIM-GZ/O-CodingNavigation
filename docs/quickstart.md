# OCN Quickstart

> Companion to [`README.md`](../README.md). Read the README first for *what* OCN is and *why* it exists; this file is the *how*.

---

## 1. Install｜安装

### 1a. Recommended — install the beta package from npm｜推荐通过 npm 安装 beta

```bash
npm install -g o-coding-navigation@beta
```

Then verify both binaries are on your PATH:

```bash
ocn --version       # 0.1.0-beta.0
ocn --help
ocn-mcp             # starts the MCP stdio server; press Ctrl+C to exit
```

> **中文说明｜Chinese summary**
> 当前推荐使用 `@beta` 通道全局安装：`npm install -g o-coding-navigation@beta`。
> 安装后用 `ocn --version` 验证版本号是否为 `0.1.0-beta.0`，再用 `ocn --help` 确认命令可用；`ocn-mcp` 会启动 MCP stdio server（在 stdin EOF 时会自动退出）。
> Node 版本需要 ≥ 20。

The MCP server binary `ocn-mcp` is published. **MCP Host validation completed for Claude Desktop on Windows with WSL2** (see [DEC-017](./20-decision-log.md) and [`reports/2026-04-30-mcp-external-host-validation-report.md`](./reports/2026-04-30-mcp-external-host-validation-report.md)). **Cursor and Cline remain unverified** — treat them as *implemented* but not as *verified host-compatibility* until separate validation lands. The historical [DEC-005](./20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) caveat is preserved as a record of the deferral that originally applied.

> MCP Host validation completed for Claude Desktop on Windows with WSL2. Cursor and Cline remain unverified.

To uninstall: `npm uninstall -g o-coding-navigation`.

**Prerequisites**: Node.js ≥ 20.

> **Alpha is still available** at `npm install -g o-coding-navigation@alpha` (resolves to `0.1.0-alpha.2`) but `@beta` is now the recommended pre-GA channel. The `@alpha` form is kept available for users who specifically need the alpha line; new users should prefer `@beta`.

> **dist-tag note**: per [DEC-020](./20-decision-log.md) and [DEC-021](./20-decision-log.md), `latest` remains intentionally unchanged at `0.1.0-alpha.0`. Current dist-tags: `beta = 0.1.0-beta.0` (recommended), `alpha = 0.1.0-alpha.2`, `latest = 0.1.0-alpha.0`. **Do NOT use untagged `npm install -g o-coding-navigation`** while `latest` is intentionally stale — always pass an explicit `@beta` (or `@alpha`) selector. `latest` will only move when a future DEC authorises it. Verified by [`reports/2026-05-01-npm-global-install-smoke.md`](./reports/2026-05-01-npm-global-install-smoke.md) and [`reports/2026-05-01-npm-beta-0-publish-report.md`](./reports/2026-05-01-npm-beta-0-publish-report.md).

### 1b. Alternative — local development from source

If you are developing OCN itself, use the source checkout path instead. This is the contributor path, not the user path.

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link
```

Verify:

```bash
ocn --version
ocn-mcp
```

To uninstall the global links: `cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`.

---

## 2. First 5 minutes (DISCOVERY → SPEC walkthrough)｜首次 5 分钟（DISCOVERY → SPEC 演练）

> **中文说明｜Chinese summary**
> 在新目录里跑 `ocn init` 初始化项目；用 `ocn status` 查看当前 state/step；用 `ocn doc create project-brief` 生成项目简报模板，编辑填好 4 个必填章节（Problem / Goal / Users / Success Criteria）；再用 `ocn check` 或 `ocn gate` 验证；通过后 `ocn advance` 推进到下一个 step。重复这个循环一直走到 `step_acceptance_criteria` 等。最后 `ocn brief` 输出给 AI agent 的 brief。

### Step 1 — Init

```bash
mkdir ocn-demo && cd ocn-demo
ocn init
ocn status
```

Expected: `currentStateId: state_discovery`, `currentStepId: step_project_brief`. The first step in the SOP map is `step_project_brief`, whose artifact slot is `docs/00-project-brief.md`.

### Step 2 — Create the first artifact

```bash
ocn doc create project-brief
```

Writes `docs/00-project-brief.md` from the bundled bilingual template. Open it and fill in the 4 required sections:

```
# Problem｜问题
…describe the problem…

# Goal｜目标
…describe the goal…

# Users｜用户
…describe the target users…

# Success Criteria｜成功标准
…describe what success looks like…
```

Section names are matched case-insensitively after NFKC normalisation, so `Problem` ≡ `problem` ≡ `Problem｜问题` ≡ `Problem | 问题`.

### Step 3 — Gate, then advance

```bash
ocn gate              # read-only — confirms the artifact passes
ocn advance           # gate + state mutation + audit trail
ocn status            # state_discovery / step_scope
```

If the gate is blocked, `gate` and `advance` both report a bilingual list of missing sections and exit non-zero. `advance` never mutates state on a blocked gate.

### Step 4 — Repeat through SPEC

```bash
ocn doc create scope        # docs/01-scope.md
# fill: In Scope, Out of Scope, Technical Constraints, Completion Boundary
ocn advance                 # → state_spec / step_prd

ocn doc create prd          # docs/02-prd.md
# fill: Problem, Goals, Users, Scenarios, Requirements
ocn advance                 # → state_spec / step_acceptance_criteria
```

### Step 5 — Read the audit trail

```bash
cat .ocoding/audit/audit-events.jsonl | head
cat docs/22-audit-trail.md | head -50
```

Every command above contributed events. The full advance chain shares a `correlationId`, so you can grep for one ULID and reconstruct the entire transition.

### Step 6 — Brief an AI agent

```bash
ocn brief
```

Prints the current-step required sections, the AI Governance reminders, and the Uncertainty Policy. Pipe it into your AI coding host so the agent resumes with full context.

---

## 3. Expected file tree after init

```
ocn-demo/
├── .ocoding/
│   ├── state.json                       ← machine source of truth (locked, atomic writes)
│   ├── state.json.bak                   ← rolling backup
│   ├── sop.yaml                         ← snapshot of the bundled SOP profile
│   ├── gates.yaml
│   ├── config.yaml
│   ├── .lock                            ← present only while a write is in flight
│   └── audit/
│       └── audit-events.jsonl           ← machine audit log (append-only JSONL)
└── docs/
    └── 22-audit-trail.md                ← human audit narrative (created on first event)
```

After `doc create project-brief` you'll also see `docs/00-project-brief.md`. After advancing through SCOPE you'll see `docs/01-scope.md`. After SPEC you'll see `docs/02-prd.md`. And so on per [`docs/00-project-brief.md` Appendix A](./00-project-brief.md).

---

## 4. Common errors｜常见问题

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_IO_OR_CONFIG: project not initialized` | Running a command before `ocn init`. | `ocn init` first. |
| `ERR_GATE_FAILED` from `ocn check` / `ocn gate` / `ocn advance` | Current artifact is missing a required section. | Read the bilingual `missingRequiredSectionIds` list and add those headings. |
| `ERR_STATE_MACHINE` from `ocn advance` | Already at the last wired step (DISCOVERY → PLAN have steps; BUILD onward have state IDs only). | This is expected once you reach the end of the wired step map. Future PRs will wire BUILD/VERIFY/SHIP/REFLECT steps. |
| `ERR_ARTIFACT_INVALID` from `ocn doc create <type>` | `<type>` is not one of the 5 supported. | Pick from `project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`. |
| `ERR_IO_OR_CONFIG: lock acquire timeout` | A previous `ocn advance` was killed mid-write and the lock is stale. | Wait 30s for the stale-recovery path to fire automatically, or inspect `.ocoding/.lock` — if its PID is not running, it is safe to delete. |
| `ocn-mcp` writes nothing on stderr but the host shows nothing happening | MCP stdio is silent on the success path by design (audit fallback uses a silent logger). | Use the host's tool-list view to confirm 7 tools loaded. |
| `ocn` not found after `npm install -g …@beta` | Global npm bin not on `PATH`. | `echo $(npm prefix -g)/bin` and add to `PATH`. |
| `ocn --version` does not show `0.1.0-beta.0` | Installed without the `@beta` selector — npm resolved an older version via `latest`. | Re-install with the explicit selector: `npm install -g o-coding-navigation@beta`. Do **not** use untagged `npm install -g o-coding-navigation` while DEC-020 / DEC-021 are in force. |
| Claude Desktop does not show OCN tools after editing the config | Config edits require a clean restart. | Fully quit Claude Desktop (system tray included) and reopen. Confirm 7 `navigator.*` tools appear. |

If you suspect a real bug, run with `--json` to capture the full `CommandResult` envelope and file an issue with that JSON.

> **中文说明｜Chinese summary**
> 常见问题速查：
> - `ERR_IO_OR_CONFIG: project not initialized` → 先跑 `ocn init`。
> - `ERR_GATE_FAILED` → 看 bilingual 的 `missingRequiredSectionIds`，把缺的章节标题补上。
> - `ocn` 找不到 → 把 `$(npm prefix -g)/bin` 加进 `PATH`。
> - `ocn --version` 不是 `0.1.0-beta.0` → 重新用 `npm install -g o-coding-navigation@beta` 安装；不要用不带 tag 的命令。
> - Claude Desktop 看不到 OCN 工具 → 改完配置后**完全退出**（含系统托盘）再重启 Claude Desktop。

---

## 5. Wiring `ocn-mcp` into a host｜把 `ocn-mcp` 接入 MCP Host

> **Validated path**: Claude Desktop on Windows with WSL2 (DEC-017 / [`reports/2026-04-30-mcp-external-host-validation-report.md`](./reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline are **not yet verified** (DEC-019).

### Validated path: Claude Desktop on Windows + WSL2

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

If `ocn-mcp` is not on the WSL2 `PATH`, replace `"ocn-mcp"` with the absolute path printed by `which ocn-mcp` inside WSL2 (typically `/home/<user>/.npm-global/bin/ocn-mcp`).

After editing the config, **fully quit** Claude Desktop (including the system tray icon) and reopen. The seven `navigator.*` tools in [`docs/mcp-usage.md`](./mcp-usage.md) §2 should appear in the tools panel. The four forbidden tools (`navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, `navigator.force_release_lock`) must NOT appear — that's enforced by `tests/unit/mcp-tool-registry.test.ts`.

### Native (non-WSL) host on Linux / macOS

If you run a host directly on Linux or macOS (not WSL2) and `ocn-mcp` is on `PATH`:

```json
{
  "mcpServers": {
    "ocn": {
      "command": "ocn-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

This native path has **not** been validated end-to-end with a real Host yet — only the WSL2 path was. Treat the native config as plausible-but-unverified until a separate Host validation lands.

Every tool requires an absolute `projectRoot` argument. The host (or your prompt) supplies this; OCN itself is project-agnostic.

> **中文说明｜Chinese summary**
> 当前已验证的接入路径是 **Windows + WSL2 + Claude Desktop**：在 `%APPDATA%\Claude\claude_desktop_config.json` 中加入上面那段 `wsl.exe -e ocn-mcp` 的 JSON。如果 WSL2 里 `ocn-mcp` 不在 `PATH`，把它替换成 `which ocn-mcp` 给出的绝对路径。改完**完全退出**再重启 Claude Desktop（含系统托盘）即可看到 7 个 `navigator.*` 工具，禁止工具不会出现。
> Cursor 与 Cline 暂未完成真实 Host 验证，不应视为正式支持路径。
> 如果你在 Linux/macOS 原生跑某个 Host（非 WSL2），可以使用第二种 native 配置，但这条路径目前没有真实 Host 验证报告。

---

## 6. Where to go next

- [README §6](../README.md#6-core-cli-commands) — full CLI reference table.
- [README §7](../README.md#7-mcp-tools) — MCP allowed/forbidden surface summary.
- [`docs/mcp-usage.md`](./mcp-usage.md) — MCP host wiring + safety boundaries.
- [`docs/00-project-brief.md`](./00-project-brief.md) Appendix A — the full SOP step map.
- [`docs/20-decision-log.md`](./20-decision-log.md) — DEC-001 through the present.
- [`docs/amendments/README.md`](./amendments/README.md) — active divergences from the frozen design baseline.
