---
title: "feat: Outcome Backbone P2–P4 — 强制测量 + 驱动 + SHIP/REFLECT 落地 (SOP 0.9.0)"
type: feat
status: active
date: 2026-07-02
origin: docs/plans/2026-07-02-outcome-backbone-p2-p4-implementation-spec.md
---

# feat: Outcome Backbone P2–P4 (SOP 0.9.0)

> **This plan is an execution wrapper.** The authoritative, review-synthesized spec is
> [`docs/plans/2026-07-02-outcome-backbone-p2-p4-implementation-spec.md`](2026-07-02-outcome-backbone-p2-p4-implementation-spec.md).
> Every design decision, zod schema, file boundary, and the 8 CRITICAL corrections live there — **the spec wins on any conflict.**
> This wrapper adds: ordered trackable task lists per phase, the consolidated ACs as gates, and LFG-pipeline adaptations for a CLI project.

## Enhancement Summary

**Deepened on:** 2026-07-02 · **Review agents:** kieran-typescript, security-sentinel, data-integrity-guardian, architecture-strategist, code-simplicity.

The five reviews triangulate on **one root correction** to the spec's integrity story, plus a set of schema/probe hardening items that must be folded into **P2 before the ledger types freeze**. Section [**Review Synthesis (deepened)**](#review-synthesis-deepened) below is authoritative for these deltas; where it refines the spec's §1 invariants, **this synthesis wins** (and a spec-amendment note is filed in P4 docs).

### The one load-bearing correction (integrity trust root)
Security-H1 + Data-integrity-H1/H2/H3 + Simplicity-#1 converge:
- The spec's integrity anchor assumes a tamper-evident audit log, but `src/core/audit/audit-jsonl.ts` is plain `fs.appendFile` — **no chain**. So "forge both files = 伪造必留痕" is *defeatable*: an agent appends one consistent forged `outcome_measured` line + matching ledger entry and reconcile passes.
- The ledger's own `prevEntryHash` chain lives **inside the attacker-editable file** → zero adversarial value by the design's own trust-root argument.
- **Fix:** hash-chain the **`outcome_measured` audit subset** (`prevEventHash` + monotonic per-stream index, `fsync` before ledger rename) — *that* is the real trust root. Reconcile = **measurementId-set membership**, scoped to the **current round** (scan back to last `cycle_started`), comparing every ledger entry's fields against its chained audit counterpart. **Drop** the ledger `prevEntryHash` field; keep a free write-time monotonic-length assert. No AC is weakened — truncation/tamper detection moves onto the *stronger* mechanism.

### Must-fold-before-P2-freezes (schema/probe)
- Audit `result` enum has no `no_evidence`/`fail` → carry the tri-state in a **typed `.strict()` `OutcomeMeasuredData` payload** (safeParse on write *and* reconcile-read; parse-fail of a historical event = breach). (TS-H1/H2)
- `.superRefine` the value↔verdict↔evidenceHash biconditionals so a hand-edited desync is rejected at parse, not late. (TS-H4)
- Exhaustive `never` guard at **every** verdict→decision switch (SPEC gate, ledger-guard, dispatch, brief), not just probe. (TS-H3)
- `ProbeReading` uses zod **strip** (not `.strict()`) + read only `metric`/`value` + `.finite()` + no `coerce` — `.strict()` would false-`exec_error` a probe emitting a diagnostic field; prototype-pollution safety comes from never spreading + reading only the two keys (add explicit `__proto__` test). (TS-M4 vs Sec-M4 resolved)
- `spawn` has **no `maxBuffer`** → manually bound accumulated stdout + destroy on overflow; guard `Number.isInteger(pid) && pid>0` before `kill(-pid)`; Windows fallback for process-group kill; resolve-once on timeout-vs-exit race. (Sec-H2)
- Evidence snapshot: require **realpath + assertResolvedPathInsideRoot on every hit** (lstat-leaf-skip is escapable via symlinked parent dir); reject absolute/`..` `source` patterns at parse; define `**`/multi-segment semantics; add hit-count + aggregate-byte caps; domain-separated (length-prefixed, sorted `path→sha256`) `evidenceHash`. (Sec-H3/M1/L1)
- `probeEntryHash` + `commandHash` go **into the audit event and into reconcile's compare set** (an unenforced forgery-evidence field is not evidence); state the probe **transitive-closure** boundary honestly (entry-file hash ≠ dependency-graph hash). (Sec-H4, DI-M2, Simplicity-#3)
- `due` fields: `.regex(/^state_/)`; unresolvable due-state → **enforce from gate 1** (AM-014 fail-safe), never "never due". (TS-M3)

