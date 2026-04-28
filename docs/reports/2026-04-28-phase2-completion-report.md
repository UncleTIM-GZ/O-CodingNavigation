# OCN Phase 2 Completion Report

> Date: 2026-04-28
> Author: Phase 2 Completion Review
> Scope: Phase 2 of the O'CodingNavigator (OCN) Phase plan, ending at PR #6 (MCP Safe Tools).
> Companion documents: `implementation-notes.md`, `docs/20-decision-log.md`, `docs/plans/`, `docs/amendments/`.

---

## 1. Summary

**Verdict: Phase 2 Complete.**

PR #6 (MCP Safe Tools) — the final PR of the Phase 2 plan locked by DEC-001 — was merged into `main` at `2026-04-28T15:58:09Z` (merge commit `dbe3523`). CI build was SUCCESS at merge time. Local re-verification on `main` after merge: lint clean, typecheck clean, 312 tests pass across 61 test files, line coverage 83.88%.

The four ordered work packets enumerated by DEC-001 — *state safety → audit foundation → full state machine + gate + advance → MCP safe tools* — have all landed, in that order, with each PR's tests preserving the prior PR's invariants.

---

## 2. PR Timeline

GitHub PR numbering and the Phase plan's logical PR numbering diverge by one because GitHub PR #2 was a docs-only commit (DEC-001 capture) that the Phase plan does not enumerate as one of its five engineering PRs. Both numberings are recorded below.

| Phase PR | GitHub PR | Branch | Merge commit | Merged at (UTC) | Title |
|---|---|---|---|---|---|
| PR #1 (Skeleton Spike) | #1 | `feat/skeleton-spike-phase0-phase1` | `a93d5a3` | 2026-04-27T17:46:28Z | feat(skeleton-spike): Phase 0 test infra + Phase 1 minimum 5-command CLI |
| (DEC-001 capture) | #2 | `docs/decision-log-phase1-pass` | `429b459` | 2026-04-27T18:03:41Z | docs(decision-log): DEC-001 Skeleton Spike PASS, Phase 2 entry approved |
| PR #2 (State Safety) | #3 | `feat/phase2-state-safety` | `3e4568a` | 2026-04-27T18:15:49Z | feat(phase2/state-safety): add `.ocoding/.lock` + atomic state writes |
| PR #3 (Audit Foundation) | #4 | `feat/phase2-audit-event-foundation` | `d6abc8b` | 2026-04-28T01:51:45Z | feat(phase2/audit): AuditEvent schema + dual-track writers + lock lifecycle |
| PR #4 (Full FSM + Gate + Advance) | #5 | `feat/phase2-full-state-machine-gate-advance` | `5469090` | 2026-04-28T11:33:54Z | feat(phase2/state-machine): full state machine + `ocn gate` + `ocn advance` |
| PR #5 (MCP Safe Tools) | #6 | `feat/phase2-mcp-safe-tools` | `dbe3523` | 2026-04-28T15:58:09Z | feat(phase2/mcp): MCP safe tools server (PR #5 — closes Phase 2) |

### Per-PR detail

#### PR #1 — Skeleton Spike (GitHub #1, `a93d5a3`)
- **Main capability**: minimum 5 commands (`init`, `status`, `brief`, `doc create prd`, `check`); core engine surface for SOP loading, artifact template writing, Markdown parsing, required-section matching, gate-status calculation; bilingual `CommandResult` envelope; stable string IDs.
- **Tests after merge**: 117 passed across 28 files (per DEC-001 evidence section).
- **Coverage after merge**: Not available in local context (DEC-001 records the test count only).
- **Resolved L / todo**: validated the product thesis — Step Artifact Gate detects PRD missing `Scenarios｜使用场景` with exit 2 + verbatim bilingual message. No L items closed (this PR established the baseline that L1–L14 deferred against).

#### PR #2 — State Safety Foundation (GitHub #3, `3e4568a`)
- **Main capability**: `.ocoding/.lock` (5s timeout, 200ms retry, 30s stale threshold), `state.json.bak` rolling backup, temp-file write + atomic `fs.rename`, `withLock(...)` orchestration with lifecycle hooks, Layer 6 concurrency tests.
- **Tests after merge**: 152 passed across 32 files (per implementation-notes §1 row L1).
- **Coverage after merge**: Not available in local context.
- **Resolved L / todo**: **L1** (no lock + backup + atomic temp/rename) and **L10** (no concurrency lock for state writes) marked RESOLVED.

