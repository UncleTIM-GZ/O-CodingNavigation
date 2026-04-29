# OCN MCP Threat Model (Local stdio)

> Date: 2026-04-29
> Scope: the local MCP stdio server shipped as `ocn-mcp` after PR #6 (MCP Safe Tools).
> Out of scope: any future remote MCP transport, HTTP/SSE bindings, OCN SaaS, or hosted services.
> Companion: [`docs/mcp-usage.md`](../mcp-usage.md), [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](../plans/2026-04-28-ga-prep-gap-review-plan.md) §3.4 + §3.10.

This is the first OCN security artifact. It is intentionally narrow — covering only the surface that exists today (local stdio, 7 read/create tools) — and deliberately omits anything that would require new product features.

---

## 1. Scope

### In-scope
- The `ocn-mcp` process running on the user's local machine.
- The 7 allowed MCP tools (`navigator.where_am_i`, `navigator.brief`, `navigator.run_gate`, `navigator.create_artifact`, `navigator.capture_log`, `navigator.detect_sop_version`, `navigator.generate_next_prompt`).
- The stdio JSON-RPC framing channel and its content blocks.
- The `projectRoot` argument and any other tool input that influences a filesystem path.
- The OCN-managed directories under a validated `projectRoot`: `.ocoding/`, `docs/`.

### Out of scope
- **Remote MCP transports** (HTTP, SSE, WebSocket) — not implemented.
- **MCP authentication / authorisation** — not implemented.
- **MCP rate limiting / quotas** — not implemented.
- **Sandboxing of the OCN process** — OCN runs with the user's permissions on the host OS.
- **Compromise of the MCP host process** (Claude Desktop, Cursor, Cline, etc.) — out of scope; if the host is compromised, OCN's safety claims do not extend that far.
- **Compromise of the host OS** — out of scope.
- **The 4 forbidden tools** — they are not registered. There is no surface to attack.

---

## 2. Assets

In rough order of sensitivity:

| Asset | What it is | Why it matters |
|---|---|---|
| `<project>/docs/22-audit-trail.md` | Human audit narrative | The user's record of what happened in the project. Tamper-detection is via the JSONL companion. |
| `<project>/.ocoding/audit/audit-events.jsonl` | Machine audit log (append-only JSONL) | Source of truth for what OCN did and when. Each line is a structured `AuditEvent` with optional `correlationId`. |
| `<project>/.ocoding/state.json` | Current state, step, last gate result | Lock-protected, atomically written. Corrupting this corrupts the project's notion of "where we are". |
| `<project>/.ocoding/state.json.bak` | Rolling backup | Enables recovery from a corrupted `state.json`. |
| `<project>/docs/*.md` (project artifacts) | Project Brief, Scope, PRD, Acceptance Criteria, Technical Architecture, etc. | The work product. Overwriting is a content-loss event. |
| `<project>/docs/19-dev-log.md`, `<project>/docs/18-research-log.md` | Bilingual append-only logs | Created by `navigator.capture_log`. |
| `<project>/.ocoding/.lock` | State-write lock file | Bypassing this enables corruption races. |
| Files **outside** `<project>` | The user's broader filesystem | Should never be touched by `ocn-mcp` regardless of agent intent. |
| The stdio JSON-RPC channel | Bidirectional protocol stream with the MCP host | Pollution causes protocol confusion in the host. |
| Decision Log (`docs/20-decision-log.md`) and SOP profile (`.ocoding/sop.yaml`) | Human governance artifacts | MCP must never write to these (capturing decisions and changing SOP are CLI-only operations). |

---

## 3. Trust boundaries

