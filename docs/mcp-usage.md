# OCN MCP Server Usage｜OCN MCP 服务用法

> Companion to PR #5 — MCP Safe Tools.
> Plan: `docs/plans/2026-04-28-feat-ocn-phase2-mcp-safe-tools-plan.md`.

OCN ships a Model Context Protocol (MCP) server that exposes a curated, **read-and-create** subset of the navigator surface. The server speaks the **stdio transport** of MCP and is intended to be wired into an MCP-aware IDE/agent host.

---

## 1. Start the server

After `npm install` + `npm run build`:

```bash
# Inside any OCN-initialized project (must contain `.ocoding/`)
ocn-mcp
```

Or via `npx` from a checked-out repo:

```bash
npx ocn-mcp
```

The process speaks JSON-RPC 2.0 over stdin/stdout per the MCP stdio framing. Stderr is reserved for protocol notifications — **OCN guarantees zero application stderr writes on the success path** (audit fallback messages are routed to a silent logger; see PR #5 §11.5).

### Wire into an MCP host｜接入 MCP Host

#### Validated path: Claude Desktop on Windows + WSL2

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

#### Native (non-WSL) host on Linux / macOS

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

> **中文说明｜Chinese summary**
> 当前真实验证通过的 MCP Host 是 **Windows Claude Desktop**，并通过 `wsl.exe -e ocn-mcp` 在 WSL2 中启动 OCN MCP server。
> Cursor 与 Cline 暂未完成验证，不能声明兼容；每个 Host 都需要独立的真实 Host 验证报告（DEC-017 模式）才能加入支持声明。
> 每次工具调用都需要绝对路径的 `projectRoot` 参数，且该目录必须已经跑过 `ocn init`。

### Project root must be initialized｜projectRoot 必须已初始化

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

## 2. Allowed tools (7)｜允许的 7 个工具

All tools return a structured `MCPToolResult` envelope:

```ts
type MCPToolResult<T> =
  | { ok: true;  code: "OK";   message: { en: string; zh: string }; data: T }
  | { ok: false; code: string; message: { en: string; zh: string }; error: { code: string; en: string; zh: string } };
```

`code` values map 1:1 to OCN's CLI error codes (`OK`, `ERR_GATE_FAILED`, `ERR_IO_OR_CONFIG`, `ERR_STATE_MACHINE`, `ERR_ARTIFACT_INVALID`, `ERR_VALIDATION`).

| # | Tool | Purpose | Mutates state? | Mutates filesystem? |
|---|------|---------|----------------|---------------------|
| 1 | `navigator.where_am_i` | Snapshot of current state (state id, step id, locked SOP, last gate result) | No | No |
| 2 | `navigator.brief` | Render a next-step brief for the current step | No | No |
| 3 | `navigator.run_gate` | Aggregate the artifact gate for the current step (read-only — does NOT advance) | No | Audit only |
| 4 | `navigator.create_artifact` | Create a doc from the 5-type template registry (`project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`) | No (state) | Yes (writes the doc + audit) |
| 5 | `navigator.capture_log` | Append to `docs/19-dev-log.md` (`type=dev`) or `docs/18-research-log.md` (`type=research`). **`type=decision` is hard-rejected** — see §3 | No | Yes (log file + audit) |
| 6 | `navigator.detect_sop_version` | Compare project-locked SOP profile against bundled OCN SOP; returns drift status | No | No |
| 7 | `navigator.generate_next_prompt` | Returns required sections + AI governance reminder + uncertainty policy + self-check rule for the current step | No | No |

> **中文说明｜Chinese summary**
> 在已验证 Host（Windows Claude Desktop + WSL2）的工具面板中，应当看到下面 7 个 `navigator.*` 工具：
> `navigator.where_am_i`, `navigator.brief`, `navigator.run_gate`, `navigator.create_artifact`, `navigator.capture_log`, `navigator.detect_sop_version`, `navigator.generate_next_prompt`。
> 任何工具调用都需要绝对路径的 `projectRoot` 参数；如果目录未 `ocn init`，工具会返回 `ERR_IO_OR_CONFIG` 结构化错误，不会写入任何文件、不会获取锁、不会写 audit。

### Input envelopes (zod-validated)

```ts
// 1, 2, 3, 6, 7 — same shape
{ projectRoot: string }

// 4
{ projectRoot: string;
  artifactType: "project-brief" | "scope" | "prd" | "acceptance-criteria" | "technical-architecture" }

// 5
{ projectRoot: string; type: "dev" | "research" | "decision"; message: string }
```

Invalid input never throws — the handler returns an `ERR_VALIDATION` envelope with bilingual messages.

---

## 3. Forbidden tools (NEVER exposed)｜禁止暴露的 4 个工具

The MCP server intentionally refuses to expose four high-blast-radius operations. They are reserved for human-driven CLI invocation:

| Forbidden tool | Why kept off MCP |
|----------------|------------------|
| `navigator.advance_phase` | State advancement is the navigator's most consequential mutation. Phase forward is a deliberate human signal — not a tool the LLM should call autonomously. |
| `navigator.capture_decision` | Decisions are governance artifacts. They must reflect human intent, not LLM convenience. The exposed `capture_log` tool **hard-rejects** `type=decision` with `ERR_GATE_FAILED`. |
| `navigator.reset_project` | Destructive. Twice-confirm flow is human-only. |
| `navigator.force_release_lock` | Bypasses state-safety invariants. Operator-only escape hatch. |

The forbidden list is enforced by `tests/unit/mcp-tool-registry.test.ts` — the test will fail if any of these names ever appear in `ALLOWED_TOOL_NAMES`.

> **中文说明｜Chinese summary**
> 下面 4 个工具**绝不会**出现在 MCP Host 工具面板中：`navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, `navigator.force_release_lock`。
> 这是 OCN 的安全边界：state 推进、决策捕获、项目重置、强制释放锁这四类高风险操作只能通过人类手动 CLI 触发。`tests/unit/mcp-tool-registry.test.ts` 在 CI 上守住这个约束。
> 如果你的 Host 工具面板里出现了上面任何一个工具名称，立刻停止使用并复查配置——这是错误状态。

---

## 4. Audit emission via MCP

Every tool that mutates the filesystem emits an `artifact_created` event into the dual-track audit trail (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`). `navigator.run_gate` emits `artifact_gate_run` + `artifact_gate_passed`/`artifact_gate_blocked`. No tool emits `advance_*` / `state_transitioned` (those are exclusive to the CLI's `ocn advance`).

If audit writes fail (disk full, permissions), the failure is routed to the configured `AuditFallbackLogger`. The MCP server installs `silentAuditFallbackLogger` at boot to keep stdio framing clean — meaning **audit-fallback warnings are dropped on the floor in MCP mode**. The CLI continues to use `stderrAuditFallbackLogger` (PR #4 behaviour).

If you need to surface audit-fallback warnings in your MCP host, set a custom logger via `setAuditFallbackLogger(...)` after constructing the server (advanced usage; see `src/core/audit/audit-logger.ts`).

---

## 5. Operational guarantees

1. **No tool ever throws across the MCP boundary.** All handlers return a `MCPToolResult` envelope.
2. **No tool ever bypasses the OCN state lock.** Read-only tools don't acquire the lock; mutating tools (`create_artifact`, `capture_log`) take the lock for the duration of the file write only.
3. **No tool ever advances state.** `navigator.advance_phase` is not registered; `navigator.run_gate` is read-only by construction.
4. **Bilingual messages everywhere.** Every `code` carries an `en` + `zh` string.
5. **Stable IDs.** Every state, step, section, and artifact ID is a stable string (`state_*`, `step_*`, `section_*`, `artifact_*`) — no numeric pointer leakage.
6. **`projectRoot` is validated at the boundary** (PR C). The validator rejects non-strings, empty strings, null bytes, relative paths, missing paths, and non-directories before any core fn runs. Symlinks are resolved to canonical realpath, and downstream file operations are anchored to that realpath. See [`docs/security/mcp-threat-model.md`](./security/mcp-threat-model.md) §4 for the full threat list.
7. **`projectRoot` must be an initialized OCN project** (P1-001). Every MCP tool — read-only and mutating — refuses to act on a directory that does not contain a valid `.ocoding/state.json`. Mutating tools never create `docs/` or `.ocoding/` as a side effect of a rejected call.

---

## 5a. Safety boundaries and operating rules

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

## 6. Troubleshooting

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

## 7. Roadmap

PR #5 is the minimum safe surface. Future PRs may add:

- HTTP / SSE transport (for browser-side MCP hosts)
- Streaming progress notifications for long gate runs
- Per-project audit-fallback log injection
- A read-only `navigator.audit_trail` tool that returns recent events

State-advancement, decision-capture, reset, and force-release-lock will **never** be exposed via MCP.
