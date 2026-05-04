# Execution Navigator — Acceptance Evidence Map (DEC-024 MVP 3)

> Implementation report for `ocn evidence map` upgrade from skeleton to a real
> deterministic acceptance evidence mapper. No npm publish, no `latest` movement,
> no GA, no CI workflow change, no SOP gate change, no MCP tool addition.

---

## 1. Summary｜摘要

`ocn evidence map` now reads acceptance criteria from
`docs/03-acceptance-criteria.md`, maps each criterion deterministically against
local git evidence (and optionally GitHub PR evidence when `--pr <n>` is
provided), and emits a coverage status + per-criterion mapping items + a single
next-suggested-action sentence. No LLM, no mutation, no file writes.

The other three Execution Navigator commands (`ocn next-prompt`, `ocn verify
status`, `ocn verdict draft`) remain skeleton (`implemented: false`) — see the
DEC-024 sequencing in `docs/plans/2026-05-02-execution-evidence-navigator-plan.md`.

中文要点：本 PR 把 `ocn evidence map` 从骨架升级为真实的验收证据映射命令；只读，不调用 LLM，不写任何文件，不做 GitHub 写操作。其余三条命令（`next-prompt`、`verify status`、`verdict draft`）仍为骨架。

---

## 2. DEC basis｜决策依据

- DEC-024 (`docs/20-decision-log.md`) — Reframe BUILD / VERIFY as Execution
  Evidence Navigator.
- Plan: `docs/plans/2026-05-02-execution-evidence-navigator-plan.md` §7
  (MVP 3 — acceptance evidence map).
- Skeleton: `docs/reports/2026-05-02-execution-navigator-command-skeleton.md`.
- MVP 1 (local git): `docs/reports/2026-05-02-execution-navigator-local-git-status.md`.
- MVP 2 (GitHub PR): `docs/reports/2026-05-02-execution-navigator-github-pr-analysis.md`.

This PR implements one of the follow-up steps explicitly enumerated in DEC-024
(step 4: `ocn evidence map`). DEC-024's "no mutation, no LLM, no new MCP tool,
no SOP gate change" non-goals continue to bind.

---

## 3. Acceptance parser｜验收标准解析

Pure function in `src/core/execution-navigator/acceptance-parser.ts`. Inputs:
raw markdown + optional source path. Output:
`{ id, originalId, text, sourceLine, generatedId, checked? }`.

### 3.1 Supported formats

1. **Explicit ID at start of bullet**
   - `- AC-001 user can run ocn init`
   - `- **AC-001** bold-prefixed criterion`
   - `- AC-INIT-001｜minimal tier 初始化`
   - `- AC-001 — em-dash separator`
2. **Heading form**
   - `### AC-003 Heading-form criterion`
   - `## AC-INIT-001｜minimal tier 初始化`
3. **Checklist**
   - `- [ ] AC-002 unchecked`
   - `- [x] AC-003 checked`
4. **Plain bullets under acceptance heading** — auto-assigned `AC-NNN`,
   `generatedId: true`. Acceptance headings are matched against
   `/^acceptance/i`, `/acceptance criteri/i`, `/验收/`.
5. **Numbered list under acceptance heading**
   - `1. ...` and `2. ...` are treated like bullets.

### 3.2 Normalisation

`AC-?\d+` and `AC-DOMAIN-?\d+` patterns are accepted. The trailing numeric
segment is zero-padded to 3 digits when emitting the canonical ID:

- `AC-1` → `AC-001`
- `AC1` → `AC-001`
- `AC-INIT-1` → `AC-INIT-001`
- `AC.INIT.001` → `AC-INIT-001`

The original (pre-normalisation) ID is preserved as `originalId` for debugging.

### 3.3 Edge cases & limitations

- **Multi-line wrap**: only the first bullet line is captured. Continuation
  lines are ignored. Documented as a limitation; will be revisited in a future
  amendment if observed AC files require it.
