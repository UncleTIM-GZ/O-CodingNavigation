---
title: "Outcome Backbone P4 — SOP 0.9.0 上电（profile + SHIP/REFLECT + 迁移 + 发布）"
type: feat
status: active
date: 2026-07-03
origin: docs/plans/2026-07-03-outcome-backbone-p4-implementation-spec.md
---

# ✨ Outcome Backbone P4 — 让一切上电（Activate SOP 0.9.0）

## Overview

P1–P3 已把 Outcome Backbone 的全部机件造好，但**全部休眠**：`requiresOutcome(v)` 门槛是 `0.9.0`，而 runtime 默认与最高 profile 都还是 `0.8.0` —— 于是 SPEC 门、激活、VERIFY→SHIP 守卫全部在 `<0.9.0` 下 no-op（已实测：`src/core/outcome/pin.ts:24` `OUTCOME_MIN_VERSION = "0.9.0"`，当前无 0.9.0 profile，`requiresOutcome` 恒 false）。

**P4 = 上电**：新增 `0.9.0` profile → P3 的休眠门全部激活；OCN 状态机**首次越过** `step_final_build_verdict`，落地 SHIP（`step_release`）与 REFLECT（`step_evolution_report`）两步，并补齐 P3 遗留（next-prompt 派发、`no_tasks` 放宽、投影 v2 pin 感知），加迁移 `ocn sop upgrade 0.8.0→0.9.0`，最后 human-gated 发布 `0.9.0-beta.0`。

> 本计划是实现规格 [`2026-07-03-outcome-backbone-p4-implementation-spec.md`](2026-07-03-outcome-backbone-p4-implementation-spec.md) 的可执行化改写，锚点已于 2026-07-03 二次实测校正（见 §"锚点校正"）。规格是权威来源；两者冲突时以本计划中标注 **[实测校正]** 的条目为准。

## Enhancement Summary（深化 2026-07-03）

**Deepened on:** 2026-07-03 · **Reviewers:** architecture-strategist · code-simplicity-reviewer · silent-failure-hunter · data-integrity-guardian · spec-flow-analyzer（5 并行）

### 三个 CRITICAL（改前必修，已整合进对应 Phase）
1. **[C-1｜fingerprint 漏第三/第四处 `nextStep`]** `grep '\.nextStep('` 实为 **4 处**，非 2 处。漏掉 `src/core/prompt/generate-next-prompt.ts:88/95`——它是**白名单 MCP 工具 `navigator.generate_next_prompt` 的函数体**，且喂 auto-mode 委托（`:96-100`）。默认翻 0.9.0 后，0.8.0-pin 项目问 MCP 会被告知下一步是 `step_release`——AC-15 泄漏在 MCP 面重新打开。→ Phase A 扩 fingerprint。
2. **[C-2｜默认翻转与门禁的合并顺序倒置]** 默认翻转在 P4a、SHIP/REFLECT 门在 P4b → 中间窗口里**新建的 0.9.0 项目**能 advance 进**无门** SHIP（正中 null-artifact 早返回 pass 陷阱）。→ **默认翻转移到 P4b 最后一个 commit**（PR 表已改）。
3. **[C-3｜`ledger===null` = legacy pass 是一删文件即绕过全product]** 三处（`outcome-ledger-guard.ts:38`、`outcome-integrity.ts:111`、`readOutcomeLedger` 对 缺失/JSON坏/zod坏 都返回 null）把"台账不存在"与"无 backbone"混为一谈。`rm outcome-ledger.json` 即让 SHIP/advance 静默放行——正是第六类假完成本身。→ Phase C 增独立信任源核对。

### HIGH（已整合）
- **[H-1｜迁移 seed 顺序 + 死锁]** Phase F 的一句"台账种子"欠规格：必须 **snapshots→seed→pin** 顺序（pin-before-seed 因 noop 守卫**永久损坏**）；seed 的投影能力取自 **target profile**（非持久化 pin，否则出 v1 空投影→seed 失败）；seed 用**未加锁写入器**（公共 `writeOutcomeLedger` 自带 `withLock` 同一 `.ocoding/.lock` → 非重入 → 自死锁）；"已存在跳过"改为"**解析有效**才跳过"（否则保留上次半损坏台账）。→ Phase F 重写。
- **[H-2｜两套 next-prompt 实现分叉]** CLI 走 `execution-navigator/next-prompt.ts`，MCP 走 `core/prompt/generate-next-prompt.ts`。§E.1 只扩前者 → 后者既缺 pin 修复又缺 outcome 派发。→ Phase A/E 把 `core/prompt` 纳入同步清单（四处，非三处）。
- **[H-3｜display 消费者翻转后 pin-blind]** `brief.ts:96`、`status.ts:52`、`doc.ts:47` 用 `loadSopProfile()`（默认非 pin）。翻转后 0.8.0-pin 项目 `ocn brief/status` 会渲染 0.9.0 结构/治理。→ Phase A 逐点处置（迁 pin 或注明可接受）。
- **[H-4｜auto-mode × SHIP/REFLECT 未规格化（代码已分叉）]** `authorization.ts` 已把 `PHASE2_STATES={build,verify}`，`authorizeAiAdvance` 已**拒绝** ai_agent 进 SHIP/REFLECT。计划无 phase/AC/test。→ 新增 §"Auto-mode 边界"。
- **[H-5｜`docs/23` 双占]** CLAUDE.md §5 已把 **23 分给 ai-governance**；本计划又把 evolution-report 勘正到 23 → 冲突。→ 新增编号裁决（见 §发布）。

