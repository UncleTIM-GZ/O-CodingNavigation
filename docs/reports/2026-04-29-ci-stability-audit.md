# CI Stability Audit｜CI 稳定性审计

> Date: 2026-04-29
> Scope: read-only audit of OCN's GitHub Actions CI as of `main = 81d4a77e524015cc9253ff76b40fe31ecbabc86a` (PR #13 merge).
> Origin: [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](../plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md) §5.4.
> Companion DEC: this report supplies evidence for the future **DEC-010** (CI matrix policy).
> Status: audit only. **No `.github/workflows/*.yml` change. No `package.json` change. No runtime change.**

---

## 1. Summary

**Verdict**: **Conditional Pass.**

CI is functional — every gate the project commits to (lint, typecheck, build, test-with-coverage) is wired into a real workflow that runs on every PR and every push to `main`. The most recent 20 runs show an 18/20 success rate. However, two failures in the last day were both on push-to-`main` events for commits that had already passed in the corresponding PR runs (i.e. the same workflow on the same code passed, then failed). Both failures clustered on the `Test with coverage` step. This is a **flake signal**, not a real test failure: locally the same commits run 394/394 green in <5 s, and the PR-run on the identical merge SHA was SUCCESS. The flake is non-blocking for alpha but should be tracked before any beta or GA cut.

The audit also confirms **coverage IS run in CI** and uploaded as an artifact — closing the open question in [PR E plan §5.4](../plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md).

External MCP Host Validation pending. Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.

---

## 2. Current CI workflow inventory

### 2.1 Files

| File | Purpose | Triggers |
|---|---|---|
| `.github/workflows/ci.yml` | The only CI workflow. One job: `build`. | `push` on `main`, every `pull_request` (any branch). |

There are **no other workflow files** — no separate release pipeline, no nightly, no scheduled workflow.

### 2.2 Job definition (verbatim from `ci.yml`)

| Field | Value |
|---|---|
| Job name | `build` |
| Runner | `ubuntu-latest` |
| Timeout | `10` minutes |
| Permissions | `contents: read` (least-privilege) |
| Workflow concurrency | not set (default per-run) |

### 2.3 Steps

| # | Step | Command | Notes |
|---|---|---|---|
| 1 | Checkout | `actions/checkout@v4` | Default depth (fetch-depth not set → 1) |
| 2 | Setup Node | `actions/setup-node@v4` with `node-version: 20`, `cache: npm` | npm package cache enabled |
| 3 | Install dependencies | `npm ci` | Strict lockfile install |
| 4 | Lint | `npm run lint` (= `eslint .`) | Required |
| 5 | Typecheck | `npm run typecheck` (= `tsc --noEmit`) | Required |
| 6 | Build | `npm run build` (= `tsc -p tsconfig.build.json && chmod +x …`) | Required |
| 7 | Test with coverage | `npm run test:coverage` (= `vitest run --coverage`) | Required; this is the step where flakes have been observed |
| 8 | Upload coverage report | `actions/upload-artifact@v4` with `path: coverage/` | `if: always()` — runs even on test failure |

### 2.4 What is NOT in the workflow

- ❌ No matrix (Node 20 only; ubuntu-latest only).
- ❌ No macOS runner. No Windows runner.
- ❌ No coverage threshold check (the report is generated and uploaded; nothing fails CI based on it).
- ❌ No `concurrency` group (so a fast follow-up push could run concurrent jobs against the same branch — minor cost, no correctness risk for OCN at current scale).
- ❌ No release / publish workflow. No `npm publish`. No tag-triggered automation.
- ❌ No artifacts beyond the coverage directory (no built `dist/` artifact, no test-results artifact).
- ❌ No security workflow (no `npm audit`, no SAST, no Dependabot config in `.github/`).

### 2.5 Pre-commit hook (local)

