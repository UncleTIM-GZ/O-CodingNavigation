# 受控回拨与重开循环（Rewind & Cycle）设计提案

> Status: **Accepted — 2026-06-12（DEC-033，implementation authorized P0–P3）**；§8 开放点已全部裁决（按本提案倾向）；新命令的契约面以常规 amendment 随实现落地，冻结契约 §25 不动
> Date: 2026-06-12 · Author: OCN core · Dogfood 触发现场: OCN 自项目 + Lattice 二轮 dogfood（2026-06-12）
> Target: **引擎 / CLI 能力（非 SOP 版本升级）**——状态机步骤集与门禁内容均不变，不触碰任何 SOP profile；若实现中发现需要 bump（如 state.json schema 扩字段），按 §8 开放点⑥裁决，不在本提案断言

---

## 1. 问题：没有受控逃生通道，用户就会用不受控的方式逃生

OCN 的游标（`currentStateId` / `currentStepId`）只有一个合法写入者——
`ocn advance`（`src/core/advance/advance-state.ts`），而它只会向前。三个
2026-06-12 dogfood 实锤证明"只进不退"在现实中撑不住：

**现场①｜升级越过台账生成点 → Task Backbone 本轮静默失效。**
项目在 0.4.0 下通过 `step_build_plan` 门禁后推进入 `state_build`，中途
`ocn sop upgrade` 到 0.5.0。三个引擎事实叠加成死局：

- 任务台账的**唯一生成点**是 build-plan 门禁：仅当当前步 =
  `step_build_plan` 且 profile 要求 `section_task_specs` 时才校验任务块并
  写 `.ocoding/task-ledger.json`（`src/core/gate/gate-runner.ts:307-341`）；
- `sop upgrade` 的 positional-cursor 兼容规则**保留游标不回退**——游标之前
  的步骤一律视为已通过，永远不会被重新过门禁
  （`src/core/sop/upgrade.ts:79-88`，DEC-029 子决策 2）；
- 转移门禁对**台账缺席**的项目零回归放行
  （`src/core/advance/task-ledger-guard.ts:25-27`）。

结果：升级"成功"，但 0.5.0 卖点（派单 / 勾销 / 出 BUILD 门禁）整轮失效，
且**无任何恢复路径**——advance 只向前（`advance-state.ts:139`
`profile.nextStep`），`ocn init` 拒绝已初始化目录
（`src/core/init.ts:132-137`），upgrade 不动游标。

**现场②｜走到终点步后无受控重开方式。**
`step_final_build_verdict` 是 0.3.0+ 步骤集的终点（SHIP/REFLECT 为空步
stub，`src/sops/default-ai-coding-sop/0.3.0/data.ts:80-88`，0.5.0 复用同一
`STATE_ORDER`，`src/sops/default-ai-coding-sop/0.5.0/data.ts:31`）。此处
`advance` 固定返回 `no_next_step` → `ERR_STATE_MACHINE`
（`advance-state.ts:141-156`）。项目要开始下一轮迭代（新 feature、新
milestone），OCN 给不出任何一条命令。

**现场③｜手改 state.json 成了事实上的唯一逃生通道。**
绕开锁 + 备份 + 临时文件 + 原子改名的安全写路径
（`src/core/state/state-store.ts:78-91`），且不产生任何审计事件——审计链
上出现一段无法解释的「时间倒流」：上一条事件还在 `state_build`，下一条
凭空回到 `state_plan`。这恰恰违反 OCN 自己卖的纪律（审计链完整可解释，
CLAUDE.md §4.5/§4.7）。

**核心矛盾：没有受控逃生通道，用户就会用不受控的方式逃生——纪律产品不能
逼用户破坏纪律。**

## 2. 核心思想：把体外手术变成体内受控操作

> 把不可避免的回退从**体外手术**（手改 `state.json`，无锁、无校验、无审计）
> 变成**体内受控操作**（持锁 + 合法性校验 + 强制 reason + push 审计事件）。

关键转换：**回拨不是撤销历史，而是在审计链上新增一条向后移动的事件。**
审计 JSONL 是 append-only 的——`cursor_rewind` 事件像 `state_transitioned`
一样追加在链尾，带上 from/to/reason，时间倒流就变成了可解释、可问责的
正常记录。一句话：

> **时间线永远向前，游标可以向后。**

两个命令分工：

