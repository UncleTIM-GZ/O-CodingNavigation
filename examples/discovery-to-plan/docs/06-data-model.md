# Data Model｜数据模型

> Step: `step_data_model` (artifact-only in v1.0 SOP — gate auto-passes when this file exists).
> Part of the `examples/discovery-to-plan/` walkthrough.

## Schema sketch｜模式草图

This example deliberately defers a real domain schema and uses the OCN runtime types as the demonstration data model:

| Type | Purpose | Source |
| --- | --- | --- |
| `ProjectState` | Project's runtime state container | `src/types/state.ts` |
| `RequiredSectionDef` | Section matcher definition | `src/types/artifact.ts` |
| `AuditEvent` | Event taxonomy entry | `src/types/audit.ts` |
| `BilingualMessage` | `{ en, zh }` shape | `src/types/i18n.ts` |
| `CommandResult<T>` | Result envelope for CLI + MCP | `src/types/result.ts` |

## Stable IDs｜稳定 ID

- State IDs: `state_<snake_case>` (e.g. `state_discovery`).
- Step IDs: `step_<snake_case>` (e.g. `step_data_model`).
- Section IDs: `section_<snake_case>` (e.g. `section_problem`).
- Artifact IDs: `artifact_<snake_case>` derived from step ID by replacing the `step_` prefix (e.g. `step_data_model` → `artifact_data_model`).

## Notes

A real project at this step would document its domain entities, relationships, and lifecycle. This example uses OCN's own types as a stand-in to keep the directory inspectable without inventing a domain.