```
┌─────────────────────────────────────────────────────────┐
│ (External, fully untrusted)                             │
│  • the prompt content the agent receives                │
│  • any file the agent has been told to read             │
└────────────────────────┬────────────────────────────────┘
                         │ via the agent's tool calls
┌────────────────────────▼────────────────────────────────┐
│ MCP host process (Claude Desktop / Cursor / Cline)      │
│  Trust: trusted to frame JSON-RPC correctly.            │
│  Threat: forwards tool calls; cannot alter OCN's        │
│  enforcement of forbidden tools or projectRoot.         │
└────────────────────────┬────────────────────────────────┘
                         │ stdio JSON-RPC
┌────────────────────────▼────────────────────────────────┐
│ ocn-mcp (this process)                                  │
│  Trust boundary: every tool input — including           │
│  projectRoot — is treated as untrusted.                 │
│  Validation seam: src/core/security/project-root.ts.    │
│  After validation, downstream core fns operate on a     │
│  canonical realpath.                                    │
└────────────────────────┬────────────────────────────────┘
                         │ direct fs / lock / audit calls
┌────────────────────────▼────────────────────────────────┐
│ Local filesystem (under user's UID)                     │
│  Trust: files outside the validated projectRoot are     │
│  off-limits to ocn-mcp by construction (no tool has a   │
│  path argument that is interpreted relative to root     │
│  with arbitrary user-supplied segments).                │
└─────────────────────────────────────────────────────────┘
```

The **validation seam** is the choke point. Every tool handler calls `validateProjectRoot(input)` *before* delegating to a core fn. The validator returns a canonical realpath (or a structured failure envelope); the canonical path is what every downstream `path.join` is anchored to.

---

## 4. Threats

### T-1 — Malicious `projectRoot` (path traversal)
**Description**: An adversarial prompt convinces the agent to call a tool with a `projectRoot` like `..`, `./relative`, `/etc`, or `<cwd>\0/etc`.
**Mitigation**: `validateProjectRoot` (`src/core/security/project-root.ts`) rejects non-strings, empty strings, null bytes, relative paths, missing paths, and non-directories before any core fn runs. Tests: `tests/unit/project-root-validation.test.ts`, `tests/security/mcp-projectroot-security.test.ts`.

### T-2 — Symlink escape from `projectRoot`
**Description**: A symlink under the project resolves outside the validated root; or `projectRoot` itself is a symlink to a sensitive location.
**Mitigation**: The validator calls `fs.realpath()` on `projectRoot` and returns the resolved canonical path. Subsequent core fns receive the realpath, not the symlink. The companion helper `assertResolvedPathInsideRoot()` is available for callers that traverse user-influenced sub-paths. Tests cover both directions.

### T-3 — Container escape via `..` segments after validation
**Description**: A core fn computes a path via `path.join(cwd, userControlled, ...)` where `userControlled` contains `..`.
**Status today**: No allowed MCP tool accepts a free-form path segment from the agent. The only path-influencing inputs are `artifactType` (a 5-value enum in `create_artifact`) and `type` (a 3-value enum in `capture_log`, with `decision` rejected). All target paths are derived from `validation.projectRoot + constant subpath`.
**Mitigation**: enum validation at the schema layer + canonical projectRoot from T-1.

### T-4 — Prompt-induced misuse of allowed tools
**Description**: An adversarial prompt makes the agent call `capture_log` with `type: "decision"` repeatedly hoping for a bypass; or makes the agent call `create_artifact` repeatedly with `overwrite: true` to clobber project work.
**Mitigation**:
- `capture_log` rejects `type: "decision"` unconditionally (`ERR_GATE_FAILED` envelope, no audit emission).
- `create_artifact` returns the bilingual `ERR_ARTIFACT_INVALID` envelope when the target file exists and `overwrite: false` (default). When `overwrite: true` is supplied, the agent has been given that permission by its prompt; OCN treats this as legitimate.
**Residual risk**: the user must trust the agent's prompt. OCN cannot distinguish "deliberate overwrite" from "prompt-injection-induced overwrite."

