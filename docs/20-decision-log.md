# O'CodingNavigator Decision Log

文档路径：`docs/20-decision-log.md`
产品名称：`O'CodingNavigator`
产品简称：`OCN`
CLI 命令：`ocn`
文档版本：`v1.0`
SOP Profile：`default-ai-coding-sop`
SOP Profile Version：`0.1.0`
当前状态：`state_plan`
当前 Step：`step_mvp_plan`
对应 SOP：横切义务 `obligation_decision_log`（pull-mode capture）

> 决策日志是项目记忆系统的 Warm Memory 之一（CLAUDE.md §5）。
> 每条 entry 必须包含：决策、背景、可选方案、最终选择、选择理由、风险、后续观察、关联 PR/artifact。
> Append-only：新决策追加在底部，不修改已有 entry。

---

## Decision Log Index

| # | Date | Decision | Status |
|---|------|----------|--------|
| DEC-001 | 2026-04-28 | Skeleton Spike PASS, Phase 2 entry approved | ✅ Approved |
| DEC-002 | 2026-04-28 | Phase 2 Complete after MCP Safe Tools merge | ✅ Approved |
| DEC-003 | 2026-04-28 | Documentation numbering policy after SOP v1.1 (profile override, no historical renumber) | ✅ Approved |
| DEC-004 | 2026-04-28 | Frozen design docs amendment policy (pragmatic amendment) | ✅ Approved |
| DEC-005 | 2026-04-29 | Defer External MCP Host Validation until a real host is available | ✅ Approved |
| DEC-006 | 2026-04-29 | npm package name decision workflow (availability check first) | ✅ Approved |
| DEC-007 | 2026-04-29 | First semver lane: `0.1.0-alpha.0` if publishing proceeds | ✅ Approved |
| DEC-008 | 2026-04-29 | Alpha publish may be planned before PR D, with mandatory caveat | ✅ Approved |
| DEC-009 | 2026-04-29 | Package contents policy: `package.json` `files` allowlist | ✅ Approved |
| DEC-010 | 2026-04-29 | CI matrix policy: single-cell `ubuntu-latest` + Node 20 for alpha; expand at beta | ✅ Approved |

---

## DEC-001｜Skeleton Spike Passed and Phase 2 Entry Approved

