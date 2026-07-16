# fable5-mode 参照评审与结论

> Status: **Closed — 两项提案均被否决（2026-07-16）**
> Date: 2026-07-16 · 评审方式: 4 个独立 fresh-context subagent（产品/架构/对抗/治理）+ 逐条代码核实
> 结论: **不产生 AM / DEC 号。** 本文是否决记录，不是提案。
> 本文的主要用途: **防止这两项被再次提出。** 若你正打算提"归因阶梯"或"暂停键"，先读 §2。

---

## 1. 外部参照：`github.com/cozytab/fable5-mode`

第三方 Claude Code skill + 4 个 hook（MIT，2026-07-06 起，~2800 行，88 测试绿，115 star）。
命题：`产出质量 = 模型能力 × 工作纪律`，用纪律把弱模型拉到强模型水平。

**唯一值得长期记住的一点**（与代码无关，与战略有关）：

> 它在与 OCN 零接触的情况下，独立收敛到几乎同构的原语——计划门、卡片台账、验收命令通过才算完成、
> fresh-context 对抗式验证者（= AM-011）、证据留痕才准收卡、退出口必须带理由。
> **两套设计各自长出同一副骨架，是 OCN「纪律即产品」命题的外部验证。**

**但它不是需求证据**：它的 4 个 issue 全部来自同一个非作者用户，**没有一个**要求暂停键或归因阶梯。
OCN 自身：1 star / 0 fork / 96 个 issue-PR 全部由仓库主开 / 零外部 issue。**两个仓库加起来，
零个用户要求过本次提案的任何一项。**

---

## 2. 被否决的两项（不要再提）

### 2.1 归因阶梯 —— REFUTED

**曾经的设想**：门失败时注入一段三层归因文本（先怀疑测试脚手架 → 再确认新代码是否在跑 → 最后才调产品）。

**致命伤（一条就够）**：它引以为据的实锤是 `spawn-tests-need-fresh-dist`，而那条记忆原文写的是
**"local `vitest run` was green (897)"** —— 本地是**绿的**，`exitCode === 0`。而阶梯的挂点设计在
`task-check.ts` 的 `exitCode !== 0` 分支。**它对自己唯一的动机案例，在结构上不可能触发。**

**真正的修法是一行配置**（见 §3.1）。把"优先级③警告"用在一个"优先级①一行配置"能根治的问题上，
直接违反本仓既定的根因优先级排序。

其余已核实的实现错误（任一独立成立）：
- `text.ts:516` 把 data block 全挡在 `result.ok` 之后 → task-check 失败是 `ok:false`，
  设想的 `fixHint` 渲染通路**不可达**。
- 熔断器仅当 `actor === "ai_agent"` 时非 null → **默认手动模式永不跳闸**；且 `task check`
  根本不喂熔断器 → 设想的两个挂点在**不相交的路径**上。
- 「性质同 AM-011」是虚假类比：AM-011 的建议性评审终结于引擎强制的 `--rationale` 必填字段
  （`authorization.ts:60`），阶梯零机械残留、不可证伪。

### 2.2 `ocn pause` / `ocn resume` —— REFUTED（问题真实，方案错误）

**曾经的设想**：加 `pausedAt` 字段 + 新命令，复用 `isStopped` 的面，暂停时全面静音。

**致命伤**：
- 「复用已打通的 6 个面，只多一个谓词」是**事实错误**。漏了第 7 个面：
  `execution-navigator/ocn-state-reader.ts:72` **内联** `state.stoppedAt !== null`，不走 `isStopped`
  —— 那是 `/ocn-next`，日常最高频的 AI 面。按原清单实现，**暂停的项目会被 `/ocn-next` 继续驱动**。
- 「human-only 是安全边界」是**假的**。`actor.ts:10-13` 逐字否认：
  "**GOVERNANCE SIGNATURE, not a security boundary**"。`OCN_ACTOR=user` 一行前缀即绕过，
  与 stop / cycle new / readiness waive / sop upgrade **逐字节同构**（已实测）。
- **自相矛盾**：一边说 fable 的「理由 <3 字符即忽略」值得逐字继承，一边说 fable 的
  「证据 <6 字符即忽略」与本仓立场直接冲突。同一个机制，3 和 6，同一文档里相反的裁决。

**但问题陈述是真的，而且比设想的更严重** —— 见 §3.2。

---

## 3. 真正站得住的发现（按优先级）

### 3.1 假绿的根因：`test` 脚本不重新编译（一行修复，未做）

`package.json:33` = `"test": "vitest run"`；`.husky/pre-commit` = `lint && typecheck && test`
—— **全链路没有 build**。spawn 测试因此可能打旧 `dist` → 本地绿、CI 红。

修法：`"test": "npm run build && vitest run"`。改完这类失败在本仓**从构造上不可能发生**。

### 3.2 `ocn stop` 是没有出口的吸收态，且产品文案在误导用户（真 bug，未修）

已核实：全仓库只有 `init.ts:83` 把 `stoppedAt` 置 null、`stop-project.ts:141` 置时间戳，
**没有任何东西能清回来**——`cycle new` 也不行（`archive.ts:126` 的 spread 原样带过去）。

