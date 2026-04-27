# O'CodingNavigator Decision Log

文档路径：`docs/19-decision-log.md`
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