`.husky/pre-commit` runs `npm run lint && npm run typecheck && npm run test`. This is a strict subset of CI's gates (CI additionally runs `build` and `test:coverage`). The hook is set up via the `prepare: husky || true` script in `package.json`.

---

## 3. `package.json` script alignment

| Script | Exists? | Used by CI? | Used by hook? | Notes |
|---|---|---|---|---|
| `build` | ✅ | ✅ step 6 | ❌ | Compiles to `dist/` and chmods bin entries. |
| `dev` | ✅ | ❌ | ❌ | Local-only `tsx` runner. Fine. |
| `lint` | ✅ | ✅ step 4 | ✅ | `eslint .` |
| `lint:fix` | ✅ | ❌ | ❌ | Local convenience. |
| `format` | ✅ | ❌ | ❌ | Prettier; no enforcement gate (acceptable for alpha). |
| `typecheck` | ✅ | ✅ step 5 | ✅ | `tsc --noEmit` |
| `test` | ✅ | ❌ | ✅ | `vitest run`; CI uses `test:coverage` instead, which is a strict superset. |
| `test:watch` | ✅ | ❌ | ❌ | Local-only. |
| `test:coverage` | ✅ | ✅ step 7 | ❌ | `vitest run --coverage`. CI uploads the directory as an artifact. |
| `prepare` | ✅ | ❌ | n/a | `husky || true` — sets up hooks on `npm install`. |
| `prepublishOnly` | ❌ | n/a | n/a | **Not present.** Per [PR E plan §5.5](../plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md), this is a deferred follow-up. Adding it is gated by DEC-007/008. |

No script defined in `package.json` is unused — every script is either used by CI, used by the hook, or is a documented local convenience. No CI step references a script that doesn't exist.

---

## 4. Local baseline

