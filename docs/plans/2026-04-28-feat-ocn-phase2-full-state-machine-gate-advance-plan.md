---
title: "feat(phase2): Full State Machine + Gate + Advance"
type: feat
status: active
date: 2026-04-28
---

# feat(phase2): Full State Machine + Gate + Advance

> **Origin**: [DEC-001](../19-decision-log.md#dec-001skeleton-spike-passed-and-phase-2-entry-approved) — Phase 2 PR #4 of the approved order.
>
> **Resolves**:
> - L2 from `implementation-notes.md` (init position simplification — was deferred until full state machine landed).
> - todo 012 (P2 — `onReleased` must fire on `releaseLock` error). Pre-PR §2.1.
> - Partial todo 013 (P3 — `correlationId` field on `AuditEvent`, wired for advance flow only).
>
> **Pre-requisites**: PR #1 (Skeleton Spike), PR #2 (state-safety), PR #3 (audit foundation) all merged. Baseline: 41 test files / 204 tests / 83.03% lines coverage.

This plan mirrors `/home/timou/.claude/plans/o-codingnavigator-phase-2-generic-raccoon.md` (the user-approved plan) and is committed to the repo so future readers can trace decisions without leaving the project.

---

## 1. Overview

After PR #1-#3, OCN has lock-protected, audit-emitting state writes — but the state machine is fake. `ocn init` hardcodes `state_spec / step_prd`; `ocn check` only handles `step_prd`; there is no `ocn advance` and no path from DISCOVERY through SHIP.

PR #4 delivers the **minimum complete state machine**:
- 8 states × ~10 stable-ID steps
- Forward-only transitions (no rollback in this PR)
- `ocn gate` (read-only artifact-gate aggregation)
- `ocn advance` (gate-then-mutate with audit + lock)
- Audit events for the advance flow share a `correlationId` so downstream tools can reconstruct cause and effect

This is the PR that turns OCN from "spike-grade demo" into a credible workflow runtime. PR #5 (MCP) builds on top.

---

## 2. Pre-PR fixes (land first, in this same branch)

### 2.1 todo 012 — `onReleased` must fire even when `releaseLock` throws

**Location**: `src/core/state/lock.ts` `withLock` finally block.

**Fix**: capture release error, run `onReleased` unconditionally (errors swallowed by existing `runHook`), then re-throw the original error so callers still see the failure.

**Test**: `tests/unit/lock.test.ts` adds "calls onReleased even when fs.unlink throws a non-ENOENT error".

**Status flag**: `todos/012-complete-p2-onreleased-must-fire-on-releaselock-error.md`.

### 2.2 Audit storage path Amendment

**New file**: `docs/amendments/2026-04-28-audit-storage-path-amendment.md` — declares canonical audit paths (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`) and supersedes the older design references in `docs/05-data-model.md` / `docs/06-api-contract.md` without modifying them.

This is also the first entry establishing the `docs/amendments/` directory convention going forward.

---

## 3. Strict scope (must / must-not)

### Must implement

1. Full 8-state state machine + forward-only transitions.
2. Stable `StateId` / `StepId` map covering DISCOVERY → PLAN minimum (10 sequential steps).
3. `SopProfile` API extension: `stateOrder`, `stepsForState`, `nextStep`, `artifactPathForStep`, expanded `requiredSectionsForStep`.
4. `ocn gate` and `ocn advance` CLI commands with `--json` support.
5. Core engine: `runGate(opts)`, `advanceState(opts)`.
6. `init` change: starts at `state_discovery / step_project_brief`.
7. `check` change: dispatches by `currentStepId`.
8. `doc create` extension: 5 mandatory types — `project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`.
9. New AuditEventTypes: `advance_started`, `advance_succeeded`, `advance_failed`, `state_transitioned`. Reuse existing `artifact_gate_*` for gate emission.
10. `correlationId?: string` on `AuditEvent` (advance flow only — lock events deferred).
11. New tests (~50): state machine, gate-runner, advance-state, correlation, CLI gate/advance/doc-create-expanded.
12. Update existing tests for the new init position; e2e walks 3 advances to reach step_prd before exercising the original Skeleton Spike PRD blocked/pass invariant.

### Must NOT implement

MCP, doctor, reset, baseline, SOP versioning, production/full tier, mini-CRM dogfood, npm publish, full custom SOP profile authoring, event replay, audit rebuild, rollback transition, UI/TUI/Web, lock-event correlationId.

---

## 4. State + step map (canonical bundled SOP profile)

| State | Steps (in order) | Artifact path |
|---|---|---|
| `state_discovery` | `step_project_brief` | `docs/00-project-brief.md` |
|  | `step_scope` | `docs/01-scope.md` |
| `state_spec` | `step_prd` | `docs/02-prd.md` |
|  | `step_acceptance_criteria` | `docs/03-acceptance-criteria.md` |
| `state_design` | `step_technical_architecture` | `docs/04-technical-architecture.md` |
|  | `step_information_architecture` | `docs/05-information-architecture.md` |
|  | `step_data_model` | `docs/06-data-model.md` |
|  | `step_api_contract` | `docs/07-api-contract.md` |
|  | `step_test_strategy` | `docs/08-test-strategy.md` |
| `state_plan` | `step_mvp_plan` | `docs/09-mvp-plan.md` |
| `state_build` / `state_verify` / `state_ship` / `state_reflect` | (stub — state IDs only) | — |

Forward transitions:
```
state_discovery → state_spec → state_design → state_plan →
state_build → state_verify → state_ship → state_reflect
```

Advance from a state's last step crosses into the first step of the next state. Advance from a state with no remaining steps returns `ERR_STATE_MACHINE` "no next step".

---

## 5. Required-section rules per step (PR #4 minimum)

- `step_project_brief`: Problem, Goal, Users, Success Criteria
- `step_scope`: In Scope, Out of Scope, Technical Constraints, Completion Boundary
- `step_prd`: Problem, Goals, Users, Scenarios, Requirements (UNCHANGED from PR #1)
- `step_acceptance_criteria`: Acceptance Rules, Given When Then, Failure Conditions
- `step_technical_architecture`: Product Form, Runtime, Language, Storage, Final Decision
- All other steps: empty (gate auto-passes if artifact exists)

**Note**: `step_project_brief` uses **"Goal"** (singular) per user §XII; `step_prd` keeps **"Goals"** (plural). Both verbatim.

---

## 6. New + modified files (file-by-file)

### Files modified

| File | Why |
|---|---|
| `src/core/state/lock.ts` | §2.1 fix |
| `src/types/audit.ts` | Add 4 event types + optional `correlationId` |
| `src/core/audit/audit-event.ts` | Pass `correlationId` through factory |
| `src/core/audit/audit-markdown.ts` | Render `correlationId` in metadata block |
| `src/core/sop/loader.ts` | Extend with state/step navigation API |
| `src/types/sop.ts` | Update SopProfile interface |
| `src/core/init.ts` | Change init position |
| `src/core/check.ts` | Dispatch by `currentStepId` (drop hardcoded step_prd branch) |
| `src/core/doc.ts` | Accept 5 doc types via template registry |
| `src/cli/index.ts` | Register `gate` and `advance` commands |

### Files created

| File | Purpose |
|---|---|
| `docs/amendments/2026-04-28-audit-storage-path-amendment.md` | §2.2 |
| `src/types/state-machine.ts` | `GateStatus`, `GateResult`, `AdvanceResult` |
| `src/core/state-machine/state-machine.ts` | Pure functions: `nextStep`, `validForwardTransition` |
| `src/core/gate/gate-runner.ts` | `runGate(opts)` |
| `src/core/advance/advance-state.ts` | `advanceState(opts)` |
| `src/core/audit/correlation.ts` | `newCorrelationId()` |
| `src/core/templates/{project-brief,scope,acceptance-criteria,technical-architecture}.ts` | 4 new templates |
| `src/core/templates/index.ts` | Template registry |
| `src/cli/commands/gate.ts` | CLI `ocn gate` |
| `src/cli/commands/advance.ts` | CLI `ocn advance` |
| `tests/unit/state-machine.test.ts` | Pure transition tests |
| `tests/unit/gate-runner.test.ts` | Gate aggregation per step |
| `tests/unit/advance-state.test.ts` | Advance success/failure/no-mutation |
| `tests/unit/advance-correlation.test.ts` | correlationId invariants |
| `tests/cli/gate.test.ts` | CLI integration |
| `tests/cli/advance.test.ts` | CLI integration |
| `tests/cli/doc-create-expanded.test.ts` | 5-type doc create |

### Existing tests updated for new init position

`tests/cli/{init,status,brief,check,audit-init,audit-check}.test.ts`, `tests/e2e/skeleton-spike-demo.test.ts`, `tests/unit/core-{init,status,check,brief,doc}.test.ts`, `tests/cli/doc-create.test.ts` (verify backwards-compat for prd type).

---

## 7. AuditEvent additions

```ts
// Added to AuditEventType
"advance_started", "advance_succeeded", "advance_failed", "state_transitioned"

// Added to AuditEvent (optional)
correlationId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/).optional()  // ULID
```

### correlationId strategy

- One ULID per `ocn advance` invocation, generated at the top of `advanceState`.
- Threaded into every `safeAudit(...)` in the same flow:
  - `advance_started`
  - `artifact_gate_run` + `artifact_gate_passed` | `artifact_gate_blocked`
  - On pass: `state_transitioned` + `state_write_succeeded` + `advance_succeeded`
  - On block: `advance_failed`
- Lock events (acquired/released/timeout/stale_recovered) are **NOT** correlated in PR #4. New follow-up `OCN-PR5-001-lock-correlation`.
- Markdown audit-trail metadata block renders `correlationId: <ulid>` when present.

---

## 8. Acceptance criteria

(Verbatim from user §XVI plus cross-PR invariants)

- [ ] `onReleased` fires when `releaseLock` throws (§2.1)
- [ ] Audit path amendment doc landed (§2.2)
- [ ] `ocn init` defaults to `state_discovery / step_project_brief`
- [ ] `ocn gate` runnable; `--json` returns `GateResult`
- [ ] `ocn advance` runnable; `--json` returns advance result
- [ ] gate blocked → advance does NOT mutate state
- [ ] gate pass → advance moves to next step
- [ ] last step of state → advance moves to first step of next state
- [ ] advance emits `advance_succeeded` / `advance_failed`
- [ ] all advance-flow audit events share one `correlationId`
- [ ] `ocn doc create` accepts at least 5 types
- [ ] Original Skeleton Spike PRD blocked/pass invariant preserved (after walking to step_prd)
- [ ] All 204 prior tests still pass (with adjusted setup where needed)
- [ ] New ~50 tests pass
- [ ] `npm run lint && typecheck && build && test:coverage` green
- [ ] `implementation-notes.md` updated with §10 PR #4 addendum + L2 RESOLVED

---

## 9. Out of scope (explicit deferrals)

- Lock event correlationId — `OCN-PR5-001-lock-correlation` (new follow-up).
- todos 011, 014, 015 — keep deferred.
- BUILD/VERIFY/SHIP/REFLECT step IDs — only state IDs in PR #4.
- Rollback transitions, doctor, reset, baseline, MCP, SOP versioning, production/full tier, mini-CRM, npm publish.
- OCN-on-OCN dogfood with new SOP profile (existing OCN docs at OLD layout).

---

## 10. Verification

```bash
npm run lint && npm run typecheck && npm run build && npm run test:coverage
```

Plus manual demo: `ocn init` → `ocn advance` (blocked, missing project-brief) → `ocn doc create project-brief` → fill required sections → `ocn advance` → eventually reach step_prd → run Skeleton Spike PRD blocked/pass invariant.

Audit trail check:

```bash
cat .ocoding/audit/audit-events.jsonl | jq 'select(.correlationId)'
```

All advance-flow events share the same `correlationId`.

---

**END OF PLAN**

(Mirrors the user-approved plan at `/home/timou/.claude/plans/o-codingnavigator-phase-2-generic-raccoon.md`.)
