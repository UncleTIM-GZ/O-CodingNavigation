# 2026-05-04 — Execution Navigator MVP 6: `ocn verdict draft`

## 1. Summary

`ocn verdict draft` produces a deterministic evidence-derived verdict draft from local git, OCN state, the acceptance evidence map, verification status, and optional GitHub PR. No LLM, no mutation, no command execution. This PR closes the Execution Navigator MVP series — all six commands (`exec status`, `github analyze-pr`, `evidence map`, `next-prompt`, `verify status`, `verdict draft`) now return `implemented: true` and ship as real read-only navigators.

The command is conservative by design. It does **not** auto-decide. It produces an auditable draft to help a human decide, biasing toward `hold-for-manual-review` or `continue-work` whenever rules are ambiguous.

## 2. DEC basis

- DEC-024 (`docs/20-decision-log.md`) — reframes BUILD/VERIFY as Execution Evidence Navigator and authorises the six-command series.
- `docs/plans/2026-05-02-execution-evidence-navigator-plan.md` — overall plan.
- Prior MVP reports (the foundations this MVP composes):
  - `docs/reports/2026-05-02-execution-navigator-command-skeleton.md`
  - `docs/reports/2026-05-02-execution-navigator-local-git-status.md`
  - `docs/reports/2026-05-02-execution-navigator-github-pr-analysis.md`
  - `docs/reports/2026-05-02-execution-navigator-acceptance-evidence-map.md`
  - `docs/reports/2026-05-02-execution-navigator-next-prompt.md`
  - `docs/reports/2026-05-02-execution-navigator-verify-status.md`

## 3. Verdict categories (5)

| Category | Meaning |
|---|---|
| `continue-work` | Evidence shows verification or coverage is incomplete; keep developing before review. |
| `request-changes` | Evidence shows blocking conditions (failed CI, coverage missing, changes-requested, dirty merge state); request changes before progress. |
| `ready-for-review` | Verification ready, acceptance coverage at least partial, no failed checks; ready for a human reviewer. |
| `ready-to-merge` | All evidence supports merging; recommend merge but require human reviewer to click. |
| `hold-for-manual-review` | Evidence requires human judgement (manual-review heuristic, evidence conflicts, unavailable PR data with critical missing AC); pause automation. |

## 4. Decision rules (priority order)

Rules apply top-down. First match wins.

| Priority | Rule | Conditions |
|---|---|---|
| 1 | `hold-for-manual-review` | `acceptance.needsHumanReview > 0` OR `human-review-required` flag OR PR checks success while acceptance coverage missing OR `--mode combined` with PR data unavailable AND acceptance critically missing. |
| 2 | `request-changes` | `verification.status === "blocked"` OR PR `checks.summary === "failure"` OR `acceptance.coverageStatus === "missing"` OR PR `mergeStateStatus ∈ {DIRTY,BLOCKED,BEHIND}` OR PR `reviews.changesRequested > 0` OR `source-change-without-test-change` flag AND verification not ready. |
| 3 | `continue-work` | `verification.status === "partial"` OR working tree dirty AND verification not ready OR `--mode combined` without PR AND local repo has changed files OR `acceptance.coverageStatus === "partial"` AND no PR. |
| 4 | `ready-for-review` | `verification.status === "ready"` AND acceptance coverage `complete` or `partial` (not missing) AND no failed checks. |
| 5 | `ready-to-merge` | `--pr` provided AND PR fetched AND `state === "OPEN"` AND not draft AND `mergeable === "MERGEABLE"` AND `mergeStateStatus === "CLEAN"` AND `checks.summary === "success"` AND `failed === 0` AND `reviews.changesRequested === 0` AND acceptance coverage `complete`/`partial` AND verification ready AND no `human-review-required` AND no `working-tree-dirty`. |
| Defensive default | `continue-work` | None of Rules 1–5 matched. |

## 5. Confidence rules