- **Nested bullets**: ignored. Only top-level bullets (≤2 spaces of indent)
  are parsed.
- **Empty body after stripping ID**: skipped, parser warning emitted.
- **Duplicate ID**: first occurrence kept, subsequent occurrences dropped with
  a duplicate-id warning.
- **CRLF line endings**: trailing CR is stripped per line so CRLF parses the
  same as LF.
- **File too large** (> 256 KB): still parsed; a soft-size warning is appended.

The parser **never throws** on malformed markdown — it degrades and appends
warnings to `acceptance.warnings[]`.

---

## 4. Evidence sources｜证据来源

Always read:

- **Local git** — reuses `src/core/execution-navigator/local-git.ts` (changed
  files, recent commits, dirty/clean state, branch, head SHA). No new git
  invocations.
- **OCN state** — reuses `src/core/execution-navigator/ocn-state-reader.ts`
  (`currentStateId`, `currentStepId`, `sopProfileId`, `sopProfileVersion`).

Conditionally read (only when `--pr <n>` is provided):

- **GitHub PR** — reuses `analyzeGithubPr()` from
  `src/core/execution-navigator/github-pr.ts` end-to-end. The same
  read-only `gh` runner allowlist (`["pr","view"]`, `["auth","status"]`)
  enforces the no-mutation invariant.

Never read:

- CI log bodies (out of scope; only the check rollup summary, already exposed
  by MVP 2).
- Any other GitHub resource (issues, comments, reactions). Future MVPs may
  add these, but MVP 3 stays inside the MVP 2 evidence surface.

---

## 5. Mapping rules｜映射规则

Pure deterministic rules in `src/core/execution-navigator/evidence-map.ts`.
Same inputs → byte-identical JSON.

### 5.1 Statuses

- `evidence-found` — strong deterministic signal observed.
- `evidence-candidate` — weaker keyword overlap; needs human confirmation.
- `missing-evidence` — no matching evidence.
- `needs-human-review` — qualitative criterion (manual / risk language).

### 5.2 Pre-computed signals per criterion

- `keywords` — lowercased tokens after stop-word removal, length ≥ 3.
- `mentionsTest`, `mentionsCli`, `mentionsDocs`, `mentionsBuild`,
  `mentionsManual`, `mentionsRisk` — regex flags over criterion text.

### 5.3 Heuristics in priority order

| Rule | Trigger | Status set | Confidence |
|---|---|---|---|
| 1 — Manual / risk | `mentionsManual` or `mentionsRisk` | `needs-human-review` | `low` |
| 2a — CLI file | `mentionsCli` + changed `src/cli/**` whose name shares a keyword | `evidence-found` | `medium` |
| 2b — Test file | `mentionsTest` + changed `tests/**` whose name shares a keyword | `evidence-found` | `medium` |
| 2c — Build checks | `mentionsBuild` + `--pr` + checks summary `success` | `evidence-found` | `high` |
| 2d — Docs file | `mentionsDocs` + changed `docs/**` whose name shares a keyword | `evidence-found` | `medium` |
| 3a — Path overlap | any changed file path mentions a keyword (≥ 4 chars) | `evidence-candidate` | `low` |
| 3b — Commit overlap | any commit subject mentions a keyword | `evidence-candidate` | `low` |
| 3c — PR text mentions ID | PR title or body contains the criterion's normalised ID | `evidence-candidate` | `medium` |
| 4 — Default | none of the above | `missing-evidence` | `low` |

### 5.4 Confidence escalation

When multiple distinct evidence sources fire for the same criterion (e.g.
test file + passing checks), confidence is escalated one level (low→medium,
medium→high), capped at `high`. Implemented by counting distinct
`source` values on the evidence array.

### 5.5 humanReviewRequired

- Always `true` for `needs-human-review`.
- `true` for `evidence-candidate` with `confidence === "low"`.
- `false` otherwise.

