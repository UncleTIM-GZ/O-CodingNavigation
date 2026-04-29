# Skeleton Spike — Implementation Notes

> Date: 2026-04-28
> Companion to `dogfood-report-skeleton-spike.md` and `docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md`.
> **None of these notes block the spike acceptance.** They are honest disclosures of temporary simplifications and items deferred to Phase 2.

---

## 1. Temporary Simplifications (record per plan §3.2)

| # | Simplification | Where | Removal trigger |
|---|---|---|---|
| L1 | ~~`state.json` write does NOT use lock + backup + atomic temp/rename. Plain `fs.writeFile`.~~ **RESOLVED by PR #2 (state-safety)** — `writeStateAtomic` now wraps every state write with `.ocoding/.lock` (5s timeout, 200ms retry, 30s stale threshold), `state.json.bak`, temp file + atomic rename. See `docs/plans/2026-04-28-feat-ocn-phase2-state-safety-plan.md` and `src/core/state/{lock,state-store}.ts`. | ~~`src/core/state/state-store.ts` `writeState()`~~ | ✅ Done |
| L2 | ~~Initial position after `ocn init` jumps directly to `state_spec` / `step_prd`, skipping discovery + scope steps.~~ **RESOLVED by PR #4 (full-state-machine-gate-advance)** — `ocn init` now lands at `state_discovery / step_project_brief`, the true beginning of the state machine. `ocn advance` runs gate then mutates state through the lock+audit pipeline. See `docs/plans/2026-04-28-feat-ocn-phase2-full-state-machine-gate-advance-plan.md`. | ~~`src/core/init.ts` lines 53-61~~ | ✅ Done |
| L3 | ~~No audit events are written anywhere.~~ **RESOLVED by PR #3 (audit-event-foundation)** — `AuditEvent` schema + dual-track persistence (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`). Wired into `ocn init` (project_initialized + state_write_succeeded + lock_acquired/released), `ocn doc create prd` (artifact_created), and `ocn check` (artifact_gate_run + artifact_gate_blocked\|passed). See `docs/plans/2026-04-28-feat-ocn-phase2-audit-event-foundation-plan.md`. | ~~All commands~~ | ✅ Done |
| L4 | SOP profile content is bundled as TypeScript string constants (`src/sops/default-ai-coding-sop/0.1.0/{sop,gates,artifacts,config}.ts`) instead of YAML files copied at build time. The on-disk `.ocoding/sop.yaml` IS valid YAML; the in-process load is from the TS string. | `src/core/sop/loader.ts` | Phase 2 — once asset packaging strategy is decided |
| L5 | Markdown heading parser is a hand-rolled regex (no `marked`/`remark` dep). Detects ATX headings only — no setext, no inline-code edge cases beyond fenced blocks. | `src/core/artifact/markdown-parser.ts` | Phase 2 — switch to `remark` when section-body parsing is required |
| L6 | `ocn doc create` only accepts `prd`. Other types blocked with `ERR_ARTIFACT_INVALID`. | `src/core/doc.ts` | Phase 2 — extend to other artifact types per Tier |
| L7 | `ocn check` only handles `step_prd`. Other steps blocked with `ERR_STATE_MACHINE`. | `src/core/check.ts` | Phase 2 — multi-artifact aggregation per current state |
| L8 | `ArtifactStatus` union includes `"warning"` for forward compatibility, but `computeArtifactGateStatus` never returns it. Spike returns binary pass/blocked only. | `src/core/artifact/gate-status.ts` | Phase 2 — implement quality warnings |
| L9 | Tier `production` and `full` are accepted by the `--tier` flag but their artifact sets are not enforced. Only `minimal` artifacts are wired. | `src/core/init.ts` | Phase 2 — Tier-aware gate behavior |
| L10 | ~~Concurrency: no lock means two simultaneous `ocn init` (or any state mutation) racing in the same project would result in undefined behavior. Acceptable for a single-human spike but documented.~~ **RESOLVED by PR #2 (state-safety)** — All state mutations now go through `withLock(...)`. `init.ts` uses lock-then-check (state.json existence) to fix the TOCTOU race. Layer 6 concurrency tests in `tests/lock/concurrent-writes.test.ts` verify N concurrent writers produce a single valid state.json. | ~~repo-wide~~ | ✅ Done |
| L11 | The `data-default` for `latestGateResult` is unconstrained `unknown.nullable()` — Phase 2 should narrow this to `ArtifactGateStatus \| null` once gate aggregation lands. | `src/types/state.ts` | Phase 2 |
| L12 | CommandResult error envelope duplicates the top-level `code` + `message`. Helps consumers that read either path; the duplication is intentional during the spike. Phase 2 may dedupe by removing top-level `code`/`message` on failures. | `src/types/result.ts` | Phase 2 — coordinate with Data Model Amendment |
| L13 | Status renderer (`src/cli/render/text.ts`) uses heuristic "if data has X then it's a status block" — this is a render-layer simplification. The structured CommandResult is the source of truth; only the human-readable text rendering is heuristic. JSON mode is unaffected. | `src/cli/render/text.ts` | Phase 2 — type-tagged renderer |
| L14 | `ocn brief` text rendering shows the message line twice in some cases (the bilingual `msg.en` and `msg.zh` are equal in `getStatus`/`generateBrief`). Cosmetic — JSON unaffected. | `src/core/{status,brief}.ts` | Phase 2 — distinct messages or render dedup |

