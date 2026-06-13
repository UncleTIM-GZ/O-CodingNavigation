# Amendment AM-010 — Task-first in BUILD (widen the task-ledger gate to every forward advance)

**Status**: Accepted (implementation authorized — DEC-035)

## Date

2026-06-14

## Supersedes

Extends AM-007 (`docs/amendments/2026-06-12-task-backbone-amendment.md`). AM-007's
"leaving `state_build` is blocked while tasks are pending" transition rule is
**widened** to "any forward advance inside `state_build` is blocked while tasks are
pending." Engine/CLI behavior change only — **not** an SOP version bump (same
precedent as AM-008 rewind/cycle, AM-009 auto mode). MCP surface unchanged (7 tools).

## Applies to

- `docs/06-api-contract.md` — the `ocn advance` transition rule out of `state_build`
  becomes a task-first rule covering intra-`state_build` step moves as well.
- `src/core/advance/task-ledger-guard.ts`, `src/core/advance/advance-state.ts`
  (modified); `tests/unit/task-advance-gate.test.ts` (intra-build case inverted +
  unit case added).

## Context

The Lattice dogfood showed an agent in BUILD writing all three doc steps
(`implementation_log → change_evidence → integration_notes`) — walking the cursor to
the last BUILD step — while 4 implementation tasks were still `pending` in the ledger.
Only the final `ocn advance` (BUILD→VERIFY) was refused. Net effect: **receipts
(integration notes) were written before the work (tasks) was done**, and the debt was
collected late, at the state boundary. The AM-007 gate caught it, but only at the end:
a mild receipt-before-work smell the boundary-only rule permits.

Mechanically the cause was one clause in `taskLedgerGuardOrNull` —
`next.stateId === "state_build"` short-circuited the check for every intra-BUILD move,
so the cursor could out-run the (already-wired) `/ocn-next` task-dispatch loop.

## Divergence

Per DEC-035: while a task ledger exists and carries pending tasks, the cursor may not
move forward **at all** inside `state_build` — not just across the BUILD→VERIFY
boundary. This forces task-first: the operator stays on `step_implementation_log` and
drains the ledger via `/ocn-next` + `ocn task check` before any doc-step advance.

Invariants preserved:

- **Judgement still belongs to the gate.** Only the *timing* of debt collection moved
  earlier; *how* a task is judged complete is unchanged — still only `ocn task check`
  running the frozen verify command to exit 0. Nothing about completion semantics,
  the ledger schema, or the audit taxonomy changed.
- **Task-first loop already wired.** `next-prompt`/`/ocn-next` already dispatches the
  first ready pending task the moment you are in `state_build`; this amendment only
  stops the cursor from advancing past it.
- **Refusal message branches by destination.** Cross-boundary (→ VERIFY) keeps the
  AM-007 wording ("不准进入 VERIFY"); intra-BUILD uses task-first wording pointing at
  `/ocn-next` + `ocn task check`. Both stay `ERR_GATE_FAILED` (exit 1) and carry the
  `advance_failed` / `reason: "task_ledger_pending"` push-audit event with the pending ids.
- **Zero regression for ledger-absent projects.** Older pins (≤0.4.0) and pre-gate
  states have no ledger → `null` → legacy pass-through end-to-end.

## Verification

`tests/unit/task-advance-gate.test.ts` — intra-build advance now blocks (cursor
unmoved, message names `/ocn-next`), forward-after-done still walks, cross-boundary
block + ledger-absent pass-through unchanged; plus a guard unit case for the
intra-build message branch. Full suite green (lint + typecheck + 1210 tests).