### MEDIUM/简化（已整合）
- **[简化]** 删 `SopProfile.acceptanceProjectionVersion` 字段（＝`requiresOutcome(v)?2:1`，纯冗余，派生即可）；删 `next-prompt-priority.ts`（一个 `if` 不配独立模，内联）；`no_tasks` 谓词收紧为 **≥1 未豁免 outcome AC**；三处派发文案抽**单一导出常量**（根因消除而非三测兜底，合"根因修复"偏好）。
- **[数据完整性]** `measurementId` 必须内嵌 round/nonce（跨轮 seq 重置，否则依赖 round-scope 过滤才不碰撞）；REFLECT parser 必须 **total（永不 throw）** 且 step-fn 包裹 evaluate → `io_error`→blocked；audit 永不归档 → 任一历史轮损坏行**永久 brick** 当前轮 reconcile（`chain_broken`）→ 加 per-`cycle_started` 校验点 或 明确接受风险。
- **[无泄漏真因，架构 Q4]** cycle 后无泄漏的真正不变量是 **reconcile 的 round-scope**（回扫到最近 `cycle_started`），非游标位置；e2e §7.2 须断言"二轮 SHIP reconcile 在 log 仍含一轮事件时通过"。
- **[P3a 排序]** SHIP 闭包**必然**给已 524 行的 runner 加行（闭包定义在 `runGate` 内、两分支调用）→ **P3a 应排在 P4b 之前**（或在 amendment 明确接受 runner 超限回归）；不再"排序自由"。
- **[范式引用勘误]** SHIP 闭包照 **runner 内既有 `contractDriftOrNull` 惯用法**（定义一次、null-artifact 分支 `:207` 与正常分支 `:500` 两处调用、内部 `state` 自守卫），而非某个 `contract-gate-step.ts` 文件名。

### 尾部风险（新增测试/说明，非阻断）
rewind × outcome-ledger（`prev≠null` reconcile 路径未测）；outcome FAIL-waiver 跨 VERIFY→SHIP 状态变更的存活语义（readiness 是 expire-on-state-change）；`brief/status` 在 SHIP/REFLECT 的当前位置渲染；旧 0.8.0 项目已冻结的 stray 台账清理。

## Problem Statement / Motivation

Outcome Backbone 关的是**第六类假完成——过程完备式**：任务台账全绿、门全过、却没有任何"这东西真的达成了目标"的可验证数字。P1–P3 造了台账/probe/冻结契约/SPEC 门/守卫，但只要没有 0.9.0 profile，这一切对真实项目零作用。P4 是从"代码就位"到"产品生效"的**唯一一跳**，且这一跳有一个**必须最先拆的引信**（§Phase A 的 P4-0）：默认版本一翻，所有 0.8.0-pinned 老项目会用 0.9.0 的 `nextStep` 越过自己被冻结的终点。

## Proposed Solution（高层）

按依赖顺序分三条 PR（外加一条可插队的等价重构）：

1. **P4a（引信 + profile + pin 感知）**：先修 `nextStep` 按 pin 解析（引信），再加 0.9.0 七件套 profile + loader 注册 + 默认翻转 + 投影 v2 pin 感知 + 终点断言迁移。
2. **P4b（SHIP/REFLECT + P3 遗留 + 迁移 + e2e）**：SHIP 闭包门、REFLECT 引用核对门 + References 解析器、cycle 归档补一行、next-prompt 派发优先序、`no_tasks` 放宽、`sop upgrade` 迁移（含台账种子）、从零 0.9.0 e2e。
3. **P3a（可插队）**：gate-runner 字节等同分解（524 行超限），验收 = 现测试套件 0 改动全绿。
4. **发布（human-gated）**：npm `0.9.0-beta.0` + GitHub release + amendment AM-016/DEC-042 + 文档勘正。

## 锚点校正（2026-07-03 二次实测 · [实测校正]）

| 规格假设 | 实测 | 对计划的影响 |
|---|---|---|
| `advance-state.ts:140` 需引入 `resolveProfileForProject` | 已 import（`advance-state.ts:11`，用于 outcome-guard `:181`）；`nextStep` 在 **`:141`** | §A P4-0 只是**换调用**，不加 import；`advance-automation.ts:36` 只 import 了 `loadSopProfile`，**需加 import** |
| `state_ship: []` / `state_reflect: []` 定义在 0.8.0/data.ts | 0.8.0/0.7.0 data 文件里**无此定义**；`STEPS_BY_STATE` 从 `STEPS_BY_STATE_050`（0.5.0 基常量）整体继承 | §B profile：0.9.0 shallow-copy 的**源是 0.5.0/data.ts 的 `STEPS_BY_STATE_050`**（实现时先定位空数组真身），再替换 ship/reflect 两键。规格 §2 的浅拷贝-替换手法不变 |
| gate-runner:93 用 `resolveProfileForProject` | 实为 **`:99`** `opts.profile ?? resolveProfileForProject(...)` | 照此改 §A |
| gate-runner null-artifact 早返回 `198-223` | 实为 **`202-229`**（`status:"not_applicable"` 于 `:228`） | §C SHIP 闭包接入点 |
| `buildAcceptanceProjection` pin-blind | 确认（`acceptance-spec-store.ts:38-49`，仅看 `hasOutcome`，无版本判断） | §E 投影 v2 pin 感知照做 |
| `archiveMoveSources` 未含 outcome-ledger | 确认（`cycle/archive.ts:28`，14 个路径无 `outcomeLedgerFile`） | §D cycle 补一行 |
| loader 默认 0.8.0 | 确认（`loader.ts:300` `DEFAULT_SOP_PROFILE_VERSION="0.8.0"`；union `:109` 无 0.9.0；`PROFILE_SOURCES` `:125`） | §B 注册 + 翻默认 |
| 缺陷码 `zero_tasks` | 实为 **`no_tasks`**（勘误①，规格已修正） | §G 用 `no_tasks` |
| gate-runner 行数 | **524 行**（超 300 限） | §H 分解为独立 PR |

关键既有件（复用，勿重造）：`evaluateOutcomeGuard`＝`advance/outcome-ledger-guard.ts:33`；`reconcileLedgerWithAudit`＝`outcome/outcome-integrity.ts:106`；`reconcileFrozenContracts`＝`outcome/outcome-ledger-store.ts:159`；`requiresOutcome`＝`outcome/pin.ts:27`；`outcomeLedgerFile`＝`paths.ts:33`（已存在）。

## Technical Approach

### Phase A — P4-0 引信：`nextStep` 按 pin 解析（**必须是 P4a 第一 commit，测试先行**）

