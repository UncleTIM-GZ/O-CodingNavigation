# PDF SOP vs Shipped SOP — Consistency Audit｜PDF 版 SOP 与发布版 SOP 一致性审计

> Doc-only report. No source / tests / package / workflow / DEC-log changes.
> No SOP profile version bump. No `npm publish`. No `latest` movement.
> No GA promotion. No Cursor / Cline support claim.

---

## 1. Summary｜摘要

| Field | Value |
|---|---|
| Date | 2026-05-02 |
| Branch | `docs/pdf-vs-shipped-sop-audit` |
| Source A — PDF | `docs/AI Coding 最佳实践开发 SOP完整版.pdf` (Tim O · 2026-04, 48 pages, 13 chapters, 6 layers, 29 numbered steps, 26 documents `00–25`) |
| Source B — shipped SOP | `src/sops/default-ai-coding-sop/0.1.0/data.ts` (8 states, 10 wired steps, 10 wired artifact paths `00–09`, 5 step types with required-section gates) |
| Verdict | **Partial consistency**: doc numbering 00–09, state names, and DISCOVERY → PLAN coverage match. PDF §10–§29 / docs `10–25` are **not yet wired** as steps in the shipped SOP profile (intentional, per CLAUDE.md §10 / `docs/01-scope.md` / `docs/08-mvp-plan.md`). Required-section gates in the shipped SOP are looser than the PDF's recommended structures. |

**Verdict — bilingual one-liner**:
- **EN**: PDF chapters 1–9 are honored end-to-end in the shipped SOP for documents `00–09`; PDF chapters 10+ (协作层 / 演化层 / docs `10–25`) remain aspirational in v1.0 and are partially carried by cross-cutting obligations rather than by wired steps.
- **中文**: PDF 第 1–9 章对应的文档 `00–09` 在发布版 SOP 中已端到端落地；PDF 第 10 章及之后（协作层 / 演化层 / 文档 `10–25`）在 v1.0 中尚未 wire 成 step，部分由横切义务承接。

---

## 2. Source materials｜参考来源

- PDF: `docs/AI Coding 最佳实践开发 SOP完整版.pdf` —— author Tim O · Pudding Bot Data Science · 2026-04. Local copy used for this audit; the PDF itself is not committed in this PR.
- Shipped SOP profile (single source of truth):
  - `src/sops/default-ai-coding-sop/0.1.0/data.ts` (`PROFILE_ID`, `PROFILE_VERSION`, `STATE_DEFS`, `STEPS_BY_STATE`, `REQUIRED_SECTIONS_BY_STEP`)
  - `src/sops/default-ai-coding-sop/0.1.0/sop.ts` / `gates.ts` / `artifacts.ts` / `render.ts` / `config.ts`
- Repository governance:
  - `CLAUDE.md` §4 (hard rules), §5 (state machine + cross-cutting obligations), §10 (current scope)
  - `docs/00-project-brief.md`, `docs/01-scope.md`, `docs/08-mvp-plan.md`

---

## 3. Document numbering — fully consistent (00–09)｜文档编号 00–09 完全一致

| # | PDF document | Shipped `artifactPath` | Match |
|---|---|---|---|
| 00 | `project-brief.md` | `docs/00-project-brief.md` | ✅ |
| 01 | `scope.md` | `docs/01-scope.md` | ✅ |
| 02 | `prd.md` | `docs/02-prd.md` | ✅ |
| 03 | `acceptance-criteria.md` | `docs/03-acceptance-criteria.md` | ✅ |
| 04 | `technical-architecture.md` | `docs/04-technical-architecture.md` | ✅ |
| 05 | `information-architecture.md` | `docs/05-information-architecture.md` | ✅ |
| 06 | `data-model.md` | `docs/06-data-model.md` | ✅ |
| 07 | `api-contract.md` | `docs/07-api-contract.md` | ✅ |
| 08 | `test-strategy.md` | `docs/08-test-strategy.md` | ✅ |
| 09 | `mvp-plan.md` | `docs/09-mvp-plan.md` | ✅ |

State names also align: DISCOVERY / SPEC / DESIGN / PLAN / BUILD / VERIFY / SHIP / REFLECT.