#### PR #3 — Audit + Event Foundation (GitHub #4, `d6abc8b`)
- **Main capability**: `AuditEvent` zod schema (12 event types, 7 result types), dual-track persistence (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`), JSONL-first then Markdown failure semantics, `safeAudit` orchestrator, lock lifecycle hook (`makeLockAuditHook`), audit-storage-path Amendment AM-001.
- **Tests after merge**: 204 passed (per implementation-notes; PR #4 plan cites "41 test files / 204 tests / 83.03% line coverage" baseline).
- **Coverage after merge**: 83.03% lines (cited in PR #4 plan §1).
- **Resolved L / todo**: **L3** (no audit events written anywhere) marked RESOLVED.

#### PR #4 — Full State Machine + Gate + Advance (GitHub #5, `5469090`)
- **Main capability**: 8-state forward-only FSM (DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT) with 10 stable-ID steps wired through DISCOVERY → PLAN; `SopProfile` API (`stateOrder`, `stepsForState`, `nextStep`, `artifactPathForStep`); `ocn gate` (read-only) and `ocn advance` (gate-then-mutate); 4 new audit event types (`advance_started`, `advance_succeeded`, `advance_failed`, `state_transitioned`); `AuditEvent.correlationId` field; init position changed to `state_discovery / step_project_brief`; `ocn doc create` extended to 5 doc types; `ocn check` dispatched by current step.
- **Tests after merge**: ~260 passed (PR #5 spec cites "preserve 260 existing tests").
- **Coverage after merge**: 84% lines (per implementation-notes §10.4).
- **Resolved L / todo**: **L2** (init jumps to state_spec/step_prd), **L6** (doc create only accepts prd), **L7** (check only handles step_prd) RESOLVED. **todo 012** (`onReleased` on `releaseLock` error) RESOLVED. **todo 013** partially resolved (AuditEvent.correlationId field landed; lock-event correlation deferred to PR #5).

#### PR #5 — MCP Safe Tools (GitHub #6, `dbe3523`)
- **Main capability**: stdio MCP server (`ocn-mcp` bin) on `@modelcontextprotocol/sdk@^1.29.0`; 7 allowed tools (read + create only); 4 forbidden tools never registered; `MCPToolResult` discriminated-union envelope (no raw exceptions across the boundary); `AuditFallbackLogger` seam decoupling `safeAudit` from `process.stderr`; `silentAuditFallbackLogger` installed at server boot to keep stdio framing clean; `correlationId` plumbed through `LockAuditHookContext` so `ocn advance` produces a fully-correlated event chain; new core fns `captureLog`, `detectSopVersion`, `generateNextPrompt`.
- **Tests after merge**: 312 passed across 61 files (verified locally on `main` post-merge; +52 over PR #4's ~260).
- **Coverage after merge**: 83.88% lines, 84.61% branches, 90.40% functions (verified locally on `main` post-merge).
- **Resolved L / todo**: **todo 011** (`safeAudit` decoupled from `process.stderr`) RESOLVED. **OCN-PR5-001 / todo 013 remainder** (lock events accept `correlationId`) RESOLVED.

---

## 3. Current Capabilities

| Capability | Status | Surface |
|---|---|---|
| Local project initialization | ✅ | `ocn init [--tier minimal]` |
| Status snapshot | ✅ | `ocn status [--json]` |
| Next-step brief | ✅ | `ocn brief [--json]` |
| Artifact creation from template registry | ✅ | `ocn doc create <project-brief\|scope\|prd\|acceptance-criteria\|technical-architecture> [--overwrite]` |
| Step Artifact Gate (per-step required-section match) | ✅ | `ocn check [--json]` |
| Read-only gate aggregation | ✅ | `ocn gate [--json]` |
| Forward-only state advancement | ✅ | `ocn advance [--json]` |
| State safety (lock + backup + temp-rename) | ✅ | every `state.json` write |
| Audit dual persistence (JSONL + Markdown) | ✅ | `.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md` |
| `correlationId` for advance flow (incl. lock events) | ✅ | every event in a single `ocn advance` invocation |
| MCP safe tools (stdio transport) | ✅ | `ocn-mcp` bin / 7 tools |

### Verified state machine reach (per PR #4)

DISCOVERY → SPEC → DESIGN → PLAN have stable-ID steps wired and gate-checked. BUILD / VERIFY / SHIP / REFLECT have state IDs only — their step IDs and required-section maps are deferred to a future PR.

### Verified Skeleton Spike invariant (per PR #4 e2e)

After advancing from `step_project_brief → step_scope → step_prd`, the original PRD blocked/pass invariant from PR #1 is preserved verbatim:
- PRD missing `Scenarios｜使用场景` → exit 2 + bilingual `"PRD is missing required section: Scenarios."` / `"PRD 缺少必填章节：Scenarios｜使用场景。"`
- Fixed PRD → exit 0 + bilingual `"PRD passed Skeleton Spike artifact check."` / `"PRD 已通过 Skeleton Spike 产物检查。"`

---

## 4. MCP Surface

### Exposed (7 tools)

| # | Tool | Mutates state? | Mutates filesystem? |
|---|---|---|---|
| 1 | `navigator.where_am_i` | No | No |
| 2 | `navigator.brief` | No | No |
| 3 | `navigator.run_gate` | No | Audit only |
| 4 | `navigator.create_artifact` | No (state) | Yes (writes the doc + audit) |
| 5 | `navigator.capture_log` | No | Yes (`docs/19-dev-log.md` or `docs/18-research-log.md` + audit). **`type=decision` is hard-rejected with `ERR_GATE_FAILED`.** |
| 6 | `navigator.detect_sop_version` | No | No |
| 7 | `navigator.generate_next_prompt` | No | No |

### Never exposed (4 forbidden tools)

| Tool | Reason |
|---|---|
| `navigator.advance_phase` | State advancement is an explicit human signal; not a tool the LLM may call autonomously. |
| `navigator.capture_decision` | Decisions are governance artifacts and must reflect human intent. The exposed `capture_log` tool hard-rejects `type=decision`. |
| `navigator.reset_project` | Destructive; twice-confirm flow is human-only. |
| `navigator.force_release_lock` | Bypasses state-safety invariants; operator-only escape hatch. |

Enforcement: `tests/unit/mcp-tool-registry.test.ts` asserts `ALLOWED_TOOL_NAMES ∩ FORBIDDEN_TOOL_NAMES = ∅` and that the allowed list has exactly 7 entries.

### Safety boundary statement

> An MCP agent connected to OCN can read project state, render the next-step brief, prepare artifacts, run the read-only gate, create from the 5-type template registry, and capture `dev` / `research` logs.
>
> An MCP agent **cannot** advance state, capture decisions, reset the project, or force-release the lock. These four operations remain CLI-only and human-driven.
>
> The MCP server installs `silentAuditFallbackLogger` at boot so audit fallback warnings never reach the JSON-RPC stdio stream. `tests/mcp/mcp-tools.integration.test.ts` verifies that a successful `where_am_i` call produces zero `process.stderr.write` calls.

---

## 5. Test and Coverage Snapshot

Verified locally on `main` (commit `dbe3523`) after PR #6 merge:

| Check | Result |
|---|---|
| `npm run lint` | ✅ clean (0 errors, 0 warnings) |
| `npm run typecheck` | ✅ clean (`tsc --noEmit` exits 0) |
| `npm run test` | ✅ 312 passed across 61 files |
| `npm run test:coverage` line | 83.88% |
| `npm run test:coverage` branch | 84.61% |
| `npm run test:coverage` function | 90.40% |
| CI on PR #6 merge commit | SUCCESS (run `25058717871`) |

### Known weak spots (sub-80% coverage areas)

These are visible in the coverage table but do not block Phase 2 acceptance:
- `src/mcp/index.ts` (0%) — the bin entry; not unit-tested by design (covered manually via stdio smoke).
- `src/mcp/server.ts` (0%) — `createMcpServer` constructor; not exercised by the per-tool unit tests because they import handlers directly. Tool behaviour is fully covered by `tests/mcp/mcp-tools.integration.test.ts` and per-tool unit suites.
- `src/core/sop/detect-version.ts` (70.83%) — drift-detection branches are unit-tested but the upgrade-suggestion path is not (no upgrade tooling in Phase 2).
- `src/core/prompt/generate-next-prompt.ts` (82.6% line, 54.54% branch) — branch coverage low because the prompt template has many step-specific branches; only DISCOVERY/SPEC steps are exercised in current tests.
- `src/core/audit/audit-writer.ts` (84.84%) — uncovered lines `47-51` are the fallback-logger error-path inside `safeAudit`.
- `src/core/gate/gate-runner.ts` (80.34%) — uncovered lines are the `not_applicable` and missing-required-sections-empty branches.

No CI-vs-local divergence to record: CI on PR #6 reported SUCCESS; local re-verification reproduces the same green state.

---

## 6. Resolved Items

### L items (temporary simplifications from `implementation-notes.md` §1)

| ID | Description | Status | Closed by |
|---|---|---|---|
| L1 | `state.json` write without lock + backup + atomic temp/rename | ✅ Resolved | PR #2 (state safety) |
| L2 | Init jumps directly to `state_spec / step_prd` | ✅ Resolved | PR #4 (full FSM) |
| L3 | No audit events written anywhere | ✅ Resolved | PR #3 (audit foundation) |
| L6 | `ocn doc create` only accepts `prd` | ✅ Resolved | PR #4 (5-type template registry) |
| L7 | `ocn check` only handles `step_prd` | ✅ Resolved | PR #4 (SOP-driven dispatch) |
| L10 | No concurrency lock for state writes | ✅ Resolved | PR #2 (state safety) |

### todos

| ID | Description | Status | Closed by |
|---|---|---|---|
| todo 011 | Decouple `safeAudit` from `process.stderr` | ✅ Resolved | PR #5 (`AuditFallbackLogger` seam) |
| todo 012 | `onReleased` must fire even when `releaseLock` throws | ✅ Resolved | PR #4 (lock finally-block fix + test) |
| todo 013 (field) | Add `correlationId?: string` to `AuditEvent` schema | ✅ Resolved | PR #4 |
| todo 013 (advance flow) | Thread `correlationId` through every event in a single `ocn advance` | ✅ Resolved | PR #4 |
| OCN-PR5-001 | Lock events accept `correlationId` via `LockAuditHookContext` | ✅ Resolved | PR #5 |

### Still open (not blocking Phase 2)

L4 (TS-string SOP loader), L5 (hand-rolled markdown parser), L8 (`warning` status unused), L9 (production/full tiers not enforced), L11 (`latestGateResult` typing), L12 (CommandResult error envelope duplication), L13 (status renderer heuristic), L14 (`ocn brief` cosmetic dedup). All are tracked in `implementation-notes.md` for Phase 3.

todo 014 (relativize `relatedPaths`), todo 015 (drop `jsonlOk` field) — deferred per PR #5 plan §11.6.

---

## 7. Remaining Non-GA Items

The following are explicitly **not part of Phase 2** and are not implemented as of PR #6:

| Area | Description |
|---|---|
| `ocn doctor` | State / SOP / gates validation + recovery from `state.json.bak`. |
| `ocn reset` | `--keep-docs` / `--keep-state` / `--hard` with twice-confirm and audit emission. |
| `ocn baseline` | `baseline create` + `docs/15-baseline.md` + `.ocoding/baselines/<ulid>.json`. |
| SOP upgrade | `ocn sop {version,diff,upgrade --plan}`; multi-version SOP loader; structured profile diff. |
| Production / full tier | `--tier production` and `--tier full` accepted by flag but artifact sets not enforced (L9). |
| Mini-CRM dogfood | The OCN-on-mini-CRM scenario described in `docs/08-mvp-plan.md` §39.2. |
| npm publish | Package name decision, semver lane, release automation, `npm publish` workflow. |
| External README polish | Top-level `README.md` aimed at first-time readers (Solo Builder / coach / small team). |
| Installation docs | `docs/install.md` or equivalent — `npm install -g`, MCP host wiring, prerequisites. |
| Release packaging | `dist/` shaping, bin wiring, shebang, license bundling, smoke test on a clean machine. |
| Examples | A bundled example project that walks DISCOVERY → PLAN end-to-end. |
| Docs numbering consistency | `docs/04-information-architecture.md`, `docs/05-data-model.md`, `docs/06-api-contract.md`, `docs/07-test-strategy.md`, `docs/08-mvp-plan.md` follow the OLD layout; the new SOP profile (PR #4) expects the NEW layout. The two have not been reconciled (see `implementation-notes.md` PR #4 plan §4 note). |
| Amendments consolidation | `docs/amendments/2026-04-28-audit-storage-path-amendment.md` is the only amendment file; future amendments should follow the same convention but no consolidation index exists. |
| Public MCP / HTTP / SSE transport | stdio only in PR #5; remote transport, auth, and session management deferred. |

---

## 8. GA Prep Gap Review

These are the gates a reasonable observer would expect OCN to clear before tagging a public `v1.0.0` GA. Each is recorded as a question with the current state of evidence; **none are claimed to be addressed in this report**.

| # | Gap | Current state |
|---|---|---|
| 1 | Is `README.md` adequate for a new reader? | Not verified. Local repo contains `README.md` per `package.json` reference; content quality and "first 5 minutes" experience have not been audited. |
| 2 | Is the install command clear? | Not verified. Package not published to npm; `npm install -g ocn` does not yet work. Local install via `npm link` is undocumented. |
| 3 | Is CLI `--help` clear and actionable? | `tests/cli/help.test.ts` confirms `--help` runs and exits 0; copy quality has not been audited. |
| 4 | Is `docs/mcp-usage.md` adequate? | Created by PR #5. Has start command, tool list, forbidden list, audit description, troubleshooting. Not yet validated against a non-author reader. |
| 5 | Are example projects bundled? | Not present. No `examples/` directory. |
| 6 | Is `docs/amendments/` consolidated? | One amendment file exists (`2026-04-28-audit-storage-path-amendment.md`). No top-level index. The decision-log path move (`19 → 20`) introduced in this report cycle is a second pending amendment — frozen design docs (`docs/00-08`), plan files, `CLAUDE.md`, and `.claude/rules.md` still reference `docs/19-decision-log.md` and need an amendment file (next `AM-XXX`) to record the new canonical path before GA. |
| 7 | Is the SOP v1.1 (technical-architecture step) reflected in the bundled OCN profile? | The PR #4 plan §4 note records that OCN's own `docs/04-08` follow the OLD layout while the new SOP profile expects the NEW layout. This divergence has not been reconciled. |
| 8 | Is the npm package ready to publish? | Package name `ocn` may be taken; not investigated. No `prepublishOnly` hook; no release lane (`v1.0-alpha`, `v1.0-beta`, `v1.0`); no `.npmignore` audit. |
| 9 | Is CI stable across the recent PR set? | All 5 Phase-2 engineering PRs (and the docs PR) reported CI SUCCESS at merge. CI configuration audit (caching, matrix, flake rate over time) has not been done. |
| 10 | Is dogfood readiness adequate? | Mini-CRM scenario not attempted. OCN-on-OCN dogfood is partially blocked by the OLD/NEW docs layout divergence. |
| 11 | Is the file-system boundary safe? | `.ocoding/` writes are lock-protected and atomic. MCP `create_artifact` and `capture_log` use the same lock chain. Path-traversal review for the `projectRoot` argument supplied to MCP tools has not been done; the only validation is "absolute path." |
| 12 | Is there a security audit of the MCP surface? | Tool registry whitelist + envelope-only error semantics are in place. No external review (e.g., misuse-via-prompt, DoS via repeated `run_gate`, malicious `projectRoot`) has been conducted. |

---

## 9. Decision

> **Decision: Phase 2 is complete after PR #6 MCP Safe Tools merge.**
>
> **Next phase: GA Prep Gap Review.**

This report does not resolve any of the items in §7 or §8; it records the boundary between Phase 2 (complete) and GA Prep (not started). The decision-log entry recording this verdict is in `docs/20-decision-log.md` as DEC-002.

> **Path note**: the canonical decision-log file was renamed from `docs/19-decision-log.md` to `docs/20-decision-log.md` as part of this report cycle, so DEC-001 and DEC-002 remain in a single append-only file at the new slot. Frozen design docs (`docs/00-08`), plan files, `CLAUDE.md`, and `.claude/rules.md` still refer to the old path; reconciling those is a GA Prep amendments-consolidation task (§8 row 6).