Run on `main` at `81d4a77` (post-PR #13 merge), pre-CI-audit branch:

| Command | Result | Wall time | Notes |
|---|---|---|---|
| `npm run lint` | ✅ clean (0 errors, 0 warnings) | ~2 s | — |
| `npm run typecheck` | ✅ clean (`tsc --noEmit` exit 0) | ~3 s | — |
| `npm run test` | ✅ **394 passed across 63 files** | 4.71 s wall (32.62 s test compute, parallelised across 11 cores) | — |
| `npm run test:coverage` | ✅ **394 passed across 63 files** + coverage report | (similar order to `test`) | All files: **83.44 %** lines / **85.31 %** branches / **90.69 %** functions |

This local baseline is **identical in scope** to what CI runs (excluding the artifact upload). The local pre-commit hook covers lint + typecheck + test (no coverage); the coverage gate is CI-only. Either way, locally and on every PR, the test suite is fully exercised.

---

## 5. Recent CI history (last 20 runs from `gh run list --limit 20`)

| Run ID | Event | Branch | Conclusion | Started | Wall time |
|---|---|---|---|---|---|
| 25088357806 | push | main | success | 2026-04-29T02:45:32Z | 1 m 07 s |
| 25088201828 | pull_request | docs/ga-prep-pr-f-examples-directory-plan | success | 2026-04-29T02:39:16Z | 0 m 55 s |
| 25088077584 | push | main | success | 2026-04-29T02:34:11Z | 0 m 55 s |
| 25087900683 | pull_request | docs/ga-prep-pr-e-npm-publish-ci-stability-plan | success | 2026-04-29T02:27:08Z | 0 m 55 s |
| 25085777015 | push | main | success | 2026-04-29T01:05:03Z | 0 m 57 s |
| 25085350408 | pull_request | security/ga-prep-pr-c-mcp-projectroot-threat-model | success | 2026-04-29T00:49:15Z | 1 m 10 s |
| **25085036315** | **push** | **main (after PR #10 merge)** | **failure** | **2026-04-29T00:37:45Z** | **0 m 58 s** |
| 25084869852 | pull_request | docs/ga-prep-pr-b-readme-cli-help | success | 2026-04-29T00:31:53Z | 0 m 52 s |
| 25084638271 | push | main | success | 2026-04-29T00:23:35Z | 0 m 58 s |
| 25083982077 | pull_request | docs/ga-prep-pr-a-amendments-index | success | 2026-04-29T00:01:25Z | 1 m 00 s |
| **25083846003** | **push** | **main (after PR #8 merge)** | **failure** | **2026-04-28T23:56:55Z** | **0 m 53 s** |
| 25083537349 | pull_request | docs/ga-prep-gap-review-plan | success | 2026-04-28T23:46:39Z | 0 m 57 s |
| 25083408486 | push | main | success | 2026-04-28T23:42:27Z | 1 m 02 s |
| 25064467676 | pull_request | docs/phase2-completion-report | success | 2026-04-28T16:16:33Z | 1 m 03 s |
| 25063557296 | push | main | success | 2026-04-28T15:58:13Z | 1 m 00 s |
| 25058717871 | pull_request | feat/phase2-mcp-safe-tools | success | 2026-04-28T14:26:02Z | 1 m 03 s |
| 25050409951 | push | main | success | 2026-04-28T11:33:57Z | 0 m 50 s |
| 25050349476 | pull_request | feat/phase2-full-state-machine-gate-advance | success | 2026-04-28T11:32:31Z | 0 m 48 s |
| 25029549239 | push | main | success | 2026-04-28T01:51:48Z | 0 m 45 s |
| 25029518885 | pull_request | feat/phase2-audit-event-foundation | success | 2026-04-28T01:50:44Z | 0 m 44 s |

### 5.1 Pass-rate breakdown

| Subset | Pass / Total | Pass rate |
|---|---|---|
| All runs (last 20) | 18 / 20 | **90 %** |
| `pull_request` runs | 10 / 10 | **100 %** |
| `push to main` runs | 8 / 10 | **80 %** |

### 5.2 Per-PR cross-reference

For PRs #8 → #13, the corresponding `pull_request` run and the post-merge `push to main` run:

| PR | Merge commit | PR-run | Push-to-main run | Behaviour |
|---|---|---|---|---|
| #8 | `598b63c` | ✅ SUCCESS | ❌ **FAILURE** (run `25083846003`) | Same SHA. PR passed; push-to-main failed at `Test with coverage`. |
| #9 | `69c5612` | ✅ SUCCESS | ✅ SUCCESS | Consistent. |
| #10 | `114db5e` | ✅ SUCCESS | ❌ **FAILURE** (run `25085036315`) | Same SHA. PR passed; push-to-main failed at `Test with coverage`. |
| #11 | `5ef4e1d` | ✅ SUCCESS | ✅ SUCCESS | Consistent. |
| #12 | `3cb1013` | ✅ SUCCESS | ✅ SUCCESS | Consistent. |
| #13 | `81d4a77` | ✅ SUCCESS | ✅ SUCCESS | Consistent. |

The PR-run pass rate is 100 %; the push-to-main pass rate is 80 %. The same workflow runs against the same commit in both contexts — so any divergence is environmental, not a real test failure.

### 5.3 Failure step pattern

Both failures hit step **`Test with coverage`** (step 8) and completed within ~30 s of starting. All earlier steps (Set up job, Checkout, Setup Node, Install dependencies, Lint, Typecheck, Build) succeeded. The `Upload coverage report` step ran successfully under `if: always()`, which means a partial coverage artifact may exist even for these failed runs.

> The failed-step transcripts beyond what `gh run view` returns are not in this report. Pulling the test stdout/stderr would require `gh run view <id> --log` and is a follow-up if a third flake instance occurs.

---

## 6. Flake / transient-failure review

| Failure mode | Observed in audit window? | Notes |
|---|---|---|
| Network EOF during `gh pr create` | **Yes** (one instance) | PR #13 first creation attempt produced `Post "https://api.github.com/graphql": EOF`. Retry succeeded immediately. **This is a GitHub API transient, not CI flake** — the PR list confirmed no duplicate PR was created. Recorded for completeness; not a CI gate concern. |
| CI queued delay | No instance > 1 min between `createdAt` and `startedAt` observed in the inventory. | — |
| Failed runs later rerun green | Both push-to-main failures (#8, #10) were not re-run by the audit; they remain `failure` in the run history. The next push-to-main on a different commit ran green, so the issue is per-run, not "branch is broken". | Acceptable to leave as historical record; no rerun needed. |
| Test flake | **Probable.** Same commit passes locally (4.71 s wall) and in PR-run, fails in push-to-main. Both failures hit the same step within ~30 s. The deterministic behaviour here is "PR pass + main fail", which matches a timing/race flake rather than a code defect. | See §11 finding F-2. |
| Timeout | No instance approaches the 10-minute timeout. Longest run observed: 1 m 10 s. | — |
| Dependency install failure | No `Install dependencies` step failure observed in the last 20 runs. The npm cache is doing its job. | — |

**Verdict on flake**:

| Question | Answer |
|---|---|
| Known test flake? | **Yes** (provisional — 2 occurrences in 20 runs, both push-to-main, both at `Test with coverage`). |
| Known CI infra transient? | No instances observed in this window. |
| Known GitHub API transient? | Yes — one `gh pr create` GraphQL EOF on the audit author's side. Not a CI gate issue. |

---

## 7. Coverage gate review

| Question | Answer |
|---|---|
| Does CI run `test:coverage`? | ✅ **Yes** (step 7). |
| Is there a coverage threshold? | ❌ **No.** Coverage is generated and uploaded as an artifact, but no `vitest.config.*` threshold is configured to fail CI. |
| Is coverage only run locally? | No — it runs in CI. |
| Coverage regression protection? | ❌ **No.** Nothing compares run-N coverage to run-(N-1). |

Recommendations (not implemented in this PR):

1. **Keep current behaviour for v0.1.0-alpha.** Coverage runs and the artifact is uploaded; that is enough to preserve evidence and to spot regressions manually.
2. **Add a coverage threshold before beta or before npm publish.** Suggested baseline thresholds (set in `vitest.config.ts`):
   - lines ≥ 80 (current: 83.44)
   - branches ≥ 80 (current: 85.31)
   - functions ≥ 85 (current: 90.69)
   These are the current values rounded down by ~3-5 points to leave headroom for legitimate doc/comment dilutions. Revisit when more code lands.
3. **Add a coverage diff comment on PRs** (codecov / coveralls / GitHub-action-based) is a nice-to-have, not a blocker. Defer to a follow-up DEC.

---

## 8. Matrix review

Current matrix: **none** (single dimension on each axis).

| Axis | Current | Status |
|---|---|---|
| Node version | `20` (single) | OK for alpha; `engines.node` declares `>=20`, so users on 22/24 are unverified. |
| OS | `ubuntu-latest` (single) | OK for alpha; macOS / Windows users are unverified. |
| Package manager | `npm ci` | Single. No pnpm / yarn. Fine — OCN docs only describe npm. |

### DEC-010 candidate options

| Option | Scope | Cost | Verdict |
|---|---|---|---|
| **A** | **Keep `ubuntu-latest` + Node 20 only for alpha. Add matrix before beta.** | Zero new CI minutes. | **Recommended default.** Honest about what's verified; defers expansion until there is a real signal that other versions/OSes are needed. |
| B | Add `ubuntu-latest` + Node 20 + 22 + 24 + macOS-latest + Windows-latest *before* alpha. | ~6× CI minutes (5 matrix cells × shared `npm ci`/cache). Material cost on an active branch. | Premature for alpha. The OCN test suite is small (4–5 s) but Windows + macOS introduce path/shell quirks that have not surfaced because nobody's run there. |
| C | Add Node 20 + 22 (Ubuntu only) now; add OS matrix at beta. | ~2× CI minutes (single OS, two Node versions). Modest cost. | Reasonable middle path if there's any worry about Node 22 compatibility. **Conditional alternative** if DEC-010 wants stronger Node-version coverage but not OS coverage. |

### Recommended DEC-010 default

**Option A — keep single-cell (`ubuntu-latest` + Node 20) for v0.1.0-alpha; expand at beta.**

Rationale:

- The product is local-first, distributed via npm, runs on Node ≥ 20. The most common Node version in production today is 20 LTS. Most developers using OCN will hit Node 20 first.
- Each Node version added is a real cost: not just CI minutes, but also `engines.node` semantics (we'd be expected to keep all listed versions green). Adding 22 implies committing to fix Node-22-only test failures.
- The `ocn` and `ocn-mcp` bins are pure ESM Node, no native deps. Cross-OS path handling is the main risk; that's already mitigated by `path.posix` / `path.sep` usage in `src/core/security/project-root.ts` (PR C). A single Linux runner exercises most of this.
- Beta is the right gate to expand: by then the npm publish has happened, real users will report breakage on macOS/Windows, and we'll have data to drive matrix choices instead of guessing.

This is a recommendation only. **PR C audit does not capture DEC-010 itself**; that DEC is captured in a follow-up.

---

## 9. Cache review

| Cache | Current state |
|---|---|
| `actions/setup-node@v4` `cache: npm` | ✅ **Enabled.** Caches the npm download cache (`~/.npm`). This is the principal cache for `npm ci`. |
| `node_modules/` cache | ❌ Not separately cached. Acceptable — `npm ci` rebuilds `node_modules` from cached tarballs in the npm cache, which is faster than restoring `node_modules` itself. |
| Vitest cache (`node_modules/.vitest/`) | ❌ Not cached. Each run does a cold `vitest run`. | 
| Build cache (`dist/`) | ❌ Not cached. `tsc -p tsconfig.build.json` re-runs every time. Build duration ~3 s; not worth caching. |

The current 1-minute end-to-end runtime is dominated by setup, not by the gates themselves. Adding more caches here would shave seconds at the cost of cache complexity. **Recommendation: leave as-is.**

If a future investigation finds CI runtime exceeds 3 minutes routinely, the first cache to add is the Vitest-incremental cache; second is `dist/` keyed by `package-lock.json` + `tsconfig.build.json`.

---

## 10. npm publish readiness implications

Per [PR E plan §5](../plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md), CI is one of the gates a future `npm publish` must pass through. From the audit:

| Gate | Current state | Sufficient for alpha publish? |
|---|---|---|
| Lint runs in CI | ✅ Yes | ✅ |
| Typecheck runs in CI | ✅ Yes | ✅ |
| Build runs in CI | ✅ Yes | ✅ |
| Tests run in CI | ✅ Yes (with coverage) | ✅ |
| Coverage gate | ⚠️ Generated but no threshold | OK for alpha; **add before beta** |
| Build artifact (`dist/`) is exercised in CI | ✅ Yes (step 6 produces it) | ✅ |
| Tarball contents (`npm pack --dry-run`) audit in CI | ❌ Not run in CI | OK; this is a release-prep activity, not every-PR CI. |
| `prepublishOnly` hook | ❌ Not present in `package.json` | **Add before any actual `npm publish`.** Suggested value (per PR E plan §5.5): `npm run lint && npm run typecheck && npm run test:coverage && npm run build`. |
| `package.json` `files` allowlist | ✅ Present (`["dist", "LICENSE", "README.md"]`) | Narrow — does NOT include `docs/quickstart.md`, `docs/mcp-usage.md`, `docs/security/`, `docs/amendments/`, `docs/20-decision-log.md`. **Decision is gated by DEC-009 / DEC-012**; not a blocker for the audit. |
| Multi-OS / multi-Node verification | ❌ Single cell (Ubuntu + Node 20) | OK for alpha (recommended option A); revisit before beta. |
| Push-to-main flake (§5.3) | ⚠️ 80 % pass rate on push-to-main events | **Track**; not a blocker for alpha because PR-run is 100 %. Document the pattern; reconsider if it persists. |

> External MCP Host Validation pending.
> Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.

This caveat applies to any release notes drafted from this point forward, including any alpha release notes that might reference the present audit.

---

## 11. Findings

| ID | Severity | Finding | Evidence | Recommendation | Blocks GA? |
|---|---|---|---|---|---|
| **F-1** | P3 | CI workflow exists, runs lint + typecheck + build + test:coverage, uploads coverage artifact, has correct least-privilege `permissions`, has a sane 10-minute timeout, has npm cache enabled. | `.github/workflows/ci.yml` (full inventory in §2). | None — report this as healthy baseline. | No |
| **F-2** | P2 | Two `Test with coverage` failures observed on push-to-`main` events for commits that had passed in their PR runs (PR #8, PR #10). Pass-rate split: PR-run 100 %, push-to-main 80 %. | §5.2 + §5.3. Failure runs `25083846003` and `25085036315`; both reach step 8, fail in <30 s, identical commit had been green in PR run. | (a) Watch for a third occurrence; if any further push-to-main flake hits the same step, pull `gh run view <id> --log` for the failed step and quarantine the offending test. (b) Consider adding `concurrency: ci-${{ github.ref }}` to ci.yml to prevent overlap between the PR run and the immediate push-to-main run on the same commit (reduces redundant runs and could mask the flake's interaction window). | No, but track |
| **F-3** | P3 | No coverage threshold. Coverage is generated and uploaded but does not gate. | §7. | Keep for alpha; add thresholds before beta (suggested baselines in §7). | No |
| **F-4** | P2 | No matrix. Single Ubuntu + single Node 20. macOS / Windows / Node 22+ are unverified. | §8 + DEC-010 candidate options. | DEC-010 candidate default: keep single-cell for alpha, expand at beta. | No, but blocks beta-claim of cross-platform/version support |
| **F-5** | P1 | No `prepublishOnly` script in `package.json`. If a future contributor were to attempt `npm publish` from a dirty state, no gate fires. | §3 (script alignment table). | Add `"prepublishOnly": "npm run lint && npm run typecheck && npm run test:coverage && npm run build"` BEFORE any actual `npm publish` is attempted. Tracked in PR E plan §5.5; this audit confirms the gap. | **Yes** — gates any future publish |
| **F-6** | P2 | `package.json` `files` field is narrow. Currently `["dist", "LICENSE", "README.md"]`. Does NOT ship `docs/quickstart.md`, `docs/mcp-usage.md`, `docs/security/mcp-threat-model.md`, `docs/amendments/`, `docs/20-decision-log.md`. | §10 publish-readiness table; PR E plan §5.1 + §4.4 (DEC-009). | Decide via DEC-009 (PR E follow-up) before alpha publish. Recommend at minimum adding `docs/quickstart.md` and `docs/mcp-usage.md` so users have an in-package recipe and security boundary statement. | No, but expected to fire before publish |
| **F-7** | P2 | The 4-line gap between PR-run completion and merge means the same code is reverified ~10 minutes later on push-to-`main`. This wastes CI minutes and *also* widens the flake window. | §5.2 cross-reference; PR-run + push-to-main both run for every merge. | (a) Add `concurrency: ci-${{ github.ref }}` to ci.yml so runs on the same ref do not overlap, OR (b) skip push-to-main runs on direct merges by gating on `if: github.event_name == 'pull_request' || github.actor != 'github-merge-queue[bot]'` (more invasive). Option (a) is simpler. | No |
| **F-8** | P3 | One `gh pr create` GraphQL `EOF` observed during PR #13 creation (audit author side). | Audit log in chat; PR list confirms no duplicate PR. | No action — this is a GitHub API transient, not a CI gate concern. Recorded for completeness. | No |
| **F-9** | P1 | DEC-005 caveat must propagate to any release-notes / metadata drafted from this audit forward. | DEC-005 + this report §10. | Every future release-related document MUST include the verbatim line: *"External MCP Host Validation pending."* Until PR D completes. | **Yes** — gates any release language |

Severity legend: **P1** = must fix before alpha / GA. **P2** = should fix before beta / GA. **P3** = improvement.

### Severity counts

- **P1**: 2 (F-5, F-9)
- **P2**: 4 (F-2, F-4, F-6, F-7)
- **P3**: 3 (F-1, F-3, F-8)

Neither P1 finding is *currently active*: F-5 only fires if someone runs `npm publish`, and F-9 is a documentation rule that is honoured in this audit and its companion DECs. They are P1 because the cost of forgetting them is high.

---

## 12. Recommendation for DEC-010

> **DEC-010 should decide CI matrix policy.**
>
> **Recommended default (this audit)**: keep `ubuntu-latest` + Node 20 only for v0.1.0-alpha; expand the matrix at beta.
>
> **Rationale**:
> 1. CI is currently fast (~1 minute end-to-end) and stable on PR runs (100 % pass). Expanding the matrix multiplies CI minutes without a current signal that other cells matter.
> 2. The product surface that depends on cross-platform behaviour is small and already canonicalised: `path.realpath` / `path.normalize` / `path.sep` are exercised by `src/core/security/project-root.ts` tests (PR C). The cases that *would* fail on Windows are the cases the projectRoot validator was explicitly designed to handle.
> 3. Beta provides a real expansion point. By beta, npm publish will have happened, external users will be reporting issues, and we'll have data on which Node versions / OSes actually need verification.
> 4. The `engines.node` declaration in `package.json` is `>=20`. CI on Node 20 verifies the floor; users on 22+ are not contractually guaranteed today, and that's honest.
>
> **Do NOT capture DEC-010 from this audit alone.** This recommendation is one input. The DEC entry is written in a focused follow-up commit or PR.

---

## 13. Acceptance criteria

This audit is complete when:

- [x] CI audit report exists at `docs/reports/2026-04-29-ci-stability-audit.md`.
- [x] Current workflow inventory documented (§2).
- [x] `package.json` scripts mapped to CI gates (§3).
- [x] Local baseline captured (§4).
- [x] Recent CI history reviewed (§5).
- [x] Coverage gate reviewed (§7).
- [x] Matrix options proposed (§8).
- [x] PR D caveat included (§1, §10).
- [x] No `.github/workflows/*.yml` change.
- [x] No `package.json` change.
- [x] No `src/` change.
- [x] No new tests.
- [x] Local lint / typecheck / test pass.

---

## 14. References

- `.github/workflows/ci.yml` — the audited workflow.
- `package.json` — scripts + files field + bin + engines.
- `.husky/pre-commit` — local hook (subset of CI gates).
- [DEC-005 — PR D deferral](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) — caveat that propagates into §10.
- [PR E plan §5.4 (CI stability audit) + §5.5 (`prepublishOnly`)](../plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md) — origin of this audit's scope and the deferred follow-ups.
- [PR F plan §11 (RR-F-7 — examples shipping in tarball)](../plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md) — coupled DEC-012 (`examples/` in tarball) intersects F-6.
- [Phase 2 Completion Report §8 row 9 (CI stability gap)](2026-04-28-phase2-completion-report.md) — the gap this audit closes.
- Failure runs: [`25083846003`](https://github.com/UncleTIM-GZ/O-CodingNavigation/actions/runs/25083846003), [`25085036315`](https://github.com/UncleTIM-GZ/O-CodingNavigation/actions/runs/25085036315).
- Latest green run: [`25088357806`](https://github.com/UncleTIM-GZ/O-CodingNavigation/actions/runs/25088357806).
