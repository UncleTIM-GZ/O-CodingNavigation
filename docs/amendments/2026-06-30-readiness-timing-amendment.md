# Amendment AM-014 — 就绪门准时激活（不提前且不缺失）

**Status**: Accepted (implemented)

## Date

2026-06-30

## Supersedes

None（additive，细化 Readiness Backbone AM-004 / DEC-028）。不改写任何 frozen `docs/0X`
契约；0.4.0/0.5.0 规则手册逐字冻结。设计全文见 `docs/readiness-timing-proposal.md`。

## 背景｜Why

Readiness Backbone（AM-004，SOP 0.4.0）的就绪门是**与状态无关**的：一条 block 检查只按
`tier_required` 决定是否要求，没有"到了某阶段才生效"的概念。后果——干净 `ocn init`（minimal 档）
在**第一步** `step_project_brief` 就被 8 条**下游**检查拦死（scope 停止条件、PRD 安全约束、
mvp-plan 阶段、CI、每条 AC 的测试、README…），全落在 SPEC/PLAN/BUILD。且所有 e2e dogfood 都
钉 `--sop-version 0.3.0`（无就绪门）绕开了它，所以这道悬崖从没被走过。

## 决议｜Decision（不提前且不缺失）

引入**准时激活**：每条 block 检查的生效状态 `dueState(rule)` = 其所有输入里**最晚到期**的 SOP 状态
（artifact 依赖 → 产出该文档的 step 所在状态；repo-probe 依赖 → 显式策略表，因探针不属任何 step）。

- **不提前**：`currentState < dueState` → 新判定 `DEFERRED`，不阻断；在 `ocn brief` 以
  "Forthcoming｜将到期 (not due until …)"、在 `ocn readiness list` 以 `[DEFERRED]` 前瞻显示
  （绝不静默隐藏）。
- **不缺失**：`currentState ≥ dueState` 起**每一关持续强制**（FAIL/UNKNOWN 阻断），到期即连续阻断
  直到满足——无法跨过；项目带着未满足的 block 项**到不了 VERIFY**。
- **失效安全**：任一依赖无法解析 → `dueState=null` → 该规则**不延迟**（从第一关强制 = 改前行为）。
  宁可早判，绝不漏判。

## 实现｜How（引擎向后兼容；未打标签的规则手册行为逐字不变）

- `ReadinessVerdict` 增 `DEFERRED`；`ReadinessRulebook` 增顶层开关 `precise_activation`；
  `ReadinessRule` 增可选 `enforced_from`（显式覆盖，缺省走派生）。
- `src/core/readiness/due-state.ts`：`dueStateForRule` / `computeEnforcedFromMap`（纯函数，
  复用 `profile.stepsForState`/`artifactPathForStep` + glob 别名 + repo-probe 策略表）。
- 门层 `readiness-gate.ts` 用 profile 算出 `enforcedFromByRule` 传入演进器（演进器保持 profile 无关）；
  阻断过滤 `block && (FAIL||UNKNOWN)` 一行不动——`DEFERRED` 天然不阻断。
- 规则手册：0.7.0 断开对 0.4.0 的 re-export，自带 `precise_activation: true`+0.4.0 内容；
  0.4.0/0.5.0 不带开关 → 行为不变。
- 重复探针状态策略（git/build/test/ci/readme/… → `state_build`）。

## 验收｜Acceptance（已验证）

- 单元：`readiness-due-state.test.ts`（8 条规则派生出 state_spec/state_plan/state_build；
  warn 规则不入图；0.5.0 无开关 → 空图）。
- e2e：`readiness-precision-walkthrough.test.ts`（**默认 0.7.0、minimal 档、真 advance**）——
  不提前（DISCOVERY 8 条 DEFERRED → 过）+ 不缺失（SPEC 处 cio_cto/ciso/ba 复活阻断、游标不动、
  plan/build 仍 DEFERRED）。**填补了 dogfood 从不走就绪门的盲区。**
- 全量 1302 测试 + lint + typecheck 绿；0.4.0/0.5.0-pinned 行为逐字不变。
- 实测：干净 `ocn init` → `ocn advance` 直接跨 DISCOVERY→SPEC；`ocn brief` 列出 8 条 Forthcoming。

非 SOP bump（沿 AM-008/009 引擎/CLI 先例）；MCP 白名单 7 工具不变。
