# Examples F2/F3 — Discovery to Plan

> Date: 2026-05-01
> Branch: `docs/examples-discovery-to-plan`
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified per DEC-019. This PR does not change Host validation status.

---

## 1. Summary

Adds an executable `examples/discovery-to-plan/` example, fulfilling the **F2 (skeleton)** and **F3 (executable)** phases of `docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md` in a single PR. Resolves the DEC-018 beta candidate prerequisite "Examples F2/F3" with end-to-end smoke evidence: the example walks an OCN project from `state_discovery / step_project_brief` through every step the v1.0 SOP profile defines, all gates passing, terminating cleanly at `state_plan / step_mvp_plan`.

| Field | Value |
| --- | --- |
| Example path | `examples/discovery-to-plan/` |
| Files added | README + 10 doc fixtures + `.ocoding.example/README.md` + `scripts/smoke.sh` (13 new files) |
| Smoke verdict | **Pass** — walked all 10 enumerated steps; `advance` reached the documented terminal stop condition cleanly |
| Source / test code changes | **none** |
| `package.json` / `package-lock.json` changes | **none** |
| Workflow changes | **none** |
| Caveat impact | none. Claude Desktop validation status (DEC-017) unchanged; Cursor / Cline still unverified per DEC-019. |
| npm | no publish, no version bump, no dist-tag movement, no `latest` promotion. |

## 2. DEC basis

| Reference | Bearing |
| --- | --- |
| **DEC-018** — Begin Beta Candidate Preparation. Lists "Complete examples F2/F3 with an executable example project" as prerequisite #3. | This PR is that prerequisite. |
| **DEC-019** — Beta Host Support Boundary (Claude Desktop only; Cursor / Cline not yet verified). | The example's README and the in-repo `examples/README.md` use the canonical scoped wording from DEC-019. No example file claims Cursor or Cline compatibility. |
| **DEC-017** — Close Claude Desktop MCP Host validation caveat. | The example may state "Validated with Claude Desktop on Windows with WSL2" because it's true for the OCN MCP server. The smoke itself does not invoke an MCP Host — it exercises the CLI surface only. |
| `docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md` | Constraints honoured: §5 (`.ocoding.example/` not `.ocoding/`), §6 (mandatory bilingual headings, every required heading present, no committed runtime artefacts), RR-F-5 (typed-step fixtures derived verbatim from `src/core/templates/*.ts` via `ocn doc create`). |

## 3. Example structure

```
examples/discovery-to-plan/
├── README.md                                # narrative + run instructions
├── docs/                                    # 10 example artifact fixtures
│   ├── 00-project-brief.md                  # state_discovery / step_project_brief — typed gate
│   ├── 01-scope.md                          # state_discovery / step_scope          — typed gate
│   ├── 02-prd.md                            # state_spec      / step_prd            — typed gate
│   ├── 03-acceptance-criteria.md            # state_spec      / step_acceptance_*   — typed gate
│   ├── 04-technical-architecture.md         # state_design    / step_technical_*    — typed gate
│   ├── 05-information-architecture.md       # artifact-only
│   ├── 06-data-model.md                     # artifact-only
│   ├── 07-api-contract.md                   # artifact-only
│   ├── 08-test-strategy.md                  # artifact-only
│   └── 09-mvp-plan.md                       # artifact-only — last enumerated step in v1.0
├── .ocoding.example/                        # explainer; NO real OCN state committed
│   └── README.md                            #   why .ocoding/ itself is intentionally absent (RR-F-6)
└── scripts/
    └── smoke.sh                             # end-to-end runner against a temp project
```

### Fixture provenance

The five typed-gate fixtures (`00-project-brief.md` through `04-technical-architecture.md`) are copied **verbatim from the bundled templates** (`src/core/templates/*.ts`), generated via `ocn doc create <type> --overwrite` in a scratch directory at this commit. This satisfies the plan's RR-F-5 (Risk: example docs drift from bundled templates): if the bundled templates change, the smoke surfaces drift immediately because the gates re-validate the fixtures end-to-end.