### Key Improvements
1. Real trust root = chained `outcome_measured` audit subset; reconcile = measurementId-set + round-scoped (replaces last-vs-last + count).
2. Live-vs-frozen defined for the **whole entry**: verdicts **and waivers** are live (both reset on `cycle new`); only `contractHash`/`due`/`measure` are frozen.
3. Every reset/crash boundary is **atomic + resumable + fsync-durable** (dual-write, `cycle new` archive→reset, migration seed).
4. `sop upgrade` **seeds the ledger** with frozen `contractHash` for the already-passed SPEC step (else upgraded projects have no drift/probe baseline).

### New Considerations Discovered
- Evidence proves **temporal correlation, not causal binding** (value from stdout; evidenceHash from a possibly-unrelated glob) — messaging must stay honest; it's adjacent to the declared boundary.
- Torn trailing JSONL line must be **skipped**, not thrown on, or a crash fails every gate.
- REFLECT reference key must be **`measurementId`**, not `@ measuredAt` (same-second collisions).
- Orphan ledger entry (AC deleted from `docs/03`) → require `entry.waived` else block (pivot vs. tamper escape).

## Overview

P1 (types + parsing + v2 projection) shipped in PR #92. P2–P4 turn "*define* an outcome" into
"**force measurement + drive the workflow + land it in SHIP/REFLECT**" — closing the sixth false-completion
class (*process-complete-but-outcome-unmeasured*). Three strictly-serial PRs, each ≤500 lines, each on its own
branch with a full `lint && typecheck && test` gate.

The judgement chain is **mechanical only** — OCN never evaluates whether an outcome is *good* (LLM-judge constitutional
ban). It controls the *structure and execution* of measurement; metrics/thresholds stay human-authored.

## Grounding (verified 2026-07-02)

Reuse anchors confirmed present with the exact line counts the spec assumes:

| Anchor | Path | Note |
|---|---|---|
| Threshold compare | `src/core/outcome/threshold.ts` (58) | `compareThreshold` = P2's first consumer |
| Measure contract | `src/core/acceptance/measure-parser.ts` (99) | P1 output |
| v2 projection | `.ocoding/acceptance-specs.json` | **only** authoritative source of the measure contract |
| Real lock+bak | `src/core/state/state-store.ts` (144) | `withLock` — ledger MUST use this, not lock-less task/acceptance stores |
| Paths | `src/core/paths.ts` (45) | add `outcomeLedgerFile` |
| Gate runner | `src/core/gate/gate-runner.ts` (**482**) | needs step-gate registry decomposition before adding 3 gates |
| Advance | `src/core/advance/advance-state.ts` (**208**) | new logic goes in `outcome-ledger-guard.ts`, NOT here |
| Brief | `src/core/brief.ts` (**283**) | outcome section extracted to `brief-outcome-section.ts` |
| Audit types | `src/types/audit.ts` (112) | add `outcome_measured` / `outcome_waived` |
| Automation | `src/core/automation/authorization.ts` (138) | add `authorizeAiOutcomeCheck` |
| SOP profiles | `src/sops/default-ai-coding-sop/` | 0.1–0.8 present; add `0.9.0/` |

## Cross-cutting invariants (spec §1 — never violate)

