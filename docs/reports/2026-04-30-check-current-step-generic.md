# Check Current Step Generic (P1-002)｜`ocn check` 当前步骤泛化

> Date: 2026-04-30
> Audit reference: `docs/reports/2026-04-30-post-alpha-codex-audit.md` §3 P1-002
> Caveat: External MCP Host Validation pending. PR D not started, no real Claude Desktop / Cursor / Cline verification has been performed.

---

## 1. Summary

Closes P1-002 from the post-alpha Codex audit. `ocn check` previously short-circuited to `ERR_STATE_MACHINE` for any `currentStepId !== "step_prd"`, even though both the README (§6) and the cross-cutting documentation describe it as "check the current step's artifact". The check command now resolves the current step's artifact path and required sections from `state.json` + the active SOP profile, exactly the way `ocn gate`, `ocn status`, and `ocn brief` already did. PRD-flavoured bilingual messages are preserved unchanged so the existing acceptance contract for `step_prd` keeps holding.

```
state_discovery / step_project_brief    before: ERR_STATE_MACHINE   after: pass | blocked
state_discovery / step_scope             before: ERR_STATE_MACHINE   after: pass | blocked
state_spec      / step_prd               unchanged: pass | blocked (legacy messages preserved)
state_spec      / step_acceptance_*      before: ERR_STATE_MACHINE   after: pass | blocked
state_design    / step_technical_*       before: ERR_STATE_MACHINE   after: pass | blocked
state_*         / unknown step           before: ERR_STATE_MACHINE   after: ERR_STATE_MACHINE (with stable bilingual message)
```

No bump, no publish, no dist-tag change. The "External MCP Host Validation pending" caveat is preserved.

## 2. Codex P1-002 finding (verbatim from audit report)

```
Finding:
  ocn check still assumes step_prd rather than checking the current step generically.

Evidence:
  src/core/check.ts:29
  README.md:160

Impact:
  For steps other than PRD, check may return ERR_STATE_MACHINE while docs imply
  current-step checking. The CLI surface is dishonest about what it actually does
  and fails for the very first step (state_discovery / step_project_brief).

Recommendation:
  Make checkCurrentArtifact current-step aware, using state.json + SOP loader to
  resolve the current artifact and required sections.

Suggested PR:
  fix/check-current-step-generic
```

## 3. Implementation

`src/core/check.ts` — `checkCurrentArtifact` is now SOP-driven instead of PRD-driven:

1. Read `state.json` (preserves the existing not-init / invalid-state error mapping).
2. Reject `currentStepId` not present in `profile.stateOrder × profile.stepsForState(...)` with `ERR_STATE_MACHINE` (a new private helper `isKnownStep` walks the profile's state map; the `SopProfile` interface itself was not extended — keeping this PR minimal).
3. Use `profile.requiredSectionsForStep(stepId)` for the gate definition.
4. Use `profile.artifactPathForStep(stepId)` for the file path. When `null` (BUILD/VERIFY/SHIP/REFLECT step stubs in v1.0 — currently unreachable but reserved), emit `gate_run` + `gate_passed` and return `ok` with `status: "not_applicable"` so the contract mirrors `runGate`.
5. Emit `artifact_gate_run` then either `artifact_gate_blocked` or `artifact_gate_passed`. `relatedArtifactIds` is now derived from the step ID (`step_X` → `artifact_X`) instead of the hard-coded literal `["artifact_prd"]`. The convention matches every artifact registered in `src/core/templates/index.ts`.
6. CommandResult envelope shape (`{ artifactPath, status, missingRequiredSectionIds }`) is unchanged — adding `not_applicable` to the status union is the only schema-visible change, and only on a code path that didn't previously exist.

### Bilingual messages

`step_prd` keeps the verbatim Skeleton Spike strings the existing CLI/integration tests pin against (pass message; "PRD missing required section: Scenarios." special case for the lone-Scenarios path; pluralised PRD message for ≥2 missing; "PRD not found at … Run `ocn doc create prd` first."). All other steps get a generic bilingual template:

- pass: ``Step ${stepId} passed the artifact check.`` / ``step ${stepId} 已通过步骤产物检查。``
- blocked sections: ``Step ${stepId} is missing required sections: ${ids.join(", ")}.``
- artifact missing (with hint): ``Artifact for step ${stepId} not found at ${path}. Run \`ocn doc create ${docHint}\` first.`` — the doc hint is derived from the artifact filename (`docs/00-project-brief.md` → `project-brief`), so the user is always pointed at the *correct* `ocn doc create` subcommand and never at `prd` for a non-PRD step.

### Why not delegate to `runGate`?

`runGate` returns `ERR_GATE_FAILED` (exit 1) for blocks; `ocn check` historically returns `ERR_ARTIFACT_INVALID` (exit 2). The two contracts are intentionally distinct — `gate` is the gate engine, `check` is the artifact-validation surface — and existing tests (`tests/cli/gate.test.ts`, `tests/cli/check.test.ts`) pin both. Delegating would have broken backward compatibility. The shared logic (SOP lookup, `parseHeadings`, `computeArtifactGateStatus`, audit emission) is reused without merging the two CLI surfaces.

## 4. Behaviour before / after

| Scenario | Before | After |
| --- | --- | --- |
| `state_discovery / step_project_brief` + valid `00-project-brief.md` | `ERR_STATE_MACHINE` | `OK` (status `pass`) |
| `state_discovery / step_project_brief` + missing `Success Criteria` | `ERR_STATE_MACHINE` | `ERR_ARTIFACT_INVALID` with `missingRequiredSectionIds: ["section_success_criteria"]` |
| `state_discovery / step_project_brief` + no file | `ERR_STATE_MACHINE` | `ERR_ARTIFACT_INVALID` + bilingual hint to run `ocn doc create project-brief` |
| `state_spec / step_prd` (any sub-case) | unchanged | unchanged — verbatim PRD messages and exit codes |
| `state_design / step_technical_architecture` + valid file | `ERR_STATE_MACHINE` | `OK` (status `pass`) |
| `currentStepId = step_made_up` (hand-edited state) | `ERR_STATE_MACHINE` (generic SoP-Spike-only message) | `ERR_STATE_MACHINE` (clear "Unknown step …" bilingual message) |
| Project not initialised | `ERR_IO_OR_CONFIG` | unchanged |
| `state.json` invalid | `ERR_STATE_MACHINE` | unchanged |

## 5. Steps covered (resolves correctly via SOP)

`step_project_brief`, `step_scope`, `step_prd`, `step_acceptance_criteria`, `step_technical_architecture` — all five v1.0 steps that have required sections defined in `src/core/sop/loader.ts`.

`step_information_architecture`, `step_data_model`, `step_api_contract`, `step_test_strategy`, `step_mvp_plan` — the SOP profile resolves their artifact paths but defines no required sections yet, so any non-empty artifact passes (existing PR #4 behaviour); these steps no longer hard-fail with `ERR_STATE_MACHINE`.

## 6. Tests added (9 new; full suite 424 → 433 passing, zero regressions)

`tests/unit/core-check.test.ts` (5 new under a new `current-step generic` describe block):

- passes `step_project_brief` when all required sections exist
- blocks `step_project_brief` with missing `Success Criteria` (asserts the *generic* bilingual wording)
- blocks `step_project_brief` when the file is missing entirely (asserts the doc-create hint suggests `project-brief`, NOT `prd`)
- returns `ERR_STATE_MACHINE` for an unknown `currentStepId` (`step_made_up`)
- regression: passes for `step_project_brief` while explicitly proving `docs/02-prd.md` does not exist

`tests/cli/check.test.ts` (4 new under a new `P1-002` describe block, exercising the built CLI through `spawnOcn`):

- `ocn check --json` passes `step_project_brief` after `ocn doc create project-brief`, with `currentStep`-shaped envelope
- `ocn check --json` blocks `step_project_brief` with exit 2 when the artifact is missing
- `ocn check --json` blocks `step_project_brief` with exit 2 when only one required section is missing
- regression: end-to-end pass for `step_project_brief` while asserting `docs/02-prd.md` does not exist on disk

The existing `step_prd` describe block was left untouched — backward-compatibility is the point.

## 7. CLI smoke

```
$ TMP=$(mktemp -d) && cd "$TMP"
$ node /home/timou/repos/OCN/dist/cli/index.js init
OCN initialized at /tmp/... (tier=minimal).
Current State: state_discovery
Current Step:  step_project_brief

$ node /home/timou/repos/OCN/dist/cli/index.js doc create project-brief --overwrite
Created project-brief template at /tmp/.../docs/00-project-brief.md.

$ node /home/timou/repos/OCN/dist/cli/index.js check --json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Step step_project_brief passed the artifact check.",
    "zh": "step step_project_brief 已通过步骤产物检查。"
  },
  "data": {
    "artifactPath": "/tmp/.../docs/00-project-brief.md",
    "status": "pass",
    "missingRequiredSectionIds": []
  }
}
```

## 8. Local validation

```
npm run lint           PASS
npm run typecheck      PASS
npm run test           PASS (433 / 433)
npm run test:coverage  PASS — overall 82.7% (≥80% threshold)
npm run build          PASS
```

`src/core/check.ts` line coverage is 70.25%. Uncovered lines are the `not_applicable` branch (no v1.0 step yields a null artifact path) and the non-`ENOENT` IO rethrow guard. Both are intentionally defensive and reachable only on filesystem failure modes that are not synthesizable inside vitest without low-level mocking. Adding a brittle mock would not increase the gate's strength against the actual P1-002 regression net.

## 9. Non-goals (deliberately out of scope)

- No changes to `package.json` version / name.
- No `npm publish`, no dist-tag changes, no `latest` promotion.
- No git tag, no GitHub release.
- No P1-003 work (`docs/reports/2026-04-30-post-alpha-codex-audit.md` §3 P1-003: persisted SOP snapshot vs runtime profile divergence is a separate PR).
- No README update — README §6 line 160 already describes `ocn check` as "Check the current step's artifact against its required sections", which is now finally honest. No quickstart update — the only check-relevant line (§Step 4) was already step-agnostic.
- No new MCP tools, no removed MCP tools, no `ErrorCode` enum changes.
- No `runGate` refactor. The two surfaces (`gate` returns `ERR_GATE_FAILED`, `check` returns `ERR_ARTIFACT_INVALID`) remain distinct as documented.
- No SopProfile interface extension (an internal `isKnownStep` helper avoids widening the public profile API).
- External MCP Host Validation remains **pending**. This PR makes `ocn check` honest for every step; it does not validate against any real MCP host.
- No PR D, no beta promotion.