| 命令 | 范围 | 语义 |
|---|---|---|
| `ocn rewind --to <step>` | 轮内 | 同一轮里把游标拨回严格更早的一步，工件与台账按 §3.4 矩阵处置 |
| `ocn cycle new` | 跨轮 | 本轮收档，`.ocoding` 归档，游标归零开新一轮；docs/ 产物保留供门禁快进 |

## 3. `ocn rewind` 规格

> 命名（2026-06-12 裁决，§8 开放点⑦）：游标回拨命名 **`ocn rewind`**——
> `reset` 在冻结契约 §25 中已是"删除式归零"语义（回到原点），回拨到任意
> 更早步是"倒带"不是"归零"，两个动词各归其位，零冲突。

### 3.1 命令面

```
ocn rewind --to <stepId> --reason <text> [--json]
```

- `--to`：目标步 id（如 `step_build_plan`），稳定字符串 id，禁止数字指针（§4.1）
- `--reason`：必填非空——没有理由的回拨不予执行（对齐 advance override 与
  readiness waive 的"强制说明"惯例）

### 3.2 目标步合法性校验（两条，全部命中才执行）

1. **存在性**：`--to` 必须存在于当前 pin 的 profile——用
   `profile.stateOrder` + `profile.stepsForState(stateId)` 判定
   （接口见 `src/types/sop.ts:20-21`，实现 `src/core/sop/loader.ts:208-210`；
   与 `sop upgrade` 的 `missingCursorId` 用同一对原语，`upgrade.ts:82-88`）。
2. **严格更早**：目标步在 profile 声明序中必须**严格早于**当前游标。位置
   比较由 profile 的声明顺序**临时推导**，仅用于比较，不落任何数字指针进
   状态（§4.1 红线：`order` 只许排序展示，源 of truth 仍是字符串 id）。

不允许 rewind 到当前步（无操作伪装成操作）；不允许向前（那是 advance 的
职权，且会绕过门禁）。是否限制跨 state 回拨见 §8 开放点⑤——本提案默认
**允许**（现场①就需要从 `state_build` 跨回 `state_plan`）。

### 3.3 写入机制与审计

完整复用 advance 的成熟模式（`advance-state.ts:179-273`）：

1. `withLock`（`.ocoding/.lock`，5s 超时，lock 生命周期事件挂同一
   correlationId）；
2. 锁内重读 state，发现游标已被并发改动 → 结构化 stale 错误，放弃写入
   （同 `StaleAdvanceError` 模式，`advance-state.ts:192-225`）；
3. `writeStateUnlocked` 走备份 + 临时文件 + 原子改名
   （`state-store.ts:78-91`，CLAUDE.md §4.5）；
4. **push 审计**（§4.7，对齐 advance/gate）。新增事件类型 `cursor_rewind`
   入 `AuditEventType` 枚举（`src/types/audit.ts:9-39`），事件携带：

```jsonc
{
  "eventType": "cursor_rewind",
  "result": "success",
  "actor": "user",            // 人类专属，见 §3.5
  "source": "cli",
  "correlationId": "<ULID>",  // 串起本次 rewind 全部事件（audit.ts:82-86）
  "data": {
    "from": { "stateId": "state_build", "stepId": "step_implementation_log" },
    "to":   { "stateId": "state_plan",  "stepId": "step_build_plan" },
    "reason": "sop upgrade 0.4.0→0.5.0 越过台账生成点，回拨重过 build-plan 门禁"
  }
}
```

> 命名说明：数据模型 §12.15 既有 `reset_executed` 事件保留给冻结契约 §25
> 的**文件删除式 reset** 语义（§8 开放点⑦已裁决），rewind 用自己的
> `cursor_rewind` 事件，零冲突。失败路径补 `cursor_rewind_failed`（或复用
> result=failed，实现时定）。

### 3.4 副作用矩阵

