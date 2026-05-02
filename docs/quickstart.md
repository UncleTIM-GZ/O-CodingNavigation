# OCN Quickstart｜OCN 快速上手

> Companion to [`README.md`](../README.md). Read the README first for *what* OCN is and *why* it exists; this file is the *how*.
> 这是 [`README.md`](../README.md) 的配套文档：先看 README 了解 OCN 是什么、为什么存在；本文聚焦"怎么用"。

> 📑 This document has two parts:
> **Part 1 — English** (sections 1 – 6) · **Part 2 — 中文版** (§§ A – F)
> 本文分两部分阅读：先看英文（§§ 1–6），中文从下方 §A 开始。

---

# Part 1 · English

### Table of contents (English)

**Install**
1. [Install](#1-install)

**Use OCN**
2. [First 5 minutes (DISCOVERY → SPEC walkthrough)](#2-first-5-minutes-discovery--spec-walkthrough)
3. [Expected file tree after init](#3-expected-file-tree-after-init)

**Reference**
4. [Common errors](#4-common-errors)
5. [Wiring `ocn-mcp` into a host](#5-wiring-ocn-mcp-into-a-host)
6. [Where to go next](#6-where-to-go-next)

---

## 1. Install

### 1.1 Recommended — install from npm

```bash
npm install -g o-coding-navigation
```

As of v0.2.0-beta.1, npm latest and beta both point to the SOP 0.2.0 Plan → Build → Verify release.

Then verify both binaries are on your PATH:

```bash
ocn --version       # 0.2.0-beta.1
ocn --help
ocn-mcp             # starts the MCP stdio server; press Ctrl+C to exit
```

Use @beta when you want to pin the prerelease channel explicitly:

```bash
npm install -g o-coding-navigation@beta
```

The MCP server binary `ocn-mcp` is published. Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

To uninstall: `npm uninstall -g o-coding-navigation`.

**Prerequisites**: Node.js ≥ 20.

Current npm dist-tags: `latest = 0.2.0-beta.1`, `beta = 0.2.0-beta.1`, `alpha = 0.1.0-alpha.2` (historical; preserved).

### 1.2 Alternative — local development from source

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

## 2. First 5 minutes (DISCOVERY → SPEC walkthrough)

### 2.1 Init

```bash
mkdir ocn-demo && cd ocn-demo
ocn init
ocn status
```

Expected: `currentStateId: state_discovery`, `currentStepId: step_project_brief`. The first step in the SOP map is `step_project_brief`, whose artifact slot is `docs/00-project-brief.md`.

### 2.2 Create the first artifact

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

### 2.3 Gate, then advance

```bash
ocn gate              # read-only — confirms the artifact passes
ocn advance           # gate + state mutation + audit trail
ocn status            # state_discovery / step_scope
```

If the gate is blocked, `gate` and `advance` both report a bilingual list of missing sections and exit non-zero. `advance` never mutates state on a blocked gate.

### 2.4 Repeat through SPEC

```bash
ocn doc create scope        # docs/01-scope.md
# fill: In Scope, Out of Scope, Technical Constraints, Completion Boundary
ocn advance                 # → state_spec / step_prd

ocn doc create prd          # docs/02-prd.md
# fill: Problem, Goals, Users, Scenarios, Requirements
ocn advance                 # → state_spec / step_acceptance_criteria
```

### 2.5 Read the audit trail

```bash
cat .ocoding/audit/audit-events.jsonl | head
cat docs/22-audit-trail.md | head -50
```

Every command above contributed events. The full advance chain shares a `correlationId`, so you can grep for one ULID and reconstruct the entire transition.

### 2.6 Brief an AI agent

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

## 4. Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_IO_OR_CONFIG: project not initialized` | Running a command before `ocn init`. | `ocn init` first. |
| `ERR_GATE_FAILED` from `ocn check` / `ocn gate` / `ocn advance` | Current artifact is missing a required section. | Read the bilingual `missingRequiredSectionIds` list and add those headings. |
| `ERR_STATE_MACHINE` from `ocn advance` | Already at the last wired step (DISCOVERY → PLAN have steps; BUILD onward have state IDs only). | This is expected once you reach the end of the wired step map. Future PRs will wire BUILD/VERIFY/SHIP/REFLECT steps. |
| `ERR_ARTIFACT_INVALID` from `ocn doc create <type>` | `<type>` is not one of the 5 supported. | Pick from `project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`. |
| `ERR_IO_OR_CONFIG: lock acquire timeout` | A previous `ocn advance` was killed mid-write and the lock is stale. | Wait 30 s for the stale-recovery path to fire automatically, or inspect `.ocoding/.lock` — if its PID is not running, it is safe to delete. |
| `ocn-mcp` writes nothing on stderr but the host shows nothing happening | MCP stdio is silent on the success path by design (audit fallback uses a silent logger). | Use the host's tool-list view to confirm 7 tools loaded. |
| `ocn` not found after `npm install -g …` | Global npm bin not on `PATH`. | `echo $(npm prefix -g)/bin` and add to `PATH`. |
| `ocn --version` does not show `0.2.0-beta.1` | Installed an older cached version. | Re-install: `npm install -g o-coding-navigation@latest`, or pin the prerelease explicitly with `npm install -g o-coding-navigation@beta`. |
| Claude Desktop does not show OCN tools after editing the config | Config edits require a clean restart. | Fully quit Claude Desktop (system tray included) and reopen. Confirm 7 `navigator.*` tools appear. |

If you suspect a real bug, run with `--json` to capture the full `CommandResult` envelope and file an issue with that JSON.

---

## 5. Wiring `ocn-mcp` into a host

> **Validated path**: Claude Desktop on Windows with WSL2 (DEC-017 / [`reports/2026-04-30-mcp-external-host-validation-report.md`](./reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline are **not yet verified** (DEC-019).

### 5.1 Validated path: Claude Desktop on Windows + WSL2

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

### 5.2 Native (non-WSL) host on Linux / macOS

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

---

## 6. Where to go next

- [README §6](../README.md#6-core-cli-commands) — full CLI reference table.
- [README §7](../README.md#7-mcp-tools) — MCP allowed/forbidden surface summary.
- [`docs/mcp-usage.md`](./mcp-usage.md) — MCP host wiring + safety boundaries.
- [`docs/00-project-brief.md`](./00-project-brief.md) Appendix A — the full SOP step map.
- [`docs/20-decision-log.md`](./20-decision-log.md) — DEC-001 through the present.
- [`docs/amendments/README.md`](./amendments/README.md) — active divergences from the frozen design baseline.

---

# Part 2 · 中文版

> 这是 [`README.md`](../README.md) 的配套文档。先看 README 了解 OCN 是什么、为什么存在；本文聚焦"怎么用"。

### 中文目录

**安装**
- §A. [安装](#a-安装)

**使用 OCN**
- §B. [5 分钟上手（DISCOVERY → SPEC 演练）](#b-5-分钟上手discovery--spec-演练)
- §C. [`ocn init` 后的预期文件树](#c-ocn-init-后的预期文件树)

**参考资料**
- §D. [常见报错](#d-常见报错)
- §E. [把 `ocn-mcp` 接入 MCP Host](#e-把-ocn-mcp-接入-mcp-host)
- §F. [接下来去哪](#f-接下来去哪)

---

## A. 安装

### A.1 推荐——从 npm 安装

```bash
npm install -g o-coding-navigation
```

从 v0.2.0-beta.1 开始，npm latest 与 beta 均指向 SOP 0.2.0 的 Plan → Build → Verify 闭环版本。

安装后验证两个二进制都在 `PATH` 上：

```bash
ocn --version       # 0.2.0-beta.1
ocn --help
ocn-mcp             # 启动 MCP stdio server；按 Ctrl+C 退出（stdin EOF 时也会自动退出）
```

如果希望明确固定在 beta 预发布通道，可以使用 @beta：

```bash
npm install -g o-coding-navigation@beta
```

`ocn-mcp` 已发布。已在 Claude Desktop on Windows + WSL2 验证。Cursor 与 Cline 暂未验证。

卸载：`npm uninstall -g o-coding-navigation`。

**前置依赖**：Node.js ≥ 20。

当前 npm dist-tag：`latest = 0.2.0-beta.1`、`beta = 0.2.0-beta.1`、`alpha = 0.1.0-alpha.2`（历史保留）。

### A.2 备选——从源码本地开发

如果你在开发 OCN 本身，用源码 checkout。这是贡献者路径，不是用户路径。

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link
```

验证：

```bash
ocn --version
ocn-mcp
```

卸载本地链接：`cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`。

---

## B. 5 分钟上手（DISCOVERY → SPEC 演练）

### B.1 初始化

```bash
mkdir ocn-demo && cd ocn-demo
ocn init
ocn status
```

预期：`currentStateId: state_discovery`、`currentStepId: step_project_brief`。SOP 映射里的第一个 step 是 `step_project_brief`，对应产物路径为 `docs/00-project-brief.md`。

### B.2 创建第一个产物

```bash
ocn doc create project-brief
```

会用内置双语模板写出 `docs/00-project-brief.md`。打开它，把 4 个必填章节填好：

```
# Problem｜问题
…描述问题…

# Goal｜目标
…描述目标…

# Users｜用户
…描述目标用户…

# Success Criteria｜成功标准
…描述什么算成功…
```

章节名匹配在 NFKC 标准化之后大小写不敏感，所以 `Problem` ≡ `problem` ≡ `Problem｜问题` ≡ `Problem | 问题`。

### B.3 跑门禁，再推进

```bash
ocn gate              # 只读——确认产物通过
ocn advance           # 跑门禁 + 改状态 + 写审计链
ocn status            # state_discovery / step_scope
```

如果门禁未通过，`gate` 和 `advance` 都会输出双语的缺失章节列表并以非零码退出。门禁未通过时 `advance` 不会改任何状态。

### B.4 继续推进到 SPEC

```bash
ocn doc create scope        # docs/01-scope.md
# 填：In Scope, Out of Scope, Technical Constraints, Completion Boundary
ocn advance                 # → state_spec / step_prd

ocn doc create prd          # docs/02-prd.md
# 填：Problem, Goals, Users, Scenarios, Requirements
ocn advance                 # → state_spec / step_acceptance_criteria
```

### B.5 阅读审计链

```bash
cat .ocoding/audit/audit-events.jsonl | head
cat docs/22-audit-trail.md | head -50
```

上面每条命令都贡献了事件。完整的 advance 事件链共享同一个 `correlationId`——只要 grep 一个 ULID 就能拼出整次状态推进。

### B.6 给 AI agent 输出 brief

```bash
ocn brief
```

输出当前 step 的必填章节、AI 治理提醒和不确定性策略。把它直接喂给你的 AI 编程 host，agent 就能在完整上下文里继续工作。

---

## C. `ocn init` 后的预期文件树

```
ocn-demo/
├── .ocoding/
│   ├── state.json                       ← 机器侧的唯一权威（带锁、原子写）
│   ├── state.json.bak                   ← 滚动备份
│   ├── sop.yaml                         ← 内置 SOP profile 的快照
│   ├── gates.yaml
│   ├── config.yaml
│   ├── .lock                            ← 仅在写入过程中存在
│   └── audit/
│       └── audit-events.jsonl           ← 机器审计日志（append-only JSONL）
└── docs/
    └── 22-audit-trail.md                ← 人类可读的审计叙事（首次事件后才会创建）
```

`doc create project-brief` 之后还会出现 `docs/00-project-brief.md`。推进过 SCOPE 后会出现 `docs/01-scope.md`，过 SPEC 后是 `docs/02-prd.md`，依此类推（详见 [`docs/00-project-brief.md` 附录 A](./00-project-brief.md)）。

---

## D. 常见报错

| 现象 | 原因 | 解决 |
|---|---|---|
| `ERR_IO_OR_CONFIG: project not initialized` | 在 `ocn init` 之前就跑了别的命令。 | 先 `ocn init`。 |
| `ocn check` / `ocn gate` / `ocn advance` 抛 `ERR_GATE_FAILED` | 当前产物缺必填章节。 | 看双语 `missingRequiredSectionIds` 列表，把缺的章节标题补上。 |
| `ocn advance` 抛 `ERR_STATE_MACHINE` | 已到达"被挂上 step 的最后一步"（DISCOVERY → PLAN 有 step；BUILD 之后只有 state ID）。 | 这是预期行为。后续 PR 才会给 BUILD/VERIFY/SHIP/REFLECT 加 step。 |
| `ocn doc create <type>` 抛 `ERR_ARTIFACT_INVALID` | `<type>` 不在 5 类之内。 | 选 `project-brief`、`scope`、`prd`、`acceptance-criteria`、`technical-architecture`。 |
| `ERR_IO_OR_CONFIG: lock acquire timeout` | 上一次 `ocn advance` 中途被杀，锁残留。 | 等 30 秒等陈旧锁回收触发，或检查 `.ocoding/.lock`——里面的 PID 已经不在跑就可以删。 |
| `ocn-mcp` stderr 一片空，但 host 也没动静 | MCP stdio 在成功路径上**故意**安静（audit fallback 走 silent logger）。 | 看 host 的 tools 面板，确认 7 个工具加载成功。 |
| `npm install -g …` 之后 `ocn` 找不到 | npm 全局 bin 不在 `PATH` 上。 | `echo $(npm prefix -g)/bin`，把它加进 `PATH`。 |
| `ocn --version` 不是 `0.2.0-beta.1` | 安装到了旧的缓存版本。 | 重新安装：`npm install -g o-coding-navigation@latest`，或显式固定预发布通道：`npm install -g o-coding-navigation@beta`。 |
| 改完配置但 Claude Desktop 看不到 OCN 工具 | 配置改动需要一次干净的重启。 | **完全退出** Claude Desktop（含系统托盘）再重启，确认看到 7 个 `navigator.*` 工具。 |

如果你怀疑是真 bug，加 `--json` 把完整 `CommandResult` envelope 抓下来，附在 issue 里。

---

## E. 把 `ocn-mcp` 接入 MCP Host

> **唯一已验证的路径**：Claude Desktop on Windows + WSL2（[DEC-017](./20-decision-log.md) / [`reports/2026-04-30-mcp-external-host-validation-report.md`](./reports/2026-04-30-mcp-external-host-validation-report.md)）。Cursor 与 Cline **尚未验证**（[DEC-019](./20-decision-log.md)）。

### E.1 已验证路径：Windows + WSL2 中的 Claude Desktop

在 `%APPDATA%\Claude\claude_desktop_config.json` 中加入：

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

如果 WSL2 里 `ocn-mcp` 不在 `PATH`，把 `"ocn-mcp"` 替换成 `which ocn-mcp` 给出的绝对路径（通常是 `/home/<user>/.npm-global/bin/ocn-mcp`）。

改完配置后**完全退出** Claude Desktop（含系统托盘）再重启。[`docs/mcp-usage.md`](./mcp-usage.md) §2 中列的 7 个 `navigator.*` 工具应当出现在工具面板中。4 个被禁工具（`navigator.advance_phase`、`navigator.capture_decision`、`navigator.reset_project`、`navigator.force_release_lock`）**不应**出现——这条边界由 `tests/unit/mcp-tool-registry.test.ts` 守住。

### E.2 Linux / macOS 上的原生 Host（非 WSL）

如果你在 Linux/macOS 原生跑某个 Host（不走 WSL2），且 `ocn-mcp` 在 `PATH` 上：

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

这条原生路径**没有**做端到端的真实 Host 验证——只验证过 WSL2 那条。在它有自己的验证报告之前，请把它当作"看起来可行但未验证"的状态。

每个工具调用都需要一个绝对的 `projectRoot` 参数（host 或你的 prompt 提供）；OCN 自身是项目无关的。

---

## F. 接下来去哪

- [README §6](../README.md#6-core-cli-commands) ——完整 CLI 参考表。
- [README §7](../README.md#7-mcp-tools) ——MCP 允许/禁止工具面摘要。
- [`docs/mcp-usage.md`](./mcp-usage.md) ——MCP host 接入与安全边界。
- [`docs/00-project-brief.md`](./00-project-brief.md) 附录 A ——完整 SOP step 映射。
- [`docs/20-decision-log.md`](./20-decision-log.md) ——DEC-001 至今。
- [`docs/amendments/README.md`](./amendments/README.md) ——基于冻结设计基线的活动偏离。
