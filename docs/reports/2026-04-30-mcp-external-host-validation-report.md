# MCP External Host Validation Report｜MCP 真实 Host 验证报告

> Date: 2026-04-30
> Authoring DEC: `docs/20-decision-log.md` §DEC-005 (caveat origin), §DEC-017 (caveat closure for the tested Host)
> Validation branch: `docs/pr-d-claude-desktop-host-validation`

---

## 1. Summary

| Field | Value |
| --- | --- |
| Host tested | **Claude Desktop (Cowork mode) on Windows + WSL2** |
| Verdict | **Pass** |
| Date | 2026-04-30 |
| OCN package | `o-coding-navigation@0.1.0-alpha.2` |
| OCN repo HEAD on validation branch | `73c5e3fce8500b9f4100ca014bfb90ccffade208` |
| npm `dist-tags.alpha` | `0.1.0-alpha.2` (server resolved from local `dist/`, not from npm install) |
| Test projectRoot | `/tmp/ocn-mcp-demo` (state_discovery / step_project_brief, gate `pass`) |
| MCP server command | `wsl.exe -e node /home/timou/repos/OCN/dist/mcp/index.js` |
| Caveat decision | DEC-005 caveat **closed for Claude Desktop**; Cursor and Cline remain explicitly unverified. |

This report records real Host validation that resolves PR D for Claude Desktop. It is the evidence base for DEC-017 (caveat closure scoped to Claude Desktop) and for DEC-018 (begin beta candidate preparation, no implementation).

## 2. Scope

**In scope:**

