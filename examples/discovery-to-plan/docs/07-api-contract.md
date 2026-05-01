# API Contract｜API 契约

> Step: `step_api_contract` (artifact-only in v1.0 SOP — gate auto-passes when this file exists).
> Part of the `examples/discovery-to-plan/` walkthrough.

## CLI surface｜CLI 表面

The example project's surface is the OCN CLI itself, not a domain API. The walkthrough exercises:

- `ocn init` — creates `.ocoding/` and `docs/`.
- `ocn status` — pull-mode, no audit emission.
- `ocn doc create <type>` — writes the bundled template, emits `artifact_created`.
- `ocn check` — current-step generic (P1-002), exits `0` on pass / `2` on `ERR_ARTIFACT_INVALID`.
- `ocn gate` — read-only, exits `0` on pass / `1` on `ERR_GATE_FAILED`, never mutates `state.json`.
- `ocn advance` — gate then state transition; lock-protected; full audit chain via shared `correlationId`.

## MCP surface｜MCP 表面

Out of scope for this example. The MCP allowed-tools whitelist (`ALLOWED_TOOLS` in `src/mcp/tools/index.ts`) is validated against Claude Desktop on Windows with WSL2 in `docs/reports/2026-04-30-mcp-external-host-validation-report.md`. Cursor and Cline remain unverified per DEC-019.

## Notes

A real project at this step would specify endpoints, request/response shapes, error codes, and versioning. This file documents OCN's own CLI surface as the demonstration target — appropriate for a project whose subject *is* the OCN workflow.
