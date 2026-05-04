# Execution Navigator — Command Skeleton (PR 1)

**Date**: 2026-05-02
**DEC basis**: [DEC-024 — Reframe BUILD / VERIFY as Execution Evidence Navigator](../20-decision-log.md#dec-024reframe-build--verify-as-execution-evidence-navigator)
**Plan reference**: [`docs/plans/2026-05-02-execution-evidence-navigator-plan.md`](../plans/2026-05-02-execution-evidence-navigator-plan.md)
**Branch**: `feat/execution-navigator-command-skeleton`

---

## 1. Summary

This PR adds the **Execution Navigator command skeleton** introduced by DEC-024. Six new top-level command surfaces are registered on the `ocn` CLI. Each command returns a structured "planned / not implemented yet" envelope that follows the existing `CommandResult<T>` shape and bilingual message contract.

Crucially, **this PR ships no behaviour change beyond CLI surface area**:

- No evidence ingestion of any kind.
- No GitHub API call. No `gh` CLI invocation.
- No `git status` / `git diff` / `git log` reads from code.
- No CI log reading.
- No project-state mutation. No file creation. No `.ocoding/execution` directory.
- No SOP 0.2.0 gate / required-section change.
- No change to the existing `check` / `gate` / `advance` flow.
- No new MCP tools. The MCP server whitelist is untouched.
- No `package.json` / `package-lock.json` / `.github/workflows` change.
- No README / quickstart / mcp-usage doc change.
- No npm publish, no `latest` movement, no tag, no release, no GA.

The product value of PR 1 is **discoverability of the navigator surface**, not the navigator's eventual behaviour. AI agents (Claude Code, Codex, LFG) and human users can now run `ocn --help`, `ocn exec --help`, etc., and get a typed answer about what is planned, what each command will eventually consume, and what will be implemented next — without OCN pretending to do real evidence work.

---

## 2. DEC basis

DEC-024 (`docs/20-decision-log.md`, accepted-for-planning) established that:

- `00–10` remains the strong-gated Planning Gatekeeper.
- `10+` is reframed as the Execution Evidence Navigator over git / GitHub PR / CI / review / issue signals.
- Implementation is sequenced over multiple PRs, each its own DEC-bound action.
- DEC-024 itself ships **planning only**; no runtime change.

PR 1 corresponds to step 1 of DEC-024's follow-up sequence: ship the navigator command surface so subsequent MVPs (local-git ingestion, GitHub PR analysis, AC mapping, next-prompt synthesis, verify rollup, verdict draft) plug into a stable, already-discoverable skeleton.

---

## 3. Commands added

| Command                            | `data.command`        | `evidenceSourcesPlanned` | `nextImplementation`                  |
| ---------------------------------- | --------------------- | ------------------------ | ------------------------------------- |
| `ocn exec status`                  | `exec.status`         | `["git"]`                | `local-git evidence ingestion`        |
| `ocn github analyze-pr <number>`   | `github.analyze_pr`   | `["github"]`             | `read-only GitHub PR analysis`        |
| `ocn evidence map`                 | `evidence.map`        | `["git","github","ci"]`  | `acceptance criteria evidence mapping`|
| `ocn next-prompt`                  | `next_prompt`         | `["git","github","ci"]`  | `agent prompt generator`              |
| `ocn verify status`                | `verify.status`       | `["github","ci"]`        | `verification status summariser`      |
| `ocn verdict draft`                | `verdict.draft`       | `["git","github","ci"]`  | `evidence-derived final verdict`      |

All six commands support `--json`. All six are read-only and side-effect-free. Five are registered as command groups (`exec`, `github`, `evidence`, `verify`, `verdict`) so `ocn <group> --help` lists their sub-commands; `next-prompt` is a top-level command per DEC-024 wording.

---

## 4. Current behaviour

Each command emits the existing project-wide `CommandResult<T>` envelope. The `data` payload conforms to a new typed shape `ExecutionNavigatorSkeletonData`:

```jsonc
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Execution Navigator command skeleton is available; evidence ingestion is not implemented yet.",
    "zh": "Execution Navigator 命令骨架已可用；证据读取尚未实现。"
  },
  "data": {
    "command": "exec.status",
    "status": "planned",
    "implemented": false,
    "evidenceSourcesPlanned": ["git"],
    "nextImplementation": "local-git evidence ingestion",
    "noMutation": true
  }
}
```

`ocn github analyze-pr <number>` validates `<number>` as a positive integer. Invalid input returns the project's standard `ERR_ARTIFACT_INVALID` failure envelope (exit code `2`). Valid input still returns the skeleton envelope — the GitHub API is not contacted.

---

## 5. Non-mutation guarantee

The skeleton holds the following invariants, each covered by tests:

- No command in this PR performs IO beyond reading argv and writing to stdout/stderr.
- No command creates `.ocoding/`, `.ocoding/execution`, or any other directory.
- No command invokes `gh`, `git`, or any network resource.
- No command requires `GH_TOKEN` / `GITHUB_TOKEN` to run (verified by stripping these env vars in the integration test).
- The existing `init` / `status` / `brief` / `doc` / `check` / `gate` / `advance` flow is unchanged. The full project test suite (`663` tests, including the SOP 0.2.0 19-step end-to-end flow and the `plan-to-verify` example smoke) passes.

---

## 6. Files added

- `src/core/execution-navigator/types.ts` — typed surface (`ExecutionNavigatorCommand`, `EvidenceSource`, `ExecutionNavigatorSkeletonData`).
- `src/core/execution-navigator/skeleton.ts` — `buildSkeletonData` / `skeletonResult` plus the named constants `NEXT_IMPLEMENTATION_LABEL` and `EVIDENCE_SOURCES_PLANNED`.
- `src/cli/commands/exec.ts` — `exec status`.
- `src/cli/commands/github.ts` — `github analyze-pr <number>` with positive-integer validation.
- `src/cli/commands/evidence.ts` — `evidence map`.
- `src/cli/commands/next-prompt.ts` — `next-prompt`.
- `src/cli/commands/verify.ts` — `verify status`.
- `src/cli/commands/verdict.ts` — `verdict draft`.
- `tests/unit/execution-navigator-skeleton.test.ts` — pure-function tests on the skeleton factory.
- `tests/cli/execution-navigator-skeleton.test.ts` — spawn-based CLI tests covering JSON envelopes, validation failure path, no-mutation invariant, and `--help` discoverability.

Modified:

- `src/cli/index.ts` — registers the six new command surfaces. No other change.

---

## 7. Tests

Targeted run:

```
npx vitest run tests/unit/execution-navigator-skeleton.test.ts \
              tests/cli/execution-navigator-skeleton.test.ts
```

- 13 / 13 pass (4 unit + 9 CLI).

Full suite:

```
npm run test
```

- 663 / 663 pass across 82 files (no regressions).

Lint / typecheck / build:

```
npm run lint        # clean
npm run typecheck   # clean
npm run build       # clean
```

Coverage (`npm run test:coverage`):

- `src/core/execution-navigator/skeleton.ts` — 100 % statements, branches, functions, lines.
- `src/core/execution-navigator/types.ts` — 0 % executable lines (the file is pure type declarations; expected).

---

## 8. Follow-up

Per DEC-024 follow-up sequence step 2, the next PR is **MVP 1: local-git evidence ingestion for `ocn exec status`**. That PR will:

- Read local `git status` / `git diff` / `git log` from inside the OCN process (no shelling out to a foreign tool unless deliberate).
- Begin returning a real `data.implemented: true` payload from `ocn exec status`, with structured branch / dirty-state / divergence-vs-base data.
- Keep the other five skeleton commands skeleton-only.
- Continue to perform no GitHub API call and no `.ocoding/execution` mutation.

---

## 9. Non-goals (explicitly out of scope for this PR)

- No npm publish.
- No `latest` dist-tag movement.
- No git tag / GitHub release.
- No GA promotion.
- No Cursor / Cline validation claim — DEC-019 boundary stands.
- No GitHub API implementation. No `gh` CLI invocation. No real git read.
- No new MCP tools. The MCP whitelist is unchanged.
- No SOP 0.2.0 required-section / gate / artifact change.
- No deletion of `11–18` artifacts.
- No `package.json` / `package-lock.json` / `.github/workflows` change.
- No README / quickstart / mcp-usage doc change.