**Date**: 2026-04-28
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Related PR**: [#1 — feat(skeleton-spike): Phase 0 + Phase 1](https://github.com/UncleTIM-GZ/O-CodingNavigation/pull/1) (merged at `a93d5a3`)

---

### Decision

Skeleton Spike Phase 0 / Phase 1 is accepted as **PASS**.
OCN may enter Phase 2.

### Evidence

- **G0 PASS**: lint, typecheck, `test:coverage`, CLI `--help`, helpers and fixtures
- **G1 PASS**: Phase 1 unit, CLI and e2e tests
- **G2 PASS**: 8-command demo matched JSON contract verbatim
- **117 tests passed** across 28 files
- **Blocked PRD missing Scenarios** returned exit code **2** with `missingRequiredSectionIds: ["section_scenarios"]` and bilingual message:
  - en: `"PRD is missing required section: Scenarios."`
  - zh: `"PRD 缺少必填章节：Scenarios｜使用场景。"`
- **Fixed PRD** returned **OK** exit code **0** with bilingual message:
  - en: `"PRD passed Skeleton Spike artifact check."`
  - zh: `"PRD 已通过 Skeleton Spike 产物检查。"`
- Multi-agent code review verdict (architecture, security, kieran-typescript, simplicity): **READY TO MERGE** — 0 P1, 4 P2 deferred, 6 P3 deferred.

### Interpretation

The core product thesis is validated at the smallest scale:

> **OCN can detect artifact fake-completion through Step Artifact Gate.**

A document existing on disk is no longer mistaken for completion of the SOP step. The spike specifically proves that a PRD missing only `Scenarios｜使用场景` is rejected with a structured, bilingual, machine-readable result — exactly the failure mode that the product is designed to prevent.

### Background

Phase 1 was scoped per `docs/08-mvp-plan.md` §3 (Skeleton Spike). The plan was locked at [`docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md`](./plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md) and amended once (§16) for ESM/NodeNext, Vitest v2, Husky v9, and NFKC normalization specifics.

The spike intentionally omitted: full state machine, advance, gate aggregation, baseline, doctor, reset, SOP upgrade, full event/lock subsystems, dogfood mini-CRM, MCP server, SQLite, Web UI, TUI, LLM judge, custom SOP authoring (`docs/01-scope.md` §8 + plan §3.2). All deferrals are recorded in `implementation-notes.md`.

### Options Considered

| # | Option | Rejected because |
|---|--------|------------------|
| A | Accept PASS and approve Phase 2 entry | (chosen) |
| B | Accept PASS but defer Phase 2 pending mini-CRM dogfood | mini-CRM is `docs/08-mvp-plan.md` §39.2 success criterion for **GA**, not Phase 2 entry. Blocking Phase 2 on it would inflate the spike's exit bar. |
| C | Reject and require additional artifacts (warning state, more required sections) | Spike's binary acceptance was met. Adding scope retroactively violates the locked plan. |
| D | Approve but rewrite spike to remove temp simplifications first | The 14 simplifications in `implementation-notes.md` §1 were planned, not accidents. Rewriting now would invalidate the merged PR's lessons. |

### Final Choice

**Option A** — accept PASS, approve Phase 2 entry, with explicit constraints and PR ordering below.

### Constraints on Phase 2

Phase 2 **MUST** first address **state safety** and **audit foundation** before expanding workflow features. Specifically:

- No `ocn advance` without lock-protected state writes.
- No `runGate` aggregation without audit event subsystem.
- No MCP exposure of `navigator.run_gate` until audit can record gate runs.

These ordering constraints prevent the well-known anti-pattern where workflow features ship without the persistence and observability they implicitly depend on.

### Approved Next PR Order

| PR # | Scope | Depends on |
|------|-------|------------|
| **PR #2** | **State Safety Foundation** — `state.json` lock + backup + temp-rename, recovery from `state.json.bak`, concurrency tests (Layer 6). Resolves `implementation-notes.md` L1. | Phase 1 merged ✅ |
| **PR #3** | **Audit + Event Foundation** — `.ocoding/audit/<yyyy-mm>.jsonl` writer, push-event taxonomy, append to `docs/21-audit-trail.md`. Resolves `implementation-notes.md` L3. | PR #2 |
| **PR #4** | **Full State Machine + Gate + Advance** — DISCOVERY → REFLECT, `runGate` aggregation, `ocn advance` (CLI-only — never MCP). Resolves `implementation-notes.md` L2 + L7. | PR #2, PR #3 |
| **PR #5** | **MCP Safe Tools** — Minimal MCP Server with the 7 approved tools. **Never** `navigator.advance_phase`. | PR #2, PR #3, PR #4 |

Each PR runs the same workflow as PR #1: branch → commit → PR → multi-agent review → CI → merge.

### Not Approved Yet (revisit after PR #5 merges)

- Tier `production` / `full` artifact sets
- `ocn doctor` / `ocn reset --keep-docs / --keep-state / --hard`
- `ocn sop {version,diff,upgrade --plan}` — SOP versioning + upgrade plan
- `npm publish` — package name negotiation, license header sweep, README polish
- mini-CRM dogfood (Tier 2 success criterion for **GA**, not Phase 2 entry)
- LLM Judge soft gate
- TUI / Web GUI

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Phase 2 work expands beyond approved PR list (scope creep). | Each PR commits to its scope statement above; reviewers reject out-of-scope additions. |
| R2 | State safety implementation introduces lock contention bugs invisible to current single-process tests. | PR #2 must add Layer 6 concurrency tests (≥ two writers + one killed mid-write + one timed-out). |
| R3 | Audit event taxonomy churns once real-world push events arrive. | PR #3 ships an explicit, frozen taxonomy. Adding a type ⇒ minor SOP version bump. |
| R4 | MCP exposure leaks `advance_phase` by mistake. | `.claude/anti-patterns.md` §11 codifies this; PR #5 reviewer must verify the exposed tool list. |

### Follow-up Observations to Capture

- After PR #2 merges, capture lock-write timing under simulated load (no real load yet — spike single-user).
- After PR #3 merges, sample 10 audit events and verify `obligation_audit_trail` activates correctly.
- After PR #4 merges, run the full DISCOVERY→REFLECT path on OCN itself (dogfood). Capture transcript.
- After PR #5 merges, exercise MCP with at least one external host (Claude Code, Cursor, or Cline). Confirm `advance_phase` is **not** in the tool list returned.

### Related Artifacts

- Locked plan: [`docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md`](./plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md)
- Dogfood report: [`../dogfood-report-skeleton-spike.md`](../dogfood-report-skeleton-spike.md)
- Implementation notes: [`../implementation-notes.md`](../implementation-notes.md)
- Code review todos: [`../todos/`](../todos/) (10 files, all P2/P3, none blocking)
- PR #1 merge commit: `a93d5a3`

---

<!-- Append future decisions below this line. Do NOT modify entries above. -->

## DEC-002｜Phase 2 Complete after MCP Safe Tools

**Date**: 2026-04-28
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Related artifact**: [`docs/reports/2026-04-28-phase2-completion-report.md`](./reports/2026-04-28-phase2-completion-report.md)

---

### Decision

OCN Phase 2 is complete after PR #6 (MCP Safe Tools — logical PR #5 of the Phase plan) is merged into `main`.

The next phase is **GA Prep Gap Review** — a documentation, packaging, and operational-readiness audit. GA Prep will not begin implementation work until its own scope decision is captured as a future DEC entry.

### Evidence

- **PR #1 (GitHub #1)** Skeleton Spike — merged `a93d5a3` at 2026-04-27T17:46:28Z.
- **PR #2 (GitHub #3)** State Safety Foundation — merged `3e4568a` at 2026-04-27T18:15:49Z. Closes L1, L10.
- **PR #3 (GitHub #4)** Audit + Event Foundation — merged `d6abc8b` at 2026-04-28T01:51:45Z. Closes L3.
- **PR #4 (GitHub #5)** Full State Machine + Gate + Advance — merged `5469090` at 2026-04-28T11:33:54Z. Closes L2, L6, L7, todo 012, todo 013 (field + advance flow).
- **PR #5 (GitHub #6)** MCP Safe Tools — merged `dbe3523` at 2026-04-28T15:58:09Z. Closes todo 011, OCN-PR5-001.
- CI on PR #6 merge commit: SUCCESS.
- Local re-verification on `main` after merge: lint clean, typecheck clean, **312 tests pass across 61 files**, **line coverage 83.88%**, branch coverage 84.61%, function coverage 90.40%.
- The 4-PR ordering required by DEC-001 ("State Safety → Audit → Full FSM → MCP") was respected.

### Completed Core Capabilities

- Local project initialization (`ocn init [--tier minimal]`)
- Status snapshot, next-step brief
- Step Artifact Gate per current step (`ocn check`, `ocn gate`)
- Forward-only state advancement (`ocn advance`) with gate-then-mutate semantics
- State safety: `.ocoding/.lock` + `state.json.bak` + temp-file write + atomic rename
- Audit dual persistence: `.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`
- `correlationId` threading across the entire `ocn advance` event chain (including lock events)
- MCP safe surface — 7 read/prepare/create/log tools over stdio transport
- 4 forbidden MCP tools never registered (registry test enforces)
- MCP success path produces zero `process.stderr.write` calls

### Still Not Included (deliberately out of Phase 2)

- `ocn doctor`, `ocn reset`, `ocn baseline`
- SOP versioning / upgrade tooling (`ocn sop {version,diff,upgrade --plan}`)
- Tier `production` / `full` artifact-set enforcement
- Mini-CRM dogfood (Tier 2 GA success criterion)
- npm publish (package name negotiation, release lane, CI pipeline)
- Remote MCP transport (HTTP / SSE), MCP auth, MCP session management
- MCP `advance_phase`, MCP `capture_decision`, MCP `reset_project`, MCP `force_release_lock` — **never to be exposed**

### Options Considered

| # | Option | Rejected because |
|---|--------|------------------|
| A | Mark Phase 2 complete and enter GA Prep Gap Review | (chosen) |
| B | Defer Phase 2 closure until mini-CRM dogfood is attempted | Mini-CRM is a GA success criterion (`docs/08-mvp-plan.md` §39.2), not a Phase 2 entry condition. Conflating the two would inflate Phase 2's exit bar. |
| C | Defer Phase 2 closure until `doctor` / `reset` / `baseline` ship | DEC-001 explicitly scoped these out of Phase 2. Reopening would violate the locked PR ordering. |
| D | Mark "Conditional Complete" pending an external MCP host smoke test | Local + CI verification + per-tool unit suites + the integration suite already cover the contract OCN owns. External-host validation belongs to GA Prep §8.10 / §8.12. |

### Final Choice

**Option A.** Phase 2 is complete; GA Prep Gap Review is the next planning artifact.

### Background

Phase 2 was scoped by DEC-001 with four ordered engineering PRs. Each PR's scope statement was honoured at merge time, and each PR's tests preserved the prior PR's invariants (notably the verbatim Skeleton Spike PRD blocked/pass invariant, which `tests/e2e/skeleton-spike-demo.test.ts` continues to verify after walking the state machine through three `ocn advance` calls).

The completion report at `docs/reports/2026-04-28-phase2-completion-report.md` records the per-PR detail, the resolved L / todo items, the open simplifications (L4, L5, L8, L9, L11–L14) tracked for Phase 3, and the GA Prep gap matrix.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R5 | GA Prep ambiguity — unclear which gaps in §8 of the completion report are GA-blocking vs nice-to-have. | Open a GA Prep planning artifact that prioritizes §8 gaps before any implementation begins. |
| R6 | Docs numbering divergence (OLD `docs/04-08` layout vs NEW SOP-profile expectation) silently breaks OCN-on-OCN dogfood. | GA Prep Gap Review must explicitly decide: renumber OCN's own docs OR ship a profile override. Track in `implementation-notes.md`. |
| R7 | Mini-CRM dogfood pulls forward implementation work that is not GA-blocking. | Hold dogfood behind a future DEC entry; do not start it during Gap Review. |
| R8 | Public expectation creep — Phase 2 closure is read as "ready to publish." | This DEC entry explicitly states GA Prep is the next phase, npm publish is not done, and external README polish is required. |

### Follow-up Observations to Capture

- During GA Prep, validate `docs/mcp-usage.md` against an external MCP host (e.g., Claude Desktop, Cursor, Cline). Record any host-specific friction.
- During GA Prep, audit the `projectRoot` argument validation across all 7 MCP tools for path-traversal safety.
- During GA Prep, decide whether to renumber OCN's own `docs/04-08` to match the new SOP profile or ship a profile override.
- During GA Prep, reconcile design-doc references to `docs/19-decision-log.md` (frozen `docs/00-08`, plans, `CLAUDE.md`, `.claude/rules.md`, `.claude/anti-patterns.md`, `implementation-notes.md`) with the new canonical path `docs/20-decision-log.md` adopted in this DEC. The single decision-log file was renamed `19 → 20` so DEC-001 and DEC-002 stay in one append-only source. Frozen design docs are not amended in this report; reconcile via a future amendment file (next AM-XXX in `docs/amendments/`).

### Related Artifacts

- Phase 2 Completion Report: [`docs/reports/2026-04-28-phase2-completion-report.md`](./reports/2026-04-28-phase2-completion-report.md)
- Implementation notes (full L / todo state): [`../implementation-notes.md`](../implementation-notes.md)
- DEC-001 (Phase 2 entry): see above in this file.
- PR #6 merge commit: `dbe3523`. PR URL: https://github.com/UncleTIM-GZ/O-CodingNavigation/pull/6.

---

## DEC-003｜Documentation Numbering Policy after SOP v1.1 Technical-Architecture Insertion

**Date**: 2026-04-28
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep PR A — docs numbering reconciliation + amendments index
**Related artifacts**: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./plans/2026-04-28-ga-prep-gap-review-plan.md) §3.2 + §6.1, [`docs/amendments/`](./amendments/)