1. Integrity anchor = **audit JSONL cross-check**, not self-checksum.
2. Ledger uses **`state-store.withLock` + `.bak`** (5s).
3. Dual-write order: **append audit event first, then rename ledger**.
4. `history` is append-only: `prevEntryHash` chain + monotonic length + audit-count cross-check.
5. verdict: store `NO_EVIDENCE / MEASURED_PASS / MEASURED_FAIL`; `UNMEASURED` = empty history (computed). "Latest" = **last array element**, never `max(timestamp)`.
6. Block only **unmeasured**, never **measured-fail** (FAIL forces a human decision, doesn't block advance).
7. Honest boundary in PASS message + docs: no crypto anti-forgery, only "伪造必留痕"; evidence snapshot **also covers the probe entry file**.
8. **No `ocn outcome freeze`** — freezing is an acceptance-gate side-effect. Command group = `check / list / waive`.
9. Runtime `actual` must be `.finite()`-guarded before `compareThreshold`.
10. MCP whitelist stays **7 tools** (test-pinned).

---

## Phase P2 — Ledger + probe executor + `ocn outcome` command group

**Branch** `feat/outcome-backbone-p2-ledger`. Make "measurement" executable, registerable, forgery-evident.
No gates / no dispatch yet.

- [ ] `src/types/outcome-ledger.ts` — zod single source (`OutcomeVerdict`, `EvidenceFile.strict()` no mtime, `OutcomeMeasurement.strict()`, `OutcomeWaiver`, `OutcomeLedgerEntry`, `OutcomeLedger` v1). (spec §2.1)
- [ ] `src/core/paths.ts` — add `outcomeLedgerFile = .ocoding/outcome-ledger.json`.
- [ ] `src/core/outcome/outcome-verdict.ts` — `latestVerdict(entry)` computed helper.
- [ ] `src/core/outcome/probe-runner.ts` — `runProbe(cwd, measure)`; spawn `/bin/sh -c <frozen cmd>` verbatim, `detached`, timeout; exit map `0`→parse / `===20`→no_evidence / else→exec_error; last-line JSON `maxBuffer` 1MB, >64KB→error, `ProbeReading.strict()` no coerce, read only `metric`/`value`; process-group SIGKILL on timeout; `verdictFor` exhaustive `never`. (spec §2.2)
- [ ] `src/core/outcome/evidence-snapshot.ts` — `measure.source` glob (reuse `readiness/repo-prober` globToRegExp); lstat skip symlink / assert-inside-root; size-cap per file; `{path,sha256,bytes}` no mtime; **zero-hit → forced NO_EVIDENCE**; `probeEntryHash` from first local file arg of command.
- [ ] `src/core/outcome/outcome-ledger-store.ts` — `readOutcomeLedger` (safeParse, no `as`), `writeOutcomeLedger` (withLock+bak+rename), `appendMeasurement` (read-modify-write inside lock; prevEntryHash chain; monotonic length). Freeze `contractHash` as **acceptance-gate side-effect**, not here.
- [ ] `src/core/outcome/outcome-integrity.ts` — `reconcileLedgerWithAudit(root)`: last `outcome_measured` per acId vs ledger last history (measurementId/value/verdict/evidenceHash); ledger-ahead→breach, audit-ahead-by-1→recoverable; contractHash drift vs v2 projection→breach.
- [ ] `src/types/audit.ts` — add `outcome_measured` (result pass|fail|no_evidence) + `outcome_waived`.
- [ ] `src/core/automation/` — `authorizeAiOutcomeCheck` (phase2, BUILD/VERIFY only; SHIP/REFLECT naturally human-only); `waive` → human-only hard zone, ai_agent technical refusal.
- [ ] `src/cli/commands/outcome.ts` (+ render) — `check <ac-id>` (push, reconcile+drift first→exit2, runProbe, exec_error→exit4 no-write, else appendMeasurement + audit-first), `list` (pull, no audit), `waive <ac-id> --dec --reason` / `waive --no-outcome --dec --reason` (push, human-only). Wire into `src/cli/index.ts`.
- [ ] Extend acceptance gate to freeze each outcome AC's `verifyHashOf(measure.command)` into ledger `contractHash` on pass.
- [ ] **Tests (P2):** compareThreshold per-op; probe tri-state (exit0+bad-JSON→exec_error, exit20→no_evidence, timeout→exec_error); ProbeReading rejects NaN/Infinity/"1"; >64KB reject; snapshot symlink-skip + zero-hit→NO_EVIDENCE + probeEntryHash; append prevEntryHash chain + monotonic; reconcile consistent/tampered/recoverable; **concurrent** double-check no lost update; CLI drift→exit2, exec_error→exit4 no-write, ai_agent waive refused, audit-before-rename crash point.

**Exit gate P2:** ACs 1–6 (spec §5) pass; `lint && typecheck && test` green; ≤500-line diff.

---

## Phase P3 — Judgement→drive loop + SPEC gate

**Branch** `feat/outcome-backbone-p3-drive`. Depends on P2. The soul: ledger **drives** behavior.

- [ ] **SPEC gate** (after acceptance-pass branch at `step_acceptance_criteria`): require ≥1 `kind:outcome` **or** valid `noOutcomeWaiver` (machine-check `--dec` exists in `docs/20-decision-log.md`, re-verified every gate); waiver×outcome mutual-exclusion → bilingual block. (spec §3.1)
- [ ] **Activation timing** (reuse AM-014): `dueState = measure.due ?? state_ship`; before due → DEFERRED (no block/dispatch); **due-already-passed clamp** to next reachable boundary for upgraded projects. (spec §3.2)
- [ ] `src/core/advance/outcome-ledger-guard.ts` — VERIFY→SHIP: reconcile→any due `UNMEASURED/NO_EVIDENCE` unwaived → exit1 fix_hint; `MEASURED_FAIL` → **no block** + bilingual decision prompt. (spec §3.3)
- [ ] `src/core/execution-navigator/next-prompt-outcome-dispatch.ts` — **new sibling** module; priority: due-unmeasured/failed outcome > pending build task; **BUILD anti-livelock** (outcome only overrides build task when build ledger empty / outside BUILD; NO_EVIDENCE within trace closure drops below pending build task). (spec §3.4)
- [ ] Sync `governance-text.ts` + `/ocn-next` template + AM-011 review-subagent instructions.
- [ ] `src/core/brief-outcome-section.ts` — extracted; verdict counts + days-since-measure (from existing audit timestamps, zero new telemetry); **no synthetic health score**. (spec §3.5)
- [ ] **Gate-runner decomposition** (arch H2): step-gate dispatch registry; convert the 3 near-duplicate evaluate→block→persist blocks + 3 new gates into discriminated-kind step fns (`skip|pass|io_error|blocked`); **shrink runner, don't add a 5th/6th copy**. (spec §3.6)
- [ ] **`zero_tasks` reconciliation** (spec §3.7): relax `zero_tasks` build-plan defect when ≥1 due outcome AC exists (a frozen-probe outcome AC counts as a verifiable deliverable).
- [ ] **Tests (P3):** SPEC no-outcome-no-waiver→blocked; waiver DEC missing→blocked; waiver×outcome→blocked; VERIFY→SHIP 4 verdicts × waived; MEASURED_FAIL no-block+prompt; DEFERRED no early noise; due-already-passed clamp; dispatch due-UNMEASURED+pending-task→measure (non-BUILD); BUILD early-due no livelock; hand-edit ledger→next gate reconcile-fail; pure-outcome (zero-task) passes build-plan gate.

**Exit gate P3:** ACs 7–12 pass; gate-runner ≤300 lines post-decomposition; green; ≤500-line diff.

---

## Phase P4 — SOP 0.9.0 profile + SHIP/REFLECT + migration + release

**Branch** `feat/outcome-backbone-p4-sop090`. Depends on P3. State machine crosses `step_final_build_verdict` for the first time.

- [ ] `src/sops/default-ai-coding-sop/0.9.0/` (seven-piece, inherit 0.8.0): add `state_ship→step_release`, `state_reflect→step_evolution_report`; `PROFILE_VERSION="0.9.0"`; `precise_activation` inherited; loader register; default flip to 0.9.0; ≤0.8.0 frozen+importable.
- [ ] **SHIP gate** `step_release` (arch C2): **no required artifact** → wire cross-cutting like `contractDriftOrNull` in **both** runGate branches (inline block would silently auto-pass). Enter: no due `UNMEASURED/NO_EVIDENCE` unwaived. Complete: all `MEASURED_*` and every `MEASURED_FAIL` waived (DEC) or project-waived; reconcile first. (spec §4.2)
- [ ] **REFLECT gate** `step_evolution_report`: artifact `docs/22-evolution-report.md` with `### Outcome References` (`- <ac-id>: value=<n> @ <measuredAt>`); mechanical cross-check vs ledger; canonical = **current-round latest entry**, must match `@ measuredAt`; reject out-of-round values; mismatch→blocked with acId+2 numbers. (spec §4.3)
- [ ] **`ocn cycle new` spiral (CRITICAL)**: archive `outcome-ledger.json` to `.ocoding/cycles/<n>/`; next round live verdicts **reset to UNMEASURED**, keep only frozen contract (contractHash/due/measure); audit JSONL never archived.
- [ ] Move hard-coded terminus text: `advance-state.ts:143-146` `no_next_step` + cycle/rewind signpost from `step_final_build_verdict` → `step_evolution_report`; update "terminus in VERIFY" assertion tests.
- [ ] **Migration** `ocn sop upgrade` 0.8.0→0.9.0 (DEC-029/AM-015 precedent): preserve config/cursor/artifacts; new SPEC requirement + new states via AM-014 precise activation, **no retroactive explosion**. Migration test: 0.8.0 stopped at `step_final_build_verdict` → upgrade → advance enters `step_release`; **also** keep "frozen 0.8.0 pin terminus stays `step_final_build_verdict`".
- [ ] **Projection v2 pin-awareness** (P1 C1 tail): thread pin version through `evaluateAcceptanceSpecs → buildAcceptanceProjection` + gate-runner call sites; `<0.9.0` pin → still v1 + warn even with `kind:outcome` in docs. (spec §4.5)
- [ ] **Release**: npm `0.9.0-beta.0` (lockstep, latest+beta) + GitHub release (**human-gated**); MCP whitelist still-7 assertion; amendment `docs/amendments/2026-07-xx-outcome-backbone-amendment.md` + DEC-042 + CLAUDE.md §6 + README/onepager + proposal Status→implemented; PDF via build/pdf pipeline.
- [ ] **e2e** `tests/e2e/outcome-backbone-walkthrough.test.ts` from-scratch default-0.9.0: DISCOVERY→REFLECT full walk incl. `outcome check` in VERIFY; **spiral round 2** (round-1 MEASURED_FAIL → cycle new → round-2 UNMEASURED → remeasure → PASS → SHIP); migration branch terminus move.

**Exit gate P4:** ACs 13–17 pass; green; ≤500-line non-release diff; release steps staged for human approval.

## Consolidated Acceptance Criteria (spec §5 — the review gates)

1. contract-hash drift → check refuses (exit 2). (P2)
2. probe exit 20 → NO_EVIDENCE (not FAIL); audit result=no_evidence. (P2)
3. exit 0 + non-`{metric,value}` → exec_error (exit 4), no verdict written. (P2)
4. probe `Infinity/NaN/1e400` → exec_error (not PASS). (P2)
5. ai_agent `outcome waive` (either) → technical refusal. (P2)
6. hand-edit ledger → next gate `reconcileLedgerWithAudit` fails + reguide. (P2/P3)
7. SPEC no outcome AC + no valid waiver → blocked (exit 1). (P3)
8. waiver `--dec` points to missing/deleted DEC → waiver void + block. (P3)
9. due UNMEASURED outcome + pending build task → next-prompt (non-BUILD) dispatches measurement. (P3)
10. MEASURED_FAIL, non-SHIP advance → no block + bilingual prompt. (P3)
11. VERIFY→SHIP due NO_EVIDENCE → blocked (exit 1), fix_hint→probe. (P3/P4)
12. pure-outcome (zero build task) project → passes build-plan gate to SHIP. (P3)
13. evolution-report ref ≠ current-round ledger value → REFLECT blocked, acId+2 numbers. (P4)
14. `cycle new` round-2 → outcome verdict starts UNMEASURED (no stale green), frozen contract kept, audit JSONL not archived. (P4)
15. 0.8.0 project stopped-terminus upgrade→0.9.0 → advance enters `step_release`; frozen 0.8.0 pin terminus stays `step_final_build_verdict`. (P4)
16. `<0.9.0` pin with `kind:outcome` in docs → projection stays v1 + warn. (P4)
17. any phase → MCP whitelist still 7 tools (pinned assertion). (P2–P4)

## System-Wide Impact

- **Interaction graph:** `ocn outcome check` → runProbe(spawn) → evidence-snapshot → appendMeasurement(withLock) → audit-writer (`outcome_measured`); every gate → reconcileLedgerWithAudit → (SPEC/VERIFY→SHIP/REFLECT) gates; next-prompt → outcome-dispatch precedence.
- **Error propagation:** exec_error→exit 4 (no ledger write); drift/invalid→exit 2; gate fail→exit 1. Probe's exit 20 stays a probe-side convention, never enters the ocn exit table.
- **State lifecycle risks:** dual-write ordering (audit-first, rename-second) makes "ledger ahead of audit" the only tamper signature; crash between the two is recoverable-by-remeasure, not corruption.
- **API surface parity:** `outcome check` mirrors `task check` (state-changing, CLI-only, phase2-delegable); `outcome waive` mirrors readiness waive (human-only). MCP surface untouched.
- **Integration scenarios:** covered by the from-scratch 0.9.0 e2e incl. the FAIL→cycle spiral and the upgrade-terminus-move migration.

## LFG-pipeline adaptations (CLI project)

- **`/workflows:review`** → applies to each phase's diff (code-reviewer + security-sentinel + data-integrity-guardian focus on the forgery-evidence + lock invariants).
- **`/test-browser`** → **N/A (no web UI).** Substituted by the CLI e2e walkthrough (`tests/e2e/outcome-backbone-walkthrough.test.ts`) exercised via `npm run test`.
- **`/feature-video`** → terminal/asciinema demo of the DISCOVERY→REFLECT walk (init → outcome AC → `outcome check` → drift/forgery refusal → SHIP → REFLECT → `cycle new` spiral) attached to the PR, in place of a browser screen capture.

## Review Synthesis (deepened)

Architecture-strategist findings (grounded in real line numbers), plus the resulting **revised sequencing**. These refine the spec/PR-table where noted.

### Architecture corrections (fold into implementation)
- **A-H1 (terminus leak — highest value, do first in P4):** `advance-state.ts:140` and `advance-automation.ts:36` call `loadSopProfile().nextStep(...)` = the **default** profile, not `resolveProfileForProject(state.project.sopProfileVersion)` (what `gate-runner.ts:93` correctly uses). Invisible today; the instant default flips to 0.9.0, a **0.8.0-pinned** project computes `nextStep(step_final_build_verdict)===step_release` and advances past its frozen terminus. **P4 prerequisite step (before the default flip):** switch both call sites to the pinned profile + regression test "0.8.0-pinned at old terminus, default=0.9.0, advance → still terminal" (this is the real guard for AC-15, not just `sop upgrade`).
- **A-M1 (SHIP is a closure, not a registry entry):** `step_release` has **no required artifact** → `runGate` early-returns at `gate-runner.ts:198-223`, *before* the `content!==null` step-keyed path. So the step-gate **registry** (keyed by stepId, only reached when `content!==null`) is correct for **SPEC** (`step_acceptance_criteria`) and **REFLECT** (`step_evolution_report`, has `docs/22`), but **SHIP must be a cross-cutting closure** (family of `readinessOrNull`/`contractDriftOrNull`), guarded on `currentStateId===state_ship`, invoked in the null-artifact branch. Registering `step_release` in the registry = it **never fires**. Keep readiness/contract as *sequenced closures* (ordering is behavior); don't let a map-iterating registry lose the section→step→readiness→contract order.
- **A-M2 (non-swallowing audit before rename):** the repo-wide audit path is `safeAudit` (swallows write failures — `gate-runner.ts:120`). Dual-write treats "ledger ahead of audit" as tamper, so a swallowed `outcome_measured` failure + successful ledger rename = **false breach**. `outcome check` MUST use a **non-swallowing** audit write whose success is a hard precondition for the ledger rename (fail → exit 4, no rename). Deliberate departure from `safeAudit` — document it.
- **A-M4 (guard is 3-way, not OrNull):** `taskLedgerGuardOrNull` is binary; MEASURED_FAIL must **pass the advance AND emit a bilingual prompt** — a third outcome. Define `outcome-ledger-guard` return as discriminated `{pass} | {warnAndPass, message} | {block}` and specify the renderer (append to success `CommandResult` or dedicated `ocn log`/audit line), or the "FAIL forces a visible decision" soul silently vanishes.
- **A-M5 (thread a capability, not a version string):** the gate-runner call site (`:297`) already has the resolved `profile` in scope (`:93`). Add a profile capability (e.g. `acceptanceProjectionVersion` / rulebook flag) and pass *that* through `evaluateAcceptanceSpecs→buildAcceptanceProjection`, instead of a bare `"0.9.0"` string — keeps SOP-ordering semantics out of the acceptance layer.
- **A-M6 (precedence resolver):** add a thin module that **composes** `next-prompt-outcome-dispatch` + `next-prompt-task-dispatch` and owns the "outcome > task minus BUILD anti-livelock" precedence — so neither dispatcher nor the 251-line `next-prompt-sections.ts` owns cross-dispatcher logic.
- **A-H3/A-L1:** also extract a `gate-emit.ts` (baseAudit/safeAudit-wrapped blocked-result emission) to actually hit ≤300 on the runner; keep the `due-already-passed` clamp in the **AM-014 readiness-timing module family** (reuse `dueState`), not re-implemented in the guard.

### Revised sequencing (supersedes the §6 spec table where it conflicts)
- **P2 gains pin-awareness (A-M3):** P1 ships a **pin-blind** `buildAcceptanceProjection` ("has outcome → v2"). Since P2 makes the v2 projection the load-bearing freeze source, a 0.8.0-pinned repo with `kind:outcome` would mis-fire the freeze. **Move the v2-projection pin-gating into P2** (was spec §4.5/P4), tested from P2 onward. (AC-16 validated in P2.)
- **P3 splits into P3a + P3b (A-H2, CLAUDE.md §8 ≤500 hard limit):**
  - **P3a — pure refactor:** land the ordered typed step-gate array (`skip|pass|io_error|blocked`) + `gate-emit.ts` with **byte-identical behavior**, existing suite unchanged/green. (~300 diff lines, reviewable in isolation.)
  - **P3b — drive features:** SPEC gate, activation/clamp, VERIFY→SHIP guard (3-way), dispatch + precedence resolver, brief section, zero_tasks reconcile — on the clean runner.
- **P4 ordering:** step 0 = fix `nextStep` pinned-profile resolution + regression test (A-H1/A-L2), *then* profile/states, gates, cycle-spiral, migration, e2e. Consider a P4a (profile + states + terminus-move fix) / P4b (SHIP+REFLECT gates + cycle spiral + migration + e2e) split if >500 lines (likely).
- **Ordered step-gate = plain array, not a dynamic registry (Simplicity-#4):** fixed known set → sequential array of typed step-fns iterated in order; no registration machinery.

### Revised PR table
| PR | Branch | Scope |
|---|---|---|
| P2 | `feat/outcome-backbone-p2-ledger` | §2 + **pin-aware v2 projection** + chained-audit trust root + all schema/probe hardening from Enhancement Summary |
| P3a | `feat/outcome-backbone-p3a-gate-runner` | gate-runner → ordered typed step-gate array + `gate-emit.ts`, **byte-identical behavior** |
| P3b | `feat/outcome-backbone-p3b-drive` | SPEC gate / activation / VERIFY→SHIP 3-way guard / dispatch + precedence / brief / zero_tasks reconcile |
| P4a | `feat/outcome-backbone-p4a-sop090` | 0.9.0 profile + states + **pinned-profile `nextStep` fix** + terminus move |
| P4b | `feat/outcome-backbone-p4b-ship-reflect` | SHIP closure + REFLECT gate + `cycle new` spiral + migration seed + e2e + (release, human-gated) |

## Dependencies & Risks (spec §7)

1. State machine crosses 20 steps for the first time — pin the cursor semantics for old VERIFY-terminal projects in migration tests (upgraded vs frozen pin, both).
2. Dispatch-precedence change ripples into `/ocn-next` + AM-011 review text — sync or auto-mode gets stale instructions.
3. Evidence forgery is a **declared boundary**, not a solved problem — mitigated by audit cross-check + probe-entry snapshot + human-only freeze; messaging must not overclaim (no crypto).
4. Runner is already 482 lines — decompose to a step-gate registry in P3 **before** adding the 5th/6th block.

## Sequencing & gating

Strictly serial P2 → P3 → P4, each its own branch + PR ≤500 lines, each `lint && typecheck && test` green.
**Human-gated:** merge, `ocn advance` (OCN's own state), `ocn sop upgrade` default flip, npm publish. Freeze new backbones after 0.9.0.

## Sources

- **Origin spec:** [docs/plans/2026-07-02-outcome-backbone-p2-p4-implementation-spec.md](2026-07-02-outcome-backbone-p2-p4-implementation-spec.md) — carries all 8 CRITICAL corrections + 6-agent review synthesis.
- Upstream: [proposal](../outcome-backbone-proposal.md), [0.9.0 upgrade plan](2026-07-02-outcome-backbone-0.9.0-upgrade-plan.md).
- P1: PR #92 (`feat/outcome-backbone-p1-types`).
- Precedents: Task Backbone (0.5.0), Acceptance Backbone (0.8.0, AM-015/DEC-041), AM-014 precise activation, AM-009 auto mode, AM-011 review subagent.
