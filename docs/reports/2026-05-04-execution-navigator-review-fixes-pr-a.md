# Execution Navigator review fixes — PR-A (surgical fixes)

> Generated: 2026-05-04
> Branch: `fix/execution-navigator-review-pr-a`
> Scope: 11 surgical fixes from the cross-cutting review of the Execution
> Navigator MVP series. Architectural refactors are deferred to PR-B.

## 1. Summary

PR-A applies eleven surgical fixes from the cross-cutting review of the
Execution Navigator MVP 1–6 series (DEC-024). Each fix is intentionally
narrow — bounded by 1–2 files at most — so behaviour can be reviewed
independently of the architectural refactors planned for PR-B.

PR-A does NOT extract `src/cli/lib/*` shared helpers, does NOT introduce
`EvidenceContext`, and does NOT split files for line-count compliance. Those
items are reserved for PR-B and remain intentionally unaddressed here.

## 2. Findings addressed

| # | ID | Description | File(s) | Fix shape |
|---|----|-------------|---------|-----------|
| 1 | L4 | `--project-root` echoed into `error.details.received` | All 6 CLI command files (`exec`, `github`, `evidence`, `next-prompt`, `verify`, `verdict`) | `received` is now the type `"non-absolute-path"`; bilingual `message` still includes the path because it is already user-visible |
| 2 | L5 | `PORCELAIN_RENAME_X` and `PORCELAIN_RENAME_Y` confusingly both `"R"` | `src/core/execution-navigator/local-git.ts` | Replaced with `PORCELAIN_RENAME = "R"` and `PORCELAIN_COPY = "C"`; rename-detection branch updated accordingly |
| 3 | L6 | Tab-prefixed commit subjects silently dropped | `src/core/execution-navigator/local-git.ts` | `LOG_FORMAT` switched from `"%h%x09%s"` to `"%h%x1f%s"` (ASCII unit-separator); parser splits on `\x1f`. Tab-prefixed subjects now round-trip intact |
| 4 | M4 | `git rev-parse --short HEAD` honors per-repo `core.abbrev` | `src/core/execution-navigator/local-git.ts` | Pinned to `--short=12` for cross-machine determinism |
| 5 | M3 | gh array order treated as deterministic but isn't | `src/core/execution-navigator/github-pr-parse.ts` | `parsePrFiles` sorts by `path`; `parsePrCommits` sorts by `oid`; `parsePrChecks` sorts items by `name`. New unit tests assert sorting against unsorted inputs |
| 6 | L2 | `OCN_TEST_GH_RUNNER_FIXTURES` honored in production binary | All 5 CLI command files that contain `pickRunnerFromEnv` (`github`, `evidence`, `next-prompt`, `verify`, `verdict`) | Env-var read gated behind `NODE_ENV === "test"` OR `OCN_TEST_MODE === "1"` — production binaries ignore the fixture path |
| 7 | L3 | Fixture runner bypasses read-only allowlist | Same 5 CLI files; `github-pr-runner.ts` (export) | `isReadOnlyInvocation` exported; each `createFixtureRunner` calls it before consulting fixtures and refuses non-allowlisted invocations defensively |
| 8 | H1 | `deriveGitStatus` collapses non-repo into empty-repo | `verify-status.ts`, `verdict-draft.ts`, `types.ts` | `VerifyStatusLocalGit` extended with `isGitRepo: boolean` and `gitReason: GitReadReason \| null`; both populated in `verify-status.ts`; `deriveGitStatus` now branches on `isGitRepo === false` first → `"no-git"`, then `gitReason === "no-commits"` → `"empty-repo"`, then dirty → `"dirty"` else `"clean"` |
| 9 | H2 | Acceptance parser ignores fenced code, HTML comments, and tables | `src/core/execution-navigator/acceptance-parser.ts` | Added line-by-line fenced-code state (`/^\s{0,3}(?:```\|~~~)/`), pre-pass `<!-- ... -->` stripping (preserves newline count for stable line numbers), and a `TABLE_ROW_RE` skip for leading-`\|` lines. Heading-form `## AC-001 …` remains unaffected |
| 10 | H3 | `flags as readonly RiskFlag[]` casts hide drift | `verify-status-verdict.ts`, `verdict-draft.ts` | Local `flags: string[]` lifted to typed unions; introduced `Readonly<Record<RiskFlag, true>>` lookup tables that the compiler enforces are exhaustive. Drift was verified: temporarily added a member to `VerifyStatusRiskFlag` / `VerdictDraftRiskFlag` and confirmed `tsc` reports `error TS2741`. Lookup-table approach replaces the `as readonly … RiskFlag[]` boundary casts entirely |
| 11 | H4 | `verifyResult as unknown as CommandResult<VerdictDraftData>` escape-hatch | `src/core/execution-navigator/verdict-draft.ts` | Replaced with `blocked<VerdictDraftData>("ERR_IO_OR_CONFIG", verifyResult.message ?? msg(...), { command, implemented, noMutation, reason: "verify-status-failed" })`. No `any` or `as unknown` introduced |

