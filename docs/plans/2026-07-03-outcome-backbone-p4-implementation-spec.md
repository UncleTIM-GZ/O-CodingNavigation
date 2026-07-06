---
title: "Outcome Backbone P4 实现规格 — SOP 0.9.0 profile + SHIP/REFLECT 落地 + 迁移 + 发布"
type: feat
status: active
date: 2026-07-03
origin: docs/plans/2026-07-02-outcome-backbone-p2-p4-implementation-spec.md
---

# Outcome Backbone P4 实现规格｜Implementation Spec (SOP 0.9.0 最终阶段)

> Version: 1.0 · 2026-07-03 · AM-017 / DEC-043（以实施时实际下一号为准）
> 上游：[P2–P4 总 spec](2026-07-02-outcome-backbone-p2-p4-implementation-spec.md) §4 · [执行计划 + 5-agent 评审综合](2026-07-02-feat-outcome-backbone-p2-p4-execution-plan.md)
> 前置：P2 已落 PR #93（台账/probe/命令组/链式审计信任根）；P3 核心已落 PR #94（SPEC 门/激活/VERIFY→SHIP 守卫，全部 `requiresOutcome` 休眠于 <0.9.0）。
> **P4 = 让一切上电**：加 0.9.0 profile → P3 的休眠门全部激活；状态机首次越过 `step_final_build_verdict`。
> 硬约束继承 CLAUDE.md §8（文件 ≤300 行、单 PR ≤500 行等）；MCP 白名单钉死 7 工具；merge / `ocn advance`（OCN 自身）/ 默认翻转 / npm publish 均 human-gated。

---

## 0. 已核实锚点与勘误｜Grounded anchors（2026-07-03 实测）

| 锚点 | 现状 | P4 动作 |
|---|---|---|
| `advance-state.ts:140` | `loadSopProfile().nextStep(...)` — **默认 profile，非 pin** | **P4-0 必修**（A-H1） |
| `advance-automation.ts:36` | 同上（同一 bug 的第二处） | **P4-0 必修**（A-L2） |
| `gate-runner.ts:93` | `resolveProfileForProject(...)` — 正确先例 | 照此改上面两处 |
| 0.2.0 `data.ts:129-130` | `state_ship: []` / `state_reflect: []` 空数组一路继承到 0.8.0 | 0.9.0 data.ts 填入两步 |
| 0.8.0 profile | 七件套 `{data,sop,gates,artifacts,config,readiness,render}.ts`，继承 0.7.0 全量 | 0.9.0 照抄七件套模式 |
| `advance-state.ts:146` | 终点拒绝文案是**通用的**（"No next step after X"，非硬编码步名） | 无需迁移文案；只需断言测试改终点 |
| `cycle/archive.ts` `archiveMoveSources` | 已归档 acceptance-specs/task-ledger 等投影；**未含 outcome-ledger** | 加 `Paths.outcomeLedgerFile` |
| **勘误①** | 缺陷码实为 **`no_tasks`**（`task-spec-parser.ts:15`），总 spec 写的 `zero_tasks` 不存在 | §5 用 `no_tasks` |
| **勘误②** | `buildAcceptanceProjection`（acceptance-spec-store.ts:38）**pin-blind**：有 outcome 即出 v2；gate-runner 的 P2 冻结旁路也随 v2 无条件触发 | §6 pin 感知（AC-16） |
| audit markdown | `docs/22-audit-trail.md` 已被审计占用 | REFLECT artifact 用 **`docs/23-evolution-report.md`**（避让编号冲突；CLAUDE.md §5 的 22-evolution-report 表项随 amendment 勘正） |

---

## 1. P4-0（第一步，必须最先做）：`nextStep` 按 pin 解析｜A-H1 终点泄漏修复

**这是整个 P4 的引信。** 今天所有 profile 终点相同（`step_final_build_verdict` → null），bug 不可见；默认一翻 0.9.0，**0.8.0-pinned 项目**会用 0.9.0 的 `nextStep` 算出 `step_release` 并越过自己被冻结的终点——直接破 AC-15。