| Confidence | Conditions |
|---|---|
| `high` | Verdict is `ready-to-merge` AND zero risk flags AND PR fetched successfully AND verification ready AND acceptance complete AND mode is not `local`. |
| `medium` | Verdict is `ready-for-review` or `ready-to-merge` with up to 2 non-blocking risk flags. |
| `low` | Every other case (covers all `hold-for-manual-review`, `request-changes`, `continue-work`). |

`--mode local` downgrades any would-be `high` confidence to `medium` (no PR data → cannot reach high).

## 6. Supports / blocks / warnings sentence templates

All sentence sets are sorted lexicographically before output for byte-identical determinism. Centralised in `verdict-draft-constants.ts`.

### Supports (deterministic English sentences)

- `"All required local verification scripts are available."` — when lint/typecheck/test/build all present.
- `"PR checks succeeded."` — PR `checksSummary === "success"` and `failed === 0`.
- `"PR mergeable state is clean."` — PR `mergeStateStatus === "CLEAN"` and `mergeable === "MERGEABLE"`.
- `"Acceptance coverage is complete."` / `"Acceptance coverage is partial with no missing-status criteria."`
- `"No reviews requested changes."` — when there are reviews and none requested changes.
- `"Local working tree is clean."`
- `"Verification status is ready."`

### Blocks (deterministic English sentences)

- `"PR checks include N failure(s)."` — pluralised count.
- `"PR has pending checks; results are not final."`
- `"Acceptance coverage is missing for N criterion/criteria."` — singular/plural based on count.
- `"Local working tree is dirty."`
- `"PR has pending review(s) requesting changes."`
- `"PR merge state is unclean (DIRTY/BLOCKED/BEHIND)."`
- `"`--mode pr` was used without `--pr`.`"`
- `"docs/03-acceptance-criteria.md is missing."`
- `"Verification status is blocked."` / `"Verification status is partial."`
- `"Human review is required for at least one acceptance criterion."`
- `"GitHub evidence requested but unavailable."`
- `"PR is still in draft."`

### Warnings (degraded-source structural notes)

- `github-evidence-unavailable`
- `pr-checks-unavailable`
- `no-acceptance-criteria`
- `no-local-scripts-detected`

## 7. Evidence sources

All five (one optional):

1. `local-git` — branch, head, dirty/clean, changed-files count, recent commits.
2. `ocn-state` — current state/step IDs from `.ocoding/state.json`.
3. `acceptance-map` — coverage status, covered/candidate/missing/needs-human-review counts.
4. `verify-status` — readiness verdict, required commands, missing signals, risk flags.
5. `github` (optional, only when `--pr <n>` provided AND `--mode` is `pr` or `combined`) — PR state, mergeable state, checks summary, reviews.

## 8. CLI behaviour

```
ocn verdict draft
ocn verdict draft --json
ocn verdict draft --project-root /abs/path
ocn verdict draft --pr 67
ocn verdict draft --mode local
ocn verdict draft --mode pr
ocn verdict draft --mode combined
```

Validation rules:

- `--project-root` must be absolute.
- `--mode` must be one of `local | pr | combined`.
- `--pr <n>` must be a positive integer; non-positive/non-numeric → ERR_ARTIFACT_INVALID without invoking gh.
- `--mode pr` requires `--pr <number>`; missing → ERR_ARTIFACT_INVALID.
- `--mode local` ignores `--pr` (delegated to `verify-status`, which emits a warning).

## 9. Non-mutation guarantee

Specific commitments enforced by tests:

- No writes to `.ocoding/`, `docs/`, `package.json`, or any project file (snapshot before/after equality test in unit suite).
- No `.ocoding/execution` directory creation (asserted in unit + CLI suites).
- No git mutation — code only invokes existing read-only `local-git` reader. No new spawn paths.
- No gh mutation — re-uses existing `gh-pr-runner` allowlist (`pr view`, `auth status`).
- No `npm run` or shell exec from inside the implementation.
- No LLM API call — grep confirmed no `openai`, `anthropic`, `gemini`, `fetch(`, `axios`, `http.request`, `node:https`, `undici` imports in new sources.
- GitHub runner invoked only when mode is `pr`/`combined` AND `--pr` is provided.

