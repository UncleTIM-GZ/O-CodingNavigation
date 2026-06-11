# 任务主干（Task Backbone）设计提案

> Status: **Proposal — 待 review**（接受后落为 AM-007 + DEC-032，镜像就绪主干的 提案→DEC→引擎→cutover 路径）
> Date: 2026-06-12 · Author: OCN core · Dogfood 触发现场: Lattice `state_build`（2026-06-12）
> Target: **SOP 0.5.0**（新 minor；0.4.0 冻结 + 可导入，`ocn sop upgrade` 迁移）

---

## 1. 问题：第四类假完成——收据型假完成

SOP 0.4.0 的 20 步全部是文档门禁。编码被假定发生在 BUILD 步骤"内部"，
12/13/14（实现日志/变更证据/集成说明）是它的**收据**——但引擎只验收收据的
章节结构，不验收收据背后的现实。

Lattice dogfood 实锤（2026-06-12）：

- agent 如实交出两张"零代码收据"（12/13 号明确写"本窗口无业务逻辑代码变更"），**全部通过门禁**；
- `next-prompt` 的 Allowed work 只授权当前文档工件，agent 按契约**合法地不能写代码**；
- `/ocn-next` 因此永远派发文档任务；
- 就绪检查 `rdy_pmo_proportionality` 连续多轮 warn"停止扩文档，转去写代码"——系统闻到了，但只能警告。

**第二组现场证据（同日，更严重——全链空转 run-through）**：该项目随后
继续 advance 进入 `state_verify`，验收映射文档如实标注 **23/25 条 AC
missing** 仍通过门禁；距 `final_build_verdict` 仅数步——整条 SOP 链即将
"诚实地空转完一整轮"，而 Phase 0 代码从未被任何步骤排入。四道防线（章节/
逻辑/就绪/人类 advance）无一能挡：状态机成了跑步机。**若本提案 §7 的转移
门禁已存在，空转在 build→verify 边界即被阻断**——这条证据把 P3 的优先级
从"重要"锁死为"必须"。现场处置：人工停止 advance，游标驻留 verify 中段，
先按 build plan 补编码、刷新 12–16 为真实证据后再继续推进。

| 类 | 假完成形态 | 防线 |
|---|---|---|
| 1 | 章节缺失 | 章节门禁（v1） |
| 2 | 结构齐全但逻辑未接线 | 逻辑主干（SOP 0.3.0） |
| 3 | 角色盲区 | 就绪主干（SOP 0.4.0） |
| **4** | **收据齐全但现实缺席** | **本提案** |

三个机制共同造成：① SOP 层——"实施"从未被状态机表达；② 派发层——
next-prompt 不授权编码；③ 门禁层——收据与现实（代码/测试/AC 证据）之间
零机械链接。

## 2. 核心思想：与前两根主干同构的命题转换

> 把不可验证的命题（**"按计划实现了吗？"**）
> 转换成可验证的命题（**"每个任务规格的验收命令都跑通了吗？"**）

实施的"拆分"由人 + AI 在写 `docs/11-build-plan.md` 时完成——每个任务是一
份**迷你 spec**（目标/追溯/触点/验收命令/完成定义）。拆得好不好，在进入
BUILD **之前**就被门禁机器检查；实施过程则变成对任务台账的逐项勾销，每一
项勾销都由该任务**自带的确定性验收命令**裁定，不靠自述。

这同时实现了用户的方法论要求：**BUILD = 按拆分后的 spec 小步实现，输出
效果由 per-task 验收命令控制**（spec-driven development 的工程化落地）。

## 3. 任务规格块（Task Spec Block）

宿主：`docs/11-build-plan.md` 新增必备章节 `## Task Specs｜任务规格`
（沿用逻辑主干块/就绪块的"文档内机器可解析区"成熟模式）。

```markdown
## Task Specs｜任务规格

### task_phase0_runtime_skeleton
- goal: permit runtime 最小可运行骨架（替换全部 NotImplementedError）
- traces: AC-03, AC-07
- touches: score_risk, api_put_permit
- verify: pytest tests/test_runtime.py -q
- dod: 接口签名全部可执行；RED→GREEN 过程记入 12 号实现日志
- phase: P0

### task_wrapper_litellm
- goal: LiteLLM wrapper 接缝实现（六件上游之一）
- traces: AC-12
- touches: sig_llm_call
- verify: pytest tests/integrations/test_litellm.py -q
- depends: task_phase0_runtime_skeleton
- phase: P1
```

