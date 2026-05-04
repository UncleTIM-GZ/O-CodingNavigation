# Execution Navigator — GitHub PR Analysis (MVP 2)

**Date**: 2026-05-02
**DEC basis**: [DEC-024 — Reframe BUILD / VERIFY as Execution Evidence Navigator](../20-decision-log.md#dec-024reframe-build--verify-as-execution-evidence-navigator)
**Plan reference**: [`docs/plans/2026-05-02-execution-evidence-navigator-plan.md`](../plans/2026-05-02-execution-evidence-navigator-plan.md)
**Prior PRs**:

- [Execution Navigator — Command Skeleton (PR 1)](./2026-05-02-execution-navigator-command-skeleton.md)
- [Execution Navigator — Local Git Status (MVP 1)](./2026-05-02-execution-navigator-local-git-status.md)

**Branch**: `feat/execution-navigator-github-pr-analysis`

---

## 1. Summary

`ocn github analyze-pr <number>` graduates from skeleton to a real **read-only GitHub PR evidence reader**. The command queries `gh pr view --json ...` for PR metadata, commits, files-changed, check-rollup summary, and review state, then renders a structured CommandResult envelope that mirrors the MVP 1 shape. A deterministic analysis layer derives `status`, `riskFlags`, and a single `nextSuggestedAction` sentence.

The other four Execution Navigator commands (`evidence map`, `next-prompt`, `verify status`, `verdict draft`) remain skeleton with `implemented: false`. There is **no GitHub mutation**, **no full CI log ingestion** (only the rollup summary that comes back from `gh pr view --json`), **no `.ocoding/execution` write**, **no project-state mutation**, and **no next-prompt generation**.

---

## 2. DEC basis

DEC-024 follow-up sequence step **3** — *"Read-only GitHub PR analysis MVP — `ocn github analyze-pr <number>` (PR metadata, commits, files changed, CI checks, review comments), via `gh` CLI or GitHub API, no mutation."* PR 1 (skeleton) shipped step 1; PR 2 (local-git evidence) shipped step 2. PR 3 (this PR) implements step 3.

The PR honours every DEC-024 non-goal: no `npm publish`, no `latest` movement, no GA, no Cursor / Cline validation claim, no SOP gate change, no MCP tool addition, no removal of `0–10` strong gates, no `.github/workflows/*` change.

---

## 3. Evidence collected

When `gh` is available and authenticated, `data` reports:

### `pr` — PR metadata

| Field              | Source                                        |
| ------------------ | --------------------------------------------- |
| `number`           | `gh pr view --json number`                    |
| `title`            | `gh pr view --json title`                     |
| `body`             | `gh pr view --json body`                      |
| `state`            | `gh pr view --json state` (OPEN/CLOSED/MERGED)|
| `url`              | `gh pr view --json url`                       |
| `author`           | `gh pr view --json author` → flattened to `login` |
| `headRefName`      | `gh pr view --json headRefName`               |
| `baseRefName`      | `gh pr view --json baseRefName`               |
| `isDraft`          | `gh pr view --json isDraft`                   |
| `mergeable`        | `gh pr view --json mergeable`                 |
| `mergeStateStatus` | `gh pr view --json mergeStateStatus`          |

### `changes` — change-volume summary

| Field          | Source                                           |
| -------------- | ------------------------------------------------ |
| `changedFiles` | length of `gh pr view --json files`              |
| `additions`    | sum of per-file additions                        |
| `deletions`    | sum of per-file deletions                        |
| `files[]`      | `{ path, additions, deletions, changeType }`     |

### `commits` — PR commit list

`gh pr view --json commits` → array of `{ oid, messageHeadline }`. Larger commit bodies are discarded.

### `checks` — check-rollup summary

`gh pr view --json statusCheckRollup` → `{ summary, total, passed, failed, pending, items[] }`. The `summary` enum collapses the rollup:

- `success` — every check `COMPLETED` with `SUCCESS` / `NEUTRAL` / `SKIPPED`.
- `failure` — any check completed with `FAILURE` / `CANCELLED` / `TIMED_OUT` / `ACTION_REQUIRED` / `STARTUP_FAILURE`.
- `pending` — any check in `QUEUED` / `IN_PROGRESS` / `WAITING` / `PENDING`, or completed with unknown conclusion.
- `none` — no checks configured for this PR.
- `mixed` — defensive catch-all.

### `reviews` — review counts

`gh pr view --json reviews` → `{ total, approved, changesRequested, commented }`. Individual review records are NOT emitted to keep the envelope small.

### `ocn` — local OCN project state

Same shape as MVP 1: `isOcnProject`, `sopProfileId`, `sopProfileVersion`, `currentStateId`, `currentStepId`. Read via `readOcnProjectState` (no lock acquired, no backup written).

### `warnings`

Defensive parsing emits `warnings[]` when fields are missing or shaped unexpectedly. Examples: `"reviews-field-unavailable"`, `"files-field-unavailable"`, `"checks-field-unavailable"`, `"gh-output-not-json"`, `"pr-number-missing"`, `"gh-stderr:..."`, `"gh-error:..."`.

---

## 4. Analysis rules (deterministic, no LLM)

### Status priority (resolved top-down)

| # | Condition                                                                  | `status`             |
| - | -------------------------------------------------------------------------- | -------------------- |
| 1 | `pr.state === "MERGED"`                                                    | `merged`             |
| 2 | `pr.state === "CLOSED"`                                                    | `closed`             |
| 3 | `pr.isDraft === true`                                                      | `draft`              |
| 4 | `checks.summary === "failure"`                                             | `blocked`            |
| 5 | `pr.mergeStateStatus ∈ {DIRTY, BLOCKED, BEHIND}`                            | `blocked`            |
| 6 | `checks.summary === "pending"`                                             | `pending-ci`         |
| 7 | `reviews.changesRequested > 0`                                             | `blocked`            |
| 8 | `checks.summary === "success"` and not blocked above                       | `ready-to-review`    |
| 9 | `checks.summary === "none"`                                                | `needs-human-review` |
| 10| fallback                                                                   | `needs-human-review` |

### Risk flags (all that apply, append-only)

- `draft-pr` — `pr.isDraft`
- `closed-pr` — `pr.state === "CLOSED"`
- `merge-conflict-or-unclean` — `pr.mergeStateStatus ∈ {DIRTY, BLOCKED, BEHIND}`
- `ci-failing` — `checks.summary === "failure"`
- `ci-pending` — `checks.summary === "pending"`
- `no-checks-found` — `checks.summary === "none"`
- `changes-requested` — `reviews.changesRequested > 0`
- `no-review-yet` — `reviews.total === 0` AND `pr.state === "OPEN"` AND not `pr.isDraft`
- `large-diff` — `changes.additions + changes.deletions > 1000`
- `many-files-changed` — `changes.changedFiles > 20`
- `source-change-without-test-change` — any file in `src/**` and no file in `tests/**`
- `test-change-without-source-change` — any file in `tests/**` and no file in `src/**`
- `docs-only-change` — every changed file classifies as docs (`docs/**`, `README.md`, `examples/**`)
- `workflow-changed` — any file in `.github/**`
- `package-metadata-changed` — `package.json` or `package-lock.json` changed

### `nextSuggestedAction`

Stable English imperative sentences keyed by status:

| Status               | Sentence                                                                              |
| -------------------- | ------------------------------------------------------------------------------------- |
| `merged`             | "PR already merged — run \`ocn exec status\` on the merged branch."                   |
| `closed`             | "PR is closed without merge — review history if context is needed."                   |
| `draft`              | "Mark PR ready for review when implementation is complete."                           |
| `blocked` + ci-failing | "Investigate failing CI checks before requesting review."                           |
| `blocked` + changes-requested | "Address review feedback (changes requested) before merging."                  |
| `blocked` (other)    | "Resolve blockers (failing CI, requested changes, or merge conflicts) before review." |
| `pending-ci`         | "Wait for CI to complete, then re-run analysis."                                      |
| `ready-to-review`    | "Review changed files against acceptance criteria before merge."                      |
| `needs-human-review` | "Ask a human reviewer to inspect the PR — automated signals are inconclusive."        |

---

## 5. CLI behavior

```
ocn github analyze-pr 123
ocn github analyze-pr 123 --json
ocn github analyze-pr 123 --project-root /abs/path
```

Validation:

- `<number>` must be a positive integer; non-positive or non-numeric input returns `ERR_ARTIFACT_INVALID` (exit 2). The runner is NOT invoked when validation fails.
- Default `--project-root` = `process.cwd()`; non-absolute → `ERR_IO_OR_CONFIG` (exit 4) before the runner is invoked.

Text mode prints a ~12-line block: PR header (number + title), state (with draft marker), author, head→base, mergeable / mergeStateStatus, change volume, checks summary, reviews summary, top 3 risk flags, OCN current step (if available), and a single-line `Next:` action. Bilingual top-line message — Chinese first when locale is `zh`.

JSON mode emits the full structured envelope.

### Error envelopes

Every known error returns a structured CommandResult with `command: "github.analyze_pr"`, `implemented: true`, `noMutation: true`, `prNumber` set:

| Reason             | Code                | Exit | Bilingual headline                                                              |
| ------------------ | ------------------- | ---- | ------------------------------------------------------------------------------- |
| `gh-not-found`     | `ERR_IO_OR_CONFIG`  | 4    | "GitHub CLI (gh) is required for PR analysis but was not found." / "PR 分析需要 GitHub CLI（gh），但当前环境未找到。" |
| `gh-auth-required` | `ERR_IO_OR_CONFIG`  | 4    | "GitHub CLI is not authenticated. Run \`gh auth login\` and retry." / "GitHub CLI 未认证。请运行 \`gh auth login\` 后重试。" |
| `pr-not-found`     | `ERR_IO_OR_CONFIG`  | 4    | "PR #\<n> was not found in this repository." / "在当前仓库中未找到 PR #\<n>。" |
| `gh-query-failed`  | `ERR_IO_OR_CONFIG`  | 4    | "GitHub PR query failed; see warnings for details." / "GitHub PR 查询失败，请查看 warnings。" |

---

## 6. Non-mutation guarantee

- **No GitHub mutation.** The runner spawns `gh` only with `auth status` and `pr view --json ...`. The `defaultGhRunner` includes a defence-in-depth allowlist that refuses any other leading-pair argv. No `gh pr merge` / `pr edit` / `pr comment` / `pr review` / `pr close` / `pr reopen` / `issue edit` / `issue create` / `api -X POST|PATCH|PUT|DELETE`.
- **No git mutation.** No `git push` / `pull` / `fetch` / `commit` / `checkout` / `add` / `merge` / `rebase` / `reset` etc. are spawned from this PR's code. The local-git reader from MVP 1 stays read-only as before.
- **No `.ocoding/execution` directory creation.** Tests assert the directory does not exist after each command run.
- **No `.ocoding/.lock` acquisition.** The state.json reader is a read-only inspector inherited from MVP 1.
- **No CI log body ingestion.** Only the check rollup summary that comes back from `gh pr view --json statusCheckRollup` is consumed.
- **No new MCP tool.** The MCP whitelist is unchanged.
- **No SOP / required-section / gate change.** The 0.2.0 strong-gated planning chain is untouched.
- **No new npm dependency.** All gh invocation is via Node `child_process.execFile`.
- **No `package.json` / `package-lock.json` / `.github/workflows/*` / `README.md` / `docs/quickstart.md` / `docs/mcp-usage.md` / `docs/20-decision-log.md` / `src/sops/**` change.**

A unit test (`source code static check — no forbidden gh / git mutation references`) reads each new source file and asserts none of the forbidden literal substrings (e.g. `"merge"`, `"edit"`, `"comment"`, `"review"`, `git push`, `git commit`, `--method POST|PATCH|PUT|DELETE`) appear in the source.

A CLI test snapshots `.ocoding/execution` non-existence after every invocation path.

---

## 7. Tests

### Unit (`tests/unit/execution-navigator-github-pr.test.ts`)

22 tests across three describe blocks plus a static-check block:

- `parsePrMetadata` / `parsePrFiles` / `parsePrCommits` / `parsePrChecks` / `parsePrReviews` — flatten author.login; aggregate change volume; normalise `changeType`; degrade missing fields with `warnings[]`; classify checks (success / failure / pending / none); aggregate reviews (approved / changesRequested / commented).
- `analyzeGithubPr` happy path & analysis status — happy path resolves to `ready-to-review` with `no-review-yet` flag; failed checks → `blocked` + `ci-failing`; pending checks → `pending-ci` + `ci-pending`; draft → `draft` + `draft-pr`; many files / large diff raises both flags; source-without-test raises flag; docs-only raises flag and suppresses source-without-test; changes-requested → `blocked` + `changes-requested` with the dedicated next-action sentence.
- `analyzeGithubPr` error envelopes — `gh-not-found`, `gh-auth-required`, `pr-not-found` (with `prNumber` echoed and bilingual message), malformed gh JSON → `gh-query-failed` with `gh-output-not-json` warning.
- `source code static check` — asserts the new source files contain none of the forbidden gh write literals (`"merge"`, `"edit"`, `"comment"`, `"review"`, `"close"`, `"reopen"`), no `git push|pull|fetch|commit|checkout|add` strings, and no `--method POST|PATCH|PUT|DELETE`.

### CLI (`tests/cli/execution-navigator-github-pr.test.ts`)

9 spawn-based tests using a JSON-fixture runner injected via `OCN_TEST_GH_RUNNER_FIXTURES`:

1. Validation failure on `analyze-pr abc --json` → exit 2, `ERR_ARTIFACT_INVALID`, runner NOT invoked.
2. Validation failure on `analyze-pr 0 --json` → exit 2.
3. Happy path with fixture stdout → `implemented: true`, structured PR / changes / checks / analysis fields present.
4. Text mode prints `PR:`, `State:`, `Branch:`, `Mergeable:`, `Checks:`, `Next:` lines.
5. `gh-not-found` envelope from ENOENT fixture → exit 4, reason `gh-not-found`, prNumber echoed.
6. `gh-auth-required` envelope from auth-status stderr fixture → exit 4, reason `gh-auth-required`.
7. `pr-not-found` envelope from `Could not resolve to a PullRequest` stderr → exit 4, reason `pr-not-found`, bilingual message contains the PR number.
8. Non-absolute `--project-root` → exit 4 BEFORE the runner is invoked.
9. No `.ocoding/execution` directory created after command runs.

### Skeleton parity tests updated

- `tests/unit/execution-navigator-skeleton.test.ts` — narrowed to the four remaining skeleton commands (`evidence.map`, `next_prompt`, `verify.status`, `verdict.draft`). The `EVIDENCE_SOURCES_PLANNED["github.analyze_pr"]` entry is retained as `["github"]` because that table tracks the *external* evidence universe per command; the entry survives even after a command graduates.
- `tests/cli/execution-navigator-skeleton.test.ts` — removed the `github analyze-pr` skeleton-shape CLI test (now covered by the new CLI test file) and removed `github analyze-pr` from the `.ocoding/execution` non-creation sweep (its own CLI test file asserts the same invariant). The validation-failure CLI test for `analyze-pr abc` remains because the validation pre-check is part of the same code path before and after the command graduates.

### Targeted run

```
$ npx vitest run tests/unit/execution-navigator-skeleton.test.ts \
                tests/cli/execution-navigator-skeleton.test.ts
11 / 11 pass

$ npx vitest run tests/unit/execution-navigator-local-git.test.ts \
                tests/cli/execution-navigator-local-git.test.ts
36 / 36 pass

$ npx vitest run tests/unit/execution-navigator-github-pr.test.ts \
                tests/cli/execution-navigator-github-pr.test.ts
31 / 31 pass
```

### Full suite

```
$ npm run test
728 / 728 pass across 86 files
```

### Lint / typecheck / build

```
$ npm run lint        # clean
$ npm run typecheck   # clean
$ npm run build       # clean
```

### Coverage

`npm run test:coverage` reports for `src/core/execution-navigator/`:

- `github-pr.ts` — 84.87 % statements, 63.63 % branches, 100 % functions.
- `github-pr-parse.ts` — 88.76 % statements, 67.16 % branches, 100 % functions.
- `github-pr-analysis.ts` — 87.90 % statements, 75.00 % branches, 100 % functions.
- `github-pr-runner.ts` — 14.81 % statements (only the spawn path is uncovered; tests inject a fake runner that bypasses the real `execFile` shell, which is the correct test posture for a runner abstraction).
- `local-git.ts` — 95.20 % (unchanged from MVP 1).
- `exec-status.ts` — 84.93 % (unchanged from MVP 1).
- `skeleton.ts` — 100 %.

Uncovered branches are defensive degradation paths (malformed JSON, unexpected gh stderr shapes, ENOENT after auth probe) that have direct unit test coverage on the orchestrator's classification logic.

### Manual smoke

```
$ node dist/cli/index.js github analyze-pr 63 --json | jq '.data.analysis, .data.checks, .data.reviews'
analysis: { "status": "merged",
            "riskFlags": ["large-diff"],
            "nextSuggestedAction": "PR already merged — run `ocn exec status` on the merged branch." }
checks:   { "summary": "success", "total": 2, "passed": 2, "failed": 0, "pending": 0, ... }
reviews:  { "total": 0, "approved": 0, "changesRequested": 0, "commented": 0 }

$ node dist/cli/index.js github analyze-pr 63
已收集 GitHub PR 证据。
GitHub PR evidence collected.

PR: #63 feat(exec): collect local git status evidence
State: MERGED
Author: UncleTIM-GZ
Branch: feat/execution-navigator-local-git-status -> main
Mergeable: UNKNOWN / UNKNOWN
Changes: 11 files, +1360 -56
Checks: success (total 2, passed 2, failed 0, pending 0)
Reviews: total 0, approved 0, changes-requested 0, commented 0
Risk flags: large-diff

Next: PR already merged — run `ocn exec status` on the merged branch.
```

The smoke ran in an authenticated environment (a `gh auth status` succeeded). The merged-PR analysis status is correctly reported with `large-diff` risk flag (1416 changed lines > 1000 threshold). No GitHub mutation; no CI log body ingestion; no working-tree mutation.

---

## 8. Files

Added:

- `src/core/execution-navigator/github-pr-runner.ts` — injectable `GhRunner` interface + `defaultGhRunner` (execFile-based, read-only allowlist).
- `src/core/execution-navigator/github-pr-parse.ts` — pure parsers (`parsePrMetadata`, `parsePrFiles`, `parsePrCommits`, `parsePrChecks`, `parsePrReviews`) with defensive degradation.
- `src/core/execution-navigator/github-pr-analysis.ts` — deterministic analysis (`resolveAnalysisStatus`, `buildPrAnalysis`, `bucketFiles`).
- `src/core/execution-navigator/github-pr.ts` — orchestrator (`analyzeGithubPr`).
- `tests/unit/execution-navigator-github-pr.test.ts` — 22 tests.
- `tests/cli/execution-navigator-github-pr.test.ts` — 9 tests.

Modified:

- `src/core/execution-navigator/types.ts` — added `GitHubPrReadReason`, `PrFileChangeType`, `PrChangedFile`, `PrCommitRecord`, `PrCheckRecord`, `PrChecksSummary`, `PrChecksData`, `PrReviewsData`, `PrChangesData`, `PrMetadata`, `GitHubPrAnalysisStatus`, `GitHubPrRiskFlag`, `GitHubPrAnalysis`, `GitHubPrAnalyzeData`.
- `src/cli/commands/github.ts` — wires `analyzeGithubPr`, supports `--project-root`, supports the `OCN_TEST_GH_RUNNER_FIXTURES` test-only injection hook.
- `src/cli/render/text.ts` — adds `appendGithubAnalyzePrBlock`; reuses for both ok and blocked envelopes when `command === "github.analyze_pr"`.
- `tests/unit/execution-navigator-skeleton.test.ts` — narrowed to four remaining skeleton commands.
- `tests/cli/execution-navigator-skeleton.test.ts` — drops the `github analyze-pr` skeleton-shape test (now covered by the new CLI test file) and the corresponding `.ocoding/execution` sweep entry.

Untouched (per the PR's hard rules): `package.json`, `package-lock.json`, `.github/`, `README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`, `docs/20-decision-log.md`, `src/sops/**`.

---

## 9. Follow-up

Per DEC-024 follow-up sequence step **4**, the next PR is **MVP 3: acceptance evidence mapping** for `ocn evidence map`:

- Parse ACs from `docs/03-acceptance-criteria.md`.
- Cross-reference them against PR changed-file evidence (from this MVP 2), test-file references in `docs/08-test-strategy.md`, and CI status (from MVP 2's check rollup).
- Emit AC-by-AC mapping (`covered`, `missing`, `needs-human-review`) with Evidence Links.
- The other three skeleton commands (`next-prompt`, `verify status`, `verdict draft`) remain skeleton until later sequence steps.

---

## 10. Non-goals (explicitly out of scope for this PR)

- No npm publish. No `latest` dist-tag movement.
- No git tag / GitHub release.
- No GA promotion.
- No Cursor / Cline validation claim — DEC-019 boundary stands.
- No GitHub mutation API call. No `gh pr merge|edit|comment|review|close|reopen|issue edit|issue create`. No `gh api -X POST|PATCH|PUT|DELETE`.
- No CI log body ingestion (only the check rollup summary).
- No `next-prompt` generation.
- No new MCP tool.
- No SOP 0.2.0 required-section / gate / artifact change.
- No `package.json` / `package-lock.json` / `.github/workflows/*` change.
- No `README.md` / `docs/quickstart.md` / `docs/mcp-usage.md` / `docs/20-decision-log.md` change.
- No `.ocoding/execution` directory.
- No new npm dependency.