---

### Context

SOP v1.1 inserts a new step — **Technical Architecture & Stack Decision** — between *Acceptance Criteria* and *Information Architecture*. Under SOP v1.1 the canonical 10-step DISCOVERY → PLAN doc map is therefore:

| # | Slot | Doc filename |
|---|------|---|
| 0 | Project Brief | `docs/00-project-brief.md` |
| 1 | Scope | `docs/01-scope.md` |
| 2 | PRD | `docs/02-prd.md` |
| 3 | Acceptance Criteria | `docs/03-acceptance-criteria.md` |
| **4** | **Technical Architecture & Stack Decision** | **`docs/04-technical-architecture.md`** |
| 5 | Information Architecture | `docs/05-information-architecture.md` |
| 6 | Data Model | `docs/06-data-model.md` |
| 7 | API Contract | `docs/07-api-contract.md` |
| 8 | Test Strategy | `docs/08-test-strategy.md` |
| 9 | MVP Plan | `docs/09-mvp-plan.md` |

OCN's own Phase 2 design documents predate SOP v1.1. They are committed to `main` under the *old* layout that has no Technical Architecture step:

| Path on `main` | Slot under OCN's historical layout |
|---|---|
| `docs/04-information-architecture.md` | IA |
| `docs/05-data-model.md` | Data Model |
| `docs/06-api-contract.md` | API Contract |
| `docs/07-test-strategy.md` | Test Strategy |
| `docs/08-mvp-plan.md` | MVP Plan |

The Phase 2 default OCN SOP profile (`sops/default-ai-coding-sop/0.1.0/`) ships the SOP v1.1 step map for *new* projects, so a freshly initialised project sees the new doc paths. Running `ocn check` inside the OCN repository itself today reports the v1.1 docs as missing, because OCN's own docs are at the old slots.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| **A** | Renumber OCN's historical `docs/04-08` to match SOP v1.1 (everything shifts by one). | High blast radius. Would invalidate every cross-reference in the historical PR descriptions, plan files, `CLAUDE.md`, `.claude/rules.md`, `.claude/anti-patterns.md`, `implementation-notes.md`, the four amendments-style follow-ups already queued, and the Skeleton Spike e2e test's docstrings. Loses the historical authenticity of the dogfood record. |
| **B** | Keep OCN's historical `docs/04-08` as-is and ship a **project-level profile override** (e.g. `.ocoding/sop-overrides.yaml` or equivalent) so the OCN project — and only the OCN project — runs against a profile that maps SOP v1.1 step IDs back to OCN's historical slot numbers. (chosen) | — |
| C | Defer the decision until later. | Leaves OCN-on-OCN dogfood broken indefinitely and blocks PR F (`examples/`) which depends on a coherent profile story. |