| 对象 | 处置 | 依据 |
|---|---|---|
| `docs/*.md` 产物 | **一律不动** | 产物是证据不是状态；回拨后 gate 据其现状重新裁定 |
| readiness waiver | **不需要额外动作**——评估期按 `waiver.stateId !== currentStateId` 自动失效（`src/core/readiness/evaluator.ts:253-257`；stateId 在授予时记录，`src/core/readiness/waive.ts:113`） | 既有 state-change 语义天然覆盖跨 state 回拨。注意：**同 state 内回拨 waiver 仍存活**（粒度是 state 不是 step），是否收紧见 §8 开放点⑧ |
| `.ocoding/task-ledger.json` | **保留**（§8 ①已裁决）：rewind 不动台账，重过门禁时按哈希语义自动对账 | 台账重生成已有"哈希未变则保留 done"语义（DEC-032 决策 3） |
| `state.json.latestGateResult` | 置 `null`（旧门禁结论对新位置无意义） | `src/types/state.ts:34-43` |
| history 记录 | **不新增 state.json 字段**——`ProjectState` 是 `z.strict()` 且无 history 字段（`state.ts:34-44`），历史的唯一载体就是审计链（`.ocoding/audit/audit-events.jsonl`，`src/core/audit/audit-paths.ts:8-10`）。`cursor_rewind` 事件即历史记录 | 避免 schemaVersion（`z.literal("1.0")`）变更；如确需游标历史快查，作为 §8 开放点⑥ |
| `.ocoding/logic-graph.json` / `readiness.json` 等投影 | 不动——它们在下次 check/gate 时按现状重算 | 投影是缓存不是真源 |

### 3.5 人类专属（CLI only，不暴露 MCP）

`ocn rewind` **不进入 MCP 白名单**（CLAUDE.md §4.8 已显式列
`navigator.reset_project` 为 v1.0 禁止暴露项；契约 §2.6 同：「MCP v1.0 不
暴露任何可推进状态、重置项目、修改 SOP 或写正式决策的工具」）。理由与
advance 同类且更甚：移动游标即改写"项目位于何处"这一最高权力，AI agent
若可自助回拨，等于可以洗掉自己面前的门禁记录。白名单 7 工具维持不变。

## 4. `ocn cycle new` 规格

### 4.1 语义

当前轮收档：把本轮 `.ocoding` 运行时状态归档，游标重置到 profile 首步
（`stateOrder[0]` 的第一个 step），开启新一轮。**docs/ 产物全部保留**——
新一轮 advance 时各步门禁对既有产物按现状裁定，结构完好的文档使门禁
快进（fast-forward），这是有意设计：第二轮的成本应当只剩"增量修订 +
重新过门禁"，而非从零重写 20 份文档。

`cycle new` **不得复用 `ocn init` 路径**（init 拒绝已初始化目录，
`init.ts:132-137`，该拒绝是正确的且保持不变）——它是独立引擎操作：归档 →
重建 `.ocoding` 运行时文件（profile 快照渲染复用 `src/core/sop/snapshot.ts`，
与 init/upgrade 共用，DEC-029 子决策 3）→ 写新游标 → 审计。

### 4.2 归档机制（§8 ②已裁决：方案 A）

归档对象 = `.ocoding` 全部运行时文件（清单即 `src/core/paths.ts:6-25` +
`audit-paths.ts:8-9`）：state.json(+.bak)、sop/gates/artifacts/config.yaml、
logic-graph.json、readiness-rules.yaml、readiness.json、
readiness-waivers.yaml、readiness-frozen.json、task-ledger.json、audit/。

候选布局：

| 方案 | 布局 | 取舍 |
|---|---|---|
| A | `.ocoding/cycles/<n>-<ISO-ts>/` | 归档随 `.ocoding` 走，单目录自含；但 `.ocoding` 通常不入库，历史轮次随之失踪 |
| B | `.ocoding-archive/<n>-<ISO-ts>/`（项目根） | 可独立决定是否入库；多一个根目录 |
| C | `docs/cycles/<n>/`（仅摘要 + 指针） | 人类可读层入库，机器层仍按 A/B |

已裁决（§8 ②）：**方案 A**（最小侵入）+ 可选 C 摘要。

### 4.3 审计连续性（本命令的纪律底线）

- **机器层**：审计 JSONL 在 `.ocoding/audit/` 内，若随轮归档则新轮链条
  断裂。已裁决（§8 ③）：**方案甲**——审计目录**不归档、跨轮连续**——
  同一条 JSONL 贯穿项目全生命周期，`cycle_started` 事件天然衔接前后。
  （落选的方案乙：审计随轮归档 + `data.previousCycle` 交叉引用。）
- **人类层**：`docs/22-audit-trail.md`（双轨写入的人类侧，
  `audit-paths.ts:10`）本就在 docs/ 中跨轮保留，天然连续。
- **`cycle_started` push 审计事件**（新增入 `AuditEventType`）：携带
  轮次号、归档路径、上一轮终止位置（from）、新一轮起点（to）、
  correlationId；actor 固定 `"user"`。