- 改 `src/core/advance/advance-state.ts:140` 与 `src/core/advance/advance-automation.ts:36`：
  `loadSopProfile().nextStep(...)` → `resolveProfileForProject(state.project.sopProfileVersion).nextStep(...)`（照 gate-runner.ts:93 先例；advance-state 已 import `resolveProfileForProject`——P3 3d 已引入，复用即可）。
- **回归测试（在默认翻转之前就要绿）**：伪造 loader 默认 = 0.9.0、项目 pin = 0.8.0、光标停 `step_final_build_verdict` → `ocn advance` 仍拒绝 `no_next_step`（终点不动）。
- 顺带断言：manual advance 与 auto-mode phase2 advance 对同一 pin 算出**同一个** next（两处调用点不再可能分叉）。

## 2. 0.9.0 profile｜`src/sops/default-ai-coding-sop/0.9.0/`（七件套）

- `data.ts`：继承 0.8.0 全量（照 0.8.0 继承 0.7.0 的写法），**唯二增量**：
  ```ts
  state_ship:    [{ stepId: "step_release",          artifactPath: null }],
  state_reflect: [{ stepId: "step_evolution_report", artifactPath: "docs/23-evolution-report.md" }],
  ```
  `PROFILE_VERSION = "0.9.0"`；`precise_activation` 随 readiness rulebook 继承。
  注意：`STEPS_BY_STATE` 不能像 0.8.0 那样直接 re-export 0.7.0 的常量——需浅拷贝后替换 ship/reflect 两键（**不得改动被冻结 profile 的对象**，防共享引用泄漏；加断言测试：0.8.0 的 `stepsForState("state_ship")` 仍为空）。
- `loader.ts`：`SopProfileVersion` 联合类型加 `"0.9.0"`；`PROFILE_SOURCES` 注册；**默认翻 0.9.0**（`DEFAULT_SOP_PROFILE_VERSION`）；0.8.0 及更早冻结 + importable。
- `step_release` 无 artifact（`artifactPath: null`）→ 见 §3 的 cross-cutting 接线警告。
- 模板：`step_evolution_report` 进 doc-create 模板表（含 `### Outcome References` 骨架）；`step_release` 无文档，doc create 对它拒绝（复用现有 null-artifact 行为）。

## 3. SHIP 门｜`step_release`（**cross-cutting 闭包，绝不能进 step-keyed 分支**）

**C2 陷阱（架构评审）**：`step_release` 无 required artifact → `runGate` 在 gate-runner.ts:198-223 的 null-artifact 分支**提前返回 pass**，一切写在 `content !== null` 之后的 step 门都不会执行。SHIP 门必须做成 `contractDriftOrNull`/`readinessOrNull` 家族的**闭包**，在 null-artifact 分支与正常分支**两处都调用**，内部自守卫 `currentStateId === "state_ship"`。

- 新文件 `src/core/gate/outcome-ship-gate-step.ts`（照 `contract-gate-step.ts` 范式，判别 kind `{skip|pass|io_error|blocked}`）：
  1. 先 `reconcileLedgerWithAudit`（P2 已建）——篡改/漂移 → blocked（`ERR_ARTIFACT_INVALID` 语义随 runner 映射 exit 2）。
  2. 复用 P3 `evaluateOutcomeGuard(ledger, profile.stateOrder, "state_ship")`：
     - `block`（到期 UNMEASURED/NO_EVIDENCE 未豁免）→ blocked，fix_hint 指 `ocn outcome check`。
     - **完成条件收紧（SHIP 独有，比 advance 守卫更严）**：任一 `MEASURED_FAIL` 无 `entry.waived`（DEC 复验存在）且无项目级豁免 → blocked（"带数字决策后才能发布"：waive 或 cycle）。注意与 advance 3-way 的分工——advance 到 SHIP **边界**只拦未测量（P3 已做）；SHIP **步内的 gate/完成**要求 FAIL 已被人类决策覆盖。
  3. 全 PASS → pass（消息含诚实边界文案，复用 P2 `outcomeMessage` 措辞基调）。