### Decision

**Adopt Option B — keep historical `docs/04-08` unchanged and use a profile override for the OCN repository.**

OCN's bundled default SOP profile continues to express the SOP v1.1 step map for *new* projects (i.e. external users get the new layout). The OCN repository itself is treated as a historical Phase-2 dogfood artifact and runs against an override that points step IDs at the historical slot paths.

This DEC is a **policy decision**, not an implementation decision. The override file format, location, and loader changes are deferred to a separate implementation PR after PR A merges. PR A only records the policy and the amendments-index entry; no `src/` change.

### Rationale

- Avoids large-scale historical reference drift across PRs, plans, frozen docs, and code comments.
- Preserves the authenticity of OCN's Phase-2 dogfood record (the docs were written under the old layout — that's history, not a defect).
- Restricts the divergence to a single override file confined to OCN's `.ocoding/` directory; new projects see the SOP v1.1 layout untouched.
- Lowest risk for GA Prep: the override touches one config surface, not the historical document tree.

### Consequences

- `docs/00-08` remain frozen at the old layout. They are *historical artifacts*, not the canonical SOP v1.1 doc map.
- New OCN projects (initialised via `ocn init`) get the SOP v1.1 doc layout from the bundled profile.
- The OCN repository itself ships a profile override (implementation deferred — out of scope for PR A) so `ocn check` inside the OCN repo reports against historical slots.
- `docs/amendments/README.md` — created in PR A — must list this divergence so future readers know the historical layout is intentional.
- A future PR (let's call it PR-A1) implements the override loader. It is **not** in scope for PR A; PR A is documentation-only.
- The README rewrite (PR B) must mention this divergence so external readers don't mistake the OCN repo's historical layout for the canonical SOP v1.1 layout.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R9 | Future maintainers forget the override exists and assume OCN's historical docs *are* the canonical layout. | `docs/amendments/README.md` indexes this DEC + the AM that records it. README (PR B) explains the override.  |
| R10 | The override file format diverges from the broader profile-versioning design. | Profile override format will be designed in a dedicated implementation PR after PR A; that PR is gated on its own DEC entry (deferred). |
| R11 | External users find an old example (e.g. an old plan file) referencing the historical layout and get confused about what their freshly-initialised project should look like. | Examples PR (PR F) builds against the SOP v1.1 layout; historical references are framed as historical. |

### Follow-up Observations

- Implementation PR for the override loader should be drafted only after PR A merges and PR B (README) clarifies the divergence to external readers.
- If the override mechanism turns out to be useful beyond OCN's own dogfood, it may become a general SOP-versioning feature later.

---

## DEC-004｜Frozen Design Docs Amendment Policy

**Date**: 2026-04-28
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep PR A — docs numbering reconciliation + amendments index
**Related artifacts**: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./plans/2026-04-28-ga-prep-gap-review-plan.md) §3.6 + §6.2, [`docs/amendments/`](./amendments/)

---

### Context

OCN's `docs/00-project-brief.md` through `docs/08-mvp-plan.md` were written during Phase 2 and treated as *frozen design contracts*. CLAUDE.md §10 explicitly says "do NOT edit `docs/00-08` once they are locked design contracts." But Phase 2 surfaced — and Phase 3 will surface more — places where the implementation reality diverges from the frozen design.