> **AC-15 的命根。** 今天所有 profile 终点相同（`step_final_build_verdict`→null），bug 不可见；默认一翻 0.9.0，0.8.0-pinned 项目会用 0.9.0 的 `nextStep` 算出 `step_release` 并越过被冻结的终点。

**改动（fingerprint = `grep -rn '\.nextStep(' src/`，实测 4 处 [C-1]）**
- `src/core/advance/advance-state.ts:141`：`loadSopProfile().nextStep(...)` → `resolveProfileForProject(state.project.sopProfileVersion).nextStep(...)`（import 已在）。
- `src/core/advance/advance-automation.ts:36`：同上；**并在 `:10` 加** `resolveProfileForProject` import。
- **`src/core/prompt/generate-next-prompt.ts:88/95`（[C-1]，MCP 面）**：`:88` `loadSopProfile()` → pin 解析；`:95` `profile.nextStep(...)`；连带 `:89-90` 的 `requiredSectionsForStep`/`artifactPathForStep` 也改用 pin profile。此函数是白名单 MCP 工具 `navigator.generate_next_prompt`（`src/mcp/tools/generate-next-prompt.ts:2`）的函数体且喂 auto-mode 委托（`:96-100`）——不修则泄漏在 MCP 面重开。
- `nextStepFor`（`state-machine.ts:17`）接收 `profile` 入参、`src/` 内**无调用者**，惰性无需动（架构 Q2）。

**[H-3] display/create 消费者逐点处置**（翻转后 `loadSopProfile()` 变 pin-blind）：`brief.ts:96`、`status.ts:52`、`doc.ts:47` —— 逐个决定「迁 `resolveProfileForProject`」或「注明 default 可接受（0.9.0 ⊇ 0.8.0 步 1–19，display-only）」。P4a 内给出显式处置表，不留隐式默认。

**测试（翻默认前就要绿）** `tests/unit/advance-nextstep-pin.test.ts`
- 伪造 loader 默认＝0.9.0、项目 pin＝0.8.0、光标停 `step_final_build_verdict` → `advance` **与** `navigator.generate_next_prompt` **都**仍视 `step_final_build_verdict` 为终点（no next）。
- 断言：manual advance / auto-mode phase2 advance / MCP next-prompt 对同一 pin 算出**同一** next（**四**调用点不再分叉）。

### Phase B — 0.9.0 profile（七件套）+ loader + 默认翻转 + 投影 pin 感知

**新目录** `src/sops/default-ai-coding-sop/0.9.0/`，照 0.8.0 继承 0.7.0 的写法：
- `data.ts`：继承 0.8.0 全量；**唯二增量**——
  ```ts
  // 先定位 STEPS_BY_STATE_050 中 state_ship/state_reflect 空数组真身（实测在 0.5.0/data.ts）
  const STEPS_BY_STATE_090 = {
    ...STEPS_BY_STATE_080,               // 浅拷贝，勿改冻结引用
    state_ship:    [{ stepId: "step_release",          artifactPath: null }],
    state_reflect: [{ stepId: "step_evolution_report", artifactPath: "docs/23-evolution-report.md" }],
  };
  export const PROFILE_VERSION = "0.9.0";
  ```
  `precise_activation` 随 readiness rulebook 继承。
- `loader.ts`（`src/core/sop/loader.ts`）：`SopProfileVersion` union（`:109`）加 `"0.9.0"`；`PROFILE_SOURCES`（`:125`）注册 0.9.0；`DEFAULT_SOP_PROFILE_VERSION`（`:300`）→ `"0.9.0"`；0.8.0 及更早冻结 + importable。
- 模板：`step_evolution_report` 进 doc-create 模板表（含 `### Outcome References` 骨架）；`step_release` 无 artifact → doc create 复用现有 null-artifact 拒绝行为。

**投影 v2 pin 感知（AC-16，P1-C1 收尾）**
- **[简化]** 不加 `SopProfile.acceptanceProjectionVersion` 字段——它恒等于 `requiresOutcome(v) ? 2 : 1`，属冗余编码。直接派生：抽 `projectionVersion(profile)` 纯助手（或在两调用点按 `requiresOutcome` 分支）。
- `buildAcceptanceProjection`（`acceptance-spec-store.ts:38`）与 gate-runner 调用点：传 **profile 能力（派生的 projectionVersion）** 而非裸版本串；`<0.9.0` pin 即使 docs 有 `kind:outcome` → 仍出 **v1** + gate 消息附 warn（"outcome AC 需 SOP 0.9.0，`ocn sop upgrade`"）。P2 冻结旁路随 `projection.version===2` 自然休眠——顺带修掉当前 0.8.0-pin 也会冻结台账的越界行为。

**测试**
- 0.9.0 `data.ts` 定义后：断言 **0.8.0 的 `stepsForState("state_ship")` 仍为空**（防浅拷贝污染冻结 profile，风险 2）。
- 终点断言迁移：0.9.0 下"终点"从 `step_final_build_verdict` 移到 `step_evolution_report`；保留"0.8.0 pin 终点不动"断言。

### Phase C — SHIP 门 `step_release`（**cross-cutting 闭包，绝不进 step-keyed 分支**）

> **C2 陷阱**：`step_release` 无 required artifact → `runGate`（gate-runner.ts:**202-229** [实测校正]）null-artifact 分支**提前返回 pass**。SHIP 门必须做成**闭包**，照 runner 内既有 `contractDriftOrNull` 惯用法：定义一次、在 null-artifact 分支（`:207` 位）与正常分支（`:500` 位）**两处都调用**、内部自守卫 `currentStateId === "state_ship"`（其余状态返回 `skip`）。[范式勘误] 参照的真身是 runner 内的 `contractDriftOrNull`（`readinessOrNull`/`contractDriftOrNull` 同族），判别式 `{skip|pass|io_error|blocked}`——不是某个 `contract-gate-step.ts` 文件名。严格说 `step_release` 只有 null-artifact 一路，正常分支调用是自守卫下的防御性 no-op，保留以求一致。