- 门是幂等只读（不写台账）；audit 走 runner 现有 `artifact_gate_passed/blocked`。

## 4. REFLECT 门｜`step_evolution_report`（闭环门）+ cycle 螺旋

### 4.1 artifact 与机械核对
- `docs/23-evolution-report.md` 必含 `### Outcome References` 小节，每行：
  `- <ac-id>: value=<n> @ <measurementId>`
  **裁决（DI-M5）**：引用键 = **`measurementId`**（非 `@ measuredAt`——同秒碰撞可洗值）。
- 新文件 `src/core/gate/outcome-reflect-gate-step.ts` + 纯解析器 `src/core/outcome/outcome-references-parser.ts`：
  - 逐条核对：`measurementId` 必须存在于该 AC **当前轮** history（台账 JSON vs markdown 纯机械比对，零内容评判），且 `value` 与该条完全相等。
  - 覆盖性：每条**未豁免**的 outcome AC 至少被引用一次（防"只引用赢的那条"）。
  - 不一致 → blocked，指出 acId + 报告值 + 台账值两个数字。
- 该步有 artifact → 走 step-keyed 正常分支（与 SHIP 的闭包接线相反，写清楚防混淆）。

### 4.2 `ocn cycle new` 螺旋（AC-14，CRITICAL）
- `archive.ts` 的 `archiveMoveSources` 加一行 `Paths.outcomeLedgerFile(cwd)`。**这一行就是全部**：
  - 台账随轮归档（move）→ 新一轮无 live 台账；
  - docs/ 保留 → 光标重走到 `step_acceptance_criteria` 时验收门重跑，`reconcileFrozenContracts(specs, prev=null)` 以**同一命令 → 同一 contractHash、空 history、无 waiver** 重新冻结；
  - 于是 verdict **与 waiver 一并**重置（DI-H4：waiver 是 live 状态非冻结契约）、冻结契约按 docs/03 重新推导、audit JSONL 永不归档（P2 的 round-scoped reconcile 以 `cycle_started` 计数天然兼容跨轮）。
  - 归档后、验收门重跑前的窗口：无台账 → SHIP/advance 守卫 `ledger===null` 走 legacy pass——但光标已回到第 1 步，到不了 SHIP，无泄漏窗口。测试钉死这一点。
- 终点文案（advance-state.ts:146）本就通用，无需改；**改的是测试**：0.9.0 下"终点"断言从 `step_final_build_verdict` 移到 `step_evolution_report`，同时保留"0.8.0 pin 终点不变"断言。

## 5. P3 遗留（随 P4 一并上电）

### 5.1 next-prompt 派发优先序（§3.4，AC-9）
- 新 sibling `src/core/execution-navigator/next-prompt-outcome-dispatch.ts`（**勿碰** 64 行的 task-dispatch、251 行的 sections）+ 薄组合器 `next-prompt-priority.ts`（A-M6：优先序独立成模，两个 dispatcher 都不拥有跨模决策）：
  - 规则：到期（`dueReached`）且 `UNMEASURED / MEASURED_FAIL` 的 outcome AC > pending build task；
  - **BUILD 防活锁**：`state_build` 内且 task ledger 未清 → build task 优先（`NO_EVIDENCE` 尤其不得抢占——其修复动作往往是 build 工作本身）；BUILD 外或台账已清 → outcome 优先。
  - 派发文本指向 `ocn outcome check <ac-id>`；同步 `governance-text.ts` 自动化文案 + `/ocn-next` 模板 + AM-011 审查子代理指令（风险 2：不同步则 auto mode 拿过期指令）。