### T-5 — Forbidden-tool access attempt
**Description**: An adversarial prompt asks the agent to call `navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, or `navigator.force_release_lock`.
**Mitigation**: These tools are **never registered**. The MCP host's `tools/list` will not advertise them; an attempt to call them returns a host-level "tool not found" error (not an OCN error). Enforced by `tests/unit/mcp-tool-registry.test.ts` (`ALLOWED ∩ FORBIDDEN = ∅`).

### T-6 — DoS via repeated tool calls
**Description**: An adversarial prompt loops `navigator.run_gate` indefinitely.
**Status today**: No rate limiting. Each call is cheap (≪ 50 ms on a fresh project) and read-only; the audit JSONL grows linearly but bounded by the host's loop.
**Mitigation in this PR**: none beyond cheap, fast, idempotent tool execution.
**Residual risk**: see §6 — rate limiting is a future-work item.

### T-7 — Audit JSONL pressure / disk-fill DoS
**Description**: An adversarial prompt loops `create_artifact` with `overwrite: true` to bloat `audit-events.jsonl`.
**Mitigation today**: each MCP `create_artifact` produces O(1) audit events; the JSONL grows by ~500 bytes per call. Real disk-fill takes millions of calls and is bounded by the agent's loop.
**Residual risk**: a sufficiently determined adversary can fill disk space available to the user.

### T-8 — Stderr / protocol pollution
**Description**: An OCN warning written to `process.stderr` corrupts the JSON-RPC stdio framing.
**Mitigation**: `createMcpServer` installs `silentAuditFallbackLogger` at boot. `tests/mcp/mcp-tools.integration.test.ts` verifies a successful `where_am_i` call produces zero `process.stderr.write` calls.

### T-9 — Decision capture via MCP
**Description**: A prompt convinces the agent to record a project-level decision.
**Mitigation**: the `navigator.capture_decision` tool is not registered. `navigator.capture_log` rejects `type: "decision"` with bilingual `ERR_GATE_FAILED`. Decisions remain CLI-only (and human-only).

### T-10 — Reset / force-release via MCP
**Description**: A prompt convinces the agent to reset the project or force-release the state lock.
**Mitigation**: `navigator.reset_project` and `navigator.force_release_lock` are not registered.

### T-11 — TOCTOU between `validateProjectRoot` and downstream fs operations
**Description**: An attacker modifies the path between the validator's `realpath` and the core fn's first `path.join`-based file write — e.g. swapping the directory for a symlink to `/etc`.
**Mitigation today**: The validator does an additional `stat` on the realpath after `realpath`, narrowing the window. Beyond that, OCN is single-process, single-user — TOCTOU on a local FS path implies an attacker already has the user's privileges, which is outside this threat model's scope.
**Residual risk**: see §6.

---

## 5. Mitigations summary

| Mitigation | Where it lives | Test coverage |
|---|---|---|
| `validateProjectRoot()` validates type, emptiness, null bytes, absolute path, existence, directory check, realpath resolution, post-realpath re-stat | `src/core/security/project-root.ts` | `tests/unit/project-root-validation.test.ts` (23 cases), `tests/security/mcp-projectroot-security.test.ts` (57 cases) |
| `assertPathInsideRoot()` / `assertResolvedPathInsideRoot()` containment helpers | `src/core/security/project-root.ts` | same |
| MCP tool handlers wire validation before any core fn call (7/7 tools) | `src/mcp/tools/*.ts` | per-tool unit tests + the security suite |
| `MCPToolResult` envelope ensures every invalid input becomes a structured `{ ok: false, code, message: { en, zh } }` — no exceptions cross the MCP boundary | `src/mcp/result.ts` | `tests/unit/mcp-result.test.ts`, integration suite |
| 4 forbidden tools never registered | `src/mcp/tools/index.ts` (`FORBIDDEN_TOOL_NAMES`) | `tests/unit/mcp-tool-registry.test.ts` |
| `silentAuditFallbackLogger` installed at MCP boot to keep stdio framing clean | `src/mcp/server.ts` | `tests/mcp/mcp-tools.integration.test.ts` |
| `capture_log` hard-rejects `type=decision` | `src/core/log/capture-log.ts` | `tests/unit/capture-log-core.test.ts` |
| Bilingual error messages (`{en, zh}`) for every failure path | `src/core/i18n.ts` + handlers | per-tool tests |
| Local-only stdio transport (no HTTP / SSE / remote in v1.0) | `src/mcp/server.ts` (StdioServerTransport) | architectural — no test, no remote surface to attack |

---

## 6. Residual risks

These are the things OCN does **not** mitigate as of PR C. Each is a known gap, not an oversight.

| ID | Residual risk | Why deferred |
|----|---|---|
| RR-1 | No authentication on the local stdio channel. | The trust boundary is the OS user account. Remote MCP would require auth; that surface does not exist. |
| RR-2 | Any local process running as the same user can read `.ocoding/audit/audit-events.jsonl` and `state.json`. | Standard OS-level concern; OCN does not encrypt at rest. |
| RR-3 | No rate limiting on tool calls. | Host-level call loops are bounded by the host's own controls. Implementing fair-rate accounting in OCN would expand scope without clear benefit at v1.0. |
| RR-4 | No sandbox on the `ocn-mcp` process. | Sandboxing requires platform-specific work (seccomp on Linux, App Sandbox on macOS, AppContainer on Windows). Out of scope for v1.0. |
| RR-5 | TOCTOU window between `validateProjectRoot` and the first downstream `path.join`. | Closing this requires every core fn to take a `realpath` rather than a `cwd`, plus cooperative re-stat at write time. Tracked for future work. |
| RR-6 | `create_artifact` with `overwrite: true` + adversarial agent can clobber user work. | The user is responsible for trusting their agent's prompt. OCN cannot infer intent. |
| RR-7 | A pathological prompt may slowly grow the audit JSONL; no rotation policy. | Audit rotation is a deferred Phase-3 feature. |
| RR-8 | No threat-model coverage of remote MCP transport. | Remote transport is not implemented; threat-model coverage will accompany its first PR. |

---

## 7. Future work

Tracked here so each item has a single home. None are scheduled inside the current GA Prep PR sequence; each requires its own DEC entry before implementation begins.

- **F-1**: Per-tool rate limiting (configurable, default off).
- **F-2**: Stricter project manifest — verify `.ocoding/` exists and contains a known signature before allowing mutating tools to run. Today the validator only confirms `projectRoot` is a directory; it does not require `ocn init` has been run.
- **F-3**: External-MCP-host compatibility validation guide (PR D in the GA Prep plan).
- **F-4**: Path allowlist configuration — a per-project `.ocoding/security.yaml` declaring which subdirs are writable, so future tools can opt in without expanding the default surface.
- **F-5**: Read-only mode flag for `ocn-mcp` (e.g. `ocn-mcp --read-only`) that disables `create_artifact` and `capture_log` entirely.
- **F-6**: Audit rotation policy (size-based or daily) so long-lived projects don't accumulate unbounded JSONL.
- **F-7**: TOCTOU hardening — propagate the realpath through every core fn signature, with re-stat at write time.
- **F-8**: Threat-model expansion when remote MCP / HTTP / SSE is implemented. **No HTTP transport ships before this expansion is reviewed.**
- **F-9**: Optional integration with OS-level sandboxing (seccomp / App Sandbox / AppContainer).

---

## 8. References

- `src/core/security/project-root.ts` — validator + containment helpers.
- `src/mcp/tools/*.ts` — wiring at the MCP boundary (7/7 tools).
- `src/mcp/server.ts` — server boot + silent audit logger install.
- `src/mcp/result.ts` — `MCPToolResult` envelope.
- `tests/unit/project-root-validation.test.ts` — validator tests.
- `tests/security/mcp-projectroot-security.test.ts` — MCP boundary security tests.
- `tests/mcp/mcp-tools.integration.test.ts` — handler-level integration including stderr-cleanliness.
- `tests/unit/mcp-tool-registry.test.ts` — forbidden-tool absence guarantee.
- `docs/mcp-usage.md` — user-facing security notes companion.
- `docs/plans/2026-04-28-ga-prep-gap-review-plan.md` §3.4 (path-traversal) + §3.10 (security review).
- `docs/20-decision-log.md` — DEC-002 (Phase 2 Complete), DEC-003 / DEC-004 (governance).