---

## 4. Layer model — same spirit, different granularity｜层级模型：精神一致，颗粒度不同

| PDF (6 layers) | Shipped (8 states) | Note |
|---|---|---|
| 定义层 (Definition) | `state_discovery` + `state_spec` | PDF folds problem framing + PRD/AC into one layer; shipped SOP splits into two states. |
| 设计层 (Design) | `state_design` | 1 ↔ 1. |
| 闭环层 (Closure) | `state_plan` | Shipped SOP only wires the MVP plan step. PDF §11–§14 (real-data-wiring / config / reproducibility / rollback) are not state_plan steps. |
| 验证层 (Verification) | `state_verify` | No steps wired in v1.0. |
| 协作层 (Collaboration) | `state_build` / `state_ship` | PDF treats this as cross-cutting concerns (PR / dev-log / decision-log / observability / audit-trail / uncertainty / bugfix). Shipped SOP routes most of these through CLAUDE.md §5 obligations. |
| 演化层 (Evolution) | `state_reflect` | No steps wired in v1.0. |

This is a deliberate design choice — both ends up enforcing the same DISCOVERY → DESIGN docs in v1.0; the divergence appears once a project reaches BUILD.

---

## 5. Step coverage — `state_build` / `state_verify` / `state_ship` / `state_reflect` are stubs｜v1.0 未 wire 的 step

`STEPS_BY_STATE` in `src/sops/default-ai-coding-sop/0.1.0/data.ts` (lines 78–102):

```ts
state_build:   [],
state_verify:  [],
state_ship:    [],
state_reflect: [],
```

This means the following PDF sections / documents currently have **no `stepId`, no `artifactPath` registration, and no required-section gates** in the shipped SOP profile:

| PDF section | PDF doc | Shipped status |
|---|---|---|
| §10 最小闭环 | `09-mvp-plan.md` | ✅ wired (state_plan / step_mvp_plan) |
| §11 真数据接线 | `10-real-data-wiring.md` | ⚠️ doc number reserved; no step |
| §12 配置外置 | `11-config-and-env.md` | ⚠️ doc number reserved; no step |
| §13 可复现 | `12-reproducibility.md` | ⚠️ doc number reserved; no step |
| §14 回滚路径 | `13-rollback-plan.md` | ⚠️ doc number reserved; no step. CLAUDE.md §5 lists `obligation_rollback_awareness` (cross-cutting). |
| §15 小样本验证 | `14-validation-report.md` | ⚠️ doc number reserved; no step |
| §16 问题分层 | `15-debug-report.md` | ⚠️ doc number reserved; no step |
| §17 修输入再修推理 | `15-debug-report.md` (shared) | ⚠️ no step |
| §18 baseline | `16-baseline.md` | ⚠️ doc number reserved; no step. CLAUDE.md §5 lists `obligation_baseline_tracking`. |
| §19 能用性验收 | `14-validation-report.md` / `17-release-notes.md` | ⚠️ doc number reserved; no step |
| §20 小步提交 | PR / `19-dev-log.md` | ⚠️ no step. CLAUDE.md §5 lists `obligation_dev_log`. |
| §21 研究线/生产线分开 | `18-research-log.md` | ⚠️ no step. CLAUDE.md §5 lists `obligation_research_log`. |
| §22 修 bug 再优化 | `19-dev-log.md` | ⚠️ no step (cross-cutting via dev-log) |
| §23 不确定性 | `25-uncertainty-policy.md` | ⚠️ no step. CLAUDE.md §5 lists `obligation_uncertainty_policy`. |
| §24 可观察性 | `21-observability.md` | ⚠️ no step (mentioned in `state_ship` purpose only). |
| §25 审计链 | `22-audit-trail.md` | ⚠️ no step gate, but **mechanically active** — `safeAudit()` writes JSONL + markdown on every push event (`obligation_audit_trail`). |
| §26 真实场景观察 | `23-evolution-report.md` | ⚠️ no step |
| §27 离线研究 | `18-research-log.md` (shared) | ⚠️ no step |
| §28 长期证据 | `23-evolution-report.md` (shared) | ⚠️ no step |
| §29 AI 加速器治理 | `24-ai-governance.md` | ⚠️ no step. CLAUDE.md §5 lists `obligation_ai_governance_brief`. |