### 5.6 Determinism guarantees

- `evidence` is sorted by `(source, ref, reason)` ascending.
- `missingEvidence` is sorted lexicographically.
- `mapping.items` is sorted by `criterionId` ascending.
- No randomness, no time-dependent values in output.

---

## 6. CLI behavior｜命令行行为

```
ocn evidence map
ocn evidence map --json
ocn evidence map --project-root /abs/path
ocn evidence map --pr 64
ocn evidence map --pr 64 --json
```

- `--project-root` defaults to `process.cwd()`. Non-absolute → `ERR_IO_OR_CONFIG`
  validation error before any IO.
- `--pr <n>` must be a positive integer; non-positive / non-numeric →
  `ERR_ARTIFACT_INVALID` validation error before the gh runner is constructed.
- `--pr` omitted → no `gh` call. `evidenceSourcesUsed` includes only
  `local-git` and `ocn-state`.
- `--pr` provided → `gh auth status` + `gh pr view --json ...` are invoked
  through the existing read-only runner allowlist. On error
  (`gh-not-found` / `gh-auth-required` / `pr-not-found` / `gh-query-failed`)
  the command does not fail: a warning is appended, the `github-evidence-unavailable`
  risk flag is raised, and mapping proceeds with local evidence only.

JSON envelope (`data` payload):

- `command: "evidence.map"`, `implemented: true`, `noMutation: true`.
- `evidenceSourcesUsed: string[]` (always includes `local-git` and `ocn-state`,
  plus `github` when PR data was successfully fetched).
- `acceptance: { path, found, criteriaCount, criteria, warnings }`.
- `mapping: { coverageStatus, covered, candidate, missing, needsHumanReview, items }`.
- `ocn: ExecStatusOcnData` (re-used from MVP 1).
- `analysis: { riskFlags, nextSuggestedAction }`.
- `warnings: string[]`.

Coverage statuses:

- `complete` — every criterion is `evidence-found`.
- `partial` — at least one `evidence-found` and at least one of
  (`evidence-candidate` | `missing-evidence` | `needs-human-review`).
- `missing` — no `evidence-found`, at least one `missing-evidence`.
- `needs-human-review` — every criterion is `needs-human-review`.
- `no-acceptance-criteria` — file missing or zero criteria parsed.

Risk flags:

- `acceptance-file-missing`, `no-acceptance-criteria`,
  `coverage-partial`, `coverage-missing`,
  `github-evidence-unavailable`, `human-review-required`,
  `working-tree-dirty`.

Next-action sentence is keyed by coverage status, with a special-case override
for `github-evidence-unavailable` ("authenticate gh or omit --pr and retry.").

Top-level bilingual message is success-friendly even when the file is missing,
because the command is informational, not a gate.

---

## 7. Non-mutation guarantee｜不可变保证

- `src/core/execution-navigator/evidence-map.ts` and
  `src/core/execution-navigator/evidence-map-runner.ts` perform **zero file
  writes** and **zero git / gh mutation calls** (verified by `grep` over the
  new sources).
- The `gh` runner reused from MVP 2 only permits `pr view` and `auth status`
  via its `GH_READONLY_LEADING_PAIRS` allowlist; this PR did not weaken that
  allowlist.
- The CLI tests assert `existsSync(.ocoding/execution) === false` and
  `existsSync(.ocoding) === false` after every invocation.
- The CLI tests snapshot the temp project's file tree before and after the
  `evidence map` call and assert both snapshots are equal.
- The unit tests assert that the GitHub runner is never invoked when `--pr` is
  not provided, and that an invalid `--pr` value never reaches the runner.

---

## 8. Tests｜测试

- `tests/unit/execution-navigator-acceptance-parser.test.ts` (20 tests) —
  format coverage (explicit IDs, bold, headings, checklist, numbered lists,
  generated IDs, Chinese acceptance heading), normalisation
  (AC-1 / AC1 / AC-INIT-1 → zero-padded), duplicates, empty text, source line
  numbers, whitespace tolerance, nested bullets ignored.
