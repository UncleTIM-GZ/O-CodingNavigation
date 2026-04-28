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

### Wire into an MCP host (example: Claude Desktop)

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

Every tool requires an absolute `projectRoot` argument (the path to an OCN-initialized project). The server itself is project-agnostic; one MCP server can serve any number of OCN projects sequentially.

---

## 2. Allowed tools (7)

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
2. **No tool ever bypasses the OCN state lock.** Read-only tools don't acquire the lock; mutating tools (`create_artifact`, `capture_log`) take the lock for the duration of the file write only.
3. **No tool ever advances state.** `navigator.advance_phase` is not registered; `navigator.run_gate` is read-only by construction.
4. **Bilingual messages everywhere.** Every `code` carries an `en` + `zh` string.
5. **Stable IDs.** Every state, step, section, and artifact ID is a stable string (`state_*`, `step_*`, `section_*`, `artifact_*`) — no numeric pointer leakage.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ERR_IO_OR_CONFIG` from every tool | Project not initialized at `projectRoot` | Run `ocn init` in that directory first |
| `ERR_VALIDATION: projectRoot must be an absolute path` | Relative path supplied | Pass an absolute path |
| `ERR_GATE_FAILED` from `capture_log` with `type=decision` | This is **expected behaviour** — decisions are CLI-only | Use `ocn log decision <message>` from the terminal |
| `ERR_STATE_MACHINE: no template for current step` | Tool called before SOP profile knows the current step | Run `ocn advance` from the CLI to land at a supported step |
| MCP host complains about JSON parse errors on stderr | Audit fallback was misconfigured | Verify `silentAuditFallbackLogger` is installed (default in `createMcpServer`) |

---

## 7. Roadmap

PR #5 is the minimum safe surface. Future PRs may add:

- HTTP / SSE transport (for browser-side MCP hosts)
- Streaming progress notifications for long gate runs
- Per-project audit-fallback log injection
- A read-only `navigator.audit_trail` tool that returns recent events

State-advancement, decision-capture, reset, and force-release-lock will **never** be exposed via MCP.
