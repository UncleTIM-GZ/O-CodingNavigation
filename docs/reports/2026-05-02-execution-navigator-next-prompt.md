# Execution Navigator MVP 4 — `ocn next-prompt` agent prompt generator

> Generated: 2026-05-04
> DEC: DEC-024 (Execution Navigator)
> PR: feat/execution-navigator-next-prompt
> Scope: read-only deterministic prompt generator; no LLM, no mutation, no file writes.

---

## 1. Summary

`ocn next-prompt` deterministically generates an agent prompt by composing
existing read-only readers — local git evidence, OCN project state, the
acceptance criteria evidence map, and (optionally) GitHub PR evidence — into a
markdown task brief targeted at a coding agent (Claude Code / Codex / LFG /
generic). The generator is pure assembly: same inputs produce byte-identical
prompt strings. There is no LLM call, no network call (beyond the existing
read-only `gh pr view` allowlisted runner used only when `--pr <n>` is
provided), and no project mutation.

## 2. DEC basis

- DEC-024 — Execution Navigator (`docs/20-decision-log.md`).
- Plan: `docs/plans/2026-05-02-execution-evidence-navigator-plan.md`.
- MVP 0 / 1 / 2 / 3 reports under `docs/reports/2026-05-02-execution-navigator-*.md`.

## 3. Prompt structure

The body always contains nine sections in this exact order, with the markdown
H1 and H2 headings shown below:

```
# Agent Task Brief
## Current objective                  — single short paragraph
## Current evidence                   — bulleted git + ocn + optional PR facts
## Acceptance evidence status         — coverage status, counts, top missing
## Blocking issues or risks           — deduplicated, sorted risk flags
## Allowed work                       — mode/evidence-dependent allowed bullets
## Forbidden actions                  — full ordered list (always present)
## Required verification commands     — fenced shell block
## Stop conditions                    — fixed ordered list
## Expected completion output         — fixed ordered list
```

When `--agent` is one of `claude-code | codex | lfg`, a one-line overlay is
prepended verbatim before `# Agent Task Brief`. The `generic` agent uses no
overlay so the base body is the prompt.

## 4. Evidence sources

| Source           | When read                                                   |
| ---------------- | ----------------------------------------------------------- |
| `local-git`      | always (read-only `git rev-parse / branch / log / status`)  |
| `ocn-state`      | always (read-only `.ocoding/state.json` parse)              |
| `acceptance-map` | always when `docs/03-acceptance-criteria.md` exists         |
| `github`         | only when `--pr <n>` is provided (allowlisted `gh pr view`) |

`evidenceSourcesUsed` in the JSON envelope lists exactly the sources that
contributed evidence to the assembled prompt. Failures of optional sources
degrade to warnings; the prompt still assembles from whatever is available.

## 5. Modes and agents

Agents (enum): `generic | claude-code | codex | lfg`
Modes (enum): `continue | fix | verify | review`

Mode behaviour:

- `continue` — default; conservative allowed-work set.
- `fix` — when CI is failing on the linked PR, allow modifying the failing
  test or its production code plus the narrowest sibling files; prepend a CI
  warning comment to the verification commands block.
- `verify` — append `npm run test:coverage` to the verification commands.
  When coverage is `complete`, restrict allowed-work to running verification
  only.
- `review` — analysis-only allowed work; prepend `Do not modify any file in
  this session.` to the forbidden-actions list.

Agent overlays are constant strings in
`src/core/execution-navigator/next-prompt-templates.ts` so changes to wording
require an explicit code edit.

## 6. Safety rules — Forbidden actions list (verbatim)

