# OCN Examples｜OCN 示例

This directory contains small, inspectable OCN example projects.

## Current status

- **`discovery-to-plan/`** — present. Compact, executable example that walks an OCN project from `state_discovery` through `state_plan` using the documented CLI surface. See [`discovery-to-plan/README.md`](./discovery-to-plan/README.md) and the smoke script under `discovery-to-plan/scripts/smoke.sh`.
- MCP Host validation is **scoped**: Claude Desktop on Windows with WSL2 is validated per [DEC-017](../docs/20-decision-log.md) and [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](../docs/reports/2026-04-30-mcp-external-host-validation-report.md). **Cursor and Cline are not yet verified** per [DEC-019](../docs/20-decision-log.md). Examples in this directory must not claim support for unverified Hosts.

## Planned next examples

Per the original PR F plan, the next examples (out of scope for the current implementation PR) are:

- A second flow-style example walking SPEC → BUILD once `state_build` step IDs land in a future SOP profile version.
- A domain-flavoured "real" example after a Cursor or Cline validation closure DEC widens the Host support boundary.

Each future example requires its own implementation PR with the same constraints (no `.ocoding/` committed; Host claims scoped to validated Hosts only; no `npm publish` side effects).

## Plan

Full directory structure, content policy, phasing (F1 → F4), DEC constraints, risks, and follow-up decisions are recorded in:

- [`docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`](../docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md)

## What this directory is NOT

- Not a replacement for [`README.md`](../README.md).
- Not a replacement for [`docs/quickstart.md`](../docs/quickstart.md).
- Not the mini-CRM dogfood track (that work is deferred behind its own DEC).
- Not a Cursor / Cline host-compatibility statement. Examples may name Claude Desktop on Windows with WSL2 as validated, but must not claim Cursor or Cline verified compatibility until each Host has its own validation report following the [DEC-017](../docs/20-decision-log.md) pattern.