---

## 2. Out-of-Scope Captures

The following were noted during implementation but explicitly NOT done in the spike. Each becomes its own future PR/branch:

- ~~**OCN-2-LOCK** — Implement `.ocoding/.lock` + backup + temp/rename atomic write (see CLAUDE.md §4.5 + `.claude/rules.md` §2). Add Layer 6 concurrency tests.~~ ✅ **Done in PR #2 (state-safety).** Follow-up captured separately: audit hooks for `lock_released` and `lock_stale_recovered` lands in PR #3.
- **OCN-2-AUDIT** — Implement audit subsystem (`.ocoding/audit/<yyyy-mm>.jsonl` + `docs/21-audit-trail.md`). Wire push events: state_transition_*, gate_*, baseline_created, sop_version_*, high_risk_action_blocked.
- **OCN-2-FSM** — Full state machine: DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT, with `ocn advance` running `runGate` first and recording transitions.
- **OCN-2-MCP** — Minimal MCP Server with 7 tools (`navigator.where_am_i`, `navigator.brief`, `navigator.run_gate`, `navigator.create_artifact`, `navigator.capture_log`, `navigator.detect_sop_version`, `navigator.generate_next_prompt`). Never expose `navigator.advance_phase` in v1.0.
- **OCN-2-DOCTOR** — `ocn doctor` validates state.json/sop.yaml/gates.yaml + recovers from `.ocoding/state.json.bak`.
- **OCN-2-RESET** — `ocn reset --keep-docs / --keep-state / --hard` with twice-confirm and audit write.
- **OCN-2-SOP-VERSION** — `ocn sop {version,diff,upgrade --plan}`. SOP loader must accept multiple profile versions and produce a structured diff.
- **OCN-2-BASELINE** — `ocn baseline create` + `docs/15-baseline.md` + `.ocoding/baselines/<ulid>.json`.
- **OCN-2-LOG** — `ocn log [--type dev|decision]` writes `docs/18-dev-log.md` / `docs/19-decision-log.md`.
- **OCN-2-PROMPT** — `ocn prompt next` generates next-step prompt for AI coding hosts.
- **OCN-2-TEST-GATE** — `ocn test record --from vitest <path>` + `ocn check --include-tests`.
- **OCN-2-AC-COVERAGE** — Script under `scripts/` parses `docs/03-acceptance-criteria.md` and asserts every `must` AC has ≥ 1 referencing test (search for `// @ac AC-XXX-NNN`).
- **OCN-2-TIER-PROD-FULL** — Implement production + full Tier artifact sets and gate behavior.
- **OCN-2-MARKDOWN-AST** — Replace hand-rolled parser with `remark` for body-content checks (table-of-contents extraction, section emptiness detection, etc.).
- **OCN-2-PUBLISH** — Decide npm package name (`ocn` may be taken), set up release lane.

---

## 3. Amendment-Needed Flags

> No structural amendments to `docs/00-08` were required during this spike. The current designs absorbed every concrete need.

Two minor observations that **may** become Amendments in Phase 2 — recorded here for visibility but not actioned:

### 3.1 Data Model — `latestGateResult` typing

`docs/05-data-model.md` defines `latestGateResult` permissively. The spike uses `z.unknown().nullable()`. When Phase 2 adds gate aggregation, the type should narrow to a specific `LatestGateResult` shape with `{ stepId, status, missingRequiredSectionIds, runAt }`. This will be a Data Model **minor** amendment because it adds structure without breaking serialization.

### 3.2 API Contract — duplicated message in failure envelope

`CommandResult.error` currently duplicates `{ code, message }` from the top level. This came from following user §VIII verbatim. Phase 2 review may simplify the envelope (remove either `error` or top-level `code`/`message` for failures). This requires coordination across `docs/06-api-contract.md` + Data Model + `.claude/anti-patterns.md` because external consumers (MCP, scripts) depend on it.

---

## 4. Coverage Caveat

`v8 coverage` only sees in-process code. Tests that spawn the CLI as a subprocess (`tests/cli/*.test.ts`, `tests/e2e/`) DO exercise `src/cli/**` but their coverage is invisible.

The reported 74% line coverage is calculated **excluding** the subprocess paths, which is fine for the spike (G0 threshold = 70%). For Phase 2:

- Either lower the CLI coverage threshold (`src/cli/**` excluded from instrumentation) to make the metric honest, or
- Add in-process command-handler tests that import the action functions directly. The current architecture supports both.

---

## 5. Build / Lint / Typecheck Status

- `npm run lint` — clean (zero errors, zero warnings)
- `npm run typecheck` — clean (`tsc --noEmit` exit 0 with `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`)
- `npm run build` — emits `dist/` with executable `dist/cli/index.js`, shebang preserved
- `npm run test` — 117/117 pass
- `npm run test:coverage` — 117/117 pass + thresholds met

---

## 6. Files Created Outside Plan §4