This is intentional and documented:

- `CLAUDE.md` §10 lists `production / full tier artifact-set enforcement` as deliberately deferred.
- `docs/01-scope.md` §5.7 ties tier definitions to the v1.0 minimum.
- `docs/08-mvp-plan.md` §3 scopes the Skeleton Spike to DISCOVERY → PLAN only.

But the PDF reader will expect the full 29-step / 26-doc rigor; the shipped SOP delivers only the first 10 step / 10 doc segment with hard gates.

---

## 6. Required sections — shipped gates are looser than PDF guidance｜必填章节对比

The shipped SOP gates only the canonical sections needed to detect false-completion, not every field the PDF lists as recommended document content.

| Doc | PDF recommended fields / structure | Shipped required-section IDs (count) |
|---|---|---|
| `00-project-brief.md` | 13 fields (项目名称 · 一句话目标 · 要解决的真实问题 · 目标用户 · 核心使用场景 · 当前痛点 · 输入是什么 · 输出是什么 · 边界条件 · 第一版成功标准 · 暂不解决的问题 · 关键假设 · 主要风险) | **4** — `section_problem`, `section_goal`, `section_users`, `section_success_criteria` |
| `01-scope.md` | 9 items (本版本必须做 · 可以做 · 暂缓做 · 明确不做 · 风险功能 · 后续版本候选 · 停止开发的边界 · 本轮完成条件 · 当前版本目标) | **4** — `section_in_scope`, `section_out_of_scope`, `section_technical_constraints`, `section_completion_boundary` |
| `02-prd.md` | 14 fields + 12-section recommended structure (背景和问题 / 目标用户 / 使用场景 / 核心用户故事 / 功能需求 / 业务规则 / 权限规则 / 异常场景 / 非功能需求 / 本期范围 / 不做事项 / 验收前置条件) | **5** — `section_problem`, `section_goals`, `section_users`, `section_scenarios`, `section_requirements` |
| `03-acceptance-criteria.md` | 11 fields (功能名称 · 前置条件 · 给定输入 · 执行动作 · 预期结果 · 失败条件 · 异常处理 · 权限要求 · 数据保存要求 · 日志记录要求 · 暂不处理的情况) + Given/When/Then 示例 | **3** — `section_acceptance_rules`, `section_given_when_then`, `section_failure_conditions` |
| `04-technical-architecture.md` | **12 sections** (01 Product Form · 02 Runtime · 03 Language · 04 Frameworks · 05 Storage · 06 Integration · 07 Deployment Form · 08 Non-goals · 09 Decision Matrix · 10 Constraints · 11 Risks · 12 Final Decision) | **5** — `section_product_form`, `section_runtime`, `section_language`, `section_storage`, `section_final_decision`. **Missing**: Frameworks, Integration, Deployment Form, Non-goals, Decision Matrix, Constraints, Risks. |
| `05-information-architecture.md` | 9 items + 5 recommended diagrams | **0** — file-existence check only (`data.ts:264-267`) |
| `06-data-model.md` | 12 items + ERD / state-transition / field dictionary diagrams | **0** — file-existence check only |
| `07-api-contract.md` | 14 items + `openapi.yaml` / `swagger.json` artifacts optional | **0** — file-existence check only |
| `08-test-strategy.md` | 13 items + 5-row test-type matrix | **0** — file-existence check only |
| `09-mvp-plan.md` | 11 items + 8-section recommended structure | **0** — file-existence check only |

The shipped policy ("minimum gating, not maximum requirements") is a deliberate v1.0 trade-off — `ocn check` / `ocn gate` aim to detect "false-completion" rather than enforce comprehensive document templates. The PDF expects more.

---

## 7. Gate philosophy — milestone-grouped vs step-by-step｜门禁形态不同

PDF chapter 12 ("文档门禁规则") groups documents by milestone:

- 写代码前必须有：`project-brief.md` `scope.md` `prd.md` `acceptance-criteria.md` `technical-architecture.md`
- 联调前必须有：`data-model.md` `api-contract.md` `test-strategy.md`
- 主链路验证前必须有：`mvp-plan.md` `real-data-wiring.md` `reproducibility.md`
- 合并 PR 前必须有：`dev-log.md` `test-result` `rollback-plan` `PR summary`
- 上线 / 交付前必须有：`baseline.md` `validation-report.md` `observability.md` `audit-trail.md` `release-notes.md`

Shipped OCN gates are **per-step**: `ocn advance` checks the current step's single artifact and its required sections. There is no "milestone group" gate that fails when, say, `dev-log.md` is missing before a PR merge.

For DISCOVERY → DESIGN this difference is invisible because the per-step chain enforces the same docs as the milestone group. For BUILD onward (where `dev-log` / `decision-log` / `audit-trail` / `observability` / `rollback-plan` / `baseline` / `release-notes` live) the shipped SOP relies on:

- cross-cutting obligations (CLAUDE.md §5)
- audit emission via `safeAudit()` (always-on after `ocn init`)
- `ocn brief` / `navigator.brief` reminders (pull-mode)

…rather than hard `ocn advance` gates.

---

## 8. PRD §12 "验收前置条件" — relocated to AC｜PRD §12 "验收前置条件"

PDF's recommended PRD structure §12 is "验收前置条件 (Acceptance Pre-conditions)". The shipped PRD gate has no such section because the project moves all acceptance content to `03-acceptance-criteria.md` (a dedicated step in `state_spec`).

This is consistent with PDF §4 ("先写验收标准") which itself describes a separate `acceptance-criteria.md` document; the duplication of "验收前置条件" inside the PRD is purely a recommended structure cue in the PDF, not an enforced second copy.

---

## 9. Cross-cutting obligations — present in CLAUDE.md, not in SOP profile｜CLAUDE.md 中已有，但未进入 SOP profile

CLAUDE.md §5 enumerates 9 cross-cutting obligations:

| Obligation | Activates at | PDF mapping | Mechanism today |
|---|---|---|---|
| `obligation_audit_trail` | first push event after `ocn init` | §25 审计链 | `safeAudit()` (active) |
| `obligation_decision_log` | manual capture | §25 审计链 (decision-log) | `docs/20-decision-log.md` (manual) |
| `obligation_sop_version_detection` | after `ocn init` | — | `navigator.detect_sop_version` (active) |
| `obligation_ai_governance_brief` | first `ocn brief` | §29 AI 加速器治理 | `ocn brief` (active) |
| `obligation_dev_log` | enter `state_build` | §20 小步提交 / §22 修 bug 再优化 | `ocn log` / `navigator.capture_log` (manual) |
| `obligation_rollback_awareness` | enter `state_plan` | §14 回滚路径 | reminder only; no gate |
| `obligation_baseline_tracking` | first baseline created | §18 baseline | `ocn baseline` deferred (CLAUDE.md §10) |
| `obligation_research_log` | enter `state_build` or manual | §21 / §27 研究线 / 离线研究 | `ocn log --type research` (manual) |
| `obligation_uncertainty_policy` | artifact exists or enter SHIP | §23 不确定性 | reminder via `ocn brief` |

Mechanism is partial: audit trail and SOP-version detection are mechanically active; the other obligations are reminders or manual flows without `ocn advance`-level enforcement.

---

## 10. Findings｜结论

### 10.1 Consistent ✅

1. Document numbering `00–09` matches exactly between PDF and shipped SOP.
2. State names (DISCOVERY / SPEC / DESIGN / PLAN / BUILD / VERIFY / SHIP / REFLECT) match.
3. PDF §1–§10 (定义层 + 设计层 + §10 最小闭环) are end-to-end gated by `ocn check` / `ocn gate` / `ocn advance`.
4. PDF's "false-completion" thesis (§4 验收标准, §12 文档门禁规则) is preserved by shipped required-section gates on the 5 wired step types.

### 10.2 Divergent ⚠️

