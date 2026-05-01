# MVP Plan｜MVP 计划

> Step: `step_mvp_plan` (artifact-only in v1.0 SOP — gate auto-passes when this file exists).
> Part of the `examples/discovery-to-plan/` walkthrough. This is the **last** step the v1.0 SOP profile defines; `state_build` / `state_verify` / `state_ship` / `state_reflect` exist as state IDs but their step lists are empty in v1.0 (`STEPS_BY_STATE` in `src/sops/default-ai-coding-sop/0.1.0/data.ts`).

## Phase 0 — Skeleton｜骨架

Define the smallest possible end-to-end loop that proves the workflow walks from DISCOVERY to PLAN:

- Project brief committed, gate `pass`.
- Scope committed, gate `pass`.
- PRD committed, gate `pass`.
- Acceptance criteria committed, gate `pass`.
- Technical architecture committed, gate `pass`.
- Information architecture, data model, API contract, test strategy, MVP plan committed (artifact-only gates auto-pass).

## Phase 1 — Implementation hooks｜实现入口

The example does not implement any runtime behaviour — its job is to prove the **workflow**, not the **product**. Implementation hooks belong to a real project's BUILD state, which the v1.0 SOP profile does not yet enumerate.

## Stop condition｜停止条件

The walkthrough's smoke script stops when:

- `ocn advance` reports there is no next step in the profile, **or**
- The terminal state reaches a state stub (`state_build` / etc.) with an empty step list.

In v1.0 this means the smoke terminates with the project at the end of `state_plan` / `step_mvp_plan` or just past it, depending on how `advance` handles the final transition.

## Notes

A real project at this step would commit phasing, owners, milestones, and go/no-go criteria. This example describes the walkthrough's own phasing as the demonstration target.