**新文件** `src/core/gate/outcome-ship-gate-step.ts`：
0. **[C-3｜信任 ledger *存在* 是致命错]** SHIP 门**不得**以"台账缺失/坏"当 legacy pass。先独立判定"本项目是否应有 outcome"——读**冻结的验收投影** `.ocoding/acceptance-specs.json`（v2 且含 ≥1 outcome AC）**或**扫当前轮 `outcome_measured` audit 事件。若"应有 outcome"但 `readOutcomeLedger` 返回 null（缺失/JSON坏/zod坏三态不可区分）→ **blocked**（exit 2，fix_hint："台账缺失或损坏，`ocn outcome check` 重建"），**绝不 pass**。（根因：`ledger===null` 在 `outcome-ledger-guard.ts:38` 与 `outcome-integrity.ts:111` 都当 pass——SHIP 门用独立信任源覆盖此歧义；同一修法回灌 advance 守卫见 §"Auto-mode 边界"下的守卫加固。）
1. `reconcileLedgerWithAudit`（`outcome-integrity.ts:106`）——篡改/漂移 → blocked（runner 映射 `ERR_ARTIFACT_INVALID` exit 2）。
2. 复用 `evaluateOutcomeGuard(ledger, profile.stateOrder, "state_ship")`（`outcome-ledger-guard.ts:33`）：
   - `block`（到期 UNMEASURED/NO_EVIDENCE 未豁免）→ blocked，fix_hint 指 `ocn outcome check`。
   - **SHIP 独有收紧**：任一 `MEASURED_FAIL` 无 `entry.waived`（DEC 复验存在）且无项目级豁免 → blocked（"带数字决策后才能发布"）。分工：advance 到 SHIP **边界**只拦未测量（P3 已做）；SHIP **步内**要求 FAIL 已被人类决策覆盖。
3. 全 PASS → pass（诚实边界文案，复用 P2 `outcomeMessage` 基调）。
- **step-fn 必须包裹步 0–2 的 evaluate**：任一意外 throw → 映射 `io_error`→blocked（现 `contractDriftOrNull` 只包 write，不包 evaluate；SHIP 门要包全，守 §4.6 exit 契约不崩栈）。
- 幂等只读（不写台账）；audit 走 runner 现有 `artifact_gate_passed/blocked`。
- **测试**：`rm .ocoding/outcome-ledger.json` 后（docs/03 有 outcome AC）→ SHIP 门 blocked（钉死 C-3）；手改坏 JSON 同样 blocked。

### Phase D — REFLECT 门 `step_evolution_report`（闭环）+ cycle 螺旋

**D.1 artifact 与机械核对**
- `docs/23-evolution-report.md` 必含 `### Outcome References`，每行：`- <ac-id>: value=<n> @ <measurementId>`（**引用键＝`measurementId`**，非 `measuredAt`——同秒碰撞可洗值，裁决 DI-M5）。
- 新文件 `src/core/gate/outcome-reflect-gate-step.ts` + 纯解析器 `src/core/outcome/outcome-references-parser.ts`：
  - **解析器必须 total（永不 throw）**：`value=<n>` 非数字、杂散 `@`、缺字段等 → 记为**不匹配的引用**，绝不抛（否则未被 step-fn 包裹即违 §4.6 exit 契约）。step-fn 亦包裹 evaluate → `io_error`→blocked 兜底。
  - 逐条核对：`measurementId` 存在于该 AC **当前轮** history 且 `value` 完全相等（台账 JSON vs markdown 纯机械比对，零内容评判）。
  - 覆盖性：每条**未豁免** outcome AC 至少被引用一次（防"只引用赢的那条"）。不可解析行 == 未登记引用 == 其覆盖的 AC 未被引用 == blocked（malformed 天然 fail-closed）。
  - **全豁免 → 覆盖性平凡满足**（present-but-vacuous）：仅经 full-waiver 可达（AC-7 拦无 AC 的 SPEC），低危；注释注明此 all-waived 为**有意**空过。
  - 不一致 → blocked，报 acId + 报告值 + 台账值两数字。
- 该步**有 artifact** → 走 step-keyed 正常分支（与 SHIP 闭包接线相反，代码注释写清防混淆）。
- **[数据完整性] `measurementId` 唯一性**：跨轮 `seq` 从 0 重置（`outcome-ledger-store.ts:99`），reconcile 靠 `byId` round-scope 过滤（`outcome-integrity.ts:115-119`）才不碰撞。REFLECT 门与 DI-M5 都以 `measurementId` 为键——须**核实 `measurementId` 内嵌 round 或 nonce**（非仅 `acId+seq`），否则任何 scope 放宽/读归档台账即误匹配。加"同 acId 跨两轮 measurementId 不等"单测。

**D.2 `ocn cycle new` 螺旋（AC-14，CRITICAL）**
- `cycle/archive.ts` 的 `archiveMoveSources`（`:28`）加一行 `Paths.outcomeLedgerFile(cwd)`。**这一行就是全部**：
  - 台账随轮归档（move）→ 新轮无 live 台账；docs/ 保留 → 光标重走到 `step_acceptance_criteria` 时验收门重跑，`reconcileFrozenContracts(specs, prev=null)` 以同命令→同 contractHash、空 history、无 waiver 重新冻结；
  - verdict 与 waiver 一并重置（DI-H4：waiver 是 live 状态非冻结契约）；audit JSONL 永不归档（P2 round-scoped reconcile 以 `cycle_started` 计数跨轮兼容）。
  - 归档后、验收门重跑前窗口：无台账 → SHIP/advance 守卫 `ledger===null` 走 legacy pass——但光标已回第 1 步（`archive.ts:115-121` 重置 `currentStepId` 到 `firstStepOf`），到不了 SHIP，无泄漏窗口。**测试钉死**。
  - **[架构 Q4｜真正的不变量]** 二轮 SHIP 的 `reconcileLedgerWithAudit` 面对的 audit JSONL **仍含一轮 measurement 事件**（audit 永不归档）；不误报**仅因** reconcile round-scope（回扫到最近 `cycle_started`、`round===currentRound`，`outcome-integrity.ts:15-16,106-118`）。无泄漏的真因是 round-scope，**非**游标位置——若有人归档/压缩 audit 或 `cycle_started` 计数损坏，该论证坍塌。e2e §7.2 须断言"二轮 SHIP reconcile 在 log 仍含一轮事件时通过"。
  - **[数据完整性 MEDIUM｜brick 风险]** reconcile 每次从第 0 行全量重验 `prevEventHash` 链，仅容忍**尾行**撕裂（`:58`）；任一**历史轮内部行**损坏 → `chain_broken` → 此后每轮 SHIP 永久 `ERR_ARTIFACT_INVALID`。永不归档 = 无 checkpoint。→ 加 **per-`cycle_started` 链校验点**（或只从最近 `cycle_started` 起验），使旧轮损坏不毒害当前轮；若本 PR 不做，amendment 明确接受该风险 + 记 TODO。