1. **PDF §10–§29 / docs `10–25` are not wired as steps.** `state_build` / `state_verify` / `state_ship` / `state_reflect` are intentional v1.0 stubs.
2. **Required-section gates are tighter in the PDF than in the shipped SOP** for `02-prd.md`, `03-acceptance-criteria.md`, and `04-technical-architecture.md`. `05–09` have no required-section gates at all (file-existence only).
3. **PDF technical-architecture has 12 sections; shipped SOP gates 5.** Missing: Frameworks, Integration, Deployment Form, Non-goals, Decision Matrix, Constraints, Risks.
4. **PDF gate philosophy is milestone-grouped; shipped SOP is per-step.** For BUILD onward, the shipped enforcement is via cross-cutting obligations rather than `ocn advance` gates.
5. **PRD recommended structure §12 "验收前置条件"** is intentionally relocated to `03-acceptance-criteria.md` — clarification, not divergence.

### 10.3 Severity rating

| Finding | Severity | Note |
|---|---|---|
| 10.2.1 (BUILD/VERIFY/SHIP/REFLECT step gap) | Major (intentional) | Acknowledged in CLAUDE.md §10. Not a regression; future SOP minor/major bump territory. |
| 10.2.2 (loose required-section gates on `02-prd` / `03-AC`) | Minor | Could be tightened in a future SOP minor bump. |
| 10.2.3 (technical-architecture only gates 5 of 12 PDF sections) | Minor → Moderate | The 7 missing sections (esp. Constraints / Non-goals / Risks) are exactly the false-completion guardrails the PDF designs for. Worth tightening before GA. |
| 10.2.4 (per-step vs milestone-group gate philosophy) | Minor | Mechanism difference; both prevent the same DISCOVERY → DESIGN failures. Becomes meaningful at BUILD onward. |
| 10.2.5 (PRD §12 relocation) | Informational | Documentation-cleanup only. |

**No P0 / P1 finding.** Shipped behaviour does not contradict the PDF; it implements a strict subset.

---

## 11. Recommendations (NOT executed in this PR)｜建议（本 PR 不执行）

These are recorded for a future SOP version bump (per CLAUDE.md §4.2 — renaming or adding stable IDs is an SOP-version-breaking change).

1. **Wire BUILD / VERIFY / SHIP / REFLECT step ids** for the cross-cutting obligations that are most prone to silent omission: `obligation_baseline_tracking`, `obligation_rollback_awareness`, `obligation_observability`, `obligation_uncertainty_policy`, `obligation_ai_governance_brief`. Each new step needs a stable `step_*` id, an `artifactPath`, and required sections. SOP `0.2.0`.
2. **Tighten `04-technical-architecture.md` required sections** to include `Frameworks`, `Integration`, `Deployment Form`, `Non-goals`, `Decision Matrix`, `Constraints`, `Risks`. SOP `0.1.x` (additive sections; could be a minor bump if treated as new gate, or `0.2.0` if treated as breaking).
3. **Add required-section gates** to `05-information-architecture.md` / `06-data-model.md` / `07-api-contract.md` / `08-test-strategy.md` / `09-mvp-plan.md` so they no longer pass on file-existence only.
4. **Add a "milestone-group gate" CLI shortcut** (e.g. `ocn gate --milestone before-code` / `before-merge` / `before-release`) that aggregates per-step results into PDF-style milestone groups.
5. **Either embed a "验收前置条件" section in the PRD gate** or update the PDF to remove that bullet from the recommended PRD structure (point readers to `03-acceptance-criteria.md`). Smaller change is the PDF update.

Each of items 1–4 requires a DEC entry, an SOP profile version bump, a `CHANGELOG.md` update under `src/sops/default-ai-coding-sop/<version>/`, and the migration story for projects already locked to `0.1.0`.

---

## 12. Non-goals｜本 PR 不做

This PR explicitly does **not**:

- bump the SOP profile version (still `default-ai-coding-sop@0.1.0`)
- add or rename any state / step / section / artifact / obligation stable id
- modify `src/`, `tests/`, `package.json`, `package-lock.json`, `.github/workflows`, or any active user-facing doc (`README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`, `docs/20-decision-log.md`)
- run `npm publish`, move `latest`, create a new git tag, or create a new GitHub Release
- promote to GA
- claim Cursor / Cline support

The only file added by this PR is this report:
`docs/reports/2026-05-02-pdf-vs-shipped-sop-consistency-audit.md`.
