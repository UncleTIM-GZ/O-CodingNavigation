---
status: pending
priority: p2
issue_id: 011
tags: [code-review, architecture, mcp-prep, audit]
dependencies: []
---

# Decouple `safeAudit` from `process.stderr` (MCP stdio prep)

## Problem Statement

`src/core/audit/audit-writer.ts:45,48` calls `process.stderr.write(...)` directly when audit emission fails. This is fine for the CLI but **will corrupt the MCP JSON-RPC framing channel** when PR #5 (Minimal MCP Server) ships, because MCP stdio transport uses stderr for framing.

A failed audit emission today writes a single warning line. In an MCP context, that line is interpreted as part of the protocol stream and breaks the host's parser.

## Findings

- `src/core/audit/audit-writer.ts:45` — `process.stderr.write(\`audit: ...\`)` on `markdownOk: false` warning.
- `src/core/audit/audit-writer.ts:48` — `process.stderr.write(...)` on `safeAudit` outer catch.
- Source: architecture-strategist review, R2 (MEDIUM, MCP-blocking).

## Proposed Solutions

### Option A — Inject a sink

```ts
export type AuditWarningSink = (line: string) => void;

const defaultSink: AuditWarningSink = (line) => process.stderr.write(line);

export async function safeAudit(
  root: string,
  event: AuditEvent,
  sink: AuditWarningSink = defaultSink,
): Promise<void> {
  // ... use `sink(...)` instead of process.stderr.write
}
```

CLI continues using the default sink; PR #5's MCP server passes a sink that routes to a logger or tool-side notification.

- Pros: minimal API change, backwards-compatible.
- Cons: every command call site has a hidden default that may not be appropriate in MCP. PR #5 must remember to pass a sink.

### Option B — Single composition root override

Wrap `safeAudit` invocations behind a `Deps`-style injection (like `loadSopProfile()` todo 002). MCP server constructs the `Deps` object once and passes it down.

- Pros: matches the broader composition-root direction.
- Cons: bigger refactor; requires Deps refactor first (todo 002).

### Option C — Use a project-local logger module

Create `src/core/log.ts` with `warn(line)` that picks `process.stderr` by default but can be set globally at startup. Audit writer calls `log.warn(...)`.

- Pros: simplest API change.
- Cons: global mutable state — easy to forget to override.

**Recommended: Option A** — small, explicit, ships before MCP arrives.

## Acceptance Criteria

- [ ] `safeAudit` (or its successor) does not call `process.stderr.write` directly when called from non-CLI contexts.
- [ ] CLI behavior unchanged (still writes to stderr by default).
- [ ] Test added: a sink passed to `safeAudit` receives the warning instead of stderr.

## Resources

- PR #4 — Audit + Event Foundation
- Architecture review finding R2
- DEC-001 PR #5 (MCP Safe Tools)