The plan was followed file-by-file. Two files were added beyond what the plan listed because they emerged from the implementation:

- `src/core/templates/prd.ts` — split out from inline-string in `src/core/doc.ts` for testability.
- `tests/unit/render-text.test.ts` — added to keep `src/cli/render/text.ts` coverage above threshold (it's pure and doesn't run in subprocess).
- `tests/unit/sop-loader.test.ts` — same reason; ensures the in-process loader is exercised directly.
- `tests/unit/state-store.test.ts` — same reason; covers read-error paths.

None of these conflict with the plan; they are pure additions for coverage and testability.

---

## 7. Verification Performed

| Check | Mechanism | Result |
|---|---|---|
| `--help` exits 0 with stdout | `tests/cli/help.test.ts` | ✅ |
| `--version` prints semver | `tests/unit/spawn-ocn-helper.test.ts` | ✅ |
| `init` writes 4 `.ocoding/` files | `tests/cli/init.test.ts`, `tests/unit/core-init.test.ts` | ✅ |
| `init` defaults tier to `minimal` | `tests/cli/init.test.ts` | ✅ |
| `init` blocks when re-run (exit 4) | `tests/cli/init.test.ts`, `tests/unit/core-init.test.ts` | ✅ |
| `status` prints state/step/artifact/next | `tests/cli/status.test.ts` | ✅ |
| `brief` includes governance + uncertainty | `tests/cli/brief.test.ts` | ✅ |
| `doc create prd` writes template | `tests/cli/doc-create.test.ts` | ✅ |
| Template includes 6-box self-check | `tests/cli/doc-create.test.ts` | ✅ |
| `check` blocks missing Scenarios (exit 2) + bilingual | `tests/cli/check.test.ts`, `tests/e2e/...` | ✅ |
| `check` passes with Scenarios (exit 0) + bilingual | `tests/cli/check.test.ts`, `tests/e2e/...` | ✅ |
| NFKC folds U+FF5C `｜` to ASCII `|` | `tests/unit/required-section-matcher.test.ts` | ✅ |
| Stable string IDs only (no numeric) | `tests/unit/schema-project-state.test.ts` | ✅ |
| ISO 8601 UTC ending Z | `tests/unit/time.test.ts` | ✅ |
| Bilingual messages have non-empty en + zh | `tests/unit/schema-bilingual-message.test.ts` | ✅ |
| Manual G2 demo transcript matches user §X verbatim | `dogfood-report-skeleton-spike.md` §3 | ✅ |

---

## 8. PR #2 Addendum — State Safety Foundation (2026-04-28)

This addendum is appended after PR #2 merge. It documents the new state-safety
surface and the audit-hook follow-up that PR #3 will pick up.

### 8.1 What changed

- **Lock**: `.ocoding/.lock` JSON file with `{pid, createdAt, command, client, projectRoot}`. Schema in `src/types/lock.ts`, behavior in `src/core/state/lock.ts`.
- **Atomic write**: `writeStateAtomic` (with lock) and `writeStateUnlocked` (caller already holds the outer lock — used by `init.ts`).
- **Backup**: state.json.bak written on second-and-subsequent writes; first init produces no .bak.
- **Stale recovery**: lock with `age > 30s AND owner pid not alive (process.kill(pid, 0) → ESRCH)` is auto-reclaimed; the new lock indicates `reclaimed: true` on its handle.
- **TOCTOU fix in init**: `mkdir → lock → check state.json exists → write` instead of the prior `check .ocoding/ exists → mkdir → write`. User-visible behavior preserved (same exit 4 + bilingual message).

### 8.2 Audit-hook TODOs deferred to PR #3

The following events are intentionally NOT yet recorded. PR #3 (Audit + Event Foundation) will wire them in:

- `lock_acquired` (push) — every successful `acquireLock`.
- `lock_released` (push) — every successful `releaseLock`.
- `lock_timeout` (push) — `LockTimeoutError` thrown.
- `lock_stale_recovered` (push) — `acquireLock` returned `reclaimed: true`.
- `state_write_succeeded` / `state_write_failed` (push) — atomic write outcomes.

Until PR #3 lands, these signals are observable only via the returned `CommandResult` and the lock handle's `reclaimed` field.

### 8.3 New tests added in PR #2

| File | Purpose | Count |
|---|---|---|
| `tests/unit/lock-state-schema.test.ts` | LockState zod validation | 8 |
| `tests/unit/lock.test.ts` | Pure stale check + acquire/release/timeout/reclaim | 14 |
| `tests/unit/state-store-atomic.test.ts` | Backup + temp+rename + lock cleanup | 9 |
| `tests/lock/concurrent-writes.test.ts` | Layer 6 concurrency (5 + 10 + stale + corruption) | 4 |
| **Total new** |  | **35** |

### 8.4 Coverage after PR #2

- `src/core/state/lock.ts` — 88% lines.
- `src/core/state/state-store.ts` — 92% lines.
- All-files — 76% lines (above 70% threshold).

---

## 9. PR #3 Addendum — Audit + Event Foundation (2026-04-28)

This addendum is appended after PR #3 merge. It documents the audit subsystem and
the follow-ups deferred to PR #4+.

