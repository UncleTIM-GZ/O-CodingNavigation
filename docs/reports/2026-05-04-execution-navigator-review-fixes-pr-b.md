# Execution Navigator review fixes — PR-B (architectural refactors)

> Generated: 2026-05-04
> Branch: `fix/execution-navigator-review-pr-b`
> Scope: 4 architectural refactors deferred from PR-A. Together with PR-A,
> the cross-cutting review series is closed.

## 1. Summary

PR-B applies the four architectural refactors deferred from PR-A:

- **H5** — extract `src/cli/lib/{gh-runner-from-env,validate-cli-flags,run-with-common-flags}.ts` to eliminate the 5×-duplicated CLI boilerplate.
- **M1** — extract `src/core/execution-navigator/acceptance-loader.ts` to consolidate the 3×-duplicated acceptance-file load logic, adopting the superior error semantics from `evidence-map-runner`.
- **M2** — introduce `EvidenceContext` shared between the four orchestrators, eliminating the latent double `gh pr view` round-trip between `verdict-draft` and `verify-status`.
- **M5** — split four files that exceeded the 300-line limit per CLAUDE.md §8.

Together with the eleven surgical fixes from PR-A, all 15 actionable findings
from the cross-cutting review are now addressed. PR-B introduces no
observable behaviour changes — every existing test still passes, every
envelope shape is byte-stable, and every exit code is unchanged.

## 2. Findings addressed

| ID | Description | Files touched | Lines before → after |
|----|-------------|---------------|----------------------|
| H5 | Extract `cli/lib/*` shared CLI helpers | New: `src/cli/lib/gh-runner-from-env.ts` (102), `src/cli/lib/validate-cli-flags.ts` (137), `src/cli/lib/run-with-common-flags.ts` (53). Refactored: all 6 CLI commands. | `exec.ts` 42→47, `github.ts` 149→59, `evidence.ts` 155→66, `next-prompt.ts` 208→101, `verify.ts` 197→85, `verdict.ts` 198→86. **−530 net** in CLI commands; **+292** in `src/cli/lib/*` ⇒ net **−238 lines** with the duplication eliminated. |
| M1 | Extract `acceptance-loader.ts` helper | New: `src/core/execution-navigator/acceptance-loader.ts` (63). Three duplicated implementations replaced: `evidence-map-runner.ts:loadAcceptanceFile`, `verify-status.ts:loadAcceptance`, `next-prompt.ts:loadAcceptance` — now delegate via `EvidenceContext`. | three ~20-line copies removed. |
| M2 | Introduce `EvidenceContext` shared aggregator | New: `src/core/execution-navigator/evidence-context.ts` (116). Each orchestrator (`evidence-map-runner`, `verify-status`, `next-prompt`, `verdict-draft`) gained an optional `context?: EvidenceContext` argument and an internal fallback that builds one. | `verdict-draft.ts` 580→148 (split into rules/assembly + threaded context); `verify-status.ts` 260→241; `evidence-map-runner.ts` 206→166; `next-prompt.ts` 502→159. |
| M5 | Split files exceeding 300-line limit | New: `verdict-draft-rules.ts` (150), `verdict-draft-assembly.ts` (267), `verdict-draft-risk-flags.ts` (49), `evidence-map-criterion.ts` (208), `evidence-map-keywords.ts` (92), `evidence-map-rules.ts` (135), `next-prompt-assemble.ts` (134), `next-prompt-sections.ts` (231), `next-prompt-shapes.ts` (34), `acceptance-parser-helpers.ts` (215). | `verdict-draft.ts` 580→148, `evidence-map.ts` 512→85, `next-prompt.ts` 502→159, `acceptance-parser.ts` 370→170. After splits, **no execution-navigator core file exceeds 280 lines** (excluding the types-only `types.ts`, which is intentionally consolidated and out of scope per the prompt). |

## 3. Architectural shape

