---
title: "feat(phase2): MCP Safe Tools — minimal stdio server + 7 read+create tools"
type: feat
status: active
date: 2026-04-28
---

# feat(phase2): MCP Safe Tools

> **Origin**: [DEC-001](../19-decision-log.md#dec-001skeleton-spike-passed-and-phase-2-entry-approved) — final PR of Phase 2.
>
> **Resolves**:
> - todo 011 (P2 — decouple `safeAudit` from `process.stderr`). Pre-PR §3.
> - `OCN-PR5-001` (lock events without `correlationId`). Pre-PR §4.
>
> **Pre-requisites**: PR #1-#4 merged. Baseline: 48 test files / 260 tests / 84% lines coverage.

---

## 1. Scope

Expose the smallest viable MCP surface that lets external AI agents (Claude Code, Cline, Codex, Cursor) read OCN state, generate AI-resumption brief, run gates, create artifacts, and capture dev/research logs — but NOT advance state, write decisions, reset, or force-release locks. **Read + Create + Run are the only verbs.**

Phase 2 closes after this PR merges. GA prep, mini-CRM dogfood, and npm publishing are separate downstream tracks.

---

## 2. Non-goals

The following are explicitly out of scope and MUST NOT be exposed via MCP in PR #5:

- `navigator.advance_phase` — state transition is human-CLI-only (CLAUDE.md §4.8)
- `navigator.capture_decision` — decisions are pull-mode capture by humans (CLAUDE.md §4.7)
- `navigator.reset_project` — destructive
- `navigator.force_release_lock` — destructive

Plus broader scope exclusions: HTTP transport, auth, multi-project workspace, remote MCP, doctor, reset, baseline, SOP upgrade, production/full tier, mini-CRM, npm publish.

---

## 3. Pre-PR fixes (folded into this branch)

### 3.1 §3 — safeAudit logger decoupling (todo 011)

`safeAudit` currently writes warnings to `process.stderr` directly (`src/core/audit/audit-writer.ts:45,48`). For MCP stdio transport, stderr is part of the JSON-RPC framing channel — emitting raw text corrupts the protocol stream.

**Fix**: introduce `AuditFallbackLogger`, two implementations (`stderrAuditFallbackLogger`, `silentAuditFallbackLogger`), and a process-global setter:

```ts
// src/core/audit/audit-logger.ts
export interface AuditFallbackLogger {
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}
export const stderrAuditFallbackLogger: AuditFallbackLogger;
export const silentAuditFallbackLogger: AuditFallbackLogger;
export function setAuditFallbackLogger(logger: AuditFallbackLogger): void;
export function getAuditFallbackLogger(): AuditFallbackLogger;
```

`safeAudit` calls `getAuditFallbackLogger().warn(...)` instead of `process.stderr.write(...)`. CLI defaults to stderr (`src/cli/index.ts` keeps current behavior). MCP entry switches to silent at startup so audit failures never pollute stdio.

### 3.2 §4 — lock events accept correlationId (OCN-PR5-001)

PR #4 left lock-lifecycle events un-correlated. PR #5 plumbs `correlationId` through `LockAuditHookContext`:

```ts
export interface LockAuditHookContext {
  readonly projectRoot: string;
  readonly command: string;
  readonly currentStateId?: string;
  readonly currentStepId?: string;
  readonly correlationId?: string;   // NEW
}
```

`makeLockAuditHook(ctx)` includes `ctx.correlationId` in every emitted lock event. `advanceState` and MCP write tools pass the same correlationId both to the lock hook and to their own audit emissions.

---

## 4. MCP tool list (the 7 allowed tools)

| Tool name | Maps to core fn | State-mutating? | Notes |
|---|---|---|---|
| `navigator.where_am_i` | `getStatus` | No | Read-only |
| `navigator.brief` | `generateBrief` | No | Read-only; includes governance + uncertainty |
| `navigator.run_gate` | `runGate` | No | Emits gate audit events |
| `navigator.create_artifact` | `createArtifact` | Yes (file + audit) | 5 artifact types via existing template registry |
| `navigator.capture_log` | `captureLog` (NEW) | Yes (file + audit) | type=`dev` or `research` only; type=`decision` REJECTED |
| `navigator.detect_sop_version` | `detectSopVersion` (NEW) | No | Compare locked SOP version vs current |
| `navigator.generate_next_prompt` | `generateNextPrompt` (NEW) | No | Build AI-ready prompt for the current step |

**Forbidden** (must not appear in registry; tests verify): `navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, `navigator.force_release_lock`.

---

## 5. MCP Result Envelope

Every tool returns `MCPToolResult<T>`:

```ts
export interface MCPToolResult<T = unknown> {
  ok: boolean;
  code: ErrorCode;
  message: BilingualMessage;
  data?: T;
  error?: { code: ErrorCode; message: BilingualMessage; details?: unknown };
}
```

Identical shape to `CommandResult`. Helpers `mcpOk(...)` and `mcpBlocked(...)` mirror `ok` / `blocked`. Every handler is wrapped in `try/catch` so raw exceptions never reach the MCP client.

---

## 6. New core functions

### 6.1 `captureLog(opts)` (`src/core/log/capture-log.ts`)

```ts
export interface CaptureLogOptions {
  readonly cwd: string;
  readonly type: "dev" | "research" | "decision";
  readonly message: string;
}
```

- type=`dev` → append to `docs/19-dev-log.md` (creates with header on first write).
- type=`research` → append to `docs/18-research-log.md`.
- type=`decision` → blocked `ERR_GATE_FAILED` with bilingual "MCP cannot capture decision" message. **Always rejected from MCP; CLI may add its own decision flow in a later PR.**
- Emits `artifact_created` (sub-type: log) audit event with relatedPaths.

PR #5 ships minimal append-only markdown for dev/research logs. JSONL dual-persistence for log subsystem is a future PR.

### 6.2 `detectSopVersion(opts)` (`src/core/sop/detect-version.ts`)

Reads `state.json`, compares the locked `sopProfileVersion` against the currently-loaded SOP profile version, returns `{ locked, current, diffDetected }`.

### 6.3 `generateNextPrompt(opts)` (`src/core/prompt/generate-next-prompt.ts`)

Builds an AI-ready prompt for the current step:

```ts
export interface NextPromptData {
  readonly targetStateId: StateId;
  readonly targetStepId: string;
  readonly targetArtifactPath?: string;
  readonly requiredSections: readonly string[];   // canonical names
  readonly instruction: string;                   // multi-paragraph, bilingual
}
```

`instruction` includes:
1. Current step + current artifact path
2. Required sections list
3. **Step Artifact Gate Self-check rule**: AI must not mark a blocked artifact as complete.
4. **AI Governance Reminder** (verbatim from `BriefData`)
5. **Uncertainty Policy** (verbatim from `BriefData`)
6. Concrete next-action checklist

---

## 7. MCP server architecture

```
src/mcp/
├── result.ts              # MCPToolResult envelope + mcpOk/mcpBlocked + toMCPContent helper
├── tools/
│   ├── index.ts           # registry export — exactly 7 tools
│   ├── where-am-i.ts
│   ├── brief.ts
│   ├── run-gate.ts
│   ├── create-artifact.ts
│   ├── capture-log.ts
│   ├── detect-sop-version.ts
│   └── generate-next-prompt.ts
├── server.ts              # MCP Server wiring (stdio transport)
└── index.ts               # bin entry — calls server.run()
```

Uses `@modelcontextprotocol/sdk` (added to deps as `^1.29.0`). Each tool is registered with name, description, input schema (zod), and handler. Handler converts `MCPToolResult<T>` to MCP content blocks (text JSON).

The MCP entry calls `setAuditFallbackLogger(silentAuditFallbackLogger)` BEFORE any tool can run, ensuring audit failures never write to stderr.

### 7.1 Bin wiring

- `dist/cli/index.js` — `ocn` CLI (existing)
- `dist/mcp/index.js` — `ocn-mcp` MCP server (NEW). Add to `package.json#bin` as `"ocn-mcp": "dist/mcp/index.js"`.

### 7.2 stdio scope

PR #5 supports stdio transport only. HTTP/SSE deferred. Smoke test runs the server, sends a `tools/list` request, asserts the 7 expected tools, then exits cleanly.

---

## 8. Audit emission per MCP tool

| Tool | Audit events emitted |
|---|---|
| `where_am_i`, `brief`, `detect_sop_version`, `generate_next_prompt` | None (read-only) |
| `run_gate` | `artifact_gate_run` + `artifact_gate_blocked\|passed` (delegated to existing `runGate`) |
| `create_artifact` | `artifact_created` (delegated to existing `createArtifact`) |
| `capture_log` | `artifact_created` with `data.subType: "log-{dev\|research}"` (PR #5 minimal — log_captured event reserved for a later PR) |

`source: "core"` is used (not `"mcp"`) — `AuditSource` enum stays unchanged. The `command` field carries the tool name (e.g., `"mcp.create_artifact"`) so audit consumers can distinguish MCP-originated vs CLI-originated events.

Each MCP write-tool invocation generates a fresh `correlationId` (ULID). It threads through:
- Lock lifecycle hook (via Pre-PR §4 fix)
- Tool's own audit events
- The wrapped core function's audit events

So a single `navigator.create_artifact` call produces a JSONL trail like:

```
{"eventType":"lock_acquired","correlationId":"01HX..."}
{"eventType":"artifact_created","correlationId":"01HX..."}
{"eventType":"lock_released","correlationId":"01HX..."}
```

---

## 9. Test plan (~22 new)

### Unit tests

- `tests/unit/safe-audit-logger.test.ts` — stderr/silent variants, setter, getter; safeAudit uses configured logger
- `tests/unit/lock-correlation.test.ts` — lock lifecycle hook receives correlationId; emitted events carry it
- `tests/unit/mcp-result.test.ts` — envelope shape; mcpOk/mcpBlocked builders
- `tests/unit/mcp-tool-registry.test.ts` — exactly 7 allowed tools; forbidden tools NOT present
- `tests/unit/mcp-where-am-i.test.ts`
- `tests/unit/mcp-brief.test.ts`
- `tests/unit/mcp-run-gate.test.ts`
- `tests/unit/mcp-create-artifact.test.ts`
- `tests/unit/mcp-capture-log.test.ts` — type=dev/research write; type=decision rejected
- `tests/unit/mcp-detect-sop-version.test.ts`
- `tests/unit/mcp-generate-next-prompt.test.ts` — includes governance + uncertainty + self-check rule
- `tests/unit/capture-log-core.test.ts` — core fn dev/research write + decision reject
- `tests/unit/detect-sop-version-core.test.ts`
- `tests/unit/generate-next-prompt-core.test.ts`

### Integration tests

- `tests/mcp/mcp-tools.integration.test.ts` — invoke each handler with valid input; assert envelope shape + audit emission
- `tests/mcp/mcp-stdio-smoke.test.ts` — spawn `ocn-mcp`, send `tools/list`, assert 7 tools; assert no non-protocol stderr writes during a `where_am_i` call

If stdio smoke is unstable (SDK packaging surprises in CI), the smoke test is skipped with a documented note in implementation-notes.md and the handler-level integration carries the load.

---

## 10. Acceptance criteria

- [ ] Pre-PR §3: `safeAudit` no longer calls `process.stderr.write` directly.
- [ ] Pre-PR §4: lock events carry `correlationId` when supplied; advance-flow lock events share the same correlationId.
- [ ] MCP registry exposes exactly the 7 allowed tools.
- [ ] Forbidden tools NOT in registry (test-enforced).
- [ ] Each MCP tool returns `MCPToolResult` envelope; raw exceptions never leak.
- [ ] `navigator.capture_log` rejects `type: "decision"` with bilingual error.
- [ ] `navigator.create_artifact` and `navigator.capture_log` emit audit events with correlationId.
- [ ] MCP success path produces zero non-protocol writes to stderr.
- [ ] All 260 prior tests still pass.
- [ ] New tests pass.
- [ ] `npm run lint && typecheck && build && test:coverage` green.
- [ ] `implementation-notes.md` updated: todo 011 RESOLVED, OCN-PR5-001 RESOLVED, §11 PR #5 addendum.
- [ ] `docs/mcp-usage.md` written (start command + tool list + safety boundaries).

---

## 11. Coverage targets

- `src/mcp/*` ≥ 85% lines
- All-files ≥ 80% (current 84%, target ≥ 84%)
- safeAudit logger module ≥ 95%
- captureLog / detectSopVersion / generateNextPrompt core fns ≥ 90%

---

## 12. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | MCP SDK ABI surprises (zod schema mismatch with SDK's expectations) | Test handlers with raw JSON input; pin SDK version in package.json. |
| R2 | stdio smoke flaky under vitest | Use `child_process.spawn` with explicit args; 10s timeout. If still flaky, mark `it.skip` with documented reason in implementation-notes.md. |
| R3 | `setAuditFallbackLogger` is module-global state — concurrent tests interfere | All audit-writer tests reset to stderrLogger in `afterEach`. MCP tests set silent in `beforeEach`. |
| R4 | Adding `correlationId` to every lock event breaks PR #2/#3 tests | Field is optional; existing tests don't assert on its absence. Verified before merge. |

---

## 13. Out of scope (do NOT close in PR #5)

- todos 014, 015 (P3 simplification) — defer.
- Decision-log subsystem — explicitly forbidden via MCP; CLI flow is a future PR.
- Research-log subsystem — minimal append-only markdown in PR #5; JSONL dual-track in a future PR.
- BUILD/VERIFY/SHIP/REFLECT step IDs — state IDs only (PR #4 carry-over).
- HTTP / SSE MCP transport.
- Multi-project workspace.
- Doctor / reset / baseline / SOP upgrade.

---

## 14. Verification

```bash
npm run lint && npm run typecheck && npm run build && npm run test:coverage
```

Plus manual MCP smoke:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/mcp/index.js
```

Should return exactly 7 tools and exit cleanly with no stderr noise.

---

**END OF PLAN**
