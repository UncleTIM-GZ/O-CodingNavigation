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
| DEC-011 | 2026-04-29 | Lock npm package name to `o-coding-navigation` | ✅ Approved |
| DEC-012 | 2026-04-29 | Authorise separate npm alpha publish PR (with mandatory pre-publish checks) | ✅ Approved |
| DEC-013 | 2026-04-29 | Quarantine audit-markdown concurrent first-write flake from publish gate | ✅ Approved |
| DEC-014 | 2026-04-30 | Restore audit-markdown concurrency test to default gate (race fixed via writeFile-to-tmp + atomic `fs.link`) | ✅ Approved |
| DEC-015 | 2026-04-30 | Authorise `0.1.0-alpha.1` patch publish (ships DEC-014 fix to npm alpha users) | ✅ Approved |
| DEC-016 | 2026-04-30 | Authorise future `0.1.0-alpha.2` P1 fix train publish (ships P1-001/002/003/004 to npm alpha users) | ✅ Approved |

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

---

## DEC-011｜Lock npm Package Name to `o-coding-navigation`

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep package-name-lock DEC-only PR
**Related artifacts**:
- [DEC-006 — npm package name decision workflow](#dec-006npm-package-name-decision-workflow)
- [`docs/reports/2026-04-29-npm-name-availability-audit.md`](./reports/2026-04-29-npm-name-availability-audit.md) — npm CLI evidence underlying this lock
- [DEC-005 — External MCP Host Validation pending](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)
- [DEC-007 — First semver lane `0.1.0-alpha.0`](#dec-007first-semver-lane)
- [DEC-009 — Package contents policy (`files` allowlist)](#dec-009package-contents-policy)

---

### Context

[DEC-006](#dec-006npm-package-name-decision-workflow) established an availability-first workflow for choosing the npm package name. The npm name availability audit at [`docs/reports/2026-04-29-npm-name-availability-audit.md`](./reports/2026-04-29-npm-name-availability-audit.md) checked ten candidate names with real `npm view` commands on 2026-04-29.

Audit findings:

- **`ocn`** — already exists on the public npm registry. Belongs to an unrelated project: "Server for flexible communication over the Open Charging Network" (electric-vehicle charging infrastructure). Cannot be reused.
- **`o-coding-navigation`** — returned `not_found` (E404). Potentially available at audit time.
- **`@uncletim/ocn`**, **`@uncletim/o-coding-navigation`**, **`@uncletim/ocoding-navigation`** — returned `not_found` for the package itself, but **scope ownership was not verified** in the audit. An E404 on a scoped lookup proves only that no package exists at the exact scoped path; it does NOT prove the maintainer can publish under `@uncletim`.
- The remaining unscoped candidates (`ocoding-navigation`, `ocodingnavigator`, `o-codingnavigator`, `ocn-cli`, `ocn-tools`) all returned `not_found`.

The maintainer chooses the **unscoped primary recommendation** to avoid scope-ownership uncertainty and to keep the package name aligned with the repository name `O-CodingNavigation`.

### Decision

Lock the npm package name to:

```
o-coding-navigation
```

This decision authorises future package-metadata planning to use `o-coding-navigation` as the intended package name.

This decision **does NOT**:

- mutate `package.json` (the `name` field stays at `"ocn"` until a separate package-metadata PR);
- publish to npm;
- reserve the package name on npm (no `npm publish` is run; no name reservation API exists for unscoped packages);
- alter the CLI bin names (`ocn` and `ocn-mcp` remain the binary names exposed by `bin` once the package metadata is updated).

The future package-metadata PR must still:

- update `package.json` explicitly (under its own commit, separate from this DEC);
- run `npm pack --dry-run` and record the tarball contents in the PR description;
- verify that no package with the same name appeared on npm between the audit date and that PR's publish step (re-run the `npm view` check immediately before any actual publish);
- preserve the [DEC-005](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) caveat in any release notes drafted under PR E gating;
- avoid external MCP host compatibility claims until PR D completes.

### Options Considered

#### Option A — `ocn`

**Rejected.** The audit found an existing unrelated npm package named `ocn`. Reusing the name would conflict with that package and is not technically possible without the existing maintainer transferring ownership.

#### Option B — `o-coding-navigation` *(adopted)*

**Accepted.** It is potentially available according to the audit (E404). It matches the repository name `O-CodingNavigation` (lower-cased, hyphenated). It avoids scope ownership uncertainty. It is clearer than abbreviated alternatives such as `ocn-cli` or `ocodingnavigator`.

#### Option C — `@uncletim/ocn`

**Rejected for now.** The name may be cleaner aesthetically and would isolate from the unrelated `ocn` package, but scope ownership and publish permission for `@uncletim` were not verified in the audit. Adopting this option would require the maintainer to first run `npm whoami` + `npm org ls @uncletim` and confirm publish access — a step that has not happened. Re-considering this option later (under a future DEC amendment) is allowed if the maintainer chooses to verify the scope; this DEC does not foreclose that path.

#### Option D — Defer the decision again

**Rejected.** Package-metadata planning needs a concrete package-name target before any future `package.json` mutation. Continuing to defer would block PR E §5.1 follow-ups (the `package.json` field audit), `prepublishOnly` work, and any clean-machine smoke planning.

### Consequences

**Positive:**

- Package-metadata PR can proceed with a concrete target (`o-coding-navigation`).
- Avoids the unrelated existing `ocn` package and the user confusion that would follow.
- Avoids scoped-publish permission uncertainty.
- Keeps the package name aligned with repository branding (`O-CodingNavigation` → `o-coding-navigation`).
- The CLI command `ocn` is unaffected — `npm install -g o-coding-navigation` still produces `/usr/local/bin/ocn` (and `/usr/local/bin/ocn-mcp`) because the `bin` field in `package.json` controls binary names, not the package name.

**Negative:**

- Longer package name than `ocn` — more typing in `npm install` commands.
- Users may still expect the CLI command to be `ocn`. Documentation must clearly distinguish package name (`o-coding-navigation`) from CLI command name (`ocn`). README §4 should make this distinction explicit when the package-metadata PR lands.
- The package name is **not reserved** until actual `npm publish`. Between this DEC and the first publish, someone else could claim `o-coding-navigation` on npm. The mitigation is to re-run `npm view o-coding-navigation` immediately before any future publish; if it has been claimed, this DEC is amended and a new name is chosen via the same workflow.

### Follow-up

Future package-metadata PR may update `package.json` to:

- `name: "o-coding-navigation"` (per this DEC).
- `version: "0.1.0-alpha.0"` (per [DEC-007](#dec-007first-semver-lane)).
- `bin` entries preserved, likely as `{ "ocn": "dist/cli/index.js", "ocn-mcp": "dist/mcp/index.js" }`. The bin keys are independent of the package name.
- `files` allowlist refined per [DEC-009](#dec-009package-contents-policy) — at minimum: `dist`, `README.md`, `LICENSE`, `package.json`, `docs/quickstart.md`, `docs/mcp-usage.md`. Final list verified against `npm pack --dry-run`.
- `prepublishOnly` script per PR E plan §5.5: `npm run lint && npm run typecheck && npm run test:coverage && npm run build`.
- `repository`, `homepage`, `bugs`, `keywords` fields per PR E plan §5.6.

Before any actual `npm publish`:

- Re-run `npm view o-coding-navigation` to confirm the name is still available immediately before publish; if it has been claimed, amend this DEC and pick a new name via the DEC-006 workflow.
- Run `npm pack --dry-run` and record the tarball contents.
- Confirm `npm whoami` returns the expected publishing identity.
- Confirm release notes include the verbatim line: **"External MCP Host Validation pending."** (per DEC-005 / DEC-008).
- Confirm no claim of verified Claude Desktop / Cursor / Cline compatibility appears anywhere in the published tarball or in the release notes (per DEC-005).

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R18 | Name is claimed by someone else between this DEC and the first publish. | Re-run `npm view o-coding-navigation` immediately before any publish. If claimed, amend this DEC; pick a new name via DEC-006 workflow; restart the package-metadata PR. |
| R19 | Users type `npm install -g ocn` from memory and end up with the unrelated EV-charging package. | The README's install section (PR B) and any future package-metadata PR must show `npm install -g o-coding-navigation` prominently. Quickstart already uses absolute paths via `git clone + npm link`, so this risk only applies after npm publish. |
| R20 | The longer package name is mistaken for a typo by a casual reader. | The README and the npm `description` field can include both forms ("OCN — local-first AI coding workflow OS, published as `o-coding-navigation`") to bridge brand vs package-name. |

---

### Cross-cutting note: scope of DEC-011

DEC-011 locks the *target* name. It is a precondition for the future package-metadata PR but is **not** that PR. The package-metadata PR is the first time `package.json` is mutated under GA Prep and requires its own explicit authorisation; this DEC is necessary but not sufficient for that PR to proceed.

---

## DEC-012｜Authorise Separate npm Alpha Publish PR

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep npm-publish-authorisation DEC-only PR
**Related artifacts**:
- [DEC-005 — External MCP Host Validation pending](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)
- [DEC-007 — First semver lane (`0.1.0-alpha.0`)](#dec-007first-semver-lane)
- [DEC-008 — Alpha publish may be planned before PR D](#dec-008publish-alpha-before-pr-d-completion)
- [DEC-009 — Package contents policy](#dec-009package-contents-policy)
- [DEC-011 — Lock npm package name](#dec-011lock-npm-package-name-to-o-coding-navigation)
- [`docs/reports/2026-04-29-package-metadata-audit.md`](./reports/2026-04-29-package-metadata-audit.md)

---

### Context

[DEC-007](#dec-007first-semver-lane) selected `0.1.0-alpha.0` as the first semver lane. [DEC-008](#dec-008publish-alpha-before-pr-d-completion) allowed alpha *publish planning* before PR D completes, but forbids any external MCP host compatibility claim until PR D is completed. [DEC-009](#dec-009package-contents-policy) selected an explicit package `files` allowlist. [DEC-011](#dec-011lock-npm-package-name-to-o-coding-navigation) locked the npm package name to `o-coding-navigation`.

The package-metadata PR (PR #18, merged) prepared `package.json` for alpha publishing:

- `name: "o-coding-navigation"`
- `version: "0.1.0-alpha.0"`
- `bin: { "ocn", "ocn-mcp" }`
- `prepublishOnly: "npm run lint && npm run typecheck && npm run test:coverage && npm run build"`
- `files: ["dist", "LICENSE", "README.md", "docs/quickstart.md", "docs/mcp-usage.md"]`
- `repository`, `bugs`, `homepage`, `keywords`

The package-metadata audit ([`docs/reports/2026-04-29-package-metadata-audit.md`](./reports/2026-04-29-package-metadata-audit.md)) recorded `npm pack --dry-run` evidence and confirmed the tarball excludes `tests/`, `todos/`, `.ocoding/`, secrets, `docs/plans/`, `docs/reports/`, `docs/amendments/`, `docs/00-08*`, `docs/security/`, `docs/20-decision-log.md`, `src/`, `node_modules/`, and configuration files.

External MCP Host Validation is still pending (DEC-005). DEC-008 permits an alpha publish under that condition only with the verbatim caveat propagated.

### Decision

**Authorise a future, separate npm alpha publish PR.**

The future publish PR may execute:

```bash
npm publish --tag alpha
```

…**only if all pre-publish checks below pass immediately before the publish command runs**.

This DEC explicitly does **NOT**:

- execute `npm publish`;
- create a git tag;
- create a GitHub release;
- mutate `package.json` or `package-lock.json`;
- modify the README install command;
- allow any claim of verified Claude Desktop / Cursor / Cline compatibility (DEC-005 caveat persists).

Any release-related output drafted under this authorisation **MUST** include the verbatim line:

> External MCP Host Validation pending.

### Required pre-publish checks for the future publish PR

The future publish PR is required to perform and record each of the following, in order, before invoking `npm publish`:

1. **Working-tree clean.**
   ```bash
   git status
   ```
2. **Sync to latest main.**
   ```bash
   git checkout main && git pull
   ```
3. **Confirm package name** (must equal `o-coding-navigation`):
   ```bash
   node -p "require('./package.json').name"
   ```
4. **Confirm package version** (must equal `0.1.0-alpha.0`):
   ```bash
   node -p "require('./package.json').version"
   ```
5. **Re-run npm name availability check** (defends against R18 — name claimed since DEC-011):
   ```bash
   npm view o-coding-navigation name version description repository --json
   ```
6. **Stop if step 5 returns package metadata** (i.e. the name now exists). Do NOT publish. Open a name-conflict resolution PR (amendment to DEC-011, new candidate via DEC-006 workflow).
7. **Run the full local gate stack:**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run test:coverage
   npm run build
   ```
   Any failure halts the publish.
8. **Confirm tarball shape:**
   ```bash
   npm pack --dry-run
   ```
   The output must match the DEC-009 allowlist (verified by file-by-file comparison against the known-good list in [`docs/reports/2026-04-29-package-metadata-audit.md`](./reports/2026-04-29-package-metadata-audit.md) §7).
9. **Confirm tarball does NOT contain forbidden paths** (per DEC-009 + audit §8): `tests/`, `todos/`, `.ocoding/`, secrets, `.env`, `docs/plans/`, `docs/reports/`, `docs/amendments/`, `docs/00-08*`, `docs/security/`, `docs/20-decision-log.md`, `src/`, `node_modules/`, `.git/`, `.github/`, `.husky/`, `coverage/`, `tsconfig*.json`, `eslint.config.*`, `vitest.config.*`.
10. **Confirm npm identity** (must be the maintainer's account):
    ```bash
    npm whoami
    ```
11. **Confirm registry URL** (must be the public npm registry):
    ```bash
    npm config get registry
    ```
    Expected: `https://registry.npmjs.org/`. If a private registry is configured, abort.
12. **Execute publish** (only after every check above passes):
    ```bash
    npm publish --tag alpha
    ```
    The `--tag alpha` flag prevents `npm install <package>` from defaulting to this version; users must explicitly opt in via `npm install <package>@alpha`. This is the safe default for pre-1.0 publishes.

The publish PR's body must include the verbatim output of the `npm publish` command, the npm-registry URL of the published package, and the pre-publish check results.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Do not authorise publish until PR D completes | DEC-008 already allowed alpha planning to proceed before PR D completes, on the condition that caveats are explicit and host-compatibility claims are forbidden. Re-deferring publish indefinitely would contradict that decision and stall the package-distribution validation that alpha publish exists to support. |
| **B** | Authorise a separate alpha publish PR with hard caveats (chosen) | — |
| C | Publish directly from this DEC PR | A decision PR should not also perform an irreversible package registry mutation. Once published, names and versions cannot be reused. Coupling the decision and the action concentrates blast radius. |
| D | Wait for beta | Alpha publish is useful precisely for validating package installation, bin wiring (`ocn`, `ocn-mcp`), `files` allowlist correctness, and tarball contents in a real `npm install -g` flow. Delaying to beta loses this validation step. |

### Decision

**Adopt Option B.** A future, separate npm alpha publish PR is authorised, subject to the pre-publish checks above and the DEC-005 caveat.

### Consequences

**Positive:**

- Publish becomes a separate, auditable unit — easy to review, easy to revert (within npm's 72-hour unpublish window for new versions, anyway).
- The npm registry mutation is isolated from the package-metadata preparation.
- Alpha users can `npm install -g o-coding-navigation@alpha` once the publish PR completes — testing the real install path, the bin wiring, and the tarball contents in a clean machine context.
- The project validates package distribution without over-claiming host compatibility.
- The `--tag alpha` flag means users on `npm install -g o-coding-navigation` (no `@alpha`) do **not** install this version. Only opt-in users do. This is the right gate for a pre-1.0 publish.

**Negative:**

- The npm package becomes public the moment the publish PR runs `npm publish`. Once published, the version cannot be republished (npm forbids re-publishing the same version after unpublish in most cases).
- Package name reservation only happens at the publish moment. R18 from DEC-011 (name claimed by someone else between DEC and publish) is mitigated by the step-5 re-check above; not eliminated.
- Any mistake in package metadata at publish time requires a follow-up version (e.g. `0.1.0-alpha.1`) or, in serious cases, a deprecation notice.
- PR D remains required before any host-compatibility claim. The alpha is honest about this; downstream documentation must remain so.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R21 | Step-5 re-check passes, but the name is claimed in the seconds between the check and `npm publish`. | The window is narrow (seconds) and the npm registry's first-write-wins semantics mean the worst case is a clean `npm publish` failure with a 403; the publish PR captures that error and amends DEC-011. |
| R22 | The future publish PR forgets the `--tag alpha` flag and publishes as `latest`, surfacing the alpha to all users. | The publish PR's pre-publish checklist must verify the exact `npm publish` command before running. Reviewers reject any publish PR that lacks `--tag alpha` until DEC-007 is amended to authorise a non-tagged publish. |
| R23 | Maintainer's npm account is configured against a non-public registry (corporate, self-hosted), causing the publish to land somewhere unintended. | Step 11's `npm config get registry` check catches this. The publish PR aborts if the registry is not `https://registry.npmjs.org/`. |
| R24 | Forgetting the DEC-005 caveat in release-related text. | Step 12's PR body requirement (verbatim publish output + caveat) is a checklist line; reviewers reject any publish PR that omits the caveat. |

### Follow-up

The future npm publish PR must:

- Record all required pre-publish checks (steps 1–11 above).
- Include the verbatim `npm publish --tag alpha` output in the PR description.
- Include the published package's npm-registry URL.
- Include the verbatim caveat: *External MCP Host Validation pending.*
- Avoid creating a GitHub release unless separately authorised (a release is a separate decision; current DEC does not authorise it).
- Avoid creating a git tag unless separately authorised (tags are a separate decision; current DEC does not authorise them).

After the publish succeeds, a separate documentation PR may:

- Update the README install instructions from `git clone … && npm link` to `npm install -g o-coding-navigation@alpha` (for alpha users) and add a sentence explaining `--tag alpha`.
- Update `docs/quickstart.md` to reference the published install path.
- Add an npm package badge (`https://img.shields.io/npm/v/o-coding-navigation?label=npm`) to the README header if desired.
- This documentation PR is **NOT** authorised by DEC-012. It requires its own review (no DEC needed if it is purely doc, but reviewers must verify the DEC-005 caveat is preserved).

After PR D completes (whenever a real MCP host becomes available), a follow-up doc edit revisits each instance of the DEC-005 caveat and removes it where the evidence now exists.

---

### Cross-cutting note: scope of DEC-012

DEC-012 authorises the *publish action*. It does **NOT** authorise:

- Creating a git tag (`v0.1.0-alpha.0` or any other shape).
- Creating a GitHub release.
- Updating README install commands (which would imply the publish has already happened).
- Removing the DEC-005 caveat from any artifact.
- Publishing under a tag other than `alpha` (e.g. `latest`, `next`, `beta`).
- Changing `package.json` or `package-lock.json` in the publish PR (the publish PR runs `npm publish` against the current `main` state; if metadata changes are needed, that's a new package-metadata PR first).

Each of those is a distinct, separately-authorised action. DEC-012 is necessary but not sufficient for any of them.

---

## DEC-013｜Quarantine Audit Markdown Concurrent First-Write Flake from Publish Gate

**Date**: 2026-04-29
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep flake-quarantine PR (after the second alpha publish attempt was blocked by `prepublishOnly`)
**Related artifacts**:
- [DEC-012 — Authorise separate npm alpha publish PR](#dec-012authorise-separate-npm-alpha-publish-pr)
- [`docs/reports/2026-04-29-ci-stability-audit.md`](./reports/2026-04-29-ci-stability-audit.md) §11 finding **F-2** (push-to-main `Test with coverage` flake) and §12 (recommendation to quarantine on third occurrence)

---

### Context

The npm alpha publish authorised by [DEC-012](#dec-012authorise-separate-npm-alpha-publish-pr) was attempted twice. Neither attempt reached the registry:

1. **Attempt 1** — blocked at npm registry by HTTP 403 (2FA gate). Recovered: maintainer added a granular access token with bypass-2FA enabled.
2. **Attempt 2** — blocked at the local `prepublishOnly` gate during `npm run test:coverage`. **One** test failed:
   - File: `tests/unit/audit-writer-markdown.test.ts`
   - Test: `appendAuditMarkdown — first-write + append > concurrent first-writes still produce exactly one header`
   - Symptom: `expected [ '## ' ] to have a length of 3 but got 1` — i.e. only one of the three concurrent appends produced a section under contention.

Observed behaviour:

- The test passes **5/5 in isolation** (just-verified by running `npx vitest run tests/unit/audit-writer-markdown.test.ts` five times consecutively after the failure).
- The test failed under full-suite parallel load (`vitest run --coverage` with `pool: forks`).
- Two prior failures of the same `Test with coverage` step on push-to-`main` events (PR #8 merge `598b63c`, PR #10 merge `114db5e`) were already recorded in the [CI Stability Audit §11 F-2](./reports/2026-04-29-ci-stability-audit.md). This local failure during alpha publish is **the third observation of the same pattern**, which the audit's §12 explicitly identified as the trigger for quarantine.

The test asserts a real concurrency property of `appendAuditMarkdown`: when three first-writers race, exactly one must create the `# Audit Trail` header AND each must contribute a `## ` section heading. The race exists in the implementation (file existence is detected via `fs.stat` before `fs.appendFile` — a TOCTOU window). Under contention, multiple callers can decide "the file does not exist" simultaneously, and depending on Node's append ordering only one ends up writing both header and section while the others write nothing observable.

The failure is therefore a **real concurrency edge case** in the implementation, not a bug in the test. The test correctly exercises the race; the implementation is flaky under load. Fixing the implementation requires non-trivial work (e.g. an exclusive-create handshake or a write-side lock around the audit markdown file), which is out of scope for an alpha publish PR.

### Decision

**Quarantine the flaky concurrent markdown first-write test from the default publish gate.**

Concretely:

1. **Move** the failing test from `tests/unit/audit-writer-markdown.test.ts` to a new file at `tests/flaky/audit-writer-markdown-concurrent-first-write.test.ts`. The test is **NOT deleted**.
2. **Exclude** `tests/flaky/**` from `vitest.config.ts`'s default `include` via the `exclude` field. Default `npm run test` and `npm run test:coverage` no longer execute it.
3. **Add** a separate vitest config at `vitest.flaky.config.ts` that includes only `tests/flaky/**`.
4. **Add** a `test:flaky` script to `package.json` that runs the quarantined suite via the new config: `vitest run --config vitest.flaky.config.ts`.
5. **`prepublishOnly`** continues to run `lint + typecheck + test:coverage + build`. It does **NOT** include `test:flaky`. The publish gate is therefore deterministic.

The test remains:

- ✅ Discoverable by anyone reading `tests/flaky/`.
- ✅ Runnable via `npm run test:flaky`.
- ✅ A fixed reference for the concurrency edge case it documents.
- ❌ NOT a publish blocker.
- ❌ NOT in default CI runs (CI runs `npm run test:coverage` per `.github/workflows/ci.yml` — that script no longer touches `tests/flaky/`).

The other 6 tests in the original `tests/unit/audit-writer-markdown.test.ts` file remain in place — they are deterministic and continue to gate the publish.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Leave the flaky test in the publish gate | Blocks alpha publish indefinitely with a known non-deterministic failure. Creates noise unrelated to package correctness. |
| B | Delete the test | The test captures a real concurrency edge case in `appendAuditMarkdown`. Deleting it removes evidence of an open issue and forecloses fixing it later. |
| C | Mark the test `.skip` in place | Plain `.skip` hides the test from intentional execution. Loses the ability to run it on demand without manually editing the file. |
| **D** | **Move the test to an explicit flaky/concurrency suite + add a dedicated runner script** (chosen) | — |
| E | Bypass `prepublishOnly` with `npm publish --ignore-scripts` | Violates the intent of [DEC-012](#dec-012authorise-separate-npm-alpha-publish-pr). The release gate exists for a reason; bypassing it once normalises bypassing it again. |
| F | Add `retry: 3` to the test | Masks the underlying race. Tests don't get retries in production code paths; if the test needs three attempts to be green, the production code is broken. |

### Decision

**Adopt Option D.** The mechanical changes are listed in the four-step plan above (see §Decision). The flaky test stays as evidence; the publish gate becomes deterministic.

### Consequences

**Positive:**

- Publish gate becomes deterministic enough for alpha publish (DEC-012's `prepublishOnly` no longer trips on this test).
- The concurrency test is preserved as an explicit investigation target — discoverable in `tests/flaky/`, runnable via `npm run test:flaky`.
- The remediation matches [CI Stability Audit §12 F-2 recommendation](./reports/2026-04-29-ci-stability-audit.md#11-findings) ("if a third occurrence is observed … quarantine the offending test").
- No registry mutation occurs; the publish itself remains gated by DEC-012's checklist.

**Negative:**

- A real concurrency edge case is no longer checked by the default suite. Beta or GA must either fix the underlying race in `src/core/audit/audit-markdown.ts` (TOCTOU window between `fs.stat` and `fs.appendFile`) or run `tests/flaky/` as a separate required check.
- The project now has a `tests/flaky/` directory. This must be a **rare** category — quarantine should require a DEC entry for each addition, otherwise it becomes a dumping ground.
- A future contributor reading the codebase may not realise the race exists in `appendAuditMarkdown` until they look at `tests/flaky/`. The test file's header comment + this DEC entry mitigate this; an additional inline TODO in `src/core/audit/audit-markdown.ts` is OPTIONAL and not in scope for this PR.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R25 | `tests/flaky/` becomes a dumping ground; tests get quarantined without proper diagnosis. | Each addition to `tests/flaky/` requires a new DEC entry that records the failure mode, the isolation-pass/full-suite-flake evidence, and the follow-up fix plan. Reviewers reject any quarantine PR without this. |
| R26 | The underlying concurrency race in `appendAuditMarkdown` is forgotten. | This DEC's §Follow-up enumerates the fix path. The quarantined test file's header comment links to this DEC. |
| R27 | Beta or GA ships with the race unfixed. | A future DEC blocking beta promotion must include "fix or empty `tests/flaky/`" as a precondition. |
| R28 | `test:flaky` is added to a CI required-check by mistake, blocking unrelated PRs on flake. | The new vitest.flaky.config.ts and DEC text both explicitly forbid this. CI workflow audit (PR #14 / future workflow PR) must verify `test:flaky` is NOT in CI required-checks. |

### Follow-up

Create a follow-up issue or TODO for **after** alpha publish:

- **Fix audit markdown concurrent first-write determinism.** Likely approach: replace the `fs.stat`-then-`appendFile` race with an exclusive-create handshake — try `fs.open(path, 'wx')` for the header write; on `EEXIST`, skip header and append section only. This eliminates the TOCTOU window deterministically.
- **Re-enable** the test in the default suite once the underlying code is deterministic. Move it back from `tests/flaky/` to `tests/unit/`. Capture the move in a follow-up DEC if the project is far enough along to warrant one.
- **Optional**: run the concurrency suite (`npm run test:flaky`) in a nightly CI workflow rather than a required-check on every PR. Out of scope for this DEC; would be its own GitHub Actions workflow PR.

This decision does **NOT** authorise `npm publish`. DEC-012 already authorises the publish; this DEC is the precondition that makes DEC-012's `prepublishOnly` gate green. After this DEC merges, the alpha publish is **re-attemptable** under the same DEC-012 12-step checklist.

> External MCP Host Validation pending.
> Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.

---

### Cross-cutting note: scope of DEC-013

DEC-013 quarantines **one** specific test on **one** specific failure pattern. It does NOT:

- Authorise quarantining other tests reactively. Each future quarantine requires its own DEC.
- Authorise `npm publish` (DEC-012 already did, subject to its checklist).
- Modify `prepublishOnly`'s gate set (`lint + typecheck + test:coverage + build`). The set stays the same; only the membership of `test:coverage` shrinks by one test file.
- Modify CI's required-checks. CI continues to run `npm run test:coverage`, which now skips `tests/flaky/`.
- Authorise creating `tests/flaky/` as a general bucket. R25 specifically forbids this.

---

## DEC-014｜Restore Audit Markdown Concurrency Test to Default Gate

**Date**: 2026-04-30
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep audit-markdown concurrency fix PR
**Related artifacts**:
- [DEC-013 — Quarantine audit-markdown concurrent first-write flake](#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate)
- [`docs/reports/2026-04-30-audit-markdown-concurrency-fix.md`](./reports/2026-04-30-audit-markdown-concurrency-fix.md)
- [`docs/reports/2026-04-29-flaky-test-quarantine.md`](./reports/2026-04-29-flaky-test-quarantine.md) §5 — the suggested patch this DEC supersedes

---

### Context

DEC-013 quarantined the audit markdown concurrent first-write test from the default publish gate because the underlying `appendAuditMarkdown` function had a real concurrency edge case: under full-suite parallel load, three concurrent `Promise.all` first-writers produced one header but lost two of three event sections. The test was correct; the implementation was racy.

The race is now identified precisely. The previous implementation:

```ts
const handle = await fs.open(file, "wx");
try { await handle.writeFile(MARKDOWN_HEADER, "utf8"); }
finally { await handle.close(); }
// ... EEXIST fall-through ...
await fs.appendFile(file, section, "utf8");
```

…uses `fs.open(file, "wx")` to atomically create-or-fail the file, then writes the header through the handle. The atomicity claim is correct for the *open* syscall, but the gap between `open` (which creates a 0-byte file) and `handle.writeFile` (which populates the header) is observable to a concurrent writer:

1. Writer A: `open(wx)` succeeds → empty file exists, A holds handle.
2. Writer B: `open(wx)` → EEXIST → falls through to `appendFile`.
3. Writer B: `appendFile` opens the file with `O_APPEND`, sees EOF at offset 0 (file is empty), writes section B at offset 0. File is now 500 bytes containing only section B.
4. Writer A: `handle.writeFile(MARKDOWN_HEADER)` writes ~200 bytes at handle position 0 (no `O_APPEND`), **overwriting the first 200 bytes of section B**, including its `## ` heading line.
5. Writer A: `handle.close` and then `appendFile(section A)` → appended at end.

The end result has 1 header + 1 visible `## ` line (section A's), not the expected 3. The test correctly observed this. The flake quarantine report ([`docs/reports/2026-04-29-flaky-test-quarantine.md`](./reports/2026-04-29-flaky-test-quarantine.md) §5) suggested using `fs.writeFile(path, header, { flag: "wx" })`. **That suggested patch has the same race**, because Node.js's `fs.writeFile` is implemented as separate libuv work items (open + write + close); a concurrent writer's `open(wx)` returns EEXIST after the first writer's open creates the empty file, before the first writer's write completes.

### Decision

**Adopt a different fix: `writeFile`-to-tmp + atomic `fs.link()` into place.** The primitive is `link(2)`, which is a single atomic filesystem syscall that either creates a hard link to an inode (success) or fails with EEXIST. Crucially, `link()` only succeeds against a **fully populated** source — the source's inode is fixed at link time, so the target name appears with full content in one atomic transition. There is no observable empty-file window.

Implementation:

```ts
async function ensureMarkdownHeader(file: string): Promise<void> {
  // Fast path: file already exists with full header.
  try { await fs.access(file); return; }
  catch (err) { if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err; }

  // Slow path: write header to unique tmp, atomically link tmp → file.
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, MARKDOWN_HEADER, "utf8");
  try { await fs.link(tmp, file); }
  catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    // Another writer linked first; their inode has the full header.
  }
  finally { try { await fs.unlink(tmp); } catch {} }
}

export async function appendAuditMarkdown(root, event): Promise<void> {
  const file = AuditPaths.markdownFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  await ensureMarkdownHeader(file);
  await fs.appendFile(file, renderMarkdownSection(event), "utf8");
}
```

This guarantees:

1. **Only one header**: any number of concurrent writers each `writeFile` their own tmp + try to `link`; exactly one's link succeeds (others get EEXIST), but every successful link points at a fully-populated header inode. The final file always has exactly one `# Audit Trail` line.
2. **Every event section appends**: after `ensureMarkdownHeader` returns, the file is non-empty, so concurrent `fs.appendFile(file, section, "utf8")` calls each seek to EOF atomically (kernel-level `O_APPEND` semantics, atomic for writes ≤ PIPE_BUF, our sections are ~500 bytes). Three writers append three distinct sections.
3. **No process-global lock**: each writer is independent; no in-memory mutex.
4. **No sleep / retry magic**: there is no polling, no `setTimeout`, no retry loop. All operations are single-shot.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Keep the test quarantined until beta | Concedes that the alpha publish ships with a known concurrency bug. The fix is small; the quarantine is removable now. |
| B | Delete the test | The test protects an audit-narrative consistency property: every audit event must produce exactly one `## ` heading in the markdown trail. Deleting it removes the regression check for the property we just fixed. |
| C | Add a `setTimeout(50)` after the open(wx) to "let the write complete" | Timing-based race hiding. Doesn't solve the race, just makes it less likely. Forbidden by the task's hard rules ("不依赖 sleep / setTimeout / arbitrary retry"). |
| D | Add an in-process mutex (e.g. a `Map<projectRoot, Promise>` chain) | Forbidden by the task's hard rules ("不依赖 process-global in-memory lock"). Also doesn't solve cross-process concurrency, though OCN doesn't currently have multi-process audit writers. |
| E | The flake quarantine report's suggested patch (`fs.writeFile(path, header, { flag: "wx" })`) | Has the same race as the original `fs.open(wx) + handle.writeFile`. Internally, Node.js's `fs.writeFile` is open + write + close as separate libuv work items; a concurrent writer's `open(wx)` returns EEXIST after the first writer creates the empty file, before the first writer's write completes. Verified by static reading of Node's source; the same overwrite-of-section-B happens. |
| **F** | **`writeFile`-to-tmp + atomic `fs.link()` into place** (chosen) | — |

### Validation

Required and performed before this DEC was captured:

| Check | Result |
|---|---|
| Targeted 100-run validation: `for i in $(seq 1 100); do npx vitest run tests/unit/audit-writer-markdown.test.ts || exit 1; done` | **100 / 100 passed.** No early exit. |
| `npm run lint` | ✅ clean |
| `npm run typecheck` | ✅ clean |
| `npm run test` (default suite) | ✅ **394 passed across 63 files** (was 393 under the quarantine; the restored test bumps it back to 394) |
| `npm run test:coverage` | ✅ 394 / 63; 83.45% lines / 85.06% branches / 90.76% functions (above thresholds 70 / 60 / 70 / 70) |
| `npm run build` | ✅ clean |
| `package.json` `test:flaky` script | removed (`node -p "require('./package.json').scripts['test:flaky']"` → `undefined`) |
| `vitest.flaky.config.ts` | removed |
| `tests/flaky/` directory | removed |
| `vitest.config.ts` `tests/flaky/**` exclude | removed |

### Consequences

**Positive:**

- The default publish gate now once again covers the audit-markdown concurrent first-write property.
- DEC-013 quarantine is **resolved**: the test is back in `tests/unit/`, runs by default, and passes deterministically.
- `tests/flaky/` and the `test:flaky` script are removed from the repo. No special infrastructure needed for tests that were thought to be flaky.
- Beta readiness improves — one less quarantined test.

**Negative:**

- The fix relies on `fs.link()` (POSIX `link(2)`). Available on Linux, macOS, and modern Windows (NTFS hardlinks). Exotic filesystems (FAT32, some network filesystems) may not support hard links. OCN's `engines.node ≥ 20` plus the Node.js docs for `fs.link` cover all common platforms; if a user runs OCN on FAT32, they will get an error on first audit write — a clear failure mode, not a silent corruption.
- The slow path performs one extra write (the tmp file) and one extra unlink per first-write. Negligible cost relative to the alternatives, and only on the very first audit event for a project. The fast path (`fs.access`) skips the link dance entirely after the file exists.
- The markdown narrative remains best-effort vs the JSONL source of truth — that contract is unchanged. JSONL is still authoritative; the markdown is a human-readable mirror.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R29 | Filesystem doesn't support hard links (e.g. FAT32). | Documented in §Consequences. Failure mode is a clear error on first audit write, not silent corruption. Future work may add a fallback path using `rename(tmp, file)` (also atomic, but with different EEXIST semantics — accepts overwrite). Out of scope here. |
| R30 | Tmp file leaks if the process crashes between `writeFile(tmp)` and `unlink(tmp)`. | The tmp uses a `randomUUID()` suffix, so collisions across crashes are negligible. The `.ocoding/audit/` directory may accumulate stale `*.tmp` files; future `ocn doctor` work can sweep them. Not a correctness issue. |
| R31 | A future contributor reverts the fix, reintroducing the race. | DEC-014's §Decision contains the explicit `writeFile`-to-tmp + `fs.link` algorithm. The default suite includes the regression test. The CI Stability Audit F-2 finding is still on record. |

### Follow-up

This DEC does **NOT** authorise:

- `npm publish` — the fix lands on `main`; whether to ship a `0.1.0-alpha.1` (or any subsequent) version requires its own DEC entry per [DEC-012](#dec-012authorise-separate-npm-alpha-publish-pr) §Cross-cutting note.
- `npm version` — package version stays at `0.1.0-alpha.0` on `main`.
- A git tag or GitHub release.
- README install-command updates.

External MCP Host Validation pending. Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.

---

### Cross-cutting note: scope of DEC-014

DEC-014 fixes ONE specific concurrency race and restores ONE specific test. It does **NOT**:

- Authorise mass un-quarantine of other tests (there are none today; `tests/flaky/` is removed).
- Modify any other audit subsystem behaviour. JSONL writer (`audit-jsonl.ts`) was NOT changed.
- Modify the audit event schema or surface API. `appendAuditMarkdown(root, event): Promise<void>` is unchanged.
- Authorise publishing a patch version to npm.

---

## DEC-015｜Authorise `0.1.0-alpha.1` Patch Publish

**Date**: 2026-04-30
**Status**: ✅ Approved
**Captured by**: Project owner (manual capture — pull mode per CLAUDE.md §4.7)
**Captured during**: GA Prep post-fix patch-authorisation DEC-only PR
**Related artifacts**:
- [DEC-005 — External MCP Host Validation pending](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)
- [DEC-007 — First semver lane (`0.1.0-alpha.0`)](#dec-007first-semver-lane)
- [DEC-008 — Alpha publish before PR D, with caveat](#dec-008publish-alpha-before-pr-d-completion)
- [DEC-009 — Package contents policy](#dec-009package-contents-policy)
- [DEC-011 — Lock npm package name](#dec-011lock-npm-package-name-to-o-coding-navigation)
- [DEC-012 — Authorise alpha publish PR (with 12-step checklist)](#dec-012authorise-separate-npm-alpha-publish-pr)
- [DEC-013 — Quarantine audit-markdown concurrent first-write flake](#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate)
- [DEC-014 — Restore concurrency test to default gate (race fixed)](#dec-014restore-audit-markdown-concurrency-test-to-default-gate)
- [`docs/reports/2026-04-30-audit-markdown-concurrency-fix.md`](./reports/2026-04-30-audit-markdown-concurrency-fix.md)
- [`docs/reports/2026-04-29-npm-alpha-publish-report.md`](./reports/2026-04-29-npm-alpha-publish-report.md)

---

### Context

The first npm alpha package was published as `o-coding-navigation@0.1.0-alpha.0` on 2026-04-30T12:48Z under [DEC-012](#dec-012authorise-separate-npm-alpha-publish-pr). That package contains a known concurrency race in `src/core/audit/audit-markdown.ts` — under full-suite parallel load, three concurrent first-writers produce one header but lose two of three event sections. The race is documented in detail in [DEC-013](#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate) and resolved on `main` in [DEC-014](#dec-014restore-audit-markdown-concurrency-test-to-default-gate) via the `writeFile`-to-tmp + atomic `fs.link()` algorithm.

`main` and the published `0.1.0-alpha.0` are now divergent on `src/core/audit/audit-markdown.ts`:

| Surface | State of `appendAuditMarkdown` |
|---|---|
| `main` | Fixed via `ensureMarkdownHeader` (writeFile + link). Default suite (394/63) covers the regression. |
| Published `o-coding-navigation@0.1.0-alpha.0` on npm | Old racy code (`fs.open(file, "wx")` + `handle.writeFile`). Users hitting concurrent first-writers in their own usage will observe missing markdown sections. |

External MCP Host Validation is still pending.

### Decision

**Authorise a future, separate patch-publish PR for `o-coding-navigation@0.1.0-alpha.1`.**

The purpose of `0.1.0-alpha.1` is **narrowly scoped**: ship the DEC-014 audit-markdown concurrency fix to alpha users on npm. Nothing else.

This DEC explicitly does **NOT**:

- Mutate `package.json` or `package-lock.json`.
- Execute `npm publish`.
- Create a git tag.
- Create a GitHub release.
- Change `README.md` or `docs/quickstart.md` install commands. (Both already say `npm install -g o-coding-navigation@alpha`, which will resolve to whatever the latest `alpha`-tagged version is — including `0.1.0-alpha.1` once published. No README change is needed.)
- Change `src/`.
- Change `.github/workflows/`.
- Lift the [DEC-005](#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) caveat. The patch publish must continue to declare `External MCP Host Validation pending.`

### Required pre-publish checks for the future `alpha.1` PR

The future patch-publish PR must perform and record each of the following, in order, before invoking `npm publish`:

1. **Sync to latest main** and confirm DEC-014 + the audit-markdown concurrency fix report are present:
   ```bash
   git checkout main && git pull
   grep -n "^## DEC-014" docs/20-decision-log.md
   test -f docs/reports/2026-04-30-audit-markdown-concurrency-fix.md
   ```
2. **Bump version** in `package.json`:
   ```
   "version": "0.1.0-alpha.0"  →  "version": "0.1.0-alpha.1"
   ```
   Hand-edit; do NOT use `npm version` (that creates a git tag, which is forbidden by this DEC).
3. **Re-sync `package-lock.json`** via a single `npm install` (no dependency changes expected; only the lockfile's name+version mirror needs to update):
   ```bash
   npm install
   git diff package-lock.json   # must show ONLY name/version sync, no dep graph change
   ```
   If the diff shows any dependency added/removed/upgraded/downgraded, abort and investigate before publishing.
4. **Confirm package name** (must equal `o-coding-navigation`):
   ```bash
   node -p "require('./package.json').name"
   ```
5. **Confirm package version** (must equal `0.1.0-alpha.1`):
   ```bash
   node -p "require('./package.json').version"
   ```
6. **Confirm npm registry** (must be `https://registry.npmjs.org/`):
   ```bash
   npm config get registry
   ```
7. **Confirm npm identity** (must be `uncletimgz` per [DEC-011 R23](#dec-011lock-npm-package-name-to-o-coding-navigation)):
   ```bash
   npm whoami
   ```
8. **Run the full local gate stack:**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run test:coverage
   npm run build
   ```
   Any failure halts the publish.
9. **Run the targeted audit-markdown concurrency validation** at least 100 consecutive runs (DEC-014 §Validation requirement):
   ```bash
   for i in $(seq 1 100); do
     npx vitest run tests/unit/audit-writer-markdown.test.ts || exit 1
   done
   ```
   100/100 must pass. Any early exit halts the publish.
10. **Confirm tarball shape:**
    ```bash
    npm pack --dry-run
    ```
    File list must match the [DEC-009](#dec-009package-contents-policy) allowlist; forbidden paths must be absent. Compare against [DEC-009 §Decision](#dec-009package-contents-policy) and the [package-metadata audit §6](./reports/2026-04-29-package-metadata-audit.md).
11. **Confirm forbidden paths absent** in the tarball: `tests/`, `todos/`, `.ocoding/`, secrets, `.env`, `docs/plans/`, `docs/reports/`, `docs/amendments/`, `docs/00-08*`, `docs/security/`, `docs/20-decision-log.md`, `src/`, `node_modules/`, `.git/`, `.github/`, `.husky/`, `coverage/`, `tsconfig*.json`, `eslint.config.*`, `vitest.config.ts`.
12. **Execute publish** (only after every check above passes):
    ```bash
    npm publish --tag alpha
    ```
    The `--tag alpha` flag is **mandatory** per [DEC-012 R22](#dec-012authorise-separate-npm-alpha-publish-pr).
13. **Verify post-publish state:**
    ```bash
    npm view o-coding-navigation dist-tags version name --json
    ```
    Expected: `dist-tags.alpha = "0.1.0-alpha.1"`. The `latest` tag will likely also move to `0.1.0-alpha.1` (npm's default behaviour when publishing a higher semver to the same package); this matches the npm-alpha-publish report's §9 observation and is acceptable.
14. **PR body must include**: the verbatim `npm publish` output, the npm registry URL of the new version, the verbatim caveat *"External MCP Host Validation pending."*, and a one-line statement that this is a `0.1.0-alpha.0 → 0.1.0-alpha.1` patch shipping the DEC-014 fix.

### Options Considered

| # | Option | Rejected because |
|---|---|---|
| A | Do not publish `alpha.1` | The published `alpha.0` contains a known audit-markdown concurrency race that has already been fixed on `main`. Leaving alpha users on the racy code without recourse is dishonest. |
| **B** | Publish `alpha.1` as a narrow patch shipping only the DEC-014 fix (chosen) | — |
| C | Wait for beta to ship the fix | The fix is small, validated, and relevant to alpha users. Beta is gated on PR D, audit-markdown fix, CI matrix expansion, and examples F2/F3 — likely weeks away. Alpha users would be on racy code for that whole window. |
| D | Publish `alpha.1` and also update README install docs to pin the version explicitly | Unnecessary. The current install command in `README.md §4` and `docs/quickstart.md §1a` is `npm install -g o-coding-navigation@alpha` — the `@alpha` selector resolves to whatever the latest `alpha`-tagged version is. Once `alpha.1` is published with `--tag alpha`, the existing install command starts producing `0.1.0-alpha.1`. No README change required. |
| E | Use `npm version 0.1.0-alpha.1` to bump | `npm version` creates a git tag by default. Git tags are explicitly forbidden by this DEC and by [DEC-012's cross-cutting note](#dec-012authorise-separate-npm-alpha-publish-pr). The patch-publish PR must hand-edit `package.json`. |

### Decision

**Adopt Option B.** A future, separate patch-publish PR for `o-coding-navigation@0.1.0-alpha.1` is authorised, subject to the 14-step checklist above.

### Consequences

**Positive:**

- npm alpha users (anyone running `npm install -g o-coding-navigation@alpha`) automatically pick up the audit-markdown concurrency fix on their next install/update — no action required from them beyond rerunning the install command.
- The published alpha aligns with `main`. The "main has a fix that the published package doesn't" anomaly is closed.
- DEC-013's quarantine is fully closed end-to-end: in the repo (DEC-014, fix lands) AND in the package distribution (DEC-015, fix ships).
- Follow-up readiness: when PR D eventually completes, the alpha line is on stable footing for a doc-edit caveat removal.

**Negative:**

- Requires another `npm publish` event. npm publishes are visible to anyone watching the registry; the version bump is auditable but small.
- `latest` will likely move to `0.1.0-alpha.1` when the publish lands. This continues the pattern from the [npm-alpha-publish report §9](./reports/2026-04-29-npm-alpha-publish-report.md) — npm's default behaviour publishes higher semver as `latest` on the same package unless explicitly suppressed. The `--tag alpha` flag does not prevent this when no stable version exists. The patch-publish PR must document this; no surprise.
- PR D remains pending. Host-compatibility claims remain forbidden. The alpha.1 patch does not unlock any beta-shaped messaging.
- Anyone who installed `0.1.0-alpha.0` and wrote audit data with the racy code may have a slightly corrupted `docs/22-audit-trail.md` (sections clobbered at concurrent first-writes). The patch fix does not retroactively repair existing files. Users who care can re-run the affected operations after upgrading; the JSONL source of truth (`.ocoding/audit/audit-events.jsonl`) was unaffected by the race.

### Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R32 | The patch-publish PR forgets to bump the version, and the publish fails because `0.1.0-alpha.0` already exists. | Step 5 (`node -p "require('./package.json').version"` must equal `0.1.0-alpha.1`) catches this before the publish call. |
| R33 | Step 9 (100-run targeted validation) is skipped or run as a smaller sample. | Reviewers reject any patch-publish PR that doesn't paste the verbatim 100/100 output (or equivalent counted evidence) into the PR body. |
| R34 | The patch-publish PR forgets `--tag alpha` and surfaces alpha.1 implicitly under `latest`. | npm has special behaviour for the *first* publish of a package (everything becomes latest), but for *subsequent* publishes, omitting `--tag` defaults to `latest` explicitly. Step 12's command is mandatory: `npm publish --tag alpha`. Reviewers reject any publish PR that lacks the flag. |
| R35 | Maintainer's bypass-2FA token has expired between alpha.0 and alpha.1. | `npm whoami` (step 7) catches this. If the token expired, the publish PR pauses for the maintainer to refresh credentials before attempting publish. |
| R36 | A new package on npm with the name `o-coding-navigation` somehow appeared between alpha.0 and alpha.1 (fork, transfer, etc.). | We own the package since alpha.0; this scenario is essentially impossible barring an npm-side incident. The `npm publish` command implicitly verifies maintainer authorisation — if it fails, the publish PR captures the error and stops. |

### Follow-up

The future patch-publish PR must:

- Follow the 14-step checklist in §Required pre-publish checks above.
- Record verbatim outputs of every step in a new `docs/reports/<DATE>-npm-alpha-1-publish-report.md` (matching the pattern of the existing alpha.0 publish report).
- NOT create a git tag.
- NOT create a GitHub release.
- NOT modify `README.md` or `docs/quickstart.md` install commands.
- NOT remove the `External MCP Host Validation pending.` caveat from any artifact.

After the patch publish merges, no other follow-up is automatically authorised. `ocn doctor` sweep, beta promotion, PR D execution, examples F2/F3 — each remains gated on its own future DEC entry.

---

### Cross-cutting note: scope of DEC-015

DEC-015 authorises **one** specific patch publish (`alpha.0 → alpha.1`) shipping **one** specific fix (DEC-014's audit-markdown concurrency repair). It does NOT:

- Authorise any other content change in the alpha.1 publish. The version bump is the only `package.json` mutation; the bundled `dist/` reflects `main`'s state at the time of the publish PR.
- Authorise creating a git tag or GitHub release for `alpha.1`.
- Authorise any README / quickstart / mcp-usage.md change in the publish PR. Those are separate doc PRs gated on their own decisions (or on PR D's completion).
- Authorise publishing under any tag other than `alpha`.
- Authorise removal of the DEC-005 caveat.
- Authorise any subsequent patch publish (`alpha.2`, etc.). Each future publish requires its own DEC entry.

---

## DEC-016｜Authorise 0.1.0-alpha.2 P1 Fix Train Publish

Date: 2026-04-30

### Status

Accepted.

### Context

The published npm alpha package is currently:

`o-coding-navigation@0.1.0-alpha.1`

After alpha.1, the post-alpha Codex audit (`docs/reports/2026-04-30-post-alpha-codex-audit.md`) identified four P1 findings that must be fixed before beta and before meaningful real MCP Host validation.

All four P1 findings have now been fixed on main:

1. P1-001 — MCP tools must require initialized OCN project roots (PR #27, merged at `954de58`; report `docs/reports/2026-04-30-fix-mcp-mutating-tools-require-initialized-project-plan.md` and the audit report §3 P1-001).
2. P1-004 — CLI and MCP version surfaces must match `package.json` (PR #28, merged at `204eaa4`; report `docs/reports/2026-04-30-version-surface-sync.md`).
3. P1-002 — `ocn check` must evaluate the current step artifact, not hard-code `step_prd` (PR #29, merged at `ba49b63`; report `docs/reports/2026-04-30-check-current-step-generic.md`).
4. P1-003 — persisted `.ocoding/sop.yaml` snapshots must match the runtime default SOP profile (PR #30, merged at `2979771`; report `docs/reports/2026-04-30-sop-snapshot-runtime-sync.md`).

The current npm alpha package does not include these four P1 fixes.

External MCP Host Validation is still pending.

### Decision

Authorise a future, separate patch publish PR for:

`o-coding-navigation@0.1.0-alpha.2`

The purpose of alpha.2 is narrowly scoped:

- publish the four completed P1 fixes from the Codex post-alpha audit
- keep npm alpha aligned with main
- prepare the codebase for later PR D real MCP Host validation

This decision does not mutate `package.json`.
This decision does not execute `npm publish`.
This decision does not create a git tag.
This decision does not create a GitHub release.
This decision does not remove the MCP Host validation caveat.

Any release-related artifact must include:

`External MCP Host Validation pending.`

### Required pre-publish checks for the future alpha.2 PR

The future alpha.2 publish PR must perform and record:

1. Confirm `main` includes the four P1 fixes:
   - P1-001 initialized project root validation
   - P1-004 version surface sync
   - P1-002 current-step check
   - P1-003 SOP snapshot/runtime sync
2. Bump `package.json` version from `0.1.0-alpha.1` to `0.1.0-alpha.2`.
3. Resync `package-lock.json` if npm requires it.
4. Confirm package name:
   `node -p "require('./package.json').name"`
5. Confirm package version:
   `node -p "require('./package.json').version"`
6. Confirm npm registry:
   `npm config get registry`
7. Confirm npm identity:
   `npm whoami`
8. Run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:coverage`
   - `npm run build`
9. Run at least one smoke test for each P1 fix:
   - MCP tools reject uninitialized project roots.
   - `ocn --version` returns `package.json` version.
   - `ocn check` passes on `step_project_brief` without requiring `docs/02-prd.md`.
   - Fresh `ocn init` writes a SOP snapshot aligned with the runtime profile.
10. Run:
    `npm pack --dry-run`
11. Confirm tarball contents match the DEC-009 allowlist.
12. Execute publish only after all checks pass:
    `npm publish --tag alpha`
13. Verify:
    `npm view o-coding-navigation dist-tags version name --json`
14. Confirm no forbidden actions occurred:
    - no git tag
    - no GitHub release
    - no `latest` promotion
    - no caveat removal

### Options considered

#### Option A — Do not publish alpha.2

Rejected.

Reason:
The published alpha.1 package lacks four completed P1 fixes that materially affect MCP safety, CLI truthfulness, version reporting, and SOP trust.

#### Option B — Publish alpha.2 as a narrow P1 fix train patch

Accepted.

Reason:
It aligns npm alpha with `main` and gives external alpha testers the safer P1-fixed build without claiming beta readiness.

#### Option C — Wait for PR D before publishing alpha.2

Rejected.

Reason:
PR D itself is more meaningful after the P1 fixes are published and available through the documented alpha install path.

#### Option D — Promote `latest` to alpha.2

Rejected.

Reason:
`latest` strategy remains a separate release decision. The documented install path uses `@alpha`.

### Consequences

Positive:

- npm alpha users receive the P1 fixes.
- PR D can later validate the same code line that users install through `@alpha`.
- The alpha line remains aligned with `main`.

Negative:

- Another `npm publish` event is required.
- `latest` may remain behind `alpha` and continue pointing to an older pre-beta package.
- External MCP Host validation remains pending.

### Follow-up

A future alpha.2 publish PR must:

- bump version to `0.1.0-alpha.2`
- run all required checks
- publish with `--tag alpha`
- record publish output
- not create a git tag
- not create a GitHub release
- not claim external MCP Host compatibility
- not remove the caveat

External MCP Host Validation pending.
