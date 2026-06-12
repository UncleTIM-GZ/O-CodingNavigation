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
| DEC-017 | 2026-04-30 | Close Claude Desktop MCP Host validation caveat (DEC-005 superseded for Claude Desktop only; Cursor/Cline still unverified) | ✅ Approved |
| DEC-018 | 2026-04-30 | Begin beta candidate preparation (no beta promotion authorised; gated on a future DEC and prerequisite PRs) | ✅ Approved |
| DEC-019 | 2026-05-01 | Beta Host Support Boundary — first beta scoped to Claude Desktop on Windows with WSL2; Cursor and Cline explicitly unverified and not blockers | ✅ Approved |
| DEC-020 | 2026-05-01 | npm `latest` tag strategy before beta — keep `latest` unchanged during alpha; canonical pre-beta install path remains `@alpha`; future beta promotion DEC must explicitly decide `latest` movement | ✅ Approved |
| DEC-021 | 2026-05-01 | Authorise first beta promotion (`0.1.0-beta.0` under `--tag beta` only; `latest` stays at `0.1.0-alpha.0`; Host scope = Claude Desktop on Windows with WSL2; Cursor / Cline still unverified; future publish PR must follow the 18-step checklist) | ✅ Approved |
| DEC-022 | 2026-05-01 | GitHub tag and pre-release policy for beta — authorise a future focused release-marker action that creates annotated git tag `v0.1.0-beta.0` + a GitHub **pre-release**; release notes must use DEC-019's scoped Host wording verbatim; no npm command authorised; no `latest` movement | ✅ Approved |

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

---

## DEC-017｜Close Claude Desktop MCP Host Validation Caveat

Date: 2026-04-30

### Status

Accepted.

### Context

DEC-005 introduced the `External MCP Host Validation pending.` caveat because OCN's MCP server had not been validated in any real MCP Host. PR D, kicked off after the alpha.2 P1 fix train was published, validated OCN's MCP stdio server in **Claude Desktop on Windows with WSL2** using:

```
wsl.exe -e node /home/timou/repos/OCN/dist/mcp/index.js
```

The validation evidence — Host transcripts, tool-list verification, raw envelopes for `navigator.where_am_i` / `navigator.brief` / `navigator.run_gate`, the structured-failure path for an invalid `projectRoot`, and a Host-side protocol-cleanliness statement — is recorded in:

`docs/reports/2026-04-30-mcp-external-host-validation-report.md`

The verdict in §9 of that report is **Pass** across 11 / 11 checks.

### Decision

Remove the **active user-facing** pending caveat where it referred to Claude Desktop validation, and replace it with a Host-scoped statement of completion:

> MCP Host validation completed for Claude Desktop on Windows with WSL2. Cursor and Cline remain unverified.

This decision applies to:

- `README.md` §1 install caveat banner and §"GA Prep" PR D status entry.
- `docs/quickstart.md` Step 0 (npm-install path).
- `docs/mcp-usage.md` opening notice.

This decision does **not** apply to:

- `docs/reports/*` — historical state-of-the-world snapshots; rewriting them would falsify the audit trail.
- `docs/plans/*` — historical planning artefacts.
- `docs/20-decision-log.md` body of every prior DEC (DEC-005 / DEC-007 / DEC-008 / DEC-009 / DEC-012 / DEC-013 / DEC-014 / DEC-015 / DEC-016) — append-only history; superseding facts go in DEC-017 itself, not by editing earlier DECs in place.

Host compatibility claims must be **scoped only to the tested Host**. OCN may now claim:

> MCP Host validation completed for Claude Desktop on Windows with WSL2.

OCN must **not** claim Cursor or Cline compatibility based on this DEC. Each unverified Host requires its own validation run + DEC entry before any compatibility wording is added.

### Validated Host

| Field | Value |
| --- | --- |
| Host | Claude Desktop (Cowork mode) |
| OS | Windows + WSL2 |
| OCN package | `o-coding-navigation@0.1.0-alpha.2` |
| OCN repo HEAD on validation branch | `73c5e3fce8500b9f4100ca014bfb90ccffade208` |
| MCP server command | `wsl.exe -e node /home/timou/repos/OCN/dist/mcp/index.js` |
| Test projectRoot | `/tmp/ocn-mcp-demo` |
| Verdict | **Pass** (11 / 11 checks) |
| Evidence report | `docs/reports/2026-04-30-mcp-external-host-validation-report.md` |

### Options considered

#### Option A — Remove the caveat globally for all hosts

Rejected.

Reason:
Cursor and Cline have not been validated. A blanket removal would assert compatibility we cannot back with evidence. The DEC-005 caveat was specifically about *real Host* validation; removing it requires evidence per Host.

#### Option B — Remove the caveat only from active user-facing docs, scoped to the tested Host (Claude Desktop)

Accepted.

Reason:
Honest scoping. The caveat existed because no real Host had been validated. One real Host now has been. The fix matches the gap the caveat was opened to track, and explicitly preserves the unverified status of every other Host.

#### Option C — Keep the caveat until Cursor and Cline are also validated

Rejected.

Reason:
Bundles separate validation runs into a single decision. PR D was scoped to a real Host validation; the next Hosts can be addressed in their own future PRs and DECs without holding back the Claude Desktop closure.

#### Option D — Rewrite historical reports / DECs to remove the caveat retroactively

Rejected. Forbidden.

Reason:
Append-only history (CLAUDE.md governance + DEC-016 follow-up requirement). Historical artefacts record what was true when they were written.

### Consequences

Positive:

- OCN can truthfully state Claude Desktop MCP Host validation is complete.
- The long-standing pending caveat is removed from active user-facing docs without overclaiming.
- PR D is complete for Claude Desktop, unblocking DEC-018 (beta candidate preparation).

Negative:

- Cursor and Cline remain unverified. Future support claims for those Hosts each require their own validation + DEC.
- A material change to `src/mcp/server.ts`, the `ALLOWED_TOOLS` registry, or the `wsl.exe -e node …` invocation path requires re-validation before claiming Claude Desktop compatibility on the new release.

### Follow-up

- Validate Cursor separately if a Cursor support claim is required; record evidence in a future report and add a closure DEC.
- Validate Cline separately if a Cline support claim is required; same pattern.
- Re-run §5 / §6 / §7 of the Claude Desktop validation report on a fresh disposable project before claiming Claude Desktop compatibility on a new release where any of the re-validation triggers in the report's §11 apply.
- Beta promotion still requires a separate DEC. See DEC-018.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.

---

## DEC-018｜Begin Beta Candidate Preparation

Date: 2026-04-30

### Status

Accepted.

### Context

OCN alpha.2 is published and aligned with main:

- `o-coding-navigation@0.1.0-alpha.2` is the current `@alpha` install target.
- The post-alpha Codex P1 fix train (P1-001 / P1-002 / P1-003 / P1-004) is complete on `main` and shipped to npm alpha users (DEC-016).
- Claude Desktop real MCP Host validation has passed (DEC-017).
- DEC-005's pending caveat has been closed for Claude Desktop in active user-facing docs.

The codebase is now healthy enough to *begin preparing* a beta candidate. Beta is a real promotion: it changes user expectations, it usually triggers `latest`-tag conversations, and it implies a stronger compatibility surface than alpha. The remaining unknowns (CI matrix scope, support boundary for non-Claude-Desktop hosts, examples readiness, install smoke under real `npm install -g`) all need their own focused PRs before any beta promotion is responsible.

### Decision

**Do not promote to beta immediately.** Begin Beta Candidate Preparation.

Beta promotion requires:

1. A separate future DEC explicitly authorising the promotion.
2. A separate implementation PR that follows the DEC-016 publish-discipline pattern (manual version bump, `npm publish --tag <next-tag>`, evidence report).
3. Completion of the prerequisite PRs listed below.

### Beta candidate prerequisites

Before any DEC can authorise beta promotion, the following must be completed (each as its own PR with its own narrow scope):

1. **Host support boundary.** Decide whether beta supports only Claude Desktop or also requires Cursor / Cline validation. Record the decision in a separate DEC. If multiple Hosts, each needs its own validation report following the DEC-017 pattern.
2. **CI matrix expansion.** Per the DEC-010 follow-up, expand from single-cell `ubuntu-latest` + Node 20 to **at minimum Node 20 + Node 22** on `ubuntu-latest`. Multi-OS expansion is optional at beta but encouraged.
3. **Examples F2 / F3.** Complete the executable example projects from `docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`. Each example must be runnable against the published `@alpha` (or future `@beta`) tarball without source-tree access.
4. **Install smoke from real npm install.** Beyond the existing CLI-from-`dist/` smokes, run:

   ```
   npm install -g o-coding-navigation@alpha
   ocn --version
   ocn --help
   ocn-mcp   # verify it boots, then Ctrl+C
   ```

   in a clean container or VM and capture the result in an evidence report.
5. **`latest` tag strategy.** Decide whether and when to promote `latest` past `0.1.0-alpha.0`. Currently `latest` is deliberately stale per DEC-008 / DEC-012 / DEC-015 / DEC-016 because alpha publishes have always used `--tag alpha`. A beta promotion is an opportune moment to revisit, in a separate DEC.
6. **Doc audit for beta claims.** Sweep `README.md`, `docs/quickstart.md`, `docs/mcp-usage.md` and any release notes for accidental beta language before beta DEC; ensure no doc claims "GA", "production-ready", or "verified" for unverified Hosts.

### Options considered

#### Option A — Promote beta immediately

Rejected.

Reason:
One Host validation is enough to close the Claude Desktop caveat (DEC-017) but is not enough to underwrite beta-level expectations. Beta needs an explicit support boundary, a broader CI matrix, examples readiness, and an install smoke that exercises the actual `npm install -g` path. None of those exist yet at the level beta deserves.

#### Option B — Begin Beta Candidate Preparation

Accepted.

Reason:
Preserves momentum. Names the prerequisites explicitly. Prevents the post-alpha.2 calm from drifting into "we should ship beta" without the supporting work. Each prerequisite becomes a focused PR.

#### Option C — Stay indefinitely in alpha

Rejected.

Reason:
The codebase is now healthy enough to prepare beta. Refusing to plan beta would lock the project in an alpha holding pattern even after the work to leave it has compounded.

### Consequences

Positive:

- Project momentum preserved.
- Each beta prerequisite is named, gated, and decomposable.
- Cursor / Cline / `latest` strategy questions get individual DECs rather than being bundled into a beta promotion that would over-claim.

Negative:

- Beta promotion is not immediate; users staying on `@alpha` may expect `@beta` sooner than the prerequisite PRs allow.
- Each prerequisite is its own commitment of effort.

### Follow-up

Open focused PRs for, in any order convenient to schedule:

- **CI Node 22 matrix expansion** (DEC-010 follow-up).
- **Examples F2 / F3** (executable examples directory).
- **Beta support boundary DEC** (Claude Desktop only, or also Cursor / Cline?).
- **Install smoke from real `npm install -g`** evidence report.
- **`latest` tag strategy DEC** (when and how to move `latest` off `0.1.0-alpha.0`).
- **Beta promotion DEC** when prerequisites are met. The promotion PR follows the DEC-016 publish discipline pattern.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.

