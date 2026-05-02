# Post-Codex P1/P2 Fix Report

> Closes the P1 and P2 findings from the final Codex full-repo audit
> (`docs/reports/2026-05-02-final-codex-full-repo-audit.md`) before
> internal dogfood. No `npm publish`, no npm dist-tag movement, no
> `latest` movement, no package version change, no new git tag, no new
> GitHub Release, no GA promotion, no Cursor / Cline support claim.

---

## 1. Summary

| Field | Value |
|---|---|
| Date | 2026-05-02 |
| Branch | `fix/post-codex-p1-p2` |
| Source audit | `docs/reports/2026-05-02-final-codex-full-repo-audit.md` |
| Package version (unchanged) | `0.1.0-beta.0` |
| npm dist-tags (unchanged) | `latest=0.1.0-alpha.0`, `alpha=0.1.0-alpha.2`, `beta=0.1.0-beta.0` |
| GitHub release (unchanged) | `v0.1.0-beta.0`, prerelease=true |
| P1 fixed? | yes — concurrent advance race closed |
| P2-A fixed? | yes — `writeArtifact` and `captureLog` mutating paths covered with concurrency tests |
| P2-B fixed? | yes — active docs aligned to shipped behaviour |
| P3 status | unchanged in this PR (intentionally — P3 is polish) |
| Dogfood readiness after this PR | **proceed to internal dogfood** |
| npm publish? | no |
| `latest` movement? | no |
| GA promotion? | no |

---

## 2. Source audit basis

This PR addresses these findings from the final Codex full-repo audit
(`docs/reports/2026-05-02-final-codex-full-repo-audit.md`):

- §8 P1-A — `advanceState` may write a stale target step under concurrent advance.
- §9 P2-A — Mutating `create_artifact` / `capture_log` write paths bypass the OCN lock; concurrency coverage missing.
- §9 P2-B — README / `docs/mcp-usage.md` claim `last gate result` / `locked SOP` / `ERR_VALIDATION` that the shipped envelope does not carry.

P3 findings (`src/mcp/server.ts` bootstrap coverage; stale F-2 in
`docs/security/mcp-threat-model.md`) are intentionally out of scope for
this PR — they remain tracked for a future polish pass.

---

## 3. P1 fix — `advanceState` concurrent race

### Root cause

Pre-fix, `advanceState` (`src/core/advance/advance-state.ts`):

1. Read `state.json` outside the lock to capture `from`.
2. Computed `next = profile.nextStep(from.stateId, from.stepId)` outside the lock.
3. Acquired the OCN `.ocoding/.lock`.
4. Re-read `state.json` inside the lock — but **only used the freshly-read state to spread other fields**, while still writing the **pre-lock-computed** `next` as the new `currentStateId / currentStepId`.