### Phase E — P3 遗留上电

**E.1 next-prompt 派发优先序（AC-9）**
- 新 sibling `src/core/execution-navigator/next-prompt-outcome-dispatch.ts`（**勿碰** `next-prompt-task-dispatch.ts:64`、`next-prompt-sections.ts:251`）——**它承载真实分量**（构造 `ocn outcome check <ac-id>` 派发文本）。**[简化] 删 `next-prompt-priority.ts`**：优先序只是几个条件的一个 `if`，独立成模是过度抽象；把 outcome-vs-task 抉择**内联**在今天唯一选 task dispatch 的那处。
  - 到期（`dueReached`）且 `UNMEASURED/MEASURED_FAIL` 的 outcome AC > pending build task；
  - **BUILD 防活锁**：`state_build` 内且 task ledger 未清 → build task 优先（`NO_EVIDENCE` 尤不得抢占）；BUILD 外或台账已清 → outcome 优先。
  - **[H-2/H-1｜四处同步，非三处]** 派发文本抽**单一导出常量**消费于全部四面：`governance-text.ts` 自动化文案 + `/ocn-next` 模板 + AM-011 审查子代理指令 + **MCP `core/prompt/generate-next-prompt.ts`**（后者是独立第二套实现，既缺 pin 修复[C-1]又缺 outcome 派发——须一并纳入，或（更优）与 `execution-navigator` 版**收敛为一套**）。单一常量根除同步类（合"根因修复 over 兜底"）。
- pin 门：`requiresOutcome(profile.version)` 为 false → 直通 task dispatch（<0.9.0 字节等同）。

**E.2 `no_tasks` 调和（AC-12；[实测校正] 非 `zero_tasks`）**
- `task-spec-parser`（报 `no_tasks` 处）不动（解析器保持纯粹）；在 **task-gate 层**放宽：`no_tasks` 缺陷且〔pin≥0.9.0 且 v2 投影含 **≥1 未豁免 outcome AC**〕→ 降级 warning（一条冻结 probe 的未豁免 outcome AC 即"有可验证交付物"）。纯 outcome 项目由此过 build-plan 门走到 SHIP。
- **[silent-failure Q3] 谓词必须是"未豁免"**：若全部 outcome AC 已豁免，`no_tasks`→warning 会**清空 BUILD** 而 outcome 守卫又跳过（已豁免）→ 空任务、空数字、全豁免项目静默发布。收紧为 ≥1 未豁免即堵此洞；其安全性仍耦合 §C 的 C-3 守卫完好（ledger 删除会让本放宽退化为真静默 pass）。
- 台账空时 `task-ledger-guard`/`advance` 天然放行（pending=0），无需另改。

### Phase F — 迁移 `ocn sop upgrade` 0.8.0→0.9.0（AC-15 + DI-H6）

- 照 DEC-029/AM-015 先例：保 `config.yaml` + 游标 + 产物；新 SPEC 要求与新状态按 AM-014 精确激活，不追溯炸已过的门。
- **台账种子（DI-H6，必做）**：升级时若 docs/03 已有 outcome AC 且验收步已过（游标在 SPEC 之后），用当前 v2 投影种子 `outcome-ledger.json`（复用 `reconcileFrozenContracts`）——否则升级到 VERIFY→SHIP 无 contractHash 可 drift-check、`outcome check` 无冻结命令可跑。

- **[H-1｜种子必须严格规格化——一句话欠三条不变量]** 现 `applyUpgradeLocked`（`src/core/sop/upgrade.ts:248-278`）已持 `.ocoding/.lock`、以 `writeStateUnlocked`（pin 移动）**收尾**。种子插入其临界区内，顺序与写法**三处载重**：
  1. **顺序＝snapshots → seed → pin（seed 必须在 pin 移动之前）**。因 `validateUpgrade` 在 `target===pinned` 时短路 `noop`（`upgrade.ts:104-115`）——若 pin 先翻到 0.9.0 再 seed 失败，重跑 `sop upgrade 0.9.0` 返回 noop、**永不再 seed** → 0.9.0-pin 但无台账 = 直接落入 C-3 静默 pass。seed 先行则中断后重跑仍以 `fromVersion=0.8.0` 重入，靠"有效即跳过"幂等。
  2. **投影能力取自 target `profile` 对象**（`upgrade.ts:260` 已在作用域），**绝不**取持久化 `state.project.sopProfileVersion`（seed 时仍 0.8.0 → §E 的 pin 感知给出 v1 空投影 → `reconcileFrozenContracts` 返回 null → seed 空 → 同样落 C-3）。
  3. **用未加锁写入器**（`writeLedgerUnlocked`，`outcome-ledger-store.ts:28`，需导出）在既有临界区内写——公共 `writeOutcomeLedger` 自带 `withLock` 同一 `.ocoding/.lock`（`:61-65`），非重入 → 5s 超时 `LockTimeoutError` → 升级失败。镜像现有 `writeStateUnlocked` 用法（`:270`）。
  4. **"已存在跳过"→"解析有效才跳过"**：`readOutcomeLedger` 有效（非 null）才跳；否则**重种/修复**上次半损坏台账（存在性检查会保留腐坏文件）。
  5. **事务原子性**：seed（含读回校验）成功后**才**翻 pin；seed 失败 → 回滚 `config.yaml`、整体 abort（多文件迁移非文件级 temp+rename 所能覆盖）。