`docs/amendments/` was created in PR #4 (with AM-001, the audit storage path amendment) to reconcile such divergences without rewriting the frozen docs. The convention worked. But there is no codified rule for *when* to write an amendment vs *when* to fix the frozen doc directly.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | **Strict freeze**: `docs/00-08` are read-only. Every divergence — including typos and broken links — requires a new amendment file. | High friction for trivial fixes. Makes maintenance noisy and low-signal. Would generate dozens of single-line amendment files for typos. |
| **B** | **Pragmatic amendment**: small fixes (typos, broken links, obvious errors that don't change historical semantics) may edit the frozen doc directly. Anything that changes meaning, paths, schemas, or scope requires an amendment file. (chosen) | — |
| C | **Free edit**: anyone can rewrite frozen docs at any time. | Loses historical record. The dogfood narrative becomes unreviewable. Defeats the point of having a "design baseline". |

### Decision

**Adopt Option B — Pragmatic amendment.**

Small, semantically-neutral fixes may edit `docs/00-08` directly. Anything that changes the meaning, paths, contracts, or scope of a frozen doc requires a new amendment file in `docs/amendments/`.

### Allowed direct edits to `docs/00-08`

The following may be edited in-place without an amendment, provided the historical decision and its context are preserved:

- Typos / spelling corrections.
- Broken internal links (e.g. file moved, anchor renamed) that point to the new canonical location of the *same* artifact.
- Markdown formatting fixes (table alignment, fenced-code language tags, heading levels) that do not change the rendered meaning.
- Pure copy-edit improvements that don't alter what a section means (e.g. clarifying a sentence whose intent is already unambiguous from context).

### Required-amendment changes

The following **must** be recorded as a new amendment file under `docs/amendments/` rather than edited inline:

- Document slot numbering changes (e.g. PR #7's `19-` → `20-` decision-log path move).
- Canonical path changes (e.g. AM-001's `events/` → `audit/` move).
- Data model / schema changes — adding, renaming, or removing fields, enums, types.
- API contract changes — new commands, new exit codes, renamed flags, changed envelope shapes.
- SOP profile changes — new states, new steps, changed step ordering, new required sections.
- Storage layout changes — file paths, directory structure, lock semantics.
- Scope changes — adding or removing items from `docs/01-scope.md` § "must / must-not".
- Decisions that supersede earlier decisions in `docs/00-08` even if the path / schema is unchanged.

### Forbidden edits (regardless of size)

The following are **never** permitted, even as "small fixes":

- Large-scale rewrites of frozen design docs to make them appear as if they were always correct (i.e. rewriting history).
- Deletion of historical decision context (e.g. removing the rejected options from `docs/05-data-model.md` §3.2).
- Overwriting evidence of dogfood-period failures or constraints.
- Bulk find-and-replace operations across `docs/00-08` solely for cosmetic consistency (path moves are the canonical example — these go into amendments).

### Procedure for an amendment

1. Create `docs/amendments/<YYYY-MM-DD>-<short-slug>-amendment.md` following the format documented in `docs/amendments/README.md`.
2. The amendment file declares: ID (`AM-XXX`), Date, Status, Supersedes, Applies to, Decision, Impact, Migration note, References.
3. Update `docs/amendments/README.md` "Current amendments" index.
4. If the amendment requires a corresponding DEC entry (e.g. it implements a policy choice), capture the DEC in `docs/20-decision-log.md` first.
5. Frozen docs are NOT modified to add a "see amendment AM-XXX" pointer. The amendment index in `docs/amendments/README.md` is the single source of truth for active divergences.

### Rationale

- Strict freeze (Option A) makes typo fixes high-friction and noisy — the cure is worse than the disease.
- Free edit (Option C) destroys the historical record that makes OCN's dogfood credible.
- Pragmatic amendment (Option B) preserves history *where history matters* (semantic / structural decisions) and lets trivial fixes flow through normal commits.

### Consequences

- `docs/amendments/` becomes a long-term governance directory, not a one-off.
- `docs/amendments/README.md` is the live index of active divergences from `docs/00-08`.
- A reviewer evaluating any change to `docs/00-08` must apply the rule: *does this change the meaning, paths, schemas, or scope?* If yes → amendment. If no → direct edit OK.
- GA Prep PRs that touch frozen docs must include a self-check in their PR description: which edits are inline (with rationale) and which are amendments.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R12 | "Pragmatic" gets stretched into "free edit" over time. | Reviewers reject any inline edit to frozen docs that would qualify under "Required-amendment changes". The amendment list is short enough to be exhaustive. |
| R13 | Amendments accumulate without ever being consolidated, eventually obscuring the design intent. | A future re-baseline PR (post-GA, deliberate) may consolidate amendments back into a new edition of `docs/00-08`. Until then, `docs/amendments/` is canonical for divergences. |
| R14 | Two amendments contradict each other and the frozen docs. | The `Supersedes:` field of each amendment chains the divergence history. The amendments index must show the latest supersedes-each amendment. |

### Follow-up Observations

- During PR B (README), describe the amendment convention briefly so external readers know to look in `docs/amendments/` for active divergences.
- During PR E (npm publish gating), include `docs/amendments/` in the published package — it's part of the design baseline.

---

## DEC-005｜Defer External MCP Host Validation until a Real Host is Available

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep PR E — npm publish gating + CI stability audit (the same PR that records this deferral)
**Related artifacts**: [`docs/security/mcp-host-validation-checklist.md`](./security/mcp-host-validation-checklist.md), [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./plans/2026-04-28-ga-prep-gap-review-plan.md) §3.3, [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](./plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md)

---

### Context

GA Prep PR D was planned to validate the OCN MCP server against a real MCP host — Claude Desktop, Cursor, or Cline — and to produce `docs/reports/<DATE>-mcp-external-host-validation-report.md` based on raw host evidence.

PR C already delivered the prerequisite security work:

- MCP `projectRoot` validator (`src/core/security/project-root.ts`) — wired into all 7 allowed tool handlers.
- Path-containment helpers (`assertPathInsideRoot`, `assertResolvedPathInsideRoot`).
- First OCN threat model: [`docs/security/mcp-threat-model.md`](./security/mcp-threat-model.md).
- `docs/mcp-usage.md` safety boundaries section (§5a).

However, real host validation cannot be completed in the current session:

- **Claude Desktop is temporarily unavailable** on the maintainer's machine.
- **Cursor and Cline** have not been used to validate the OCN MCP server in this session.
- The maintainer's primary development environment is **WSL2 Linux**, where Claude Desktop has no official build.

Per the safety stance established when PR C merged, the project will not accept fabricated host validation, and will not relabel SDK self-smoke or CLI self-smoke as external host validation.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Block all GA Prep work until a real host is available | Stalls progress on packaging and CI hygiene that does not depend on host validation. Penalises the project for a temporary host-availability issue. |
| **B** | Defer PR D explicitly; continue with PR E (npm publish gating + CI stability audit) under a clearly-recorded host-compatibility caveat. (chosen) | — |
| C | Replace PR D with an SDK self-smoke or CLI self-smoke labelled as external host validation | Forbidden by the project's anti-fabrication rule. SDK self-smoke is useful but is not external host validation. |
| D | Skip host validation entirely and proceed to npm publish | Unacceptable. The project would ship with unverified host-compatibility claims. |

### Decision

**Adopt Option B.** PR D is deferred until at least one real MCP host is available for validation. PR D remains required before claiming external MCP host compatibility.

GA Prep continues to **PR E** — the npm publish gating + CI stability audit — under an explicit host-compatibility caveat that is reflected in:

1. The PR E planning artifact (`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md` §6).
2. Any future release notes drafted before PR D completes.
3. README / `docs/mcp-usage.md` if those documents need to make any host-compatibility statement before PR D completes.

### Non-goals

This decision does **NOT**:

- Mark PR D as complete.
- Replace external host validation with SDK self-smoke.
- Allow fabricated validation evidence.
- Allow release notes to claim Claude Desktop / Cursor / Cline compatibility.
- Modify the 7 allowed / 4 forbidden MCP tool surfaces.
- Modify any `src/` runtime behaviour.

### Constraints (active until PR D is completed)

- README / npm package metadata must **not** claim verified external MCP host compatibility.
- `docs/mcp-usage.md` may describe configuration as *intended usage*, but must clearly distinguish *verified* vs *not verified in PR D*.
- Any release checklist (alpha or otherwise) must include the line **"External MCP Host Validation pending."**
- PR D must be completed before any beta or GA claim of host compatibility.
- The MCP host validation checklist (`docs/security/mcp-host-validation-checklist.md`) is preserved on `main`. It is **not** a validation report.

### Follow-up

Create or preserve:

- ✅ `docs/security/mcp-host-validation-checklist.md` — preserved on `main` in the same PR that records this DEC.

Do **NOT** create:

- ❌ `docs/reports/<DATE>-mcp-external-host-validation-report.md` — only created from real host evidence, never from this DEC alone.

### Consequences

**Positive:**

- GA Prep can continue without fabricating evidence.
- npm publish planning can proceed with an honest compatibility caveat.
- The maintainer can complete PR D opportunistically when a host becomes available, without re-doing PR E.

**Negative:**

- MCP host compatibility remains unverified in tree.
- PR E must include a release-gating caveat that holds host-compatibility claims back until PR D completes.
- Any external user reading the README will see an explicit "host compatibility not verified" note until PR D lands.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R15 | PR D is forgotten as time passes; the caveat in README / mcp-usage.md becomes stale and is silently dropped during a later edit. | The PR E planning artifact records a "release checklist must include 'External MCP Host Validation pending'" rule. Reviewers reject any release PR that lacks the pending entry. |
| R16 | A future contributor reads the checklist and assumes it is the validation. | The checklist file's first line states explicitly that it is **not** a validation report and links back to this DEC. |
| R17 | An npm alpha publish proceeds without a clear caveat. | Forbidden by §6 of the PR E plan; the gating checklist requires an explicit "host validation pending" line in any release notes drafted before PR D completes. |

### Follow-up Observations

- When a real MCP host becomes available, run the checklist, paste the §9 evidence into the chat, and CC will produce `docs/reports/<DATE>-mcp-external-host-validation-report.md` and open PR D.
- After PR D merges, the host-compatibility caveats added in PR E should be revisited and removed where they're no longer accurate (this is a follow-up doc-edit, not a code change).
- If multiple hosts are validated, each gets its own evidence section in the same report; verdicts are per-host, never extrapolated.

### Related Artifacts

- Checklist: [`docs/security/mcp-host-validation-checklist.md`](./security/mcp-host-validation-checklist.md)
- Threat model: [`docs/security/mcp-threat-model.md`](./security/mcp-threat-model.md)
- GA Prep plan: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./plans/2026-04-28-ga-prep-gap-review-plan.md) §3.3
- PR E plan: [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](./plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md)
- Phase 2 Completion Report §6 + §8 row 4: [`docs/reports/2026-04-28-phase2-completion-report.md`](./reports/2026-04-28-phase2-completion-report.md)

---

## DEC-006｜npm Package Name Decision Workflow

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep DEC-006..010 capture PR
**Related artifacts**: [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](./plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md) §4.1

---

### Purpose

Define the *workflow* by which OCN's published npm package name is decided. **This DEC does NOT pick a name. It does NOT modify `package.json`.** The eventual choice is captured in a future amendment / DEC entry once the workflow has been executed.

### Context

`package.json` currently declares `name: "ocn"`. Whether `ocn` is available on the public npm registry is unknown; common short names are often taken. Choosing without checking risks (a) failing at publish time, or (b) discovering typo-squatting collisions after the fact.

The PR E plan §4.1 enumerated four candidate names (`ocn`, `o-coding-navigator`, `ocn-cli`, `@ocn/cli`) but explicitly deferred the choice. This DEC formalises the *order of operations*.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Decide the package name **now**, without checking npm availability. | Risks publish-time failure or post-hoc collision with an existing package. |
| **B** | **Run availability check first, then decide.** (chosen) | — |
| C | Default to a scoped package (`@ocn/cli` or similar). | Premature; an unscoped name may still be available. Scoping is a fallback if step B reveals collisions. |
| D | Defer all package naming until immediately before publish. | Combines all decisions into the publish PR; raises blast radius and hides the risk early. |

### Decision

**Adopt Option B — Availability-first workflow.**

1. **Do not mutate `package.json` in this PR.**
2. Before any package name is finalised, run npm availability checks in a future dedicated PR or local validation step. The check must use a safe read-only command (e.g. `npm view <name> name version` — does not modify state).
3. Candidate names must be evaluated against:
   - **npm availability** (does the name exist?)
   - **typo-squatting risk** (is there a near-identical package that could be confused?)
   - **clarity** (does the name communicate what the tool does?)
   - **alignment with the repo name** (`O-CodingNavigation` → does the package name read as a logical short form?)
   - **command/bin expectations** (the CLI is `ocn`; the package name should make `npm install -g <pkg>` produce the `ocn` and `ocn-mcp` bins without surprise).
4. If the preferred name is unavailable, choose a scoped package (`@ocn/cli`) or an alternate name (`o-coding-navigator`, `ocn-cli`, etc.) through a follow-up DEC amendment.

### Consequences

- **Slower than immediate `package.json` edit.** Acceptable — alpha is not on a deadline.
- **Avoids planning a publish around an unavailable name.**
- **Keeps current repo untouched** until a focused package-metadata PR.
- The result of the availability check (raw `npm view` output, date, candidate evaluations) must be recorded in the future package-metadata PR description so the choice is auditable.

### Follow-up

- Future PR runs `npm view <candidate> name version` (or equivalent) for each candidate; records output verbatim in the PR description.
- Future PR may create a DEC amendment if name availability changes after publish.
- The choice does NOT block any other GA Prep work — DEC-007 (semver lane) can land independently.

---

## DEC-007｜First Semver Lane

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep DEC-006..010 capture PR
**Related artifacts**: [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](./plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md) §4.2; [DEC-005](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)

---

### Purpose

Decide the first release lane (semver tag) for OCN if and when publishing proceeds. **This DEC does NOT publish, does NOT modify `package.json`, and does NOT modify `version`.**

### Context

`package.json` currently declares `version: "0.0.1-alpha.0"` — a pre-spike placeholder. Phase 2 closure (DEC-002) and the GA Prep work to date are a meaningful milestone but not GA. The PR E plan §4.2 enumerated three candidate lanes: stay at `0.0.1-alpha.x`, jump to `0.1.0-alpha.0`, or `1.0.0-alpha.0`. This DEC chooses among them.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | `1.0.0-alpha.0` | Implies GA-quality core; raises expectations the project cannot honour while PR D is deferred. |
| **B** | `0.1.0-alpha.0` (chosen) | — |
| C | `0.1.0-beta.0` | Beta requires PR D + cross-platform CI matrix + mini-CRM dogfood per the GA Prep plan. None of those are ready. |
| D | No version decision (stay at `0.0.1-alpha.0`) | Allows publishing under a number that disagrees with the maturity claim ("Phase 2 complete" is bigger than "0.0.1"). |

### Decision

**Adopt Option B.**

- The first published OCN package, if publishing proceeds, uses **`0.1.0-alpha.0`**.
- **Do NOT use `1.0.0`** before PR D, examples execution (PR F3), and npm package gating (DEC-009 + `prepublishOnly`) are all complete.
- Alpha release notes MUST include the verbatim line:

  > External MCP Host Validation pending.

- Alpha release notes MUST NOT claim verified Claude Desktop / Cursor / Cline compatibility (per [DEC-005](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)).

### Consequences

- **Honest maturity signal.** `0.1.0-alpha.0` says "this is real, not a spike, but pre-1.0".
- **Allows early package smoke** without over-claiming GA readiness.
- **Requires a clear README and npm metadata caveat** to keep the maturity statement consistent across surfaces.
- The version bump from `0.0.1-alpha.0` to `0.1.0-alpha.0` is a `package.json` edit; that edit lands in the future package-metadata PR, not here.

### Follow-up

- Future package-metadata PR sets `version` to `0.1.0-alpha.0`.
- Beta transition requires PR D completion or an explicit DEC amendment that reduces the beta gate.
- GA (`1.0.0`) requires: PR D complete, cross-platform CI matrix per a future DEC amending DEC-010, examples PR F3 complete, mini-CRM dogfood (or its replacement) decided.

---

## DEC-008｜Publish Alpha Before PR D Completion?

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep DEC-006..010 capture PR
**Related artifacts**: [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](./plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md) §4.3; [DEC-005](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available); [DEC-007](#dec-007first-semver-lane)

---

### Purpose

Decide whether an npm alpha can be **planned** while External MCP Host Validation (PR D) remains deferred.

### Context

DEC-005 deferred PR D until a real MCP host is available. The PR E plan §4.3 enumerated two paths: yes-with-caveat, or no-block-until-PR-D. This DEC chooses among them.

The choice has a propagation effect: if alpha can proceed, every release-related document (release notes, README, npm description, blog post, tweet) must carry a host-compatibility caveat until PR D lands.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Block all npm planning until PR D completes. | Creates an indefinite hold on GA Prep that's tied to host availability — a non-engineering blocker. The 394-test suite + projectRoot validator + threat model are a defensible alpha bar without host validation. |
| **B** | Allow alpha planning, but forbid host-compatibility claims. (chosen) | — |
| C | Allow alpha publish AND host-compatibility claims based on tests alone. | Forbidden — this is exactly the fabrication that DEC-005 prohibits. |
| D | Defer npm entirely. | Same drawback as A; also closes off the package-readiness work that DEC-006/009 are about to enable. |

### Decision

**Adopt Option B.**

- **Alpha publish *planning* may continue before PR D completes.**
- **Actual `npm publish` still requires a focused package-gating PR + explicit maintainer approval.** This DEC does not authorise a publish.
- Any alpha release MUST clearly include the verbatim line:

  > External MCP Host Validation pending.

- Alpha may describe the OCN MCP server as *implemented*, but must NOT claim *verified host compatibility* until PR D completes.
- Beta and GA host-compatibility claims require PR D completion. No exceptions.

### Consequences

- **Keeps GA Prep moving** despite the host-availability blocker.
- **Maintains honesty** about which guarantees are tested vs unverified.
- **Requires caveat propagation** across README, `docs/mcp-usage.md`, npm metadata (`description`, `keywords`), and any future release notes. Reviewers must reject release-related changes that drop the caveat before PR D lands.

### Follow-up

- Any future release-notes PR must include the DEC-005 caveat verbatim.
- PR D remains required before any compatibility claim is added.
- After PR D merges, a follow-up doc-edit revisits each instance of the caveat and removes it where the evidence now exists.

---

## DEC-009｜Package Contents Policy

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep DEC-006..010 capture PR
**Related artifacts**: [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](./plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md) §4.4 + §5.2; [`docs/reports/2026-04-29-ci-stability-audit.md`](./reports/2026-04-29-ci-stability-audit.md) §10 finding F-6

---

### Purpose

Define the npm package contents policy that a future package-metadata PR must implement. **This DEC does NOT mutate `package.json` and does NOT run `npm pack`.**

### Context

`package.json` currently declares `files: ["dist", "LICENSE", "README.md"]`. The CI Stability Audit §10 (finding F-6) flagged this allowlist as narrow — the published tarball would not include user-facing docs (`docs/quickstart.md`, `docs/mcp-usage.md`) that the README references. The PR E plan §4.4 left the choice between an allowlist (`files`) and a blocklist (`.npmignore`) for this DEC.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Publish everything by default (no `files`, no `.npmignore`). | Default-allow leaks `tests/`, `todos/`, `coverage/`, `.github/` etc. into the tarball. Unsafe. |
| B | Use `.npmignore` (blocklist). | Default-allow with opt-out. New files default to "shipped"; one missed entry leaks. Worse for audit. |
| **C** | **Use `package.json` `files` field (allowlist).** (chosen) | — |
| D | Defer contents policy. | Blocks DEC-007's path to publish; not viable. |

### Decision

**Adopt Option C — explicit `files` allowlist.**

The future package-metadata PR sets `package.json` `files` such that the tarball includes (provisionally — exact list refined when `npm pack --dry-run` is run):

| Include | Reason |
|---|---|
| `dist/` | The built CLI + MCP — the runtime users install. |
| `README.md` | First-touch documentation; npm pages render this. |
| `LICENSE` | Required for redistribution. |
| `package.json` | npm includes this automatically; listed for completeness. |
| `docs/quickstart.md` | The README links to it; users following install steps need it. |
| `docs/mcp-usage.md` | Defines the MCP safety boundary; users wiring `ocn-mcp` need it. |

| Exclude | Reason |
|---|---|
| `tests/` | Internal test code; not a runtime artifact. |
| `todos/` | Internal task tracker. |
| `docs/plans/` | Internal planning artifacts; large; not user-facing. |
| `docs/reports/` | Internal audit reports; large; not user-facing. |
| `docs/amendments/` | Internal governance; not user-facing. *Decision: ship the index README only if a future amendment specifically asks for it.* |
| `docs/20-decision-log.md` | Internal governance. *Decision: do not ship in alpha; revisit at beta.* |
| `docs/00-08*.md` | Frozen design docs; large; primarily a project archive. |
| `docs/security/` | Internal threat model + checklist; not a user dependency. |
| Local `.ocoding/` | Per-project state; should never be in the package. |
| `.env`, secrets, private keys | Forbidden categorically. |
| Source `src/`, configs (`tsconfig*.json`, `eslint.config.*`, `.husky/`) | Not needed at runtime. |
| Coverage outputs, build cache | Not needed at runtime. |

The exact list is **not** implemented in this PR. The eventual `files` value MUST be reconciled against `npm pack --dry-run` output before any publish.

### Consequences

- **Safer publish surface** — default-deny.
- **Requires `npm pack --dry-run` review** before any actual publish.
- **May need explicit inclusion** of additional user-facing docs as the project grows.
- The `files` list is itself a versioned decision; any future change to ship additional artifacts requires a doc note (commit message is sufficient — no DEC unless it's a structural shift).

### Follow-up

- Future package-metadata PR runs `npm pack --dry-run` and records the tarball contents in the PR description.
- Future package-metadata PR decides whether `docs/amendments/README.md` ships in alpha (recommendation: ship the README only, not individual amendment files).
- Future package-metadata PR decides whether `examples/` ships in alpha (per [DEC-012 in PR F plan](./plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md) — currently deferred).

---

## DEC-010｜CI Matrix Policy

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep DEC-006..010 capture PR
**Related artifacts**: [`docs/reports/2026-04-29-ci-stability-audit.md`](./reports/2026-04-29-ci-stability-audit.md) §8 + §12; [`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`](./plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md) §4.5

---

### Purpose

Decide the CI matrix policy for v0.1.0-alpha based on the CI Stability Audit. **This DEC does NOT modify `.github/workflows/ci.yml`.**

### Context

The current CI workflow runs a single cell: `ubuntu-latest` + Node 20 + `npm ci`. The CI Stability Audit (`docs/reports/2026-04-29-ci-stability-audit.md`) reports:

- 18/20 recent runs SUCCESS (90% overall pass rate).
- PR-runs: 10/10 SUCCESS (100%).
- Push-to-`main` runs: 8/10 SUCCESS (80%) — two flakes at `Test with coverage`, both on commits that had passed in their PR runs (PR #8 merge `598b63c`, PR #10 merge `114db5e`).
- CI runtime: ~1 minute end-to-end. Well under the 10-minute timeout.
- The cross-platform path code (`src/core/security/project-root.ts`, PR C) is exercised by the test suite on Linux; no surface today is platform-specific.

The audit recommended **Option A — keep single-cell for alpha; expand at beta.**

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| **A** | **Keep `ubuntu-latest` + Node 20 only for alpha. Expand the matrix at beta.** (chosen) | — |
| B | Add `ubuntu` + `macOS` + `Windows` × Node 20/22 (and possibly 24) before alpha. | ~6× CI minutes per PR. Premature; no signal that other cells are needed. Adding `engines.node` coverage commits the project to fix Node-22-only failures, which is harder to justify when there are zero today. |
| C | Add Node 20 + 22 (Ubuntu only) now; OS matrix at beta. | Modest middle path; reasonable but not justified by current evidence. Available as a quick amendment later. |
| D | Do nothing and avoid deciding. | Leaves DEC-010 open; blocks closing the GA Prep audit loop. |

### Decision

**Adopt Option A.**

- Keep the current CI cell (`ubuntu-latest` + Node 20) for v0.1.0-alpha.
- **Do NOT change the workflow** in this DEC-only PR. (Workflow edits, if any, land in a focused future PR.)
- Add a broader matrix **before beta**:
  - Add Node 22 cell (Ubuntu only).
  - Consider adding macOS-latest + Windows-latest cells before beta or before GA.
- **Flake response**: if a third push-to-main `Test with coverage` flake appears in the next 5–10 merges, investigate via `gh run view <id> --log`, identify the failing test, quarantine it, and capture the diagnosis as an addendum to this DEC.

### Evidence

- [`docs/reports/2026-04-29-ci-stability-audit.md`](./reports/2026-04-29-ci-stability-audit.md) — full audit.
- PR-runs were stable across PR #8 → PR #14 (10/10 SUCCESS).
- Push-to-main had 2 coverage-step flakes (PR #8, PR #10 merge commits), but the immediate-next push-to-main run on a different commit ran green.
- The current `main` push run (`25088357806`) is green at `2026-04-29T02:45:32Z`.
- CI is fast enough (~1 minute) for alpha iteration; expansion has measurable cost.

### Consequences

- **Faster alpha iteration.** No matrix tax.
- **Less cross-platform assurance** before alpha. Honestly disclosed in README via the DEC-008 caveat path.
- **Beta becomes the cross-platform hardening gate.** This is consistent with DEC-007's gating: 1.0.0 requires DEC-010 amendment + matrix expansion + PR D + examples + dogfood.

### Follow-up

- Future CI PR may add Node 22 cell (no DEC required if scope is "add Node 22"; just a workflow edit).
- Future beta PR adds OS matrix; that change ships alongside an amendment to this DEC if scope expands beyond Node-version coverage.
- If the F-2 flake recurs, investigate before adding more matrix cells. **Do not mask flake by widening the matrix.**

---

## Cross-cutting note: scope of DEC-006..010

These five DECs together formalise the publishing and CI policy stack that PR E §4 + the CI Stability Audit identified. **None of them publishes, mutates `package.json`, modifies `.github/workflows/`, or alters runtime behaviour.** Every implementation step gated by these DECs lands in its own focused PR after this DEC capture merges.

The DEC-005 caveat ("External MCP Host Validation pending") propagates into DEC-007 and DEC-008 by design. Until PR D completes, every release-related artifact must carry that caveat.
