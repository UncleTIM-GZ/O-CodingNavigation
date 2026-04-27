# O’CodingNavigator Information Architecture
# #5｜Information Architecture 信息架构与流程文档 v1.1
文档路径：`docs/04-information-architecture.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.1`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
当前状态：`DESIGN`  
当前 Step：`step_information_architecture`  
依赖文档：  
- `docs/00-project-brief.md`
- `docs/01-scope.md`
- `docs/02-prd.md`
- `docs/03-acceptance-criteria.md`
对应 SOP：第 5 步｜先做信息架构和流程图
---
# 1. 文档目的｜Purpose
本文档定义 O’CodingNavigator v1.0 的信息架构、对象关系、状态流转、用户旅程和核心工作流。
This document defines the information architecture, object relationships, state transitions, user journeys, and core workflows of O’CodingNavigator v1.0.
它回答：
1. OCN 的核心信息对象有哪些？  
   What are OCN’s core information objects?
2. 这些对象之间是什么关系？  
   What are the relationships among these objects?
3. 用户、CLI、MCP Agent、Core Engine、SOP Profile、Artifacts 之间如何交互？  
   How do users, CLI, MCP Agent, Core Engine, SOP Profile, and Artifacts interact?
4. 项目如何从一个状态推进到下一个状态？  
   How does a project advance from one state to another?
5. Artifact 如何被创建、检查、标记、引用和阻塞？  
   How are artifacts created, checked, marked, referenced, and blocked?
6. Gate 如何决定 pass / warning / blocked？  
   How does Gate decide pass / warning / blocked?
7. Brief / Prompt Next 如何把当前 Step Contract 注入 AI？  
   How do Brief and Prompt Next inject the current Step Contract into AI?
8. MCP Server 如何安全暴露 OCN 能力？  
   How does MCP Server safely expose OCN capabilities?
9. 异常、锁、恢复流程如何工作？  
   How do error, lock, and recovery flows work?
10. 本 IA 如何约束下一步 Data Model、API Contract 和 Test Strategy？  
    How does this IA constrain the next Data Model, API Contract, and Test Strategy?