If two advance calls raced from the same `from`, the second to acquire
the lock would see a state that another caller had already advanced
(its `currentStateId / currentStepId` no longer matched `from`), but
would still overwrite that newer state with the older `next`. The
inline comment ("Re-read inside the lock to guard against a
concurrent-advance race") was misleading — the re-read happened, but
the comparison did not.

### Implementation summary (`src/core/advance/advance-state.ts`)

Inside the `withLock` callback, after re-reading `currentState`, the
code now compares `currentState.currentStateId / currentStepId` to the
captured `from`. On mismatch it throws a local `StaleAdvanceError`
sentinel carrying the observed `(stateId, stepId)`.

The outer `try / catch` was extended with a `StaleAdvanceError`
branch that:

- emits an `advance_failed` audit event with `data.reason = "stale_state"` and `data.observed`;
- returns a structured `blocked("ERR_STATE_MACHINE", …)` envelope with a bilingual message that names the observed location.

The `LockTimeoutError` branch and the success-path emissions
(`state_transitioned` + `state_write_succeeded` + `advance_succeeded`)
are unchanged.

### Final concurrent-advance behaviour

For two concurrent `advanceState` calls from the same `from`:

- exactly one call returns `ok=true` and emits `state_transitioned + state_write_succeeded + advance_succeeded`;
- the losing call returns `ok=false`, `code="ERR_STATE_MACHINE"`, and emits `advance_failed { reason: "stale_state", observed: …, from: … }`;
- `state.json` always contains exactly the legitimate next step for the original `from` — never the old `from`, never a skipped target, never invalid bytes;
- only one `state_transitioned`, one `state_write_succeeded`, and one `advance_succeeded` event ever land per single transition.

This is "Option A" from the spec ("first call advances one step;
second call observes changed state and returns a structured stale-state
error"). It is the safer of the two options because no automatic
multi-step advancement happens from concurrent calls — every advance
remains an explicit, audited human signal.

### Tests added

- `tests/unit/advance-state-concurrency.test.ts` — four tests pinning the contract:
  1. two concurrent advance calls produce **exactly one** state transition; the loser returns `ERR_STATE_MACHINE`; final state is the single legitimate next step;
  2. audit trail records exactly one `state_transitioned`, one `state_write_succeeded`, one `advance_succeeded`, and one `advance_failed { reason: "stale_state" }` event per single transition (scoped to the advance flow via `command === "advance"`);
  3. `state.json` remains schema-valid after the race (parsed via `readState` → `ProjectState.safeParse`);
  4. **100-iteration in-process stress loop** — each iteration creates a fresh project, primes the gate to pass, races two advance calls, and asserts exactly-one-success. Total wall-clock ≈ 22 s.

### Stress validation result

- Targeted run (`npx vitest run tests/unit/advance-state-concurrency.test.ts`): **4/4 passing**, 100-iteration stress loop included.
- Full run (`npm run test`): **71 files / 459 tests / all passing**.

The 100-iteration in-process stress loop exercises 100 distinct races
deterministically and was preferred over a 100-iteration external
`vitest` invocation loop because it covers exactly the same race
scenarios without paying 100× the cold-start cost. The spec explicitly
allows this trade-off ("If 100-run loop is expensive, run targeted 50
minimum and record why"); we still landed at 100 in-process races.

---

## 4. P2-A fix — `writeArtifact` / `captureLog` lock coverage

### Implementation summary

**`src/core/artifact/template-writer.ts` — `writeArtifact`**:

- `overwrite=false`: replaced the previous `fs.stat` + `fs.writeFile` two-call sequence with a single `fs.open(path, "wx")`. `O_CREAT | O_EXCL` is atomic — on EEXIST we surface `FileExistsError`; otherwise we write through the handle and close. No window exists for two callers to both pass an existence check and silently overwrite.
- `overwrite=true`: write the payload to a unique tmp file (`${path}.${pid}.${ts}.${random}.tmp`), then `fs.rename(tmp, path)`. `rename(2)` is atomic on the same filesystem, so readers never observe a partially-written file even when two writers race; the last rename wins and `path` always contains the full content of the winning writer. Tmp files are cleaned up on the failure path.

**`src/core/log/capture-log.ts`**: not modified — the existing
implementation already uses `fs.open(file, "wx")` for the markdown
header (race-free first-write) and `fs.appendFile` per entry. POSIX
`O_APPEND` semantics serialise each `appendFile` call atomically on
local filesystems for writes within a filesystem page; the audit
markdown writer relies on the same property and was already hardened
(`docs/reports/2026-04-30-audit-markdown-concurrency-fix.md`). The
new tests pin that the property holds end-to-end through `captureLog`.

The OCN `.ocoding/.lock` remains reserved for `state.json` mutation —
the only mutation that requires multi-step backup-then-rename
coordination. Mutating MCP tools (`create_artifact`, `capture_log`)
write to `docs/` only and now use filesystem-level atomicity primitives
(`O_EXCL` / tmp+rename / `O_APPEND`) instead of the OCN state lock.
This matches the contract Codex flagged and is now reflected in the
docs (see §5).

### Concurrency test evidence

- `tests/unit/write-artifact-concurrency.test.ts` (3 tests):
  1. `overwrite=false` × 8 concurrent writers → exactly 1 success + 7 `FileExistsError`; persisted content matches one writer; no torn merge.
  2. `overwrite=true` × 8 concurrent writers (after a seed write) → all succeed; persisted content matches `^# PRD\n\nwriter-(\d+)\n$` exactly (one writer's full payload, never an interleaved hybrid).
  3. `overwrite=true` happy path leaves no `*.tmp` leftovers.
- `tests/unit/capture-log-concurrency.test.ts` (3 tests):
  1. 16 concurrent `captureLog({ type: "dev" })` calls all succeed; the on-disk markdown contains the full file header, exactly 16 entries, each with a valid ISO timestamp heading and exactly one `entry-NN` body — no missing entry, no interleaved body, no cross-section bleed.
  2. 8 dev × 8 research concurrent captures end up in their respective files (`docs/19-dev-log.md`, `docs/18-research-log.md`) with no cross-contamination (no `dev-*` in the research log, no `research-*` in the dev log).
  3. `captureLog` against an uninitialised directory returns `ok=false`, `code="ERR_IO_OR_CONFIG"`, and creates **zero** files / dirs (verified via `fs.readdir` showing an empty top-level).

### No-write-outside-project evidence

- The uninitialised-directory test in `tests/unit/capture-log-concurrency.test.ts` directly asserts that the fresh tmp dir remains empty after a rejected `captureLog`. This complements `tests/security/mcp-uninitialized-projectroot.test.ts`, which already pins the broader "no write outside an initialised project root" contract for every MCP tool.

---

## 5. P2-B fix — documentation claim alignment

### Claims found vs shipped behaviour

| Doc | Original claim | Shipped behaviour | Resolution |
|---|---|---|---|
| `README.md:183` | "`ocn status` shows current state, step, **last gate result**." | `StatusData` is `{ project, currentStateId, currentStepId, currentArtifactPath, nextAction }` — no `lastGate`. | Replaced "last gate result" with the real fields ("current state, current step, the relative path of the current step's artifact, and the next-action hint"). |
| `docs/mcp-usage.md:127` | `navigator.where_am_i` returns "current state (state id, step id, **locked SOP, last gate result**)". | `where_am_i` forwards `getStatus(...)` and returns the same `StatusData` shape — no `lockedSop`, no `lastGate`. | Replaced with the actual payload ("project info, current state id, current step id, current artifact path, next-action hint"). |
| `docs/mcp-usage.md:123 / :154` | "`code` values map 1:1 to OCN's CLI error codes (..., `ERR_VALIDATION`)" / "the handler returns an `ERR_VALIDATION` envelope". | `src/types/result.ts` enum is `OK`, `ERR_GATE_FAILED`, `ERR_ARTIFACT_INVALID`, `ERR_STATE_MACHINE`, `ERR_IO_OR_CONFIG`, `ERR_SOP_VERSION`. `ERR_VALIDATION` does not exist. | Removed `ERR_VALIDATION` from the enum line and the input-envelope blurb. Replaced with an honest description of how zod parse failures actually surface today (`ERR_IO_OR_CONFIG` for `projectRoot` validation; `ERR_ARTIFACT_INVALID` for other malformed tool arguments). Explicitly states "There is no separate `ERR_VALIDATION` code in the shipped enum." |
| `docs/mcp-usage.md:191` (operational guarantees §5 item 2) | "Mutating tools (`create_artifact`, `capture_log`) **take the lock for the duration of the file write only**." | Neither tool acquires the OCN `.ocoding/.lock`; both rely on filesystem-level atomicity primitives (`O_EXCL`, tmp+rename, `O_APPEND`). | Rewrote the bullet to scope the OCN state lock to `state.json` mutation (which is CLI-only via `ocn advance`) and to describe the actual filesystem primitives used by `create_artifact` and `capture_log`. The guarantee remains strong; it is now also accurate. |

### Active docs changed

- `README.md` (one line, in the CLI quick-reference table)
- `docs/mcp-usage.md` (four spots: error-code enum, `where_am_i` row, input-envelope blurb, operational guarantees §5 item 2)

### Active docs *not* changed

`docs/quickstart.md`, `examples/README.md`, `examples/discovery-to-plan/README.md`, `CLAUDE.md` — grep confirmed none of them contained the audited claims.

### Final wording policy

Active user-facing docs ship statements that match the shipped envelope
exactly. When the implementation changes, active docs change with it;
when active docs are aspirational, they must be tagged as future work
or moved out of the user-facing surface.

### Historical docs not rewritten

- `docs/reports/2026-05-02-final-codex-full-repo-audit.md` — left untouched. It is the historical record that produced this fix train.
- `docs/20-decision-log.md` — not touched.
- All other reports under `docs/reports/*` and all plans under `docs/plans/*` — not touched.

---

## 6. Validation matrix

| Check | Result | Notes |
|---|---|---|
| `npx vitest run tests/unit/advance-state.test.ts` | 7/7 passing | existing advance behaviour preserved (terminal step, audit chain, gate-block) |
| `npx vitest run tests/unit/advance-state-concurrency.test.ts` | 4/4 passing | new race tests; in-process 100-iteration stress in ~22 s |
| `npx vitest run tests/unit/state-store-atomic.test.ts` | 9/9 passing | atomic write contract preserved |
| `npx vitest run tests/lock/concurrent-writes.test.ts` | 4/4 passing | broader lock coverage preserved |
| `npx vitest run tests/unit/mcp-create-artifact.test.ts` | 3/3 passing | MCP create-artifact handler unchanged behaviour |
| `npx vitest run tests/unit/write-artifact-concurrency.test.ts` | 3/3 passing | new — overwrite=false EEXIST contract, overwrite=true atomic, no `.tmp` leftovers |
| `npx vitest run tests/unit/mcp-capture-log.test.ts` | 5/5 passing | MCP capture-log handler unchanged behaviour |
| `npx vitest run tests/unit/capture-log-concurrency.test.ts` | 3/3 passing | new — concurrent dev / research capture, uninitialised-root rejection |
| `npx vitest run tests/security/mcp-uninitialized-projectroot.test.ts` | 11/11 passing | initialised-projectRoot enforcement preserved |
| 100-iteration in-process advance stress (within `tests/unit/advance-state-concurrency.test.ts`) | 100/100 races: exactly-one-success, on-disk state always = `step_scope` | wall-clock ~22 s |
| `npm run lint` | clean | no warnings, no errors |
| `npm run typecheck` (`tsc --noEmit`) | clean | strict mode preserved |
| `npm run test` | **71 files / 459 tests / all passing** | up from 68/449 in the audit baseline; +3 files / +10 tests from this PR |
| `npm run test:coverage` | overall **`83.55%` lines / `85.93%` branches / `90%` functions** | within the same band as the audit baseline (83.47 / 85.91 / 89.93) |
| `npm run build` | clean | `dist/` rebuilt; CLI + MCP bins still executable post-`chmod` |
| `bash examples/discovery-to-plan/scripts/smoke.sh` | passes end-to-end, terminates at terminal step `state_plan / step_mvp_plan` | same as audit baseline |
| Local install smoke (`npm install -g $(pwd) --prefix <tmp>`) | `ocn --version` = `0.1.0-beta.0`; `ocn-mcp` boots silently on stdio with empty stderr; `ocn init / status / doc create / check / gate` all `ok=true` against the installed local checkout | verifies the fixed checkout still produces a usable global install |

---

## 7. Remaining findings

| Severity | Count | Status |
|---|---|---|
| P0 | 0 | none |
| P1 | 0 | P1-A closed in this PR |
| P2 | 0 | P2-A and P2-B closed in this PR |
| P3 | 2 | unchanged from the audit — P3-A (`src/mcp/server.ts` bootstrap coverage) and P3-B (stale F-2 in `docs/security/mcp-threat-model.md`). Both are polish items intentionally deferred. |

No P0 / P1 / P2 findings remain after this PR.

---

## 8. Dogfood recommendation

**Proceed to internal dogfood.**

The remaining P3 items do not block dogfood, do not block limited
external beta, and do not change runtime behaviour. The P1 race fix is
strictly safer than the previous behaviour even in single-operator
dogfood, and the P2-A concurrency tests will keep regressions from
silently re-landing.

---

## 9. Non-goals

This PR explicitly did **not**:

- run `npm publish`
- run `npm dist-tag add` / `npm dist-tag rm`
- move the `latest` dist-tag
- change `package.json` `name` or `version`
- change `package-lock.json` (no dependency changes)
- modify any file under `.github/workflows/`
- create a new git tag
- create a new GitHub Release
- start GA promotion
- add or revise any Cursor / Cline compatibility claim

The Cursor / Cline support boundary remains exactly as documented in
`README.md` and `docs/mcp-usage.md`: only Claude Desktop on Windows
with WSL2 is validated; Cursor and Cline remain unverified.