- pin 门：`requiresOutcome(profile.version)` 为 false 时组合器直通 task dispatch（<0.9.0 字节等同）。

### 5.2 `no_tasks` 调和（§3.7，AC-12；勘误：非 `zero_tasks`）
- `task-spec-parser` 报 `no_tasks` 处不动（解析器保持纯粹）；在 **task-gate 层**放宽：`no_tasks` 缺陷且〔pin ≥0.9.0 且 v2 投影含 ≥1 outcome AC〕→ 降级为 warning（一条冻结 probe 的 outcome AC 即"有可验证交付物"）。纯 outcome 项目由此过 build-plan 门走到 SHIP。
- 台账为空时 `task-ledger-guard`/`advance` 天然放行（pending=0），无需另改。

### 5.3 gate-runner 分解（P3a——**独立 PR，字节等同重构**）
- 现 524 行（Outcome 前已 482 超限）。独立分支 `refactor/gate-runner-step-registry`：3 份近同 evaluate→block→persist（acceptance/logic/task）+ 新 SHIP/REFLECT 步收进**有序判别-kind step-fn 数组**（非动态注册表，Simplicity-#4）+ 抽 `gate-emit.ts`（baseAudit/safeAudit blocked 发射）。验收 = 现测试套件 0 改动全绿。**排序自由**：可在 P4 主 PR 前或后，但 P4 加 SHIP/REFLECT 时若 runner 已分解则新门直接进数组，未分解则先按 §3/§4.1 以闭包+step 块落地、P3a 再收编。

### 5.4 投影 v2 pin 感知（§4.5 / P1-C1 收尾，AC-16）
- `evaluateAcceptanceSpecs → buildAcceptanceProjection` 与 gate-runner 调用点：传 **profile 能力**而非裸版本串（A-M5——建议 `SopProfile` 加只读 `acceptanceProjectionVersion: 1 | 2`，0.9.0 = 2，其余 = 1）。
- `<0.9.0` pin 即使 docs 有 `kind:outcome` → 投影仍出 **v1** + gate 消息附 warn（"outcome AC 需 SOP 0.9.0，`ocn sop upgrade`"）；同时 P2 的冻结旁路（gate-runner 现按 `projection.version === 2` 触发）随之自然休眠——**修掉当前 0.8.0-pin 也会冻结台账的越界行为**。

## 6. 迁移｜`ocn sop upgrade` 0.8.0 → 0.9.0（AC-15 + DI-H6）

- 照 DEC-029/AM-015 先例：保 `config.yaml` + 游标 + 产物；新 SPEC 要求与新状态按 AM-014 精确激活，不追溯炸已过的门。
- **台账种子（DI-H6，必做）**：升级时若 docs/03 已有 outcome AC 且验收步已过（游标在 SPEC 之后），upgrade 用当前 v2 投影**原子种子** `outcome-ledger.json`（`reconcileFrozenContracts` 复用，withLock + temp+rename，不得覆盖已存在台账）——否则升级项目到 VERIFY→SHIP 时无 contractHash 可 drift-check、`outcome check` 无冻结命令可跑。
- **due-already-passed clamp（§3.2 遗留）**：升级瞬间若某 AC 的 `due` 早于当前游标状态 → 首次激活 clamp 到下一可达边界，**一次性提示**；P3 的 `dueReached` 语义（`atIdx >= dueIdx`）天然满足"下关强制"，只需迁移测试钉死不追溯爆炸。
- **迁移测试矩阵**：
  1. 0.8.0 停 `step_final_build_verdict` → upgrade → `ocn advance` 进 `step_release`（终点移动）；
  2. 冻结 0.8.0 pin 不 upgrade → 终点仍 `step_final_build_verdict`（P4-0 回归）；
  3. 升级 + docs 有 outcome AC → 台账已种子（contractHash 就位）→ `outcome check` 可跑；
  4. 升级 + 无 outcome AC → 下次过 SPEC 门时按 §5.4/P3 SPEC 门要求补（不在升级时炸）。