字段定义：

| 字段 | 必填 | 校验 |
|---|---|---|
| `### task_<slug>` | ✓ | id 全局唯一，`task_` 前缀（§4.2 稳定 ID 约定） |
| `goal` | ✓ | 非空 |
| `traces` | ✓ | ≥1，每项必须解析到 `03-acceptance-criteria.md` 的真实 AC（复用 execution-navigator 的 acceptance-parser；AC id 格式对齐见 §9 开放点①） |
| `verify` | ✓ | 非空 shell 命令；**通过门禁时哈希冻结进台账**（R4：裁判不在选手写路径上） |
| `dod` | ✓ | 非空散文（完成定义，给人读） |
| `touches` | 可选 | 每项解析到 `.ocoding/logic-graph.json` 节点 id（图缺席时跳过校验并 warn） |
| `depends` | 可选 | 解析到已定义任务 id；无环 |
| `phase` | 可选 | 分组标签，仅展示排序 |

**硬缺陷（任一命中 → `step_build_plan` 的 `ocn check` blocked，exit 2）**，
与逻辑主干六缺陷同风格：

1. 重复任务 id
2. 必填字段缺失/为空
3. traces 悬空（AC 不存在）
4. touches 悬空（逻辑图节点不存在）
5. depends 悬空或成环
6. 任务数为 0（有 Task Specs 章节但没有任务 = 未拆分）

## 4. 机器投影：任务台账

门禁通过 → 写出 `.ocoding/task-ledger.json`（对标 `logic-graph.json`，
机器真源，§4.10）：

```json
{
  "version": 1,
  "generatedAt": "2026-06-12T...Z",
  "buildPlanHash": "<sha256 of Task Specs section>",
  "tasks": [{
    "id": "task_phase0_runtime_skeleton",
    "goal": "...", "traces": ["AC-03","AC-07"], "touches": ["score_risk"],
    "verifyCommand": "pytest tests/test_runtime.py -q",
    "verifyHash": "<sha256>",
    "dod": "...", "depends": [], "phase": "P0",
    "status": "pending",
    "evidence": null
  }]
}
```

- `status`: `pending | done`（v1 二态，不做 in_progress——进行中状态由 git 现场表达）
- `done` 只能由 `ocn task check` 在验收命令 exit 0 后写入（带 `ranAt`/`exitCode`/`commandHash` 证据），经锁 + 原子写
- **冻结语义**：`task check` 运行前比对当前文档命令哈希与台账 `verifyHash`，不一致 → `ERR_GATE_FAILED`"任务规格已漂移，请重过 build-plan 门禁"——实施期间偷改验收命令会被抓住

## 5. CLI 面（人类 + /ocn-next 的底层）

```
ocn task list [--json]        # 台账总览：id/phase/status/verify 结果（pull，只读，无审计刷屏）
ocn task check [<id>] [--json]
   # 跑指定任务（缺省=第一个 pending 且 depends 已清的任务）的冻结 verify 命令
   # exit 0 → status=done + 证据落账（push 审计 task_completed）
   # 非 0   → ERR_GATE_FAILED + 命令输出尾部
```

- 不新增 `task done`（人工免跑勾销）——**勾销只能由验收命令裁定**；确实要砍任务 = 改 build plan → 重过门禁 → 台账重生成（已 done 且哈希未变的任务保留状态）
- MCP：**不暴露 task check**（运行任意命令 + 写状态）；`navigator.brief` 增量输出台账摘要（pending/done 计数 + 下一个任务）即可

## 6. 派发：`/ocn-next` 在 BUILD 态的新语义

`next-prompt` 检测 `state_build` + 台账存在时，九段式简报改为从台账派单：

- **Objective** = 第一个 pending 且 depends 已清的任务规格**原文**（goal/traces/dod）
- **Allowed work** = 该任务 touches 范围内的代码与测试 + 当前回执文档（12/13/14）的真实证据更新
- **Verification** = 该任务冻结的 verify 命令 + `ocn task check <id>`
- **Stop conditions** = DoD 达成且 task check 通过，或证据不足需人工
- 台账缺席（旧项目 / 0.4.0 pin）→ 回落现行为，零回归