- Do not publish to npm.
- Do not move the npm "latest" tag.
- Do not bump package version.
- Do not create git tags or GitHub releases.
- Do not declare GA, beta promotion, or stable release.
- Do not claim Cursor / Cline / external IDE validation that did not occur in this session.
- Do not perform unrelated refactors.
- Do not bypass tests, lint, or typecheck.
- Do not modify files outside the Allowed work scope without explaining why.
- Do not call any LLM API or external network service.
- Do not run git mutation commands (push, force-push, reset --hard, branch -D) unless explicitly authorised.
- Do not modify .github/workflows.
- Do not modify SOP profiles under src/sops/**.

In `--mode review` an extra line is prepended: `Do not modify any file in this session.`

## 7. CLI behavior

```
ocn next-prompt
ocn next-prompt --json
ocn next-prompt --project-root /abs/path
ocn next-prompt --pr 65
ocn next-prompt --agent claude-code | codex | lfg | generic
ocn next-prompt --mode continue | fix | verify | review
ocn next-prompt --issue "short issue description"
```

Defaults: `--project-root` = `process.cwd()`, `--agent` = `generic`,
`--mode` = `continue`.

Validation rules (all run before the gh runner is constructed):

- `--pr <n>` must be a positive integer; otherwise `ERR_ARTIFACT_INVALID`
  (exit 2). Runner is not invoked.
- `--agent` must be one of the supported agents; otherwise
  `ERR_ARTIFACT_INVALID` (exit 2).
- `--mode` must be one of the supported modes; otherwise
  `ERR_ARTIFACT_INVALID` (exit 2).
- `--project-root` must be an absolute path; otherwise `ERR_IO_OR_CONFIG`
  (exit 4).
- `--issue` is free-form; trimmed and capped at 500 chars; on overflow a
  `issue text truncated to 500 chars` warning is appended.

## 8. Non-mutation guarantee

The generator commits to the following invariants, enforced by tests:

- No write of any file under the project root (snapshot before/after).
- No creation of `.ocoding/` or `.ocoding/execution`.
- The `gh` runner is only ever called with the existing read-only allowlist
  (`pr view`, `auth status`).
- The runner is invoked only when `--pr <n>` is provided.
- No `git` invocation outside the existing `local-git.ts` reader, which is
  itself read-only.
- No `fetch`, `axios`, `node:https`, `undici`, or LLM SDK import in the new
  source.

## 9. Tests

New test files:

- `tests/unit/execution-navigator-next-prompt.test.ts` — 17 tests covering
  section ordering, `--issue` override, risk-flag dedup/sort, full forbidden
  list and order, base verification commands, smoke / coverage append rules,
  review-mode restrictions, agent overlays, acceptance-file-missing flow,
  determinism (byte-identical prompt for identical inputs), and snapshot
  before/after no-mutation check.
- `tests/cli/execution-navigator-next-prompt.test.ts` — 8 tests covering text
  header, JSON envelope, claude-code overlay in fix mode, `--pr 65` via
  fixture runner, validation failures (`--agent foo`, `--mode bar`,
  `--pr abc`), runner-not-called on invalid `--pr`, and no `.ocoding/`
  creation.

Updated tests:

- `tests/unit/execution-navigator-skeleton.test.ts` — `next_prompt` removed
  from the runtime skeleton list (still keeps a `NEXT_IMPLEMENTATION_LABEL`
  entry).
- `tests/cli/execution-navigator-skeleton.test.ts` — replaced the
  `next-prompt --json returns ok skeleton` test with the new
  `implemented:true` shape; left `verify.status` and `verdict.draft` skeleton
  assertions intact.

## 10. Follow-up

Next PR: `ocn verify status` summarizer (MVP 5) — combines local script
results, GitHub checks rollup (when `--pr` provided), and the acceptance
evidence map into a single `verify.status` envelope. Read-only, deterministic,
same safety rules.

## 11. Non-goals

- No `npm publish`.
- No movement of the npm `latest` tag.
- No CI log body ingestion (only the structured `gh pr view --json
  statusCheckRollup` summary is used, via the existing reader).
- No LLM API call.
- No new MCP tool exposure.
- No GA promotion or beta cut.
- No SOP profile changes.
- No new npm dependency.