- `tests/unit/execution-navigator-evidence-map.test.ts` (16 tests) — strong
  CLI/test/checks signals, candidate keyword overlap, missing-evidence notes,
  needs-human-review for manual / performance / security keywords, coverage
  status derivations (complete/partial/missing/needs-human-review/no-acceptance-criteria),
  determinism (byte-identical JSON; sort by criterionId; sort by
  (source, ref)), PR text mention escalation.
- `tests/unit/execution-navigator-evidence-map-runner.test.ts` (4 tests) —
  AC-file-missing flow; gh runner not invoked without `--pr`;
  `github-evidence-unavailable` graceful degradation; gh fixture happy-path.
- `tests/cli/execution-navigator-evidence-map.test.ts` (6 tests) — `--json`
  happy path, text mode renders coverage + items + Next, `--pr 64 --json`
  with mocked gh fixture, `--pr abc` validation failure (runner not invoked),
  missing AC file, file-tree snapshot before/after asserts no mutation.

Existing skeleton tests were updated to reflect that `evidence.map` is now
implemented (`implemented: true`, with the new envelope) while the remaining
three skeleton commands stay `implemented: false`.

---

## 9. Follow-up｜后续

Next PR (DEC-024 follow-up step 5): `ocn next-prompt` generator (MVP 4) —
build prompt synthesis from evidence gaps, current PR state, and current OCN
SOP step. Variants per the plan: `--pr`, `--issue`, `--verify-failure`.

This PR does **not** implement the auto-generation of `docs/16-acceptance-mapping.md`
(or any other `docs/11–18` artifact). Auto-generation is deferred to MVP 6
per the DEC-024 plan, and will be a separate DEC-bound PR.

---

## 10. Non-goals｜不做的事

- No `npm publish` / `dist-tag` / `version` / `latest` move.
- No package version or name change. No new npm dependency.
- No CI log body ingestion. Only the existing MVP 2 check-rollup summary is
  consulted.
- No LLM call. No vector store. No embeddings. No remote AI judgement.
- No new MCP tool. The MCP whitelist is unchanged.
- No GA promotion. No release tag. No GitHub release.
- No SOP required-section change. No `src/sops` change.
- No mutation of the working tree, the project tree, `.ocoding/`, or any
  GitHub resource (issues, PRs, comments, reactions).
- No claim of Cursor / Cline / non-Claude-Code compatibility — DEC-019
  boundary stands.

---

## 11. Smoke evidence｜冒烟证据

Run against the OCN repo itself:

```
$ node dist/cli/index.js evidence map
已生成验收证据映射。
Acceptance evidence map generated.

Acceptance criteria: 114 (docs/03-acceptance-criteria.md)
Coverage: partial (covered 9 | candidate 5 | missing 93 | needs-human 7)
  [evidence-found] AC-001 — `docs/00-project-brief.md`
  [evidence-found] AC-002 — `docs/01-scope.md`
  [evidence-found] AC-003 — `docs/02-prd.md`
  [missing-evidence] AC-ADV-001 — gate pass 后 advance 成功
  [missing-evidence] AC-ADV-002 — gate failed 时 advance 失败
  … and 109 more
Risk flags: coverage-partial, human-review-required, working-tree-dirty

Next: Review missing or candidate evidence before drafting final verdict.
```

`evidence map --pr 64 --json` against an authenticated `gh` succeeded and
added `github` to `evidenceSourcesUsed`. Coverage stayed `partial` (covered 9,
candidate 5, missing 93, needs-human 7). No warnings; no mutation; no
`.ocoding/execution` directory was created.

`evidence map` against a temp project with no `docs/03-acceptance-criteria.md`
returned `coverageStatus: "no-acceptance-criteria"`, `ok: true`, `exit 0`, and
risk flag `acceptance-file-missing`.