## 7. 现实门禁：零任务未清不准出 BUILD

`ocn advance` 跨出 `state_build` 的转移门禁：台账存在且有任务 `pending`
→ `ERR_GATE_FAILED`（exit 1），逐条列出未清任务。一句话规则：

> **任务台账不清，不准进 VERIFY。**

收据（12/13/14）在 BUILD 内部仍可诚实地阶段性留空——不逼 agent 撒谎；
但状态机不再放行"零实现"穿越到验证阶段。

## 8. 交付切分（每个 = 一次 PR 级增量，全程 Lattice 二轮 dogfood）

| 阶段 | 内容 | 出口验收 |
|---|---|---|
| P0 | 任务块解析器 + 六缺陷校验器 + 台账写出 + `ocn task list` | 校验器单测全绿；Lattice build plan 拆出真实任务块并过门禁 |
| P1 | `next-prompt` BUILD 态从台账派单（含回落） | Lattice `/ocn-next` 派出第一个编码任务 |
| P2 | `ocn task check`：冻结命令执行 + 勾销 + 审计 | 任务经真实 pytest 勾销；漂移被拒 |
| P3 | 转移门禁 + brief 台账摘要 | 未清任务时 advance 被阻断 |
| 收口 | SOP 0.5.0（build-plan 模板加 Task Specs 必备章节）+ cutover DEC + AM-007 + README/SOP 文档 v7 + 发版 | `ocn sop upgrade` 0.4.0→0.5.0 迁移可用（步骤集不变，游标兼容天然成立） |

过渡期（P1 落地前）：`next-prompt` BUILD 态先做一行语义修正——主目标改为
"按 build plan 实施（TDD、AC 追溯），回执文档完工后用真实证据更新"——
即刻解除"agent 合法地不能写代码"的死锁（Lattice 当下则按人工指令开工
Phase 0，不受本提案影响）。

## 9. 开放设计点（实现前需逐一裁决）

1. **AC id 格式对齐**：traces 解析依赖 03 号文档的 AC 可寻址性；需确认
   acceptance-parser 现有 id 提取规则（`AC-NN`？标题锚？），不一致则先在
   03 模板里固化 id 约定（小幅模板修订，随 0.5.0 一并出）。
2. **verify 多命令**：v1 单命令（用 `&&` 串联）；列表形式留给后续。
3. **超时**：沿用命令探针 120s？编译型项目可能不够——提案 `timeout` 可选
   字段（缺省 120s，上限 600s）。
4. **任务粒度指引**：模板注释给出"一个任务 = 一次 PR 级增量（≤500 行 diff）、
   有独立 verify"的拆分准则——拆分质量本身靠就绪主干的 proportionality
   检查与人 review，不做机器强判。
5. **12/13/14 收据**：v1 仅模板注释引导"引用任务 id"；收据自动汇出
   （从台账+审计生成草稿）留作 0.6.0 候选。

## 10. DEC-032 草拟（接受本提案后入决策日志）

> **DEC-032｜Task Backbone — BUILD 态的实施任务循环（SOP 0.5.0）**
> 把"实现真的发生"转换为可验证命题：build plan 内含机器可解析的任务规格
> 块（goal/traces/touches/verify/dod），门禁校验六类硬缺陷并冻结 verify
> 命令进 `.ocoding/task-ledger.json`；`/ocn-next` 在 BUILD 态从台账派单；
> `ocn task check` 以冻结命令确定性勾销；任务未清不准 advance 出 BUILD。
> 勾销无人工免跑通道（验收命令是唯一裁判）；MCP 不暴露 task check；
> 0.4.0 冻结可导入，`ocn sop upgrade` 迁移。
> 触发证据：Lattice dogfood 2026-06-12——两张零代码收据全部过门禁 +
> proportionality 连续 warn + next-prompt 授权死锁。

---

**Review 焦点建议**：§3 字段表与六缺陷（schema 一旦冻结就是契约）、§5 的
"勾销只能由验收命令裁定，无人工通道"（最强硬的一条，也最容易被现场挑战）、
§9 开放点 1/3。
