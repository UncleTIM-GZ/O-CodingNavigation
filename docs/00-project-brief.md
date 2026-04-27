# O’CodingNavigator Project Brief
# #1｜Project Brief 项目问题定义文档
文档路径：`docs/00-project-brief.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.0`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
当前阶段：`DISCOVERY`  
对应 SOP：第 1 步｜先定义问题，不先写代码
---
## 1. 项目名称
O’CodingNavigator
---
## 2. 一句话目标
O’CodingNavigator 是一个 **开源、本地优先、MCP-first、状态机驱动的 AI Coding 流程操作系统**，帮助 Solo Builder、小团队和 AI Coding 教练，把 AI Coding 项目从“连续对话写代码”升级为“可导航、可验证、可回滚、可审计、可复盘的系统工程过程”。
---
## 3. 产品核心定义
O’CodingNavigator 不是代码生成器。  
O’CodingNavigator 不是 IDE。  
O’CodingNavigator 不是 SaaS。  
O’CodingNavigator 不是传统项目管理工具。  
O’CodingNavigator 不是另一个笔记系统。  
O’CodingNavigator 也不是只会生成文档模板的脚手架。
它的本质是：
> **AI Coding 项目的流程导航、状态机、Spec artifact 管理、门禁检查、项目记忆、MCP 工具层和 Prompt 编排系统。**
更具体地说：
> **O’CodingNavigator 帮助用户把 AI Coding 从“靠对话连续推进”，升级为“靠状态机、Spec、Gate、Log、Brief、Audit 和 Evidence 推进”。**
它真正卖的不是功能数量，而是：
> **纪律。**
AI Coding 最大的问题不是 AI 不会写代码。  
而是 AI 写得太快，但用户缺少管理 AI 写代码的流程纪律。
O’CodingNavigator 要把这套纪律产品化。
---
## 4. 核心产品判断
AI Coding 项目常见的失败，不只是“代码写错”。
更常见的是三类系统性失败：
1. 迷路  
2. 失控  
3. 失忆
这三类失败背后的根因不同，因此必须用不同的产品机制解决，不能简单混在一个“日志”或“文档”模块里。
---
## 5. 三大失败模式
### 5.1 迷路
迷路的表现：
不知道现在处在哪一步。  
不知道下一步该做什么。  
不知道为什么被阻塞。  
不知道缺什么文档。  
不知道是否可以开始写代码。  
不知道当前项目距离可交付还有多远。
迷路的根因：
> **目标 - 状态 - 行动链路断裂。**
产品机制：
O’CodingNavigator 必须随时回答：
```text
我现在在哪里？
我为什么在这里？
我被什么阻塞？
下一步应该做什么？
执行哪条命令？
需要补哪份文档？
可以让 AI 做什么？
不应该让 AI 做什么？

对应能力：

ocn status
ocn brief
ocn prompt next
navigator.where_am_i
navigator.brief
显式状态机
阶段门禁
当前阻塞项
下一步行动建议

⸻

5.2 失控

失控的表现：

AI 生成的代码偏离原始目标。
项目范围不断膨胀。
小工具变成大平台。
bugfix 夹带重构。
研究代码污染生产线。
高风险修改没有回滚。
代码和文档不一致。
系统看起来完成，但无法验收。

失控的根因：

验证机制缺失，或变更没有锚定到 Spec。

产品机制：

O’CodingNavigator 必须通过 Spec、Gate 和 Baseline 约束项目：

是否有明确目标？
是否锁住范围？
是否有验收标准？
是否有数据模型？
是否有接口契约？
是否有测试策略？
是否超出 Scope？
是否偏离 Spec？
是否存在高风险改动？
是否有回滚路径？

对应能力：

ocn check
ocn gate
ocn advance
ocn baseline create
ocn sop version
ocn sop diff
ocn sop upgrade --plan
navigator.run_gate
navigator.advance_phase
Spec artifact
Acceptance Criteria
Rollback Plan
Hard Gate
Process Gate
未来 LLM Judge Gate

⸻

5.3 失忆

失忆的表现：

换一个会话，AI 不知道之前做过什么。
隔一天回来，用户自己也忘了为什么这样设计。
项目做了很多修改，但没有决策记录。
bug 修复过，但不知道根因。
baseline 不存在，无法判断后续改动是进步还是退步。
团队成员接手时无法理解项目历史。
AI 只能重新猜上下文。

失忆的根因：

上下文窗口的物理限制 + 人脑提取限制 + 写入路径缺失。

产品机制：

O’CodingNavigator 必须建立分层记忆：

Hot Memory：当前阶段的高密度 brief
Warm Memory：项目级 PRD、AC、ADR、阶段产物、Dev Log、Decision Log、Audit Trail
Cold Memory：跨项目经验、失败案例、模式库、复用片段

MVP 实现：

Hot Memory：ocn brief / navigator.brief
Warm Memory：docs/*.md + dev-log + decision-log + audit-trail + baseline
Cold Memory：暂不实现，预留

对应能力：

ocn brief
ocn log
ocn baseline create
navigator.brief
navigator.capture_log
docs/18-dev-log.md
docs/19-decision-log.md
docs/21-audit-trail.md
docs/15-baseline.md
未来 recall / memory index / SQLite event store

⸻

6. 产品三大核心子系统

基于三大失败模式，O’CodingNavigator 的产品能力分为三大子系统。

⸻

6.1 Navigator：防迷路

目标：

让用户随时知道当前项目处在什么状态、为什么被阻塞、下一步该做什么。

核心能力：

显式状态机
where-am-i 查询
status 报告
brief 生成
next action 建议
prompt next
阶段导航

典型命令：

ocn status
ocn brief
ocn prompt next

典型 MCP tools：

navigator.where_am_i
navigator.brief
navigator.generate_next_prompt

⸻

6.2 Gatekeeper：防失控

目标：

让项目变更始终锚定 PRD、Acceptance Criteria、Scope、Baseline 和 Gate。

核心能力：

文档完整性检查
状态机入口条件检查
状态机退出条件检查
硬门禁
流程门禁
半软门禁接口预留
Scope drift 检测预留
SOP 版本检测

典型命令：

ocn check
ocn gate
ocn advance
ocn sop version
ocn sop diff
ocn sop upgrade --plan

典型 MCP tools：

navigator.run_gate
navigator.advance_phase
navigator.detect_sop_version
navigator.diff_sop_version
navigator.generate_sop_upgrade_plan

⸻

6.3 Memory：防失忆

目标：

让项目不依赖单次 AI 对话和人的临时记忆，而是把关键上下文沉淀到项目文件中。

核心能力：

开发日志
决策日志
audit event
baseline
brief
artifact 记录
SOP 版本记录
未来事件流
未来项目记忆检索

典型命令：

ocn log
ocn baseline create
ocn brief

典型 MCP tools：

navigator.capture_log
navigator.capture_decision
navigator.brief

⸻

7. 项目状态机

O’CodingNavigator 的底层模型不是普通任务列表，而是显式有限状态机。

状态机必须先于代码、CLI、文档模板和 Gate 逻辑定型。

MVP 状态机如下：

DISCOVERY
  ↓
SPEC
  ↓
DESIGN
  ↓
PLAN
  ↓
BUILD
  ↓
VERIFY
  ↓
SHIP
  ↓
REFLECT

⸻

8. 状态机说明

State	中文名	目的
DISCOVERY	发现与定义	定义问题、目标用户、核心场景、边界
SPEC	规格与验收	形成结构化 PRD 和验收标准
DESIGN	系统设计	定义流程、数据模型、接口契约、测试策略
PLAN	闭环计划	定义 MVP 主链路、真实数据、可复现、回滚
BUILD	实现构建	按 Spec 小步实现，记录 Dev Log
VERIFY	验证确认	小样本验证、分层调试、Baseline、能用性验收
SHIP	发布交付	发布准备、可观察性、审计链、Release Notes
REFLECT	复盘演化	真实场景观察、复盘、长期证据、下一轮演化

⸻

9. 每个状态必须定义的字段

每个状态必须包含以下结构：

state_id
state_name
purpose
entry_conditions
required_artifacts
allowed_actions
blocked_actions
gate_out_conditions
next_states
rollback_states

这些字段是 O’CodingNavigator 的底层数据模型基础。

未来会体现在：

.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
Core Engine
CLI 输出
MCP tool 返回

⸻

10. 状态与步骤指针策略

OCN 的状态和步骤必须使用稳定字符串 ID，而不是数字编号。

错误方式：

{
  "currentStep": 3
}

正确方式：

{
  "currentStateId": "state_spec",
  "currentStepId": "step_prd"
}

原因：

SOP 会持续升级。
如果用数字编号作为状态指针，一旦 SOP 0.2 插入新步骤，旧项目中的 currentStep: 3 就可能变成错误含义。

稳定 ID 不随顺序变化。
数字只用于显示和排序。

推荐 SOP step 定义：

steps:
  - id: step_project_brief
    order: 10
    stateId: state_discovery
    title: Project Brief
  - id: step_scope
    order: 20
    stateId: state_discovery
    title: Scope
  - id: step_prd
    order: 30
    stateId: state_spec
    title: PRD

原则：

currentStateId 和 currentStepId 是 source of truth。
order 只用于排序和展示。

⸻

11. 状态机、阶段性 artifact 与持续性义务

状态机不是替代 28 步 SOP。
状态机是上层导航模型。
28 步 SOP 是每个状态内的动作、artifact 和 gate 要求。

每个状态都包含两类内容：

阶段性 artifact
持续性义务

⸻

11.1 阶段性 artifact

阶段性 artifact 是当前状态必须形成的产物，通常参与 gate-out 检查。

例如 SPEC 状态的阶段性 artifact：

docs/02-prd.md
docs/03-acceptance-criteria.md

⸻

11.2 持续性义务

持续性义务是从某个状态开始贯穿后续流程的横切要求，不一定是当前状态独有的 artifact。

例如：

Audit Trail
Decision Log
Dev Log
Baseline Tracking
Rollback Awareness
Research / Production Separation
AI Governance Brief

持续性义务不应被误解为只属于某一个状态。
例如 Audit Trail 不是 SHIP 才开始，而是从 DISCOVERY 起贯穿全流程。

⸻

12. 状态与阶段性 artifact 映射

State	阶段目的	阶段性 artifact
DISCOVERY	定义问题、目标用户、核心场景、边界	docs/00-project-brief.md、docs/01-scope.md
SPEC	形成结构化 PRD 和验收标准	docs/02-prd.md、docs/03-acceptance-criteria.md
DESIGN	定义流程、数据模型、接口契约、测试策略	docs/04-information-architecture.md、docs/05-data-model.md、docs/06-api-contract.md、docs/07-test-strategy.md
PLAN	定义 MVP 主链路、真实数据、配置、可复现、回滚	docs/08-mvp-plan.md、docs/09-real-data-wiring.md、docs/10-config-and-env.md、docs/11-reproducibility.md、docs/12-rollback-plan.md
BUILD	小步实现与变更记录	PR Summary、docs/18-dev-log.md 持续累积
VERIFY	小样本验证、分层调试、baseline、能用性验收	docs/13-validation-report.md、docs/14-debug-report.md、docs/15-baseline.md、docs/16-release-notes.md
SHIP	发布准备、可观察性、审计收束、交付说明	docs/20-observability.md、docs/21-audit-trail.md、release notes
REFLECT	真实场景观察、离线研究、长期证据、AI governance 复盘	docs/22-evolution-report.md、docs/23-ai-governance.md

⸻

13. 持续性义务映射

持续性义务	起点	覆盖范围	触发方式
Audit Trail	DISCOVERY	全流程	push
Decision Log	DISCOVERY	全流程	pull
SOP Version Detection	DISCOVERY	全流程	push
AI Governance Brief	DISCOVERY	全流程	pull
Scope Awareness	SPEC	SPEC 到 REFLECT	gate / brief
Dev Log	BUILD	BUILD 到 REFLECT	pull
Research / Production Separation	BUILD	BUILD 到 REFLECT	gate / log
Baseline Tracking	VERIFY	VERIFY 到 REFLECT	push
Rollback Awareness	PLAN	PLAN 到 REFLECT	gate
Real-world Observation	REFLECT	REFLECT	pull
Long-term Evidence	REFLECT	REFLECT	pull

说明：

push 表示系统自动写入或检测。
pull 表示用户或 AI 主动 capture。

⸻

14. Spec 策略

O’CodingNavigator 不从零发明 Spec 方法论。

MVP 必须深度学习成熟的 Spec 工具和工程实践，包括：

OpenSpec
GitHub Spec Kit
Kiro Spec-Driven Development
ADR
RFC-style design docs
GitHub issue / PR template
传统 PRD + Acceptance Criteria + API Contract

但 OCN 不直接 fork 某一个工具，也不把 Spec Profile 做成一份新的独立文档。

OCN 的默认 Spec Profile 是一组结构化字段集合，用来约束 AI Coding 项目的核心信息结构。

原则：

Spec Profile 不是新文档。
Spec Profile 是 PRD、Acceptance Criteria、Data Model、API Contract、Test Strategy、Decision Log 等 artifact 的结构化字段总和。

⸻

15. OCN 默认 Spec Profile 与 artifact 映射

MVP 默认 Spec Profile 包含：

Problem
Goals
Non-goals
Users
Scenarios
Requirements
Acceptance Criteria
Data Model
Interfaces
Risks
Test Plan
Decision Log

这些字段分别落在不同 artifact 中：

Spec Profile 字段	落地 artifact	说明
Problem	docs/02-prd.md	问题定义
Goals	docs/02-prd.md	本期目标
Non-goals	docs/02-prd.md	本期不做事项
Users	docs/02-prd.md	目标用户
Scenarios	docs/02-prd.md	使用场景
Requirements	docs/02-prd.md	功能与业务需求
Acceptance Criteria	docs/03-acceptance-criteria.md	可验证验收标准
Data Model	docs/05-data-model.md	数据结构引用
Interfaces	docs/06-api-contract.md	CLI / Core / MCP / 文件契约引用
Risks	docs/02-prd.md	产品和实现风险
Test Plan	docs/07-test-strategy.md	测试策略引用
Decision Log	docs/19-decision-log.md	决策记录引用

MVP 不提供独立的：

ocn doc create spec

MVP 提供：

ocn doc create prd
ocn doc create acceptance-criteria

未来可以提供：

ocn spec status
ocn spec check

这些命令用于聚合检查 Spec Profile 是否完整，而不是生成新的 spec.md。

⸻

16. SOP 版本管理

O’CodingNavigator 将 SOP 写入项目时，必须带版本号。

项目初始化时写入：

sop_version: "0.1.0"
ocn_version: "0.1.0"
profile: "default-ai-coding-sop"

或在 .ocoding/state.json 中记录：

{
  "ocnVersion": "0.1.0",
  "sopProfileId": "default-ai-coding-sop",
  "sopProfileVersion": "0.1.0",
  "sopLockedAt": "2026-04-27T22:00:00+08:00"
}

⸻

17. SOP 演化协议

SOP Profile 在 OCN 仓库中独立版本化。

推荐目录：

sops/
  default-ai-coding-sop/
    0.1.0/
      sop.yaml
      gates.yaml
      artifacts.yaml
      README.md
      CHANGELOG.md
    0.2.0/
      sop.yaml
      gates.yaml
      artifacts.yaml
      README.md
      CHANGELOG.md

每个 SOP Profile 版本必须包含：

profile id
profile version
compatible OCN version
state machine
steps
artifacts
gates
changelog
breaking change notes

SOP 改动规则：

改动类型	版本策略
修正文案，不影响 gate	patch
增加 artifact、修改 gate、增加 step	minor
删除 step、重命名 stable id、改变状态流转	breaking change

项目初始化后，项目锁定当时的 SOP Profile 版本。
用户升级 OCN，不应自动改变项目内 SOP。

⸻

18. SOP 版本检测原则

OCN 启动或执行状态检查时，应检测：

当前项目内 SOP 版本
当前 OCN 内置 SOP 版本
SOP Profile 名称
是否存在版本差异
是否存在 breaking changes
是否建议升级

如果检测到版本差异，只提示，不主动修改项目。

示例输出：

Project SOP version: 0.1.0
Current OCN SOP version: 0.2.0
A newer SOP profile is available.
OCN will not modify your project automatically.
Run:
ocn sop diff
ocn sop upgrade --plan

原则：

OCN 可以提示升级，可以生成升级计划，但不能主动改用户项目。

⸻

19. SOP 升级计划

MVP 应支持：

ocn sop upgrade --plan

该命令只生成升级计划，不修改文件。

升级计划应包含：

当前项目 SOP 版本
目标 SOP 版本
新增步骤
删除步骤
变更步骤
新增 artifacts
变更 gates
breaking changes
对当前项目状态的影响
推荐操作
是否建议立即升级

示例：

# SOP Upgrade Plan
From: default-ai-coding-sop@0.1.0
To: default-ai-coding-sop@0.2.0
## Added steps
- step_spec_profile_selection
## Changed gates
- state_spec gate-out now requires Non-goals section
## New artifacts
- docs/00-spec-profile.md
## Impact on current project
- Current state: SPEC
- Current step: step_prd
- Required action before upgrade:
  - Add Non-goals section to docs/02-prd.md
## Recommendation
Do not upgrade until current SPEC state is completed.

⸻

20. 横切义务触发模式

OCN 采用 push + pull 混合触发模式。

不是所有记录都应该自动写。
也不是所有记录都应该靠用户记得写。

⸻

20.1 Push：系统自动触发

以下事件由 OCN 自动写入 audit：

状态转移
状态转移失败
gate 执行
gate 失败
gate override
SOP version 检测
SOP version 差异
baseline 创建
高风险动作被阻止

这类事件属于系统事实，不应依赖用户手动记录。

示例：

## 2026-04-27 22:10
Event: state_transition_attempt  
From: state_spec  
To: state_design  
Result: blocked  
Reason:
- docs/03-acceptance-criteria.md missing

⸻

20.2 Pull：用户或 AI 主动 Capture

以下内容需要用户或 AI 主动捕获：

dev-log
decision-log
bugfix-report
research-log
learning capture
manual reflection

原因：

OCN 可以知道“发生了什么操作”，但不能完全知道：

为什么这样改。
为什么放弃另一个方案。
这次决策背后的业务理由。
这个 bug 的真实根因。
这次学习对未来有什么价值。

这些必须由用户或 AI 主动写入。

⸻

20.3 事件触发规则

类型	触发方式	是否自动写 audit
ocn advance	push	是
ocn gate	push	是
ocn sop version	push	是
ocn baseline create	push	是
ocn log	pull	是
ocn decision	pull	是
ocn capture learning	pull	是
ocn brief	pull	可选记录
ocn status	pull	默认不记录

说明：

ocn status 不默认写 audit，避免日志被刷屏。
ocn gate 和 ocn advance 必须写 audit，因为它们影响项目状态和阶段判断。

⸻

21. AI Governance 策略

OCN 第 28 步强调：

AI 应该做加速器，不应该做主宰者。

但 MVP 不做代码层强制阻断。

MVP 的 AI governance 采用：

brief 注入
prompt 约束
高风险提醒
审计记录
流程 gate
manual override

⸻

21.1 MVP 要做什么

ocn brief 必须生成 AI governance 约束，例如：

## AI Governance Rules for This Session
AI may:
- Generate document drafts
- Suggest code changes
- Generate test cases
- Summarize project state
AI must not:
- Modify production data
- Change authentication logic without rollback plan
- Delete files without explicit confirmation
- Merge PRs
- Change SOP profile automatically
- Advance project state without gate passing

ocn prompt next 也必须带入当前状态允许和禁止的动作。

⸻

21.2 MVP 不做什么

MVP 不做：

git pre-commit hook
PR check
diff scope checker
protected path enforcement
code ownership check
auth/payment/db migration detector
LLM judge 强制阻断

原因：

这些需要更深的代码层集成，不应进入 MVP。

⸻

21.3 v1.1 可考虑

v1.1 可以增加：

ocn install hooks
pre-commit risk check
PR check
danger zone file detection
protected path rules
scope drift diff checker
LLM judge for spec compliance

⸻

22. 目标用户

O’CodingNavigator 的第一优先级用户不是完全零基础用户，也不是大型成熟研发团队。

MVP 重点服务以下用户。

⸻

22.1 第一优先级用户

1. Solo Builder

一个人承担产品、开发、测试、文档、发布和维护。

典型问题：

没人帮他做产品经理。
没人帮他做技术经理。
没人帮他做 QA。
没人帮他做项目管理。
没人提醒他写日志、建 baseline、准备 rollback。
他最怕迷路、失控和失忆。

OCN 对他的价值：

给出下一步。
卡住风险。
强制留痕。
帮助他把一个人项目变成可管理的系统工程。

⸻

2. 小团队

2–8 人的小团队，已经开始使用 AI Coding，但没有成熟的研发流程。

典型问题：

每个人都在用 AI，但没有统一 Spec。
需求、代码、测试、日志分散。
PR 变化无法追溯。
AI 生成内容缺少统一门禁。
团队无法判断一个 AI 改动是否符合原始目标。

OCN 对他们的价值：

统一项目状态机。
统一 Spec profile。
统一 Gate。
统一 Dev Log 和 Decision Log。
让小团队低成本获得研发纪律。

⸻

3. AI Coding 教练 / 培训者

需要带学员、业务团队或内部团队按 SOP 做项目。

典型问题：

只讲原则，学员很难执行。
每个人项目进度不同，容易迷路。
学员不知道下一步做什么。
学员不写文档、不写日志、不做验收。
培训成果难以复盘。

OCN 对他们的价值：

把教学从“讲道理”变成“流程执行”。
每个学员项目都有状态、文档、门禁和日志。
教练可以围绕 OCN 状态做辅导。

⸻

22.2 第二优先级用户

业务型 AI Coding 实践者

懂业务，有项目想法，已经尝试过 Claude Code、Codex、Cursor、Cline 等工具，但缺少完整工程流程。

典型问题：

会描述业务，但不会拆成 Spec。
容易直接让 AI 写代码。
不会定义数据模型和接口契约。
缺少验收标准。
不知道如何判断 AI 写得对不对。

OCN 对他们的价值：

把业务语言转成工程流程。
把想法转成 PRD 和 AC。
把 AI Coding 管起来。

⸻

22.3 暂不作为 MVP 第一优先级的用户

完全零基础编程用户。
大型企业成熟研发团队。
需要复杂协作平台的团队。
需要云同步和权限管理的团队。
需要 Web GUI 的用户。
需要全自动 AI Agent 的用户。

⸻

23. 核心使用场景

⸻

场景 1：初始化一个新 AI Coding 项目

用户在项目目录中执行：

ocn init

系统创建：

.ocoding/
docs/
.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
.ocoding/config.yaml

并写入：

项目状态机
SOP Profile
SOP Profile Version
OCN Version
默认 Gate 配置
基础文档模板
Tier 配置

系统告诉用户：

当前处于 DISCOVERY。
当前需要完成 Project Brief 和 Scope。
不要直接开始写代码。

⸻

场景 2：用户不知道下一步该做什么

用户执行：

ocn status

系统输出：

当前状态。
当前状态目的。
当前 step id。
当前阻塞项。
当前缺失 artifact。
当前允许动作。
当前禁止动作。
下一步建议。
可执行命令。
可复制给 Claude Code 的 prompt。

⸻

场景 3：用户需要给 AI 注入上下文

用户执行：

ocn brief

系统生成 Hot Memory Brief：

当前项目目标。
当前状态。
当前阶段需要完成什么。
已完成 artifact。
缺失 artifact。
最近关键决策。
当前阻塞。
下一步推荐。
AI 这次应该做什么。
AI 这次不应该做什么。
AI Governance Rules。

这个 brief 应控制在适合注入 AI Coding 会话的长度内。

⸻

场景 4：用户想直接让 AI 写代码

用户说：

先让 Claude Code 写出来看看。

Strict 模式下，OCN 应该提醒：

当前还在 DISCOVERY / SPEC。
缺少 PRD 或 Acceptance Criteria。
如果直接写代码，容易导致 scope drift 和无法验收。
建议先补齐当前状态的 required artifacts。

⸻

场景 5：用户想进入下一状态

用户执行：

ocn advance

系统检查当前状态的 gate-out 条件。

如果未通过：

输出阻塞原因和补齐建议。
自动写入 audit。

如果通过：

更新状态机到下一状态。
自动写入 audit。

原则：

状态跳转必须由 Gate 控制，不允许随意跳转。

⸻

场景 6：用户完成一次修改

用户执行：

ocn log

系统引导记录：

为什么改。
改了什么。
改了哪些文件。
是否符合 PRD / AC。
是否影响 Scope。
是否跑了测试。
有没有失败。
留下什么风险。
下一步是什么。

写入：

docs/18-dev-log.md

并更新：

.ocoding/state.json

⸻

场景 7：用户准备做高风险改动

系统检查：

是否有 baseline。
是否有 rollback plan。
是否涉及数据库、权限、认证、核心流程、批量删除。
是否有测试。
是否有人确认。

MVP 只做提示、审计和流程 gate，不做代码层强制阻断。

⸻

场景 8：用户需要检测 SOP 版本差异

用户执行：

ocn sop version
ocn sop diff
ocn sop upgrade --plan

系统显示项目内 SOP profile 版本和当前 OCN 内置版本差异。

原则：

只提示。
只生成升级建议。
不主动修改项目。

⸻

24. MVP 产品形态

O’CodingNavigator MVP 由五部分组成：

Core Engine
CLI Client
Minimal MCP Server
Markdown Artifact System
SOP Loader

⸻

24.1 Core Engine

Core Engine 是产品内核。

它负责：

状态机。
SOP Profile。
Gate。
Artifact 检查。
Brief 生成。
Log 写入。
Baseline 记录。
SOP 版本检测。
Prompt 编排。
Audit 事件写入。
AI Governance brief 注入。
Tier 选择和 artifact 集合选择。

CLI、MCP Server、未来 TUI、未来插件都应调用同一个 Core Engine。

Core function 命名必须 MCP-friendly。

示例：

whereAmI()
generateBrief()
runGate()
advanceState()
createArtifact()
checkArtifacts()
captureLog()
captureDecision()
createBaseline()
detectSopVersion()
diffSopVersion()
generateSopUpgradePlan()
generateNextPrompt()
writeAuditEvent()

⸻

24.2 CLI Client

CLI 是 MVP 的主要用户入口之一。

命令名：

ocn

MVP 命令：

ocn init
ocn init --tier minimal
ocn init --tier production
ocn init --tier full
ocn status
ocn brief
ocn doc create <type>
ocn check
ocn check tests
ocn gate
ocn advance
ocn log
ocn baseline create
ocn prompt next
ocn sop version
ocn sop diff
ocn sop upgrade --plan
ocn doctor

⸻

24.3 Minimal MCP Server

MVP 必须交付最小 MCP Server，而不是只做到 MCP-ready。

原因：

OCN 的目标用户会混用 Claude Code、Cursor、Cline、Codex 等 AI Coding 工具。
CLI-only 会增加 agent 调用摩擦。
Core Engine 已经函数化，最小 MCP Server 是高杠杆交付项。

MVP 最小 MCP tools：

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

MVP MCP Server 不做：

recall
vector memory
LLM judge
multi-agent orchestration
scope drift deep diff

⸻

24.4 Markdown Artifact System

所有核心产物都落在项目本地文件中。

docs/
  00-project-brief.md
  01-scope.md
  02-prd.md
  03-acceptance-criteria.md
  04-information-architecture.md
  05-data-model.md
  06-api-contract.md
  07-test-strategy.md
  ...

Markdown 承载：

意图。
决策。
PRD。
验收。
设计。
日志。
复盘。

原则：

人可读、Git 友好、AI 可直接读取。

⸻

24.5 SOP Loader

SOP Loader 是 OCN 的“编译器”。

它负责把 SOP Profile 文件加载为 Core Engine 可执行的结构化 profile。

输入：

sop.yaml
gates.yaml
artifacts.yaml
SOP Step Map
SOP Profile Version
Tier Config

输出：

StateMachine
StepRegistry
ArtifactRegistry
GateRegistry
TierArtifactSet
UpgradeDiff

SOP Loader 是 SOP 和 Core Engine 解耦的关键。
没有 SOP Loader，SOP 版本演化、upgrade plan、profile 扩展和 MCP tool 的结构化返回都无法稳定实现。

⸻

25. Tier 系统

MVP 必须支持 Tier 系统。

原因：

OCN 不能一开始强制用户写完整 24 份文档。
但也不能只有一个过轻版本，无法支持真实项目。

Tier 是渐进式纪律。

命令：

ocn init --tier minimal
ocn init --tier production
ocn init --tier full

默认：

ocn init --tier minimal

⸻

25.1 Tier 定义

Tier	名称	适用场景	artifact 策略
minimal	最小纪律	Solo Builder、首次项目、工具验证	10 份核心 artifact
production	生产纪律	涉及真实用户、真实数据、交付	约 16 份 artifact
full	完整纪律	教练、小团队、严肃项目	完整 artifact 集

⸻

25.2 Tier 原则

Tier 影响：

init 时创建哪些 artifact
gate 检查哪些 artifact
brief 展示哪些缺口
advance 是否允许跳过某些状态要求

Tier 不影响：

状态机基本结构
stable step id
SOP versioning
audit push 规则
AI governance brief

⸻

26. MVP 不做 TUI

MVP 明确不做 TUI。

删除：

ink
ocn tui
终端工作台
复杂快捷键交互

原因：

MVP 当前重点是验证：

状态机。
PRD / AC / artifact mapping。
Gate。
Brief。
SOP versioning。
CLI。
Minimal MCP Server。
SOP Loader。
Audit Event。
AI Governance brief 注入。

TUI 会增加交互复杂度，但不是第一版必须价值。

TUI 可作为未来增强，不进入 MVP。

⸻

27. MVP 技术栈

已确认技术栈：

TypeScript + Node.js
commander 做 CLI
zod 做结构校验
yaml 读写配置
vitest 做测试
Markdown 做文档输出
本地文件系统做状态存储
npm package 做发布
Minimal MCP Server
SOP Loader

暂不使用：

ink
SQLite
数据库
Web GUI
SaaS
向量数据库
LLM Judge

未来预留：

SQLite event store
BM25 + embeddings
LLM Judge
TUI
VS Code Extension
GitHub Action
Git hooks
PR checks

⸻

28. 存储策略

MVP 使用：

Markdown + JSON + YAML + local files

原因：

简单。
透明。
本地优先。
Git 友好。
AI 可读。
用户可审查。
适合开源。

MVP 不使用 SQLite。

但架构上应预留 Storage Adapter：

FileStorage
SQLiteStorage later

原则：

第一版用文件系统跑通产品逻辑，后续再引入 SQLite 承载事件流、索引、检索和跨项目记忆。

⸻

29. 文件写入安全策略

MVP 必须保证 .ocoding/state.json 等关键状态文件的写入安全。

最小策略：

使用 lock file：.ocoding/.lock
写入超时：5 秒
写入前备份：.ocoding/state.json.bak
写入临时文件
rename 原子替换
写入失败时不破坏旧 state

原因：

多个终端、AI agent 后台进程和用户前台 CLI 可能同时操作 OCN。
如果不做 lock 和原子写入，状态文件损坏会直接破坏用户信任。

⸻

30. Doctor 与恢复策略

MVP 必须提供：

ocn doctor

ocn doctor 检查：

state.json 是否合法
sop.yaml 是否合法
gates.yaml 是否合法
当前 state id 是否存在
当前 step id 是否存在
artifact 是否可读
SOP version 是否兼容

MVP 恢复能力：

从 .ocoding/state.json.bak 恢复

v1.1 可考虑：

从 audit trail 重建 state
reset 到上一个已知良好状态

⸻

31. CLI 错误模型与退出码

OCN CLI 必须有稳定退出码。
这是 CI、脚本、MCP server、Claude Code Skill 处理错误的基础。

Exit Code	含义	Error Code
0	成功 / 通过	OK
1	gate failed	ERR_GATE_FAILED
2	artifact missing or invalid	ERR_ARTIFACT_INVALID
3	state machine error	ERR_STATE_MACHINE
4	config / lock / IO error	ERR_IO_OR_CONFIG
5	SOP version incompatibility	ERR_SOP_VERSION

原则：

CLI 输出给人看
error code 给机器看
MCP 错误响应复用同一套 error code

⸻

32. 记忆策略

MVP 实现：

Hot Memory

由 ocn brief 和 navigator.brief 生成。

内容：

当前目标。
当前状态。
当前阻塞。
已完成 artifact。
缺失 artifact。
最近决策。
下一步行动。
AI 本轮该做什么。
AI 本轮不该做什么。
AI Governance Rules。

⸻

Warm Memory

由项目文档承载：

docs/*.md
docs/18-dev-log.md
docs/19-decision-log.md
docs/15-baseline.md
docs/21-audit-trail.md

MVP 不做复杂检索，只做结构化读取和摘要。

⸻

Cold Memory

跨项目知识库暂不做。

未来版本再做：

失败案例。
复用模式。
踩坑库。
跨项目检索。
本地 embedding。
BM25 + vector hybrid retrieval。

⸻

33. Gate 策略

MVP Gate 分为三类，但实现优先级不同。

⸻

33.1 硬门禁

MVP 必须实现。

机器可判定，失败直接 block。

例子：

文档是否存在。
文档是否为空。
required fields 是否存在。
state 是否合法。
step id 是否合法。
sop version 是否存在。
YAML / JSON 是否合法。
baseline 是否存在。
rollback plan 是否存在。

⸻

33.2 流程门禁

MVP 必须实现。

例如：

进入下一状态需要用户执行 ocn advance。
高风险操作需要用户确认。
跳过某个 artifact 需要明确记录 override reason。

⸻

33.3 测试结果门禁

MVP 默认信任用户或 AI 在 dev-log 中声明测试结果。

同时提供：

ocn check tests

v1.0 最小支持：

vitest json

未来扩展：

jest json
pytest json
junit xml

原因：

如果 OCN 声称 tests pass 是 hard gate，却无法读取任何测试结果，这个 gate 就是空话。
MVP 至少要有一个自动测试结果入口，同时允许 pull 模式声明。

⸻

33.4 半软门禁

MVP 只预留接口，不完整实现。

未来由 LLM Judge 或本地模型判断：

Spec 是否清晰。
Acceptance Criteria 是否可验证。
变更是否超出 Scope。
代码是否符合 Spec。
文档是否覆盖关键决策。

MVP 需要在架构上预留：

JudgeProvider
Rubric
Score
Reason
Override

但不要求交付完整 LLM Judge。

⸻

34. 开源策略

O’CodingNavigator 是开源项目。

推荐 License：

Apache-2.0

原因：

适合基础设施型开源项目。
企业采用阻力较小。
包含专利授权条款。
比 MIT 更适合长期生态建设。

开源设计要求：

配置清晰。
目录清晰。
SOP profile 可版本化。
模板可扩展。
核心引擎可测试。
MCP server 可用。
不依赖云服务。
不锁定特定 AI 工具。

⸻

35. 第一版明确不做

MVP 不做以下内容：

不做 TUI
不做 Web GUI
不做 SaaS
不做数据库
不做用户系统
不做云同步
不做团队权限管理
不做在线协作
不做插件市场
不自动修改业务代码
不自动合并 PR
不自动执行高风险改动
不做完整 LLM Judge
不做向量检索
不做跨项目 Cold Memory
不做 VS Code 插件
不做 GitHub App
不做 git pre-commit hook
不做 PR check
不做代码层强阻断

原因：

O’CodingNavigator 第一版的核心价值是验证：

状态机能否防迷路。
Gate 能否防失控。
Brief / Log / Audit 能否防失忆。
PRD / AC / artifact mapping 能否约束 AI Coding。
SOP versioning 能否支撑长期演化。
SOP Loader 能否支撑 profile 化。
Minimal MCP Server 能否降低 agent 调用摩擦。

⸻

36. 输入是什么

O’CodingNavigator 的主要输入包括：

用户 CLI 命令。
MCP tool 调用。
当前项目目录。
.ocoding/state.json。
.ocoding/sop.yaml。
.ocoding/gates.yaml。
.ocoding/config.yaml。
docs/*.md。
Git 状态。
SOP Profile Version。
OCN Version。
用户补充的业务信息。
可选测试结果。
dev-log 中的测试声明。
vitest json 测试结果。

⸻

37. 输出是什么

O’CodingNavigator 的主要输出包括：

状态报告。
Hot Memory Brief。
Markdown 文档模板。
Artifact 检查报告。
Gate 结果。
状态跳转结果。
开发日志。
决策日志。
Audit Event。
Baseline 文档。
SOP 版本差异提示。
SOP upgrade plan。
风险提示。
AI Governance Rules。
可复制给 Claude Code 的 prompt。
MCP structured response。
.ocoding/state.json 更新。
.ocoding/baselines/*.json 记录。
docs/21-audit-trail.md 更新。

⸻

38. Definition of Done

MVP 第一版完成，必须满足以下功能交付清单。

1. 用户可以在任意项目目录执行 ocn init 初始化 OCN。
2. ocn init 支持 --tier minimal、--tier production、--tier full。
3. 系统生成 .ocoding/ 和 docs/ 基础结构。
4. 系统写入显式状态机配置。
5. 系统写入 SOP Profile 和版本号。
6. 系统可以维护 .ocoding/state.json。
7. 状态指针使用 currentStateId 和 currentStepId，不使用数字编号作为 source of truth。
8. 系统可以执行 ocn status，显示当前状态、step id、阻塞项和下一步。
9. 系统可以执行 ocn brief，生成当前 AI Coding 会话 brief。
10. ocn brief 包含 AI Governance Rules。
11. 系统可以生成核心文档模板。
12. 系统可以执行 ocn check，检查 artifact 是否存在和是否包含必要字段。
13. 系统可以执行 ocn check tests，至少支持 vitest json。
14. 系统可以执行 ocn gate，检查当前状态是否满足退出条件。
15. ocn gate 自动写入 audit。
16. 系统可以执行 ocn advance，在 gate 通过后进入下一状态。
17. ocn advance 成功或失败都自动写入 audit。
18. 系统可以执行 ocn log，由用户或 AI 主动写入开发日志。
19. 系统可以执行 ocn baseline create，生成 baseline，并自动写入 audit。
20. 系统可以执行 ocn prompt next，生成下一步 Claude Code prompt。
21. 系统可以执行 ocn sop version，显示项目 SOP 版本和当前内置 SOP 版本。
22. 系统可以执行 ocn sop diff，输出版本差异提示。
23. 系统可以执行 ocn sop upgrade --plan，只生成升级计划，不修改项目文件。
24. 系统可以执行 ocn doctor，检测 state / sop / gates / artifact 基础健康状态。
25. state.json 写入采用 lock file + backup + temp file rename。
26. CLI 实现稳定退出码和 error code。
27. MVP 交付最小 MCP Server。
28. MCP Server 支持最小工具集：where_am_i、brief、run_gate、create_artifact、capture_log、detect_sop_version、generate_next_prompt。
29. Strict 模式下，关键 artifact 缺失时阻止进入下一状态。
30. 所有状态和文档都落在本地文件系统中。
31. 不依赖数据库、不依赖云服务、不依赖 Web GUI、不依赖 TUI。
32. SopLoader 可以加载 SOP Profile 并生成 StateMachine / StepRegistry / ArtifactRegistry / GateRegistry。
33. 用 vitest 覆盖状态机、step id、Gate、SOP 版本检测、artifact 检查、audit 写入、lock 写入和 CLI 输出。

⸻

39. Success Criteria

Definition of Done 回答“功能是否完成”。
Success Criteria 回答“产品是否真的有效”。

MVP 必须满足以下产品成功判据。

⸻

39.1 OCN 自身 dogfood 完整跑通

团队必须使用 OCN 开发 OCN 自身，从 DISCOVERY 到 SHIP 至少跑通一次完整流程。

要求：

全程不绕过 hard gate
每次状态转移通过 ocn advance
关键文档由 OCN 管理
关键 gate 有 audit 记录

⸻

39.2 第二个非工具型业务项目跑通 Tier 2

必须选择一个非工具型业务项目，使用 production tier 跑通完整生命周期。

候选项目：

餐厅客户偏好系统 mini 版
炖品店订单 / 会员小模块
OPC Legal 子模块
Twig Loop 独立模块

推荐项目：

餐厅客户偏好系统 mini 版

目标：

证明 OCN 不只适用于开发 OCN 这类工具项目。

⸻

39.3 外部用户能独立完成 init → SPEC → 第一份 artifact

一个外部用户不读源码，只读 README 和 ocn status 输出，能完成：

ocn init
进入 SPEC
生成第一份 artifact
理解下一步动作

这证明 OCN 的导航体验足够清楚。

⸻

39.4 长上下文恢复能力成立

在 Claude Code 或其他 AI Coding 工具长会话中，当上下文消耗超过 70% 后，用户执行：

ocn brief

AI 能恢复完整工作上下文，无需用户用自然语言重新解释项目。

这证明 Hot Memory 有价值。

⸻

39.5 OCN 至少阻止一次真实失控

在两个 dogfood 项目中，ocn advance 或 ocn gate 至少合理 block 一次真实问题：

范围漂移
artifact 缺失
验收标准缺失
SOP 版本不一致
高风险修改缺少回滚

这证明 OCN 不是装饰品，而是真的能防失控。

⸻

39.6 SOP Loader 通过版本演化测试

将 SOP 从 0.1.0 改成 0.2.0 后，必须能在不修改 Core Engine 的前提下加载新版本 SOP，并输出 diff 或 upgrade plan。

这证明：

SOP 与 Core Engine 解耦
OCN 能长期演化
SOP versioning 不是摆设

⸻

40. 关键假设

1. Solo Builder、小团队和 AI Coding 教练愿意接受“先 PRD / AC，再 Build”的 AI Coding 工作方式。
2. 用户愿意让项目目录中出现 .ocoding/ 和 docs/。
3. 用户接受本地文件作为项目记忆。
4. 用户使用 Git 管理项目，或至少接受 Markdown / JSON / YAML 被版本管理。
5. 用户愿意通过 CLI 或 MCP tools 与 OCN 交互。
6. MVP 不做 TUI 也能产生核心价值。
7. Markdown 是最适合人和 AI 共同读取的文档格式。
8. Strict 模式对目标用户有价值，尤其是 Solo Builder、小团队和教练场景。
9. 本地文件系统足以支撑 MVP。
10. OCN 的核心价值在状态机、PRD / AC、Gate、Brief、Log、Audit 和 SOP versioning，而不在代码生成。
11. MCP server 是 v1.0 的必要交付，因为未来 AI Coding 工具会越来越多，OCN 不能锁定单一宿主。
12. 不从零打造 Spec 方法论，而是吸收成熟 Spec 工具的最小公共骨架。
13. SOP 会持续演化，因此项目必须锁定 SOP 版本。
14. AI Governance 在 MVP 阶段主要通过 brief、prompt、audit 和流程 gate 实现，而不是代码层强阻断。
15. Tier 系统可以降低用户的文档压力，同时保留生产级纪律路径。
16. 第二个非工具型 dogfood 项目是验证 OCN 产品有效性的必要条件。

⸻

41. 主要风险

风险 1：流程过重，用户放弃

如果 OCN 要求太多文档，用户可能觉得麻烦。

应对方式：

提供 opinionated 默认路径。
提供 Tier 系统。
默认 minimal tier。
提供模板。
提供 ocn brief 和 ocn prompt next。
允许未来 Standard / Gentle 模式。
但 MVP 默认 Strict。

⸻

风险 2：状态机过死，阻碍真实开发

如果状态机不允许必要跳转，用户会绕过工具。

应对方式：

允许 override，但必须记录原因。
Gate 失败时必须提供具体补救动作。
ocn advance 必须解释阻塞，而不是只报错。

⸻

风险 3：Spec Profile 设计不成熟

如果 OCN 自己闭门造 spec，可能不符合真实工程习惯。

应对方式：

深度学习 OpenSpec、Spec Kit、Kiro、ADR、RFC、PRD、AC。
MVP 使用减法版 default profile。
明确 Spec Profile 是 artifact 字段总和，不是额外文档。
未来支持 spec profile 扩展。

⸻

风险 4：MCP server 增加 v1.0 工作量

MCP Server 会增加协议层和测试成本。

应对方式：

只交付最小 MCP tool set。
MCP Server 只包 Core Engine，不新增业务逻辑。
不做 recall、LLM judge、多 agent 编排。

⸻

风险 5：SOP 版本升级破坏项目稳定性

如果 OCN 自动修改项目 SOP，可能破坏用户历史流程。

应对方式：

OCN 只检测，只提示，只输出 diff 和 plan。
不主动改项目。
升级必须由用户触发，并留下记录。

⸻

风险 6：没有 TUI 导致初学者体验不足

MVP 不做 TUI 可能降低可视化程度。

应对方式：

ocn status 输出必须足够清晰。
ocn brief 必须足够好。
ocn prompt next 必须直接可用。
TUI 留作后续增强。

⸻

风险 7：目标用户过宽

如果同时服务完全小白、大型团队、教练、Solo Builder，产品会发散。

应对方式：

MVP 明确优先级：

Solo Builder。
小团队。
AI Coding 教练。

其他用户暂不优先。

⸻

风险 8：数字 step pointer 导致 SOP 升级错乱

如果项目状态使用数字编号，SOP 插入或删除步骤后，旧项目状态可能被错误解释。

应对方式：

使用稳定字符串 ID。
数字只作为 order 显示字段。
SOP diff 检测 step id 变化和 breaking change。

⸻

风险 9：audit 过多或过少

如果所有命令都写 audit，会刷屏。
如果关键状态变化不写 audit，项目会失忆。

应对方式：

采用 push + pull 混合触发。
gate、advance、baseline、sop version 写 audit。
status 默认不写 audit。
语义日志由用户或 AI 主动 capture。

⸻

风险 10：AI Governance 承诺过度

如果 MVP 声称能阻止 AI 做危险代码改动，但没有代码层集成，会造成虚假安全感。

应对方式：

MVP 明确只做 brief 注入、prompt 约束、audit 和流程 gate。
代码层强阻断放到 v1.1。

⸻

风险 11：状态文件损坏导致用户失去信任

如果 state.json 被并发写坏，用户会认为 OCN 不可靠。

应对方式：

MVP 必须使用 lock file、backup、temp file rename 和 ocn doctor。

⸻

风险 12：OCN 只适合开发 OCN 自己

如果只 dogfood OCN 自己，无法证明它适合真实业务项目。

应对方式：

必须使用第二个非工具型业务项目做 dogfood，建议选择餐厅客户偏好系统 mini 版。

⸻

42. 第一版产品边界

OCN 负责

状态机。
流程导航。
PRD / AC / artifact 管理。
文档模板生成。
artifact 完整性检查。
阶段 Gate。
测试结果读取的最小入口。
SOP 版本检测。
SOP diff。
SOP upgrade plan。
Hot Brief 生成。
AI Governance brief 注入。
开发日志。
决策日志。
Audit Event。
baseline 记录。
风险提示。
prompt 编排。
Minimal MCP Server。
SOP Loader。
Tier 初始化。
state 文件安全写入。
doctor 检查。

⸻

OCN 不负责

直接生成业务代码。
替用户做架构最终决策。
替用户自动合并 PR。
替用户运行生产部署。
替用户管理云资源。
替用户做复杂项目管理。
替代 Claude Code。
替代 Codex / Cursor / Cline。
替代成熟团队的完整研发平台。
替代人类对关键风险的判断。
在 MVP 中做代码层强制阻断。

⸻

43. 第一版理想用户体验

用户进入项目目录后执行：

ocn status

看到：

Project: O’CodingNavigator
Mode: Strict
Tier: minimal
State: SPEC
Step: step_prd
SOP Profile: default-ai-coding-sop@0.1.0
OCN Version: 0.1.0
Purpose:
Create structured PRD and acceptance criteria before design or build.
Completed:
✓ docs/00-project-brief.md
✓ docs/01-scope.md
Missing:
✗ docs/02-prd.md
✗ docs/03-acceptance-criteria.md
Blocked:
Cannot enter DESIGN before PRD and Acceptance Criteria are complete.
Next Actions:
1. Run: ocn doc create prd
2. Run: ocn doc create acceptance-criteria
3. Run: ocn brief
4. Use: ocn prompt next

用户不再问：

我现在该干什么？

而是清楚知道：

当前状态。
当前目的。
当前 step id。
当前 tier。
缺失产物。
阻塞原因。
下一步命令。
AI 应该做什么。
AI 不应该做什么。

⸻

44. 已确认工程决策

Decision 001：Step pointer 使用稳定字符串 ID

Use currentStateId and currentStepId.
Do not use numeric step pointer as source of truth.
Use order only for sorting and display.

原因：

SOP 会升级。
数字编号容易因新增、删除、重排而失效。
稳定字符串 ID 更适合长期演化和项目锁定。

⸻

Decision 002：横切义务采用 push + pull 混合触发

System state events are push and must write audit automatically.
Human/AI semantic logs are pull and must be explicitly captured.

Push：

状态转移。
Gate。
SOP version 检测。
Baseline 创建。
高风险阻塞。

Pull：

Dev Log。
Decision Log。
Bugfix Report。
Research Log。
Learning Capture。
Reflection。

⸻

Decision 003：SOP Profile 独立版本化，项目 init 后锁定

SOP profiles live in OCN repository with independent version and changelog.
Project locks SOP profile version at init.
OCN detects difference but never upgrades automatically.
Upgrade command only generates plan in MVP.

⸻

Decision 004：AI Governance v1.0 是提示 + 审计，不是代码层强制阻断

Governance rules are injected into brief and prompt.
Gate controls OCN state transition.
Code-level enforcement is deferred to v1.1 hooks / PR checks.

⸻

Decision 005：Spec Profile 不是独立文档，而是 artifact 字段总和

Spec Profile is a structured field set across PRD, AC, Data Model, API Contract, Test Strategy and Decision Log.
MVP does not provide ocn doc create spec.

⸻

Decision 006：MVP 必须交付 Minimal MCP Server

MCP server is part of v1.0 MVP.
It wraps Core Engine and exposes a minimal stable tool set.

⸻

Decision 007：MVP 必须支持 Tier 初始化

ocn init --tier minimal
ocn init --tier production
ocn init --tier full

⸻

Decision 008：SOP Loader 是 Core Engine 的独立组件

SOP Loader compiles SOP Profile files into StateMachine, StepRegistry, ArtifactRegistry and GateRegistry.

⸻

45. 附录 A：SOP Step Map

这张表是 SOP Markdown、SOP Profile、SOP Loader、Core Engine 之间的契约。

step_id	state_id	order	artifact_required	depends_on	cross_cutting_obligation
step_project_brief	state_discovery	10	docs/00-project-brief.md	-	audit, decision_log
step_scope	state_discovery	20	docs/01-scope.md	step_project_brief	audit, decision_log
step_prd	state_spec	30	docs/02-prd.md	step_scope	audit, decision_log, scope_awareness
step_acceptance_criteria	state_spec	40	docs/03-acceptance-criteria.md	step_prd	audit, decision_log, scope_awareness
step_information_architecture	state_design	50	docs/04-information-architecture.md	step_acceptance_criteria	audit, decision_log
step_data_model	state_design	60	docs/05-data-model.md	step_information_architecture	audit, decision_log
step_api_contract	state_design	70	docs/06-api-contract.md	step_data_model	audit, decision_log
step_test_strategy	state_design	80	docs/07-test-strategy.md	step_api_contract	audit, decision_log
step_mvp_plan	state_plan	90	docs/08-mvp-plan.md	step_test_strategy	audit, rollback_awareness
step_real_data_wiring	state_plan	100	docs/09-real-data-wiring.md	step_mvp_plan	audit, rollback_awareness
step_config_and_env	state_plan	110	docs/10-config-and-env.md	step_real_data_wiring	audit, rollback_awareness
step_reproducibility	state_plan	120	docs/11-reproducibility.md	step_config_and_env	audit, rollback_awareness
step_rollback_plan	state_plan	130	docs/12-rollback-plan.md	step_reproducibility	audit, rollback_awareness
step_small_sample_validation	state_verify	140	docs/13-validation-report.md	step_rollback_plan	audit, baseline_tracking
step_issue_triage	state_verify	150	docs/14-debug-report.md	step_small_sample_validation	audit, baseline_tracking
step_debug_checklist	state_verify	160	docs/14-debug-report.md	step_issue_triage	audit, baseline_tracking
step_baseline	state_verify	170	docs/15-baseline.md	step_debug_checklist	audit, baseline_tracking
step_usability_acceptance	state_verify	180	docs/16-release-notes.md	step_baseline	audit, baseline_tracking
step_small_pr	state_build	190	PR Summary / docs/18-dev-log.md	step_test_strategy	dev_log, audit
step_research_production_split	state_build	200	docs/17-research-log.md	step_small_pr	dev_log, research_log, audit
step_bugfix_report	state_build	210	docs/18-dev-log.md	step_small_pr	dev_log, audit
step_uncertainty_policy	state_ship	220	docs/24-uncertainty-policy.md	step_usability_acceptance	audit, ai_governance
step_observability	state_ship	230	docs/20-observability.md	step_uncertainty_policy	audit
step_audit_trail	state_ship	240	docs/21-audit-trail.md	step_observability	audit
step_real_world_observation	state_reflect	250	docs/22-evolution-report.md	step_audit_trail	reflection, audit
step_offline_research	state_reflect	260	docs/17-research-log.md	step_real_world_observation	research_log, reflection
step_long_term_evidence	state_reflect	270	docs/22-evolution-report.md	step_offline_research	reflection, evidence
step_ai_governance	state_reflect	280	docs/23-ai-governance.md	step_long_term_evidence	ai_governance, reflection

⸻

46. 附录 A 说明

规则：

1. step_id 是稳定字符串 ID，不能用数字作为 source of truth。
2. order 只用于排序和展示。
3. state_id 表示 step 所属状态。
4. artifact_required 是 gate 检查的主要对象。
5. depends_on 定义 step 依赖关系。
6. cross_cutting_obligation 定义该 step 涉及的横切义务。
7. 同一 artifact 可以被多个 step 使用，例如 docs/14-debug-report.md。
8. 横切义务不等于阶段性 artifact。
9. SOP Loader 必须以这张表为输入契约。
10. SOP 版本升级时，diff 必须能识别 step id 新增、删除、变更和依赖变化。

⸻

47. 附录 B：Engineering Spec 待独立解决的问题

以下问题不放入 Project Brief 正文，应整理为独立文档：

docs/engineering-spec.md

该文档应覆盖：

测试结果如何流入 gate
state.json 并发与原子写入
state.json 损坏恢复
CLI 错误码与 error code
MCP server 最小工具集
Tier 初始化规则
SOP Loader 结构
dogfood 验证流程

说明：

Project Brief 定义产品是什么、为谁解决什么问题、第一版边界是什么。
Engineering Spec 定义如何实现、如何保证工程可靠性、如何处理异常和集成细节。

⸻

48. 最终判断

O’CodingNavigator 的 MVP 应保持简单，但不能只是脚手架。

它的核心不是生成目录。
它的核心是把 AI Coding SOP 产品化为：

状态机
稳定状态指针
PRD / AC artifact mapping
Gate
Brief
Log
Audit
Baseline
Tier
SOP Loader
SOP Versioning
AI Governance Brief
Minimal MCP Server

最终目标是：

让每一个 AI Coding 项目，从一开始就有目标、有边界、有 PRD、有验收、有状态、有 Gate、有日志、有 audit、有 baseline、有 SOP 版本、有证据升级路径。

O’CodingNavigator 第一版要证明一件事：

AI Coding 可以不是连续对话里的混乱执行，而是被状态机、PRD / AC 和 Gate 约束住的系统工程过程。