而 `stopped.ts:17-23` 的 `STOPPED_NOTICE` 对用户承诺 "To resume OCN, re-wire with `ocn agent setup`"。
**重新接线会装回 hooks，但 `isStopped()` 永远为真** → brief 继续静默、advance 继续拒绝。
**那条恢复路径不存在。**

所以真正的提案（若将来要做）不是"进口暂停键"，而是**「把 AM-016 做完」：给 `stoppedAt` 补逆向迁移**。
这个重述之后根本不需要 fable 当论据。

若将来实现，治理评审给出的三条收窄（比原设想显著更好）：
1. **只静音 Stop hook**。已核实六个面里只有它是"不请自来"的，其余全是 pull 模式——用户不问就不说话。
2. **brief/status 不静音，反而在顶部显著回显 `⏸ 已暂停：<理由>`**。非法暂停会自曝，合法暂停帮用户
   隔天想起原因。**奖品归零 → 诱因归零，比加固守卫有效且不依赖 AI 诚实。**
3. **真正的风险不是"AI 逃生"**（Stop hook 有 `stop_hook_active` 自释放，逃生收益很小），而是
   **pause 会是第一个人类日常口头委托给 AI 去按的人类专属命令**（"OCN 先暂停一下"）——
   "人类专属"的隐含前提是"人类自己按"，pause 打破它。

### 3.3 `config.yaml` 谎报 tier（真 bug，未修）

`ocn init --tier production` 后，`config.yaml` 仍写 `tier: minimal`——因为它由模板写死生成
（`0.9.0/config.ts:11`）。真 tier 在 `state.json`（正确）。**tier 有两个互相矛盾的真相源。**
今天不炸是因为就绪门读 `state.json`（`readiness-gate.ts:82`），但 `config.yaml` 是用户拥有、
`sop upgrade` 会保留的文件，它对每个 production 用户撒谎。

### 3.4 tier 系统名存实亡（是决定，不是活儿）

实测 `--tier production` vs `--tier minimal`：`artifacts.yaml` / `sop.yaml` / `gates.yaml`
**三个文件逐字节相同**。唯一真实差异是就绪检查条数（production 多跑 26 条）。

而 `docs/01-scope.md` §5.7 定义 tier 该影响的四件事**全是关于文档的**（init 建哪些 / gate 查哪些 /
brief 显示哪些缺口 / advance 能否跳过）——**一件都没实现**。根子：**SOP schema 里没有 tier 字段**，
artifact 上没有挂载点。

**且 §5.7 的 tier 清单已经作废**：它列的 `04-information-architecture` / `05-data-model` /
`06-api-contract` / `07-test-strategy` / `18-dev-log` / `15-baseline`，在 0.9.0 实际产出里分别是
`04-technical-architecture` / `06-data-model` / `08-api-contract` / `09-test-strategy` /
`12-implementation-log` / 不存在。**编号体系整个漂了**（scope 是 DISCOVERY 期冻结契约，本就不该改）。

### 3.5 beta 停止条件从未被尝试（最重要，且不需要写代码）

`docs/01-scope.md:246`：beta = "第二个非工具型业务项目能用 production tier 跑通 DISCOVERY → VERIFY"。
`:1678`：「**beta 不为'更漂亮'继续加功能。beta 目标是验证 OCN 对真实业务项目是否有用。**」

在树的唯一外部验证是 `docs/reports/2026-06-11-readiness-lattice-validation.md`——而 Lattice 自述是
"a Python AI-orchestration project"、**minimal 档**、停在 `step_build_plan`、**只读旁观**。
三点各自出局（Lattice 正是 `00-project-brief` 要排除的"OCN 这类工具项目"）。

DEC-021 授权 beta 之后，DEC-023…DEC-043 共 21 条决策**全部是新能力**，判据一次未试。

**自指反讽（值得钉在墙上）**：OCN 0.9.0 的 SHIP 闭包门拦截"到期但未测量的 outcome"。
OCN 自己的 outcome AC 就是 scope 的 Success Criteria，早已到期、从未测量。
**若 OCN 对自己跑一遍它刚发布的 0.9.0 SHIP 门，它会被自己拦住**——正在现场演示 DEC-043 定义的
第六类假完成（过程完备式）。

**注**：若将来要清 beta 判据，`production tier` 在其中只是修饰词。今天的默认档无论什么 tier 都要求
全部 22 步，**实际比 scope 当初设想的 production 更严格**——判据的精神已满足，卡住的只是字面。
为满足字面而现在去实现 tier，就是又一次"beta 期加功能"，本末倒置。

---

## 4. 结论

**代码层面该做的只有两件小事**（§3.1 一行、§3.3 一个 bug），都不急。

**真正该做的那件不需要写代码**：别再加功能，找一个真实的非工具型业务项目，完整跑一遍。
（§3.5。这也正是 `docs/outcome-backbone-proposal.md:148` 已经把「**遇问题就加检查机制**」
识别为根因、并立誓自律的那件事。）

**方法论备注**：本次的价值全部来自 4 个独立 fresh-context subagent 的对抗式评审——
提案作者（我）自评时六处事实错误一个都没发现。这正是 AM-011 的洞察在提案层面的复现：
**生成者不能是唯一裁判。**