- A real MCP Host (Claude Desktop's Cowork mode) connected to OCN's MCP stdio server via `wsl.exe -e node …/dist/mcp/index.js`.
- Live `tools/list` enumeration as observed by the Host.
- Live tool invocation of `navigator.where_am_i`, `navigator.brief`, `navigator.run_gate`, plus a deliberate failure case via `navigator.where_am_i` with an invalid relative `projectRoot`.
- Protocol cleanliness inspection (JSON-RPC framing, stderr pollution, server crash, server restart).

**Out of scope (deliberate, per DEC-005 successor scoping):**

- Cursor MCP Host validation.
- Cline MCP Host validation.
- Network-mode MCP transports (HTTP/SSE) — OCN ships stdio only in v1.0.
- Production-grade load testing of the MCP server.
- Validation of `navigator.create_artifact`, `navigator.capture_log`, `navigator.detect_sop_version`, `navigator.generate_next_prompt` *call paths*. Those tools were enumerated as present (§5) and their schemas were loaded by the Host without protocol error (§7), but only the four call paths in §6 were exercised.

This is **not** an SDK self-smoke and **not** a CLI-only test. Every entry in §6 is a tool call the Host actually issued through the JSON-RPC stdio transport.

## 3. Host environment

| Item | Value |
| --- | --- |
| Host | Claude Desktop (Cowork mode) |
| Host version | not observable from agent context |
| OS | Windows |
| Local machine | not observable from agent context (redacted) |
| Node version (in WSL2) | `v20.20.0` (verified locally on the WSL2 side that runs the MCP server) |
| WSL2 kernel | `6.6.87.2-microsoft-standard-WSL2` |
| OCN repo path | `/home/timou/repos/OCN` |
| OCN commit | `73c5e3fce8500b9f4100ca014bfb90ccffade208` |
| MCP server entry | `/home/timou/repos/OCN/dist/mcp/index.js` |
| Test projectRoot | `/tmp/ocn-mcp-demo` |

The "(not observable from agent context)" entries are honest gaps — Claude Desktop did not surface its own version string into the agent's tool/call context, and the local machine identifier is intentionally redacted from the public report. This matches the §6 raw transcripts; nothing is fabricated to fill the table.

## 4. Server configuration

The Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`) registers OCN's MCP server as:

```json
{
  "mcpServers": {
    "ocn": {
      "command": "wsl.exe",
      "args": [
        "-e",
        "node",
        "/home/timou/repos/OCN/dist/mcp/index.js"
      ]
    }
  }
}
```

This launches the OCN MCP stdio server inside WSL2 from a Windows-hosted Claude Desktop process — the canonical cross-VM MCP wiring for OCN on Windows machines. No network port is opened; transport is stdio framed JSON-RPC over `wsl.exe`'s pipe.

## 5. Tool list evidence

Claude Desktop's tools panel surfaced exactly seven OCN tools, with the Host's slug normalisation applied (`mcp__<server>__<tool-name-with-dots-as-underscores>`):

| Host slug | OCN canonical name | Allowed? |
| --- | --- | --- |
| `mcp__ocn__navigator_where_am_i` | `navigator.where_am_i` | ✅ allowed |
| `mcp__ocn__navigator_brief` | `navigator.brief` | ✅ allowed |
| `mcp__ocn__navigator_run_gate` | `navigator.run_gate` | ✅ allowed |
| `mcp__ocn__navigator_create_artifact` | `navigator.create_artifact` | ✅ allowed |
| `mcp__ocn__navigator_capture_log` | `navigator.capture_log` | ✅ allowed |
| `mcp__ocn__navigator_detect_sop_version` | `navigator.detect_sop_version` | ✅ allowed |
| `mcp__ocn__navigator_generate_next_prompt` | `navigator.generate_next_prompt` | ✅ allowed |

The slug-vs-canonical mapping is a Host-side display convention (Claude Desktop replaces `.` with `_` in tool names because dots are reserved separators in the MCP tool-id namespace). It does not change the underlying tool name as advertised by the OCN MCP server.

**Forbidden tools — confirmed absent:**

| Tool name | Host status |
| --- | --- |
| `navigator.advance_phase` | not available ✅ |
| `navigator.capture_decision` | not available ✅ |
| `navigator.reset_project` | not available ✅ |
| `navigator.force_release_lock` | not available ✅ |

The MCP tool registry's whitelist (`src/mcp/tools/index.ts` `ALLOWED_TOOLS`) is enforced at the Host boundary as designed (CLAUDE.md §4.8): state advancement, decision capture, project reset, and lock release remain CLI-only / human-only.

## 6. Tool-call evidence

Every block below is the verbatim Host transcript — no editing, no summarisation.

### 6.1 `navigator.where_am_i`

Input:

```json
{ "projectRoot": "/tmp/ocn-mcp-demo" }
```

Raw output:

```json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "OCN Local OCN Project — state_discovery / step_project_brief",
    "zh": "OCN Local OCN Project — state_discovery / step_project_brief"
  },
  "data": {
    "project": {
      "projectId": "local-project",
      "name": "Local OCN Project",
      "tier": "minimal",
      "sopProfileId": "default-ai-coding-sop",
      "sopProfileVersion": "0.1.0"
    },
    "currentStateId": "state_discovery",
    "currentStepId": "step_project_brief",
    "currentArtifactPath": "/tmp/ocn-mcp-demo/docs/00-project-brief.md",
    "nextAction": "Edit docs/00-project-brief.md, run `ocn gate` to verify, then `ocn advance` once it passes."
  }
}
```

`ok: true`, `code: OK`. Project state surfaces correctly through the Host with the same envelope the local CLI emits.

### 6.2 `navigator.brief`

Input:

```json
{ "projectRoot": "/tmp/ocn-mcp-demo" }
```

Raw output:

```json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Brief for Local OCN Project — state_discovery / step_project_brief",
    "zh": "项目简报 Local OCN Project — state_discovery / step_project_brief"
  },
  "data": {
    "project": {
      "projectId": "local-project",
      "name": "Local OCN Project",
      "tier": "minimal",
      "sopProfileId": "default-ai-coding-sop",
      "sopProfileVersion": "0.1.0"
    },
    "currentStateId": "state_discovery",
    "currentStepId": "step_project_brief",
    "currentArtifactPath": "/tmp/ocn-mcp-demo/docs/00-project-brief.md",
    "currentArtifactStatus": "pass",
    "currentObjective": "Produce docs/00-project-brief.md that passes the Step Artifact Gate (required sections present).",
    "currentBlockers": [],
    "nextActions": [
      "Edit docs/00-project-brief.md to fill all required sections (run `ocn doc create project-brief` for a template).",
      "Run `ocn gate` to verify the artifact gate.",
      "Run `ocn advance` once the gate passes."
    ],
    "aiGovernanceReminder": "AI must NOT mark a blocked artifact as complete. AI must NOT advance project state. AI must NOT mutate .ocoding/state.json directly. AI must NOT modify SOP profile content without an explicit Decision Log entry.",
    "uncertaintyPolicy": "If data is insufficient, AI must explicitly state \"数据不足\" or \"需要人工确认\" rather than guess. Never fabricate facts about state, artifacts, or gate results."
  }
}
```

`ok: true`, `code: OK`. Brief includes the AI governance reminder and uncertainty policy verbatim — exactly the artefacts an external coding agent needs to resume work without re-reading docs (the OCN core promise).

### 6.3 `navigator.run_gate`

Input:

```json
{ "projectRoot": "/tmp/ocn-mcp-demo" }
```

Raw output:

```json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Step step_project_brief passed the artifact gate.",
    "zh": "step step_project_brief 已通过步骤产物门禁。"
  },
  "data": {
    "status": "pass",
    "currentStateId": "state_discovery",
    "currentStepId": "step_project_brief",
    "artifactPath": "docs/00-project-brief.md",
    "missingRequiredSectionIds": []
  }
}
```

`ok: true`, `code: OK`, gate `pass`. Read-only — `state.json` was not mutated by the Host call (read-only contract per CLAUDE.md §4.7). The artifact path matches the SOP-resolved path for the current step (P1-002 + P1-003 reaching the Host correctly).

### 6.4 `navigator.where_am_i` with invalid `projectRoot`

Input:

```json
{ "projectRoot": "../not-a-valid-project" }
```

Raw output:

```json
{
  "ok": false,
  "code": "ERR_IO_OR_CONFIG",
  "message": {
    "en": "projectRoot must be an absolute path (got: ../not-a-valid-project).",
    "zh": "projectRoot 必须是绝对路径（当前值：../not-a-valid-project）。"
  },
  "error": {
    "code": "ERR_IO_OR_CONFIG",
    "message": {
      "en": "projectRoot must be an absolute path (got: ../not-a-valid-project).",
      "zh": "projectRoot 必须是绝对路径（当前值：../not-a-valid-project）。"
    }
  },
  "data": {
    "reason": "invalid-project-root"
  }
}
```

`ok: false`, `code: ERR_IO_OR_CONFIG`. The structured failure surfaced as an OCN tool-level rejection (P1-001 reaching the Host correctly), not as a JSON-RPC transport error or a server crash. The Host received a normal envelope and treated the call as completed-with-failure rather than a connection problem.

## 7. Protocol cleanliness

Verbatim Host observation from prompt 7:

> **MCP protocol error observed:** none
> **JSON-RPC framing error observed:** none
> **stderr pollution observed:** none
> **server crash / restart observed:** none
>
> Raw host observation: All four tool calls returned well-formed JSON envelopes with the OCN `{ ok, code, message: { en, zh }, data, ... }` shape. The invalid-projectRoot call surfaced as a tool-level structured error (`ok:false`, `ERR_IO_OR_CONFIG`) rather than a transport-level failure — schemas loaded successfully via ToolSearch and every subsequent invocation succeeded at the protocol layer. No reconnects, no malformed frames, no extraneous output observed.

The "stderr pollution" check is particularly important here: OCN's MCP server uses `silentAuditFallbackLogger` at construction time (`src/mcp/server.ts:32`) precisely because stderr is repurposed by the stdio JSON-RPC framing channel. Any uncaptured `safeAudit` write would corrupt the protocol stream and the Host would have surfaced framing errors. None did.

## 8. Result matrix

| Check | Expected | Observed | Result |
| --- | --- | --- | --- |
| Host loaded `ocn` MCP server | `ocn` server starts via `wsl.exe -e node …/dist/mcp/index.js` | server registered, tools enumerated | ✅ Pass |
| 7 allowed tools visible | full `ALLOWED_TOOLS` list | all 7 present (§5) | ✅ Pass |
| 4 forbidden tools absent | `advance_phase`, `capture_decision`, `reset_project`, `force_release_lock` not exposed | all 4 not available (§5) | ✅ Pass |
| `navigator.where_am_i` succeeds | `ok: true`, `code: OK`, project state resolved | matches (§6.1) | ✅ Pass |
| `navigator.brief` succeeds | `ok: true`, `code: OK`, governance reminder + uncertainty policy present | matches (§6.2) | ✅ Pass |
| `navigator.run_gate` succeeds | `ok: true`, `code: OK`, gate `pass`, no state mutation | matches (§6.3) | ✅ Pass |
| Invalid `projectRoot` returns structured failure | `ok: false`, `code: ERR_IO_OR_CONFIG`, no transport error, no crash | matches (§6.4) | ✅ Pass |
| No MCP protocol error | none | none (§7) | ✅ Pass |
| No JSON-RPC framing error | none | none (§7) | ✅ Pass |
| No stderr pollution | none | none (§7) | ✅ Pass |
| No server crash / restart | none | none (§7) | ✅ Pass |

11 / 11 checks pass.

## 9. Verdict

**Pass.** Claude Desktop in Cowork mode loaded the OCN MCP stdio server from WSL2 successfully, enumerated the canonical 7-tool allowlist, executed three success-path calls and one structured-failure-path call, and observed no protocol-layer issues. The server-side P1 fix train (P1-001 / P1-002 / P1-003 / P1-004) is observable end-to-end through a real Host:

- **P1-001** is observable in §6.4 — the structured `ERR_IO_OR_CONFIG` for an invalid `projectRoot` is exactly the contract the P1-001 PR (#27) introduced.
- **P1-002** is observable in §6.3 — the gate fired against `step_project_brief` (the *current* step), not `step_prd`. Pre-P1-002 this would have been `ERR_STATE_MACHINE`.
- **P1-003** is observable in §6.1 / §6.2 — the resolved `currentArtifactPath` matches `docs/00-project-brief.md`, derived via the canonical SOP profile that `ocn init` now persists.
- **P1-004** is observable in §6.1 / §6.2 / §6.3 — the project's `sopProfileVersion: "0.1.0"` is read consistently across calls; the MCP server registers itself with `version: PACKAGE_VERSION` (i.e. `0.1.0-alpha.2`) at construction.

## 10. Caveat decision

The DEC-005 caveat — *"External MCP Host Validation pending."* — was introduced in 2026-04-29 because no MCP Host had been validated. This report's Pass verdict satisfies that condition **for Claude Desktop only**.

**For active user-facing docs (`README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`):** the caveat is replaced with a Host-scoped statement of completion, e.g.

> MCP Host validation completed for Claude Desktop on Windows with WSL2. Cursor and Cline remain unverified.

**For historical artifacts (`docs/reports/*`, `docs/plans/*`, `docs/20-decision-log.md` body of DEC-005 / DEC-007 / DEC-008 / DEC-009 / DEC-012 / DEC-013 / DEC-014 / DEC-015 / DEC-016):** the caveat **stays verbatim** because those documents record the state-of-the-world at the time they were written. Rewriting them would falsify the audit trail.

The closure is recorded as **DEC-017** (this PR). DEC-018 (also this PR) authorises beta candidate preparation but does not authorise beta promotion; that remains gated on its own future DEC.

## 11. Follow-up

Explicitly **not** authorised by this report:

- **Cursor compatibility claim.** Not validated; future DEC required before any docs may say "verified in Cursor".
- **Cline compatibility claim.** Same.
- **HTTP/SSE MCP transport.** Out of scope for v1.0 stdio surface.
- **Beta promotion.** See DEC-018 — this report unblocks beta-candidate-preparation, not beta itself.
- **`latest` dist-tag promotion.** Still on `0.1.0-alpha.0`; deliberate per DEC-008 / DEC-012 / DEC-015 / DEC-016.

Re-validation triggers (any of the following warrants re-running this validation before claiming Claude Desktop compatibility on a new release):

- A material change to `src/mcp/server.ts` (transport, instructions string, audit silencing, registration loop).
- A material change to the MCP tool registry (`src/mcp/tools/index.ts` `ALLOWED_TOOLS` or `FORBIDDEN_TOOLS`).
- A non-trivial Claude Desktop version upgrade after which the Host's tool-loading behaviour is observed to differ.
- A change in the `wsl.exe -e node …` invocation path (e.g. switching to a packaged binary).

Re-validation is a re-run of the §5–§7 prompts against a fresh disposable project, not a doc-only update.