- **due-already-passed clamp**：升级瞬间某 AC 的 `due` 早于当前游标 → 首次激活 clamp 到下一可达边界，**一次性提示**；`dueReached`（`atIdx>=dueIdx`）天然满足"下关强制"。
- **[尾部风险] stray 台账清理**：旧 0.8.0 项目在当前工具下**已**冻结了台账（P1-C1 的越界行为），升级后拿 v1 投影 → 遗留孤儿台账；迁移给一次性清理/校正路径或明确记为已知项。

### Phase G — gate-runner 分解（P3a，**独立 PR，字节等同重构**）

- 现 **524 行**（超 300 限）。独立分支 `refactor/gate-runner-step-registry`：3 份近同 evaluate→block→persist（acceptance/logic/task）+ 新 SHIP/REFLECT 步收进**有序判别-kind step-fn 数组**（非动态注册表，Simplicity）+ 抽 `gate-emit.ts`（baseAudit/safeAudit blocked 发射）。**验收 = 现测试套件 0 改动全绿。**
- **[架构 M1｜排序改为 P3a 先于 P4b]** SHIP 闭包**必然**在 `runGate` 内定义、两分支调用 → 无论逻辑放独立文件，仍给已 524 行的 runner **加行**。P4b 先落 → 进一步破 CLAUDE.md §8（≤300）、pre-commit 应告警。故 **P3a 应排在 P4b 之前**；若确要 P4b 先行，须在 amendment 明确接受 runner 超限回归 + 记 TODO。（simplicity 亦确认 P3a 可脱离 0.9.0 发布关键路径——它不 gate 发布，只是不应让 runner 继续膨胀。）

### Phase H — Auto-mode 边界 + SHIP/REFLECT 作用域裁决（[H-4]/[H-5]，规格化既有代码）

**H.1 Auto-mode × SHIP/REFLECT（代码已实现，计划须补 phase/AC/test）**
- `authorization.ts` 已把 `PHASE2_STATES = {state_build, state_verify}`：`phaseOfState("state_ship")→null` → `authorizeAiAdvance` **拒绝** ai_agent advance 进 SHIP/REFLECT；`authorizeAiOutcomeCheck` 把 outcome-check 限 BUILD/VERIFY。**这是设计（SHIP/REFLECT 永不委托），非缺陷**——但计划须显式化：
  - phase-2 auto 项目到 `step_final_build_verdict` **在 VERIFY→SHIP 边界停机等人**（target 非可委托）；e2e 场景 1–2 须设 actor 覆盖此交接。
  - §E.1 四处派发文案对 auto-agent **不得**发"advance 进 SHIP"，须**指路人类交接**；`governance-text.ts:33-34` 硬编码的"BUILD→VERIFY"phase-2 标签须与之一致。
  - `ocn outcome check` 委托信封（代码已在）纳入某 phase 的测试面。
- **[C-3 回灌] advance 守卫加固**：SHIP 门的独立信任源核对（§C 步 0）同法回灌 `evaluateOutcomeGuard`/`outcome-ledger-guard.ts:38` 的 `ledger===null`——到期应有 outcome 却台账缺失/坏 → block，而非 legacy pass。

**H.2 SHIP/REFLECT 单步 stub vs CLAUDE.md §5 全量（须 DEC 记录）**
- 0.9.0 profile 把 `state_ship = [step_release]`（无 artifact）、`state_reflect = [step_evolution_report]`——**刻意压缩**，丢下 §5 所列 20-observability / 21-audit-trail / 24-uncertainty-policy / 23-ai-governance。这是**范围决策**，须进 DEC-042 + amendment（不能静默丢）。
- **obligation 交互**：`obligation_uncertainty_policy`（"enter SHIP 激活"）、`obligation_ai_governance_brief` 对单步 stub 是否触发？readiness `dueState` 把它们的 deadline 解到无产出 artifact 的 SHIP/REFLECT 是否自洽？→ 实现前核对，测试覆盖"进 SHIP 时 uncertainty obligation 行为不炸"。

**H.3 rewind × outcome-ledger（尾部风险，补测）**
- `rewind` 不动 docs/ 与台账、仅清 `latestGateResult`。未覆盖边：rewind 到 `step_prd` → 改 docs/03 outcome AC → 再 advance → 验收门跑 `reconcileFrozenContracts(specs, prev=非空台账)` 的 **prev≠null** 路径（AC 增删/hash 变 vs 活契约）无测；rewind 出 SHIP/REFLECT 回 BUILD 后 SHIP 门对陈旧 measurement 的语义未定。→ 补测钉死两者。

**H.4 outcome FAIL-waiver 跨状态存活（须裁决）**
- §C 要求 `MEASURED_FAIL` 在 `step_release` 带 `entry.waived`。若 outcome waiver 循 readiness"expire-on-state-change"先例：VERIFY 处 waive、advance VERIFY→SHIP（状态变更）→ waiver 过期 → SHIP 门拦 → 被迫 SHIP 处重 waive。e2e 场景 2 正是 waive-then-advance，会静默踩中。→ **裁决 outcome waiver 是否跨 VERIFY→SHIP 边界存活**（或必须在 SHIP 处授予），写进 amendment + e2e 断言。

**H.5 brief/status 新状态渲染（尾部风险，dogfood 可见性）**
- 计划仅复用 P3"brief 显示台账摘要"。游标在 `state_ship`/`state_reflect` 时的**当前位置**渲染、终点 signpost 从 `step_final_build_verdict` 移到 `step_evolution_report`——须核 `brief`/`status` 渲染器（AI 靠 brief 恢复上下文）。低正确性风险、高可见性风险。

## System-Wide Impact

