# Plan to Verify Example｜从计划到验证

This example shows a SOP 0.2.0 OCN project moving from **DISCOVERY** all
the way through **VERIFY** using the documented CLI surface and the
bundled SOP profile. It is the SOP 0.2.0 sibling of
[`examples/discovery-to-plan/`](../discovery-to-plan/) and is the
**primary** example of OCN's strong-gated workflow now that the runtime
default has been cut over to `default-ai-coding-sop@0.2.0`.

> Validated with Claude Desktop on Windows with WSL2 (per
> [DEC-017](../../docs/20-decision-log.md) and
> [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](../../docs/reports/2026-04-30-mcp-external-host-validation-report.md)).
> Cursor and Cline are not yet verified.

## What this example demonstrates

- `ocn init` — bootstraps `.ocoding/` against SOP 0.2.0 (8 states, 19
  wired steps; `state.json.project.sopProfileVersion = "0.2.0"`).
- `ocn status` — read-only snapshot of the current state, step, and
  artifact path.
- `ocn check` — current-step generic; resolves the artifact and required
  sections from `state.json` + the active 0.2.0 profile.
- `ocn gate` — read-only gate aggregation against the current step;
  same dispatch as `ocn check`, distinct exit code.
- `ocn advance` — runs the gate, then advances to the next step on pass.
  Lock-protected. Emits a full audit chain with a shared `correlationId`.
- The full Plan → Build → Verify mainline: every required-section gate
  in `00-project-brief.md` through `18-final-build-verdict.md` is
  exercised in one hermetic temp project.
- Documented terminal behavior: after `step_final_build_verdict`, a
  further `ocn advance` returns `ERR_STATE_MACHINE` because SHIP /
  REFLECT remain stubs in 0.2.0.

## Project flavour

The fixtures describe a **Mini Task Tracker CLI** (`mtt`) — a small,
single-binary local task tracker. The flavour is intentionally
small-and-plausible so each artifact has realistic content under every
required heading without becoming long.

## Directory layout

```
examples/plan-to-verify/
├── README.md                              # this file
├── docs/                                  # 19 example artifact fixtures
│   ├── 00-project-brief.md                # state_discovery / step_project_brief
│   ├── 01-scope.md                        # state_spec      / step_scope
│   ├── 02-prd.md                          # state_spec      / step_prd
│   ├── 03-acceptance-criteria.md          # state_spec      / step_acceptance_criteria
│   ├── 04-technical-architecture.md       # state_design    / step_technical_architecture
│   ├── 05-information-architecture.md     # state_design    / step_information_architecture
│   ├── 06-data-model.md                   # state_design    / step_data_model
│   ├── 07-api-contract.md                 # state_design    / step_api_contract
│   ├── 08-test-strategy.md                # state_design    / step_test_strategy
│   ├── 09-mvp-plan.md                     # state_plan      / step_mvp_plan
│   ├── 10-build-plan.md                   # state_plan      / step_build_plan
│   ├── 11-implementation-log.md           # state_build     / step_implementation_log
│   ├── 12-change-evidence.md              # state_build     / step_change_evidence
│   ├── 13-integration-notes.md            # state_build     / step_integration_notes
│   ├── 14-verification-report.md          # state_verify    / step_verification_report
│   ├── 15-acceptance-mapping.md           # state_verify    / step_acceptance_mapping
│   ├── 16-failure-fix-log.md              # state_verify    / step_failure_fix_log
│   ├── 17-regression-evidence.md          # state_verify    / step_regression_evidence
│   └── 18-final-build-verdict.md          # state_verify    / step_final_build_verdict
└── scripts/
    └── smoke.sh                           # end-to-end runner against a temp project
```

There is intentionally no committed `.ocoding/` directory — `ocn init`
generates that fresh inside the smoke's temp project so the walkthrough
is hermetic.

## Run the smoke

```bash
# from the repo root
npm run build                                    # only needed once per source change
bash examples/plan-to-verify/scripts/smoke.sh
```

The script:

1. Allocates a hermetic temp project under `mktemp -d` (cleaned on exit;
   nothing under `examples/`, `~/.ocoding`, or `~/.npm-global` is
   touched).
2. Runs `ocn init --tier minimal` and asserts `sopProfileVersion=0.2.0`.
3. Copies this directory's `docs/` into the temp project's `docs/`.
4. Loops 19 times — at each step it runs `ocn status`, `ocn check`,
   `ocn gate`, then `ocn advance`. The 19th advance is expected to fail
   with exit code `3` and `code: "ERR_STATE_MACHINE"` because
   `step_final_build_verdict` is the terminal step in 0.2.0.
5. Prints the final state / step and asserts it is
   `state_verify / step_final_build_verdict`.

### Expected result

The walk passes through **all 19 wired SOP 0.2.0 steps**:

| # | State           | Step                           | Artifact                          |
| - | --------------- | ------------------------------ | --------------------------------- |
| 1 | state_discovery | step_project_brief             | docs/00-project-brief.md          |
| 2 | state_spec      | step_scope                     | docs/01-scope.md                  |
| 3 | state_spec      | step_prd                       | docs/02-prd.md                    |
| 4 | state_spec      | step_acceptance_criteria       | docs/03-acceptance-criteria.md    |
| 5 | state_design    | step_technical_architecture    | docs/04-technical-architecture.md |
| 6 | state_design    | step_information_architecture  | docs/05-information-architecture.md |
| 7 | state_design    | step_data_model                | docs/06-data-model.md             |
| 8 | state_design    | step_api_contract              | docs/07-api-contract.md           |
| 9 | state_design    | step_test_strategy             | docs/08-test-strategy.md          |
| 10 | state_plan     | step_mvp_plan                  | docs/09-mvp-plan.md               |
| 11 | state_plan     | step_build_plan                | docs/10-build-plan.md             |
| 12 | state_build    | step_implementation_log        | docs/11-implementation-log.md     |
| 13 | state_build    | step_change_evidence           | docs/12-change-evidence.md        |
| 14 | state_build    | step_integration_notes         | docs/13-integration-notes.md      |
| 15 | state_verify   | step_verification_report       | docs/14-verification-report.md    |
| 16 | state_verify   | step_acceptance_mapping        | docs/15-acceptance-mapping.md     |
| 17 | state_verify   | step_failure_fix_log           | docs/16-failure-fix-log.md        |
| 18 | state_verify   | step_regression_evidence       | docs/17-regression-evidence.md    |
| 19 | state_verify   | step_final_build_verdict       | docs/18-final-build-verdict.md    |

Final output ends with:

```
Plan-to-verify smoke completed
```

## Non-goals

- This is **not** a production project template.
- This does **not** validate Cursor or Cline (Claude Desktop only — see
  DEC-019 for the support boundary).
- This does **not** publish anything to npm.
- This does **not** promote `latest`.
- This does **not** authorise GA or any release.
- This does **not** invoke any MCP Host. The smoke exercises the CLI
  surface only; MCP Host validation is covered by DEC-017 for Claude
  Desktop.
- The Build (10–13) and Verify (14–18) artifacts contain **illustrative
  example evidence** for a hypothetical Mini Task Tracker project; they
  document the shape required by SOP 0.2.0 rather than recording any
  command this OCN example actually ran.

## Related artifacts

- [`docs/plans/2026-05-02-sop-0.2-strong-gated-build-verify-plan.md`](../../docs/plans/2026-05-02-sop-0.2-strong-gated-build-verify-plan.md) — the SOP 0.2.0 plan that scopes the 19-step mainline.
- [`docs/reports/2026-05-02-sop-0.2-runtime-cutover-full-flow.md`](../../docs/reports/2026-05-02-sop-0.2-runtime-cutover-full-flow.md) — PR 4 runtime-cutover report.
- [`examples/discovery-to-plan/`](../discovery-to-plan/) — the legacy 0.1.0-era walkthrough covering docs 00-09.