### 9.1 What changed

- **Schema**: `AuditEvent` zod schema (`src/types/audit.ts`) — 12 event types ×
  7 result types, with strict ULID + ISO 8601 UTC + bilingual message validation.
- **Storage**: append-only dual track:
  - JSONL (machine source-of-truth): `.ocoding/audit/audit-events.jsonl`
  - Markdown (human narrative): `docs/22-audit-trail.md`
- **Atomicity**: `fs.appendFile` with default `'a'` flag relies on POSIX
  `O_APPEND` / Windows `FILE_APPEND_DATA` for per-call atomicity. JSONL lines
  are capped at 3500 bytes to stay well under the 4096-byte page boundary.
- **First-write race**: markdown header creation uses `fs.open(path, 'wx')`
  exclusive create — concurrent first-writes produce exactly ONE `# Audit Trail`
  header.
- **Lock lifecycle**: `withLock` accepts an optional `LockLifecycleHook`
  (`onAcquired` / `onReleased` / `onTimeout` / `onStaleRecovered`). Hook errors
  are silently swallowed inside the lock module; the audit-emitting hook
  (`makeLockAuditHook`) routes through `safeAudit` which logs to stderr on
  failure but never throws.
- **Wired sites**: `ocn init`, `ocn doc create prd`, `ocn check`. Audit emission
  happens at the command boundary, AFTER any held lock is released. The audit
  writer never acquires the state lock and never calls `writeState` — no
  recursive deadlock is possible.

### 9.2 Closed PR #3 verification (verbatim user §XIII)

- [x] L3 closed
- [x] `audit-events.jsonl` writable + appendable + parseable
- [x] `docs/22-audit-trail.md` auto-created
- [x] `ocn init` writes `project_initialized`
- [x] `ocn doc create prd` writes `artifact_created`
- [x] `ocn check` blocked path writes `artifact_gate_run` + `artifact_gate_blocked`
- [x] `ocn check` pass path writes `artifact_gate_run` + `artifact_gate_passed`
- [x] Audit writer does NOT acquire `.ocoding/.lock`
- [x] No `lock → audit → lock` recursive path exists
- [x] All 152 prior tests still pass
- [x] 52 new audit tests pass (43 unit + 9 CLI)
- [x] `npm run lint && typecheck && build && test:coverage` green

### 9.3 Deferred to PR #4+ (do NOT close in PR #3)

- `state_write_started` events — explicitly skipped per user §VIII §2
  alternative ("only state_write_succeeded / state_write_failed").
- `state_write_*` emission INSIDE `writeStateAtomic` — currently emitted at the
  init-command level only. PR #4 will move emission into `writeStateAtomic`
  when `advance` lands and uses it directly.
- Event replay / audit rebuild from JSONL.
- `ocn doctor` integration (read JSONL to detect anomalies).
- Markdown rotation policy (when `docs/22-audit-trail.md` grows large).
- Log subsystem (`ocn log [--type dev|decision]`) — separate from audit per
  CLAUDE.md §4.7 (push vs pull).
- MCP exposure of audit read-only tools — per DEC-001, MCP lands in PR #5.

### 9.4 Audit storage path discrepancy (Amendment Needed flag)

`docs/05-data-model.md` and `docs/06-api-contract.md` reference:

- `.ocoding/events/audit-events.jsonl`
- `docs/21-audit-trail.md`

PR #3 follows the user spec verbatim and uses:

- `.ocoding/audit/audit-events.jsonl`
- `docs/22-audit-trail.md`

The user explicit instruction overrides the design in this PR (user spec §IV).
The discrepancy is a structural one — both directory name (`audit/` vs
`events/`) and file index (`22-` vs `21-`) differ.

**Amendment proposal**: Either reconcile the design docs to match PR #3's
implementation, or open a follow-up PR that migrates the implementation to
match the design. Decision deferred to project owner; PR #3 does not modify
`docs/00-08`.

### 9.5 New tests added in PR #3

| File | Purpose | Count |
|---|---|---|
| `tests/unit/audit-event-schema.test.ts` | AuditEvent zod parse + reject paths | 11 |
| `tests/unit/audit-event-factory.test.ts` | createAuditEvent ULID + timestamp + DI | 8 |
| `tests/unit/audit-writer-jsonl.test.ts` | Append + parseable + size cap | 5 |
| `tests/unit/audit-writer-markdown.test.ts` | Header + sections + concurrent first-write | 7 |
| `tests/unit/audit-writer-failure.test.ts` | JSONL fail / markdown fail / safeAudit | 5 |
| `tests/unit/lock-audit-hook.test.ts` | Hook lifecycle + error swallowing + wiring | 7 |
| `tests/cli/audit-init.test.ts` | init audit trail end-to-end | 4 |
| `tests/cli/audit-doc-create.test.ts` | doc create audit emission | 2 |
| `tests/cli/audit-check.test.ts` | check audit emission (blocked + pass) | 3 |
| **Total new** |  | **52** |

### 9.6 Coverage after PR #3

