# OCN Examples｜OCN 示例

This directory will contain small, inspectable OCN example projects.

## Current status

- `examples/` is **planned but not yet populated** with a full executable example.
- External MCP Host Validation is **pending** per [DEC-005](../docs/20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available).
- Do **NOT** treat this directory as dogfood evidence or as a verified-host showcase.

## Planned first example

- **`examples/discovery-to-plan/`** — a compact, domain-neutral OCN project that demonstrates the workflow from DISCOVERY through PLAN. Not yet present; lands in a follow-up implementation PR (Phase F2 → F3 in the plan below).

## Plan

Full directory structure, content policy, phasing (F1 → F4), DEC-003 / DEC-005 constraints, risks, and follow-up decisions are recorded in:

- [`docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`](../docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md)

## What this directory is NOT

- Not a replacement for [`README.md`](../README.md).
- Not a replacement for [`docs/quickstart.md`](../docs/quickstart.md).
- Not the mini-CRM dogfood track (that work is deferred behind its own DEC).
- Not a host-compatibility statement. Until [PR D](../docs/plans/2026-04-28-ga-prep-gap-review-plan.md#33-mcp-usage-external-host-validation) completes, no example may claim Claude Desktop / Cursor / Cline verified compatibility.