The five artifact-only fixtures (`05-information-architecture.md` through `09-mvp-plan.md`) have no bundled template in v1.0 (those steps are gate-auto-pass when their artifact file exists). They are minimal but realistic markdown that documents what each step's output is in this walkthrough.

### `.ocoding.example/` policy

Per the plan's §5, the directory is named `.ocoding.example/` (NOT `.ocoding/`) so a user accidentally running `ocn init` from inside the example directory does not corrupt bundled state. The directory contains only a `README.md` explaining the shape of `.ocoding/` without committing any runtime artefacts (no `state.json`, no `sop.yaml`, no `audit/`, no `.lock`). The real `.ocoding/` is generated freshly by `ocn init` inside the smoke's `mktemp -d` temp project.

## 4. Smoke behaviour

`scripts/smoke.sh` (executable, `set -euo pipefail`):

1. **Resolves the repo root** from the script's own location and asserts `dist/cli/index.js` exists. Prints a clear "run `npm run build` first" error and exits `64` if the dist isn't present (no implicit build).
2. **Allocates a hermetic temp project** under `mktemp -d -t ocn-discovery-to-plan-XXXXXX`. Cleaned by an `EXIT` trap. Nothing under `examples/` or the user's environment is modified.
3. **Runs `ocn init --tier minimal`** in the temp project — fresh `state_discovery / step_project_brief` start.
4. **Copies this directory's `docs/` into the temp project's `docs/`**, replacing the bundled templates with the example fixtures.
5. **Walks the SOP profile end-to-end** in a `MAX_STEPS=12` loop:
   - `ocn check --json` (read-only, exits `0` on pass).
   - `ocn gate --json` (read-only, exits `0` on pass).
   - `ocn status --json` extracted via a one-liner Node JSON parser to detect a no-op advance (defensive — protects against an infinite loop if the SOP profile ever exposes a self-loop).
   - `ocn advance --json`. Any non-zero exit (e.g. the documented terminal `ERR_STATE_MACHINE`) breaks the loop cleanly — `if ! …` keeps `set -e` from killing the script.
6. **Prints the final `ocn status`** before exiting.
7. **Prints `Discovery-to-plan smoke completed.`** as the closing line.

The script does **not** install anything globally, does **not** invoke `npm`, does **not** touch the user's `~/.npm-global` prefix, does **not** modify the example directory, and does **not** invoke any MCP Host.

## 5. Validation

### Local smoke (this PR's branch)

The smoke walked **all 10 enumerated steps** in the v1.0 SOP profile:

| Iteration | Step | check | gate | advance | next step |
| --- | --- | --- | --- | --- | --- |
| 1 | `step_project_brief` | ✅ pass | ✅ pass | ✅ ok | `step_scope` |
| 2 | `step_scope` | ✅ pass | ✅ pass | ✅ ok | `step_prd` |
| 3 | `step_prd` | ✅ pass | ✅ pass | ✅ ok | `step_acceptance_criteria` |
| 4 | `step_acceptance_criteria` | ✅ pass | ✅ pass | ✅ ok | `step_technical_architecture` |
| 5 | `step_technical_architecture` | ✅ pass | ✅ pass | ✅ ok | `step_information_architecture` |
| 6 | `step_information_architecture` | ✅ pass | ✅ pass | ✅ ok | `step_data_model` |
| 7 | `step_data_model` | ✅ pass | ✅ pass | ✅ ok | `step_api_contract` |
| 8 | `step_api_contract` | ✅ pass | ✅ pass | ✅ ok | `step_test_strategy` |
| 9 | `step_test_strategy` | ✅ pass | ✅ pass | ✅ ok | `step_mvp_plan` |
| 10 | `step_mvp_plan` | ✅ pass | ✅ pass | ⛔ `ERR_STATE_MACHINE` (terminal — documented stop) | — |

The smoke broke out of the loop at the documented terminal step and printed the final status (`state_plan / step_mvp_plan`) before exiting `0`. Final line: `Discovery-to-plan smoke completed.`

### Local checks