- `src/core/audit/*` — 99.16% lines (well above 85% target).
- `src/core/audit/audit-event.ts` — 100%.
- `src/core/audit/audit-jsonl.ts` — 100%.
- `src/core/audit/audit-paths.ts` — 100%.
- `src/core/audit/audit-writer.ts` — 93.1%.
- All-files — 83.03% lines (up from 76.34% post-PR #2).

---

## 10. PR #4 Addendum — Full State Machine + Gate + Advance (2026-04-28)

### 10.1 What changed

- **Pre-PR fix (todo 012)**: `withLock` finally block now ALWAYS runs `onReleased`, even when `releaseLock` throws. Original error still propagates. New test in `tests/unit/lock.test.ts:223+`.
- **Audit storage path Amendment AM-001**: `docs/amendments/2026-04-28-audit-storage-path-amendment.md` declares `.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md` as canonical (supersedes the older `events/` + `21-` references in design docs). Establishes the `docs/amendments/` convention.
- **`SopProfile` extension**: `stateOrder`, `stepsForState`, `nextStep`, `artifactPathForStep` plus expanded `requiredSectionsForStep` for 5 step IDs (project_brief / scope / prd / acceptance_criteria / technical_architecture).
- **State machine**: 8 states (discovery, spec, design, plan, build, verify, ship, reflect) with forward-only transitions. PR #4 wires steps for DISCOVERY → PLAN (10 steps total). BUILD/VERIFY/SHIP/REFLECT are state stubs (no steps yet — future PR).
- **`ocn gate`**: read-only artifact gate aggregation with `--json` support. Emits `artifact_gate_run` + `artifact_gate_passed` | `artifact_gate_blocked`.
- **`ocn advance`**: gate-then-mutate. On pass: `withLock` + `writeStateUnlocked` + emit `state_transitioned` + `state_write_succeeded` + `advance_succeeded`. On block: emit `advance_failed` (no state mutation).
- **`AuditEvent.correlationId`** (optional ULID): threaded through every event in a single advance flow. New event types: `advance_started`, `advance_succeeded`, `advance_failed`, `state_transitioned`.
- **Init position**: now `state_discovery / step_project_brief` (PR #4 §6).
- **`ocn check`**: dispatches by current step via SOP profile, removing the PR #1 hardcoded `step_prd` branch. Skeleton Spike PRD blocked/pass verbatim invariant preserved (when at step_prd).
- **`ocn doc create`**: 5 supported types via template registry (project-brief, scope, prd, acceptance-criteria, technical-architecture).
- **`ocn brief`** + **`ocn status`**: now SOP-driven. Resolve current artifact path + required sections from the SOP profile.

### 10.2 Audit-event taxonomy after PR #4

PR #4 brings the total event-type count to 16:

```
project_initialized
state_write_started, state_write_succeeded, state_write_failed
lock_acquired, lock_released, lock_timeout, lock_stale_recovered
artifact_created
artifact_gate_run, artifact_gate_blocked, artifact_gate_passed
advance_started, advance_succeeded, advance_failed     ← NEW
state_transitioned                                     ← NEW
```

`correlationId` (optional ULID) threads `advance_*` + `artifact_gate_*` + `state_transitioned` + `state_write_succeeded`. Lock events do NOT yet carry `correlationId` (`OCN-PR5-001-lock-correlation` follow-up).

### 10.3 New tests added in PR #4

| File | Purpose | Count |
|---|---|---|
| `tests/unit/lock.test.ts` (+1) | `onReleased` fires on `releaseLock` error (todo 012) | 1 |
| `tests/unit/state-machine.test.ts` | SopProfile state-machine API + nextStepFor + transitions | 19 |
| `tests/unit/gate-runner.test.ts` | runGate pass/blocked + correlationId threading | 7 |
| `tests/unit/advance-state.test.ts` | advanceState success/failure/terminal + audit events | 7 |
| `tests/unit/advance-correlation.test.ts` | All advance-flow events share correlationId | 4 |
| `tests/cli/gate.test.ts` | `ocn gate` integration | 5 |
| `tests/cli/advance.test.ts` | `ocn advance` integration + state mutation + audit | 6 |
| `tests/cli/doc-create-expanded.test.ts` | 5 doc types create the right files + audit | 7 |
| **Total new** |  | **56** |

Plus updated existing tests for the new init position (init / status / brief / check / audit-init / audit-check / e2e demo / core-init / core-status / core-check / core-brief).

### 10.4 Coverage after PR #4

- `src/core/state-machine/*` — 100% lines
- `src/core/audit/*` — 99.17%
- `src/core/state/*` — 94.28% (improved by §2.1 fix coverage)
- `src/core/advance/advance-state.ts` — 81% lines (above 70% threshold)
- `src/core/gate/gate-runner.ts` — 80% lines
- All-files — 84% lines (up from 83.03% post-PR #3)

### 10.5 Skeleton Spike acceptance preserved

The user §X verbatim invariant — PRD missing Scenarios returns exit 2 + bilingual `"PRD is missing required section: Scenarios."` / `"PRD 缺少必填章节：Scenarios｜使用场景。"`, fixed PRD returns exit 0 + bilingual `"PRD passed Skeleton Spike artifact check."` / `"PRD 已通过 Skeleton Spike 产物检查。"` — is preserved AFTER walking the state machine via 3 `ocn advance` calls (project_brief → scope → prd). See `tests/e2e/skeleton-spike-demo.test.ts`.

### 10.6 Deferred to PR #5+ (do NOT close in PR #4)

- **Lock event correlationId** — new follow-up todo `OCN-PR5-001-lock-correlation`. Lock events fire from inside the lock module which doesn't know the calling advance flow's correlationId. PR #5 will plumb it through the lifecycle hook context.
- BUILD/VERIFY/SHIP/REFLECT step IDs — state IDs only.
- Rollback transitions, doctor, reset, baseline, MCP server, SOP versioning, production/full tier.
- todo 011 (decouple `safeAudit` from `process.stderr`) — required before MCP lands (PR #5 prep).
- todo 014 (relativize `relatedPaths`) — defer.
- todo 015 (drop `jsonlOk`) — defer.
- OCN-on-OCN dogfood with the new SOP profile (existing OCN docs at OLD layout).

---

## 11. PR #5 Addendum — MCP Safe Tools (2026-04-28)

### 11.1 What changed

- **Pre-PR §3 (todo 011) RESOLVED**: `safeAudit` no longer writes to `process.stderr` directly. New seam `src/core/audit/audit-logger.ts` defines `AuditFallbackLogger` (`{ warn, error }`) with two implementations: `stderrAuditFallbackLogger` (default — preserves PR #4 behaviour for the CLI) and `silentAuditFallbackLogger` (used by the MCP server to avoid corrupting stdio JSON-RPC framing). `setAuditFallbackLogger(...)` is the swap point. `safeAudit(...)` now calls `getAuditFallbackLogger().warn(...)` / `.error(...)`.
- **Pre-PR §4 (`OCN-PR5-001-lock-correlation`) RESOLVED**: `LockAuditHookContext` accepts an optional `correlationId`. `makeLockAuditHook(...)` threads it into every lock event it emits. `advanceState(...)` passes its `correlationId` so a single `ocn advance` invocation now produces a fully-correlated event chain — `advance_started → lock_acquired → artifact_gate_* → state_transitioned → state_write_succeeded → lock_released → advance_succeeded`. Lock events without a correlationId still work for backwards compatibility (e.g. `ocn init`'s lock).
- **MCP server (stdio transport)**: new `src/mcp/server.ts` + `src/mcp/index.ts` bin entry (`ocn-mcp`). Built on `@modelcontextprotocol/sdk@^1.29.0`. The server calls `setAuditFallbackLogger(silentAuditFallbackLogger)` at construction so audit fallback messages never reach stderr (which the JSON-RPC stdio framing reserves for protocol notifications). `package.json` adds `"ocn-mcp": "dist/mcp/index.js"` to `bin` and chmods both bin entries during build.
- **MCPToolResult envelope** (`src/mcp/result.ts`): structured discriminated union `{ ok, code, message: { en, zh }, data? } | { ok: false, code, message, error: { code, en, zh } }` — never throws, never leaks raw exceptions across the MCP boundary. `mcpFromCommandResult(...)` lifts core `CommandResult<T>` into the envelope; `toCallToolResult(...)` produces the SDK's `CallToolResult` shape.
- **7 allowed tools** (`src/mcp/tools/*.ts`):
  - `navigator.where_am_i` — read-only state snapshot
  - `navigator.brief` — read-only render of next-step brief
  - `navigator.run_gate` — read-only gate aggregation (NO state mutation)
  - `navigator.create_artifact` — writes one of 5 doc types from the template registry
  - `navigator.capture_log` — appends to `docs/19-dev-log.md` (`type=dev`) or `docs/18-research-log.md` (`type=research`); **`type=decision` is hard-rejected with bilingual `ERR_GATE_FAILED`** ("MCP cannot capture decisions; use the OCN CLI." / "MCP 不能记录决策，请使用 OCN CLI 命令。")
  - `navigator.detect_sop_version` — compares the project-locked SOP profile id/version against the bundled OCN SOP and reports drift
  - `navigator.generate_next_prompt` — returns required sections + governance reminder + uncertainty policy + self-check rule for the current step
- **4 forbidden tools NEVER exposed**: `navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, `navigator.force_release_lock`. `tests/unit/mcp-tool-registry.test.ts` enforces that `ALLOWED_TOOL_NAMES ∩ FORBIDDEN_TOOL_NAMES = ∅`.

### 11.2 Audit-event taxonomy after PR #5

No new event types in PR #5 — but `lock_acquired` / `lock_released` / `lock_timeout` / `lock_stale_recovered` now carry `correlationId` when emitted from a correlated flow (the `ocn advance` lock chain). Total event types remain 16.

### 11.3 New core fns introduced for the MCP surface

| Fn | Path | Used by |
|---|---|---|
| `captureLog(opts)` | `src/core/log/capture-log.ts` | `navigator.capture_log` |
| `detectSopVersion(opts)` | `src/core/sop/detect-version.ts` | `navigator.detect_sop_version` |
| `generateNextPrompt(opts)` | `src/core/prompt/generate-next-prompt.ts` | `navigator.generate_next_prompt` |

`captureLog` rejects `type=decision` BEFORE any audit event is emitted. `dev` and `research` paths emit `artifact_created` with `data.subType: log-dev` / `log-research` so the dual-track trail records them like any other artifact write.

### 11.4 New tests added in PR #5

| File | Purpose |
|---|---|
| `tests/unit/safe-audit-logger.test.ts` | Logger seam: happy path, JSONL-failure routing, silent logger drops, default stderr formatter, set/reset round-trip |
| `tests/unit/lock-correlation.test.ts` | Lock hook threads correlationId, advance lock chain shares it, no-correlationId path stays backwards-compatible |
| `tests/unit/mcp-result.test.ts` | Envelope helpers: ok / blocked / fromCommandResult / toCallToolResult |
| `tests/unit/mcp-tool-registry.test.ts` | 7-tool list integrity + forbidden-tool absence |
| `tests/unit/mcp-{where-am-i,brief,run-gate,create-artifact,capture-log,detect-sop-version,generate-next-prompt}.test.ts` | Per-tool handler contract |
| `tests/unit/capture-log-core.test.ts` | Core fn — dev/research success, decision rejection, audit emission, error envelope |
| `tests/mcp/mcp-tools.integration.test.ts` | Handler-level integration: every tool returns a parseable envelope, invalid input never throws, success path produces zero stderr writes, run_gate does NOT mutate state.json |

Total new tests in PR #5: ~50 (full suite now at 312 tests / 61 files / 83.88% line coverage).

### 11.5 Safety boundaries enforced by PR #5

1. **No state advancement via MCP.** `navigator.advance_phase` is not registered. Only the human-driven CLI can move forward.
2. **No decisions via MCP.** `navigator.capture_decision` is not registered, AND the `capture_log` tool that *is* exposed hard-rejects `type=decision` with a stable bilingual error code.
3. **No reset via MCP.** `navigator.reset_project` is not registered.
4. **No force-release via MCP.** `navigator.force_release_lock` is not registered.
5. **No raw exceptions cross the boundary.** Every tool handler returns a `MCPToolResult` envelope with `ok` + `code` + `message` (or `error`). Invalid input → `ERR_VALIDATION` envelope, never an exception.
6. **No stderr writes during MCP success path.** The server installs `silentAuditFallbackLogger` at boot, and `tests/mcp/mcp-tools.integration.test.ts` verifies a successful `where_am_i` call produces zero `process.stderr.write` calls.

### 11.6 Deferred (do NOT close in PR #5)

- HTTP / SSE transport — stdio is enough for IDE-side MCP hosts in this PR.
- Streaming responses / progress notifications — not needed for the 7 read/create tools.
- Auth / session management — MCP stdio runs in the user's process; trust boundary is the OS user.
- Doctor, reset, baseline, SOP upgrade tooling — Phase 3.
- `relatedPaths` relativization (todo 014) and `jsonlOk` removal (todo 015) — still deferred.
- Public npm publish — held until a Phase 3 hardening pass.

### 11.7 Phase 2 closure

PR #5 closes Phase 2. Remaining open temporary simplifications: L4 (TS-string SOP loader), L5 (hand-rolled markdown parser), L8 (`warning` status unused), L9 (production/full tiers not enforced), L11 (`latestGateResult` typing), L13/L14 (cosmetic render). None block Phase 2 acceptance; all are tracked for Phase 3.

---

## 12. GA Prep — PR B Note (2026-04-29)

PR B is the second GA Prep PR. It is **documentation + CLI copy only**; no core engine, state machine, audit, or MCP behaviour change.

### 12.1 What landed

- **`README.md` rewrite**: replaces the Skeleton-Spike-era README with a Phase-2-Complete README. New structure: What → Why → Status → Install → First-5-minutes → CLI commands → MCP tools → Documentation map → Development → Roadmap → License. Honest about what's not implemented (`doctor` / `reset` / `baseline` / SOP upgrade / npm publish / mini-CRM / tier production-full / HTTP MCP).
- **`docs/quickstart.md`** (NEW): step-by-step DISCOVERY → SPEC walkthrough, expected file tree, common errors, MCP host wiring snippet.
- **CLI `--help` copy fixes** (no behaviour change):
  - `ocn doc create <type>` argument description was stale ("Skeleton Spike: only 'prd' is supported"). Now lists the 5 supported types.
  - `ocn init --tier` clarified that only `minimal` is enforced today (production / full are accepted but not yet differentiated — closes a hidden mismatch with L9).
  - `ocn brief` description de-jargoned ("hot-memory brief" → "the current-step brief (state, step, required sections, AI governance reminders) for an AI coding session").
- **`tests/cli/help.test.ts`** extended: now asserts all 7 implemented top-level commands appear in `--help`, asserts `doctor` / `reset` / `baseline` / "sop upgrade" do NOT appear (regression guard against advertising unimplemented commands), and asserts the 5 doc types appear in `doc create --help`.

### 12.2 What did NOT change

- No `src/core/*` change.
- No `src/mcp/*` change.
- No state machine / audit / SOP profile / template change.
- No `package.json` change.
- No frozen `docs/00-08` change.
- No DEC-003 / DEC-004 revision.
- No bulk path rewrite across frozen docs (forbidden by DEC-004 + AM-002).
- No new MCP tool, no HTTP transport, no `npm publish`.

### 12.3 GA Prep status after PR B

PR sequence per [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md) §5:

- ✅ PR A — docs numbering reconciliation + amendments index (merged).
- ✅ PR B — README + CLI help audit (this PR).
- ⬜ PR C — MCP `projectRoot` path-traversal audit + threat-model doc.
- ⬜ PR D — External MCP host validation.
- ⬜ PR E — npm publish gating + CI stability audit.
- ⬜ PR F — `examples/` directory plan.

The profile-override implementation announced in DEC-003 is still deferred — out of scope for any PR up through PR F unless explicitly authorised.

---

## 13. GA Prep — PR C Note (2026-04-29)

PR C is the third GA Prep PR. It is a security-hardening PR scoped to the MCP boundary; it adds a centralised `projectRoot` validator, wires it into all 7 allowed MCP tools, ships path-containment helpers, adds 80 new tests across two files, and writes the first OCN threat-model document. **No new product features. No MCP tool surface change. No new MCP tools registered.**

### 13.1 What landed

- **`src/core/security/project-root.ts`** (NEW): centralised seam for `projectRoot` validation.
  - `validateProjectRoot(input: unknown): Promise<ProjectRootValidationResult>` — checks type, emptiness, null bytes, absolute path, normalisation, existence, directory-ness, realpath resolution, and a defence-in-depth re-stat. Returns a discriminated `{ ok: true, projectRoot: realpath } | { ok: false, error: { code, message } }` envelope. Never throws.
  - `assertPathInsideRoot(root, target)` — pure, sync, no fs. Verifies a target sits inside a root after normalisation.
  - `assertResolvedPathInsideRoot(root, target)` — async, symlink-aware. Resolves both paths via `fs.realpath` before the containment check.
- **MCP tool wiring**: every one of the 7 allowed tools now calls `validateProjectRoot(parsed.projectRoot)` BEFORE the core fn. On failure, returns `mcpBlocked(validation.error.code, validation.error.message)`. On success, the tool passes `validation.projectRoot` (canonical realpath) downstream — never the raw user input.
- **`docs/security/mcp-threat-model.md`** (NEW): scope, assets, trust boundaries, T-1 through T-11 threats, mitigations summary, residual risks (RR-1 through RR-8), and future work (F-1 through F-9). Out-of-scope explicitly: remote MCP, HTTP/SSE, OCN SaaS, host compromise, OS compromise.
- **`docs/mcp-usage.md`**: §5 operational guarantees gained item 6 (projectRoot validation). New §5a "Safety boundaries and operating rules" lists what an MCP agent CAN and CANNOT do, the absence of auth / rate limiting / sandbox, and the local-stdio-only constraint. Troubleshooting table updated with the new validator error messages.

### 13.2 Symlink policy

Adopted: **allow** symlinked `projectRoot`, but resolve to canonical realpath. Subsequent core fns operate on the realpath, not the alias. Recorded in `src/core/security/project-root.ts` JSDoc and `docs/security/mcp-threat-model.md` §4 (T-2 mitigation).

### 13.3 Tests added (80 new, 0 modified)

- `tests/unit/project-root-validation.test.ts` — 23 cases across `validateProjectRoot`, `assertPathInsideRoot`, `assertResolvedPathInsideRoot`. Covers non-string, empty, null-byte, relative, non-existent, file-instead-of-dir, valid, normalisation (`..`-segments), symlink-followed, broken-symlink, prefix-collision (`/a/b` vs `/a/bb`), root-symlink-resolution.
- `tests/security/mcp-projectroot-security.test.ts` — 57 cases. For each of the 7 tools: rejects relative / empty / non-string / non-existent / file-not-dir / null-byte projectRoot. Plus path-traversal containment: `create_artifact` does NOT write outside the project; `capture_log` does NOT write outside the project; `run_gate` does NOT mutate state.json; symlinked projectRoot is allowed and resolves to realpath; symlink-to-file is rejected; forbidden-tool absence reaffirmed; tricky-but-legal `..` segments are accepted after normalisation; symlink directory anchored to realpath.

Full suite after PR C: **394 tests / 63 files / 0 failures** (was 314 / 61 after PR B).

### 13.4 What did NOT change

- No `src/cli/` change.
- No `src/core/audit/`, `src/core/state/`, `src/core/templates/` change.
- No `src/core/log/`, `src/core/sop/`, `src/core/prompt/`, `src/core/gate/`, `src/core/advance/` change.
- No new MCP tool. No HTTP/SSE transport. No auth. No rate limiting (only documented as future work).
- No frozen `docs/00-08` change. No DEC-003 / DEC-004 revision. No bulk path rewrite.
- No `package.json` change.
- No ESLint config change.

### 13.5 GA Prep status after PR C

- ✅ PR A — docs governance.
- ✅ PR B — README + CLI help.
- ✅ PR C — MCP `projectRoot` validator + threat model (this PR).
- ⬜ PR D — External MCP host validation.
- ⬜ PR E — npm publish gating + CI stability audit.
- ⬜ PR F — `examples/` directory plan.

---

**END OF NOTES**
