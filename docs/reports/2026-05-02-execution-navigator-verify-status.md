# Execution Navigator MVP 5 — `ocn verify status` summarizer

> Generated: 2026-05-04
> DEC: DEC-024 (Execution Navigator)
> PR: feat/execution-navigator-verify-status
> Scope: read-only deterministic verification readiness summarizer; no LLM, no
> mutation, no command execution from inside the implementation.

---

## 1. Summary

`ocn verify status` summarizes verification readiness deterministically from
`package.json` script presence, local git evidence, OCN project state, the
acceptance evidence map, and (optionally) GitHub PR checks. The command is
pure summary — it never spawns `npm run lint`, `npm run test`, `npm run build`,
or any other side-effecting verification command. The listed
`requiredCommands` are produced for humans / agents to execute. No LLM, no
network call beyond the existing read-only `gh pr view` allowlisted runner,
and no project mutation.

## 2. DEC basis

- DEC-024 — Execution Navigator (`docs/20-decision-log.md`).
- Plan: `docs/plans/2026-05-02-execution-evidence-navigator-plan.md`.
- MVP 0 / 1 / 2 / 3 / 4 reports under `docs/reports/2026-05-02-execution-navigator-*.md`.

## 3. Evidence sources

| Source           | When read                                                      |
| ---------------- | -------------------------------------------------------------- |
| `package.json`   | always (read-only `fs.readFile`; defensive parse)              |
| `local-git`      | always (read-only `git rev-parse / branch / log / status`)     |
| `ocn-state`      | always (read-only `.ocoding/state.json` parse)                 |
| `acceptance-map` | always (`docs/03-acceptance-criteria.md` + evidence-map.ts)    |
| `github`         | only when `--pr <n>` is provided AND mode is `pr` or `combined`|

`evidenceSourcesUsed` lists exactly the sources that contributed to the
envelope. Failures of optional sources (gh) degrade to warnings — the verdict
still computes from local evidence.

## 4. Status rules (priority order)

The verdict's `verification.status` is computed deterministically — the first
rule that matches wins:

1. `blocked` — any of:
   - PR `checks.summary === "failure"`
   - PR `mergeStateStatus` ∈ {`DIRTY`, `BLOCKED`, `BEHIND`}
   - acceptance `coverageStatus === "missing"`
   - some local scripts present but the four required ones are incomplete and
     no PR fallback (cannot run any verification at all)
2. `pending` — PR `checks.summary === "pending"`
3. `no-verification-data` — no scripts AND no acceptance criteria AND no PR
4. `ready` — all four required scripts present (`lint`, `typecheck`, `test`,
   `build`); acceptance `coverageStatus ∈ {complete, partial}` with
   `criteriaCount > 0`; PR (if supplied) checks `success` and not draft;
   working tree clean OR mode is `pr`
5. `partial` — default catch-all when some evidence exists but none of the
   above applied (covers dirty tree, `coverage-partial`, missing coverage
   script, `no-review-yet`, etc.)

## 5. CLI behavior

```
ocn verify status
ocn verify status --json
ocn verify status --project-root /abs/path
ocn verify status --pr 66
ocn verify status --mode local
ocn verify status --mode pr
ocn verify status --mode combined
```

Defaults: `--project-root` = `process.cwd()`, `--mode` = `combined`.

Validation rules (all run before the gh runner is constructed):

- `--mode` must be one of `local | pr | combined`; otherwise
  `ERR_ARTIFACT_INVALID` (exit 2).
- `--pr <n>` must be a positive integer; otherwise `ERR_ARTIFACT_INVALID`
  (exit 2). Runner is not invoked.
- `--mode pr` requires `--pr <number>`; otherwise `ERR_ARTIFACT_INVALID`
  (exit 2) with the exact phrase `mode \`pr\` requires \`--pr <number>\`.`.
- `--mode local` ignores `--pr` if provided (warning emitted; no gh call).
- `--project-root` must be an absolute path; otherwise `ERR_IO_OR_CONFIG`
  (exit 4).

## 6. Required commands inference

Detected from `package.json`'s `scripts` field. Emitted in this priority
order:

1. `npm run lint` (when `lint` script exists)
2. `npm run typecheck` (when `typecheck` script exists)
3. `npm run test` (when `test` script exists)
4. `npm run build` (when `build` script exists)
5. `npm run test:coverage` (when `test:coverage` exists; otherwise
   `npm run coverage` is preferred only when `test:coverage` is missing)
6. `bash examples/plan-to-verify/scripts/smoke.sh` (only when that script
   file exists on disk)

Resolution rule for coverage: `test:coverage` is checked first; if absent,
the `coverage` script is used. The reader sets `local.scripts.coverage = true`
if either is present and emits `npm run test:coverage` as the canonical
command (which is what OCN itself defines).

If no scripts are detected, `requiredCommands` is empty.

## 7. `readyForReview` logic

Single line: `verification.readyForReview === (verification.status === "ready")`.

False otherwise. The CLI text renderer surfaces this as `Ready for review:
yes|no`.

## 8. Non-mutation guarantee

The summarizer commits to the following invariants, enforced by tests:

- No write of any file under the project root (snapshot before/after).
- No creation of `.ocoding/` or `.ocoding/execution`.
- The `gh` runner is only ever called with the existing read-only allowlist
  (`pr view`, `auth status`).
- The runner is invoked only when `--pr <n>` is provided AND mode is `pr` or
  `combined`. `--mode local` short-circuits the gh path before the runner is
  built and emits a `ignoring --pr` warning.
- No `git` invocation outside the existing `local-git.ts` reader, which is
  itself read-only.
- No `npm run`, no shell exec of build/test/lint commands from inside the
  summarizer source.
- No `fetch`, `axios`, `node:https`, `undici`, or LLM SDK import in the new
  source (verified by static grep).

## 9. Tests

New test files:

- `tests/unit/execution-navigator-verify-status.test.ts` — 17 tests covering
  script detection (all four + coverage variants), missing-coverage path,
  missing-package.json graceful degradation, smoke condition, mode handling
  (`local` ignores `--pr`, `combined` without `--pr`, `combined` with `--pr`
  and successful fetch), status derivation (`ready`, `partial` on dirty tree,
  `blocked` on PR `failure`, `blocked` on `coverage-missing`, `pending` on PR
  pending checks, `no-verification-data`), `readyForReview` equivalence,
  risk-flag dedup/sort, byte-identical determinism, and snapshot before/after
  no-mutation check.
- `tests/cli/execution-navigator-verify-status.test.ts` — 8 tests covering
  text mode header, JSON envelope, `--mode local --json` excludes `pr` and
  `github` sources, `--mode combined --pr 66 --json` via fixture runner,
  validation failures (`--mode foo`, `--pr abc`, `--mode pr` without `--pr`),
  runner-not-called on invalid `--pr`, and no `.ocoding/` creation.

Updated tests:

- `tests/unit/execution-navigator-skeleton.test.ts` — `verify.status` removed
  from the runtime skeleton list (the `EVIDENCE_SOURCES_PLANNED` and
  `NEXT_IMPLEMENTATION_LABEL` table entries remain). Only `verdict.draft`
  remains skeleton.
- `tests/cli/execution-navigator-skeleton.test.ts` — replaced the
  `verify status --json returns ok skeleton` test with the new
  `implemented:true` shape; left `verdict.draft` skeleton assertion intact.

## 10. Follow-up

Next PR: `ocn verdict draft` — evidence-derived final verdict generator
(MVP 6). Composes the verify-status summarizer + acceptance evidence map +
optional GitHub PR analysis into a structured final-build-verdict envelope.
Read-only, deterministic, same safety rules.

## 11. Non-goals

- No `npm publish`.
- No movement of the npm `latest` tag.
- No CI log body ingestion (only the structured `gh pr view --json
  statusCheckRollup` summary is used, via the existing reader).
- No execution of `lint` / `typecheck` / `test` / `build` from inside the
  command — humans / agents run the listed commands.
- No LLM API call.
- No new MCP tool exposure.
- No GA promotion or beta cut.
- No SOP profile changes.
- No new npm dependency.