## 3. Findings deferred to PR-B

These are architectural changes that span more files / introduce new
abstractions, and were intentionally kept out of PR-A:

| ID | Description | Why deferred |
|----|-------------|--------------|
| H5 | Extract `cli/lib/*` shared CLI helpers (`pickRunnerFromEnv`, `createFixtureRunner`, project-root validator, fixture-entry types) | Cross-file refactor across all 6 CLI command modules. Better landed as a single coherent extraction PR after the surgical fixes ship, so PR-A's diff stays auditable |
| M1 | Acceptance-parser ↔ acceptance-loader extraction | Multi-file restructuring with new module boundaries; safer to land after PR-A's parser-correctness fixes (H2) |
| M2 | Introduce `EvidenceContext` to compose readers | Larger structural change touching all four readers and three orchestrators |
| M5 | File splits for files exceeding the 300-line limit | Pure mechanical refactor; better as one focused PR after content-level fixes have stabilised |

## 4. Tests updated

| File | Change |
|------|--------|
| `tests/unit/execution-navigator-acceptance-parser.test.ts` | Added 5 new tests for H2: fenced code blocks (` ``` `), tilde fences (`~~~`), single-line and multi-line HTML comments, markdown table rows; plus a regression assertion that heading-form `## AC-001 …` still registers (it must be unaffected by table-row skip) |
| `tests/unit/execution-navigator-local-git.test.ts` | Updated `parseRecentCommits` tests for L6: split-character is now `\x1f` not `\t`; added a new test asserting tab-prefixed commit subjects are preserved (regression vs L6 dropped behaviour) |
| `tests/unit/execution-navigator-github-pr.test.ts` | Added 3 new tests for M3 covering `parsePrFiles` (path sort), `parsePrCommits` (oid sort), and `parsePrChecks` (name sort) — each constructed from an unsorted fixture to prove sorting actually happens |
| `tests/unit/execution-navigator-verify-status.test.ts` | Added a test for H1: a non-git directory now reports `local.git.isGitRepo === false` and `local.git.gitReason === "not-a-git-repository"` (the new fields wired through from `LocalGitData`) |
| `tests/unit/execution-navigator-verdict-draft.test.ts` | Added a test for H1: a non-git directory now drafts `inputs.gitStatus === "no-git"` (previously collapsed to `"empty-repo"`) |

## 5. Validation

| Gate | Result |
|------|--------|
| `npm run lint` | passed |
| `npm run typecheck` | passed (drift detection for H3 lookup tables verified by temporarily adding a canary member to each union; both produced `error TS2741: Property '"tmp-drift-canary-DELETEME"' is missing in type 'Readonly<Record<...RiskFlag, true>>'`; canary reverted) |
| `npm run test` | 96 files, 865 tests, all passed |
| `npm run build` | passed |
| `npm run test:coverage` | 76.32% lines / 80.69% branches / 89.2% functions / 76.32% statements |

Manual smoke tests after `npm run build`:

```bash
# H1 confirmation: non-git temp dir now reports gitStatus="no-git"
TMPDIR=$(mktemp -d) && \
  node dist/cli/index.js verdict draft --json --mode local --project-root "$TMPDIR" \
  | grep gitStatus
# →   "gitStatus": "no-git",

# M4 confirmation: HEAD short SHA is now pinned to 12 hex chars
node dist/cli/index.js exec status --json | grep '"head"'
# →   "head": "4c26512e59dd",
```

## 6. Non-mutation guarantee

- No new write paths introduced. No new file creations in `.ocoding/`. No
  `gh` write subcommand added; in fact, L3 hardens the fixture runner against
  any future fixture mistakenly describing a write call.
- No `git push`, `git fetch`, `git checkout`, `git add`, `git commit` from
  code. No GitHub mutation API calls.
- L2 strictly tightens behaviour: `OCN_TEST_GH_RUNNER_FIXTURES` is now
  ignored unless `NODE_ENV === "test"` or `OCN_TEST_MODE === "1"` is set —
  production binaries can no longer be redirected through fixture data
  even if the env var leaks into the runtime environment.
- L4 prevents user-supplied path strings from being smuggled into
  `error.details.received` JSON; the human-visible bilingual message still
  includes the path because that field already shows the path.

## 7. Follow-up

After PR-A merges, dispatch PR-B for the architectural refactors:

- Extract `cli/lib/*` shared helpers (`pickRunnerFromEnv`,
  `createFixtureRunner`, project-root validator, `FixtureEntry` type,
  `isReadOnlyInvocation` import path) to remove the 5 near-duplicate copies
  inlined in the CLI commands.
- Introduce `EvidenceContext` to factor common composition across
  `verify-status`, `verdict-draft`, `next-prompt`, and `evidence-map`.
- Split files exceeding the 300-line limit (`verdict-draft.ts`,
  `verify-status.ts`, `acceptance-parser.ts`).
- Acceptance-parser ↔ acceptance-loader extraction (M1).

PR-A intentionally leaves all of the above unaddressed so its diff stays
focused on the eleven correctness / type-safety / determinism fixes
documented in section 2.