---

## DEC-019｜Beta Host Support Boundary

Date: 2026-05-01

### Status

Accepted.

### Context

OCN alpha.2 is published and aligned with main:

- `o-coding-navigation@0.1.0-alpha.2` is the current `@alpha` install target (DEC-016, alpha.2 publish report).
- The four post-alpha Codex P1 fixes (P1-001 / P1-002 / P1-003 / P1-004) are shipped on alpha.
- Claude Desktop real MCP Host validation passed on Windows with WSL2 and is recorded in `docs/reports/2026-04-30-mcp-external-host-validation-report.md` (verdict: Pass, 11 / 11 checks; closure recorded as DEC-017).
- The state-store lock-observability timing flake has been hardened (PR #34 / `docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md`).
- CI now runs on Node 20 + Node 22 (PR #35 / `docs/reports/2026-05-01-ci-node-22-matrix-expansion.md`); both cells were green on first attempt.
- Cursor and Cline remain unverified. No real-Host validation has been run for either.
- DEC-018 began Beta Candidate Preparation and explicitly did **not** authorise beta promotion. Beta promotion is still gated on a future DEC + prerequisite PRs.

The project now needs an explicit support boundary for beta candidate planning: whether beta requires validation across multiple MCP Hosts before promotion, or whether beta can initially be scoped to the one Host already validated.

### Decision

Adopt a scoped beta Host support boundary:

> **Beta Candidate may target Claude Desktop on Windows with WSL2 as the only verified MCP Host.**

Cursor and Cline are **not blockers** for a first beta, provided every public beta-related artifact clearly states the support scope:

- Claude Desktop on Windows with WSL2: validated.
- Cursor: not yet verified.
- Cline: not yet verified.

OCN must **not** claim Cursor or Cline compatibility until each Host has its own validation report following the DEC-017 pattern. Each unverified Host requires its own validation run + closure DEC before any compatibility wording is added.

### Options considered

#### Option A — Require Claude Desktop, Cursor, AND Cline before beta

Rejected for the first beta.

Reason:
It would delay beta despite already having a real validated Host path. Cursor and Cline can be validated in follow-up PRs without blocking a Claude-Desktop-scoped beta. Bundling all three Hosts into a single gate also bundles three separate evidence runs into one PR — bad for review hygiene and bad for incident triage when one Host's session has issues that the other Hosts don't.

#### Option B — Allow beta with Claude Desktop only, with explicit scoped support claim

Accepted.

Reason:
Truthful, testable, and aligned with the current evidence. The DEC-017 closure was already scoped to Claude Desktop only; this DEC carries the same scoping forward into the beta planning surface. A scoped beta is preferable to either an over-broad beta that out-claims its evidence or a delayed beta that throws away ready-to-ship value.

#### Option C — Avoid any MCP Host support claim in beta

Rejected.

Reason:
OCN's MCP integration is central to its value proposition (CLAUDE.md §1: "MCP-first … AI Coding workflow operating system"), and a real Claude Desktop validation has already passed. Beta artifacts that omit Host claims entirely would be less useful than the alpha docs that already point users at Claude Desktop. The right move is scoped truth, not silence.

### Consequences

Positive:

- Beta planning can proceed without waiting for Cursor / Cline validation.
- Public claims remain evidence-based and audit-trail-complete.
- Cursor / Cline validation can happen later as separate, focused PRs (and separate closure DECs), each with their own evidence report.
- The DEC-017 caveat scoping pattern carries forward into the beta surface unchanged — readers familiar with alpha docs see consistent language.

Negative:

- Beta support boundary is narrower than "all major MCP Hosts". This may surprise users coming from other ecosystems where "MCP Host" is treated as a single compatibility surface.
- Cursor / Cline users need explicit warning that support is unverified — every active beta-related doc has to repeat that scope.
- Future docs must avoid broad "MCP hosts" compatibility language unless scoped or unless additional Host validation reports land.

### Beta documentation rule (binding for the future Beta promotion PR)

Before beta promotion, all active user-facing docs must use scoped wording. The canonical phrasing is:

> Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

The sentence — or a wording with strictly equivalent scoping (verified Host named, unverified Hosts explicitly listed) — is required in:

- `README.md` install caveat banner.
- `docs/quickstart.md` Step 0 (npm-install path).
- `docs/mcp-usage.md` opening notice.
- Any release notes drafted for the beta promotion PR.

Any broader MCP Host compatibility statement (e.g. "compatible with all MCP Hosts", "supports the MCP ecosystem") requires either (a) additional Host validation reports for every Host implicitly covered, or (b) an amendment DEC widening the support boundary. Reviewers reject the beta promotion PR if its wording exceeds the validated Host set.

### Validated Host (scope of this DEC)

| Field | Value |
| --- | --- |
| Host | Claude Desktop (Cowork mode) |
| OS | Windows with WSL2 |
| OCN package | `o-coding-navigation@0.1.0-alpha.2` |
| MCP server command | `wsl.exe -e node /home/timou/repos/OCN/dist/mcp/index.js` |
| Validation report | `docs/reports/2026-04-30-mcp-external-host-validation-report.md` |
| Closure DEC | DEC-017 |
| Verdict | Pass (11 / 11 checks) |

### Follow-up

This DEC defines the **support boundary** for beta planning. It does **not** authorise beta promotion. Beta promotion is still gated on a future DEC plus the remaining DEC-018 prerequisite PRs:

- ✅ **CI Node 22 matrix expansion** — done in PR #35 (`docs/reports/2026-05-01-ci-node-22-matrix-expansion.md`).
- ✅ **Host support boundary** — this DEC.
- ⬜ **Examples F2 / F3** (executable example projects per `docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`).
- ⬜ **Install smoke from real `npm install -g o-coding-navigation@alpha`** evidence report.
- ⬜ **`latest`-tag strategy DEC** (when / whether to move `latest` off `0.1.0-alpha.0`).
- ⬜ **Doc audit for accidental beta language** before beta promotion.
- ⬜ **Beta promotion DEC** (final gate). The promotion PR follows the DEC-016 publish discipline pattern.

Optional, not gating beta:

- Cursor real-Host validation in a separate future PR (DEC-017-style scoped report + closure DEC).
- Cline real-Host validation in a separate future PR (same pattern).

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.

---

## DEC-020｜npm latest Tag Strategy before Beta

Date: 2026-05-01

### Status

Accepted.

### Context

The npm package `o-coding-navigation` currently has the following dist-tag layout (verified at this DEC's authoring time via `npm view o-coding-navigation dist-tags version name --json`):

```
dist-tags:
  alpha:  0.1.0-alpha.2
  latest: 0.1.0-alpha.0
```

This is intentional history accumulated across the alpha publishes:

- **DEC-007 / DEC-008** authorised the first alpha lane (`0.1.0-alpha.0`) under the `alpha` tag. The first ever publish of a package on npm always lands on `latest` — that is npm's documented default behaviour for the first publish — so `latest` ended up at `0.1.0-alpha.0` automatically.
- **DEC-015 / DEC-014** shipped `0.1.0-alpha.1` (audit-markdown concurrency repair) under `--tag alpha`. `latest` did not move because `--tag alpha` was explicit on that publish.
- **DEC-016** shipped the post-alpha Codex P1 fix train as `0.1.0-alpha.2` under `--tag alpha`. Same discipline: `latest` did not move.

User-facing install instructions (`README.md` §1, `docs/quickstart.md` §0) recommend the `@alpha` selector:

```bash
npm install -g o-coding-navigation@alpha
```

`docs/reports/2026-05-01-npm-global-install-smoke.md` confirms the `@alpha` path resolves to the post-fix `0.1.0-alpha.2` end-to-end (15 / 15 checks Pass), and `docs/reports/2026-05-01-examples-discovery-to-plan.md` confirms the same alpha walks DISCOVERY → PLAN cleanly through the documented CLI surface.

DEC-018 began Beta Candidate Preparation; DEC-019 scoped the beta Host support boundary. The project now needs an explicit policy for whether to move `latest` **before** beta is promoted.

### Decision

**Do not move `latest` during alpha.** Keep `latest` unchanged at `0.1.0-alpha.0` until the first beta promotion decision authorises a different state.

`alpha` remains the canonical pre-beta installation channel. The future beta promotion DEC must explicitly choose between:

1. publish a beta version under the `beta` tag only — leave `latest` at `0.1.0-alpha.0`,
2. publish a beta version under both `beta` and `latest` — move `latest` forward,
3. or keep `latest` unchanged until GA.

This DEC does **not** authorise any of those options. It only authorises the *current state*: `latest = 0.1.0-alpha.0` is the intended steady state for the remainder of alpha and is preserved through to the beta promotion DEC.

This DEC does **not** authorise any `npm dist-tag` command. No registry mutation happens here.

### Options considered

#### Option A — Move `latest` to `0.1.0-alpha.2` now

Rejected.

Reason:
The project is still in alpha / beta-candidate preparation. Moving `latest` would expose users who run `npm install -g o-coding-navigation` (without an explicit `@alpha` selector) to a pre-beta package. The whole point of the `@alpha` install discipline established in DEC-008 / DEC-012 / DEC-015 / DEC-016 is to make pre-beta consumption an *opt-in* signal. Moving `latest` to alpha.2 silently turns that opt-in into the default.

A weaker version of this option — "users on alpha.0 are *worse off* than users on alpha.2 because alpha.0 lacks the four post-alpha P1 fixes" — is real but is mitigated by the install path the docs already recommend. Anyone following `README.md` ends up on `@alpha` and gets the fixed alpha.2. The set of users who are simultaneously (a) installing without `@alpha` AND (b) staying on the result long enough to hit a P1 case is small enough that promoting `latest` mid-alpha is the larger risk.

#### Option B — Keep `latest` unchanged until the beta promotion DEC

Accepted.

Reason:
It preserves the explicit `@alpha` install path established by all prior alpha publish DECs, avoids accidental broad adoption by untagged npm installs, and keeps the registry-mutation budget zero until a separate beta-promotion DEC has weighed up support boundary, install lane, and docs sweep together.

#### Option C — Move `latest` only after beta promotion succeeds

Deferred.

Reason:
This option may be appropriate at beta or GA, but the decision belongs in the future beta promotion DEC (or a successor `latest` strategy DEC tied to GA), not here. This DEC's scope is "what to do **before** beta promotion", and the answer is "nothing".

### Consequences

Positive:

- Users following the documented install command (`npm install -g o-coding-navigation@alpha`) get `0.1.0-alpha.2` — the post-P1-fix-train alpha, validated by `docs/reports/2026-05-01-npm-global-install-smoke.md`.
- Users who run `npm install -g o-coding-navigation` without a tag still get the conservative `0.1.0-alpha.0` historical-first-publish snapshot. This is **not** ideal, but it is *intentionally* conservative for a pre-beta lane.
- No npm registry mutation happens in this DEC. No `npm dist-tag` is executed. No publish occurs.
- The beta promotion DEC inherits a clean, documented `latest` baseline.

Negative:

- `npm install -g o-coding-navigation` without `@alpha` continues to resolve to the older `0.1.0-alpha.0`, missing the four post-alpha Codex P1 fixes (P1-001 / P1-002 / P1-003 / P1-004). Users in this corner case need the `@alpha` selector to get the fixes.
- Active docs must continue to instruct users to install with `@alpha`. Any drift in the install command (e.g. a future README edit that drops `@alpha`) becomes a real correctness bug, not a stylistic preference.
- The "two semvers under two tags, one is older than the other" optics are mildly confusing for npm-savvy users who notice. The trade-off is acceptable because the alternatives are worse (Option A's silent promotion) or premature (Option C's binding the beta DEC's hand).

### Documentation rule (binding until beta or GA changes this policy)

Active user-facing docs must continue to recommend the `@alpha` selector for installation:

```bash
npm install -g o-coding-navigation@alpha
```

Active docs must **not** recommend the untagged form:

```bash
npm install -g o-coding-navigation         # do NOT recommend
```

This rule applies to:

- `README.md` (currently compliant: §1 install banner uses `@alpha`).
- `docs/quickstart.md` (currently compliant: §0 install path uses `@alpha`).
- `docs/mcp-usage.md` (does not currently contain an install command — keep it that way; it links into `docs/quickstart.md`).
- Release notes drafted for any future alpha patch publish (e.g. a future alpha.3 if one is needed).
- The future beta promotion PR's docs **may** revise this rule, scoped to the beta install lane only — but only if the beta promotion DEC explicitly authorises the change.

Reviewers reject any PR that adds an untagged `npm install -g o-coding-navigation` command to active user-facing docs while this DEC is in force.

### Follow-up

- **The future beta promotion DEC must revisit `latest`.** It must explicitly choose Option (1), (2), or (3) from the §Decision section above and document the trade-off it is making. The choice cannot be left implicit.
- **The beta docs audit** (DEC-018 prerequisite #6) must verify that every install command in active docs (`README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`) uses the intended tag for the lane the doc describes. The audit checklist should explicitly include a `grep` for `npm install -g o-coding-navigation` (without `@alpha` / `@beta`) as a CI-blocking signal.
- **No `npm dist-tag` command is authorised here.** Future tag movement requires its own publish-discipline DEC following the DEC-016 / DEC-015 / DEC-012 pattern (manual version handling, evidence report, no `--ignore-scripts`, etc.).

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.

---

## DEC-021｜Authorise First Beta Promotion

Date: 2026-05-01

### Status

Accepted.

### Context

OCN has completed the beta candidate preparation track authorised by DEC-018. The full evidence chain is on `main` and verifiable:

1. **Post-alpha P1 fix train published** as `o-coding-navigation@0.1.0-alpha.2` (DEC-016, `docs/reports/2026-04-30-npm-alpha-2-publish-report.md`). Ships P1-001 / P1-002 / P1-003 / P1-004.
2. **Claude Desktop real MCP Host validation passed** on Windows with WSL2 and was closed by DEC-017 (`docs/reports/2026-04-30-mcp-external-host-validation-report.md` — verdict Pass, 11 / 11 checks).
3. **DEC-019 defined the beta Host support boundary** as Claude Desktop on Windows with WSL2 only.
4. **CI matrix expanded to Node 20 + Node 22** and both cells passed (`docs/reports/2026-05-01-ci-node-22-matrix-expansion.md`).
5. **State-store lock-observability flake hardened** before the matrix expansion (`docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md`).
6. **npm global install smoke passed** for `npm install -g o-coding-navigation@alpha` (`docs/reports/2026-05-01-npm-global-install-smoke.md` — verdict Pass, 15 / 15 checks).
7. **Examples F2 / F3** added an executable `examples/discovery-to-plan/` with a smoke that walked all 10 enumerated v1.0 SOP steps end-to-end (`docs/reports/2026-05-01-examples-discovery-to-plan.md`).
8. **DEC-020 kept `latest` unchanged during alpha** and bound this DEC to choose the next tag strategy.
9. **Beta documentation language audit** passed with three minimal corrections; active docs now use scoped Host wording and the `@alpha` install path uniformly (`docs/reports/2026-05-01-beta-doc-language-audit.md`).

Current published tags (verified at this DEC's authoring time via `npm view o-coding-navigation dist-tags version name --json`):

```
dist-tags:
  alpha:  0.1.0-alpha.2
  latest: 0.1.0-alpha.0
```

Current repo `package.json` version: `0.1.0-alpha.2` (verified via `node -p "require('./package.json').version"`).

### Decision

Authorise a future, separate **beta publish PR** for:

`o-coding-navigation@0.1.0-beta.0`

The beta publish PR may execute:

```
npm publish --tag beta
```

**only after** completing the 18-step pre-publish checklist below.

This DEC does **not** mutate `package.json`.
This DEC does **not** execute `npm publish`.
This DEC does **not** move `latest`.
This DEC does **not** create a git tag.
This DEC does **not** create a GitHub release.

### `latest` strategy for the first beta

Adopt **Option A** from DEC-020:

> Publish beta under the `beta` tag only.
> Do not move `latest` during the first beta publish.

After the future beta publish PR succeeds, the expected dist-tag state is:

```
alpha:  0.1.0-alpha.2  (unchanged)
beta:   0.1.0-beta.0   (NEW — created by the beta publish PR)
latest: 0.1.0-alpha.0  (deliberately unchanged from DEC-008 / DEC-012 / DEC-015 / DEC-016 / DEC-020)
```

Rationale:

- `beta` should be an **explicit opt-in** install signal, like `alpha` is today.
- Untagged `npm install -g o-coding-navigation` should not silently jump to beta.
- `latest` movement remains a separate **GA or later-beta** decision and requires its own DEC.

No `npm dist-tag` command is authorised by this DEC.

### Host support wording (binding for the beta publish PR)

All beta release notes and active user-facing docs MUST use exactly this scoped wording (or a wording with strictly equivalent scoping — verified Host named, unverified Hosts explicitly listed):

> Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

This is the canonical wording fixed in DEC-019 and reaffirmed in DEC-021. Any phrasing that implies Cursor or Cline compatibility is **forbidden** until each Host has its own validation report and closure DEC. Reviewers reject the beta publish PR if its wording exceeds the validated Host set.

### Required pre-publish checklist for the future beta publish PR

The future beta publish PR must perform and record each of the following 18 steps in the publish evidence report:

1. **Confirm `main` includes DEC-021** (this DEC) and all DEC-018 prerequisites (DEC-019, DEC-020, the audit and smoke reports listed in §Context).
2. **Confirm package name** is unchanged: `o-coding-navigation`.
3. **Confirm current version before bump** is `0.1.0-alpha.2`.
4. **Hand-edit `package.json` version** from `0.1.0-alpha.2` to `0.1.0-beta.0`. Do not use `npm version`.
5. **Resync `package-lock.json`** with `npm install --package-lock-only` (top-level + `packages[""].version` only).
6. **Confirm `package-lock.json` diff is version-only** — no dependency graph change. Reject the PR if any other field changed.
7. **Confirm npm registry**: `npm config get registry` → `https://registry.npmjs.org/`.
8. **Confirm npm identity**: `npm whoami` succeeds. Username may be redacted in the public report.
9. **Confirm `o-coding-navigation@0.1.0-beta.0` is not already published**: `npm view o-coding-navigation@0.1.0-beta.0` returns E404. If it returns metadata, stop — do not republish.
10. **Run all local gates**:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test`
    - `npm run test:coverage`
    - `npm run build`
11. **Run the discovery-to-plan example smoke**: `bash examples/discovery-to-plan/scripts/smoke.sh`. The smoke must walk all 10 enumerated steps and report `Discovery-to-plan smoke completed.`
12. **Run npm global install smoke** in a temp prefix (`mktemp -d` + `--prefix`) against the **packed tarball** produced by step 13, or against the published `@beta` selector after step 15 — choose one and document the choice. Verifies `ocn --version` returns `0.1.0-beta.0`, `ocn-mcp` boots clean, and the disposable-project flow passes.
13. **Run `npm pack --dry-run`** and capture the tarball summary (file count, packed size, unpacked size, shasum).
14. **Confirm tarball contents match the DEC-009 allowlist**: only `LICENSE`, `README.md`, `package.json`, `docs/quickstart.md`, `docs/mcp-usage.md`, `dist/**`. Reject if any forbidden path appears (`tests/`, `src/`, `.ocoding/`, `.env`, `docs/plans/`, `docs/reports/`, `docs/amendments/`, `node_modules/`, `.git/`, `.github/`, `.husky/`, `coverage/`, etc.).
15. **Execute publish**: `npm publish --tag beta`. The exact flag is mandatory. Forbidden alternatives (any of which means rejecting the PR):
    - bare `npm publish` (would default to `latest` for an existing package)
    - `--tag latest`
    - `--ignore-scripts`
    - `--access public` if the package is already public — should not be needed
16. **Verify post-publish via `npm view`**:
    ```
    npm view o-coding-navigation dist-tags version name --json
    npm view o-coding-navigation@0.1.0-beta.0 name version dist-tags --json
    ```
    Capture both. The version-specific query is the authoritative one (the unqualified query may show cached `latest`-resolved metadata for several minutes after publish).
17. **Confirm expected post-publish tag state**:
    - `dist-tags.beta` = `0.1.0-beta.0`
    - `dist-tags.alpha` = `0.1.0-alpha.2` (unchanged)
    - `dist-tags.latest` = `0.1.0-alpha.0` (unchanged)
    Reject and roll back if any of these is different.
18. **Confirm no forbidden actions occurred** during the publish:
    - no `npm dist-tag` command
    - no `latest` promotion
    - no git tag created
    - no GitHub release created
    - no Cursor / Cline compatibility claim added anywhere
    - no caveat removal beyond the pre-existing DEC-017 scope

### Options considered

#### Option A — Publish first beta under `beta` only and keep `latest` unchanged

Accepted.

Reason:
Preserves the explicit-opt-in install discipline (`@alpha` and `@beta` both require explicit selectors), creates a clear beta channel for early adopters who want the post-alpha-2 line plus any future beta-only fixes, and avoids accidental broad adoption via untagged `npm install -g`. Aligned with how alpha publishes were handled in DEC-008 / DEC-012 / DEC-015 / DEC-016.

#### Option B — Publish beta and move `latest` to beta

Rejected.

Reason:
The project is **not GA**. Moving `latest` would expose anyone running untagged `npm install -g o-coding-navigation` (e.g. CI scripts, package.json `dependencies`, tutorials that don't use `@beta`) to a pre-GA package. The whole `@alpha` discipline established in DEC-008 was specifically to make pre-stable consumption an opt-in signal. Beta is closer to GA than alpha but is still pre-GA.

A weaker version of this option — "users on alpha.0 (the current `latest`) are *worse off* than users on beta.0 because alpha.0 lacks the four post-alpha P1 fixes" — is real, but is mitigated by the documented `@alpha` install path that already routes following-the-docs users to `0.1.0-alpha.2`. The set of users who are simultaneously (a) installing without an explicit tag AND (b) staying on the result is small enough that promoting `latest` mid-pre-GA remains the larger risk.

#### Option C — Defer beta despite completed prerequisites

Rejected.

Reason:
All eight DEC-018 prerequisites are complete, all evidence is on `main`, the lock-observability and CI flake risks have been hardened, the doc audit is clean, and the Host scope is honest. Deferring beta would be valuable only if a *new* risk emerged that the existing evidence chain doesn't cover. None has. Continuing to ship under `@alpha` long after the candidate preparation is complete would erode the "alpha vs beta vs GA" semantic ladder rather than respect it.

#### Option D — Require Cursor and Cline real-Host validation before beta

Rejected.

Reason:
DEC-019 explicitly allowed the first beta to be Claude-Desktop-scoped. Cursor and Cline validation each require their own focused validation runs (DEC-017-style) and closure DECs; bundling those into the first beta gate would (a) delay beta indefinitely, (b) bundle three independent validation efforts into one PR's review surface, and (c) create pressure to declare success on Cursor / Cline before they're actually validated. Each Host gets its own future PR.

### Consequences

Positive:

- Creates a clear `@beta` install channel for users who want the post-P1-fix-train alpha plus any future beta-only fixes.
- Preserves explicit-opt-in install semantics: `@alpha`, `@beta`, and untagged installs all resolve to different versions.
- Keeps Host support claims evidence-based and scoped — Claude Desktop only, Cursor / Cline still flagged as unverified.
- Avoids accidental broad adoption through untagged `npm install -g`.
- Establishes the publish-discipline pattern (DEC-016 / DEC-015 / DEC-012 / DEC-008) for the next semver-prefix transition.

Negative:

- Active docs must continue to instruct users to install with an explicit `@alpha` (current) or `@beta` (after publish) selector. Any drift in install commands is a CI-blockable correctness issue per DEC-020.
- `latest` remains intentionally stale at `0.1.0-alpha.0` — this is correct per the explicit-opt-in discipline but visually confusing to users who expect `latest` to mean "newest". The pre-GA caveat in active docs already explains this.
- Cursor / Cline users remain outside the verified support boundary. Their support is a separate future track.

### Beta documentation rule (post-publish)

After the future beta publish PR succeeds, active docs **may** introduce:

```
npm install -g o-coding-navigation@beta
```

as the **beta install command** alongside or in place of the `@alpha` form. The decision of whether to keep `@alpha` references in active docs (e.g. as a "stable previous channel" pointer) belongs to the docs PR that follows the beta publish, not to this DEC.

Active docs MUST NOT recommend the untagged form:

```
npm install -g o-coding-navigation         # do NOT recommend
```

while DEC-020 / DEC-021 are in force. Any later DEC that moves `latest` may revisit this rule.

Active docs MUST NOT replace the scoped Host wording fixed in §"Host support wording" above. Any active-doc edit that broadens Host claims requires an additional Host validation report + closure DEC (DEC-017-style) for each new Host claimed.

### Follow-up

The future beta publish PR (separate from this DEC; not authorised to start until DEC-021 lands on `main`) must:

- bump `package.json` version to `0.1.0-beta.0`
- publish with `--tag beta` (the literal flag, no shortcuts)
- record full publish evidence in `docs/reports/<DATE>-npm-beta-0-publish-report.md` following the DEC-016 / alpha.2 evidence pattern
- keep `latest` unchanged at `0.1.0-alpha.0`
- not create a git tag
- not create a GitHub release
- not claim Cursor or Cline compatibility
- not remove the DEC-017 caveat scoping

A separate follow-up docs PR may update active install commands from `@alpha` to `@beta` (or include both) **only after** the beta publish PR succeeds and `npm view o-coding-navigation@beta` returns `0.1.0-beta.0`.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.

---

## DEC-022｜GitHub Tag and Release Policy for Beta

Date: 2026-05-01

### Status

Accepted.

### Context

OCN's first beta is live on npm (PR #42 / DEC-021):

```
o-coding-navigation@0.1.0-beta.0
```

Current dist-tag layout (verified at this DEC's authoring time via `npm view o-coding-navigation dist-tags version name --json`):

```
dist-tags:
  alpha:  0.1.0-alpha.2
  beta:   0.1.0-beta.0
  latest: 0.1.0-alpha.0
```

Active install docs now recommend (post-PR-#43):

```
npm install -g o-coding-navigation@beta
```

with `@alpha` retained as a still-available secondary channel and untagged `npm install -g o-coding-navigation` explicitly forbidden in active-doc recommendations while `latest` remains intentionally unchanged (DEC-020 / DEC-021).

What does **not** yet exist:

- **No git tag** for `v0.1.0-beta.0` (verified via `git tag --list` returning empty).
- **No GitHub Release** for `v0.1.0-beta.0` (verified via `gh release list --limit 10` returning empty).

OCN has so far avoided git tags and GitHub Releases entirely, per the publish-discipline DECs (DEC-008 / DEC-012 / DEC-015 / DEC-016 / DEC-021), which all explicitly forbade tag/release creation as part of the publish PR. That discipline kept publish PRs narrow and reviewable; it also left the project without a source-control marker that downstream consumers (dependabot, GitHub release-notification feeds, third-party tooling that watches the `Releases` tab) can key off of.

The project now needs an explicit policy for whether the npm beta should also have a source-control release marker, and if so, what shape it takes.

### Decision

**Adopt a source-control release marker for `0.1.0-beta.0`, and execute it in a separate focused release-marker action — not in this DEC.**

The intended release marker (authorised by this DEC, executed by a future PR / maintainer action):

| Field | Value |
| --- | --- |
| Git tag | `v0.1.0-beta.0` (annotated, not lightweight) |
| Tag target | the `main` commit that contains `package.json` version `0.1.0-beta.0` AND `docs/reports/2026-05-01-npm-beta-0-publish-report.md` AND `docs/reports/2026-05-01-post-beta-install-docs.md` (currently `9f1ced5` or its successor at the time the marker is created) |
| GitHub Release type | **pre-release** (the GitHub-side `prerelease: true` flag must be set) |
| GitHub Release title | `O'CodingNavigator v0.1.0-beta.0` |
| Release notes | drafted per §"Release notes required wording" below |

**This DEC does not create the tag.** **This DEC does not create the GitHub Release.** **This DEC does not move npm `latest`.** **This DEC does not publish to npm.** It is the authorisation gate; execution is a separate focused action.

### Release notes required wording

The GitHub Release notes for `v0.1.0-beta.0` MUST include the canonical scoped Host wording from DEC-019 / DEC-021 verbatim:

> Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

The notes MUST include the install command currently recommended by `README.md` and `docs/quickstart.md`:

```
npm install -g o-coding-navigation@beta
```

The notes MUST link to:

- `docs/reports/2026-05-01-npm-beta-0-publish-report.md` (publish evidence)
- `docs/reports/2026-04-30-mcp-external-host-validation-report.md` (Host validation evidence)
- DEC-021 (beta promotion authorisation)
- DEC-022 (this DEC — release marker authorisation)

The notes MUST NOT claim:

- GA or general availability
- production-ready
- Cursor support / Cursor verified
- Cline support / Cline verified
- untagged `npm install -g o-coding-navigation` as the recommended install path
- npm `latest` as the recommended channel

### Required release-marker checklist

Before creating the tag / GitHub Release, the future release-marker action must confirm:

1. `package.json` version is `0.1.0-beta.0` on the target commit (`node -p "require('./package.json').version"` → `0.1.0-beta.0`).
2. `docs/reports/2026-05-01-npm-beta-0-publish-report.md` is on `main`.
3. `docs/reports/2026-05-01-post-beta-install-docs.md` is on `main`.
4. `npm view o-coding-navigation dist-tags version name --json` shows:
   - `dist-tags.beta = 0.1.0-beta.0`
   - `dist-tags.alpha = 0.1.0-alpha.2`
   - `dist-tags.latest = 0.1.0-alpha.0`
5. Active docs recommend `npm install -g o-coding-navigation@beta` (verified via `grep -n "npm install -g o-coding-navigation@beta" README.md docs/quickstart.md`).
6. **No existing `v0.1.0-beta.0` git tag** exists (`git tag --list "v0.1.0-beta.0"` returns empty). If a tag already exists, the action stops and reports — do **not** force-overwrite.
7. **No existing GitHub Release** for `v0.1.0-beta.0` exists (`gh release view v0.1.0-beta.0` returns "release not found"). If a release already exists, the action stops and reports — do **not** delete and recreate.
8. **CI on `main` is green.** The matrix-expanded CI (Node 20 + Node 22) must show success on the target commit before the marker is created.

If any step fails, the action stops and writes a failure report. Do not partially complete (e.g. create the tag without the release, or vice versa).

### Options considered

#### Option A — Do not create any git tag or GitHub Release for beta

Rejected.

Reason:
The npm beta is live and documented; downstream consumers (dependabot, release-notification feeds, third-party tooling, security scanners that key off `Releases` to map versions to commits) all benefit from a source-control marker. Continuing to ship without tags makes traceability between npm versions and source-tree commits weaker than it needs to be. The publish-discipline DECs forbade in-publish-PR tag creation; they did not forbid tags entirely.

#### Option B — Create git tag only, no GitHub Release

Rejected for the first beta.

Reason:
A bare git tag is sufficient for `git checkout v0.1.0-beta.0` workflows but provides no place to communicate scoped Host support, the `@beta` install command, the unverified-Hosts list, or links to the evidence reports. A GitHub Release is the correct surface for those. For ongoing alpha-line patches a tag-only policy would be cheaper, but the **first beta** crossing the alpha → beta semver line earns the explicit communication channel.

#### Option C — Create git tag + GitHub pre-release

Accepted.

Reason:
Gives downstream consumers a source-control marker that maps npm version → commit, and gives the project a place to communicate scoped support without implying GA. The GitHub `prerelease: true` flag visibly distinguishes beta from a future GA release in GitHub's `Releases` UI and in third-party tooling that filters on prerelease status. Aligned with how the install docs already frame `@beta` as the recommended pre-GA channel.

#### Option D — Create a normal (non-prerelease) GitHub Release

Rejected.

Reason:
This is beta, not GA. A non-prerelease GitHub Release would visually equate beta with a stable release in the GitHub UI — exactly the framing DEC-018 / DEC-019 / DEC-021 carefully avoided. Even though npm's `dist-tags.latest` is independent of GitHub's `Releases.latest`, the optics matter: GitHub's "Latest release" badge is what casual visitors see. Reserving that badge for an actual GA release preserves a meaningful signal.

### Consequences

Positive:

- npm beta has a matching source-control marker (`v0.1.0-beta.0`) that downstream consumers can key off of.
- GitHub Release notes provide a single, durable URL that captures: install command, scoped Host support, version, links to evidence reports.
- The `prerelease: true` flag visibly distinguishes beta from GA in the GitHub Releases UI and in third-party tooling.
- Future beta / GA decisions inherit a clean, traceable baseline.

Negative:

- Adds a release-governance step beyond the publish PR (one more focused PR or maintainer action).
- The release-marker action must be careful never to imply GA or broad MCP Host support — both the title (`O'CodingNavigator v0.1.0-beta.0`) and the `prerelease: true` flag are load-bearing.
- Existing OCN audit-trail discipline says nothing was tagged before; adding tags introduces a new convention that future patches will need to follow consistently. (The first ongoing-alpha-line patch that doesn't get a tag would be a visible inconsistency.)

### Follow-up

A future focused release-marker action — separate from this DEC, not authorised to start until DEC-022 lands on `main` — must:

1. Verify all 8 items in §Required release-marker checklist.
2. Create an annotated git tag:
   ```
   git tag -a v0.1.0-beta.0 <target-commit-sha> -m "O'CodingNavigator v0.1.0-beta.0 (pre-release)"
   git push origin v0.1.0-beta.0
   ```
3. Create the GitHub pre-release:
   ```
   gh release create v0.1.0-beta.0 \
     --title "O'CodingNavigator v0.1.0-beta.0" \
     --notes-file <path-to-drafted-notes> \
     --prerelease \
     --target main
   ```
4. The release notes must include:
   - The npm install command: `npm install -g o-coding-navigation@beta`.
   - The Host scoping wording: *"Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified."*
   - Links to `docs/reports/2026-05-01-npm-beta-0-publish-report.md`, `docs/reports/2026-04-30-mcp-external-host-validation-report.md`, DEC-021, DEC-022.
5. The release notes must NOT claim GA, production-readiness, Cursor support, Cline support, untagged install as recommended, or `latest` as recommended.
6. After creation, capture evidence (`gh release view v0.1.0-beta.0`, `git tag --list "v*"`, the rendered release URL) in a follow-up report `docs/reports/<DATE>-github-beta-release-marker.md`.
7. The release-marker action does **not** publish to npm, does **not** move `latest`, does **not** modify `package.json`, and does **not** modify active install docs. Those are independent decisions.

The next ongoing-alpha-line patch (if one is needed before GA) would either get its own tag/release per a successor DEC-022-style policy (consistent), or stay tag-less per a successor "alpha patches don't get markers" DEC (also consistent — the asymmetry is acceptable as long as it's documented). DEC-022 only authorises **`v0.1.0-beta.0`** specifically.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.

---

## DEC-023｜SOP 0.2.0 Strong-Gated Build and Verify Scope

**Status**: Accepted for planning.

**Context**:

- OCN v0.1.0-beta.0 (current published `beta` dist-tag) only strong-gates the DISCOVERY → PLAN mainline (docs `00–09`). Of those, only `00–04` carry required-section gates; `05–09` pass on file-existence alone (see `docs/reports/2026-05-02-pdf-vs-shipped-sop-consistency-audit.md` §6).
- The original PDF SOP (`docs/AI Coding 最佳实践开发 SOP完整版.pdf`) mainline extends past PLAN into BUILD and VERIFY: real-data wiring, configuration externalisation, reproducibility, rollback, validation, debugging, baseline, acceptance verdict. In the shipped 0.1.0 profile these surface as cross-cutting reminders, **not** as `step_*` ids with `artifactPath` and `requiredSections` (`STEPS_BY_STATE.state_build = []`, `state_verify = []` in `src/sops/default-ai-coding-sop/0.1.0/data.ts`).
- The user has **not** started dogfood on v0.1.0-beta.0 yet and has explicitly stated that the full Plan → Build → Verify mainline must close before dogfood begins.
- Without strong gates for BUILD and VERIFY, the planning value produced by docs `00–09` cannot convert into either code evidence or verification evidence — the gate engine stops exactly at the moment the project would otherwise start writing code.
- Therefore, closure of the SOP mainline (00–18) must precede dogfood; otherwise dogfood would itself be the test of an unfinished SOP.

中文要点：现状是 PLAN 之后 OCN 的强门禁就停了，PDF SOP 的 BUILD / VERIFY 主链路没有被 wire 成 step。用户还没开始 dogfood，并且明确要求先把 Plan → Build → Verify 主链路补完，再 dogfood。

**Decision**:

SOP 0.2.0 will (a) tighten the existing required-section gates for docs `00–09`, and (b) introduce strong-gated BUILD and VERIFY steps for docs `10–18`.

- Positioning: OCN v0.2.0 = **"Strong-Gated Verified Build Engine"** (closes the development SOP loop end-to-end).
- Not: full PDF 0–25 implementation — SHIP / REFLECT (docs `19–25`) remain out of scope for this version.
- This DEC authorises **planning only**, not implementation. No source, test, package, npm, latest, tag, release, or workflow change is permitted under this DEC; each implementation PR will be a separate DEC-bound action.

**Scope** — steps wired in SOP 0.2.0:

DISCOVERY:
- `step_project_brief` → `docs/00-project-brief.md`
- `step_scope` → `docs/01-scope.md`

SPEC:
- `step_prd` → `docs/02-prd.md`
- `step_acceptance_criteria` → `docs/03-acceptance-criteria.md`

DESIGN:
- `step_technical_architecture` → `docs/04-technical-architecture.md`
- `step_information_architecture` → `docs/05-information-architecture.md`
- `step_data_model` → `docs/06-data-model.md`
- `step_api_contract` → `docs/07-api-contract.md`
- `step_test_strategy` → `docs/08-test-strategy.md`

PLAN:
- `step_mvp_plan` → `docs/09-mvp-plan.md`
- `step_real_data_wiring` → `docs/10-real-data-wiring.md`
- `step_config_and_env` → `docs/11-config-and-env.md`
- `step_reproducibility` → `docs/12-reproducibility.md`
- `step_rollback_plan` → `docs/13-rollback-plan.md`

BUILD:
- `step_dev_log` → `docs/14-dev-log.md`
- `step_research_log` → `docs/15-research-log.md`

VERIFY:
- `step_validation_report` → `docs/16-validation-report.md`
- `step_debug_report` → `docs/17-debug-report.md`
- `step_final_build_verdict` → `docs/18-final-build-verdict.md`

**Required principles**:

- Every step MUST have a stable `stepId`.
- Every step MUST have an `artifactPath`.
- Every step MUST ship a bundled template that satisfies the gate.
- Every step MUST declare `requiredSections` matching the canonical PDF structure (no file-existence-only gates for `05–18` unless the planning doc explicitly justifies the exception).
- Every step MUST be wired into the gate runner (`runGate` / `ocn check` / `ocn advance`).
- Every step MUST be covered by tests at unit + CLI level minimum.
- Every step MUST appear in the example smoke (extended `discovery-to-plan` becomes `plan-to-verify`).
- Every step MUST be reflected in user-facing docs (`README`, `quickstart`, `mcp-usage`).
- BUILD and VERIFY steps MUST NOT be mere reminders — they MUST produce **evidence** (dev log entries, validation matrix rows, debug fix records, baseline snapshot, final verdict).

**Non-goals**:

- No SHIP / REFLECT (docs `19–25`) implementation under this DEC.
- No `npm publish` under this DEC PR.
- No `npm dist-tag` change; `latest` does NOT move.
- No GA promotion; the version remains pre-GA.
- No Cursor / Cline support claim — DEC-019 boundary stands.
- No source / test / package / workflow change under this DEC PR.

**Options considered**:

- **Option A** — Dogfood the current `0.1.0-beta.0` first, then iterate on the SOP based on dogfood findings. **Rejected**: the user has explicitly requested the full mainline before dogfood; dogfood without BUILD / VERIFY would itself be the test of an unfinished SOP, and the failure modes the SOP exists to prevent (false BUILD completion, missing verification evidence) cannot be observed without those steps wired.
- **Option B** — Only tighten the existing `00–09` required-section gates without adding `10–18`. **Rejected**: addresses the audit's "shipped gates are looser than PDF guidance" finding (§6) but leaves the post-PLAN void intact; OCN would still stop gating at exactly the moment a project transitions from documents to code/verification.
- **Option C** — Implement the full PDF 0–25 immediately (BUILD + VERIFY + SHIP + REFLECT) in a single SOP version. **Rejected**: scope too large for one cycle; SHIP / REFLECT are post-delivery concerns that should land after the dev loop is itself proven; mixing dev-loop and post-delivery in one bump risks instability across all eight states.
- **Option D** — SOP 0.2.0 covers `0–18` strong-gated (Plan → Build → Verify mainline), deferring `19–25` to a later 0.3.x or 1.0.0. **Accepted**: closes the development SOP mainline without overloading scope, lets dogfood happen against a real end-to-end gate engine, and keeps SHIP / REFLECT as a separate, well-isolated future bump.

**Follow-up — implementation PR sequence (each its own DEC-bound action)**:

1. SOP 0.2.0 data model and artifacts: `src/sops/default-ai-coding-sop/0.2.0/data.ts`, `render.ts`, `gates.ts`, `artifacts.ts`, `sop.ts`, `config.ts`, `README.md`, `CHANGELOG.md`. Tighten `00–09` required sections to PDF parity. Register stable ids for `step_real_data_wiring`, `step_config_and_env`, `step_reproducibility`, `step_rollback_plan`, `step_dev_log`, `step_research_log`, `step_validation_report`, `step_debug_report`, `step_final_build_verdict`.
2. Templates for steps `00–18` under `src/core/templates/`. Each template MUST include all canonical required sections so the bundled template self-passes the gate.
3. Gate runner / required-section enforcement updates so the new sections are matched (canonical + bilingual aliases) by `computeArtifactGateStatus`.
4. Advance path through BUILD and VERIFY: confirm `runGate` and `advanceState` thread the new step ids; confirm the terminal step in 0.2.0 is `step_final_build_verdict` (or the chosen terminal in BUILD/VERIFY scope), and that `state_ship` / `state_reflect` remain explicit stubs with no wired steps.
5. Examples — extend `examples/discovery-to-plan/` into a `plan-to-verify` smoke covering the new steps end-to-end.
6. Docs update — `README.md` step inventory, `docs/quickstart.md` extended walkthrough, `docs/mcp-usage.md` new step reminders, `CHANGELOG.md`.
7. Local install smoke — verify a tarball install of the new profile boots cleanly.
8. **Optional** beta.1 publish after validation — separate DEC required (DEC-020 / DEC-021 / DEC-022 style); not authorised here.

## DEC-024｜Reframe BUILD / VERIFY as Execution Evidence Navigator

**Status**: Accepted for planning.

**Context**:

- SOP 0.2.0 already ships the strong-gated 00–18 mainline end-to-end: profile data, bundled templates, gate runner, runtime cutover (`loadSopProfile()` defaults to 0.2.0, fresh `ocn init` writes `sopProfileVersion: "0.2.0"`), and a `plan-to-verify` example whose smoke walks all 19 wired steps from `step_project_brief` through `step_final_build_verdict` (`docs/plans/2026-05-02-sop-0.2-strong-gated-build-verify-plan.md`, `docs/reports/2026-05-02-sop-0.2-runtime-cutover-full-flow.md`, `docs/reports/2026-05-02-sop-0.2-plan-to-verify-example.md`, `examples/plan-to-verify/scripts/smoke.sh`, `src/sops/default-ai-coding-sop/0.2.0/data.ts`).
- One real dogfood pass has been conducted against this 00–18 closed loop.
- Dogfood finding: `00–10` (DISCOVERY → PLAN: project brief, scope, PRD, ACs, technical architecture, IA, data model, API contract, test strategy, MVP plan, real-data wiring) is genuinely useful and produces planning evidence that converts into actionable scope.
- Dogfood finding: from step 11 onward (config-and-env, reproducibility, rollback, dev log, research log, validation, debug, final verdict), forcing the developer to advance one Markdown artifact at a time is **not** the right primary interaction model after development actually starts. The work is no longer "produce a planning section" — it is "implement a feature, get the PR through CI, fix what reviewers / CI / issues surfaced, prove the AC was met". A linear `ocn advance` over docs/11–18 does not help during the PR / CI / error / fix loop, and instead pulls the developer away from the real evidence chain.
- Real execution evidence already lives in git, GitHub PR, GitHub Actions, code review comments, GitHub Issues, and commit history. OCN should not duplicate that evidence chain — that would re-introduce the very "form-filling theatre" the SOP exists to prevent.
- What OCN should do instead is **read** that evidence chain, **summarise** the current execution state against the 00–10 plan and the 03 acceptance criteria, **surface deviations** (scope drift, missing tests, failed checks, unresolved issues, evidence gaps, blocked work items), and **generate the next-Agent guidance** (next prompt for Claude Code / Codex / LFG, repair prompt for an open issue, retry prompt after a verify failure). That role — "Execution Evidence Navigator / Agent Compass" — is materially different from the gate-engine role 00–10 plays.

中文要点：dogfood 之后看清楚了，OCN 在 0–10 里作为强门禁的"计划守门员"是有效的，但 10 之后再继续按文档线性推进 11–18 已经不再贴合真实开发节奏。真正的执行证据天然存在于 git / GitHub PR / CI / review / issue / commit 里，OCN 不应该再造一条文档证据链，而应该读取这条已有证据链，对照 00–10 计划与 03 验收标准，告诉开发者当前执行状态、阻塞点，以及下一轮给 Claude Code / Codex / LFG 的提示词。

**Decision**:

`Keep 0–10 as strong Planning Gates. Reframe 10+ as Execution Evidence Navigation.`

OCN after Build Plan should not primarily be a linear document-advance system. OCN should become an evidence navigator over git / GitHub / PR / CI / issue signals.

10 之后，OCN 不再主要扮演线性文档推进器，而是成为基于 git / GitHub / PR / CI / issue 证据链的执行指南针。

This DEC authorises **planning only**. No source, test, package, npm, latest, tag, release, workflow, or runtime change is performed by this DEC PR. Each implementation PR will be a separate DEC-bound action.

**Product model**:

- `0–10：Planning Gatekeeper`
- `10+：Execution Evidence Navigator`

**What remains**:

- Keep the strong-gated `00–10` planning chain as-is. Required sections, gate runner, `ocn check` / `ocn gate` / `ocn advance` semantics for 00–10 are unchanged.
- Keep `11–18` artifacts (`docs/11-config-and-env.md` … `docs/18-final-build-verdict.md`) and their templates.
- Keep the `plan-to-verify` example.
- Keep the existing SOP 0.2.0 profile (`src/sops/default-ai-coding-sop/0.2.0/`) — no removal, no rollback.
- Reinterpret `11–18` as **evidence-derived reports** rather than as the main developer interaction loop: their canonical content should, over time, be filled in from observed git / GitHub / CI evidence, not from a developer manually tabbing through `ocn advance` between code edits.
- `ocn advance` remains useful for planning (00–10) and for formal closure of a delivery, but it is **not** sufficient as the primary daily-development execution surface.

**Evidence sources** (read-only inputs the navigator will consume):

- Local `git status` (working tree dirty / clean, untracked, staged, unstaged).
- Local `git diff` (file-level and hunk-level changes vs base).
- `git log` (recent commits, branch divergence vs base).
- GitHub PR title and body.
- GitHub PR commit list.
- GitHub PR files-changed list.
- GitHub Actions check runs (status / conclusion per check).
- Failed CI logs (the failing job's relevant tail).
- GitHub PR review comments (review state, requested changes, threads).
- GitHub Issues (open, linked, labelled).
- Linked branch (PR ↔ branch ↔ issue).
- `package.json` scripts (the canonical `lint` / `typecheck` / `test` / `build` commands the navigator can recommend running).
- Local test command outputs (when the developer runs them).

**New core objects** (data model sketch, not yet implemented):

- **Work Item** — a unit of execution scoped to a PR / branch / issue.
- **Agent Run** — a recorded invocation of an external coding agent (Claude Code / Codex / LFG / etc.) against a Work Item, with prompt and outcome.
- **Issue** — an open problem (CI failure, review comment, linked issue, blocked AC) the navigator surfaces.
- **Verification Run** — an attempted verification against the AC document or the test strategy, with status.
- **Evidence Link** — a stable reference from a Work Item / Issue / Verification Run to a concrete piece of git / GitHub / CI evidence.
- **Acceptance Mapping** — a mapping from `docs/03-acceptance-criteria.md` ACs to evidence (changed files, tests, CI runs, smoke runs, review approvals).
- **Final Verdict** — an evidence-derived draft of `docs/18-final-build-verdict.md`: pass / fail / unresolved risks, anchored to Evidence Links.

**New command direction** (directional, not implemented in this PR):

```
ocn exec status
ocn github analyze-pr <number>
ocn evidence map
ocn next-prompt
ocn verify status
ocn verdict draft
```

**Options considered**:

- **Option A** — Keep `11–18` as linear doc advance. **Rejected.** Dogfood shows real friction once development starts: the developer spends time in PR / CI / error / fix loops, and a linear `ocn advance` over Markdown artifacts neither tracks nor helps that loop.
- **Option B** — Remove OCN entirely after step 10. **Rejected.** Even after planning closes, the developer still needs evidence-chain navigation, status judgement against 00–10, and a next-Agent compass; deleting OCN's post-10 role would surrender the discipline OCN sells (`CLAUDE.md` §1).
- **Option C** — Use GitHub (and local git) as the source of truth for execution, and OCN as the read-only navigator that interprets it against the 00–10 plan and the 03 ACs. **Accepted.** Development evidence already lives in PR / commit / diff / CI / review / issue; OCN's value is interpretation, not duplication.
- **Option D** — Build a full internal execution database immediately (project-side mirror of every PR / commit / check / issue). **Rejected for now.** Too heavy as a first move; correct sequencing is read-only on git / GitHub evidence + next-prompt first, then decide whether internal indexing is needed.

**Consequences**:

Positive:

- Reduces duplicated manual reporting after planning closes — the developer stops re-typing what GitHub already knows.
- Fits real development flow (PR + CI + review + issue) rather than a Markdown ladder.
- Aligns with the "TwigLoop" evidence-chain concept: every status claim is anchored to a verifiable Evidence Link, not to a free-form section in a `.md` file.
- Useful in stuck loops (failed CI, unresolved review comment, AC with no test) where a linear gate engine has nothing to say.
- Avoids form-filling theatre — keeps OCN credible as a discipline product, not a doc-factory.

Negative:

- Requires GitHub / git integration code (gh CLI or GitHub API), which 0–10 did not need.
- Adds a new analysis layer (evidence parsing, AC mapping, next-prompt synthesis) on top of the existing gate engine.
- OCN becomes more than a simple SOP gate engine; the cognitive surface for users grows.
- Need to clearly distinguish observed facts (git / PR / CI signals) from AI interpretation (deviation flags, next-prompt suggestions, verdict drafts) so users do not over-trust the navigator.

**Follow-up — future implementation sequence (each its own DEC-bound action)**:

1. Execution Navigator plan (this PR's plan doc).
2. Read-only local git evidence MVP — `ocn exec status` against local `git status` / `git diff` / `git log`.
3. Read-only GitHub PR analysis MVP — `ocn github analyze-pr <number>` (PR metadata, commits, files changed, CI checks, review comments), via `gh` CLI or GitHub API, no mutation.
4. Acceptance criteria mapping from PR evidence — `ocn evidence map` against `docs/03-acceptance-criteria.md` and PR / test / CI signals.
5. Next-prompt generation for Claude Code / Codex / LFG — `ocn next-prompt`, including issue-specific and verify-failure variants.
6. Verification status summariser — `ocn verify status` rolling up CI, smoke, AC mapping, and open issues.
7. Evidence-derived `11–18` report generation / update — `ocn verdict draft` writing a draft `docs/18-final-build-verdict.md` from Evidence Links.
8. Dogfood again on the same LFG project to validate the navigator delivers real-time value during execution.

**Non-goals**:

- No source implementation in this DEC PR.
- No `npm publish`.
- No `latest` dist-tag movement.
- No GA promotion.
- No Cursor / Cline validation claim — DEC-019 boundary stands.
- No removal or rollback of the SOP 0.2.0 code.
- No deprecation of the `0–10` strong gates.

## DEC-025｜Logic Backbone — machine-verifiable computation/decision graph (SOP 0.3.0)

**Status**: Active (additive; runtime default flipped to 0.3.0)
**Date**: 2026-06-03
**Amendment**: AM-003 (`docs/amendments/2026-06-03-logic-backbone-amendment.md`)

### Decision

Add a DESIGN-phase artifact `artifact_logic_backbone` / `step_logic_backbone`
(`docs/07-logic-backbone.md`) that pins a system's computation/decision graph as a typed,
role-bearing directed graph and machine-validates it. `ocn check` blocks
(`ERR_ARTIFACT_INVALID`, exit 2) on five drift defects — missing role, dangling reference,
dependency cycle, orphan node, unbound trigger — and on pass persists
`.ocoding/logic-graph.json`, which `ocn brief` summarizes (execution order + triggers) to
stop BUILD-phase logic drift.

Paradigm: DAG + DMN hybrid + Event-Modeling trigger/hint distinction (prior art: dbt's
ref-DAG, DMN decision-requirements, architectural fitness functions). Source of truth:
Markdown-friendly authored doc + `.ocoding/` JSON projection (§4.10).

### Sub-decisions

- **Dependency-correct slot `docs/07`, renumbered** (supersedes the initial additive-slot-19
  idea). Logic backbone sits after the data model and before the API contract / test
  strategy (it computes on the data; API exposes its outputs; test strategy tests its
  graph). `08-api-contract` … `19-final-build-verdict` shift +1, so file number == workflow
  order. Paths are sourced from the active SOP profile (`artifactPathForStep`), not a
  hardcoded registry path, so 0.2.0 keeps its numbering while 0.3.0 uses the renumber.
- **New SOP 0.3.0** (additive minor bump, §4.2) is the runtime default; `loadSopProfile()`
  returns 0.3.0 (20 wired steps). 0.2.0 stays frozen and importable by explicit version.

### Out of scope (this DEC)

- No config-driven SOP version resolution — `loadSopProfile()` returns the default; a
  project pinned to an older version still gets the default at runtime (acceptable: no old
  projects exist). A possible future refinement.
- No new MCP write capability beyond the `create_artifact` enum value — advance / decisions
  / gate enforcement remain human-only (§4.8).
- No empty-graph rule (a graph with no nodes passes vacuously by design).

## DEC-026｜Release marker for 0.3.0-beta.0 (Logic Backbone)

Date: 2026-06-04

### Status

Accepted — authorised by the maintainer; executed as a maintainer release action.

### Context

SOP 0.3.0 (the Logic Backbone) landed on `main` via PR #74 (feature) and PR #75
(release prep + docs). At this DEC's authoring time the published dist-tags were:

```
alpha:  0.1.0-alpha.2
latest: 0.2.0-beta.2
beta:   0.2.0-beta.2
```

`package.json` on `main` is `0.3.0-beta.0`. The pre-publish gate
(`lint` + `typecheck` + `test:coverage` + `build`) is green (897 tests, 102 files).
This release stays in the beta channel — a bare `0.3.0` would imply GA, which
contradicts the project's pre-GA posture (DEC-018 / DEC-019 / DEC-021 / DEC-022).

### Decision

Publish `o-coding-navigation@0.3.0-beta.0` and adopt the matching source-control
release marker.

| Field | Value |
| --- | --- |
| npm version | `0.3.0-beta.0` |
| npm dist-tags | `latest` → `0.3.0-beta.0`, `beta` → `0.3.0-beta.0`; `alpha` preserved at `0.1.0-alpha.2` |
| Git tag | `v0.3.0-beta.0` (annotated) |
| Tag target | the `main` commit carrying `package.json` `0.3.0-beta.0` + `docs/reports/2026-06-04-logic-backbone-0.3.0-beta.0.md` |
| GitHub Release type | **pre-release** (`prerelease: true`) |
| GitHub Release title | `O'CodingNavigator v0.3.0-beta.0` |
| Release notes | `docs/reports/2026-06-04-logic-backbone-0.3.0-beta.0.md` §"GitHub pre-release notes" |

### Boundary

- This remains **beta, not GA**. No bare `0.3.0` tag; no GA promotion.
- `latest` moves to `0.3.0-beta.0` (consistent with how `0.2.0-beta.2` held `latest`).
- `alpha` is not touched (stays `0.1.0-alpha.2`).
- No change to the SOP 0.1.0 / 0.2.0 frozen profiles (importable by explicit version).
- Feature scope is governed by DEC-025 / AM-003; this DEC only authorises the release marker.

## DEC-027｜Renumber the logic backbone to its dependency-correct slot (docs/07)

Date: 2026-06-04
Amends: AM-003 / DEC-025 (supersedes their "additive slot 19" sub-decision)

### Status

Accepted — folded into 0.3.0 before its npm publish.

### Context

DEC-025 originally placed `step_logic_backbone` as an **additive slot 19** (last DESIGN
step) to avoid renumbering the frozen 0.2.0 `00–18` set and the shared template registry.
Review surfaced that this is dependency-incorrect and confusing: the file number 19 reads
as "written last", and the test strategy (08) should test the logic backbone, so the
backbone must precede it.

### Decision

Order by dependency, not by an additive file number. The logic backbone is **computation
on the data model** (its inputs/scores derive from data-model fields); the API contract
exposes its outputs and the test strategy tests its graph. Therefore:

- Workflow position: **after `06-data-model`, before `08-api-contract` / `09-test-strategy`**.
- File slot: **`docs/07-logic-backbone.md`**; `api-contract` … `final-build-verdict` shift
  +1 (→ `08` … `19`). File number now equals workflow order.
- Architecture: `ocn doc create` sources the artifact path from the active SOP profile
  (`artifactPathForStep`), not a hardcoded registry path — so 0.2.0 keeps its numbering and
  0.3.0 uses the renumber without a shared-registry collision.

### Out of scope

- 0.2.0 / 0.1.0 numbering unchanged (frozen). The npm package number stays `0.3.0-beta.0`.

## DEC-028｜Readiness Backbone — role-based cross-cutting readiness gate (SOP 0.4.0)

Date: 2026-06-11
Implements: AM-004 (`docs/amendments/2026-06-11-readiness-backbone-amendment.md`)

### Status

Proposed — design accepted; engine not yet implemented. Ships behind a new SOP 0.4.0 when built.

### Context

The section gate blocks missing-section completion; AM-003 blocks logically un-wired
completion. Dogfooding on the Lattice project exposed a third class — **role-blind
completion**: dozens of design docs pass every gate, yet a multi-director review still
surfaces basic gaps (no git/CI, no adopter, no cost, no operability owner, 1052 LOC behind
2 smoke tests). OCN's verification is intra-artifact (doc vs. SOP schema) and closed-world
(silence reads as pass); it has no notion of "ready against the stakeholders who must
accept it." "Which dimensions are missing" is unenumerable; "which roles must have signed
off" is bounded and externally catalogued (oprocess 54 roles). The fix converts the
unverifiable predicate (content complete?) into a verifiable one (every required acceptor
PASSED or explicitly WAIVED?).

### Decision

Add a cross-cutting **`readiness` gate** driven by a rulebook YAML
(`readiness-backbone.yaml`, 54 oprocess roles → 55 falsifiable checks), bundled in the SOP
profile. `ocn check` runs it after the section + logic gates; `ocn advance` runs it before
transition. Open-world blocking: a `block`-severity, tier-required check passes the gate
only if `PASS` or `WAIVED` — `FAIL` and `UNKNOWN` both block. On block: `ERR_GATE_FAILED`
(exit 1) + each blocking check's `fix_hint`. `warn` checks (incl. over-preparation
`process_proportionality`) surface in `brief` only. `.ocoding/readiness.json` is the
machine projection; `ocn brief` lists open items + fix_hints as the BUILD worklist.

### Sub-decisions

1. Cross-cutting gate + `obligation_readiness`, **not** a new state-machine step (it validates other artifacts). 20-step machine unchanged.
2. Rulebook ships in the SOP profile; LLM authors it offline, engine only enforces (no-LLM-judge / local-first preserved). All predicates deterministic.
3. Exit code `ERR_GATE_FAILED` (1) — a cross-artifact gate, not a single invalid artifact.
4. New SOP **0.4.0** = runtime default; 0.3.0 frozen + importable.
5. Waivers human-only (`ocn readiness waive … --reason`, audited); `waivable:false` checks reject; MCP exposes read-only evaluation via `navigator.run_gate`, never waiver.
6. Number-agnostic resolution via `artifact_aliases` (doc slug globs) + `repo_probes` (filesystem/command facts) — portable across projects that renumber docs.

### Out of scope

- Engine implementation (separate authorized build). This DEC accepts the design only.
- Concrete extractors for derived predicates (e.g. `each_acceptance_scenario_has_test_ref`) — highest-risk items, spike first (see AM-004 Open design points).
- 0.1.0–0.3.0 unchanged (frozen).

## DEC-029｜`ocn sop upgrade` apply mode — forward-only SOP re-pin for initialized projects

Date: 2026-06-11
Implements: AM-005 (`docs/amendments/2026-06-11-sop-upgrade-apply-amendment.md`)

### Status

Accepted — implemented and tested.

### Context

Projects pin their SOP profile at `ocn init`; when the installed package ships a newer
profile (0.4.0, AM-004), an existing project had no upgrade path — readiness commands
blocked with `ERR_SOP_VERSION` and suggested a re-init that `ocn init` refuses on an
initialized directory. The "no old projects exist" assumption (AM-003 migration note)
no longer holds: dogfooded 0.3.0 repos exist and need the readiness gate. The frozen
contract (`docs/06-api-contract.md` §23) defined only the read-only
`ocn sop upgrade --plan`; apply mode is the divergence authorized here.

### Decision

Ship `ocn sop upgrade [--target <version>] [--plan] [--json]` with an apply mode:
under `.ocoding/.lock`, re-render the profile-owned snapshots and move
`project.sopProfileId/sopProfileVersion` via the atomic state-store write, then audit
`sop_upgraded` (push). `--plan` stays read-only and audits `sop_version_diff_detected`
per §23.5.

### Sub-decisions

1. **Forward-only.** Downgrade blocks with `ERR_SOP_VERSION` (exit 5); older profiles
   require a fresh `ocn init --sop-version <old>`. Idempotent no-op at target (exit 0).
2. **Positional-cursor compatibility rule.** `currentStateId`/`currentStepId` must
   exist in the target profile (stable string IDs §4.1 make this checkable); steps
   added after the cursor become pending, steps before it count as passed (no
   `completedSteps` field exists). Unreachable for 0.3.0→0.4.0 (identical step data).
3. **`config.yaml` is user-owned after init** (carries `commands.*` for readiness
   probes) — preserved on upgrade, written only if missing. Profile-owned snapshots
   (`sop/gates/artifacts/readiness-rules.yaml`) rewritten unconditionally (heals
   drift). Snapshot rendering extracted to `src/core/sop/snapshot.ts`, shared with init.
4. **CLI-only / human-only** (§4.8 — never over MCP). Misleading `ERR_SOP_VERSION`
   hints in readiness/waive/detect-version now point at `ocn sop upgrade`.
5. Audit taxonomy: `sop_version_diff_detected` + `sop_upgraded` added to
   `src/types/audit.ts` (already in docs/05 §12.15 taxonomy).
6. Default `--target` = runtime default profile (`0.3.0` today); upgrading to 0.4.0
   requires explicit `--target 0.4.0` until the 0.4.0 cutover DEC flips the default.

### Out of scope

- `ocn sop version` / `ocn sop diff` (OCN-2-SOP-VERSION backlog) and the optional
  `--plan` save file (`.ocoding/upgrade-plan-<ts>.json`).
- Runtime pin resolution for 0.1.0–0.3.0 pins (`resolveProfileForProject` still falls
  back to the default profile below 0.4.0); upgrading to 0.4.0 makes the pin honored.
- Migration framework / content transforms — the positional model makes them unnecessary
  for shipped profiles.

## DEC-030｜SOP 0.4.0 runtime cutover — readiness backbone becomes the default

Date: 2026-06-11
Executes: DEC-028 sub-decision 4 ("New SOP 0.4.0 = runtime default") / AM-004; relies on DEC-029 (`ocn sop upgrade`) as the migration path.

### Status

Accepted — implemented and tested.

### Context

The readiness engine (P0–P5) shipped and was validated by dogfooding (Lattice run);
`ocn sop upgrade` (DEC-029) gives existing projects a forward path. The remaining gap
was the cutover itself: `DEFAULT_SOP_PROFILE_VERSION` was still 0.3.0, so fresh
projects did not get the readiness gate and docs describing 0.4.0 as current would
have lied about runtime behavior.

### Decision

1. **`DEFAULT_SOP_PROFILE_VERSION` → `"0.4.0"`.** Fresh `ocn init` pins 0.4.0, writes
   `readiness-rules.yaml`, and `check`/`gate`/`advance` run the readiness
   cross-cutting gate by default.
2. **`resolveProfileForProject` honors every known pin** (previously only
   readiness-carrying pins, AM-004 minimal form). Required by the cutover: otherwise
   0.1.0–0.3.0 pins would silently fall back to the 0.4.0 default and hit the
   readiness gate without opting in. A 0.3.0-pinned repo keeps exact 0.3.0 behavior
   until the human runs `ocn sop upgrade --target 0.4.0`. This retires the AM-003
   "old pins get the default profile" migration note.
3. **Test policy.** Default-version assertions updated to 0.4.0; flow-mechanics tests
   (advance/check/gate/audit/e2e walks) pin `--sop-version 0.3.0` explicitly — they
   test the frozen profile's mechanics, not the default. 0.4.0 gate behavior is
   covered by the readiness suites.
4. Package version moves to `0.4.0-beta.0` (npm `latest` + `beta`); 0.3.0 profile
   stays frozen + importable (`ocn init --sop-version 0.3.0`).

### Out of scope

- SHIP/REFLECT steps (still stubs), `sop version`/`sop diff` (OCN-2-SOP-VERSION).
- Readiness rulebook content changes — rulebook ships as validated in the Lattice run.

## DEC-031｜Productize the Claude Code integration runbook (`ocn agent setup` + `ocn hook *`)

Date: 2026-06-12
Implements: AM-006 (`docs/amendments/2026-06-12-claude-code-agent-integration-amendment.md`)

### Status

Accepted — implemented and tested.

### Context

OCN generated agent briefs and enforced gates, but connecting them to a live
Claude Code session was a hand-maintained runbook (hooks, CLAUDE.md contract,
per-task prompt ritual). Hand-wiring drifts and gets skipped. The product
thesis — discipline must be mechanically enforced, not remembered — applies
to the integration itself.

### Decision

One idempotent command, `ocn agent setup`, wires a project; the enforcement
logic ships as OCN subcommands (`ocn hook stop|post-edit`), NOT as generated
shell scripts — upgradeable with the package, unit-testable, cross-platform.
After setup the human workflow is two actions per task: `/ocn-next` in
Claude Code, then review + `ocn advance` in the terminal.

### Sub-decisions

1. **Fail-open hooks.** Loop protection via `stop_hook_active`; uninitialized
   dirs silent; engine errors allow-with-warning. A broken hook must never
   wedge a session; `ocn check` stays the authoritative verdict.
2. **`.claude/settings.json` (shared, committed) over settings.local.json**
   — user decision: team-wide effect on clone. Hook commands carry a
   `command -v ocn` guard so teammates without ocn get silent no-ops.
3. **Merge-not-overwrite.** Ours-detection = command string contains
   `"ocn hook"`; customized variants are left untouched; unrelated keys
   never touched; no-change runs skip the write (stable mtime). Malformed
   JSON aborts before ANY write; `--force` backs up to `.bak` then rewrites.
4. **PostToolUse perf gates.** New optional `commands.lint` (any file) and
   `commands.typecheck` (TS files only) in config.yaml; advisory only —
   outside the R4 frozen readiness snapshot. 60s timeout, output tail ≤2000.
5. **Hook IO bypasses the CommandResult envelope** (raw Claude Code
   contract); documented as AM-006 divergence from docs/06 §2.5.
6. **Not exposed over MCP.** Setup writes config (human-only, like init);
   hooks are called by the agent's host process, not the model.
7. Governance content ships as OCN-owned `.claude/ocn.md` imported from
   CLAUDE.md (append-once), zh-primary with bilingual key terms.

### Out of scope

- Other agents (Cursor/Codex wiring) — `agent` command group leaves room.
- Auto-advance / autonomous looping — advance stays human-only by design.
- `ocn init --with-agent` convenience flag — possible follow-up.

## DEC-032｜Task Backbone — BUILD 态的实施任务循环（SOP 0.5.0）

Date: 2026-06-12
Implements: AM-007; full design in `docs/task-backbone-proposal.md` (accepted 2026-06-12)

### Status

Accepted — implementation authorized (P0–P3 + SOP 0.5.0 cutover).

### Context

Lattice dogfood (2026-06-12) exposed the FOURTH false-completion class —
**receipt-only completion** — and its terminal form, the **run-through**: an
entire SOP round (build receipts + verify docs, all honestly stating "no
code") passed every gate; `next-prompt` never authorized coding; the chain
nearly terminated with implementation never scheduled. Section, logic,
readiness gates and human advance all failed to stop it: the state machine
was a treadmill, not a gatekeeper.

### Decision

Convert "implementation actually happened per plan" (unverifiable) into
"every task spec's frozen verify command passed" (verifiable):

1. **Task Spec Block** in `docs/11-build-plan.md` (`## Task Specs｜任务规格`):
   per-task mini-spec `goal/traces/touches/verify/dod` (+ optional
   `depends/phase/timeout`). Splitting quality is gated BEFORE entering BUILD.
2. **Six hard defects** block the build-plan gate (exit 2): duplicate id,
   missing required field, dangling traces (AC ids via the acceptance
   parser's canonical AC-NNN form), dangling touches (logic-graph nodes),
   dangling/cyclic depends, zero tasks.
3. **Ledger** `.ocoding/task-ledger.json` written on gate pass; verify
   commands HASH-FROZEN at that moment (R4 — referee not on the player's
   write path). Done status survives regeneration only while the hash holds.
4. **`ocn task list / task check`** — completion is decided ONLY by the
   frozen verify command exiting 0 (no manual-done channel); drift → refuse
   with re-gate instruction. `task_completed` push audit.
5. **`/ocn-next` BUILD dispatch** — first pending task with cleared depends
   becomes the nine-section objective; ledger absent → legacy fallback
   (zero regression for ≤0.4.0 pins).
6. **Transition gate** — `ocn advance` out of `state_build` blocked while
   pending tasks remain: 任务台账不清，不准进 VERIFY.
7. MCP exposure: none for `task check` (runs arbitrary commands); brief
   carries the ledger summary read-only.
8. Ships as **SOP 0.5.0** (build-plan template + required section
   `section_task_specs`); 0.4.0 frozen + importable; `ocn sop upgrade`
   migrates (step set unchanged → cursor compatibility holds).

### Out of scope

- Receipt auto-generation from ledger+audit (0.6.0 candidate).
- Multi-command verify lists; task-level waivers (edit plan → re-gate).

## DEC-033｜Rewind & Cycle — 受控游标回拨与重开循环（引擎/CLI，非 SOP bump）

Date: 2026-06-12
Implements: full design in `docs/rewind-cycle-proposal.md`（accepted 2026-06-12，
含 §8 全部开放点裁决）；新命令契约面以常规 amendment 随实现落地，冻结契约
§25 不动

### Status

Accepted — implementation authorized（P0–P3）。

### Context

Dogfood（2026-06-12）暴露"游标只进不退"的三个现实缺口：(1) 0.4.0 项目
通过 build-plan 门禁后中途升级 0.5.0，游标已越过台账唯一生成点
（gate-runner 仅在 step_build_plan 写 ledger；upgrade 按 DEC-029 保留
游标），Task Backbone 本轮静默失效且无恢复路径；(2) 终点步
step_final_build_verdict 后无受控重开方式（SHIP/REFLECT 为 stub）；
(3) 手改 state.json 成为事实逃生通道——绕过锁/备份/原子写且零审计，
审计链出现不可解释的时间倒流。纪律产品不能逼用户破坏纪律。

### Decision

把不可避免的回退从体外手术变成体内受控操作——时间线永远向前，游标可以
向后：

1. **`ocn rewind --to <step> --reason <text>`**（轮内回拨）：目标步必须
   存在于当前 pin 的 profile（stateOrder/stepsForState）且严格早于当前
   游标；持锁 + 锁内 stale 检查 + 备份/原子写（与 advance 同机制）；
   push 审计 `cursor_rewind`（from/to/reason/actor/correlationId）。
   docs/ 产物一律不动；readiness waiver 按既有 state-change 语义自动
   失效；回拨后每次 advance 重过完整门禁（含 0.5.0 任务门禁）——这构成
   现场 (1) 的标准修复路径。
2. **`ocn cycle new --yes`**（跨轮重开）：归档本轮 `.ocoding` 运行时状态，
   游标归零开新一轮；docs/ 产物保留供门禁快进；审计连续性为底线
   （`cycle_started` push 事件衔接前后轮）；不复用 init 路径，
   profile 快照渲染复用 snapshot.ts。
3. **命名**：游标回拨命名 `rewind`（倒带），`reset` 名字与 `reset_executed`
   事件保留给冻结契约 §25 既有的文件删除式归零语义（回到原点）——两动词
   各归其位，§25 不取代、不修改。
4. **人类专属**：两命令均 CLI-only，MCP 白名单 7 工具不变（§2.6/§4.8——
   与 advance_phase 同类的"项目位于何处"最高权力，不交给 agent）。
5. **退出码沿用 §4.6 稳定表**，不新增码位；BilingualMessage +
   CommandResult text/--json 双渲染。
6. **非 SOP 版本升级**：状态机步骤集与门禁内容不变，不触碰 profile；
   state.json 不加字段（历史唯一载体 = 审计链），schemaVersion 不动。

### 开放点裁决（2026-06-12，与提案 §8 一一对应）

1. 台账：rewind 不动 `task-ledger.json`，重过门禁时按 DEC-032 决策 3 的
   哈希语义自动对账；实现须验证 stale 台账不会在 `state_plan` 期间误触发
   brief/next-prompt 的台账分支。
2. 归档布局：方案 A `.ocoding/cycles/<n>-<ISO-ts>/`（+ 可选 docs 摘要）；
   轮次号载体 = 归档目录名编号（零 schema 变更）。
3. 审计连续性：方案甲——审计目录不归档、跨轮连续。
4. cycle 后维持当前 pin，输出附升级提示。
5. rewind 允许跨 state 回拨，不设 `--cross-state` 旗标。
6. state.json 不加 history/cycle 字段。
7. 命名让位：见 Decision 3。
8. waiver 失效维持 state 级粒度，不为 rewind 引入事件驱动失效。
9. 终点步上 rewind 不加机器强判，文案提示与 cycle new 的分工。
10. `cycle new` 强制 `--yes`；`rewind` 不另加（强制 `--reason` 即确认）。

### Out of scope

- 契约 §25 文件删除式 `ocn reset` 的实现——`reset` 名字与 `reset_executed`
  事件保留给该语义，留待后续独立立项。
- 跨轮 docs 产物的自动失效/刷新（verify 阶段旧收据快进风险靠人 review
  与就绪检查，机器强判留作后续候选）。
- 游标历史的结构化快查字段与多轮统计报表。