### 4.4 轮次计数与新一轮 SOP 版本（§8 ②④已裁决）

- **轮次号存放**（§8 ②附）：已裁决——**归档目录名编号**（零 schema
  变更）。落选：state.json 新字段（触发 strict schema 变更）、`config.yaml`。
- **新一轮 pin**（§8 ④）：已裁决——**维持当前 pin**（cycle 不应偷偷改变
  行为，升级是 `ocn sop upgrade` 的职权且有自己的审计事件），命令输出
  附带升级提示。落选：跟随 runtime default（当前 `0.5.0`，
  `src/core/sop/loader.ts:244`）。

### 4.5 与现场②的关系

终点步 `step_final_build_verdict` 上唯一的合法去路就是 `cycle new`（轮内
小修则用 `rewind`，分工边界见 §8 开放点⑨）。`no_next_step` 的报错信息
（`advance-state.ts:142-145`）届时应加一句指路 `ocn cycle new`（文案改动，
随 P3 落地）。

## 5. CLI 面

注册范式照搬最近的 `task` 命令：`src/cli/index.ts:30-53` 顺序注册 +
`src/cli/commands/task.ts` 的 commander 子命令 + `outputResult` 文本/
`--json` 双渲染；所有人类可读输出走 `BilingualMessage`（en/zh 双语必备，
§4.4），结构化返回 `CommandResult<T>`。

### 5.1 退出码映射（沿用 §4.6 稳定表，不新增码位）

`ocn rewind`：

| 失败模式 | ErrorCode | exit |
|---|---|---|
| 成功回拨 | `OK` | 0 |
| 未初始化（state.json 缺失） | `ERR_IO_OR_CONFIG` | 4（对齐 advance 现行为，`advance-state.ts:41-48`） |
| state.json 不合法 | `ERR_STATE_MACHINE` | 3 |
| `--to` 不在当前 pin 的 profile | `ERR_STATE_MACHINE` | 3 |
| `--to` 不严格早于当前游标（含等于） | `ERR_STATE_MACHINE` | 3 |
| `--reason` 缺失或为空 | `ERR_IO_OR_CONFIG` | 4（先例：契约 §25.7「hard reset 未确认 → ERR_IO_OR_CONFIG」） |
| 锁超时 | `ERR_IO_OR_CONFIG` | 4 |
| 并发 stale（锁内重读发现游标已变） | `ERR_STATE_MACHINE` | 3 |

`ocn cycle new`：

| 失败模式 | ErrorCode | exit |
|---|---|---|
| 成功开新轮 | `OK` | 0 |
| 未初始化 | `ERR_IO_OR_CONFIG` | 4 |
| 归档写入失败（含磁盘/权限） | `ERR_IO_OR_CONFIG` | 4 |
| `--yes` 二次确认缺失（§8 ⑩已裁决：强制） | `ERR_IO_OR_CONFIG` | 4 |
| 锁超时 | `ERR_IO_OR_CONFIG` | 4 |

### 5.2 MCP

两个命令均不暴露 MCP，白名单 7 工具不变（理由见 §3.5；`cycle new` 同属
"改写项目位于何处"权力，且附带批量文件迁移——比 advance 更不该交给 agent）。
`navigator.where_am_i` / `navigator.brief` 只读地反映 rewind/cycle 后的新
位置，无需改动。

## 6. 与现实门禁的交互：现场①的修复路径（演示主路径）

rewind 设计的第一验收场景就是修复现场①，全链如下：

```
（0.5.0 pin，游标在 state_build，台账缺席）
→ ocn rewind --to step_build_plan --reason "升级越过台账生成点"
    游标回 state_plan / step_build_plan；cursor_rewind 入审计
→ ocn check
    0.5.0 profile 要求 section_task_specs（0.5.0/data.ts:45-46）
    → build plan 还是 0.4.0 模板，缺 Task Specs 章节 → blocked (exit 2)
→ 人 + AI 补写任务规格块 → ocn check ⇒ pass
    门禁通过时写出 task-ledger.json，verify 命令哈希冻结
    （gate-runner.ts:307-341）
→ ocn advance ×2 回到 state_build
→ /ocn-next 从台账派单；ocn task check 逐项勾销
→ advance 出 BUILD 受台账转移门禁裁定（advance-state.ts:159-175）
```

三个要点：