---
# 2. 设计原则｜Design Principles
## 2.1 状态机优先｜State Machine First
OCN 的项目推进必须由状态机控制。
OCN project progress must be controlled by the state machine.
```text
currentStateId + currentStepId = 项目当前位置
currentStateId + currentStepId = project position

任何时候用户执行：

ocn status

系统都必须能回答：

我在哪里？
我被什么阻塞？
下一步是什么？
Where am I?
What is blocking me?
What should I do next?

⸻

2.2 Artifact 是流程证据｜Artifact as Workflow Evidence

OCN 不把聊天记录当作正式证据。

OCN does not treat chat history as formal evidence.

正式证据必须落在：

docs/
.ocoding/

包括：

PRD
Acceptance Criteria
Information Architecture
Data Model
API Contract
Test Strategy
Dev Log
Decision Log
Audit Trail
Baseline

⸻

2.3 文件存在不等于完成｜File Existence Does Not Equal Completion

Artifact 文件存在只是最低条件。

Artifact file existence is only the minimum condition.

完整判断必须经过：

exists
not empty
required_sections pass
blocking_criteria pass
quality warnings recorded

⸻

2.4 Gate 是状态推进的唯一通道｜Gate as the Only State Transition Channel

状态推进必须经过：

ocn gate
ocn advance

ocn advance 不能绕过 gate。

ocn advance must not bypass gate.

⸻

2.5 AI 只能辅助，不能越权｜AI Assists, Not Controls

AI 可以：

读取状态
生成 artifact 草稿
生成 prompt
写普通 dev log
执行 gate 查询
read state
draft artifacts
generate prompts
write regular dev log
query gate

AI 不可以：

advance state
reset project
capture formal decision
modify SOP profile
mark blocked artifact as complete

⸻

2.6 IA 区分静态结构和动态流程｜Separate Static IA and Dynamic Workflow

本文档分成两大部分：

This document has two major parts:

Part A｜Static Information Architecture
静态信息架构
Part B｜Dynamic Workflows
动态工作流

静态信息架构回答：

Static IA answers:

有哪些对象？
对象之间是什么关系？
对象属于哪一层？
对象如何引用彼此？
What objects exist?
How do objects relate?
Which layer does each object belong to?
How do objects reference each other?

动态工作流回答：

Dynamic workflow answers:

用户怎么走？
命令怎么执行？
状态怎么推进？
数据怎么流动？
异常怎么恢复？
How does the user move?
How does each command execute?
How does state advance?
How does data flow?
How does recovery work?

⸻

Part A｜Static Information Architecture 静态信息架构

⸻

3. 顶层信息架构｜Top-level Information Architecture

OCN v1.0 由 7 个核心层组成：

OCN v1.0 consists of seven core layers:

User / 用户
CLI / 命令行入口
MCP Server / Agent 入口
Core Engine / 核心引擎
SOP Profile / 流程定义
Project State / 项目状态
Artifacts / 项目产物

⸻

3.1 顶层结构图｜Top-level Structure Diagram

flowchart TD
    User[User｜用户] --> CLI[CLI Layer｜命令行层]
    AIAgent[AI Agent｜AI 代理] --> MCP[MCP Server｜MCP 服务]
    CLI --> Core[Core Engine｜核心引擎]
    MCP --> Core
    Core --> State[(Project State｜state.json)]
    Core --> SOP[SOP Profile｜sop.yaml / gates.yaml]
    Core --> Artifacts[(Artifacts｜docs/*.md)]
    Core --> Audit[(Audit Trail｜docs/21-audit-trail.md)]
    SOP --> Core
    State --> Core
    Artifacts --> Core
    MCP -. does not expose .-> NoAdvance[advance_phase X]
    MCP -. does not expose .-> NoDecision[capture_decision X]
    MCP -. does not expose .-> NoReset[reset X]

⸻

3.2 CLI / MCP 双通道图｜CLI / MCP Dual-channel Diagram

flowchart LR
    User[User｜用户] -->|Terminal| CLI[CLI]
    Agent[AI Agent｜AI 代理] -->|MCP Protocol| MCP[MCP Server]
    CLI --> Core[Core Engine]
    MCP --> Core
    Core --> State[(.ocoding/state.json)]
    Core --> SOP[(.ocoding/sop.yaml)]
    Core --> Gates[(.ocoding/gates.yaml)]
    Core --> Docs[(docs/*.md)]
    Core --> Errors[(.ocoding/.errors.log)]
    MCP -. forbidden .-> Advance[navigator.advance_phase]
    MCP -. forbidden .-> Decision[navigator.capture_decision]
    MCP -. forbidden .-> Reset[navigator.reset_project]
    MCP -. forbidden .-> ModifySOP[navigator.modify_sop_profile]

⸻

4. 核心信息对象｜Core Information Objects

4.1 Project｜项目

Project 是 OCN 管理的最小单位。

A Project is the smallest unit managed by OCN.

项目必须包含：

.ocoding/
docs/

项目不等同于代码仓库。

A Project is not necessarily the same as a code repository.

OCN 默认只读写：

.ocoding/**
docs/**

⸻

4.2 SOPProfile｜SOP 配置

SOPProfile 定义 OCN 的流程规则。

SOPProfile defines OCN workflow rules.

包含：

states
steps
artifacts
required_sections
gate rules
cross-cutting obligations
version
aliases

文件位置：

.ocoding/sop.yaml
.ocoding/gates.yaml

⸻

4.3 ProjectState｜项目状态

ProjectState 记录当前项目位置。

ProjectState records current project position.

核心字段：

currentStateId
currentStepId
tier
artifactGateStatus
sopProfileId
sopProfileVersion
sopLockedAt

文件位置：

.ocoding/state.json

⸻

4.4 State｜状态

State 表示项目所在阶段。

State represents the project phase.

v1.0 状态：

state_discovery
state_spec
state_design
state_plan
state_build
state_verify
state_ship
state_reflect

⸻

4.5 SequentialStep｜顺序步骤

SequentialStep 表示必须按流程完成的一次性步骤。

SequentialStep represents a one-time step that must be completed through the workflow.

每个 SequentialStep 至少包含：

step_id
state_id
order
artifact_required
gate_rule
required_sections
quality_checks

⸻

4.6 CrossCuttingObligation｜横切义务

CrossCuttingObligation 表示贯穿多个状态的持续义务。

CrossCuttingObligation represents an ongoing obligation across multiple states.

它不是 sequential step。

It is not a sequential step.

典型横切义务：

obligation_audit_trail
obligation_ai_governance_brief
obligation_uncertainty_policy
obligation_research_split
obligation_sop_version_detection
obligation_baseline_tracking

⸻

4.7 Artifact｜产物

Artifact 是流程输出物。

Artifact is a workflow output.

例如：

docs/00-project-brief.md
docs/01-scope.md
docs/02-prd.md
docs/03-acceptance-criteria.md
docs/04-information-architecture.md
docs/05-data-model.md
docs/06-api-contract.md
docs/07-test-strategy.md

Artifact 状态：

missing
draft
draft_blocked
complete

⸻

4.8 RequiredSection｜必需章节

RequiredSection 定义某个 artifact 必须包含的章节。

RequiredSection defines a required section for an artifact.

核心字段：

id
canonical
aliases
min_heading_level
max_heading_level
severity

⸻

4.9 QualityCheck｜质量检查

QualityCheck 定义启发式质量提醒。

QualityCheck defines heuristic quality warning rules.

例如：

min_chars
min_bullets
required_example
required_reference

v1.0 的 QualityCheck 不做 LLM Judge。

v1.0 QualityCheck does not perform LLM Judge.

⸻

4.10 GateRule｜门禁规则

GateRule 定义某个 step 或 state 的门禁规则。

GateRule defines gate rules for a step or state.

Gate 类型：

Hard Gate
Process Gate
Step Artifact Gate
Artifact Quality Checklist
Soft Gate reserved

⸻

4.11 GateResult｜门禁结果

GateResult 是 gate 执行结果。

GateResult is the result of gate execution.

结果枚举：

pass
warning
blocked
not_applicable

⸻

4.12 AuditEvent｜审计事件

AuditEvent 是系统自动记录的关键流程历史。

AuditEvent is system-recorded workflow history.

典型事件：

project_initialized
gate_run
gate_failed
advance_succeeded
advance_failed
artifact_gate_blocked
baseline_created
reset_executed
sop_version_diff_detected

⸻

4.13 LogEntry｜日志条目

LogEntry 是用户或 AI 主动记录的工作日志。

LogEntry is a work log captured by user or AI.

类型：

dev
research

正式 decision 不属于普通 LogEntry，应使用 DecisionEntry。

Formal decisions should use DecisionEntry, not generic LogEntry.

⸻

4.14 DecisionEntry｜决策条目

DecisionEntry 是正式决策记录。

DecisionEntry is a formal decision record.

只能由 CLI 用户写入：

ocn log --type decision

MCP v1.0 不允许直接 capture decision。

⸻

4.15 ResearchEntry｜研究条目

ResearchEntry 是研究线日志。

ResearchEntry is a research-track log.

典型字段：

research question
hypothesis
method
finding
whether it enters production line

⸻

4.16 Baseline｜基线

Baseline 是某个稳定状态的快照和回滚依据。

Baseline is a stable checkpoint and rollback reference.

⸻

4.17 TestRecord｜测试记录

TestRecord 是从测试框架输出中读取的结构化结果。

TestRecord is structured result parsed from test framework output.

v1.0 支持：

vitest json

⸻

4.18 LockState｜锁状态

LockState 表示当前 OCN 写操作锁。

LockState represents current OCN write lock.

文件：

.ocoding/.lock

⸻

4.19 DoctorReport｜诊断报告

DoctorReport 是 ocn doctor 输出的诊断结果。

DoctorReport is the diagnostic result from ocn doctor.

⸻

4.20 BriefContent｜简报内容

BriefContent 是 ocn brief 的结构化内容。

BriefContent is structured content of ocn brief.

⸻

4.21 PromptContent｜Prompt 内容

PromptContent 是 ocn prompt next 的结构化内容。

PromptContent is structured content of ocn prompt next.

⸻

4.22 BilingualMessage｜双语消息

BilingualMessage 统一承载人类可读信息。

BilingualMessage stores human-readable bilingual messages.

{
  "en": "Required section is missing: Scenarios",
  "zh": "缺少必需章节：Scenarios｜使用场景"
}

⸻

5. 对象关系图｜Object Relationship ERD

erDiagram
    Project ||--|| ProjectState : has
    Project ||--|| SOPProfile : locks
    SOPProfile ||--o{ State : defines
    State ||--o{ SequentialStep : contains
    SOPProfile ||--o{ CrossCuttingObligation : defines
    SequentialStep ||--o| Artifact : produces
    SequentialStep ||--o{ RequiredSection : requires
    SequentialStep ||--o{ QualityCheck : checks
    SequentialStep ||--o| GateRule : has
    Project ||--o{ Artifact : owns
    Artifact ||--o{ ArtifactGateStatus : has
    Project ||--o{ GateResult : records
    Project ||--o{ AuditEvent : records
    Project ||--o{ LogEntry : records
    Project ||--o{ DecisionEntry : records
    Project ||--o{ ResearchEntry : records
    Project ||--o{ Baseline : records
    Project ||--o{ TestRecord : records
    Project ||--o{ DoctorReport : records
    Project ||--o| LockState : controls
    GateResult ||--o{ BilingualMessage : explains
    ErrorResult ||--o{ BilingualMessage : explains

说明：

Project 锁定一个 SOPProfile。
SOPProfile 定义 State、SequentialStep 和 CrossCuttingObligation。
SequentialStep 产出 Artifact。
Artifact 经过 ArtifactGateStatus 判断是否完成。
Project 记录 GateResult、AuditEvent、LogEntry、DecisionEntry、Baseline 等运行历史。

⸻

6. 状态架构｜State Architecture

6.1 状态总览｜State Overview

DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT

对应 state_id：

state_discovery → state_spec → state_design → state_plan → state_build → state_verify → state_ship → state_reflect

⸻

6.2 状态流转图｜State Transition Diagram

stateDiagram-v2
    [*] --> DISCOVERY
    DISCOVERY --> SPEC : gate pass
    SPEC --> DESIGN : gate pass
    DESIGN --> PLAN : gate pass
    PLAN --> BUILD : gate pass
    BUILD --> VERIFY : gate pass
    VERIFY --> SHIP : gate pass
    SHIP --> REFLECT : gate pass
    REFLECT --> DISCOVERY : new iteration
    BUILD --> DESIGN : rollback / design issue
    VERIFY --> BUILD : validation failed
    note right of DISCOVERY
      audit_trail active since init
      ai_governance active since first brief/prompt
      uncertainty_policy active since first brief/prompt
    end note
    note right of DESIGN
      research_split reminder active
    end note

⸻

6.3 状态与产物｜State and Artifacts

State	Sequential Artifacts｜顺序产物	Active Cross-Cutting Obligations｜活跃横切义务
DISCOVERY	Project Brief, Scope	Audit Trail, AI Governance, Uncertainty Policy
SPEC	PRD, Acceptance Criteria	Audit Trail, AI Governance, Uncertainty Policy
DESIGN	IA, Data Model, API Contract, Test Strategy	Audit Trail, AI Governance, Uncertainty Policy, Research Split Reminder
PLAN	MVP Plan, Real Data Wiring, Config, Reproducibility, Rollback	Audit Trail, AI Governance, Uncertainty Policy, Research Split
BUILD	Dev Log, PR Summary, Bugfix Report	Audit Trail, Research Split
VERIFY	Validation Report, Baseline, Release Notes	Audit Trail
SHIP	Observability	Audit Trail, Uncertainty Policy
REFLECT	Evolution Report, Long-term Evidence	AI Governance Review, Research Review

⸻

6.4 状态推进规则｜State Transition Rule

每次状态推进必须满足：

current state gate = pass
required artifacts = complete
blocking items = none
audit write = success

流程：

Run gate
  ↓
Gate pass?
  ├─ yes → advance state → write audit
  └─ no  → block advance → write audit → show next action

⸻

7. Step 架构｜Step Architecture

7.1 SequentialStep 定义

SequentialStep 是状态内需要按顺序完成的主流程步骤。

SequentialStep is the main ordered step within a state.

规则：

必须有明确 artifact
必须有 gate
必须能判断 complete
可以通过 order 排序

⸻

7.2 SequentialStep Map｜顺序步骤映射

数字 order 规则：

order = 原 SOP 步骤序号 × 10
order 只用于排序和展示
order 不作为对象引用主键
跨对象引用必须使用 stable string id

state_id	step_id	order	artifact
state_discovery	step_project_brief	10	docs/00-project-brief.md
state_discovery	step_scope	20	docs/01-scope.md
state_spec	step_prd	30	docs/02-prd.md
state_spec	step_acceptance_criteria	40	docs/03-acceptance-criteria.md
state_design	step_information_architecture	50	docs/04-information-architecture.md
state_design	step_data_model	60	docs/05-data-model.md
state_design	step_api_contract	70	docs/06-api-contract.md
state_design	step_test_strategy	80	docs/07-test-strategy.md
state_plan	step_mvp_plan	90	docs/08-mvp-plan.md
state_plan	step_real_data_wiring	100	docs/09-real-data-wiring.md
state_plan	step_config_and_env	110	docs/10-config-and-env.md
state_plan	step_reproducibility	120	docs/11-reproducibility.md
state_plan	step_rollback_plan	130	docs/12-rollback-plan.md
state_verify	step_small_sample_validation	140	docs/13-validation-report.md
state_verify	step_issue_triage	150	docs/14-debug-report.md
state_verify	step_debug_checklist	160	docs/14-debug-report.md
state_verify	step_baseline	170	docs/15-baseline.md
state_verify	step_usability_acceptance	180	docs/16-release-notes.md
state_build	step_pr_summary	190	docs/18-dev-log.md
state_build	step_bugfix_report	210	docs/18-dev-log.md
state_ship	step_observability	230	docs/20-observability.md
state_reflect	step_real_world_observation	250	docs/22-evolution-report.md
state_reflect	step_offline_research	260	docs/17-research-log.md
state_reflect	step_long_term_evidence	270	docs/22-evolution-report.md

说明：

原 SOP 中第 20、22、24、28 步被实现为 CrossCuttingObligation，不参与 SequentialStep order。
它们不从 SOP 中删除，只是实现语义从“一次性步骤”转为“持续义务”。

⸻

8. CrossCuttingObligation 架构｜横切义务架构

8.1 概念统一｜Concept Unification

本文档统一使用：

CrossCuttingObligation

不再使用：

cross_cutting_step

原因：

Step 表示顺序推进。
Obligation 表示持续义务。

⸻

8.2 CrossCuttingObligation Map｜横切义务映射

obligation_id	primary_state	activates_at	trigger_mode	persistence	related_artifact
obligation_audit_trail	state_discovery	project_initialized	push	accumulating	docs/21-audit-trail.md
obligation_ai_governance_brief	state_discovery	first_brief_or_prompt	injection	always_on	docs/23-ai-governance.md
obligation_uncertainty_policy	state_discovery	first_brief_or_prompt	injection	always_on	docs/24-uncertainty-policy.md
obligation_research_split	state_design	enter_state_design	reminder / pull	accumulating	docs/17-research-log.md
obligation_sop_version_detection	state_discovery	project_initialized	push	always_on	.ocoding/state.json
obligation_baseline_tracking	state_verify	first_baseline_created	push	accumulating	docs/15-baseline.md

⸻

8.3 横切义务规则｜Cross-Cutting Rules

CrossCuttingObligation 不阻塞当前 sequential step，除非其 gate rule 明确规定。
CrossCuttingObligation may not block the current sequential step unless its gate rule explicitly says so.
Audit Trail 从 init 开始。
Audit Trail starts from init.
AI Governance 从第一次 brief / prompt next 开始。
AI Governance starts from first brief / prompt next.
Uncertainty Policy 从第一次 brief / prompt next 开始。
Uncertainty Policy starts from first brief / prompt next.
Research Split 从进入 DESIGN 后开始提醒。
Research Split starts reminding after entering DESIGN.

⸻

9. Artifact 架构｜Artifact Architecture

9.1 Artifact 分层｜Artifact Layers

OCN artifact 分为 5 类：

Definition Artifacts
Design Artifacts
Plan Artifacts
Execution Artifacts
Governance Artifacts

⸻

9.2 Definition Artifacts｜定义类产物

docs/00-project-brief.md
docs/01-scope.md
docs/02-prd.md
docs/03-acceptance-criteria.md

目标：

定义项目为什么做、做什么、不做什么、怎样算完成

⸻

9.3 Design Artifacts｜设计类产物

docs/04-information-architecture.md
docs/05-data-model.md
docs/06-api-contract.md
docs/07-test-strategy.md

目标：

定义系统如何组织、数据如何流动、接口如何契约化、测试如何验证

⸻

9.4 Plan Artifacts｜计划类产物

docs/08-mvp-plan.md
docs/09-real-data-wiring.md
docs/10-config-and-env.md
docs/11-reproducibility.md
docs/12-rollback-plan.md

目标：

把设计转成可执行计划

⸻

9.5 Execution Artifacts｜执行类产物

docs/13-validation-report.md
docs/14-debug-report.md
docs/15-baseline.md
docs/16-release-notes.md
docs/18-dev-log.md

目标：

记录实现、验证、调试、基线和发布结果

⸻

9.6 Governance Artifacts｜治理类产物

docs/17-research-log.md
docs/19-decision-log.md
docs/20-observability.md
docs/21-audit-trail.md
docs/22-evolution-report.md
docs/23-ai-governance.md
docs/24-uncertainty-policy.md

目标：

记录研究分轨、决策、观测、审计、演化、AI 约束和不确定性表达

⸻

10. Artifact 引用关系矩阵｜Artifact Dependency Matrix

OCN 的 artifact 不是孤立文档。
OCN artifacts are not isolated documents.

每份 artifact 应显式引用其上游依据。

Each artifact should explicitly reference its upstream source.

Artifact	Must Reference｜必须引用	Optional Reference｜可选引用
project-brief	none	none
scope	project-brief	none
prd	scope	project-brief
acceptance-criteria	prd	scope
information-architecture	prd, acceptance-criteria	scope
data-model	prd, information-architecture	acceptance-criteria
api-contract	data-model	information-architecture
test-strategy	acceptance-criteria, api-contract	data-model
mvp-plan	prd, acceptance-criteria	design artifacts
real-data-wiring	data-model, api-contract	none
config-and-env	api-contract	reproducibility
reproducibility	config-and-env	none
rollback-plan	baseline	data-model
validation-report	acceptance-criteria, test-strategy	baseline
debug-report	acceptance-criteria	none
baseline	build artifacts	validation-report
release-notes	baseline	validation-report
dev-log	any	any
research-log	any	decision-log
decision-log	any	any
observability	api-contract	test-strategy
audit-trail	state, gate events	logs
evolution-report	validation-report, release-notes	audit-trail
ai-governance	PRD, AC	decision-log
uncertainty-policy	PRD, AC	ai-governance

规则：

ocn doc create <type> 应在模板中自动写入上游引用占位。
ocn prompt next 应根据当前 artifact 的依赖关系注入上游上下文。
ocn brief 应优先总结当前 artifact 的上游依据和阻塞项。

⸻

Part B｜Dynamic Workflows 动态工作流

⸻

11. 用户旅程｜User Journeys

11.1 Journey A｜新用户第一次使用 OCN

flowchart TD
    A[用户想启动 AI Coding 项目] --> B[ocn init --tier minimal]
    B --> C[ocn status]
    C --> D[看到 state_discovery / step_project_brief]
    D --> E[ocn doc create project-brief]
    E --> F[用户或 AI 填写 Project Brief]
    F --> G[ocn check]
    G --> H{Step Artifact Gate}
    H -->|blocked| I[根据 next action 修复 artifact]
    I --> G
    H -->|pass| J[ocn advance]
    J --> K[进入下一 step / state]

⸻

11.2 Journey B｜跨会话恢复

flowchart TD
    A[隔天重新打开项目] --> B[ocn brief]
    B --> C[AI 恢复当前上下文]
    C --> D[ocn status]
    D --> E[确认当前 state / step / blockers]
    E --> F[继续当前 step]
    F --> G[ocn check / ocn gate]

⸻

11.3 Journey C｜异常恢复

flowchart TD
    A[用户执行 ocn status] --> B{是否报错}
    B -->|否| C[继续正常流程]
    B -->|是| D[ocn doctor]
    D --> E[DoctorReport]
    E --> F{是否有 recovery suggestion}
    F -->|restore bak| G[从 state.json.bak 恢复]
    F -->|reset| H[ocn reset --keep-docs]
    F -->|manual| I[人工修复配置]
    G --> J[ocn status]
    H --> J
    I --> J

⸻

12. Artifact Lifecycle｜产物生命周期

12.1 生命周期状态图

stateDiagram-v2
    [*] --> missing
    missing --> draft : ocn doc create
    draft --> draft_blocked : ocn check blocked
    draft_blocked --> draft : user edits
    draft --> complete : ocn check pass
    draft_blocked --> complete : fixed and pass
    complete --> draft : user edits artifact
    complete --> missing : user deletes artifact
    missing --> draft_blocked : required artifact missing during check

⸻

12.2 状态含义

Artifact Status	含义 Meaning
missing	文件不存在
draft	文件存在但未完成
draft_blocked	文件存在但 Step Artifact Gate blocked
complete	文件存在且通过 required gate

⸻

12.3 Artifact Flow｜产物流

ocn doc create
  ↓
create template
  ↓
user / AI fills content
  ↓
ocn check
  ↓
Step Artifact Gate
  ├─ pass → complete
  ├─ warning → complete with warning
  └─ blocked → draft_blocked

⸻

13. Step Artifact Gate Workflow｜步骤产物门禁流程

13.1 Step Artifact Gate 决策树｜Decision Tree

flowchart TD
    A[Start Step Artifact Gate] --> B[Load currentStepId]
    B --> C[Resolve required artifact]
    C --> D{Artifact exists?}
    D -->|No| E[blocked: artifact missing]
    D -->|Yes| F{Artifact empty?}
    F -->|Yes| G[blocked: artifact empty]
    F -->|No| H[Parse Markdown AST]
    H --> I{AST parse success?}
    I -->|No| J[blocked: markdown parse error]
    I -->|Yes| K[Match required_sections by canonical / aliases]
    K --> L{All required sections found?}
    L -->|No| M[blocked: missing required sections]
    L -->|Yes| N[Run quality heuristics]
    N --> O{Any warning?}
    O -->|Yes| P[warning]
    O -->|No| Q[pass]
    E --> R[Write artifactGateStatus]
    G --> R
    J --> R
    M --> R
    P --> R
    Q --> R

⸻

13.2 输入｜Inputs

Step Artifact Gate 输入：

currentStepId
artifact path
required_sections
aliases
heading level rules
blocking_criteria
warning_criteria
quality_checks

⸻

13.3 required_sections 匹配规则

必须使用：

Markdown AST + alias table

匹配优先级：

section.id
canonical heading
aliases

示例：

id: scenarios
canonical: "Scenarios｜使用场景"
aliases:
  - "Scenarios"
  - "使用场景"
  - "Use Cases"
  - "User Scenarios"
  - "用户场景"
min_heading_level: 2
max_heading_level: 3

⸻

13.4 Self-check 与 AST 的关系

Self-check 不能替代 AST 检查。

Self-check cannot replace AST check.

规则：

AI self-check = 辅助声明
Markdown AST = 真实依据

如果 self-check 勾选了某 section，但 AST 没有检测到：

result = blocked
reason = self-check inconsistent

⸻

14. Gate Workflow｜门禁流程

14.1 Gate 输入

currentStateId
currentStepId
tier
artifact registry
step gate results
process gate rules
test result record

⸻

14.2 Gate 处理图

flowchart TD
    A[ocn gate] --> B[Load ProjectState]
    B --> C[Load SOPProfile]
    C --> D[Load steps under current state]
    D --> E[Run Step Artifact Gates]
    E --> F[Run Process Gates]
    F --> G[Aggregate results]
    G --> H{Any blocked?}
    H -->|Yes| I[GateResult = blocked]
    H -->|No| J{Any warning?}
    J -->|Yes| K[GateResult = warning]
    J -->|No| L[GateResult = pass]
    I --> M[Write audit]
    K --> M
    L --> M
    M --> N[Return bilingual output]

⸻

14.3 Gate 聚合规则

子结果	聚合结果
any blocked	blocked
no blocked + any warning	warning
all pass	pass
not_applicable only	not_applicable

⸻

14.4 GateResult 结构示例

{
  "stateId": "state_spec",
  "status": "blocked",
  "stepResults": [
    {
      "stepId": "step_prd",
      "status": "pass"
    },
    {
      "stepId": "step_acceptance_criteria",
      "status": "blocked"
    }
  ],
  "warnings": [],
  "blocked": [
    "docs/03-acceptance-criteria.md missing"
  ],
  "nextActions": [
    "Run ocn doc create acceptance-criteria"
  ]
}

⸻

15. Advance Workflow｜状态推进流程

15.1 Advance 原则

ocn advance 是唯一状态推进命令。

ocn advance is the only state transition command.

MCP v1.0 不暴露：

navigator.advance_phase

⸻

15.2 Advance 流程图

flowchart TD
    A[ocn advance] --> B[Run gate]
    B --> C{Gate pass?}
    C -->|No| D[Keep currentStateId]
    D --> E[Keep currentStepId]
    E --> F[Write advance_failed audit]
    F --> G[Return ERR_GATE_FAILED]
    C -->|Yes| H[Compute next state / step]
    H --> I[Update state.json]
    I --> J[Write advance_succeeded audit]
    J --> K[Return OK]

⸻

15.3 非法推进

非法推进包括：

跳过状态
跳过 required artifact
gate blocked 仍推进
MCP 请求 advance

全部必须 block。

⸻

16. Command Workflow｜CLI 命令流

16.1 命令总览

ocn init
ocn status
ocn brief
ocn prompt next
ocn doc create <type>
ocn check
ocn gate
ocn advance
ocn log
ocn log --type decision
ocn log --type research
ocn baseline create
ocn sop version
ocn sop diff
ocn sop upgrade --plan
ocn doctor
ocn doctor --snapshot
ocn reset --keep-docs
ocn reset --keep-state
ocn reset --hard
ocn test record --from vitest <path>
ocn check --include-tests

⸻

16.2 Command Routing｜命令路由

flowchart TD
    A[CLI command] --> B[Parse args]
    B --> C[Load project context: state.json]
    C --> D[Load SOP profile: sop.yaml / gates.yaml]
    D --> E[Verify SOP version compatibility]
    E --> F{Write operation?}
    F -->|Yes| G[Acquire lock]
    F -->|No| H[Call Core Engine]
    G --> H[Call Core Engine]
    H --> I[Write state / artifact / audit if needed]
    I --> J[Render bilingual output]

⸻

16.3 Read Commands｜读命令

默认不写 audit：

ocn status
ocn brief
ocn sop version
ocn sop diff

例外：

如果发生错误，可写 .ocoding/.errors.log

⸻

16.4 Write Commands｜写命令

必须走 lock：

ocn init
ocn doc create
ocn check
ocn gate
ocn advance
ocn log
ocn baseline create
ocn reset
ocn test record

其中部分必须写 audit：

init
gate
advance
baseline create
reset
sop version check if diff detected
Step Artifact Gate blocked

⸻

17. MCP Workflow｜MCP 交互流程

17.1 MCP 暴露工具

v1.0 MCP Server 暴露：

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

⸻

17.2 MCP 不暴露工具

v1.0 不暴露：

navigator.advance_phase
navigator.capture_decision
navigator.reset_project
navigator.modify_sop_profile

⸻

17.3 MCP 请求流程

flowchart TD
    A[MCP Agent] --> B[Call navigator.tool]
    B --> C[MCP Server validates tool and args]
    C --> D{Tool allowed?}
    D -->|No| E[Return ERR_GATE_FAILED / forbidden]
    D -->|Yes| F[Load project context]
    F --> G[Load SOP profile]
    G --> H[Call Core Engine]
    H --> I[Return structured JSON]
    I --> J[Include bilingual message]

⸻

17.4 MCP Gate Result 示例

{
  "code": "ERR_ARTIFACT_INVALID",
  "message": {
    "en": "Required section is missing: Scenarios",
    "zh": "缺少必需章节：Scenarios｜使用场景"
  },
  "data": {
    "stepId": "step_prd",
    "artifact": "docs/02-prd.md",
    "status": "blocked",
    "missingRequiredSections": ["scenarios"],
    "nextActions": [
      "Add Scenarios｜使用场景 to docs/02-prd.md"
    ]
  }
}

⸻

18. Brief / Prompt Workflow｜简报与 Prompt 流程

18.1 Brief Flow

flowchart TD
    A[ocn brief] --> B[Load state]
    B --> C[Load current artifacts]
    C --> D[Load recent dev log / decision log]
    D --> E[Load gate status]
    E --> F[Load AI governance rules]
    F --> G[Load uncertainty policy]
    G --> H[Render concise bilingual brief]

⸻

18.2 Prompt Next Flow

flowchart TD
    A[ocn prompt next] --> B[Load current step]
    B --> C[Load required artifact]
    C --> D[Load required_sections]
    D --> E[Load blocking_criteria]
    E --> F[Load quality_checklist]
    F --> G[Load AI governance]
    G --> H[Load uncertainty policy]
    H --> I[Generate next prompt]

⸻

18.3 Prompt Next 必须注入

current state
current step
artifact target
required_sections
blocking_criteria
self-check rule
AI governance
uncertainty policy
do not mark blocked artifact as complete

⸻

19. Log Workflow｜日志流程

19.1 Dev Log Flow

ocn log
  ↓
default type = dev
  ↓
collect entry
  ↓
write docs/18-dev-log.md
  ↓
optionally update state recentLogs

⸻

19.2 Decision Log Flow

ocn log --type decision
  ↓
validate CLI user
  ↓
collect decision fields
  ↓
write docs/19-decision-log.md

MCP 不允许直接 capture decision。

⸻

19.3 Research Log Flow

ocn log --type research
  ↓
check current state
  ↓
state_design or later?
  ├─ yes → write docs/17-research-log.md
  └─ no  → warning + still write if user confirms

⸻

20. Audit Workflow｜审计流程

20.1 Audit 触发地图｜Audit Event Trigger Map

flowchart TD
    Init[ocn init] --> ProjectInitialized[project_initialized]
    Gate[ocn gate] --> GateRun[gate_run]
    Gate --> GateFailed[gate_failed]
    Check[ocn check] --> ArtifactBlocked[artifact_gate_blocked]
    AdvancePass[ocn advance pass] --> AdvanceSucceeded[advance_succeeded]
    AdvanceFail[ocn advance failed] --> AdvanceFailed[advance_failed]
    Baseline[ocn baseline create] --> BaselineCreated[baseline_created]
    Reset[ocn reset] --> ResetExecuted[reset_executed]
    SopDiff[ocn sop version / diff] --> SopVersionDiff[sop_version_diff_detected]

⸻

20.2 Audit 触发事件

必须写 audit 的事件：

project_initialized
gate_run
gate_failed
advance_succeeded
advance_failed
artifact_gate_blocked
baseline_created
reset_executed
sop_version_diff_detected

⸻

20.3 Audit Event 最小字段

event_id
event_type
timestamp
state_id
step_id
actor
source
result
reason
related_artifact

⸻

20.4 Audit 写入路径

docs/21-audit-trail.md

结构：

## 2026-04-27T23:00:00+08:00｜gate_failed
- event_id:
- state_id:
- step_id:
- actor:
- source:
- result:
- reason:
- related_artifact:

⸻

21. Error / Recovery Workflow｜错误与恢复流程

21.1 Error Flow

flowchart TD
    A[Command starts] --> B[Load project]
    B --> C{Error?}
    C -->|No| D[Continue]
    C -->|Yes| E[Classify error]
    E --> F[Return stable error code]
    F --> G[Render bilingual message]
    G --> H[Suggest next action]
    H --> I{.ocoding exists?}
    I -->|Yes| J[Write .ocoding/.errors.log]
    I -->|No| K[No local error log]

⸻

21.2 常见错误分类

场景	Error Code
未初始化	ERR_STATE_MACHINE
state.json 损坏	ERR_STATE_MACHINE
SOP 版本不兼容	ERR_SOP_VERSION
artifact 缺失	ERR_ARTIFACT_INVALID
gate failed	ERR_GATE_FAILED
lock timeout	ERR_IO_OR_CONFIG
unsupported test format	ERR_IO_OR_CONFIG

⸻

21.3 Doctor Flow

flowchart TD
    A[ocn doctor] --> B[Check .ocoding exists]
    B --> C[Check state.json valid]
    C --> D[Check sop.yaml / gates.yaml]
    D --> E[Check current state / step exist]
    E --> F[Check artifacts readable]
    F --> G[Check template overrides]
    G --> H[Check SOP version compatibility]
    H --> I[Collect issues]
    I --> J[Attach severity]
    J --> K[Attach suggested action]
    K --> L[Attach auto-fixable flag]
    L --> M[Return DoctorReport]

⸻

21.4 DoctorReport 输出维度

DoctorReport 每个 issue 至少包含：

issue_id
severity
message
related_file
suggested_action
auto_fixable
related_command

示例：

{
  "issueId": "state_json_invalid",
  "severity": "error",
  "message": {
    "en": "state.json is invalid.",
    "zh": "state.json 无效。"
  },
  "relatedFile": ".ocoding/state.json",
  "suggestedAction": "restore from .ocoding/state.json.bak or run ocn reset --keep-docs",
  "autoFixable": true,
  "relatedCommand": "ocn doctor --restore-state"
}

⸻

21.5 Recovery Flow

flowchart TD
    A[state.json corrupted] --> B{state.json.bak exists?}
    B -->|Yes| C[Suggest restore from backup]
    B -->|No| D[Suggest reset --keep-docs]
    C --> E[Run doctor / restore flow]
    D --> F[Run reset --keep-docs]
    E --> G[ocn status]
    F --> G

⸻

22. Lock and Atomic Write Workflow｜锁与原子写入流程

22.1 写操作必须加锁

所有写操作必须使用：

.ocoding/.lock

⸻

22.2 LockState 结构

{
  "pid": 12345,
  "createdAt": "2026-04-27T23:00:00+08:00",
  "command": "ocn log",
  "client": "cli"
}

字段说明：

pid: 当前进程 id
createdAt: 锁创建时间
command: 当前写操作命令
client: cli | mcp

⸻

22.3 写入流程

flowchart TD
    A[Request write] --> B{Lock exists?}
    B -->|No| C[Acquire lock]
    B -->|Yes| D{Lock stale?}
    D -->|Yes| E[Reclaim stale lock]
    D -->|No| F[Retry every 200ms]
    F --> G{Timeout after 5s?}
    G -->|No| B
    G -->|Yes| H[Return ERR_IO_OR_CONFIG]
    E --> C
    C --> I[Backup target file]
    I --> J[Write temp file]
    J --> K[Rename temp file]
    K --> L[Release lock]

⸻

22.4 Stale Lock 判断

Stale lock 判断规则：

如果 pid 不存在，并且 createdAt 超过 30 秒，可以视为 stale lock。
If pid is not alive and createdAt is older than 30 seconds, the lock may be treated as stale.

⸻

22.5 Conflict Resolution｜并发冲突处理

每 200ms 重试一次
最多等待 5 秒
超过 5 秒返回 ERR_IO_OR_CONFIG
错误信息必须提示可能存在另一个 OCN 实例或 stale lock

⸻

22.6 Manual Override｜人工释放锁

GA 可提供：

ocn doctor --release-lock

规则：

只在 lock 被判断为 stale 时允许释放。
Only allow release when lock is detected as stale.

⸻

22.7 适用文件

.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
docs/*.md

⸻

23. Reset Workflow｜重置流程

23.1 reset –keep-docs

ocn reset --keep-docs
  ↓
confirm
  ↓
backup .ocoding
  ↓
remove / rebuild .ocoding
  ↓
keep docs/
  ↓
write audit

⸻

23.2 reset –keep-state

ocn reset --keep-state
  ↓
confirm
  ↓
regenerate templates / config
  ↓
keep state.json
  ↓
write audit

⸻

23.3 reset –hard

ocn reset --hard
  ↓
require second confirmation
  ↓
if no confirmation → blocked
  ↓
delete OCN-managed files only
  ↓
never delete business code by default

⸻

24. Test Result Workflow｜测试结果流程

24.1 Test Record Flow

ocn test record --from vitest <path>
  ↓
validate explicit path
  ↓
read vitest json
  ↓
parse test result
  ↓
write test record
  ↓
update state

⸻

24.2 Unsupported Format

unknown format
  ↓
blocked
  ↓
ERR_IO_OR_CONFIG

⸻

24.3 Check With Tests

ocn check --include-tests
  ↓
run artifact checks
  ↓
load recorded test result
  ↓
merge test result into check output

⸻

25. Language Architecture｜语言架构

25.1 机器字段

机器字段必须英文：

currentStateId
currentStepId
artifactGateStatus
missingRequiredSections
errorCode
nextActions

⸻

25.2 人类信息

人类信息必须双语：

{
  "message": {
    "en": "Required section is missing: Scenarios",
    "zh": "缺少必需章节：Scenarios｜使用场景"
  }
}

⸻

25.3 Artifact Heading

统一格式：

## English｜中文

示例：

## Scenarios｜使用场景

⸻

26. File System Architecture｜文件系统架构

26.1 OCN 管理路径

OCN 默认只读写：

.ocoding/**
docs/**

⸻

26.2 可显式读取路径

仅用户显式提供时读取：

test result path

例如：

ocn test record --from vitest ./tmp/vitest.json

⸻

26.3 默认不读写路径

src/**
.git/**
package.json
项目目录之外路径

例外必须由用户显式要求，并且 v1.0 默认不支持修改这些路径。

⸻

27. Dogfood Workflow｜Dogfood 流程

27.1 Dogfood Project 1: OCN itself

目标：

验证 OCN 能否管理自己的开发流程

必须跑通：

DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP

证据：

audit trail
decision log
dev log
baseline
dogfood-report.md

⸻

27.2 Dogfood Project 2: mini CRM

目标：

验证 OCN 能否支持非工具型业务项目

项目：

mini CRM｜客户偏好管理系统 mini 版

边界：

不做人脸识别
不接摄像头
不处理真实敏感个人信息
使用模拟客户数据

必须跑通：

DISCOVERY → VERIFY

说明：

mini CRM dogfood 跑通 DISCOVERY → VERIFY，重点验证业务项目的定义、设计、计划、构建与验证闭环。
SHIP / REFLECT 由 OCN 自身 dogfood 覆盖，避免 mini CRM 范围过度膨胀。

⸻

28. IA 对后续文档的约束｜Constraints for Next Documents

28.1 Data Model Required Objects｜Data Model 必须定义的对象

下一份 docs/05-data-model.md 至少必须定义以下模型：

Project
ProjectState
SOPProfile
State
SequentialStep
CrossCuttingObligation
Artifact
ArtifactGateStatus
RequiredSection
QualityCheck
GateRule
GateResult
AuditEvent
LogEntry
DecisionEntry
ResearchEntry
Baseline
TestRecord
LockState
SOPVersionDiff
SOPUpgradePlan
DoctorReport
BriefContent
PromptContent
MCPToolResult
ErrorResult
BilingualMessage

⸻

28.2 Data Model Engineering Rules｜Data Model 工程规则

Data Model 必须遵守：

所有对象主键使用 stable string id。
All object primary keys must use stable string ids.
所有跨对象引用必须通过 id，不通过 order 或 index。
All cross-object references must use ids, not order or index.
所有时间字段使用 ISO 8601。
All time fields must use ISO 8601.
所有 enum 字段必须显式定义，不允许 free-form string。
All enum fields must be explicitly defined. Free-form string is not allowed for enums.
所有人类信息必须使用 BilingualMessage。
All human-readable messages must use BilingualMessage.

⸻

28.3 对 API Contract 的约束

docs/06-api-contract.md 必须覆盖：

CLI command contract
Core Engine function contract
MCP tool contract
Error result contract
Bilingual message contract
Gate result contract
Doctor report contract
Lock state contract

⸻

28.4 对 Test Strategy 的约束

docs/07-test-strategy.md 必须覆盖：

state machine tests
artifact gate tests
required_sections AST tests
gate aggregation tests
advance blocking tests
MCP boundary tests
file system boundary tests
lock / atomic write tests
doctor recovery tests
dogfood validation

⸻

29. Information Architecture Self-check｜信息架构自检

✓ Purpose｜文档目的
✓ Design Principles｜设计原则
✓ Top-level architecture
✓ CLI / MCP dual-channel diagram
✓ Core information objects
✓ Object relationship ERD
✓ State architecture
✓ State transition diagram
✓ SequentialStep architecture
✓ CrossCuttingObligation architecture
✓ Artifact architecture
✓ Artifact dependency matrix
✓ User journeys
✓ Artifact lifecycle diagram
✓ Step Artifact Gate decision tree
✓ Gate workflow
✓ Advance workflow
✓ CLI command workflow
✓ MCP workflow
✓ Brief / Prompt workflow
✓ Log workflow
✓ Audit event trigger map
✓ Error / recovery workflow
✓ Doctor report recovery suggestions
✓ Lock / atomic write workflow
✓ Reset workflow
✓ Test result workflow
✓ Language architecture
✓ File system architecture
✓ Dogfood flow
✓ Constraints for Data Model
✓ Constraints for API Contract
✓ Constraints for Test Strategy

⸻

30. 下一步｜Next Step

完成本文档后，进入下一步：

After this document, move to:

#6｜Data Model 数据模型文档
docs/05-data-model.md

下一份文档将定义 OCN 的核心数据对象、字段、关系、状态枚举、事件结构和持久化文件结构。

The next document will define OCN’s core data objects, fields, relationships, state enums, event structures, and persistence file structures.

特别注意：

Special note:

Data Model 必须严格继承本文档第 28 节的 Required Objects 和 Engineering Rules。
Data Model must strictly inherit Required Objects and Engineering Rules from Section 28 of this document.
如果 Data Model 阶段发现 IA 对象关系需要调整，应写入 IA Amendment，而不是静默修改数据模型。
If Data Model finds that IA object relationships need adjustment, write an IA Amendment instead of silently modifying the data model.