## 7. e2e｜`tests/e2e/outcome-backbone-walkthrough.test.ts`（从零默认 0.9.0）

1. **全程**：`ocn init`（默认 0.9.0）→ SPEC（docs/03 含 1 条 outcome AC + `no_tasks` 放宽或含 build task）→ … → BUILD → VERIFY 内 `ocn outcome check`（PASS）→ advance 进 SHIP（`step_release` 门过）→ REFLECT（写 `docs/23` 引用块）→ 终点拒绝文案含 cycle/rewind。
2. **螺旋第二轮**：第一轮 `MEASURED_FAIL` → SHIP 门拦（FAIL 未决策）→ human waive（--dec）→ 过 SHIP/REFLECT → `cycle new --yes` → 断言新一轮 verdict=UNMEASURED、waiver 已清、audit JSONL 未归档且含跨轮 `cycle_started` → 重测 PASS → 二轮 SHIP。
3. **SPEC 拦截**：无 outcome AC 且无豁免 → `step_acceptance_criteria` 门 blocked（AC-7 首次live验证）。
4. MCP 白名单仍 7 工具（钉死断言，AC-17）。

## 8. 发布与文档（human-gated）

- npm `0.9.0-beta.0`（lockstep DEC-039，latest+beta）+ GitHub release；发布单独提交，publish 需人类。
- amendment `docs/amendments/2026-07-xx-outcome-backbone-amendment.md`（AM-017）+ DEC-043 进 `docs/20-decision-log.md` + CLAUDE.md §6/§5（22→23 编号勘正）+ README/onepager + proposal Status → implemented。PDF 走 build/pdf 管线（pandoc→xelatex）。
- **0.9.0 后冻结新 backbone**（proposal §12）。

## 9. PR 拆分（每 PR ≤500 行、全量 pre-commit 门）

| PR | 分支 | 内容 | 依赖 |
|---|---|---|---|
| P4a | `feat/outcome-backbone-p4a-sop090` | §1 nextStep 修复 + §2 profile/loader/默认翻转 + §5.4 pin 感知 + 终点断言迁移 | P3 (#94) |
| P4b | `feat/outcome-backbone-p4b-ship-reflect` | §3 SHIP 闭包 + §4 REFLECT 门/References 解析器/cycle 归档一行 + §5.1 派发 + §5.2 no_tasks 放宽 + §6 迁移 + §7 e2e | P4a |
| P3a | `refactor/gate-runner-step-registry` | §5.3 字节等同分解 | 可插队任意点 |
| 发布 | （P4b 内单独 commit 或独立 docs 分支） | §8 全部 | P4b 合并后 |

## 10. 验收标准映射（总 spec §5 的 P4 份额）

- AC-7/9/10/11/12：P3 休眠逻辑在 0.9.0 下首次 live（e2e §7.1/7.3 + 派发/放宽单测）。
- AC-13：REFLECT 引用核对（§4.1）。AC-14：cycle 螺旋（§4.2 + e2e §7.2）。
- AC-15：终点移动 + 冻结 pin 不动（§1 + §6 矩阵 1/2）。AC-16：v1+warn（§5.4）。AC-17：白名单 7（e2e §7.4）。

## 11. 风险

1. **P4-0 不先做，默认一翻全网 0.8.0-pin 项目终点泄漏**——排 P4a 第一 commit，测试先行。
2. profile 常量共享引用：0.9.0 浅拷贝不彻底会污染冻结 profile 的 `STEPS_BY_STATE`——加 0.8.0 空数组断言。
3. runner 已 524 行：P4b 若在 P3a 之前落地，SHIP/REFLECT 必须以独立 step 文件 + 闭包接入（不再向 runner 添块），否则限长与重复双爆。
4. 派发文案三处同步（governance-text / `/ocn-next` / AM-011）漏一处 → auto mode 指令过期。