1. **rewind 本身不生成台账**——台账唯一生成点仍是 build-plan 门禁（R4：
   裁判不在选手写路径上，rewind 也不例外）。回拨只是把项目送回裁判面前。
2. **已 done 任务的对账**：若回拨发生在台账已存在、部分任务已 done 的轮次
   （非现场①，但轮内返工常见），重过门禁时沿用 DEC-032 决策 3 的哈希保留
   语义——verify 命令哈希未变的 done 任务保留状态，变了即重新 pending。
   是否在 rewind 时主动标记 stale 见 §8 开放点①。
3. **回拨后的每次 advance 都重新过完整门禁**（章节 + 逻辑 + 就绪 + 0.5.0
   任务门禁）——rewind 不附带任何豁免；这正是它与手改 state.json 的本质区别。

## 7. 交付切分（每个 = 一次 PR 级增量，≤500 行 diff）

| 阶段 | 内容 | 测试层（对照 `tests/` 现有分层） |
|---|---|---|
| P0 | rewind 引擎：合法性校验 + 锁内写入 + `cursor_rewind` 审计（含 `AuditEventType` 扩枚举） | `tests/unit`（校验纯函数）+ `tests/lock`（并发 stale / 锁超时） |
| P1 | rewind CLI：commander 注册 + 双语渲染 + `--json` + 退出码 | `tests/cli` |
| P2 | cycle 引擎：归档 + 运行时文件重建（复用 snapshot.ts）+ 游标归零 + `cycle_started` 审计 + 审计连续性 | `tests/unit` + `tests/lock` |
| P3 | cycle CLI + `no_next_step` 报错指路文案 + brief/status 对新轮次的呈现核对 | `tests/cli` + `tests/e2e`（现场①修复全链 dogfood 脚本） |
| 收口 | 文档：rewind/cycle 新命令的契约 amendment（常规新增，§25 不动）+ DEC-033 入决策日志 + README/quickstart 增补 | — |

P0/P1 可先行独立发版（现场①等着用）；P2/P3 随后。全程 OCN 自项目 +
Lattice 双现场 dogfood。

## 8. 开放设计点（已全部裁决 — 2026-06-12，用户按提案倾向一次性裁决）

1. **台账失效策略**（§3.4）——**裁决：保留**（重过门禁时哈希语义自动
   对账，DEC-032 决策 3）。实现约束：须验证 stale 台账在 `state_plan`
   期间不会误触发 brief/next-prompt 的台账分支。
2. **归档目录布局**（§4.2）——**裁决：方案 A**（`.ocoding/cycles/<n>-<ISO-ts>/`）
   + 可选 C 人类摘要；轮次号载体 = 归档目录名编号（零 schema 变更）。
3. **审计连续性方案**（§4.3）——**裁决：方案甲**——审计目录不归档、跨轮
   连续，同一条 JSONL 贯穿项目全生命周期，`cycle_started` 事件天然衔接。
4. **cycle 后 SOP 版本**（§4.4）——**裁决：维持当前 pin**；命令输出附带
   升级提示。升级是 `ocn sop upgrade` 的职权。
5. **rewind 是否允许跨 state 回拨**——**裁决：允许**（现场①必需），不设
   `--cross-state` 旗标。
6. **游标历史快查**——**裁决：不给 state.json 加字段**（历史唯一载体 =
   审计链）。`ProjectState` 是 `z.strict()` + `schemaVersion: "1.0"`
   （`state.ts:34-44`），加字段即触发 schemaVersion 策略——本提案因此不
   构成任何 schema/SOP bump。结构化快查留作后续候选。
7. **与冻结契约 §25 的同名分歧**——**已裁决（2026-06-12，用户）：选 (b)
   改名让位**。游标回拨命名 `ocn rewind`，`reset` 名字保留给 §25 既有的
   **文件删除式归零**语义（配 `reset_executed` 事件，均不动）；rewind 用
   自己的 `cursor_rewind` 事件，三个动词零冲突。裁决理由：reset 的业界
   直觉就是"回到原点"（git reset、恢复出厂），回拨到中途某步是"倒带"，
   语义本就不同。`cycle new`（归档式重开）与 §25 `reset --keep-docs`
   （删除式归零）场景重叠但语义不同——一个体面收档、一个真要抹掉，
   二者共存，留给用户选。新命令的契约面仍需常规 amendment 记录
   （新增 CLI 面，先例：sop upgrade 的 AM），但不取代、不修改 §25。