```
$ npm run build       → emits dist/, makes cli/mcp entrypoints executable
$ npm run lint        → clean
$ npm run typecheck   → clean
$ npm run test        → 449 / 449 pass (unchanged from main)
```

Coverage was not re-measured because the example does not affect any coverage-tracked file: `src/`, `tests/`, and `package.json` are all untouched by this PR.

### What the smoke proves about the released alpha

Every published P1 fix is observable in the example's smoke output:

- **P1-001** — gates emit structured envelopes (no transport-level crashes); `advance` returns a structured terminal `ERR_STATE_MACHINE` rather than throwing.
- **P1-002** — `ocn check` resolves the current step (e.g. `step_information_architecture` in iteration 6) instead of hard-coding `step_prd`.
- **P1-003** — fresh `ocn init` in the temp project writes `sop.yaml` / `gates.yaml` / `artifacts.yaml` aligned with the runtime profile, so the artifact-only steps (5-9) gate correctly because their artifact paths are resolvable.
- **P1-004** — `ocn --version` and the embedded version metadata stay aligned with `package.json`.

## 6. Non-goals

The following are confirmed **not** to have happened during this PR:

- ❌ **No `npm publish`, no `npm version`, no `npm dist-tag` change, no `latest` promotion.**
- ❌ **No git tag, no GitHub release.**
- ❌ **No source code change.** `src/` is byte-for-byte identical to `main`.
- ❌ **No test change.** `tests/` is byte-for-byte identical to `main`. The smoke script is in `examples/`, not `tests/`, and is not wired into the vitest suite or CI.
- ❌ **No `.github/workflows/*` change.** The smoke is not a CI fixture in this PR (CI fixturing was the F3 plan's stretch goal but is appropriately deferred — see §7).
- ❌ **No `package.json` / `package-lock.json` change.** No new script, no new dependency.
- ❌ **No `README.md` / `docs/quickstart.md` / `docs/mcp-usage.md` change** (top-level user-facing docs). The F4 phase ("Try the example" section in `README.md`) is deferred to a follow-up PR.
- ❌ **No claim that Cursor or Cline is verified** anywhere in the example, the example README, or the report. Both Hosts remain explicitly unverified per DEC-019.
- ❌ **No `.ocoding/` directory committed under `examples/`** (RR-F-6 honoured). Only `.ocoding.example/README.md` (explainer) is committed.
- ❌ **No MCP Host invocation.** The smoke exercises the CLI surface only.
- ❌ **No beta promotion.** This evidence checks one DEC-018 prerequisite; beta promotion remains gated.

## 7. Follow-up

DEC-018 prerequisite progress after this PR merges:

- ✅ **CI Node 22 matrix expansion** (PR #35).
- ✅ **Host support boundary** (PR #36 / DEC-019).
- ✅ **`npm install -g` smoke evidence** (PR #37 / `docs/reports/2026-05-01-npm-global-install-smoke.md`).
- ✅ **Examples F2 / F3** (this PR).
- ⬜ **`latest`-tag strategy DEC** (when / whether to move `latest` off `0.1.0-alpha.0`).
- ⬜ **Doc audit for accidental beta language** before beta promotion.
- ⬜ **Beta promotion DEC** (final gate).

Optional, not gating beta:

- **F4 — README / quickstart integration.** A future PR can add a "Try the example" section to `README.md` and a backlink from `docs/quickstart.md` §6. Deliberately deferred so this PR stays inside the `examples/` and `docs/reports/` surfaces.
- **CI fixturing of the smoke.** Plan §11 RR-F-1 / RR-F-5 suggested wiring the smoke as a CI check that fails if the bundled templates drift. This is the natural follow-up: a small `tests/e2e/example-discovery-to-plan.test.ts` that calls into `scripts/smoke.sh` (or its core logic) so the matrix CI re-runs it on every PR. Out of scope for this PR (would require a `tests/` change and possibly a `package.json` script — both forbidden by this PR's scope).
- **Cursor real-Host validation** in a separate future PR (DEC-017-style scoped report + closure DEC). Cursor remains unverified per DEC-019.
- **Cline real-Host validation** in a separate future PR (same pattern).

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