- **Interaction graph**：`ocn advance` → `runGate`（现有 acceptance/logic/task/readiness/contract 闭包）→ **新增 SHIP 闭包（null-artifact + 正常两分支）** → 到 SHIP 边界读 outcome-ledger 守卫；`ocn advance` 越 `step_final_build_verdict` 首次生效依赖 §A 的 pin-resolved `nextStep`。`ocn cycle new` → `archiveMoveSources`（+outcome-ledger）→ 重走 SPEC → 验收门 → `reconcileFrozenContracts(prev=null)` 重冻结。
- **Error propagation**：SHIP/REFLECT blocked → runner 映射 exit（gate_failed=1 / artifact_invalid=2）；`reconcileLedgerWithAudit` 篡改检测 → exit 2。三处派发文案任一漏同步 → auto mode 拿过期指令（非崩溃但语义错，风险 4）。
- **State lifecycle risks**：cycle 归档后至验收门重跑窗口 `ledger===null` 走 legacy pass——靠"光标已回第 1 步到不了 SHIP"闭合，**必须测试钉死**。upgrade 种子台账用 withLock+temp+rename，不覆盖已存在台账（防重复升级毁数据）。
- **API surface parity**：MCP 白名单**仍 7 工具**（AC-17 钉死断言）——SHIP/REFLECT/派发/迁移一律不进 MCP。`ocn advance` / `ocn task check` 的 auto-mode phase2 与 manual 两路对 §A 的 `nextStep` 必须同解。
- **Integration test scenarios**：见 §"e2e 场景"。

## e2e 场景（`tests/e2e/outcome-backbone-walkthrough.test.ts`，从零默认 0.9.0）

1. **全程**：`ocn init`（默认 0.9.0）→ SPEC（docs/03 含 1 条 outcome AC + `no_tasks` 放宽或含 build task）→ … → BUILD → VERIFY 内 `ocn outcome check`（PASS）→ advance 进 SHIP（`step_release` 门过）→ REFLECT（写 `docs/23` 引用块）→ 终点拒绝文案含 cycle/rewind。
2. **螺旋第二轮**：一轮 `MEASURED_FAIL` → SHIP 门拦 → human waive（`--dec`）→ 过 SHIP/REFLECT → `cycle new --yes` → 断言新轮 verdict=UNMEASURED、waiver 已清、audit JSONL 未归档且含跨轮 `cycle_started` → 重测 PASS → 二轮 SHIP。**[架构 Q4] 加断言**：二轮 SHIP `reconcileLedgerWithAudit` 在 log 仍含一轮 measurement 事件时通过（钉死 round-scope 才是无泄漏真因）。
3. **SPEC 拦截**：无 outcome AC 且无豁免 → `step_acceptance_criteria` 门 blocked（AC-7 首次 live）。
4. **MCP 白名单仍 7 工具**（钉死，AC-17）。
5. **[C-3] 篡改绕过**：VERIFY 后 `rm`/损坏 `.ocoding/outcome-ledger.json` → SHIP 门 blocked（不因台账缺失静默放行）。
6. **[C-1] MCP pin 泄漏**：默认 0.9.0、pin 0.8.0，`navigator.generate_next_prompt` 于终点仍报无 next（不越界到 `step_release`）。
7. **[H-4] auto-mode 边界**：phase-2 auto 项目到 `step_final_build_verdict` 于 VERIFY→SHIP 停机、需人类交接（actor=ai_agent 被拒）。

## Acceptance Criteria

### Functional
- [ ] **AC-15**：默认翻 0.9.0 后，0.8.0-pinned 项目终点仍 `step_final_build_verdict`（§A 引信）；0.9.0 项目终点为 `step_evolution_report`（§B/§D）。
- [ ] **AC-7**：0.9.0 下 SPEC 无 outcome AC 且无豁免 → `step_acceptance_criteria` blocked。
- [ ] **AC-9**：next-prompt 派发优先序按 §E.1（BUILD 防活锁 + 到期优先）。
- [ ] **AC-12**：`no_tasks` 在纯 outcome 项目降级 warning（§E.2）。
- [ ] **AC-13**：REFLECT `### Outcome References` 逐条按 `measurementId` 核对，覆盖每条未豁免 outcome AC（§D.1）。
- [ ] **AC-14**：`cycle new` 螺旋 verdict+waiver 重置、台账归档、audit 不归档（§D.2）。
- [ ] **AC-16**：`<0.9.0` pin 有 `kind:outcome` → 投影 v1 + warn；P2 冻结旁路休眠（§B/§E）。
- [ ] SHIP 门：到期未测量 blocked；`MEASURED_FAIL` 未决策 blocked；全 PASS 过（§C）。
- [ ] 迁移矩阵 4 例全绿（§F）。

### Quality Gates
- [ ] 每 PR ≤500 行 diff；新文件 ≤300 行；函数 ≤50 行（CLAUDE.md §8）。
- [ ] **AC-17**：MCP 白名单钉死 7 工具断言仍绿。
- [ ] 每 commit 前 `npm run lint && npm run typecheck && npm run test` 全绿；覆盖率 core ≥90% / overall ≥80%。
- [ ] P3a 重构：现测试套件 **0 改动**全绿。

## PR 拆分