8. **waiver 失效粒度**——**裁决：维持现状**（state 级，`evaluator.ts:253`；
   同 state 内回拨 waiver 存活），保持单一失效语义，不为 rewind 引入
   事件驱动失效。
9. **终点步后 rewind 与 cycle 的分工边界**——**裁决：不加机器强判**，
   报错/输出文案提示二者分工（轮内返工用 rewind，整轮收档重开用
   cycle new）。
10. **`--yes` 二次确认**——**裁决：`cycle new` 强制 `--yes`**（先例：
    §25.6「reset --hard 必须二次确认」）；`rewind` 不另加（强制
    `--reason` 即确认）。

## 9. DEC-033 草拟（已于 2026-06-12 接受并落入 `docs/20-decision-log.md`，以决策日志成稿为准）

> ## DEC-033｜Rewind & Cycle — 受控游标回拨与重开循环（引擎/CLI，非 SOP bump）
>
> Date: 2026-06-XX
> Implements: full design in `docs/rewind-cycle-proposal.md`（accepted 2026-06-XX）；
> 命名裁决（rewind 让位 §25 reset）已并入提案 §8 开放点⑦；新命令契约面
> 以常规 amendment 随实现落地
>
> ### Status
>
> Accepted — implementation authorized（P0–P3）。
>
> ### Context
>
> Dogfood（2026-06-12）暴露"游标只进不退"的三个现实缺口：(1) 0.4.0 项目
> 通过 build-plan 门禁后中途升级 0.5.0，游标已越过台账唯一生成点
> （gate-runner 仅在 step_build_plan 写 ledger；upgrade 按 DEC-029 保留
> 游标），Task Backbone 本轮静默失效且无恢复路径；(2) 终点步
> step_final_build_verdict 后无受控重开方式（SHIP/REFLECT 为 stub）；
> (3) 手改 state.json 成为事实逃生通道——绕过锁/备份/原子写且零审计，
> 审计链出现不可解释的时间倒流。纪律产品不能逼用户破坏纪律。
>
> ### Decision
>
> 把不可避免的回退从体外手术变成体内受控操作——时间线永远向前，游标可以
> 向后：
>
> 1. **`ocn rewind --to <step> --reason <text>`**（轮内回拨）：目标步必须
>    存在于当前 pin 的 profile（stateOrder/stepsForState）且严格早于当前
>    游标；持锁 + 锁内 stale 检查 + 备份/原子写（与 advance 同机制）；
>    push 审计 `cursor_rewind`（from/to/reason/actor/correlationId）。
>    docs/ 产物一律不动；readiness waiver 按既有 state-change 语义自动
>    失效；回拨后每次 advance 重过完整门禁（含 0.5.0 任务门禁）——这构成
>    现场 (1) 的标准修复路径。
> 2. **`ocn cycle new`**（跨轮重开）：归档本轮 `.ocoding` 运行时状态，
>    游标归零开新一轮；docs/ 产物保留供门禁快进；审计连续性为底线
>    （`cycle_started` push 事件交叉引用上一轮）；不复用 init 路径，
>    profile 快照渲染复用 snapshot.ts。
> 3. **人类专属**：两命令均 CLI-only，MCP 白名单 7 工具不变（§2.6/§4.8——
>    与 advance_phase 同类的"项目位于何处"最高权力，不交给 agent）。
> 4. **退出码沿用 §4.6 稳定表**，不新增码位；BilingualMessage +
>    CommandResult text/--json 双渲染。
> 5. **非 SOP 版本升级**：状态机步骤集与门禁内容不变，不触碰 profile；
>    state.json 不加字段（历史唯一载体 = 审计链），schemaVersion 不动。
>
> ### Out of scope
>
> - 契约 §25 文件删除式 `ocn reset` 的实现——`reset` 名字与 `reset_executed`
>   事件保留给该语义（开放点⑦裁决），留待后续独立立项。
> - 跨轮 docs 产物的自动失效/刷新（verify 阶段旧收据快进风险靠人 review
>   与就绪检查，机器强判留作后续候选）。
> - 游标历史的结构化快查字段与多轮统计报表。

---

**接受记录**：本提案于 2026-06-12 由用户接受，§8 全部开放点按提案倾向
一次性裁决，DEC-033 已落入 `docs/20-decision-log.md`，实现授权 P0–P3。
