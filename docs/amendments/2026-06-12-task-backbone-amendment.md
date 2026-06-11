# Amendment AM-007 — Task Backbone (BUILD-state implementation task loop, SOP 0.5.0)

**Status**: Accepted (implementation authorized — DEC-032)

## Date

2026-06-12

## Supersedes

None (additive: new SOP minor + new cross-artifact gate + new CLI surface).

## Applies to

- `docs/06-api-contract.md` — new commands `ocn task list`, `ocn task check [<id>]`;
  new advance transition rule (out of `state_build`).
- `docs/05-data-model.md` — new machine projection `.ocoding/task-ledger.json`;
  audit taxonomy gains `task_completed`.
- SOP profile content — **SOP 0.5.0**: `step_build_plan` gains required section
  `section_task_specs`; build-plan template gains the `## Task Specs｜任务规格`
  machine-parseable block. 0.4.0 frozen + importable.
- `src/types/task.ts`, `src/core/task/*`, `src/cli/commands/task.ts` (new);
  `src/core/gate/gate-runner.ts`, `src/core/advance/advance-state.ts`,
  `src/core/execution-navigator/next-prompt*`, `src/core/brief.ts`,
  `src/core/templates/build-plan*`, `src/core/sop/loader.ts` (modified).

## Context

The fourth false-completion class — receipt-only completion and its terminal
run-through form — surfaced in the Lattice dogfood (full evidence in
`docs/task-backbone-proposal.md` §1). The engine validated BUILD receipts'
sections, never the reality behind them; `next-prompt` never authorized
coding; an entire SOP round nearly completed with zero implementation.

## Divergence

Per DEC-032: build plans carry machine-parseable task specs (mini-specs with
AC traceability and a per-task deterministic verify command); the build-plan
gate validates six hard defects and freezes verify commands into
`.ocoding/task-ledger.json`; `/ocn-next` dispatches pending tasks in
`state_build`; completion is decided only by `ocn task check` running the
frozen command (no manual-done channel); leaving `state_build` is blocked
while tasks are pending. Ledger-absent projects (≤0.4.0 pins) keep legacy
behavior end-to-end.

## Verification

Unit + CLI suites under `tests/*/task-*` (parser defects, freeze/drift,
dispatch, transition gate) + Lattice second-round dogfood as the live site.
