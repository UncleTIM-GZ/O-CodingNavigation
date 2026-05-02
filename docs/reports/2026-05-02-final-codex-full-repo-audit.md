# Final Codex Full-Repo Audit for v0.1.0-beta.0

> Doc-only report. No `src`, `tests`, `package.json`, `package-lock.json`,
> `.github/workflows`, README, quickstart, or `mcp-usage` changes are made
> by this PR. No `npm publish`, no `npm dist-tag`, no `latest` movement, no
> new git tag, no new GitHub Release. Findings are recommendations only.

---

## 1. Summary

| Field | Value |
|---|---|
| Audit date | 2026-05-02 |
| Audit branch | `docs/final-codex-full-repo-audit` |
| Repo HEAD audited | `f5bce9c4f7fbd6128ba9ef161e880e71bbc09b61` (main, after PR #47) |
| Package name | `o-coding-navigation` |
| Package version (in tree) | `0.1.0-beta.0` |
| npm dist-tag `beta` | `0.1.0-beta.0` |
| npm dist-tag `alpha` | `0.1.0-alpha.2` |
| npm dist-tag `latest` | `0.1.0-alpha.0` (intentionally stale per DEC-020 / DEC-021) |
| Git tag | `v0.1.0-beta.0` exists locally and on origin |
| GitHub Release | `O'CodingNavigator v0.1.0-beta.0`, `isPrerelease=true`, `isDraft=false`, target `036a7a6…` |
| Validated MCP host | Claude Desktop on Windows with WSL2 only (DEC-017) |
| Cursor / Cline | not yet verified (DEC-019) |
| Codex review executed | yes |
| Adversarial review executed | yes |
| Codex modified any file | no |
| Audit verdict | **Conditional pass for limited beta** — proceed to internal dogfood now; address P1 / P2 before broader external beta and before any GA promotion. |

---

## 2. Scope

Reviewed:

- `src/` — core engine, CLI, MCP, types, version surface, SOP snapshot
- `tests/` — unit, gate, cli, lock, security, mcp, persistence
- `docs/` — README, quickstart, mcp-usage, decision log, security threat model, recent reports
- `examples/` — `examples/discovery-to-plan/`
- `.github/workflows/ci.yml`
- `package.json` / `package-lock.json` — files allowlist, bin, engines
- npm release surface — `npm view o-coding-navigation` dist-tags + version, `npm pack --dry-run` tarball contents
- GitHub release surface — `gh release view v0.1.0-beta.0`
- MCP boundary — `src/mcp/`, `src/core/security/project-root.ts`, related tests

The audit is read-only: no source files were edited, no packaging was rebuilt
from scratch into a registry, no release artifacts were moved.

---

## 3. Baseline checks

| Check | Result | Notes |
|---|---|---|
| `git status --short` (post-checkout main) | clean | working tree clean before branch creation |
| `node -p require('./package.json').name` | `o-coding-navigation` | matches DEC-013 / DEC-016 |
| `node -p require('./package.json').version` | `0.1.0-beta.0` | matches DEC-021 |
| `npm view o-coding-navigation dist-tags` | `latest=0.1.0-alpha.0`, `alpha=0.1.0-alpha.2`, `beta=0.1.0-beta.0` | matches DEC-020 / DEC-021 |
| `git tag --list v0.1.0-beta.0` | present | matches DEC-022 |
| `gh release view v0.1.0-beta.0` | published, `isPrerelease=true` | matches DEC-022 |
| `npm ci` | OK (304 packages added, husky `prepare` ran) | no audit warnings escalated |
| `npm run lint` (`eslint .`) | OK | no warnings, no errors |
| `npm run typecheck` (`tsc --noEmit`) | OK | clean |
| `npm run test` (`vitest run`) | **68 files, 449 tests, all passing** in ~3.7s | no quarantines, no flakes observed in this run |
| `npm run test:coverage` | overall **`83.47%` lines / `85.91%` branches / `89.93%` functions** | meets project threshold from CLAUDE.md §9 |
| `npm run build` (`tsc -p tsconfig.build.json`) | OK | `dist/` rebuilt |
| `bash examples/discovery-to-plan/scripts/smoke.sh` | OK end-to-end, terminates at terminal step `state_plan / step_mvp_plan` (expected) | does not advance past terminal step |
| `npm install -g o-coding-navigation@beta` (tmp prefix) | OK, `ocn --version` returns `0.1.0-beta.0` | beta tag installs cleanly |
| `ocn-mcp` stdio boot (3s timeout) | started silently, no stderr, no crash | expected (waiting on stdin JSON-RPC) |
| `ocn init` + `ocn doc create project-brief --overwrite` + custom brief + `ocn check --json` + `ocn gate --json` | both `ok=true`, `code=OK`, `status=pass` | full minimal happy-path verified against the *installed* beta package, not the local checkout |

Conclusion: every quantitative gate currently green. No P0 from the
baseline run.

---

## 4. Codex review method

- Tool used: the Codex helper available via the local Codex/codex-companion
  integration. Codex performed an adversarial pass over `src/`, `tests/`,
  `docs/`, `examples/`, `.github/workflows/ci.yml`, `package.json`, and the
  release surface.
- Adversarial review: yes.
- Codex modified files: **no**. Codex returned recommendations only; no
  patches were applied.
- All Codex findings were manually cross-checked by re-reading the cited
  source paths and re-grepping for the cited symbols / strings. The
  cross-check is summarised in §6–§10 below.

---

## 5. Final verdict

**Overall verdict for v0.1.0-beta.0**: **Conditional pass for limited beta**.

| Question | Answer |
|---|---|
| Suitable for internal dogfood? | **yes** |
| Suitable for limited external beta? | **yes**, with the explicit caveats already in README §"npm publish state" and §"MCP host support" — namely "pre-GA beta", "not stable, not GA, not production-ready", and "Claude Desktop on Windows with WSL2 only". |
| Suitable for GA? | **no** — at minimum the P1 advance race and the P2 doc-truthfulness gaps must be closed first; the multi-OS / Node 24+ CI gap and the Cursor / Cline validation gap are also pre-existing GA blockers tracked in README §"Beyond GA Prep". |

---

## 6. Findings summary

| Severity | Count | Meaning |
|---|---|---|
| P0 | 0 | must stop dogfood |
| P1 | 1 | must fix before broader beta users |
| P2 | 2 | should fix before GA |
| P3 | 2 | polish / later |

---

## 7. P0 findings

No P0 findings.

---

## 8. P1 findings

### P1-A. `advanceState` may write a stale target step under concurrent advance

- Title: Concurrent `ocn advance` from the same step can overwrite a newer in-lock state with a stale target.
- Evidence:
  - `src/core/advance/advance-state.ts:60` — `from` is captured from a pre-lock `readState`.
  - `src/core/advance/advance-state.ts:136-138` — `next = profile.nextStep(from.stateId, from.stepId)` is computed pre-lock.
  - `src/core/advance/advance-state.ts:178-186` — inside the lock, the code re-reads `currentState` but builds `newState` from the **pre-lock-computed** `next`, ignoring the freshly-read `currentStateId / currentStepId`. The comment says "Re-read inside the lock to guard against a concurrent-advance race," but the re-read result is not actually compared to `from`.
- Why it matters: If two CLI advance calls land at the same `from`, both compute the same `next` and the lock makes the second write idempotent (safe). But if the project state advances between the pre-lock read and the lock acquisition (e.g. an interleaved `ocn advance` running first), the late call will silently overwrite the newer state with the older target instead of failing or recomputing.
- Recommended fix (recommendation only — not applied in this PR): Inside the lock, compare `currentState.currentStateId / currentStepId` to `from`. On mismatch, either return `ERR_STATE_MACHINE` ("state changed during advance — retry") or recompute `next` from the fresh state. Add a concurrent-advance regression test under `tests/unit/advance-state.test.ts` or a new `tests/lock/concurrent-advance.test.ts`.
- Blocks dogfood? **no** (single-operator dogfood does not interleave advances).
- Blocks GA? **yes**.

---

## 9. P2 findings

### P2-A. Some mutating MCP / core write paths bypass the OCN lock

- Title: `create_artifact` and `capture_log` write paths are not lock-protected, contradicting the `mcp-usage.md` operational guarantee.
- Evidence:
  - `src/core/artifact/template-writer.ts:11-29` — `writeArtifact` does `fs.stat` then `fs.writeFile`. No OCN lock. Two concurrent calls with `overwrite=false` can both pass the existence check and the second `writeFile` wins.
  - `src/core/log/capture-log.ts:111-126` — header creation correctly uses `fs.open(..., "wx")` (race-free), but the per-entry payload is a non-locked `fs.appendFile` and there is no OCN lock around the write.
  - `docs/mcp-usage.md:191` (operational guarantee §5 item 2): "No tool ever bypasses the OCN state lock. Read-only tools don't acquire the lock; **mutating tools (`create_artifact`, `capture_log`) take the lock for the duration of the file write only**." This claim is not currently true.
- Why it matters: The risk is small in single-operator dogfood (one CLI + one MCP host, mostly serialised). It becomes a real correctness issue when the MCP host can issue concurrent tool calls — exactly what an external beta enables. The discrepancy between the docs and the implementation is itself a beta-grade truthfulness issue.
- Recommended fix (recommendation only — not applied): Either (a) wrap both writes in `withLock(...)` (matching the `advance` flow) and add concurrency tests under `tests/lock/`, or (b) change `writeArtifact` to `fs.open(path, overwrite ? "w" : "wx")` for an atomic exclusive create when `overwrite=false` and update `mcp-usage.md` §5.2 to reflect the actual scope of locking.
- Blocks dogfood? **no**.
- Blocks GA? **yes**.

### P2-B. README and `docs/mcp-usage.md` overstate the actual response surface

- Title: Three documented fields / codes are not present in the shipped envelopes.
- Evidence:
  - `README.md:183` — the CLI quick-reference table claims `ocn status [--json]` shows "current state, step, **last gate result**". `src/core/status.ts:17-23` defines `StatusData = { project; currentStateId; currentStepId; currentArtifactPath; nextAction }`. There is no `lastGate` / `lastGateResult` field.
  - `docs/mcp-usage.md:127` — claims `navigator.where_am_i` returns "current state (state id, step id, **locked SOP, last gate result**)". `src/mcp/tools/where-am-i.ts:25-26` simply forwards `getStatus(...)`, which returns the same `StatusData` shape — no locked SOP, no last gate result.
  - `docs/mcp-usage.md:123` and `:154` reference `ERR_VALIDATION` ("`code` values map 1:1 to OCN's CLI error codes (..., `ERR_VALIDATION`)" / "the handler returns an `ERR_VALIDATION` envelope"). The shipped enum in `src/types/result.ts:5-11` is `OK`, `ERR_GATE_FAILED`, `ERR_ARTIFACT_INVALID`, `ERR_STATE_MACHINE`, `ERR_IO_OR_CONFIG`, `ERR_SOP_VERSION`. `ERR_VALIDATION` is not a defined `ResultCode`. A grep across `src/` and `tests/` returned zero matches.
- Why it matters: External beta users wiring `navigator.where_am_i` or `ocn status` into automation will see fields that never arrive and an error code that the server cannot emit. This is exactly the kind of integration-blocking truthfulness gap a final pre-dogfood audit should catch.
- Recommended fix (recommendation only — not applied): Pick one of: (a) extend `StatusData` with the documented fields and add `ERR_VALIDATION` as a real `ResultCode`, with tests that pin both; or (b) remove `last gate result` / `locked SOP` from the README and `mcp-usage.md`, and replace `ERR_VALIDATION` with `ERR_IO_OR_CONFIG` (which is what `where_am_i` actually emits on zod parse failure today). Option (b) is the smaller, safer surface for beta.
- Blocks dogfood? **no**.
- Blocks GA? **yes**.

---

## 10. P3 findings

### P3-A. `src/mcp/server.ts` bootstrap layer is largely untested

- Title: ~14% line coverage on `src/mcp/server.ts` reflects missing coverage of `createMcpServer()` registration, instruction string, `setAuditFallbackLogger` install, and the `runMcpServer()` stdio connect path.
- Evidence: `src/mcp/server.ts` (82 lines); coverage table (post-`npm run test:coverage`): `src/mcp/server.ts` lines `14.63%` / functions `0%`. Existing `tests/mcp/mcp-tools.integration.test.ts` and `tests/unit/version-surface.test.ts` only cover handler-level behaviour and version constants.
- Why it matters: Boot-time regressions (forbidden tools registered, silent audit logger not installed, stdio transport not connected) would not be caught by current tests. Risk is low because boot logic is small and rarely changed, but coverage is a leading indicator before the server grows.
- Recommended fix (recommendation only): Add focused tests for tool registration (count + names + forbidden absence — the registry test already covers names), default server metadata, silent audit logger installation, and a mocked stdio transport connect path.
- Blocks dogfood? **no**.
- Blocks GA? **no**.

### P3-B. `docs/security/mcp-threat-model.md` "Future work" contains a stale pre-enforcement statement

- Title: F-2 in the threat model says the validator "today only confirms `projectRoot` is a directory" and "does not require `ocn init` has been run", but P1-001 has shipped.
- Evidence:
  - `docs/security/mcp-threat-model.md:183` — "F-2: Stricter project manifest — verify `.ocoding/` exists and contains a known signature before allowing mutating tools to run. **Today the validator only confirms `projectRoot` is a directory; it does not require `ocn init`** has been run."
  - `src/core/security/project-root.ts` — `validateInitializedProjectRoot(...)` is now the entry point used by every MCP tool (e.g. `src/mcp/tools/where-am-i.ts:19`). `tests/security/mcp-uninitialized-projectroot.test.ts` pins the enforcement.
- Why it matters: Doc drift only — runtime is strictly safer than the doc claims. Still a truthfulness issue an external reader could rely on.
- Recommended fix (recommendation only): Replace F-2 with either "delivered as P1-001 — see `tests/security/mcp-uninitialized-projectroot.test.ts`" or expand it into a forward-looking "stricter manifest signature" item.
- Blocks dogfood? **no**.
- Blocks GA? **no**.

---

## 11. MCP boundary review

- **Initialized projectRoot requirement**: enforced for every shipped tool via `validateInitializedProjectRoot` (`src/core/security/project-root.ts`). Tests: `tests/security/mcp-projectroot-security.test.ts`, `tests/security/mcp-uninitialized-projectroot.test.ts`, `tests/unit/initialized-project-root-validation.test.ts`.
- **Allowed tools (7)**: `navigator.where_am_i`, `navigator.brief`, `navigator.run_gate`, `navigator.create_artifact`, `navigator.capture_log`, `navigator.detect_sop_version`, `navigator.generate_next_prompt`.
- **Forbidden tools (4 not registered)**: `navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, `navigator.force_release_lock`. Pinned by `tests/unit/mcp-tool-registry.test.ts`.
- **Invalid path behaviour**: returns `ERR_IO_OR_CONFIG` with bilingual messages (relative path / missing path / not a directory / null bytes / uninitialized project) — see `docs/mcp-usage.md:222-228`. *Note*: `docs/mcp-usage.md:154` also references `ERR_VALIDATION`, which is not in the shipped `ResultCode` enum — see P2-B.
- **Host support boundary**: only Claude Desktop on Windows with WSL2 is validated (DEC-017). Cursor / Cline remain unverified per DEC-019. README and `mcp-usage.md` reflect this scope.
- **Audit on the MCP boundary**: read-only tools emit no audit; mutating tools emit `artifact_created`; `run_gate` emits `artifact_gate_run` + pass/blocked. No tool emits `advance_*` / `state_transitioned`. Audit-fallback logger is `silentAuditFallbackLogger` to keep stdio framing clean (`src/mcp/server.ts`).

---

## 12. Packaging / npm review

- Package name: `o-coding-navigation`.
- Version in tree: `0.1.0-beta.0`.
- npm dist-tags (from `npm view`): `latest=0.1.0-alpha.0`, `alpha=0.1.0-alpha.2`, `beta=0.1.0-beta.0`.
- Recommended install path: `npm install -g o-coding-navigation@beta` (per README, quickstart).
- `latest` intentionally unchanged at `0.1.0-alpha.0` per DEC-020 / DEC-021. Confirmed live.
- `package.json` `files` allowlist: `["dist", "LICENSE", "README.md", "docs/quickstart.md", "docs/mcp-usage.md"]` — conservative; `src/`, `tests/`, internal docs excluded.
- `npm pack --dry-run` tarball: 239 files, 99.4 kB packed / 372.8 kB unpacked. Grep for `tests/`, `src/`, `.test.`, `.spec.` inside the dry-run listing returned zero matches.
- `bin` entries: `ocn → dist/cli/index.js`, `ocn-mcp → dist/mcp/index.js`. Both verified executable post-`npm run build` (chmod step in build script).
- `engines.node`: `>=20`. Matches the CI matrix lower bound.

---

## 13. GitHub release review

- Tag: `v0.1.0-beta.0` (annotated, per DEC-022).
- Release: `O'CodingNavigator v0.1.0-beta.0`. `isDraft=false`, `isPrerelease=true`, target `036a7a6113fa4fe1b526788b7acbdb6748cbb05`.
- Release notes scope (per the GitHub Release): scoped to beta candidate prep PRs, MCP host validation (Claude Desktop on Windows with WSL2 only), and the explicit "Cursor / Cline unverified" caveat. Matches DEC-019.

---

## 14. Docs truthfulness review

- Install command bilingual coverage: README §"Install" and quickstart §1 both ship parallel English + Chinese instructions, both anchored to `npm install -g o-coding-navigation@beta` and both warning against the untagged install.
- Support boundary: every README / quickstart / mcp-usage section that mentions hosts scopes the validated host to Claude Desktop on Windows with WSL2 and explicitly marks Cursor / Cline as unverified.
- No GA / production-ready claim: README §"Status" says **"pre-GA beta — not stable, not GA, not production-ready"**. The phrase "production-ready" appears only in this negative scoping. Grep across active docs returned no claim that OCN is GA or production-ready.
- Beta wording: README, quickstart, and mcp-usage uniformly route new users to `@beta`, retain `@alpha` as a still-available backwards channel, and warn about the intentionally stale `latest` tag.
- Truthfulness gaps surfaced in this audit: `README.md:183` (`last gate result` in `ocn status`), `docs/mcp-usage.md:127` (`locked SOP, last gate result` in `where_am_i`), `docs/mcp-usage.md:123 / :154` (`ERR_VALIDATION`), `docs/security/mcp-threat-model.md:183` (stale F-2 statement). See P2-B and P3-B for the recommended fix paths.

---

## 15. Test and CI review

- Test count: **68 files / 449 tests / 0 skipped / 0 quarantined**, all passing in this run.
- Coverage (overall): **lines 83.47% / branches 85.91% / functions 89.93%**. Meets CLAUDE.md §9 thresholds.
- Coverage hotspots (lower bound): `src/mcp/server.ts` 14.63% lines / 0% functions (P3-A); `src/core/sop/detect-version.ts` 68.6% lines; `src/core/prompt/next-prompt.ts` 72.82% lines; `src/core/security/project-root.ts` 78.77% lines (the uncovered branches are largely defensive validators on rare error codes, not core paths). Critical paths (`state-store`, `lock`, gate runner, MCP tools) sit at 80–100%.
- CI matrix: `.github/workflows/ci.yml` runs Node `[20, 22]` on `ubuntu-latest`, `fail-fast: false`. No macOS, no Windows, no Node 24. This is consistent with README §"Beyond GA Prep" listing "multi-OS / Node 24+ CI" as not part of any current plan; the gap is a pre-existing GA blocker, not a new beta blocker.
- Known flakes: the state-store lock observability flake-hardening landed (`docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md`); the audit-markdown concurrency fix is in place (`tests/unit/audit-writer-markdown.test.ts`). No quarantines were observed in the local run.
- Remaining CI gaps: macOS / Windows runners, Node 24 row, automated `npm pack` smoke per CI run (currently manual), automated install-from-tarball smoke. None are dogfood blockers.

---

## 16. Recommended next PRs

| Priority | PR topic | Why | Blocks dogfood? | Blocks GA? |
|---|---|---|---|---|
| 1 | Fix the concurrent-advance race in `advanceState` and add a real concurrent-advance test | P1-A — the only finding that leaves a real correctness gap once external users enter the picture | no | yes |
| 2 | Sync README / `mcp-usage.md` to the real `status` / `where_am_i` payload and the real error-code enum (or add the missing fields + `ERR_VALIDATION` and pin them with tests) | P2-B — beta integrators rely on documented contracts | no | yes |
| 3 | Add lock coverage and exclusive-create semantics to `writeArtifact` and `captureLog`, with concurrency tests under `tests/lock/` | P2-A — closes the doc-vs-code gap on lock guarantees | no | yes |
| 4 | Add a focused test pass over `createMcpServer` / `runMcpServer` boot path | P3-A — coverage hardening | no | no |
| 5 | Refresh `docs/security/mcp-threat-model.md` F-2 to record P1-001 as delivered, and replace it with a forward-looking manifest-signature item | P3-B — doc drift cleanup | no | no |

---

## 17. Dogfood recommendation

**Proceed with internal dogfood now**, against the installed beta package
(`npm install -g o-coding-navigation@beta`).

Suggested dogfood scenarios (single-operator, intentionally avoiding the P1-A
concurrent-advance race):

1. **Greenfield project bootstrap** — fresh empty dir → `ocn init --tier minimal` → `ocn status` → `ocn doc create project-brief --overwrite` → fill in the bilingual sections → `ocn check` → `ocn gate` → `ocn advance` → repeat through `state_discovery → state_spec → state_design → state_plan` until the terminal step. Capture every command's exit code, stdout / stderr, and the resulting `state.json` in a dogfood log.
2. **MCP host integration** — wire the *installed* `ocn-mcp` into Claude Desktop on Windows with WSL2 (the validated host). Drive a minimal session through `navigator.where_am_i → navigator.brief → navigator.run_gate → navigator.create_artifact → navigator.capture_log` (with `type=dev` and `type=research`). Confirm `type=decision` is hard-rejected.
3. **Negative-path dogfood** — run each MCP tool with: relative `projectRoot`, missing `projectRoot`, file-not-directory `projectRoot`, uninitialised directory. Confirm structured `ERR_IO_OR_CONFIG` envelopes and zero side effects (no `docs/`, no `.ocoding/` created in the rejected path).
4. **Audit trail review** — at the end of each session, inspect `.ocoding/audit/audit-events.jsonl` and `docs/22-audit-trail.md`. Confirm `advance_*` events come only from the CLI; confirm MCP mutating tools emit `artifact_created`; confirm decisions never appear via MCP.

What to record per session:

- the OCN CLI version (`ocn --version`) and MCP server version (host-side display)
- every command, exit code, and bilingual error code
- any UX paper-cut that surfaces during the run
- which findings from §8–§10 actually bit, and which never surfaced

Stop dogfood and re-open this audit if a P0-grade issue is observed (data
loss, crash on the happy path, audit trail divergence between CLI and MCP).

---

## 18. Non-goals

This audit explicitly did **not**:

- run `npm publish`
- run `npm dist-tag add` / `npm dist-tag rm`
- move the `latest` dist-tag
- create a new git tag
- create a new GitHub Release
- modify any file under `src/`, `tests/`, `package.json`, `package-lock.json`, `.github/`, or active user-facing docs (`README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`, `docs/20-decision-log.md`)
- start GA promotion

The only file added by this PR is this report:
`docs/reports/2026-05-02-final-codex-full-repo-audit.md`.
