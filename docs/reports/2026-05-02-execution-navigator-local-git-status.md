# Execution Navigator — Local Git Status (MVP 1)

**Date**: 2026-05-02
**DEC basis**: [DEC-024 — Reframe BUILD / VERIFY as Execution Evidence Navigator](../20-decision-log.md#dec-024reframe-build--verify-as-execution-evidence-navigator)
**Plan reference**: [`docs/plans/2026-05-02-execution-evidence-navigator-plan.md`](../plans/2026-05-02-execution-evidence-navigator-plan.md)
**Prior PR**: [Execution Navigator — Command Skeleton (PR 1)](./2026-05-02-execution-navigator-command-skeleton.md)
**Branch**: `feat/execution-navigator-local-git-status`

---

## 1. Summary

`ocn exec status` graduates from skeleton to a real **local-git evidence reader**. The command now reports working-tree state, recent commits, and OCN project state — every value anchored to read-only `git` invocations against the local repository plus a read-only inspection of `.ocoding/state.json`.

This PR ships **only** that one command's behaviour change. The other five Execution Navigator commands (`github analyze-pr`, `evidence map`, `next-prompt`, `verify status`, `verdict draft`) remain skeleton with `implemented: false`, exactly as DEC-024 sequencing prescribes. There is **no GitHub API call**, **no CI log read**, **no `.ocoding/execution` write**, and **no project-state mutation**.

---

## 2. DEC basis

DEC-024 follow-up sequence step **2** — *"Read-only local git evidence MVP — `ocn exec status` against local `git status` / `git diff` / `git log`."* PR 1 (the skeleton) shipped step 1 of that sequence. PR 2 (this PR) implements step 2.

The PR honours every DEC-024 non-goal: no `npm publish`, no `latest` movement, no GA, no Cursor / Cline validation claim, no SOP gate change, no MCP tool addition, no removal of `0–10` strong gates.

---

## 3. Evidence collected

When the working directory is a git repo with at least one commit, `data.git` reports:

| Field            | Source                                            |
| ---------------- | ------------------------------------------------- |
| `isGitRepo`      | `git rev-parse --is-inside-work-tree`             |
| `repoRoot`       | `git rev-parse --show-toplevel`                   |
| `branch`         | `git branch --show-current` (empty = detached)    |
| `head`           | `git rev-parse --short HEAD` (failure = no commits) |
| `stagedFiles`    | `git status --porcelain=v1 -z` X-side classification |
| `unstagedFiles`  | `git status --porcelain=v1 -z` Y-side classification |
| `untrackedFiles` | `git status --porcelain=v1 -z` `??` rows          |
| `changedFiles`   | sorted union of the three lists above             |
| `isDirty`        | `changedFiles.length > 0`                          |
| `recentCommits`  | `git log --pretty=format:%h%x09%s -n 5`           |

The reader uses `--porcelain=v1 -z` so filenames containing spaces, tabs, or unicode are preserved verbatim. Renames emit both old and new paths under whichever side(s) git flagged.

When the working directory is a git repo with no commits, `git.head` is `null`, `git.recentCommits` is empty, and `git.reason` is `"no-commits"`.

When the working directory is not a git repo (or `git` is not on PATH), `git.isGitRepo` is `false` and `git.reason` is `"not-a-git-repository"` or `"git-not-found"`. No other git fields are populated.

`data.ocn` reports `currentStateId`, `currentStepId`, `sopProfileId`, and `sopProfileVersion` when `.ocoding/state.json` exists and parses; otherwise `isOcnProject: false` (with `reason: "state-missing"`) or `isOcnProject: true` with `reason: "state-unreadable"` and null structured fields.

`data.analysis` derives one of `"clean"`, `"dirty"`, `"no-git"`, or `"empty-repo"`, plus a list of risk flags (`working-tree-dirty`, `not-a-git-repository`, `no-commits`, `detached-head`, `git-not-found`, `ocn-state-unreadable`) and a single short next-suggested-action string.

---

## 4. CLI behaviour

```
ocn exec status
ocn exec status --json
ocn exec status --project-root /abs/path
```

JSON mode emits the project's existing `CommandResult<T>` envelope with `data.command === "exec.status"`, `data.implemented === true`, `data.noMutation === true`, `data.evidenceSourcesUsed === ["git", "ocn-state"]`, and the structured `git`/`ocn`/`analysis` fields described above.

Text mode prints a six-to-ten-line block: branch, HEAD short SHA, working-tree dirty/clean state, count of changed files (with up to five filenames), OCN current state/step (when initialized), and a one-sentence `Next:` action. Bilingual top-line message — Chinese first when the renderer's locale is `zh`.

Default `--project-root` is `process.cwd()`. A non-absolute `--project-root` argument fails with `ERR_IO_OR_CONFIG` (exit 4) before any git call is made.

When the `git` binary is missing, the command still returns success (exit 0) with `git.isGitRepo: false`, `git.reason: "git-not-found"` and analysis risk flag `git-not-found` — git absence is **evidence**, not failure.

---

## 5. Non-mutation guarantee

- **No git mutation.** The reader spawns `git` only with `rev-parse`, `branch --show-current`, `status --porcelain=v1 -z`, and `log --pretty=...`. No `fetch`, `pull`, `push`, `checkout`, `add`, `commit`, `merge`, `rebase`, `reset`, `clean`, `tag`, `stash`, or `branch -D`. Spawn uses `execFile` (no shell, no shell-string interpolation).
- **No GitHub call.** No `gh` CLI invocation. No GitHub API. No network access.
- **No `.ocoding/.lock` acquisition.** The state.json reader is a read-only inspector; it does not compete with the Core Engine's writer lock contract.
- **No `state.json.bak` write.** The state-store atomic-write code path is not invoked.
- **No `.ocoding/execution` directory creation.** Tests assert the directory does not exist after each command run.
- **No new npm dependency.** All git invocation is via Node `child_process.execFile`; no parser library, no git library.
- **No SOP / required-section / gate change.** The 0.2.0 strong-gated planning chain is untouched.
- **No MCP tool addition.** The MCP whitelist is unchanged.

A CLI test snapshots `git status --porcelain=v1 -z` plus `git log --oneline` before and after running the command and asserts the strings are byte-identical, on top of asserting `.ocoding` does not exist.

---

## 6. Tests

### Unit (`tests/unit/execution-navigator-local-git.test.ts`)

29 tests across four describe blocks:

- `parsePorcelainV1` — empty input, untracked, staged-only, unstaged-only, both-set, filenames with spaces, renames.
- `parseRecentCommits` — empty input, well-formed lines, subject-with-tabs preserved, malformed lines skipped.
- `readLocalGit` — non-git directory (reason `not-a-git-repository`), empty repo (`no-commits`), single-commit clean repo, unstaged modification, staged file, untracked file, recent commit subject parsed, filename-with-spaces preserved, no `.ocoding/execution` created.
- `readOcnProjectState` — absent state.json (`state-missing`), valid state.json round-trip, malformed JSON (`state-unreadable`), no `.ocoding/.lock` or `state.json.bak` written.
- `getExecStatus` — non-git classified `no-git`, empty repo classified `empty-repo`, clean repo classified `clean`, dirty repo classified `dirty` with `working-tree-dirty` risk flag, no `.ocoding/execution` created.

### CLI (`tests/cli/execution-navigator-local-git.test.ts`)

7 spawn-based tests:

1. `--json` in a single-commit git repo returns `implemented: true` with structured git data.
2. `--json` in a non-git directory returns `git.isGitRepo: false` and exits `0`.
3. Text output contains `Branch:`, `HEAD:`, and `Working tree:` lines.
4. `--project-root <abs>` runs against a different repo than `cwd`.
5. Non-absolute `--project-root` fails with `ERR_IO_OR_CONFIG` (exit `4`) and bilingual error message.
6. `git status --porcelain=v1 -z` plus `git log --oneline` are byte-identical before and after the command runs (no working-tree mutation, no `.ocoding` creation).
7. With `.ocoding/state.json` present and valid, `ocn.isOcnProject: true` with the expected `sopProfileId`, `sopProfileVersion`, `currentStateId`, `currentStepId`.

### Skeleton parity tests updated

- `tests/unit/execution-navigator-skeleton.test.ts` — narrowed to the five remaining skeleton commands (`github.analyze_pr`, `evidence.map`, `next_prompt`, `verify.status`, `verdict.draft`). The `EVIDENCE_SOURCES_PLANNED["exec.status"]` assertion is retained as `["git"]` because that table tracks the *external* evidence universe; the graduated MVP also reads local OCN state, but `ocn-state` is not an external evidence stream and stays out of `EvidenceSource`.
- `tests/cli/execution-navigator-skeleton.test.ts` — removed the `exec status` skeleton CLI test (now covered by the local-git CLI test) and removed `exec status` from the `.ocoding/execution` non-creation sweep.

### Targeted run

```
$ npx vitest run tests/unit/execution-navigator-skeleton.test.ts \
                tests/cli/execution-navigator-skeleton.test.ts
12 / 12 pass

$ npx vitest run tests/unit/execution-navigator-local-git.test.ts \
                tests/cli/execution-navigator-local-git.test.ts
36 / 36 pass
```

### Full suite

```
$ npm run test
698 / 698 pass across 84 files
```

### Lint / typecheck / build

```
$ npm run lint        # clean
$ npm run typecheck   # clean
$ npm run build       # clean
```

### Coverage

`npm run test:coverage` reports:

- `src/core/execution-navigator/local-git.ts` — 95.20 % statements, 73.77 % branches, 100 % functions.
- `src/core/execution-navigator/exec-status.ts` — 84.93 % statements, 68 % branches, 100 % functions.
- `src/core/execution-navigator/ocn-state-reader.ts` — high coverage; uncovered lines are defensive non-ENOENT IO failure branches.

Uncovered lines on `local-git.ts` are defensive branches around git binary failure variants and `git rev-parse --show-toplevel` failure after `--is-inside-work-tree` succeeded — paths the parser treats as fall-throughs to a sensible default.

### Manual smoke

```
$ TMP=$(mktemp -d) && cd "$TMP"
$ git init -q -b main && git config user.email test@example.com && git config user.name Test
$ echo hello > "file with spaces.md"
$ node /home/timou/repos/OCN/dist/cli/index.js exec status --json | head -20
{
  "ok": true,
  "code": "OK",
  "message": { "en": "Local execution evidence status collected.", "zh": "已收集本地执行证据状态。" },
  "data": {
    "command": "exec.status",
    "implemented": true,
    "noMutation": true,
    "evidenceSourcesUsed": ["git", "ocn-state"],
    "git": {
      "isGitRepo": true,
      "branch": "main",
      "head": null,
      "isDirty": true,
      "untrackedFiles": ["file with spaces.md"],
      …
      "reason": "no-commits"
    },
    "analysis": { "status": "empty-repo", "riskFlags": ["no-commits"], … }
  }
}
```

Filenames with spaces are preserved verbatim. The empty-repo classification fires correctly. No staging, no commit — the command did not touch the index.

---

## 7. Files

Added:

- `src/core/execution-navigator/local-git.ts` — read-only git evidence collector + pure parsers (`parsePorcelainV1`, `parseRecentCommits`).
- `src/core/execution-navigator/ocn-state-reader.ts` — read-only state.json inspector (no lock, no backup write).
- `src/core/execution-navigator/exec-status.ts` — orchestrator, analysis derivation, next-action picker.
- `tests/unit/execution-navigator-local-git.test.ts` — 29 tests.
- `tests/cli/execution-navigator-local-git.test.ts` — 7 tests.

Modified:

- `src/core/execution-navigator/types.ts` — added `EvidenceSourceUsed`, `GitReadReason`, `GitCommitRecord`, `ExecStatusGitData`, `OcnStateReadReason`, `ExecStatusOcnData`, `ExecStatusOverall`, `ExecStatusRiskFlag`, `ExecStatusAnalysis`, `ExecStatusData`.
- `src/cli/commands/exec.ts` — wires `getExecStatus` and `--project-root`. The skeleton path is removed for `exec status`; its description now reflects the implemented behaviour.
- `src/cli/render/text.ts` — adds `appendExecStatusBlock` to render the new shape; existing branches untouched.
- `tests/unit/execution-navigator-skeleton.test.ts` — narrowed to the five remaining skeleton commands.
- `tests/cli/execution-navigator-skeleton.test.ts` — drops the `exec status` skeleton tests (now covered by the local-git CLI test).

Untouched (per the PR's hard rules): `package.json`, `package-lock.json`, `.github/`, `README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`, `docs/20-decision-log.md`, `src/sops/**`.

---

## 8. Follow-up

Per DEC-024 follow-up sequence step **3**, the next PR is **MVP 2: read-only GitHub PR analysis** for `ocn github analyze-pr <number>`:

- Read-only access to PR title, body, commits, files-changed, GitHub Actions check runs, and review comments.
- No mutation, no merge, no comment-posting.
- Implementation will route through `gh` CLI or the GitHub API directly; tests will mock the network surface.
- The other four skeleton commands (`evidence map`, `next-prompt`, `verify status`, `verdict draft`) remain skeleton until later sequence steps.

---

## 9. Non-goals (explicitly out of scope for this PR)

- No npm publish. No `latest` dist-tag movement.
- No git tag / GitHub release.
- No GA promotion.
- No Cursor / Cline validation claim — DEC-019 boundary stands.
- No GitHub API call. No `gh` CLI invocation. No CI log read.
- No `next-prompt` generation.
- No new MCP tool.
- No SOP 0.2.0 required-section / gate / artifact change.
- No `package.json` / `package-lock.json` / `.github/workflows` change.
- No `README.md` / `docs/quickstart.md` / `docs/mcp-usage.md` change.
- No `.ocoding/execution` directory.
- No new npm dependency.
