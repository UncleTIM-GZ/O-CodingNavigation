# OCN MCP Server Usage｜OCN MCP 服务用法

> Companion to PR #5 — MCP Safe Tools.
> Plan: `docs/plans/2026-04-28-feat-ocn-phase2-mcp-safe-tools-plan.md`.
> 这是 PR #5（MCP Safe Tools）的配套用法文档。

> 📑 This document has two parts:
> **Part 1 — English** (sections 1 – 8) · **Part 2 — 中文版** (§§ A – H)
> 本文分两部分阅读：先看英文（§§ 1–8），中文从下方 §A 开始。

OCN ships a Model Context Protocol (MCP) server that exposes a curated, **read-and-create** subset of the navigator surface. The server speaks the **stdio transport** of MCP and is intended to be wired into an MCP-aware IDE/agent host.

OCN 自带一个 MCP（Model Context Protocol）server，对外暴露一个**只读 + 创建**的导航器子集。Server 走 MCP 的 **stdio** 传输，用于接入 MCP-aware 的 IDE/agent host。

---

# Part 1 · English

### Table of contents (English)

**Set up**
1. [Start the server](#1-start-the-server)

**Tool surface**
2. [Allowed tools (7)](#2-allowed-tools-7)
3. [Forbidden tools (NEVER exposed)](#3-forbidden-tools-never-exposed)

**Operating contract**
4. [Audit emission via MCP](#4-audit-emission-via-mcp)
5. [Operational guarantees](#5-operational-guarantees)
6. [Safety boundaries and operating rules](#6-safety-boundaries-and-operating-rules)

**Reference**
7. [Troubleshooting](#7-troubleshooting)
8. [Roadmap](#8-roadmap)

---

## 1. Start the server

Install OCN globally from npm:

```bash
npm install -g o-coding-navigation
```

As of v0.2.0-beta.2, npm latest and beta both point to the SOP 0.2.0 Plan → Build → Verify release. Use @beta when you want to pin the prerelease channel explicitly:

```bash
npm install -g o-coding-navigation@beta
```

After install (or after `npm install` + `npm run build` from a source checkout):

```bash
# Inside any OCN-initialized project (must contain `.ocoding/`)
ocn-mcp
```

Or via `npx` from a checked-out repo:

```bash
npx ocn-mcp
```

Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

The process speaks JSON-RPC 2.0 over stdin/stdout per the MCP stdio framing. Stderr is reserved for protocol notifications — **OCN guarantees zero application stderr writes on the success path** (audit fallback messages are routed to a silent logger; see PR #5 §11.5).

### 1.1 Wire into Claude Desktop on Windows + WSL2 (validated path)

Edit `%APPDATA%\Claude\claude_desktop_config.json` and add:

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

If `ocn-mcp` is not on the WSL2 `PATH`, replace `"ocn-mcp"` with the absolute path printed by `which ocn-mcp` inside WSL2 (typically `/home/<user>/.npm-global/bin/ocn-mcp`). Save, fully quit Claude Desktop (system tray included), and reopen — the seven `navigator.*` tools should appear in the tools panel.

### 1.2 Native (non-WSL) host on Linux / macOS

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

Every tool requires an absolute `projectRoot` argument (the path to an OCN-initialized project). The server itself is project-agnostic; one MCP server can serve any number of OCN projects sequentially.

> MCP Host validation completed for Claude Desktop on Windows with WSL2 (per
> [DEC-017](./20-decision-log.md) and the validation report at
> [`reports/2026-04-30-mcp-external-host-validation-report.md`](./reports/2026-04-30-mcp-external-host-validation-report.md)).
> Cursor and Cline remain **unverified** in this release — treat the server
> contract as observed working in Claude Desktop but not yet confirmed in
> other MCP Hosts.

### 1.3 Project root must be initialized

All seven OCN MCP tools require `projectRoot` to point to an **initialized OCN project**. A directory is considered initialized when:

1. `<projectRoot>/.ocoding/state.json` exists, and
2. that file is valid JSON, and
3. it validates against the `ProjectState` schema.

If the directory is not initialized, every MCP tool returns a structured envelope without performing any side effect (no `docs/` directory is created, no `.ocoding/` directory is created, no audit event is written, no lock is acquired). The envelope shape is:

```jsonc
{
  "ok": false,
  "code": "ERR_IO_OR_CONFIG",
  "message": {
    "en": "projectRoot is not an initialized OCN project. Run `ocn init` first.",
    "zh": "projectRoot 不是已初始化的 OCN 项目。请先运行 `ocn init`。"
  },
  "data": {
    "reason": "state-json-missing"
    // or "state-json-malformed" / "state-json-schema-invalid" / "invalid-project-root"
  }
}
```

To make a directory usable as `projectRoot`, run:

```bash
ocn init
```

inside that directory before calling any MCP tool. This contract closes P1-001 from the post-alpha Codex audit (see [`docs/reports/2026-04-30-post-alpha-codex-audit.md`](./reports/2026-04-30-post-alpha-codex-audit.md)).

---

## 2. Allowed tools (7)

All tools return a structured `MCPToolResult` envelope:

```ts
type MCPToolResult<T> =
  | { ok: true;  code: "OK";   message: { en: string; zh: string }; data: T }
  | { ok: false; code: string; message: { en: string; zh: string }; error: { code: string; en: string; zh: string } };
```

`code` values map 1:1 to OCN's CLI error codes (`OK`, `ERR_GATE_FAILED`, `ERR_ARTIFACT_INVALID`, `ERR_STATE_MACHINE`, `ERR_IO_OR_CONFIG`, `ERR_SOP_VERSION`). Invalid tool input (zod parse failure, missing / malformed `projectRoot`) is surfaced through the same envelope using one of these codes — most commonly `ERR_IO_OR_CONFIG` for `projectRoot` validation failures and `ERR_ARTIFACT_INVALID` for malformed tool arguments. There is no separate `ERR_VALIDATION` code in the shipped enum.

### 2.1 Tool table

| # | Tool | Purpose | Mutates state? | Mutates filesystem? |
|---|------|---------|----------------|---------------------|
| 1 | `navigator.where_am_i` | Snapshot of current state (project info, current state id, current step id, current artifact path, next-action hint) | No | No |
| 2 | `navigator.brief` | Render a next-step brief for the current step | No | No |
| 3 | `navigator.run_gate` | Aggregate the artifact gate for the current step (read-only — does NOT advance) | No | Audit only |
| 4 | `navigator.create_artifact` | Create a doc from the 5-type template registry (`project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`) | No (state) | Yes (writes the doc + audit) |
| 5 | `navigator.capture_log` | Append to `docs/19-dev-log.md` (`type=dev`) or `docs/18-research-log.md` (`type=research`). **`type=decision` is hard-rejected** — see §3 | No | Yes (log file + audit) |
| 6 | `navigator.detect_sop_version` | Compare project-locked SOP profile against bundled OCN SOP; returns drift status | No | No |
| 7 | `navigator.generate_next_prompt` | Returns required sections + AI governance reminder + uncertainty policy + self-check rule for the current step | No | No |

### 2.2 Input envelopes (zod-validated)

```ts
// 1, 2, 3, 6, 7 — same shape
{ projectRoot: string }

// 4
{ projectRoot: string;
  artifactType: "project-brief" | "scope" | "prd" | "acceptance-criteria" | "technical-architecture" }

// 5
{ projectRoot: string; type: "dev" | "research" | "decision"; message: string }
```

Invalid input never throws — the handler returns a structured `MCPToolResult` envelope with `ok=false` and one of the shipped error codes (typically `ERR_IO_OR_CONFIG` for `projectRoot` validation failures and `ERR_ARTIFACT_INVALID` for other malformed tool arguments). Both `message` and `error` carry bilingual `en` / `zh` strings.

---

## 3. Forbidden tools (NEVER exposed)

The MCP server intentionally refuses to expose four high-blast-radius operations. They are reserved for human-driven CLI invocation:

| Forbidden tool | Why kept off MCP |
|----------------|------------------|
| `navigator.advance_phase` | State advancement is the navigator's most consequential mutation. Phase forward is a deliberate human signal — not a tool the LLM should call autonomously. |
| `navigator.capture_decision` | Decisions are governance artifacts. They must reflect human intent, not LLM convenience. The exposed `capture_log` tool **hard-rejects** `type=decision` with `ERR_GATE_FAILED`. |
| `navigator.reset_project` | Destructive. Twice-confirm flow is human-only. |
| `navigator.force_release_lock` | Bypasses state-safety invariants. Operator-only escape hatch. |

The forbidden list is enforced by `tests/unit/mcp-tool-registry.test.ts` — the test will fail if any of these names ever appear in `ALLOWED_TOOL_NAMES`.

---

## 4. Audit emission via MCP

Every tool that mutates the filesystem emits an `artifact_created` event into the dual-track audit trail (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`). `navigator.run_gate` emits `artifact_gate_run` + `artifact_gate_passed`/`artifact_gate_blocked`. No tool emits `advance_*` / `state_transitioned` (those are exclusive to the CLI's `ocn advance`).

If audit writes fail (disk full, permissions), the failure is routed to the configured `AuditFallbackLogger`. The MCP server installs `silentAuditFallbackLogger` at boot to keep stdio framing clean — meaning **audit-fallback warnings are dropped on the floor in MCP mode**. The CLI continues to use `stderrAuditFallbackLogger` (PR #4 behaviour).

If you need to surface audit-fallback warnings in your MCP host, set a custom logger via `setAuditFallbackLogger(...)` after constructing the server (advanced usage; see `src/core/audit/audit-logger.ts`).

---

## 5. Operational guarantees

1. **No tool ever throws across the MCP boundary.** All handlers return a `MCPToolResult` envelope.
2. **No tool ever advances `state.json`.** Read-only tools don't acquire the OCN `.ocoding/.lock`; the OCN state lock is reserved for `state.json` mutation, which only the CLI `ocn advance` flow performs. Mutating MCP tools (`create_artifact`, `capture_log`) write to `docs/` only, using filesystem-level atomicity primitives instead of the OCN state lock: `create_artifact` performs an atomic exclusive create (`O_EXCL`) when `overwrite=false` and a tmp-file + atomic `rename(2)` when `overwrite=true`; `capture_log` materialises the markdown header via an atomic link-into-place dance and appends each entry with a single `O_APPEND` write that the kernel serialises atomically.
3. **No tool ever advances state.** `navigator.advance_phase` is not registered; `navigator.run_gate` is read-only by construction.
4. **Bilingual messages everywhere.** Every `code` carries an `en` + `zh` string.
5. **Stable IDs.** Every state, step, section, and artifact ID is a stable string (`state_*`, `step_*`, `section_*`, `artifact_*`) — no numeric pointer leakage.
6. **`projectRoot` is validated at the boundary** (PR C). The validator rejects non-strings, empty strings, null bytes, relative paths, missing paths, and non-directories before any core fn runs. Symlinks are resolved to canonical realpath, and downstream file operations are anchored to that realpath. See [`docs/security/mcp-threat-model.md`](./security/mcp-threat-model.md) §4 for the full threat list.
7. **`projectRoot` must be an initialized OCN project** (P1-001). Every MCP tool — read-only and mutating — refuses to act on a directory that does not contain a valid `.ocoding/state.json`. Mutating tools never create `docs/` or `.ocoding/` as a side effect of a rejected call.

---

## 6. Safety boundaries and operating rules

Read this before wiring `ocn-mcp` into any host:

- **`projectRoot` must be an absolute path to a local project directory.** Relative paths, empty strings, and paths that resolve to a regular file are rejected with `ERR_IO_OR_CONFIG` and a bilingual message. The validator returns the canonical realpath; subsequent core fns operate on that, not on the user-supplied alias.
- **OCN MCP tools only ever operate inside `<projectRoot>/.ocoding/` and `<projectRoot>/docs/`.** No tool accepts a free-form path argument from the agent. Path-influencing inputs (`artifactType`, `type`) are constrained to small enums.
- **Do NOT expose `ocn-mcp` to a remote, untrusted host.** Today's transport is local stdio only. There is no auth, no rate limiting, no sandbox. The trust boundary is the OS user account.
- **The 4 forbidden tools do not exist on this server**: `navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, `navigator.force_release_lock`. Attempting to call them returns a host-level "tool not found" error. State advancement, decision capture, project reset, and force-release-lock remain CLI-only and human-driven.
- **An MCP agent CANNOT** advance state, capture decisions, reset the project, or force-release the lock. It CAN read state, render the next-step brief, prepare artifacts, run the read-only gate, create from the 5-type template registry, and capture `dev` / `research` logs.
- **No authentication** is performed on the local stdio channel. Whatever process the OS user has launched as the MCP host has full access to the 7 allowed tools.
- **No rate limiting**. Repeated tool calls are allowed; each is cheap and idempotent for the read-only tools.
- **No sandboxing**. `ocn-mcp` runs with the user's OS permissions. Files outside the validated `projectRoot` are off-limits by construction (no tool has a path argument to escape via), but a compromised host could still call legitimate tools many times.
- **stdio cleanliness**: `ocn-mcp` installs `silentAuditFallbackLogger` at boot. The stdout/stderr channels stay reserved for the JSON-RPC protocol; tests verify that `where_am_i` produces zero `process.stderr.write` calls on the success path.

For the full threat model (in-scope assets, threats T-1 through T-11, mitigations, residual risks, future work), see [`docs/security/mcp-threat-model.md`](./security/mcp-threat-model.md).

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ERR_IO_OR_CONFIG: projectRoot must be an absolute path` | Relative path supplied | Pass an absolute path. |
| `ERR_IO_OR_CONFIG: projectRoot does not exist` | Path is missing or typo'd | Verify the path exists on disk. |
| `ERR_IO_OR_CONFIG: projectRoot is not a directory` | Path points to a file | Pass a directory. |
| `ERR_IO_OR_CONFIG: projectRoot must not contain null bytes` | Null-byte injection rejected | Sanitise the input on the host side. |
| `ERR_IO_OR_CONFIG: ENOENT .ocoding/state.json` | Project not initialised at `projectRoot` | Run `ocn init` in that directory first. |
| `ERR_GATE_FAILED` from `capture_log` with `type=decision` | This is **expected behaviour** — decisions are CLI-only | Use the OCN CLI to capture decisions. |
| `ERR_STATE_MACHINE: no template for current step` | Tool called before SOP profile knows the current step | Run `ocn advance` from the CLI to land at a supported step. |
| MCP host complains about JSON parse errors on stderr | Audit fallback was misconfigured | Verify `silentAuditFallbackLogger` is installed (default in `createMcpServer`). |

---

## 8. Roadmap

PR #5 is the minimum safe surface. Future PRs may add:

- HTTP / SSE transport (for browser-side MCP hosts)
- Streaming progress notifications for long gate runs
- Per-project audit-fallback log injection
- A read-only `navigator.audit_trail` tool that returns recent events

State-advancement, decision-capture, reset, and force-release-lock will **never** be exposed via MCP.

---

# Part 2 · 中文版

### 中文目录

**部署**
- §A. [启动 server](#a-启动-server)

**工具面**
- §B. [允许的 7 个工具](#b-允许的-7-个工具)
- §C. [禁用的 4 个工具——绝不暴露](#c-禁用的-4-个工具绝不暴露)

**运行契约**
- §D. [MCP 中的审计输出](#d-mcp-中的审计输出)
- §E. [运行保证](#e-运行保证)
- §F. [安全边界与操作规则](#f-安全边界与操作规则)

**参考资料**
- §G. [排错](#g-排错)
- §H. [路线图](#h-路线图)

---

## A. 启动 server

从 npm 全局安装 OCN：

```bash
npm install -g o-coding-navigation
```

从 v0.2.0-beta.2 开始，npm latest 与 beta 均指向 SOP 0.2.0 的 Plan → Build → Verify 闭环版本。如果希望明确固定在 beta 预发布通道，可以使用 @beta：

```bash
npm install -g o-coding-navigation@beta
```

安装后（或源码 checkout 中跑过 `npm install` + `npm run build` 之后）：

```bash
# 在已初始化的 OCN 项目内（必须含 `.ocoding/`）
ocn-mcp
```

或者在 checkout 出来的 repo 里：

```bash
npx ocn-mcp
```

已在 Claude Desktop on Windows + WSL2 验证。Cursor 与 Cline 暂未验证。

该进程通过 stdin/stdout 走 JSON-RPC 2.0（按 MCP stdio framing）。stderr 留给协议通知——**OCN 保证成功路径上没有任何应用层 stderr 写入**（audit fallback 走 silent logger，详见 PR #5 §11.5）。

### A.1 接入 Windows + WSL2 中的 Claude Desktop（已验证路径）

编辑 `%APPDATA%\Claude\claude_desktop_config.json`，加入：

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

如果 WSL2 里 `ocn-mcp` 不在 `PATH`，把 `"ocn-mcp"` 替换成 `which ocn-mcp` 给出的绝对路径（通常是 `/home/<user>/.npm-global/bin/ocn-mcp`）。保存、**完全退出** Claude Desktop（含系统托盘）再重启，工具面板里应当看到 7 个 `navigator.*` 工具。

### A.2 Linux / macOS 上的原生 Host（非 WSL）

如果你在 Linux/macOS 原生跑 host（不走 WSL2），且 `ocn-mcp` 在 `PATH` 上：

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

每个工具调用都需要绝对路径的 `projectRoot` 参数（指向已初始化的 OCN 项目）。Server 自身是项目无关的；同一个 MCP server 可以串行服务任意多个 OCN 项目。

> 当前真实验证通过的 MCP Host 是 **Windows Claude Desktop**（[DEC-017](./20-decision-log.md)、[报告](./reports/2026-04-30-mcp-external-host-validation-report.md)）。
> Cursor 与 Cline 暂未完成验证，不能声明兼容；每个 Host 都需要独立的真实 Host 验证报告（DEC-017 模式）才能加入支持声明。

### A.3 projectRoot 必须已初始化

所有 7 个 OCN MCP 工具都要求 `projectRoot` 指向一个**已初始化的 OCN 项目**。一个目录被认为已初始化，当且仅当：

1. `<projectRoot>/.ocoding/state.json` 存在；
2. 且该文件是合法 JSON；
3. 且通过 `ProjectState` schema 校验。

如果目录未初始化，所有 MCP 工具都会返回结构化 envelope，**不**会做任何副作用：不会创建 `docs/`、不会创建 `.ocoding/`、不写 audit、不获取锁。Envelope 形如：

```jsonc
{
  "ok": false,
  "code": "ERR_IO_OR_CONFIG",
  "message": {
    "en": "projectRoot is not an initialized OCN project. Run `ocn init` first.",
    "zh": "projectRoot 不是已初始化的 OCN 项目。请先运行 `ocn init`。"
  },
  "data": {
    "reason": "state-json-missing"
    // 或 "state-json-malformed" / "state-json-schema-invalid" / "invalid-project-root"
  }
}
```

要让某目录可作为 `projectRoot`，先在该目录里跑：

```bash
ocn init
```

这条契约关闭了 post-alpha Codex 审计中的 P1-001（[报告](./reports/2026-04-30-post-alpha-codex-audit.md)）。

---

## B. 允许的 7 个工具

所有工具返回结构化 `MCPToolResult` envelope：

```ts
type MCPToolResult<T> =
  | { ok: true;  code: "OK";   message: { en: string; zh: string }; data: T }
  | { ok: false; code: string; message: { en: string; zh: string }; error: { code: string; en: string; zh: string } };
```

`code` 与 OCN 的 CLI 错误码 1:1 对齐：`OK`、`ERR_GATE_FAILED`、`ERR_ARTIFACT_INVALID`、`ERR_STATE_MACHINE`、`ERR_IO_OR_CONFIG`、`ERR_SOP_VERSION`。非法工具输入（zod parse 失败、`projectRoot` 缺失或非法）也走同一个 envelope，使用上述错误码——`projectRoot` 校验失败通常是 `ERR_IO_OR_CONFIG`，其它工具参数畸形通常是 `ERR_ARTIFACT_INVALID`。**当前 enum 中没有单独的 `ERR_VALIDATION` 码。**

### B.1 工具表

| # | 工具 | 用途 | 是否改 state？ | 是否改文件系统？ |
|---|------|------|---------------|----------------|
| 1 | `navigator.where_am_i` | 当前状态快照（项目信息、当前 state id、当前 step id、当前产物路径、下一步动作提示） | 否 | 否 |
| 2 | `navigator.brief` | 渲染当前 step 的 brief | 否 | 否 |
| 3 | `navigator.run_gate` | 当前 step 的产物门禁聚合（只读，不推进） | 否 | 仅审计 |
| 4 | `navigator.create_artifact` | 用 5 类模板创建产物（`project-brief`、`scope`、`prd`、`acceptance-criteria`、`technical-architecture`） | 否（state） | 是（写产物 + 审计） |
| 5 | `navigator.capture_log` | 追加到 `docs/19-dev-log.md`（`type=dev`）或 `docs/18-research-log.md`（`type=research`）。**`type=decision` 强拒**——见 §C | 否 | 是（日志文件 + 审计） |
| 6 | `navigator.detect_sop_version` | 比较项目锁定的 SOP profile 与内置 OCN SOP，返回漂移状态 | 否 | 否 |
| 7 | `navigator.generate_next_prompt` | 当前 step 的必填章节 + AI 治理提醒 + 不确定性策略 + 自检规则 | 否 | 否 |

> 在已验证 Host（Windows Claude Desktop + WSL2）的工具面板中应当看到上面 7 个 `navigator.*` 工具。任何工具调用都需要绝对路径的 `projectRoot` 参数；如果目录未 `ocn init`，工具会返回 `ERR_IO_OR_CONFIG` 结构化错误，不会写入任何文件、不会获取锁、不会写 audit。

### B.2 输入 envelope（zod 校验）

```ts
// 1, 2, 3, 6, 7 ——同一形状
{ projectRoot: string }

// 4
{ projectRoot: string;
  artifactType: "project-brief" | "scope" | "prd" | "acceptance-criteria" | "technical-architecture" }

// 5
{ projectRoot: string; type: "dev" | "research" | "decision"; message: string }
```

非法输入永不抛错——handler 一律返回结构化 `MCPToolResult` envelope，`ok=false`，错误码取自上面的 enum（`projectRoot` 校验通常是 `ERR_IO_OR_CONFIG`，其它工具参数畸形通常是 `ERR_ARTIFACT_INVALID`）。`message` 与 `error` 都带双语 `en` / `zh` 字符串。

---

## C. 禁用的 4 个工具——绝不暴露

MCP server 故意拒绝暴露 4 个高风险操作。它们仅供人类通过 CLI 触发：

| 禁用工具 | 为什么不暴露在 MCP |
|---------|-------------------|
| `navigator.advance_phase` | 状态推进是导航器最严重的变更。Phase forward 必须是人类的明确信号——不能由 LLM 自主调用。 |
| `navigator.capture_decision` | 决策是治理产物，必须反映人的意图，而非 LLM 的方便。MCP 上的 `capture_log` 已硬拒 `type=decision` 并返回 `ERR_GATE_FAILED`。 |
| `navigator.reset_project` | 破坏性操作，二次确认流程仅人类执行。 |
| `navigator.force_release_lock` | 会绕过状态安全不变量，仅运维使用。 |

禁用清单由 `tests/unit/mcp-tool-registry.test.ts` 守住——只要其中任一名字出现在 `ALLOWED_TOOL_NAMES` 中，测试就会失败。

> 上面 4 个工具**绝不会**出现在 MCP Host 工具面板中。如果你的 host 工具面板里出现其中任何一个名字，立刻停止使用并复查配置——那是错误状态。

---

## D. MCP 中的审计输出

每个改动文件系统的工具都会向双轨审计链（`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`）写入 `artifact_created` 事件。`navigator.run_gate` 写入 `artifact_gate_run` + `artifact_gate_passed`/`artifact_gate_blocked`。**没有**任何 MCP 工具写 `advance_*` / `state_transitioned`（这些只属于 CLI 的 `ocn advance`）。

如果审计写入失败（磁盘满、权限不足），失败被路由给配置好的 `AuditFallbackLogger`。MCP server 在启动时安装的是 `silentAuditFallbackLogger`，以保持 stdio framing 干净——**MCP 模式下 audit-fallback 警告会被静默丢弃**。CLI 仍使用 `stderrAuditFallbackLogger`（PR #4 行为）。

如果你确实需要在 MCP host 中看到 audit-fallback 警告，可以在构造 server 之后调用 `setAuditFallbackLogger(...)` 注入自定义 logger（高级用法，参见 `src/core/audit/audit-logger.ts`）。

---

## E. 运行保证

1. **MCP 边界永不抛错。** 所有 handler 都返回 `MCPToolResult` envelope。
2. **没有任何工具会推进 `state.json`。** 只读工具不获取 OCN `.ocoding/.lock`；OCN state lock 专属于 `state.json` 变更，只由 CLI `ocn advance` 流程使用。修改文件的 MCP 工具（`create_artifact`、`capture_log`）只写 `docs/`，使用文件系统级原子语义而非 OCN state lock：`create_artifact` 在 `overwrite=false` 时用 `O_EXCL` 原子独占创建，在 `overwrite=true` 时用 tmp 文件 + `rename(2)` 原子替换；`capture_log` 用原子 link 操作把 markdown header 放到位，再用单次 `O_APPEND` 写入，由内核串行化原子保证。
3. **没有任何工具会推进 state。** `navigator.advance_phase` 没注册；`navigator.run_gate` 按构造就是只读。
4. **双语消息无处不在。** 每个 `code` 都带 `en` + `zh` 字符串。
5. **稳定 ID。** 每个 state、step、section、artifact ID 都是稳定字符串（`state_*`、`step_*`、`section_*`、`artifact_*`），从不漏出数字指针。
6. **`projectRoot` 在边界处校验**（PR C）。校验器在任何 core fn 跑之前就会拒掉非字符串、空串、null 字节、相对路径、不存在路径、非目录。Symlink 解析为 canonical realpath，下游文件操作锚定该 realpath。完整威胁列表见 [`docs/security/mcp-threat-model.md`](./security/mcp-threat-model.md) §4。
7. **`projectRoot` 必须是已初始化 OCN 项目**（P1-001）。所有 MCP 工具——只读和修改——都会拒绝在 `.ocoding/state.json` 不合法的目录上动作。修改类工具不会因为被拒掉的调用而**附带**创建 `docs/` 或 `.ocoding/`。

---

## F. 安全边界与操作规则

接入 `ocn-mcp` 之前先读这一段：

- **`projectRoot` 必须是绝对路径，指向本地目录。** 相对路径、空串、指向普通文件的路径都会被拒掉，返回 `ERR_IO_OR_CONFIG` 加双语消息。校验器返回 canonical realpath；下游 core fn 操作的是 realpath，不是用户原始字符串。
- **OCN MCP 工具只在 `<projectRoot>/.ocoding/` 与 `<projectRoot>/docs/` 内动作。** 没有任何工具接受来自 agent 的自由路径参数。会影响路径的输入（`artifactType`、`type`）都被约束在小集合 enum 内。
- **不要把 `ocn-mcp` 暴露给远程、不可信 host。** 当前传输只支持本地 stdio，没有鉴权、没有限流、没有沙盒。信任边界就是操作系统用户账户。
- **4 个被禁工具在 server 上根本不存在**：`navigator.advance_phase`、`navigator.capture_decision`、`navigator.reset_project`、`navigator.force_release_lock`。试图调用它们会得到 host 级"tool not found"。状态推进、决策捕获、项目重置、强制释放锁仍然是人类驱动的 CLI 路径。
- **MCP agent 不能**推进状态、记录决策、重置项目、强制释放锁。它**可以**读状态、渲染下一步 brief、准备产物、跑只读门禁、用 5 类模板创建产物、捕获 `dev` / `research` 日志。
- **本地 stdio 通道不做鉴权。** 操作系统用户启动的 host 进程拥有 7 个允许工具的全部访问权。
- **不限流。** 重复调用是允许的；只读工具便宜且幂等。
- **不沙盒。** `ocn-mcp` 以用户的 OS 权限运行。`projectRoot` 之外的文件按构造就够不到（没有任何工具有可逃逸的路径参数），但被攻陷的 host 仍然可以多次调用合法工具。
- **stdio 干净度**：`ocn-mcp` 启动时安装 `silentAuditFallbackLogger`。stdout/stderr 仅留给 JSON-RPC 协议；测试验证 `where_am_i` 在成功路径上零次调用 `process.stderr.write`。

完整威胁模型（in-scope assets、威胁 T-1 到 T-11、缓解、残余风险、未来工作）见 [`docs/security/mcp-threat-model.md`](./security/mcp-threat-model.md)。

---

## G. 排错

| 现象 | 可能原因 | 解决 |
|------|---------|------|
| `ERR_IO_OR_CONFIG: projectRoot must be an absolute path` | 传了相对路径 | 改成绝对路径。 |
| `ERR_IO_OR_CONFIG: projectRoot does not exist` | 路径不存在或拼错 | 在磁盘上确认路径存在。 |
| `ERR_IO_OR_CONFIG: projectRoot is not a directory` | 路径指向了文件 | 改成目录。 |
| `ERR_IO_OR_CONFIG: projectRoot must not contain null bytes` | 包含 null 字节，被拒 | 在 host 侧清洗输入。 |
| `ERR_IO_OR_CONFIG: ENOENT .ocoding/state.json` | 该 `projectRoot` 还没 `ocn init` | 先在该目录里跑 `ocn init`。 |
| `capture_log` 在 `type=decision` 时返回 `ERR_GATE_FAILED` | **预期行为**——决策只能通过 CLI 记录 | 用 OCN CLI 记录决策。 |
| `ERR_STATE_MACHINE: no template for current step` | 当前 SOP profile 还不知道这个 step | 在 CLI 里跑 `ocn advance` 推进到一个被支持的 step。 |
| MCP host 报 stderr 上有 JSON parse 错误 | audit fallback 配置错了 | 确认默认装的是 `silentAuditFallbackLogger`（`createMcpServer` 默认行为）。 |

---

## H. 路线图

PR #5 是最小安全工具面。后续 PR 可能加上：

- HTTP / SSE 传输（用于浏览器侧 MCP host）
- 长时间 gate 执行的流式进度通知
- 按项目注入 audit-fallback log
- 一个只读的 `navigator.audit_trail` 工具，返回最近事件

状态推进、决策捕获、重置、强制释放锁**永远不会**通过 MCP 暴露。
