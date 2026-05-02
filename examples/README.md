# OCN Examples｜OCN 示例

This directory contains small, inspectable OCN example projects.

## Current status

- **`plan-to-verify/`** — present. **Primary SOP 0.2.0 example.** Compact, executable walkthrough that covers all 19 wired SOP 0.2.0 steps from `step_project_brief` through `step_final_build_verdict` (docs 00–18) — i.e. the full Plan → Build → Verify mainline. See [`plan-to-verify/README.md`](./plan-to-verify/README.md) and the smoke under `plan-to-verify/scripts/smoke.sh`.
- **`discovery-to-plan/`** — present. Legacy demo retained for continuity. Walks docs 00–09 only and was authored against the original SOP 0.1.0 wired-step set; the smoke still passes against the SOP 0.2.0 runtime because the 0.2.0 templates / fixtures contain the additive headings 0.1.0 expected. New users should prefer `plan-to-verify/` for end-to-end coverage.
- MCP Host validation is **scoped**: Claude Desktop on Windows with WSL2 is validated per [DEC-017](../docs/20-decision-log.md) and [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](../docs/reports/2026-04-30-mcp-external-host-validation-report.md). **Cursor and Cline are not yet verified** per [DEC-019](../docs/20-decision-log.md). Examples in this directory must not claim support for unverified Hosts.

## Planned next examples

Future examples (out of scope for the current implementation PR) are:

- A domain-flavoured "real" example after a Cursor or Cline validation closure DEC widens the Host support boundary.
- A SHIP / REFLECT walkthrough once those states acquire wired steps in a future SOP profile version.

Each future example requires its own implementation PR with the same constraints (no `.ocoding/` committed; Host claims scoped to validated Hosts only; no `npm publish` side effects).

## Plan

Full directory structure, content policy, phasing (F1 → F4), DEC constraints, risks, and follow-up decisions are recorded in:

- [`docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`](../docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md)

## What this directory is NOT

- Not a replacement for [`README.md`](../README.md).
- Not a replacement for [`docs/quickstart.md`](../docs/quickstart.md).
- Not the mini-CRM dogfood track (that work is deferred behind its own DEC).
- Not a Cursor / Cline host-compatibility statement. Examples may name Claude Desktop on Windows with WSL2 as validated, but must not claim Cursor or Cline verified compatibility until each Host has its own validation report following the [DEC-017](../docs/20-decision-log.md) pattern.