```
src/cli/
├── lib/                             ← new (PR-B / H5)
│   ├── gh-runner-from-env.ts        ← test-only fixture-runner injection
│   ├── validate-cli-flags.ts        ← pure validators (--pr, --project-root, --mode)
│   └── run-with-common-flags.ts     ← validate → inject runner → action → render
└── commands/
    ├── exec.ts                      ← thin: validator + action
    ├── github.ts
    ├── evidence.ts
    ├── next-prompt.ts
    ├── verify.ts
    └── verdict.ts

src/core/execution-navigator/
├── evidence-context.ts              ← new (PR-B / M2): shared aggregator
├── acceptance-loader.ts             ← new (PR-B / M1): single AC loader
├── acceptance-parser.ts             ← orchestrator (PR-B / M5)
├── acceptance-parser-helpers.ts     ← regexes, AC-id matcher, fence tracker
├── evidence-map.ts                  ← aggregate (PR-B / M5)
├── evidence-map-criterion.ts        ← per-criterion mapping
├── evidence-map-keywords.ts         ← regexes + keyword extraction
├── evidence-map-rules.ts            ← strong/candidate rules
├── evidence-map-runner.ts           ← orchestrator with optional context
├── verify-status.ts                 ← orchestrator with optional context
├── next-prompt.ts                   ← orchestrator with optional context
├── next-prompt-assemble.ts          ← top-level prompt assembler
├── next-prompt-sections.ts          ← per-section line builders
├── next-prompt-shapes.ts            ← shared types (avoid circular import)
├── verdict-draft.ts                 ← orchestrator (≤150 lines)
├── verdict-draft-rules.ts           ← 5 categorisation rules
├── verdict-draft-assembly.ts        ← supports / blocks / warnings sentence builders
└── verdict-draft-risk-flags.ts      ← typed risk-flag lookup table (drift-detected by tsc)

Dependency graph (top-level):
  CLI → orchestrator → evidence-context → readers
  CLI → cli/lib → core/result
```

## 4. Backward compatibility

PR-B introduces zero observable behaviour changes:

- **Envelope shapes**: every `CommandResult` envelope shape is byte-stable
  against PR-A. No new keys, no removed keys, no reordered fields.
- **Exit codes**: every error code → exit code mapping unchanged (`OK`=0,
  `ERR_GATE_FAILED`=1, `ERR_ARTIFACT_INVALID`=2, `ERR_STATE_MACHINE`=3,
  `ERR_IO_OR_CONFIG`=4, `ERR_SOP_VERSION`=5).
- **Text output**: bilingual messages identical, error envelope `details`
  fields identical (including the L4 fix where `details.received` is the
  sentinel `"non-absolute-path"`, not the user-supplied path).
- **JSON output**: `--json` envelope keys, ordering, and value types
  unchanged across all 6 commands.
- **Determinism**: the M3 sort guarantees from PR-A still hold (PR file
  order, commit oid order, check name order all sorted lexicographically by
  the existing parsers — those parsers were not touched).

The new `EvidenceContext` aggregator is a pure assembler; given byte-stable
inputs from the existing readers, it produces a byte-stable bundle. The
orchestrators that consume it produce identical output bytes to PR-A.

All 865 PR-A tests + 7 new EvidenceContext tests pass without modifying any
existing assertion. Test files were not split — only the source files were
restructured. Imports inside tests continue to resolve through the original
public entry points (e.g. `extractKeywords` from `evidence-map.ts`,
`normaliseAcId` from `acceptance-parser.ts`) because the new modules
re-export the symbols at the same path.

## 5. Determinism preservation

- **M3 sort guarantees** (PR file order, commit oid order, check name
  order) carry through unchanged — the parsers (`github-pr-parse.ts`)
  weren't touched.
- **EvidenceContext warnings** are sorted lexicographically and de-duped
  via `sortLex`. The aggregator never reorders its inputs; it only sorts
  the warning array it builds itself.
- **EvidenceContext is frozen** via `Object.freeze`, so callers cannot
  introduce non-determinism by mutating the bundle in place between
  orchestrator invocations.
- **Assembly-only orchestrator paths**: when a context is supplied, the
  orchestrators perform zero I/O beyond the `package.json` / smoke-script
  reads that were already isolated in PR-A. Identical inputs ⇒ identical
  outputs.

## 6. De-duplication win

The headline architectural win is closure of the latent double `gh pr view`
between `verdict-draft` and `verify-status`. Before PR-B:

```
verdict-draft
  ├── analyzeGithubPr(pr=N)        ← gh auth status + gh pr view N
  └── summarizeVerifyStatus
        └── analyzeGithubPr(pr=N)  ← gh auth status + gh pr view N (DUPLICATE)
```

After PR-B:

```
verdict-draft
  ├── buildEvidenceContext(pr=N)   ← gh auth status + gh pr view N (ONCE)
  └── summarizeVerifyStatus({ context })
        └── (skips fetch — uses context)
```

The new test file `tests/unit/execution-navigator-evidence-context.test.ts`
includes `verdict-draft → verify-status de-duplication (PR-B / M2) ›
verdict-draft fetches the PR exactly once, not twice` which mocks the
runner with a counter and asserts the runner is invoked exactly twice
(`auth status` + `pr view N`) instead of four times.

## 7. Tests updated / added