| PR | 分支 | 内容 | 依赖 | 预估行数 |
|---|---|---|---|---|
| **P4a** | `feat/outcome-backbone-p4a-sop090` | §A nextStep 引信（**4 处**）+ §H.3 display 处置 + §B profile/loader **注册（importable，*不*翻默认）** + 投影 pin 感知 + 0.8.0-pin 终点断言 | P3 (#94) | ~400 |
| **P3a** | `refactor/gate-runner-step-registry` | §G 字节等同分解（**排 P4b 之前**，让 SHIP/REFLECT 直接进 step-fn 数组、不撑爆 runner） | P4a 后、P4b 前 | ~纯移动 |
| **P4b** | `feat/outcome-backbone-p4b-ship-reflect` | §C SHIP 闭包（含 C-3 信任源）+ §D REFLECT 门/References 解析器/cycle 一行 + §E 派发/`no_tasks` + §F 迁移（含 seed 顺序）+ §H auto-mode/scope/rewind/waiver + §e2e + **§B 默认翻转（[C-2] 本 PR 最后一个 commit）** + 0.9.0 终点断言迁移 | P3a | ~500（大概率再拆：C+D / E+F / H+e2e+flip） |
| 发布 | P4b 合并后单独 commit 或独立 docs 分支 | §"发布" | P4b 合并后 | docs |

> **[C-2] 关键顺序裁决**：默认翻转从 P4a **移到 P4b 最后一个 commit**——门先于翻转落地，杜绝"新建 0.9.0 项目进无门 SHIP"的合并窗口。P4b 反序合并（在 P4a 前）本身安全（SHIP 闭包自守卫 `state_ship`，无 profile 则不可达、惰性死码）；唯"翻转先于门"方向危险。
> 当前分支为 `feat/outcome-backbone-p3-drive`（P3 已落 #94）。P4a 从最新 main/该分支切新分支。P4b 估算已破 500 行上限 → 实施时按注释三拆。

## 发布与文档（human-gated）

- npm `0.9.0-beta.0`（lockstep DEC-039，latest+beta）+ GitHub release；发布单独 commit，**publish 需人类**（记忆 [npm-release-procedure]：standing auth 已配，但翻默认/发布仍 human-gated）。
- **[H-5｜编号双占裁决——必须先解决再动模板]** CLAUDE.md §5 现把 **23 分给 ai-governance**、22 分给 audit-trail。本计划把 REFLECT evolution-report 落到 `docs/23-evolution-report.md` 会与 ai-governance **双占 23**。裁决：evolution-report 用 **`docs/23-evolution-report.md`**，ai-governance **另迁编号**（如 `docs/25-ai-governance.md`，取当前未占用号）；doc-create 模板表与 REFLECT 门只 key `docs/23-evolution-report.md`，**确保无 stale 模板行仍指 23→ai-governance**（否则静默覆盖/门核错文件）。该编号映射进 DEC-042 + amendment，勿只改 §5 一行。
- amendment `docs/amendments/2026-07-xx-outcome-backbone-amendment.md`（AM-016）+ DEC-042 进 `docs/20-decision-log.md`（含 §H.2 SHIP/REFLECT 单步 stub 范围决策 + §H.4 waiver 跨状态裁决 + 上述编号映射）+ CLAUDE.md §6/§5 勘正 + README/onepager + proposal Status → implemented。PDF 走 build/pdf 管线（pandoc→xelatex，记忆 [ocn-doc-pdf-formal-layout]）。
- **0.9.0 后冻结新 backbone**（proposal §12）。

## Risk Analysis & Mitigation

1. **[CRITICAL｜C-1] `nextStep` fingerprint 漏 MCP 面**：默认一翻，`navigator.generate_next_prompt`（+ auto 委托）在 0.8.0-pin 项目越界报 `step_release`。缓解：§A 修全 **4 处**、`grep '\.nextStep('` 兜底、翻默认前测试绿（e2e §6）。
2. **[CRITICAL｜C-2] 翻转先于门的合并窗口**：新建 0.9.0 项目进无门 SHIP。缓解：**默认翻转移到 P4b 最后一 commit**（PR 表 [C-2]），P4b 反序合并安全。
3. **[CRITICAL｜C-3] `ledger===null` = legacy pass 一删即绕过**：`rm outcome-ledger.json` 静默放行 SHIP/advance。缓解：§C 步 0 独立信任源核对（冻结验收投影 / audit 事件），回灌 advance 守卫（§H.1）；e2e §5 钉死。
4. **[HIGH｜H-1] 迁移 seed 顺序/死锁/投影源**：pin-before-seed 因 noop 守卫永久损坏、公共写入器自死锁、seed 取持久化 pin 得空投影。缓解：§F 五条不变量（snapshots→seed→pin / 未加锁写入器 / target-profile 投影 / 有效才跳 / 失败回滚）。
5. **profile 常量共享引用污染**：0.9.0 浅拷贝不彻底污染冻结 profile。缓解：加 "0.8.0 `stepsForState('state_ship')` 仍空" 断言（架构 Q3 确认 `stepsForState` 每次返回新数组，实际污染面窄，此断言已覆盖唯一现实向量）。[实测校正] 浅拷贝源＝0.8.0 导出的 `STEPS_BY_STATE`（其真身链回 0.2.0 空数组）。
6. **[HIGH] runner 已 524 行**：SHIP 闭包必然加行。缓解：**P3a 排在 P4b 之前**（PR 表已改）；否则 amendment 明确接受回归。
7. **派发文案四处同步**（governance-text / `/ocn-next` / AM-011 / **MCP core/prompt**）漏一处 → auto mode 指令过期。缓解：§E.1 抽**单一导出常量**根除同步类。
8. **[MEDIUM] audit 永不归档的 brick 风险**：历史轮损坏行永久 `chain_broken`。缓解：§D.2 per-`cycle_started` 校验点或明确接受风险。
9. **SHIP null-artifact 闭包接错分支**：写进 step-keyed 分支则永不执行。缓解：§C 照 `contractDriftOrNull` 惯用法两分支都调、内部自守卫 `state_ship`；e2e 场景 1 覆盖。

## Sources & References

- **实现规格（权威）**：[docs/plans/2026-07-03-outcome-backbone-p4-implementation-spec.md](2026-07-03-outcome-backbone-p4-implementation-spec.md)
- 上游总 spec：[2026-07-02-outcome-backbone-p2-p4-implementation-spec.md](2026-07-02-outcome-backbone-p2-p4-implementation-spec.md) §4
- 执行计划 + 5-agent 评审综合：[2026-07-02-feat-outcome-backbone-p2-p4-execution-plan.md](2026-07-02-feat-outcome-backbone-p2-p4-execution-plan.md)
- 0.9.0 升级计划：[2026-07-02-outcome-backbone-0.9.0-upgrade-plan.md](2026-07-02-outcome-backbone-0.9.0-upgrade-plan.md)
- Proposal：`docs/outcome-backbone-proposal.md`（Status→implemented 于发布）
- 关键代码锚点（2026-07-03 实测）：`advance-state.ts:141`、`advance-automation.ts:36`、`gate-runner.ts:99/202-229/524行`、`sop/loader.ts:109/125/300`、`outcome/pin.ts:24/27`、`cycle/archive.ts:28`、`acceptance-spec-store.ts:38`、`outcome-ledger-guard.ts:33`、`outcome-integrity.ts:106`、`outcome-ledger-store.ts:159`、`paths.ts:33`
- CLAUDE.md §8（硬约束）、§5（状态机 22→23 勘正）、§6（当前位置）
