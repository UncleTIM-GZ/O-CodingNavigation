# Skeleton Spike — Implementation Notes

> Date: 2026-04-28
> Companion to `dogfood-report-skeleton-spike.md` and `docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md`.
> **None of these notes block the spike acceptance.** They are honest disclosures of temporary simplifications and items deferred to Phase 2.

---

## 1. Temporary Simplifications (record per plan §3.2)

| # | Simplification | Where | Removal trigger |
|---|---|---|---|
| L1 | ~~`state.json` write does NOT use lock + backup + atomic temp/rename. Plain `fs.writeFile`.~~ **RESOLVED by PR #2 (state-safety)** — `writeStateAtomic` now wraps every state write with `.ocoding/.lock` (5s timeout, 200ms retry, 30s stale threshold), `state.json.bak`, temp file + atomic rename. See `docs/plans/2026-04-28-feat-ocn-phase2-state-safety-plan.md` and `src/core/state/{lock,state-store}.ts`. | ~~`src/core/state/state-store.ts` `writeState()`~~ | ✅ Done |
| L2 | Initial position after `ocn init` jumps directly to `state_spec` / `step_prd`, skipping discovery + scope steps. | `src/core/init.ts` lines 53-61 | Phase 2 — when full state machine + `ocn advance` lands |
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

**END OF NOTES**