| File | Change |
|------|--------|
| `tests/unit/execution-navigator-evidence-context.test.ts` | **NEW** — 7 tests covering context shape, mode-conditional fetching (local / pr / combined), warning sort, freeze, and the verdict-draft → verify-status de-dup proof |

No existing test files were modified. Every PR-A assertion still holds
verbatim. The new module structure is reachable through the existing
public entry points, so test imports didn't need to change.

## 8. Validation

| Gate | Result |
|------|--------|
| `npm run lint` | passed (eslint clean) |
| `npm run typecheck` | passed (tsc --noEmit clean) |
| `npm run test` | passed — 97 files, 872 tests (was 96/865 in PR-A; +1 file / +7 tests for EvidenceContext) |
| `npm run build` | passed |
| `npm run test:coverage` | 78.7% lines / 81.06% branches / 88.32% functions / 78.7% statements (PR-A baseline: 76.32% / 80.69% / 89.2% / 76.32%) |

Targeted suites (every file touched):

```
$ npx vitest run \
    tests/unit/execution-navigator-acceptance-parser.test.ts \
    tests/unit/execution-navigator-local-git.test.ts \
    tests/cli/execution-navigator-local-git.test.ts \
    tests/unit/execution-navigator-github-pr.test.ts \
    tests/cli/execution-navigator-github-pr.test.ts \
    tests/unit/execution-navigator-evidence-map.test.ts \
    tests/cli/execution-navigator-evidence-map.test.ts \
    tests/unit/execution-navigator-next-prompt.test.ts \
    tests/cli/execution-navigator-next-prompt.test.ts \
    tests/unit/execution-navigator-verify-status.test.ts \
    tests/cli/execution-navigator-verify-status.test.ts \
    tests/unit/execution-navigator-verdict-draft.test.ts \
    tests/cli/execution-navigator-verdict-draft.test.ts \
    tests/unit/execution-navigator-skeleton.test.ts \
    tests/cli/execution-navigator-skeleton.test.ts \
    tests/unit/execution-navigator-evidence-context.test.ts
Test Files  16 passed (16)
     Tests  218 passed (218)
```

Manual smoke (post-build) confirms envelope shapes byte-stable against PR-A:

```
$ node dist/cli/index.js exec status --json     # ok=true, expected git data
$ node dist/cli/index.js evidence map --json    # ok=true, mapping data
$ node dist/cli/index.js verify status --json   # ok=true, verification data
$ node dist/cli/index.js verdict draft --json   # ok=true, verdict data
```

## 9. Closure — review series complete

PR-A addressed 11 surgical findings (4 high + 2 medium + 5 low). PR-B
addresses 4 architectural findings (1 high — H5 — + 3 medium — M1, M2,
M5). Total addressed: **15 actionable findings**.

| Severity | Count | PR-A | PR-B |
|----------|-------|------|------|
| High     | 5     | H1, H2, H3, H4 | H5 |
| Medium   | 5     | M3, M4 | M1, M2, M5 |
| Low      | 5     | L2, L3, L4, L5, L6 | — |
| Info     | 3 (deferred — doc/policy notes, no source change required) | — | — |
| **Total actionable** | **15** | **11** | **4** |

Note: L1 was confirmed not-a-finding during PR-A review (the apparent
issue did not actually manifest in source). The 3 info-level notes are
documentation/policy reminders that do not require source changes. With
PR-B merged, the cross-cutting review series is fully closed.

## 10. Follow-up

After PR-B merges, the recommended next step is a real-project dogfood of
the full Execution Navigator loop on an external repository:

```
ocn exec status
ocn evidence map --pr <N>
ocn verify status --pr <N> --mode combined
ocn verdict draft --pr <N> --mode combined
ocn next-prompt --agent claude-code --mode continue
```

A real external dogfood (not the OCN repo itself) is what would give a
release-DEC the evidence base it needs.

## 11. Non-goals

PR-B explicitly does NOT do any of the following:

- No `npm publish`, no `npm version`, no movement of the `latest` dist-tag.
- No package version / name changes; no new npm dependency added.
- No git tags, no GitHub releases, no GA start.
- No claim of Cursor / Cline validation.
- No `.github/workflows/`, `README.md`, `docs/quickstart.md`,
  `docs/mcp-usage.md`, `docs/20-decision-log.md` changes.
- No `src/sops/**` changes.
- No new MCP tools.
- No SOP required-section changes.
- No creation of `.ocoding/execution`.
- No writes to project files at runtime.
- No LLM API calls.
- No observable behaviour changes — same envelope shapes, same text output
  (modulo the deterministic ordering already established in PR-A), same
  exit codes, same error codes.