## 10. Tests

### `tests/unit/execution-navigator-verdict-draft.test.ts` (22 tests)

- `continue-work` from verification partial + dirty tree.
- `request-changes` from verification blocked / `coverage-missing` / PR `changesRequested > 0` / PR `mergeStateStatus === "DIRTY"`.
- `ready-for-review` from verification ready + acceptance partial + no PR.
- `ready-to-merge` from full happy path (verification ready, PR open clean, checks success, clean tree).
- `hold-for-manual-review` from acceptance `needsHumanReview > 0` and `human-review-required` flag.
- Confidence cannot be `high` in `--mode local`; `low` on continue-work / request-changes.
- `supports` and `blocks` are sorted lexicographically and contain expected sentences.
- Warnings propagated from gh failures (`github-evidence-unavailable`).
- `humanReviewRequired` matches the rules (true on hold).
- Risk flags deduplicated and sorted lexicographically.
- Determinism — identical inputs produce byte-identical JSON output.
- No `.ocoding/execution` directory creation; no project-file mutation (snapshot equality).
- `--mode local` excludes `github` from sources.
- `--mode combined` with successful PR fetch includes `github` in sources.
- Ready-to-merge supports include `Verification status is ready.`, `PR checks succeeded.`, and `PR mergeable state is clean.`
- `ready-for-review` confidence is at most `medium`.

### `tests/cli/execution-navigator-verdict-draft.test.ts` (8 tests)

- Text mode prints `Verdict:` / `Confidence:` / `Why:` / `Blocks:` / `Next:` lines.
- `--json` returns envelope with `implemented: true` and `verdict.category` set.
- `--mode local --json` excludes `github` from sources.
- `--mode combined --pr 67 --json` with mocked gh runner — `evidenceSourcesUsed` includes `github`.
- Invalid `--mode foo` → ERR_ARTIFACT_INVALID exit 2.
- Invalid `--pr abc` → ERR_ARTIFACT_INVALID exit 2 AND runner mock not called.
- `--mode pr` without `--pr` → ERR_ARTIFACT_INVALID exit 2.
- `--mode local` does not create `.ocoding/execution`.

### Updated tests

- `tests/unit/execution-navigator-skeleton.test.ts` — `SKELETON_COMMANDS` is now empty; assertion that all six commands are listed in the skeleton table.
- `tests/cli/execution-navigator-skeleton.test.ts` — `verdict draft --json` now asserts `implemented: true`.

## 11. MVP series closure

This PR completes the Execution Navigator command set. The skeleton list is empty — all six commands return `implemented: true`:

| MVP | Command | PR |
|---|---|---|
| 1 | `exec status` | #62 / #63 |
| 2 | `github analyze-pr <n>` | #64 |
| 3 | `evidence map` | #65 |
| 4 | `next-prompt` | #66 |
| 5 | `verify status` | #67 |
| 6 | `verdict draft` | (this PR) |

## 12. Follow-up

- Dogfood the full Execution Navigator loop on a real project. Walk through `exec status` → `github analyze-pr` → `evidence map` → `next-prompt` → `verify status` → `verdict draft` against an external repo and capture the gaps.
- Only after dogfood feedback should a new DEC consider broader release sync (no auto-trigger of `npm publish` / `latest` movement / GA promotion from this PR).

## 13. Non-goals

- No `npm publish` / `dist-tag` / `version` / moving `latest`.
- No git tags, GitHub releases, GA start.
- No Cursor / Cline validation claim — DEC-019 boundary stands.
- No CI log body ingestion (would require log content download — out of scope).
- No LLM, no MCP tool exposure, no MCP host changes.
- No `runGate`/`advance` semantic change, no SOP gate change.
- No `.ocoding/execution` storage.
- No `package.json` / `package-lock.json` dependency changes.
- No `.github/workflows`, `README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`, or `docs/20-decision-log.md` changes.
