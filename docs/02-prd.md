# O’CodingNavigator PRD
# #3｜PRD 产品需求文档
文档路径：`docs/02-prd.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.2`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
当前状态：`SPEC`  
当前 Step：`step_prd`  
依赖文档：  
- `docs/00-project-brief.md`
- `docs/01-scope.md`
对应 SOP：第 3 步｜先写需求文档
---
# 1. 文档目的｜Purpose
本文档用于定义 O’CodingNavigator v1.0 的产品需求。
This document defines the product requirements for O’CodingNavigator v1.0.
它回答：
1. OCN v1.0 要服务谁？  
   Who does OCN v1.0 serve?
2. 用户在什么场景下使用 OCN？  
   In what scenarios do users use OCN?
3. OCN v1.0 必须提供哪些功能？  
   What functions must OCN v1.0 provide?
4. 每个功能解决什么问题？  
   What problem does each function solve?
5. 每个功能在 alpha、beta、GA 哪个阶段交付？  
   Which release phase delivers each capability: alpha, beta, or GA?
6. 哪些需求明确不进入 v1.0？  
   What is explicitly out of scope for v1.0?
7. OCN 如何通过 PRD / AC / Artifact / Gate / Brief / Log / Audit / MCP 形成闭环？  
   How does OCN form a closed loop through PRD, AC, Artifact, Gate, Brief, Log, Audit, and MCP?
8. OCN 如何确保 AI 产出的文档能通过当前 SOP Step Gate，而不是只生成“看起来完整”的文档？  
   How does OCN ensure AI-generated artifacts pass the current SOP Step Gate instead of merely looking complete?
本文档不是技术设计文档。  
This is not a technical design document.
技术实现细节将在后续文档中定义：  
Technical implementation details will be defined in later documents:
```text
docs/04-information-architecture.md
docs/05-data-model.md
docs/06-api-contract.md
docs/07-test-strategy.md

⸻

2. 产品背景｜Product Background

AI Coding 工具正在快速普及。
AI coding tools are rapidly becoming mainstream.

用户可以使用 Claude Code、Codex、Cursor、Cline、Gemini CLI 等工具快速生成代码、文档、测试和脚本。
Users can use tools such as Claude Code, Codex, Cursor, Cline, and Gemini CLI to quickly generate code, documents, tests, and scripts.

但真实项目中，AI Coding 的主要失败并不是“AI 不会写代码”。
But in real projects, the main failure mode of AI coding is not that AI cannot write code.

更常见的问题是：

More common problems are:

目标不清
Unclear goals
范围失控
Scope drift
需求漂移
Requirement drift
数据结构混乱
Unstable data structure
接口不一致
Inconsistent interface contracts
测试不可验证
Unverifiable tests
修改没有记录
Unlogged changes
上下文跨会话丢失
Lost context across sessions
项目无法复盘
Project cannot be reviewed or reconstructed
AI 越权做关键判断
AI makes decisions beyond its authority
文档虽然生成了，但没有满足当前 SOP Step 的必备结构
Artifacts are generated but do not satisfy the required structure of the current SOP Step

OCN 要解决的不是“再做一个代码生成器”。
OCN is not another code generator.

OCN 要解决的是：

OCN solves this:

让 AI Coding 项目按照状态机、Artifact、Gate、Brief、Log、Audit 和 SOP Versioning 被稳定推进。
Make AI coding projects progress through State Machine, Artifact, Gate, Brief, Log, Audit, and SOP Versioning.

更进一步，OCN 不能只让 AI 生成文档。
More importantly, OCN must not merely let AI generate documents.

OCN 必须让 AI 生成：

OCN must make AI generate:

能通过当前 SOP Step Gate 的 artifact。
Artifacts that can pass the current SOP Step Gate.

否则 OCN 会退化成文档脚手架，而不是流程操作系统。
Otherwise, OCN becomes a document scaffold rather than a workflow operating system.

⸻

3. 产品一句话定义｜One-line Product Definition

O’CodingNavigator 是一个 开源、本地优先、MCP-first、状态机驱动的 AI Coding 流程操作系统，帮助 Solo Builder、小团队和 AI Coding 教练，把 AI Coding 项目从“连续对话写代码”升级为“可导航、可验证、可回滚、可审计、可复盘的系统工程过程”。

O’CodingNavigator is an open-source, local-first, MCP-first, state-machine-driven workflow operating system for AI coding, helping Solo Builders, small teams, and AI Coding Coaches upgrade AI coding projects from “coding through continuous chat” to a navigable, verifiable, rollbackable, auditable, and reviewable system engineering process.

⸻

4. 核心问题｜Core Problems

OCN v1.0 要解决四类核心问题。
OCN v1.0 solves four core problems.

⸻

4.1 迷路｜Getting Lost

用户不知道：
Users do not know:

现在在哪一步
Where they are
下一步做什么
What to do next
为什么被阻塞
Why they are blocked
缺什么 artifact
Which artifact is missing
能不能进入下一状态
Whether they can advance to the next state
AI 现在应该做什么
What AI should do now
AI 现在不应该做什么
What AI should not do now

OCN 通过以下能力解决：
OCN solves this through:

State Machine
Stable Step ID
ocn status
ocn brief
ocn prompt next
navigator.where_am_i
navigator.brief

⸻

4.2 失控｜Losing Control

项目失控表现为：
Loss of control appears as:

AI 直接写代码但没有 PRD
AI writes code directly without PRD
功能越做越大
Feature scope keeps expanding
bugfix 夹带重构
Bugfix contains unrelated refactoring
跳过验收标准
Acceptance criteria are skipped
没有 rollback plan 就做高风险修改
High-risk changes happen without rollback plan
gate 没有真正阻止状态推进
Gate does not actually block state transition

OCN 通过以下能力解决：
OCN solves this through:

Scope
PRD / AC
Gate
Step Artifact Gate
Artifact Quality Checklist
Process Gate
Baseline
Rollback Awareness
Audit Trail

⸻

4.3 失忆｜Forgetting

项目失忆表现为：
Project memory loss appears as:

跨会话 AI 不知道之前做了什么
AI does not know what happened in previous sessions
用户隔天忘记为什么这样设计
User forgets why a design was chosen
修改没有 dev log
Changes have no dev log
决策没有 decision log
Decisions have no decision log
baseline 不存在
No baseline exists
团队成员无法接手
Team members cannot take over

OCN 通过以下能力解决：
OCN solves this through:

Hot Brief
Dev Log
Decision Log
Audit Trail
Baseline
SOP Versioning

⸻

4.4 假完成｜Fake Completion

假完成是 OCN 必须重点防止的问题。
Fake completion is a core failure mode OCN must prevent.

表现为：
It appears as:

文档文件存在，但内容不完整
Document file exists, but content is incomplete
PRD 存在，但没有 Scenarios
PRD exists, but Scenarios are missing
AC 存在，但没有 Given / When / Then
AC exists, but Given / When / Then are missing
Data Model 存在，但没有核心实体
Data Model exists, but core entities are missing
API Contract 存在，但没有错误码
API Contract exists, but error codes are missing
Test Strategy 存在，但无法支撑验收
Test Strategy exists, but cannot support acceptance

根因：
Root causes:

只检查 artifact 是否存在
Only checking whether artifact exists
没有检查 required sections
Required sections are not checked
没有检查 required fields
Required fields are not checked
没有区分 pass / warning / blocked
No distinction among pass / warning / blocked
没有把 Step Gate 注入 prompt
Step Gate is not injected into prompt
AI 输出后没有自检
AI output has no self-check

OCN 通过以下能力解决：
OCN solves this through:

Step Artifact Gate
Artifact Quality Checklist
Prompt Injection Rule
Self-check Rule
Artifact Completion Rule
Blocking Rule

OCN v1.0 的核心产品判据之一：
One of OCN v1.0’s core product success criteria:

能否阻止 artifact fake completion。
Whether OCN can prevent artifact fake completion.

⸻

5. 产品目标｜Product Goals

5.1 v1.0 总目标｜v1.0 Overall Goal

OCN v1.0 必须交付一个本地可运行的流程系统，让用户可以：
OCN v1.0 must deliver a locally runnable workflow system that allows users to:

初始化一个 AI Coding 项目
Initialize an AI coding project
查看当前状态
View current state
知道下一步该做什么
Know what to do next
生成当前阶段需要的 artifact
Generate artifacts required by the current stage
检查 artifact 是否满足当前 step 的结构要求
Check whether an artifact satisfies the structural requirements of the current step
执行 gate 检查
Run gate checks
阻止非法状态推进
Block illegal state transitions
生成 AI 会话 brief
Generate AI session brief
记录 dev log / decision log
Record dev log and decision log
自动写 audit
Automatically write audit trail
创建 baseline
Create baseline
检测 SOP 版本差异
Detect SOP version differences
通过 MCP 被 AI agent 调用
Be called by AI agents through MCP

⸻

5.2 v1.0-alpha 目标｜v1.0-alpha Goal

alpha 是内部 dogfood 版。
Alpha is the internal dogfood version.

目标：
Goal:

OCN 自己能用 OCN 跑起来。
OCN can use OCN to build OCN itself.

必须证明：
It must prove:

状态机可运行
State machine works
SOP Loader 可加载 default profile
SOP Loader can load default profile
Tier minimal 可初始化
Tier minimal can initialize
Artifact 可创建
Artifacts can be created
Step Artifact Gate 可检查 required sections
Step Artifact Gate can check required sections
Gate 可 block
Gate can block
Brief 可生成
Brief can be generated
Log 可写入
Log can be written
Audit 可自动写入
Audit can be automatically written
state.json 安全写入可用
Safe state.json writing works

⸻

5.3 v1.0-alpha 客观退出条件｜v1.0-alpha Objective Exit Criteria

alpha 不能凭“感觉差不多了”结束。
Alpha must not exit based on subjective feeling.

alpha 必须满足以下客观条件：
Alpha must satisfy the following objective criteria:

1. OCN 使用自身流程跑通 DISCOVERY → SPEC → DESIGN，全程不绕过 hard gate
   OCN uses its own workflow to complete DISCOVERY → SPEC → DESIGN without bypassing any hard gate
2. step_prd 至少触发过一次 blocked，且修复后通过
   step_prd triggers blocked at least once, then passes after revision
3. 至少 5 次 ocn gate 执行记录
   At least 5 ocn gate executions are recorded
4. 至少 3 次 ocn advance 成功
   At least 3 successful ocn advance events
5. 至少 1 次 ocn advance 因 gate 失败被阻止
   At least 1 ocn advance is blocked by gate failure
6. 至少 10 条 dev log
   At least 10 dev log entries
7. 至少 3 条 decision log
   At least 3 decision log entries
8. state.json 写入未损坏；如果损坏，doctor 必须能从 bak 恢复
   state.json is not corrupted; if corrupted, doctor can restore from backup
9. ocn brief 至少在一次长上下文恢复中有效
   ocn brief successfully restores context at least once in a long-context session

⸻

5.4 v1.0-beta 目标｜v1.0-beta Goal

beta 是外部测试版。
Beta is the external testing version.

目标：
Goal:

非 OCN 项目也能使用 OCN，并且 AI agent 可以通过 MCP 调用 OCN。
Non-OCN projects can use OCN, and AI agents can call OCN through MCP.

必须证明：
It must prove:

Tier production 可用
Tier production works
Minimal MCP Server 可用
Minimal MCP Server works
Doctor 可检测基础损坏
Doctor can detect basic corruption
SOP version / diff 可用
SOP version / diff works
Reset --keep-docs 可用
Reset --keep-docs works
CLI error code 可用
CLI error codes work
Step Artifact Gate 能阻止 PRD / AC 不完整导致的假完成
Step Artifact Gate can prevent fake completion caused by incomplete PRD / AC
第二个非工具型业务项目能跑通 DISCOVERY → VERIFY
Second non-tool business project can complete DISCOVERY → VERIFY

⸻

5.5 v1.0-GA 目标｜v1.0-GA Goal

GA 是公开发布版。
GA is the public release version.

目标：
Goal:

补齐 OCN v1.0 对外发布所需的完整边界和长期演化能力。
Complete the release boundary and long-term evolution capability required for OCN v1.0 public release.

必须证明：
It must prove:

Tier full 可用
Tier full works
SOP upgrade --plan 可用
SOP upgrade --plan works
Test result gate 可用
Test result gate works
Reset 完整策略可用
Full reset policy works
Step Artifact Gate 覆盖 v1.0 所有 tier 相关 artifact
Step Artifact Gate covers all v1.0 tier-related artifacts
Artifact Quality Checklist 可作为人工 review 和未来 LLM Judge 的 rubric
Artifact Quality Checklist works as human-review rubric and future LLM Judge rubric
DoD 完成
Definition of Done is completed
Success Criteria 完成
Success Criteria are completed
Dogfood 报告完成
Dogfood report is completed

⸻

6. 非目标｜Non-goals

OCN v1.0 明确不做以下事情。
OCN v1.0 explicitly does not do the following.

6.1 不做图形界面｜No GUI

不做：
Not included:

TUI
Web GUI
项目看板
Project board
图形化状态机
Graphical state machine
浏览器管理后台
Browser-based admin console

原因：
Reason:

v1.0 的核心是流程闭环，不是界面体验。
The core of v1.0 is workflow closure, not interface experience.

⸻

6.2 不做 SaaS｜No SaaS

不做：
Not included:

云服务
Cloud service
用户系统
User system
团队权限
Team permissions
在线协作
Online collaboration
云同步
Cloud sync

原因：
Reason:

v1.0 必须保持 local-first。
v1.0 must remain local-first.

⸻

6.3 不做数据库｜No Database

不做：
Not included:

SQLite
Postgres
向量数据库
Vector database
远程数据库
Remote database

原因：
Reason:

Markdown + JSON + YAML 足以支撑 v1.0。
Markdown + JSON + YAML are sufficient for v1.0.

⸻

6.4 不做完整 LLM Judge｜No Full LLM Judge

不做：
Not included:

自动判断 PRD 质量
Automatically judging PRD quality
自动判断 AC 是否合格
Automatically judging whether AC is qualified
自动判断代码是否偏离 Spec
Automatically judging whether code deviates from Spec
自动打分并强制阻断
Automatic scoring and forced blocking

原因：
Reason:

v1.0 只实现确定性结构检查和人工可读 checklist。
v1.0 only implements deterministic structural checks and human-readable checklists.

Artifact Quality Checklist 作为未来 LLM Judge 的 rubric 预留。
Artifact Quality Checklist is reserved as a future rubric for LLM Judge.

⸻

6.5 不做代码层强阻断｜No Code-level Enforcement

不做：
Not included:

git pre-commit hook
PR check
protected path enforcement
auth/payment/db migration detector
scope drift deep diff

原因：
Reason:

v1.0 的 AI Governance 是 brief 注入 + audit + 流程 gate，不是代码层强阻断。
v1.0 AI Governance is brief injection + audit + workflow gate, not code-level enforcement.

⸻

6.6 不自动修改业务代码｜No Automatic Business Code Modification

OCN 不负责：
OCN is not responsible for:

生成业务代码
Generating business code
修改业务代码
Modifying business code
重构业务代码
Refactoring business code
自动提交代码
Auto-committing code
自动创建 PR
Auto-creating PR
自动合并 PR
Auto-merging PR

OCN 只负责：
OCN is responsible only for:

流程
Workflow
artifact
artifact
gate
gate
brief
brief
log
log
audit
audit
baseline
baseline
SOP versioning
SOP versioning
MCP tools
MCP tools

⸻

6.7 不暴露 MCP advance｜No MCP Advance

v1.0 Minimal MCP Server 不暴露：
v1.0 Minimal MCP Server does not expose:

navigator.advance_phase

原因：
Reason:

状态推进是流程门禁。
State transition is a process gate.

v1.0 中状态推进必须由用户通过 CLI 执行：
In v1.0, state transition must be performed by the user through CLI:

ocn advance

⸻

6.8 不暴露 MCP capture_decision｜No MCP capture_decision

v1.0 Minimal MCP Server 不暴露：
v1.0 Minimal MCP Server does not expose:

navigator.capture_decision

原因：
Reason:

决策日志代表正式决策记录。
Decision Log represents formal decision records.

AI 可以帮助起草决策，但不应直接把决策写入正式 Decision Log。
AI may help draft decisions, but should not directly record formal decisions.

v1.0 中正式决策记录必须由 CLI 用户执行：
In v1.0, formal decision capture must be performed by the CLI user:

ocn log --type decision

v1.1 可考虑：
v1.1 may consider:

navigator.propose_decision

⸻

7. 目标用户｜Target Users

7.1 第一优先级用户｜Primary Users

7.1.1 Solo Builder

一个人承担产品、开发、测试、文档、发布和维护。
A single person handles product, development, testing, documentation, release, and maintenance.

典型问题：
Typical problems:

没人帮他做产品经理
No product manager support
没人帮他做技术经理
No technical manager support
没人帮他做 QA
No QA support
没人帮他做项目管理
No project management support
没人提醒他写日志、建 baseline、准备 rollback
No one reminds them to write logs, create baseline, and prepare rollback
容易让 AI 直接写代码而跳过 PRD / AC
Easy to let AI write code directly and skip PRD / AC

OCN 对他的价值：
OCN value:

告诉他现在在哪一步
Tell where they are
告诉他下一步该做什么
Tell what to do next
阻止他跳过关键文档
Prevent skipping key documents
提醒他记录修改
Remind them to log changes
帮助他建立 baseline 和 audit
Help create baseline and audit
检查文档是否满足当前 step 的结构要求
Check whether documents satisfy current step structure
让个人项目变得可管理
Make solo projects manageable

⸻

7.1.2 小团队｜Small Teams

2–8 人的小团队，已经开始使用 AI Coding，但没有成熟研发流程。
Small teams of 2–8 people already using AI coding without mature development process.

典型问题：
Typical problems:

每个人都在用 AI，但没有统一 Spec
Everyone uses AI, but no unified Spec
需求、代码、测试、日志分散
Requirements, code, tests, and logs are scattered
AI 生成内容缺少统一 gate
AI-generated output lacks unified gate
团队无法判断一个变更是否符合原目标
Team cannot judge whether a change fits original goal
文档质量依赖个人习惯
Document quality depends on personal habits

OCN 对他们的价值：
OCN value:

统一状态机
Unified state machine
统一 artifact
Unified artifact system
统一 gate
Unified gate
统一 dev log / decision log
Unified dev log / decision log
统一 SOP profile
Unified SOP profile
统一 artifact required sections
Unified artifact required sections
降低小团队的研发纪律成本
Lower the cost of engineering discipline for small teams

⸻

7.1.3 AI Coding 教练 / 培训者｜AI Coding Coach / Trainer

需要带学员、业务团队或内部团队按 SOP 做项目。
Needs to guide learners, business teams, or internal teams through SOP-based projects.

典型问题：
Typical problems:

只讲原则，学员很难执行
Principles alone are hard for learners to execute
每个人项目进度不同
Each project is at a different stage
学员不知道下一步做什么
Learners do not know what to do next
学员不写文档、不写日志、不做验收
Learners skip documents, logs, and acceptance
学员文档看起来有，但不满足 SOP
Learner artifacts exist but do not satisfy SOP
培训成果难复盘
Training outcomes are hard to review

OCN 对他们的价值：
OCN value:

把教学从“讲道理”变成“流程执行”
Turn teaching from principle explanation into workflow execution
每个学员项目都有状态、artifact、gate 和 log
Each learner project has state, artifact, gate, and log
教练可以围绕 OCN 状态做辅导
Coach can guide around OCN state
教练可以用 Step Artifact Gate 判断学员文档是否合格
Coach can use Step Artifact Gate to judge artifact quality

⸻

7.2 第二优先级用户｜Secondary Users

业务型 AI Coding 实践者｜Business-oriented AI Coding Practitioner

懂业务，有项目想法，已经尝试过 Claude Code、Codex、Cursor、Cline 等工具，但缺少完整工程流程。
Understands business and has project ideas, has tried AI coding tools, but lacks full engineering workflow.

典型问题：
Typical problems:

会描述业务，但不会拆成 PRD / AC
Can describe business but cannot break it into PRD / AC
容易直接让 AI 写代码
Tends to let AI write code directly
不会定义数据模型和接口契约
Cannot define data model and API contract
缺少验收标准
Lacks acceptance criteria
不知道如何判断 AI 写得对不对
Does not know how to judge AI output
不知道生成的文档是否能支撑下一步
Does not know whether generated artifacts support the next step

OCN 对他的价值：
OCN value:

把业务语言转成工程流程
Turn business language into engineering workflow
把想法转成 PRD 和 AC
Turn ideas into PRD and AC
把 AI Coding 管起来
Manage AI coding
通过 Gate Checklist 告诉他文档缺什么
Use Gate Checklist to show what is missing

⸻

7.3 暂不优先服务的用户｜Non-priority Users

完全零基础编程用户
Users with zero programming foundation
大型企业成熟研发团队
Mature enterprise engineering teams
需要复杂协作平台的团队
Teams needing complex collaboration platform
需要云同步和权限管理的团队
Teams needing cloud sync and permission management
需要 Web GUI 的用户
Users needing Web GUI
需要全自动 AI Agent 的用户
Users needing fully autonomous AI agents

⸻

8. 用户角色｜User Roles

8.1 Project Owner

项目负责人。
Project owner.

可以是 Solo Builder、小团队负责人、AI Coding 教练或业务负责人。
Can be Solo Builder, small team lead, AI Coding Coach, or business owner.

需要：
Needs to:

初始化项目
Initialize project
查看项目当前状态
View project state
决定是否进入下一状态
Decide whether to advance state
确认 override reason
Confirm override reason
判断高风险动作
Judge high-risk actions
查看 Step Artifact Gate 结果
View Step Artifact Gate results
决定是否修正文档
Decide whether to revise artifacts

⸻

8.2 AI Coding Agent

AI Coding 工具或 agent，例如 Claude Code、Codex、Cursor、Cline。
AI coding tools or agents such as Claude Code, Codex, Cursor, and Cline.

通过 CLI prompt 或 MCP tools 使用 OCN。
Uses OCN through CLI prompt or MCP tools.

可以：
Can:

读取当前状态
Read current state
生成 brief
Generate brief
生成下一步 prompt
Generate next prompt
创建 artifact
Create artifact
记录普通 log
Capture regular log
执行 gate 查询
Run gate query
读取 required sections
Read required sections
输出 artifact self-check
Output artifact self-check

不可以：
Cannot:

自动推进项目状态
Automatically advance project state
自动修改 SOP profile
Automatically modify SOP profile
自动执行高风险状态跳转
Automatically perform high-risk state transition
把未通过 Step Artifact Gate 的 artifact 标记为 complete
Mark artifact that failed Step Artifact Gate as complete
直接写入正式 decision log
Directly write formal decision log

⸻

8.3 Contributor

参与项目的人。
Project contributor.

可以：
Can:

阅读 artifact
Read artifacts
补充 dev log
Add dev log
补充 decision log
Add decision log
执行 check / gate
Run check / gate
查看 status
View status
根据 Gate Checklist 修正文档
Revise artifacts according to Gate Checklist

是否可以 advance 项目状态，由项目团队规则决定。
Whether a contributor can advance project state is decided by team rules.

v1.0 不做用户权限系统。
v1.0 does not implement user permission system.

⸻

8.4 Coach

AI Coding 教练或培训者。
AI Coding Coach or trainer.

需要：
Needs to:

检查学员项目处于哪个状态
Check learner project state
查看缺失 artifact
View missing artifacts
查看 gate 为什么失败
See why gate failed
查看学员是否绕过流程
Check whether learner bypassed workflow
查看 brief 和 audit
View brief and audit
查看 Step Artifact Gate 是否通过
Check whether Step Artifact Gate passed
判断学员文档是否只是“写了”，还是“合格”
Judge whether artifact merely exists or is qualified

v1.0 不做 coach dashboard。
v1.0 does not include coach dashboard.

Coach 通过项目目录、CLI 输出和 artifact 查看项目。
Coach reviews project through project directory, CLI output, and artifacts.

⸻

9. 核心使用场景｜Core Scenarios

9.1 Solo Builder 初始化新项目｜Solo Builder Initializes a New Project

用户准备开发一个新项目。
User is preparing to develop a new project.

执行：
Run:

ocn init --tier minimal

系统创建 .ocoding/、docs/、状态机、SOP Profile 和最小 artifact 集。
System creates .ocoding/, docs/, state machine, SOP Profile, and minimal artifact set.

用户执行 ocn status，看到当前处于 DISCOVERY，下一步需要完成 Project Brief 和 Scope。
User runs ocn status, sees current state is DISCOVERY, and next actions are Project Brief and Scope.

成功结果：
Successful outcome:

用户知道当前状态
User knows current state
用户知道下一步
User knows next step
项目从一开始就有 SOP 约束
Project has SOP constraints from day one

⸻

9.2 用户隔天回来恢复上下文｜User Restores Context the Next Day

用户隔天重新打开项目。
User reopens the project the next day.

他忘记上次做到了哪里。
They forgot where they left off.

执行：
Run:

ocn status
ocn brief

系统输出：
System outputs:

当前状态
Current state
当前 step
Current step
已完成 artifact
Completed artifacts
缺失 artifact
Missing artifacts
最近决策
Recent decisions
下一步建议
Next actions
AI Governance Rules
AI Governance Rules

成功结果：
Successful outcome:

用户不用翻聊天记录
User does not need to search chat history
AI 不需要用户重新自然语言解释项目
AI does not need user to explain project again

⸻

9.3 用户想跳过 PRD 直接写代码｜User Wants to Skip PRD and Write Code

用户想直接让 Claude Code 实现功能。
User wants Claude Code to implement features directly.

系统通过 ocn status 或 ocn gate 发现：
System detects through ocn status or ocn gate:

docs/02-prd.md 缺失
docs/02-prd.md missing
docs/03-acceptance-criteria.md 缺失
docs/03-acceptance-criteria.md missing

系统阻止进入 DESIGN 或 BUILD。
System blocks transition to DESIGN or BUILD.

成功结果：
Successful outcome:

OCN 防止用户过早写代码
OCN prevents premature coding

⸻

9.4 PRD 文件存在但结构不完整｜PRD Exists but Structure Is Incomplete

用户已经生成：
User has generated:

docs/02-prd.md

但 PRD 缺少 Scenarios｜使用场景 章节。
But PRD is missing the Scenarios｜使用场景 section.

执行：
Run:

ocn check

系统输出：
System outputs:

Step Artifact Gate: step_prd
Blocked:
✗ Scenarios｜使用场景 section is missing
Result:
Cannot advance from SPEC to DESIGN.

成功结果：
Successful outcome:

OCN 防止“文件存在但内容不合格”的假完成
OCN prevents fake completion where file exists but content is not qualified

⸻

9.5 AI agent 生成 artifact 前收到 Gate Checklist｜AI Agent Receives Gate Checklist Before Generating Artifact

用户执行：
User runs:

ocn prompt next

当前 step 为 step_prd。
Current step is step_prd.

系统生成 prompt，明确要求 AI 输出 PRD 时必须包含：
System generates a prompt requiring AI-generated PRD to include:

Problem｜问题
Goals｜目标
Non-goals｜非目标
Users｜用户
Scenarios｜使用场景
Requirements｜需求
Risks｜风险
Business Rules｜业务规则
Permission Rules｜权限规则
Exception Scenarios｜异常场景
Non-functional Requirements｜非功能需求

并要求 AI 输出自检：
And requires AI to output self-check:

Step Artifact Gate Self-check｜步骤产物门禁自检

成功结果：
Successful outcome:

AI 不是自由发挥写文档，而是按当前 Step Contract 输出 artifact
AI does not freely improvise artifacts, but outputs according to current Step Contract

⸻

9.6 mini CRM 作为第二个 dogfood 项目｜mini CRM as Second Dogfood Project

第二个 dogfood 项目锁定为：
The second dogfood project is locked as:

mini CRM｜客户偏好管理系统 mini 版

目标：
Goal:

验证 OCN 是否适用于非工具型业务项目
Verify whether OCN applies to non-tool business projects

边界：
Boundary:

不做人脸识别
No face recognition
不接摄像头
No camera integration
不处理真实敏感个人信息
No real sensitive personal data
使用模拟客户数据
Use simulated customer data

最小业务闭环：
Minimal business loop:

客户档案
Customer profile
客户偏好
Customer preferences
到店记录
Visit records
服务提醒
Service reminders
员工查看客户偏好
Staff views customer preferences

执行：
Run:

ocn init --tier production

系统按 production tier 创建 artifact 和 gate。
System creates artifacts and gates according to production tier.

项目从 DISCOVERY 跑到 VERIFY。
Project runs from DISCOVERY to VERIFY.

成功结果：
Successful outcome:

OCN 证明自己不只适合开发工具项目
OCN proves it is not only suitable for tool projects

⸻

9.7 AI agent 通过 MCP 查询但不能推进状态｜AI Agent Queries via MCP but Cannot Advance State

AI agent 调用：
AI agent calls:

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact

但 v1.0 不提供：
But v1.0 does not provide:

navigator.advance_phase
navigator.capture_decision

成功结果：
Successful outcome:

AI 可以协助推进工作
AI can assist work progress
但不能替用户推进项目状态或记录正式决策
But cannot advance project state or record formal decisions for the user

⸻

10. 核心用户故事｜Core User Stories

10.1 初始化项目｜Initialize Project

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn init --tier minimal

系统能够创建 .ocoding/ 和 docs/ 基础结构，写入状态机和 SOP Profile，使项目从第一天就被 OCN 管理。
So that the system creates .ocoding/ and docs/, writes state machine and SOP Profile, and manages the project from day one.

⸻

10.2 查看当前状态｜View Current State

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn status

系统能够告诉我：
So that the system tells me:

当前 state
Current state
当前 step
Current step
当前 tier
Current tier
已完成 artifact
Completed artifacts
缺失 artifact
Missing artifacts
阻塞原因
Blocking reasons
下一步建议
Next actions

让我不再问“现在该干什么”。
So that I no longer need to ask “What should I do now?”

⸻

10.3 生成 AI 会话 brief｜Generate AI Session Brief

作为 Project Owner 或 AI Coding Agent，
As a Project Owner or AI Coding Agent,

我希望执行：
I want to run:

ocn brief

或调用：
Or call:

navigator.brief

系统能够生成当前项目的高密度上下文，让 AI 在长会话或跨会话中快速恢复工作状态。
So that the system generates high-density context and AI can quickly recover working state across long or separate sessions.

⸻

10.4 创建 artifact｜Create Artifact

作为 Project Owner 或 AI Coding Agent，
As a Project Owner or AI Coding Agent,

我希望执行：
I want to run:

ocn doc create prd

或调用：
Or call:

navigator.create_artifact

系统能够根据 SOP Profile 创建当前阶段需要的 Markdown artifact 模板。
So that the system creates Markdown artifact templates required by the current stage according to the SOP Profile.

⸻

10.5 生成 artifact 前获取当前 Step Contract｜Get Current Step Contract Before Generating Artifact

作为 AI Coding Agent，
As an AI Coding Agent,

我希望在生成 artifact 前获得当前 step 的：
I want to receive the current step’s:

required_sections
required_fields
blocking_criteria
warning_criteria
quality_checklist

这样我能按当前 SOP Step Gate 生成文档，而不是只根据自然语言自由发挥。
So that I can generate artifacts according to the current SOP Step Gate instead of freely improvising from natural language.

⸻

10.6 执行 artifact gate 检查｜Run Artifact Gate Check

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn check

系统不仅检查 artifact 是否存在，还能检查 artifact 是否满足当前 step 的必备结构。
So that the system checks not only whether an artifact exists, but whether it satisfies the required structure of the current step.

⸻

10.7 执行 gate 检查｜Run Gate Check

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn gate

系统能够检查当前状态是否满足退出条件，并告诉我是否可以进入下一状态。
So that the system checks whether the current state satisfies exit conditions and tells me whether I can advance.

⸻

10.8 状态推进｜Advance State

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn advance

系统在 gate 通过后推进到下一状态；如果 gate 失败，则明确说明阻塞原因并自动写入 audit。
So that the system advances to the next state after gate passes, and clearly explains blocking reasons and writes audit automatically if gate fails.

⸻

10.9 记录开发日志｜Record Dev Log

作为 Project Owner 或 AI Coding Agent，
As a Project Owner or AI Coding Agent,

我希望执行：
I want to run:

ocn log

系统引导我记录本次修改的原因、内容、影响范围、测试结果和风险。
So that the system guides me to record the reason, content, impact, test result, and risk of the current change.

⸻

10.10 记录决策日志｜Record Decision Log

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn log --type decision

系统把关键决策写入 docs/19-decision-log.md，避免后续忘记为什么这样设计。
So that the system writes key decisions into docs/19-decision-log.md and prevents future loss of decision context.

说明：
Note:

v1.0 使用 ocn log --type decision，是为了减少命令面，统一 capture 类操作。
v1.0 uses ocn log --type decision to reduce command surface and unify capture operations.
ocn decision 作为 v1.1 快捷别名候选。
ocn decision is a v1.1 candidate shortcut alias.

⸻

10.11 创建 baseline｜Create Baseline

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn baseline create

系统记录当前稳定版本、状态、step、commit、可用功能、已知问题和回滚方式。
So that the system records current stable version, state, step, commit, available features, known issues, and rollback method.

⸻

10.12 检测 SOP 版本｜Detect SOP Version

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn sop version

系统告诉我当前项目锁定的 SOP Profile 版本，以及当前 OCN 内置版本是否存在差异。
So that the system tells me the locked SOP Profile version of the project and whether it differs from the current bundled version.

⸻

10.13 查看 SOP diff｜View SOP Diff

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn sop diff

系统展示项目 SOP 和当前内置 SOP 的差异，但不主动修改项目。
So that the system shows differences between project SOP and current bundled SOP without modifying project files.

⸻

10.14 生成 SOP upgrade plan｜Generate SOP Upgrade Plan

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn sop upgrade --plan

系统生成升级计划，说明新增步骤、变更 gate、breaking changes 和建议操作，但不直接改文件。
So that the system generates an upgrade plan explaining new steps, changed gates, breaking changes, and recommended actions without modifying files.

⸻

10.15 记录测试结果｜Record Test Result

作为 Project Owner 或 AI Coding Agent，
As a Project Owner or AI Coding Agent,

我希望执行：
I want to run:

ocn test record --from vitest <path>

系统读取 vitest json 测试结果并记录，供后续 ocn check --include-tests 使用。
So that the system reads vitest JSON test results and records them for later ocn check --include-tests.

⸻

10.16 项目健康检查｜Project Health Check

作为 Project Owner，
As a Project Owner,

我希望执行：
I want to run:

ocn doctor

系统检查 state.json、sop.yaml、gates.yaml、当前 state / step、artifact 可读性和 SOP 版本兼容性。
So that the system checks state.json, sop.yaml, gates.yaml, current state / step, artifact readability, and SOP version compatibility.

⸻

10.17 重置 OCN 状态｜Reset OCN State

作为 Project Owner，
As a Project Owner,

我希望在初始化错误或状态损坏时执行：
I want to run this when initialization is wrong or state is corrupted:

ocn reset --keep-docs

系统重建 .ocoding/，但保留已有 docs/。
So that the system rebuilds .ocoding/ while keeping existing docs/.

⸻

10.18 通过 MCP 使用 OCN｜Use OCN through MCP

作为 AI Coding Agent，
As an AI Coding Agent,

我希望调用：
I want to call:

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

获得 OCN 的状态、brief、gate、artifact 和 prompt 能力。
So that I can access OCN state, brief, gate, artifact, and prompt capabilities.

⸻

11. 功能需求｜Functional Requirements

⸻

11.1 Project Initialization｜项目初始化

功能说明｜Description

OCN 必须支持项目初始化。
OCN must support project initialization.

命令：
Commands:

ocn init
ocn init --tier minimal
ocn init --tier production
ocn init --tier full

默认：
Default:

ocn init --tier minimal

必须创建｜Must Create

.ocoding/
docs/
.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
.ocoding/config.yaml

必须写入｜Must Write

OCN version
SOP Profile ID
SOP Profile Version
Tier
currentStateId
currentStepId
state machine
step registry
artifact registry
gate registry
step artifact gate rules
language strategy
template strategy

版本阶段｜Release Phase

alpha：

支持 minimal tier
Support minimal tier

beta：

支持 production tier
Support production tier

GA：

支持 full tier
Support full tier

⸻

11.2 Status｜状态查看

功能说明｜Description

OCN 必须支持查看当前状态。
OCN must support viewing current state.

命令：
Command:

ocn status

输出必须包含｜Output Must Include

project name
tier
currentStateId
currentStepId
current state purpose
completed artifacts
missing artifacts
current artifact gate status
blocked reason
next actions
SOP Profile version
OCN version

规则｜Rules

ocn status 默认不写 audit。
ocn status does not write audit by default.

原因：
Reason:

避免 audit 被频繁查看状态的操作刷屏。
Avoid audit noise from frequent status checks.

⸻

11.3 Brief｜会话简报

功能说明｜Description

OCN 必须生成 AI 会话 brief。
OCN must generate AI session brief.

命令：
Command:

ocn brief

MCP tool：

navigator.brief

输出必须包含｜Output Must Include

当前项目目标
Current project goal
当前状态
Current state
当前 step id
Current step id
当前 tier
Current tier
当前阻塞
Current blockers
已完成 artifact
Completed artifacts
缺失 artifact
Missing artifacts
当前 Step Artifact Gate 状态
Current Step Artifact Gate status
最近关键决策
Recent key decisions
下一步行动
Next actions
AI 本轮应该做什么
What AI should do this session
AI 本轮不应该做什么
What AI should not do this session
AI Governance Rules
AI Governance Rules

规则｜Rules

每次 brief 都必须注入 AI Governance Rules。
Every brief must inject AI Governance Rules.

⸻

11.4 Prompt Next｜下一步 Prompt

功能说明｜Description

OCN 必须生成下一步 AI Coding prompt。
OCN must generate the next AI coding prompt.

命令：
Command:

ocn prompt next

MCP tool：

navigator.generate_next_prompt

输出应基于｜Output Should Be Based On

当前状态
Current state
当前 step
Current step
缺失 artifact
Missing artifacts
gate 阻塞
Gate blockers
AI governance rules
AI governance rules
当前 tier
Current tier
required_sections
required_sections
blocking_criteria
blocking_criteria
warning_criteria
warning_criteria
quality_checklist
quality_checklist

Prompt 注入规则｜Prompt Injection Rule

当当前 step 是 step_prd 时，prompt 必须包含：
When current step is step_prd, the prompt must include:

你正在输出 docs/02-prd.md。
You are producing docs/02-prd.md.
该文档必须包含以下章节：
The document must include the following sections:
Problem｜问题
Goals｜目标
Non-goals｜非目标
Users｜用户
Scenarios｜使用场景
Requirements｜需求
Risks｜风险
Business Rules｜业务规则
Permission Rules｜权限规则
Exception Scenarios｜异常场景
Non-functional Requirements｜非功能需求
输出完成后，请附上 Step Artifact Gate Self-check。
After output, include Step Artifact Gate Self-check.
不要把缺少 Scenarios｜使用场景 的 PRD 标记为完成。
Do not mark a PRD missing Scenarios｜使用场景 as complete.

⸻

11.5 Artifact Creation｜产物创建

功能说明｜Description

OCN 必须支持创建 artifact 模板。
OCN must support creating artifact templates.

命令：
Command:

ocn doc create <type>

MCP tool：

navigator.create_artifact

v1.0 必须支持｜v1.0 Must Support

project-brief
scope
prd
acceptance-criteria
information-architecture
data-model
api-contract
test-strategy
dev-log
baseline

v1.0 不支持｜v1.0 Does Not Support

ocn doc create spec

原因：
Reason:

Spec Profile 不是独立文档。
Spec Profile is not an independent document.

模板要求｜Template Requirements

每个 artifact 模板必须包含：
Each artifact template must include:

required sections
recommended sections
self-check block
OCN metadata
bilingual headings
bilingual guidance

⸻

11.6 Template Customization｜模板自定义

功能说明｜Description

OCN v1.0 必须支持轻量模板覆盖，但不支持自定义 SOP Profile。
OCN v1.0 must support lightweight template overrides, but not custom SOP Profiles.

v1.0 支持｜v1.0 Supports

用户可在 .ocoding/templates/ 下覆盖内置 artifact 模板
Users can override built-in artifact templates under .ocoding/templates/
自定义模板必须保留 OCN 内置 required_sections
Custom templates must retain OCN built-in required_sections
自定义模板可以增加 sections
Custom templates may add sections
自定义模板不可以删除 required_sections
Custom templates may not remove required_sections
ocn doctor 检查模板兼容性
ocn doctor checks template compatibility

v1.0 不支持｜v1.0 Does Not Support

用户自定义 SOP profile
User-defined SOP profile
用户自定义 Step Artifact Gate
User-defined Step Artifact Gate
用户自定义 Gate Rule
User-defined Gate Rule

规则｜Rules

模板自定义不能破坏 Step Artifact Gate。
Template customization must not break Step Artifact Gate.
模板自定义不能让 required_sections 消失。
Template customization must not remove required_sections.
模板自定义不能改变 stable step_id。
Template customization must not change stable step_id.

⸻

11.7 Artifact Check｜产物检查

功能说明｜Description

OCN 必须检查 artifact 是否满足当前状态要求。
OCN must check whether artifacts satisfy current state requirements.

命令：
Command:

ocn check

检查内容｜Checks

artifact 是否存在
Whether artifact exists
artifact 是否为空
Whether artifact is empty
required sections 是否存在
Whether required sections exist
required fields 是否存在
Whether required fields exist
blocking criteria 是否通过
Whether blocking criteria pass
warning criteria 是否触发
Whether warning criteria are triggered
state id 是否合法
Whether state id is valid
step id 是否合法
Whether step id is valid
sop version 是否存在
Whether sop version exists
YAML / JSON 是否合法
Whether YAML / JSON is valid

输出｜Output

passed items
warnings
blocked items
next actions
error code
bilingual human-readable message

⸻

11.8 Step Artifact Gate｜步骤产物门禁

功能说明｜Description

OCN 必须为每一个 SOP Step 提供 Step Artifact Gate。
OCN must provide Step Artifact Gate for every SOP Step.

Step Artifact Gate 用于检查当前 step 产出的 artifact 是否真正满足该 step 的结构要求，而不仅仅是检查文件是否存在。
Step Artifact Gate checks whether the artifact produced by the current step truly satisfies the step’s structural requirements, not merely whether the file exists.

它解决的问题是：
It solves:

文档已经生成，但内容不符合 SOP
Document is generated but does not satisfy SOP
文档章节缺失
Required sections are missing
文档只覆盖范围，没有覆盖使用场景
Document covers scope but not scenarios
文档写了功能，但没有写风险
Document includes functions but not risks
文档写了权限，但没有写异常场景
Document includes permissions but not exception scenarios
文档看似完整，但无法支撑下一步 AC / Data Model / API Contract
Document looks complete but cannot support AC / Data Model / API Contract

⸻

核心原则｜Core Principles

OCN 不允许把“artifact 文件存在”直接等同于“step 完成”。
OCN must not equate “artifact file exists” with “step completed”.

正确判断必须是：
Correct judgment must be:

artifact exists
artifact is not empty
required sections exist
required fields exist
blocking sections are complete
quality checks pass or produce warnings

⸻

数据来源｜Data Source

Step Artifact Gate 的规则来自 SOP Profile。
Step Artifact Gate rules come from SOP Profile.

每个 step 必须在 SOP Profile 中定义：
Each step must define:

step_id:
state_id:
artifact_required:
required_sections:
required_fields:
quality_checks:
blocking_criteria:
warning_criteria:

⸻

required_sections 检测算法｜required_sections Detection Algorithm

v1.0 必须使用：

Markdown AST + alias table
Markdown AST + alias table

规则：
Rules:

1. 使用 Markdown AST 解析 heading
   Parse headings using Markdown AST
2. 匹配 canonical 或 aliases
   Match canonical or aliases
3. 允许 heading level 在 min_heading_level 与 max_heading_level 之间
   Allow heading level between min_heading_level and max_heading_level
4. alias 表由 SOP Profile 提供，不写死在代码里
   Alias table is provided by SOP Profile, not hard-coded in code
5. 机器字段使用英文 stable key
   Machine fields use English stable keys
6. 人类可读标题使用中英文双语
   Human-readable headings are bilingual

示例：
Example:

required_sections:
  - id: scenarios
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

示例：step_prd｜Example: step_prd

step_prd 的 gate 规则必须包含：
Gate rules for step_prd must include:

step_id: step_prd
artifact_required: docs/02-prd.md
required_sections:
  - id: problem
    canonical: "Problem｜问题"
    aliases: ["Problem", "问题", "Problem Statement", "问题定义"]
    min_heading_level: 2
    max_heading_level: 3
  - id: goals
    canonical: "Goals｜目标"
    aliases: ["Goals", "目标", "Objectives", "产品目标"]
    min_heading_level: 2
    max_heading_level: 3
  - id: non_goals
    canonical: "Non-goals｜非目标"
    aliases: ["Non-goals", "非目标", "Out of Scope", "不做什么"]
    min_heading_level: 2
    max_heading_level: 3
  - id: users
    canonical: "Users｜用户"
    aliases: ["Users", "用户", "Target Users", "目标用户"]
    min_heading_level: 2
    max_heading_level: 3
  - id: scenarios
    canonical: "Scenarios｜使用场景"
    aliases: ["Scenarios", "使用场景", "Use Cases", "User Scenarios", "用户场景"]
    min_heading_level: 2
    max_heading_level: 3
  - id: requirements
    canonical: "Requirements｜需求"
    aliases: ["Requirements", "需求", "Functional Requirements", "功能需求"]
    min_heading_level: 2
    max_heading_level: 3
  - id: risks
    canonical: "Risks｜风险"
    aliases: ["Risks", "风险", "Constraints", "风险与约束"]
    min_heading_level: 2
    max_heading_level: 3
  - id: business_rules
    canonical: "Business Rules｜业务规则"
    aliases: ["Business Rules", "业务规则"]
    min_heading_level: 2
    max_heading_level: 3
  - id: permission_rules
    canonical: "Permission Rules｜权限规则"
    aliases: ["Permission Rules", "权限规则"]
    min_heading_level: 2
    max_heading_level: 3
  - id: exception_scenarios
    canonical: "Exception Scenarios｜异常场景"
    aliases: ["Exception Scenarios", "异常场景", "Error Scenarios", "异常路径"]
    min_heading_level: 2
    max_heading_level: 3
  - id: non_functional_requirements
    canonical: "Non-functional Requirements｜非功能需求"
    aliases: ["Non-functional Requirements", "非功能需求", "NFR"]
    min_heading_level: 2
    max_heading_level: 3
blocking_criteria:
  - Problem｜问题 is missing
  - Goals｜目标 are missing
  - Non-goals｜非目标 are missing
  - Users｜用户 are missing
  - Scenarios｜使用场景 are missing
  - Requirements｜需求 are missing
warning_criteria:
  - Risks｜风险 are too shallow
  - Exception Scenarios｜异常场景 are incomplete
  - Non-functional Requirements｜非功能需求 are incomplete

⸻

Quality Heuristic 的诚实边界｜Honest Boundary of Quality Heuristic

v1.0 的 quality warning 是粗粒度启发式判断。
v1.0 quality warnings are coarse heuristics.

OCN v1.0 不判断真正的内容深度、逻辑质量、商业合理性。
OCN v1.0 does not judge true content depth, logical quality, or business validity.

v1.0 可以使用：
v1.0 may use:

section 字符数阈值
section character count threshold
bullet 数量阈值
bullet count threshold
是否缺少示例
whether examples are missing
是否缺少引用到相关 artifact
whether references to related artifacts are missing
required subsection 是否缺失
whether required subsections are missing

示例：
Example:

quality_checks:
  - id: risks_min_length
    section: risks
    type: min_chars
    value: 200
    severity: warning
  - id: exception_scenarios_min_items
    section: exception_scenarios
    type: min_bullets
    value: 5
    severity: warning

真正的“内容质量判断”留给人工 review。
True content quality judgment is left to human review.

v1.1 可基于 Artifact Quality Checklist 引入 LLM Judge。
v1.1 may introduce LLM Judge based on Artifact Quality Checklist.

⸻

Gate 结果示例｜Gate Result Example

执行：
Run:

ocn check

或：
Or:

ocn gate

系统应输出：
System should output:

Step Artifact Gate: step_prd
Passed:
✓ Problem｜问题
✓ Goals｜目标
✓ Non-goals｜非目标
✓ Users｜用户
✓ Requirements｜需求
✓ Business Rules｜业务规则
✓ Permission Rules｜权限规则
Warnings:
△ Risks｜风险 are present but not detailed enough
△ Exception Scenarios｜异常场景 are incomplete
△ Non-functional Requirements｜非功能需求 should include stable error codes and atomic writes
Blocked:
✗ Scenarios｜使用场景 section is missing
Result:
Cannot advance from SPEC to DESIGN.
Next action:
Update docs/02-prd.md and add Scenarios｜使用场景.

⸻

Gate 分级｜Gate Levels

Step Artifact Gate 应支持三类结果：
Step Artifact Gate must support three result states:

pass
warning
blocked

pass

当前 artifact 满足 step 要求，可以进入下一步。
Current artifact satisfies step requirements and can advance.

warning

当前 artifact 可进入下一步，但存在后续风险。
Current artifact may advance but contains future risks.

blocked

当前 artifact 缺少阻塞性字段，不允许进入下一步。
Current artifact misses blocking fields and cannot advance.

⸻

CLI 行为｜CLI Behavior

ocn check 必须执行当前 step 的 artifact gate。
ocn check must run current step artifact gate.

ocn check

默认检查：
Default checks:

当前 step artifact 是否存在
Whether current step artifact exists
当前 step artifact 是否为空
Whether current step artifact is empty
当前 step required sections 是否存在
Whether required sections exist
当前 step blocking criteria 是否通过
Whether blocking criteria pass

ocn gate 必须聚合当前 state 下所有 step artifact gate 结果。
ocn gate must aggregate all step artifact gate results under current state.

如果任一 blocking criteria 失败，则不能 advance。
If any blocking criteria fails, advance is not allowed.

⸻

MCP 行为｜MCP Behavior

MCP tool：

navigator.run_gate

必须返回结构化结果：
Must return structured result:

{
  "stepId": "step_prd",
  "artifact": "docs/02-prd.md",
  "status": "blocked",
  "passed": [
    "Problem｜问题",
    "Goals｜目标",
    "Non-goals｜非目标",
    "Users｜用户",
    "Requirements｜需求"
  ],
  "warnings": [
    "Risks｜风险 are present but shallow"
  ],
  "blocked": [
    "Scenarios｜使用场景 section is missing"
  ],
  "nextActions": [
    "Add Scenarios｜使用场景 to docs/02-prd.md"
  ]
}

⸻

Prompt Next 行为｜Prompt Next Behavior

ocn prompt next 必须把当前 step 的 required sections 注入 prompt。
ocn prompt next must inject required sections of current step into prompt.

任何由 OCN 或 AI agent 生成的 artifact，都必须在输出末尾附加自检结果。
Any artifact generated by OCN or AI agent must include self-check at the end.

格式：
Format:

Step Artifact Gate Self-check｜步骤产物门禁自检:
✓ Problem｜问题
✓ Goals｜目标
✓ Non-goals｜非目标
✓ Users｜用户
✗ Scenarios｜使用场景
✓ Requirements｜需求
△ Risks｜风险

如果存在 blocking item，文档状态应标记为：
If blocking item exists, artifact status should be:

draft_blocked

而不是：
Instead of:

complete

⸻

状态字段｜State Field

.ocoding/state.json 应记录当前 artifact gate 状态：
.ocoding/state.json should record current artifact gate status:

{
  "currentStateId": "state_spec",
  "currentStepId": "step_prd",
  "artifactGateStatus": {
    "step_prd": {
      "artifact": "docs/02-prd.md",
      "status": "blocked",
      "missingRequiredSections": ["scenarios"],
      "warnings": ["risks are shallow"],
      "checkedAt": "2026-04-27T23:00:00+08:00"
    }
  }
}

⸻

v1.0-alpha / beta / GA 分期｜Release Phasing

alpha

必须支持当前 step 的 required sections 检查。
Must support required section check for current step.

至少覆盖：
At least cover:

step_project_brief
step_scope
step_prd
step_acceptance_criteria

beta

扩展到：
Extend to:

step_information_architecture
step_data_model
step_api_contract
step_test_strategy

GA

覆盖 v1.0 所有 tier 相关 artifact。
Cover all v1.0 tier-related artifacts.

⸻

验收标准｜Acceptance Criteria

Step Artifact Gate 在 v1.0 必须满足：
Step Artifact Gate in v1.0 must satisfy:

1. OCN 能读取当前 step 的 required_sections。
   OCN can read required_sections of current step.
2. OCN 能检查 artifact 是否包含 required_sections。
   OCN can check whether artifact contains required_sections.
3. OCN 能区分 pass / warning / blocked。
   OCN can distinguish pass / warning / blocked.
4. blocking item 存在时，ocn gate 不允许 advance。
   When blocking item exists, ocn gate does not allow advance.
5. ocn prompt next 能注入 required_sections。
   ocn prompt next can inject required_sections.
6. navigator.run_gate 能返回结构化 gate 结果。
   navigator.run_gate can return structured gate result.
7. step_prd 缺少 Scenarios｜使用场景 时，OCN 必须 block，而不是允许进入 DESIGN。
   When step_prd lacks Scenarios｜使用场景, OCN must block instead of allowing DESIGN transition.

⸻

11.9 Artifact Quality Checklist｜产物质量清单

功能说明｜Description

OCN 必须为每类 artifact 提供质量检查清单。
OCN must provide quality checklist for each artifact type.

Step Artifact Gate 解决“有没有必备结构”。
Step Artifact Gate checks whether required structure exists.

Artifact Quality Checklist 解决“内容是否足够支撑下一步”。
Artifact Quality Checklist checks whether content is sufficient to support the next step.

⸻

示例：PRD Quality Checklist｜Example: PRD Quality Checklist

PRD 的质量检查至少包含：
PRD quality checklist must include:

Problem 是否具体
Whether Problem is specific
Goals 是否可判断完成
Whether Goals are verifiable
Non-goals 是否能限制范围
Whether Non-goals can limit scope
Users 是否明确
Whether Users are clear
Scenarios 是否包含真实操作路径
Whether Scenarios contain real operation paths
Requirements 是否可转成 AC
Whether Requirements can be converted into AC
Risks 是否覆盖产品、工程、使用、治理风险
Whether Risks cover product, engineering, usage, and governance risks
Business Rules 是否足以约束行为
Whether Business Rules constrain behavior
Permission Rules 是否说明 CLI / MCP 边界
Whether Permission Rules explain CLI / MCP boundaries
Exception Scenarios 是否覆盖异常输入、非法状态、损坏文件、版本不兼容
Whether Exception Scenarios cover invalid input, illegal state, corrupted files, and version incompatibility
Non-functional Requirements 是否覆盖本地优先、Git 友好、AI 可读、可测试、可恢复、MCP 可调用、稳定错误码、原子写入
Whether Non-functional Requirements cover local-first, Git-friendly, AI-readable, testable, recoverable, MCP-callable, stable error code, and atomic write

⸻

Gate 类型｜Gate Type

Artifact Quality Checklist 初期不全部作为 Hard Gate。
Artifact Quality Checklist is not entirely Hard Gate in v1.0.

它可以分为：
It may be classified as:

required
recommended
optional

例如：
For example:

Scenarios｜使用场景 = required
Risks depth｜风险深度 = recommended
更多异常场景｜More exception scenarios = recommended

⸻

与 LLM Judge 的关系｜Relationship with LLM Judge

v1.0 不做完整 LLM Judge。
v1.0 does not implement full LLM Judge.

Artifact Quality Checklist 在 v1.0 是：
In v1.0, Artifact Quality Checklist is:

确定性结构检查 + 人工可读 checklist
Deterministic structural check + human-readable checklist

v1.1 可以升级为：
v1.1 may upgrade to:

可选 LLM Judge 根据 checklist 打分
Optional LLM Judge scoring based on checklist

⸻

11.10 Test Result Record｜测试结果记录

功能说明｜Description

OCN 必须提供测试结果记录入口。
OCN must provide a test result recording entry.

命令：
Command:

ocn test record --from vitest <path>

说明｜Explanation

OCN 不负责执行测试。
OCN does not run tests.

OCN 读取测试框架输出并记录结果。
OCN reads test framework output and records the result.

v1.0 支持｜v1.0 Supports

vitest json

⸻

11.11 Check With Tests｜带测试检查

功能说明｜Description

OCN 必须支持把已记录测试结果纳入检查。
OCN must support including recorded test results in check.

命令：
Command:

ocn check --include-tests

规则｜Rules

如果没有记录测试结果，必须输出 warning 或 gate failed，具体行为由 Gate 规则定义。
If no test result is recorded, output warning or gate failed based on Gate rules.

⸻

11.12 Gate｜门禁

功能说明｜Description

OCN 必须执行当前状态的 gate 检查。
OCN must execute gate check for current state.

命令：
Command:

ocn gate

MCP tool：

navigator.run_gate

Gate 类型｜Gate Types

Hard Gate
Process Gate
Soft Gate 预留
Step Artifact Gate
Artifact Quality Checklist

规则｜Rules

ocn gate 必须自动写 audit。
ocn gate must automatically write audit.

⸻

11.13 Advance｜状态推进

功能说明｜Description

OCN 必须支持状态推进。
OCN must support state transition.

命令：
Command:

ocn advance

规则｜Rules

只能由 CLI 执行
Can only be executed through CLI
MCP v1.0 不暴露 advance_phase
MCP v1.0 does not expose advance_phase
必须先执行 gate
Must run gate first
gate 失败不得推进
Cannot advance if gate fails
当前 state 下任何 blocking Step Artifact Gate 失败，不得推进
Cannot advance if any blocking Step Artifact Gate under current state fails
成功或失败都写 audit
Write audit whether success or failure

⸻

11.14 Dev Log｜开发日志

功能说明｜Description

OCN 必须支持开发日志。
OCN must support dev log.

命令：
Commands:

ocn log
ocn log --type dev

MCP tool：

navigator.capture_log

写入｜Write To

docs/18-dev-log.md

内容｜Content

为什么改
Why changed
改了什么
What changed
改了哪些文件
Which files changed
是否符合 PRD / AC
Whether it conforms to PRD / AC
是否影响 Scope
Whether it affects Scope
是否跑了测试
Whether tests were run
有没有失败
Whether there were failures
留下什么风险
What risks remain
下一步是什么
What is next

⸻

11.15 Decision Log｜决策日志

功能说明｜Description

OCN 必须支持决策日志。
OCN must support decision log.

命令：
Command:

ocn log --type decision

写入｜Write To

docs/19-decision-log.md

v1.0 不提供｜v1.0 Does Not Provide

ocn decision

ocn decision 是 v1.1 候选别名。
ocn decision is a v1.1 candidate alias.

分阶段支持｜Phase Support

alpha：不要求 decision log 命令，但允许手动写 docs/19-decision-log.md
alpha: decision log command is not required, but manual docs/19-decision-log.md is allowed
beta：支持 ocn log --type decision
beta: support ocn log --type decision
GA：decision log 纳入 brief / audit / gate context
GA: decision log is included in brief / audit / gate context

⸻

11.16 Audit Trail｜审计链

功能说明｜Description

OCN 必须支持 audit 自动写入。
OCN must support automatic audit writing.

写入：
Write to:

docs/21-audit-trail.md

自动触发｜Auto Triggers

状态转移
State transition
状态转移失败
State transition failure
gate 执行
Gate execution
gate 失败
Gate failure
gate override
Gate override
Step Artifact Gate blocked
Step Artifact Gate blocked
SOP version 检测
SOP version detection
SOP version 差异
SOP version difference
baseline 创建
Baseline creation
高风险 process gate 被阻止
High-risk process gate blocked
reset 操作
Reset operation

⸻

11.17 Baseline｜基线

功能说明｜Description

OCN 必须支持 baseline 创建。
OCN must support baseline creation.

命令：
Command:

ocn baseline create

输出｜Output

docs/15-baseline.md
.ocoding/baselines/*.json

必须记录｜Must Record

版本号
Version
对应 commit
Related commit
当前状态
Current state
当前 step
Current step
当前可用功能
Currently available features
当前不可用功能
Currently unavailable features
启动方式
Start command
测试方式
Test method
验收结果
Acceptance result
已知问题
Known issues
回滚方式
Rollback method
下一轮优化目标
Next optimization goal

规则｜Rules

创建 baseline 必须自动写 audit。
Creating baseline must automatically write audit.

⸻

11.18 SOP Version｜SOP 版本

功能说明｜Description

OCN 必须显示项目锁定 SOP 版本。
OCN must display locked SOP version of project.

命令：
Command:

ocn sop version

MCP tool：

navigator.detect_sop_version

⸻

11.19 SOP Diff｜SOP 差异

功能说明｜Description

OCN 必须显示项目 SOP 与当前内置 SOP 的差异。
OCN must show differences between project SOP and current bundled SOP.

命令：
Command:

ocn sop diff

规则｜Rules

只显示差异，不修改项目。
Only show differences, do not modify project.

⸻

11.20 SOP Upgrade Plan｜SOP 升级计划

功能说明｜Description

OCN 必须生成 SOP 升级计划。
OCN must generate SOP upgrade plan.

命令：
Command:

ocn sop upgrade --plan

输出内容｜Output

当前项目 SOP 版本
Current project SOP version
目标 SOP 版本
Target SOP version
新增 steps
Added steps
删除 steps
Deleted steps
变更 steps
Changed steps
新增 artifacts
Added artifacts
变更 gates
Changed gates
breaking changes
breaking changes
对当前项目状态的影响
Impact on current project state
推荐操作
Recommended actions
是否建议立即升级
Whether immediate upgrade is recommended

规则｜Rules

只生成 plan，不修改文件。
Only generate plan, do not modify files.

⸻

11.21 Doctor｜项目诊断

功能说明｜Description

OCN 必须支持项目健康检查。
OCN must support project health check.

命令：
Command:

ocn doctor

检查内容｜Checks

state.json 是否合法
Whether state.json is valid
sop.yaml 是否合法
Whether sop.yaml is valid
gates.yaml 是否合法
Whether gates.yaml is valid
当前 state id 是否存在
Whether current state id exists
当前 step id 是否存在
Whether current step id exists
artifact 是否可读
Whether artifacts are readable
SOP version 是否兼容
Whether SOP version is compatible
artifact gate status 是否可解析
Whether artifact gate status is parseable
template override 是否兼容 required_sections
Whether template override is compatible with required_sections

恢复能力｜Recovery

v1.0 至少支持从：
v1.0 must at least restore from:

.ocoding/state.json.bak

恢复。
Restore.

⸻

11.22 Reset｜重置

功能说明｜Description

OCN 必须支持 reset。
OCN must support reset.

命令：
Commands:

ocn reset --keep-docs
ocn reset --keep-state
ocn reset --hard

规则｜Rules

reset 必须有明确提示
reset must show clear warning
reset --hard 必须二次确认
reset --hard must require second confirmation
reset 必须写 audit
reset must write audit
reset 不得默认删除用户业务代码
reset must not delete user business code by default

⸻

11.23 Minimal MCP Server｜最小 MCP Server

功能说明｜Description

v1.0 必须交付 Minimal MCP Server。
v1.0 must deliver Minimal MCP Server.

工具列表｜Tool List

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

不提供｜Not Provided

navigator.advance_phase
navigator.capture_decision
recall
vector memory
LLM judge
multi-agent orchestration
scope drift deep diff

⸻

12. 业务规则｜Business Rules

12.1 状态推进规则｜State Transition Rule

状态推进只能通过 ocn advance 完成
State transition can only be completed through ocn advance
ocn advance 必须依赖 gate
ocn advance must depend on gate
gate 失败不能推进
Cannot advance if gate fails
advance 成功或失败都必须写 audit
Advance success or failure must write audit
MCP v1.0 不允许推进状态
MCP v1.0 does not allow state transition

⸻

12.2 Artifact 规则｜Artifact Rule

artifact 必须落在 docs/
Artifacts must live under docs/
artifact 必须可读、可审查、可版本化
Artifacts must be readable, reviewable, and versionable
artifact 不能只存在于 AI 对话中
Artifacts must not exist only inside AI conversation
Spec Profile 不生成独立 spec.md
Spec Profile does not generate independent spec.md

⸻

12.3 Artifact Completion Rule｜产物完成规则

Artifact 文件存在，不代表 step 完成。
Artifact file existence does not mean step completion.
只有通过 Step Artifact Gate，step 才能标记为完成。
Only after passing Step Artifact Gate can a step be marked complete.

⸻

12.4 Blocking Rule｜阻塞规则

如果当前 step 的 blocking criteria 未通过，ocn advance 必须失败。
If current step blocking criteria fail, ocn advance must fail.

⸻

12.5 Prompt Injection Rule｜Prompt 注入规则

ocn prompt next 必须注入当前 step 的 required_sections、blocking_criteria、warning_criteria 和 quality_checklist。
ocn prompt next must inject current step required_sections, blocking_criteria, warning_criteria, and quality_checklist.

⸻

12.6 Self-check Rule｜自检规则

AI 生成 artifact 后必须附带 Step Artifact Gate Self-check。
AI-generated artifact must include Step Artifact Gate Self-check.
如果存在 blocking item，artifact 状态应标记为 draft_blocked，而不是 complete。
If blocking item exists, artifact status should be draft_blocked, not complete.

⸻

12.7 Step ID 规则｜Step ID Rule

currentStateId 和 currentStepId 是 source of truth
currentStateId and currentStepId are source of truth
数字 order 只用于排序和展示
Numeric order is only for sorting and display
step_id 发布后不得随意改名
step_id must not be renamed after release
step_id 改名视为 breaking change
Renaming step_id is a breaking change

⸻

12.8 Tier 规则｜Tier Rule

tier 影响 artifact 集合和 gate 范围
tier affects artifact set and gate scope
tier 不改变状态机基本结构
tier does not change state machine structure
tier 不改变 stable step id
tier does not change stable step id
tier 不改变 audit push 规则
tier does not change audit push rules

⸻

12.9 Audit 规则｜Audit Rule

push event 必须自动写 audit
push event must automatically write audit
status 默认不写 audit
status does not write audit by default
reset 必须写 audit
reset must write audit
gate / advance 必须写 audit
gate / advance must write audit
Step Artifact Gate blocked 必须写 audit
Step Artifact Gate blocked must write audit

⸻

12.10 SOP Versioning 规则｜SOP Versioning Rule

项目 init 后锁定 SOP Profile 版本
Project locks SOP Profile version after init
OCN 升级不得自动修改项目 SOP
OCN upgrade must not automatically modify project SOP
sop diff 只显示差异
sop diff only shows difference
sop upgrade --plan 只生成计划
sop upgrade --plan only generates plan

⸻

12.11 MCP 安全规则｜MCP Safety Rule

MCP tools 可以查询、生成、记录
MCP tools can query, generate, and record
MCP v1.0 不允许推进状态
MCP v1.0 does not allow state transition
MCP v1.0 不允许修改 SOP profile
MCP v1.0 does not allow modifying SOP profile
MCP v1.0 不允许 reset
MCP v1.0 does not allow reset
MCP v1.0 不允许直接写入正式 decision log
MCP v1.0 does not allow directly writing formal decision log

⸻

12.12 AI Governance 规则｜AI Governance Rule

AI 可以生成文档草稿、建议代码、生成测试、总结状态
AI may generate document drafts, suggest code changes, generate tests, and summarize state
AI 不应修改生产数据
AI should not modify production data
AI 不应改变认证逻辑且无 rollback plan
AI should not change authentication logic without rollback plan
AI 不应删除文件且无明确确认
AI should not delete files without explicit confirmation
AI 不应合并 PR
AI should not merge PRs
AI 不应自动推进状态
AI should not automatically advance state
AI 不应自动修改 SOP profile
AI should not automatically modify SOP profile
AI 不应把未通过 Gate 的 artifact 标记为完成
AI should not mark artifacts that failed Gate as complete
AI 不应直接写入正式 decision log
AI should not directly write formal decision log

⸻

12.13 alpha / beta / GA 推进规则｜Release Phase Rule

alpha 未跑通，不进入 beta
Do not enter beta until alpha passes
beta 未在非工具型项目跑通，不进入 GA
Do not enter GA until beta passes on non-tool project
GA 未满足 DoD 和 Success Criteria，不公开发布
Do not release GA until DoD and Success Criteria are satisfied

⸻

13. 权限规则｜Permission Rules

v1.0 不做用户系统和权限系统。
v1.0 does not implement user system or permission system.

v1.0 的权限不是身份权限，而是操作边界权限。
v1.0 permission means operation boundary, not identity permission.

OCN 不识别不同人，只区分 CLI 调用能力和 MCP Agent 调用能力。
OCN does not identify different people; it only distinguishes CLI capability and MCP Agent capability.

操作 Operation	CLI 用户 CLI User	MCP Agent
查看状态 View status	是 Yes	是 Yes
生成 brief Generate brief	是 Yes	是 Yes
执行 gate Run gate	是 Yes	是 Yes
创建 artifact Create artifact	是 Yes	是 Yes
写普通 log Write regular log	是 Yes	是 Yes
检测 SOP 版本 Detect SOP version	是 Yes	是 Yes
生成 prompt Generate prompt	是 Yes	是 Yes
读取 Step Artifact Gate 结果 Read Step Artifact Gate result	是 Yes	是 Yes
advance 状态 Advance state	是 Yes	否 No
reset 项目 Reset project	是 Yes	否 No
写正式 decision log Write formal decision log	是 Yes	否 No
修改 SOP profile Modify SOP profile	否 No	否 No
自动修改业务代码 Automatically modify business code	否 No	否 No

⸻

14. 异常场景｜Exception Scenarios

14.1 未初始化项目｜Project Not Initialized

用户执行：
User runs:

ocn status

但当前目录没有 .ocoding/。
But current directory has no .ocoding/.

系统应提示：
System should show:

OCN project not initialized.
未初始化 OCN 项目。
Run: ocn init --tier minimal
请执行：ocn init --tier minimal

错误码：
Error code:

ERR_STATE_MACHINE

⸻

14.2 state.json 损坏｜state.json Corrupted

系统应提示：
System should show:

state.json is invalid.
state.json 无效。
Run: ocn doctor
请执行：ocn doctor

如果存在 backup：
If backup exists:

Backup found: .ocoding/state.json.bak
发现备份：.ocoding/state.json.bak

⸻

14.3 SOP 版本不兼容｜SOP Version Incompatible

系统应提示：
System should show:

Project SOP version is incompatible with current OCN version.
项目 SOP 版本与当前 OCN 版本不兼容。
Run: ocn sop diff
请执行：ocn sop diff
Run: ocn sop upgrade --plan
请执行：ocn sop upgrade --plan

错误码：
Error code:

ERR_SOP_VERSION

⸻

14.4 artifact 缺失｜Artifact Missing

系统应提示：
System should show:

Required artifact missing:
缺少必需产物：
docs/02-prd.md
Next action:
下一步：
ocn doc create prd

错误码：
Error code:

ERR_ARTIFACT_INVALID

⸻

14.5 artifact 结构不完整｜Artifact Structure Incomplete

场景：
Scenario:

docs/02-prd.md 存在，但缺少 Scenarios｜使用场景。
docs/02-prd.md exists, but Scenarios｜使用场景 is missing.

系统行为：
System behavior:

ocn check 返回 blocked
ocn check returns blocked
ocn gate 不允许进入 DESIGN
ocn gate does not allow transition to DESIGN
ocn prompt next 提示补齐 Scenarios｜使用场景
ocn prompt next asks to add Scenarios｜使用场景

错误码：
Error code:

ERR_ARTIFACT_INVALID

⸻

14.6 artifact 内容太浅｜Artifact Content Too Shallow

场景：
Scenario:

PRD 有 Risks｜风险 章节，但只有一句“存在实现风险”。
PRD has Risks｜风险 section, but only says “implementation risk exists”.

系统行为：
System behavior:

结构检查通过
Structural check passes
Artifact Quality Checklist 给 warning
Artifact Quality Checklist gives warning
是否 block 由该项 warning_criteria 决定
Whether to block depends on warning_criteria

⸻

14.7 gate 失败｜Gate Failed

系统应提示：
System should show:

Gate failed.
门禁失败。
Cannot advance from state_spec to state_design.
不能从 state_spec 推进到 state_design。
Blocked by:
阻塞原因：
- docs/03-acceptance-criteria.md missing
- step_prd Scenarios｜使用场景 section missing

错误码：
Error code:

ERR_GATE_FAILED

⸻

14.8 非法状态跳转｜Illegal State Transition

如果用户尝试跳过状态，系统应阻止。
If user tries to skip states, system should block.

错误码：
Error code:

ERR_STATE_MACHINE

⸻

14.9 lock file 存在｜Lock File Exists

如果 .ocoding/.lock 存在且未超时，系统应等待。
If .ocoding/.lock exists and is not timed out, system should wait.

如果超过 5 秒，应提示：
If over 5 seconds, system should show:

OCN project is locked by another process.
OCN 项目正在被另一个进程锁定。
Try again later or run ocn doctor.
稍后重试，或执行 ocn doctor。

错误码：
Error code:

ERR_IO_OR_CONFIG

⸻

14.10 MCP 请求非法操作｜MCP Requests Illegal Operation

如果 MCP agent 请求 advance、reset 或 capture_decision，系统应拒绝。
If MCP agent requests advance, reset, or capture_decision, system should reject.

错误码：
Error code:

ERR_GATE_FAILED

⸻

14.11 Tier 与 artifact 不匹配｜Tier and Artifact Mismatch

场景：
Scenario:

项目 tier 为 production，但缺少 docs/09-real-data-wiring.md。
Project tier is production, but docs/09-real-data-wiring.md is missing.

系统行为：
System behavior:

ocn check 输出 missing artifact
ocn check outputs missing artifact
ocn gate 根据当前 state 和 tier 判断是否 block
ocn gate decides whether to block based on current state and tier

⸻

14.12 step_id 在 SOP 中不存在｜step_id Not Found in SOP

场景：
Scenario:

{
  "currentStepId": "step_unknown"
}

系统行为：
System behavior:

ocn doctor 报告 state machine error
ocn doctor reports state machine error
ocn status 提示运行 doctor
ocn status suggests running doctor

错误码：
Error code:

ERR_STATE_MACHINE

⸻

14.13 cross-cutting obligation 配置不合法｜Invalid Cross-cutting Obligation Config

场景：
Scenario:

sop.yaml 中某个 cross_cutting_obligation 指向不存在的 step_id。
A cross_cutting_obligation in sop.yaml points to a non-existing step_id.

系统行为：
System behavior:

SOP Loader 报错
SOP Loader reports error
ocn doctor 提示配置问题
ocn doctor reports configuration issue

错误码：
Error code:

ERR_IO_OR_CONFIG

⸻

14.14 test record 文件格式不支持｜Unsupported Test Record Format

场景：
Scenario:

ocn test record --from unknown result.json

系统行为：
System behavior:

Unsupported test result format.
不支持的测试结果格式。
Supported in v1.0: vitest json
v1.0 支持：vitest json

错误码：
Error code:

ERR_IO_OR_CONFIG

⸻

14.15 reset –hard 未二次确认｜reset –hard Without Second Confirmation

场景：
Scenario:

用户执行：
User runs:

ocn reset --hard

但没有二次确认。
But no second confirmation is provided.

系统行为：
System behavior:

拒绝执行
Reject execution
不删除文件
Do not delete files
提示需要确认
Ask for confirmation

⸻

15. 非功能需求｜Non-functional Requirements

15.1 本地优先｜Local-first

所有核心状态和文档必须落在本地项目目录。
All core states and documents must live in local project directory.

.ocoding/
docs/

⸻

15.2 Git 友好｜Git-friendly

所有核心 artifact 应适合 Git 追踪。
All core artifacts should be Git-friendly.

Markdown
JSON
YAML

⸻

15.3 AI 可读｜AI-readable

所有核心文档应能被 AI Coding 工具直接读取和引用。
All core documents should be directly readable and referenceable by AI coding tools.

⸻

15.4 可测试｜Testable

Core Engine、SOP Loader、Gate、Step Artifact Gate、State Machine、Artifact Check、Audit Write 必须可被 vitest 测试。
Core Engine, SOP Loader, Gate, Step Artifact Gate, State Machine, Artifact Check, and Audit Write must be testable by vitest.

⸻

15.5 可恢复｜Recoverable

state.json 写入必须具备：
state.json writing must include:

lock
backup
temp file rename
doctor
reset

⸻

15.6 MCP 可调用｜MCP-callable

v1.0 必须提供 Minimal MCP Server。
v1.0 must provide Minimal MCP Server.

⸻

15.7 不依赖云服务｜No Cloud Dependency

v1.0 不依赖云服务、账号系统、在线存储。
v1.0 does not depend on cloud service, account system, or online storage.

⸻

15.8 可版本化｜Versionable

SOP Profile、state、gate、artifact 模板必须可版本化。
SOP Profile, state, gate, and artifact templates must be versionable.

⸻

15.9 可脚本调用｜Scriptable

CLI 必须适合脚本调用。
CLI must be scriptable.

要求：
Requirements:

稳定退出码
Stable exit codes
稳定 error code
Stable error codes
可选 JSON 输出预留
Optional JSON output reserved

⸻

15.10 写入原子性｜Atomic Write

关键文件写入必须使用：
Key file writes must use:

lock file
backup
temp file
rename

避免 state.json 损坏。
Prevent state.json corruption.

⸻

15.11 跨平台运行｜Cross-platform

v1.0 应支持常见 Node.js 环境下的 macOS、Linux、Windows。
v1.0 should support macOS, Linux, and Windows under common Node.js environments.

⸻

15.12 性能预算｜Performance Budget

典型项目定义：
Typical project definition:

docs artifact 数量 ≤ 30
Number of docs artifacts ≤ 30
.ocoding 配置文件数量 ≤ 20
Number of .ocoding config files ≤ 20
单个 markdown artifact ≤ 100KB
Single markdown artifact ≤ 100KB

v1.0 GA 性能预算：
v1.0 GA performance budget:

操作 Operation	P95 Budget
ocn status	< 200ms
ocn brief	< 800ms
ocn check 单 step / single step	< 300ms
ocn gate 单 state / single state	< 1s
ocn doc create	< 100ms
SOP Loader cold start	< 200ms
state.json 写入，含 lock / write with lock	< 100ms
MCP tool 单次调用 / single MCP tool call	< 800ms

⸻

15.13 OCN 自身可观测性｜OCN Internal Observability

OCN 自己必须具备基础可观测性。
OCN itself must have basic observability.

alpha

OCN_DEBUG=1

用于输出基本调试信息。
Used to output basic debug information.

beta

ocn --debug status
ocn --trace gate

debug 输出：
Debug output:

当前 state / step
Current state / step
读取了哪些配置文件
Which config files are read
触发了哪些 gate
Which gates are triggered
哪些 artifact 被检查
Which artifacts are checked

trace 输出：
Trace output:

SOP Loader 加载顺序
SOP Loader loading order
gate 评估顺序
Gate evaluation order
artifact 解析过程
Artifact parsing process
required_sections 匹配结果
required_sections matching result

GA

ocn doctor --snapshot

生成：
Generate:

.ocoding/snapshot-<timestamp>.json

包含：
Includes:

state
sop version
artifact list
gate status
artifact gate status
recent errors

错误日志：
Error log:

.ocoding/.errors.log

规则：
Rules:

保留最近 100 条
Keep latest 100 entries
循环覆盖
Circular overwrite

⸻

15.14 语言策略｜Language Strategy

OCN v1.0 默认采用中英文双语策略。
OCN v1.0 uses bilingual Chinese-English strategy by default.

规则：
Rules:

机器字段使用英文 stable key
Machine fields use English stable keys
人类可读内容使用中英文双语
Human-readable content uses bilingual Chinese-English
CLI 输出中英文双语
CLI output is bilingual
MCP message 中英文双语
MCP messages are bilingual
Artifact 模板中英文双语
Artifact templates are bilingual
Gate Checklist 中英文双语
Gate Checklist is bilingual
Prompt Next 中英文双语
Prompt Next is bilingual
README 中英文双语
README is bilingual

Artifact 标题格式：
Artifact heading format:

## Scenarios｜使用场景

MCP 结构化返回示例：
MCP structured response example:

{
  "code": "ERR_ARTIFACT_INVALID",
  "message": {
    "en": "Required section is missing: Scenarios",
    "zh": "缺少必需章节：Scenarios｜使用场景"
  }
}

v1.0 不做 locale 切换。
v1.0 does not implement locale switching.

v1.1 可考虑：
v1.1 may consider:

ocn init --locale zh-CN
ocn init --locale en-US

⸻

15.15 文件系统边界｜File System Boundary

OCN 必须明确自己的文件系统访问边界。
OCN must explicitly define its file system access boundary.

默认只读写：
Default read / write:

<project>/.ocoding/**
<project>/docs/**

可读取：
May read:

用户显式传入的测试结果文件路径
User-explicit test result file path
OCN 安装包内置 sops/**
Bundled sops/** in OCN installation

默认不读取：
Does not read by default:

<project>/src/**
<project>/.git/**
项目目录之外的任意路径
Any path outside project directory

默认不修改：
Does not modify by default:

用户业务代码
User business code
package.json
package.json
git hooks
git hooks
CI 配置
CI configuration

例外必须由用户显式指定。
Exceptions must be explicitly specified by the user.

⸻

16. 分阶段需求表｜Phased Requirement Table

功能 Capability	alpha	beta	GA
Core Engine	是 Yes	是 Yes	是 Yes
SOP Loader	是 Yes	是 Yes	是 Yes
State Machine	是 Yes	是 Yes	是 Yes
Stable Step ID	是 Yes	是 Yes	是 Yes
Step Artifact Gate	核心 steps / Core steps	设计 steps / Design steps	tier 相关 steps / tier-related steps
Artifact Quality Checklist	部分 Partial	是 Yes	是 Yes
Tier minimal	是 Yes	是 Yes	是 Yes
Tier production	否 No	是 Yes	是 Yes
Tier full	否 No	否 No	是 Yes
Artifact create	是 Yes	是 Yes	是 Yes
Template override	否 No	是 Yes	是 Yes
Hard Gate	是 Yes	是 Yes	是 Yes
Process Gate	是 Yes	是 Yes	是 Yes
Brief	是 Yes	是 Yes	是 Yes
Prompt Next	是 Yes	是 Yes	是 Yes
Dev Log	是 Yes	是 Yes	是 Yes
Decision Log command	否 No	是 Yes	是 Yes
Audit	是 Yes	是 Yes	是 Yes
Baseline	否 No	是 Yes	是 Yes
SOP version	否 No	是 Yes	是 Yes
SOP diff	否 No	是 Yes	是 Yes
SOP upgrade plan	否 No	否 No	是 Yes
Minimal MCP Server	否 No	是 Yes	是 Yes
Doctor	否 No	是 Yes	是 Yes
Reset keep-docs	否 No	是 Yes	是 Yes
Reset keep-state / hard	否 No	否 No	是 Yes
Test record vitest	否 No	否 No	是 Yes
check include-tests	否 No	否 No	是 Yes
Full CLI error model	否 No	是 Yes	是 Yes
AI Governance Brief	部分 Partial	是 Yes	是 Yes
Debug / trace	debug env only	debug / trace	snapshot

⸻

17. 风险与约束｜Risks and Constraints

17.1 过度范围风险｜Over-scoping Risk

v1.0 范围较大，因此必须按 alpha → beta → GA 推进。
v1.0 has broad scope, so it must progress through alpha → beta → GA.

如果 alpha 未完成，不得提前做 beta 功能。
Do not start beta functions before alpha is completed.

如果 beta 未在非工具型业务项目跑通，不得进入 GA。
Do not enter GA before beta succeeds on a non-tool business project.

⸻

17.2 假完成风险｜Fake Completion Risk

如果 OCN 只检查 artifact 是否存在，用户会误以为 step 已完成。
If OCN only checks artifact existence, users may mistakenly believe a step is complete.

应对：
Mitigation:

Step Artifact Gate
required_sections
blocking_criteria
Artifact Quality Checklist
Self-check Rule

⸻

17.3 质量判断过度承诺风险｜Over-promising Quality Judgment Risk

v1.0 不做 LLM Judge。
v1.0 does not implement LLM Judge.

如果 OCN 声称能判断内容深度，会造成误导。
If OCN claims to judge content depth, it misleads users.

应对：
Mitigation:

明确 quality warning 只是启发式
Clearly state quality warning is heuristic only
真正内容质量由人工 review
True content quality is reviewed by humans
LLM Judge 放到 v1.1 候选
LLM Judge is v1.1 candidate

⸻

17.4 MCP 风险｜MCP Risk

MCP Server 会增加实现和测试成本。
MCP Server increases implementation and test cost.

约束：
Constraints:

MCP Server 只包 Core Engine
MCP Server only wraps Core Engine
不新增业务逻辑
No additional business logic
不暴露 advance_phase
Do not expose advance_phase
不暴露 capture_decision
Do not expose capture_decision

⸻

17.5 Tier 风险｜Tier Risk

Tier 可能让 gate 规则复杂。
Tier may complicate gate rules.

约束：
Constraints:

Tier 只影响 artifact 集和 gate 范围
Tier only affects artifact set and gate scope
不改变状态机和 step id
Does not change state machine and step id

⸻

17.6 Reset 风险｜Reset Risk

reset 有删除风险。
Reset has deletion risk.

约束：
Constraints:

reset --hard 必须二次确认
reset --hard requires second confirmation
reset 不得默认删除业务代码
reset must not delete business code by default
reset 必须写 audit
reset must write audit

⸻

17.7 Gate 过硬风险｜Gate Too Strict Risk

如果 Gate 太硬，用户可能绕过 OCN。
If Gate is too strict, users may bypass OCN.

应对：
Mitigation:

区分 blocked / warning
Distinguish blocked / warning
允许 override reason
Allow override reason
输出 next action
Output next action
不要只报错
Do not only report error

⸻

17.8 Gate 过软风险｜Gate Too Soft Risk

如果 Gate 太软，OCN 无法防失控。
If Gate is too soft, OCN cannot prevent loss of control.

应对：
Mitigation:

核心 required sections 必须 hard block
Core required sections must hard block
artifact 存在不等于完成
Artifact existence does not equal completion
advance 必须依赖 gate
advance must depend on gate

⸻

17.9 双语输出复杂度风险｜Bilingual Output Complexity Risk

中英文双语会增加模板、CLI、MCP message 的维护成本。
Bilingual output increases maintenance cost of templates, CLI, and MCP messages.

应对：
Mitigation:

机器字段统一英文 stable key
Machine fields use English stable key
人类内容通过 message.en / message.zh 输出
Human-readable content uses message.en / message.zh
artifact heading 使用 English｜中文 格式
Artifact heading uses English｜Chinese format

⸻

18. Definition of Done｜完成定义

v1.0 GA 必须满足：
v1.0 GA must satisfy:

1. ocn init 可初始化项目。
   ocn init can initialize project.
2. ocn init 支持 --tier minimal / production / full。
   ocn init supports --tier minimal / production / full.
3. 生成 .ocoding/ 和 docs/ 基础结构。
   Generates .ocoding/ and docs/ structure.
4. 写入显式状态机配置。
   Writes explicit state machine config.
5. 写入 SOP Profile 和版本号。
   Writes SOP Profile and version.
6. 维护 .ocoding/state.json。
   Maintains .ocoding/state.json.
7. 使用 currentStateId 和 currentStepId。
   Uses currentStateId and currentStepId.
8. ocn status 显示状态、step id、阻塞项、下一步。
   ocn status displays state, step id, blockers, next actions.
9. ocn brief 生成 AI 会话 brief。
   ocn brief generates AI session brief.
10. ocn brief 包含 AI Governance Rules。
    ocn brief includes AI Governance Rules.
11. 可生成核心文档模板。
    Can generate core artifact templates.
12. Artifact 模板采用中英文双语。
    Artifact templates are bilingual.
13. ocn check 检查 artifact。
    ocn check checks artifacts.
14. ocn check 检查当前 step required sections。
    ocn check checks current step required sections.
15. required_sections 使用 Markdown AST + alias table 检测。
    required_sections are checked using Markdown AST + alias table.
16. ocn test record --from vitest <path> 可记录测试结果。
    ocn test record --from vitest <path> can record test result.
17. ocn check --include-tests 可纳入测试结果。
    ocn check --include-tests includes test result.
18. ocn gate 检查当前状态 gate。
    ocn gate checks current state gate.
19. ocn gate 聚合 Step Artifact Gate 结果。
    ocn gate aggregates Step Artifact Gate results.
20. ocn gate 自动写 audit。
    ocn gate writes audit automatically.
21. ocn advance 在 gate 通过后进入下一状态。
    ocn advance advances only after gate passes.
22. blocking Step Artifact Gate 失败时，ocn advance 必须失败。
    ocn advance must fail when blocking Step Artifact Gate fails.
23. ocn advance 成功或失败都写 audit。
    ocn advance writes audit whether success or failure.
24. ocn log 支持主动写入 dev log。
    ocn log supports dev log.
25. ocn log --type decision 支持写入 decision log。
    ocn log --type decision supports decision log.
26. ocn baseline create 生成 baseline 并写 audit。
    ocn baseline create creates baseline and writes audit.
27. ocn prompt next 生成下一步 prompt。
    ocn prompt next generates next prompt.
28. ocn prompt next 注入 required_sections 和 blocking_criteria。
    ocn prompt next injects required_sections and blocking_criteria.
29. ocn sop version 显示版本。
    ocn sop version displays version.
30. ocn sop diff 输出版本差异。
    ocn sop diff outputs version difference.
31. ocn sop upgrade --plan 只生成升级计划。
    ocn sop upgrade --plan only generates upgrade plan.
32. ocn doctor 检测项目健康。
    ocn doctor checks project health.
33. ocn doctor --snapshot 可生成诊断快照。
    ocn doctor --snapshot can generate diagnostic snapshot.
34. ocn reset --keep-docs / --keep-state / --hard 支持明确恢复路径。
    ocn reset --keep-docs / --keep-state / --hard support clear recovery paths.
35. state.json 写入采用 lock + backup + temp rename。
    state.json writes use lock + backup + temp rename.
36. CLI 实现稳定退出码和 error code。
    CLI implements stable exit codes and error codes.
37. CLI 输出中英文双语。
    CLI output is bilingual.
38. 交付最小 MCP Server。
    Minimal MCP Server is delivered.
39. MCP 支持最小工具集，不暴露 advance_phase。
    MCP supports minimal tool set and does not expose advance_phase.
40. MCP 不暴露 capture_decision。
    MCP does not expose capture_decision.
41. navigator.run_gate 返回结构化 Step Artifact Gate 结果。
    navigator.run_gate returns structured Step Artifact Gate result.
42. Strict 模式下关键 artifact 缺失时阻止进入下一状态。
    In Strict mode, missing key artifact blocks transition.
43. Strict 模式下 required sections 缺失时阻止进入下一状态。
    In Strict mode, missing required sections blocks transition.
44. 所有状态和文档落在本地文件系统。
    All states and documents are stored in local file system.
45. 文件系统边界符合 PRD 15.15。
    File system boundary follows PRD 15.15.
46. 不依赖数据库、云服务、Web GUI、TUI。
    Does not depend on database, cloud service, Web GUI, or TUI.
47. SopLoader 可加载 SOP Profile 并生成 StateMachine / StepRegistry / ArtifactRegistry / GateRegistry / CrossCuttingObligationRegistry。
    SopLoader can load SOP Profile and generate StateMachine / StepRegistry / ArtifactRegistry / GateRegistry / CrossCuttingObligationRegistry.
48. SopLoader 可加载 Step Artifact Gate rules。
    SopLoader can load Step Artifact Gate rules.
49. vitest 覆盖状态机、step id、Gate、Step Artifact Gate、SOP 版本检测、artifact 检查、audit 写入、lock 写入和 CLI 输出。
    vitest covers state machine, step id, Gate, Step Artifact Gate, SOP version detection, artifact check, audit writing, lock writing, and CLI output.
50. mini CRM｜客户偏好管理系统 mini 版 完成 production tier dogfood。
    mini CRM completes production tier dogfood.

⸻

19. Success Criteria｜成功标准

v1.0 的产品成功标准：
v1.0 product success criteria:

1. OCN 自身 dogfood 从 DISCOVERY 到 SHIP 跑通。
   OCN dogfoods itself from DISCOVERY to SHIP.
2. 第二个非工具型业务项目 mini CRM｜客户偏好管理系统 mini 版 用 production tier 跑通生命周期。
   Second non-tool business project mini CRM completes lifecycle with production tier.
3. 外部用户只读 README 和 ocn status，能完成 init → SPEC → 第一份 artifact。
   External user can complete init → SPEC → first artifact using only README and ocn status.
4. 长上下文中 ocn brief 能让 AI 恢复工作上下文。
   ocn brief can restore AI working context in long-context sessions.
5. ocn gate / ocn advance 至少合理 block 一次真实失控。
   ocn gate / ocn advance reasonably blocks at least one real loss-of-control case.
6. SOP Loader 能加载 0.2.0 SOP 并生成 diff / upgrade plan，不改 Core Engine。
   SOP Loader can load SOP 0.2.0 and generate diff / upgrade plan without changing Core Engine.
7. step_prd 缺少 Scenarios｜使用场景 时，OCN 必须 block，证明 OCN 能防止 artifact 假完成。
   When step_prd misses Scenarios｜使用场景, OCN must block, proving OCN prevents artifact fake completion.
8. ocn prompt next 生成的 prompt 能让 AI 输出包含 required_sections 的 artifact。
   ocn prompt next generates prompts that make AI output artifacts containing required_sections.
9. OCN 双语输出在 CLI、MCP message、artifact template 中保持一致。
   OCN bilingual output is consistent across CLI, MCP messages, and artifact templates.
10. OCN 文件系统访问边界符合 PRD 15.15，没有默认读取 src/、.git/ 或项目目录外路径。
    OCN file system access follows PRD 15.15 and does not read src/, .git/, or paths outside project by default.

⸻

20. 本期不解决的问题｜Out of Scope for This Version

v1.0 不解决：
v1.0 does not solve:

TUI
Web GUI
SaaS
数据库
Database
LLM Judge
向量记忆
Vector memory
跨项目 Cold Memory
Cross-project Cold Memory
代码层强阻断
Code-level enforcement
自动业务代码生成
Automatic business code generation
MCP advance_phase
MCP capture_decision
团队权限系统
Team permission system
云同步
Cloud sync
插件市场
Plugin marketplace
用户自定义 SOP Profile
User-defined SOP Profile
用户自定义 Gate Rule
User-defined Gate Rule
locale 切换
Locale switching

⸻

21. 附录 A：v1.0 SOP Step / Cross-Cutting Obligation Map

A.1 Sequential Steps｜顺序步骤

v1.0 保留 28 个 stable step id，其中：
v1.0 keeps 28 stable step ids, including:

24 个 sequential_step
24 sequential_steps
4 个 cross_cutting_step
4 cross_cutting_steps

state_id	step_id	order	step_type	artifact
state_discovery	step_project_brief	10	sequential_step	docs/00-project-brief.md
state_discovery	step_scope	20	sequential_step	docs/01-scope.md
state_spec	step_prd	30	sequential_step	docs/02-prd.md
state_spec	step_acceptance_criteria	40	sequential_step	docs/03-acceptance-criteria.md
state_design	step_information_architecture	50	sequential_step	docs/04-information-architecture.md
state_design	step_data_model	60	sequential_step	docs/05-data-model.md
state_design	step_api_contract	70	sequential_step	docs/06-api-contract.md
state_design	step_test_strategy	80	sequential_step	docs/07-test-strategy.md
state_plan	step_mvp_plan	90	sequential_step	docs/08-mvp-plan.md
state_plan	step_real_data_wiring	100	sequential_step	docs/09-real-data-wiring.md
state_plan	step_config_and_env	110	sequential_step	docs/10-config-and-env.md
state_plan	step_reproducibility	120	sequential_step	docs/11-reproducibility.md
state_plan	step_rollback_plan	130	sequential_step	docs/12-rollback-plan.md
state_verify	step_small_sample_validation	140	sequential_step	docs/13-validation-report.md
state_verify	step_issue_triage	150	sequential_step	docs/14-debug-report.md
state_verify	step_debug_checklist	160	sequential_step	docs/14-debug-report.md
state_verify	step_baseline	170	sequential_step	docs/15-baseline.md
state_verify	step_usability_acceptance	180	sequential_step	docs/16-release-notes.md
state_build	step_pr_summary	190	sequential_step	PR Summary / docs/18-dev-log.md
state_build	step_bugfix_report	210	sequential_step	docs/18-dev-log.md
state_ship	step_observability	230	sequential_step	docs/20-observability.md
state_reflect	step_real_world_observation	250	sequential_step	docs/22-evolution-report.md
state_reflect	step_offline_research	260	sequential_step	docs/17-research-log.md
state_reflect	step_long_term_evidence	270	sequential_step	docs/22-evolution-report.md

⸻

A.2 Cross-Cutting Steps｜横切步骤

state_id	step_id	order	step_type	related_artifact	meaning
state_build	step_research_log	200	cross_cutting_step	docs/17-research-log.md	研究日志与研究 / 生产分轨机制
state_ship	step_uncertainty_policy	220	cross_cutting_step	docs/24-uncertainty-policy.md	不确定性表达规则
state_ship	step_audit_trail	240	cross_cutting_step	docs/21-audit-trail.md	audit 机制的收束和检查
state_reflect	step_ai_governance	280	cross_cutting_step	docs/23-ai-governance.md	AI 使用治理规则的定义和复盘

说明：
Notes:

cross_cutting_step 不是一次性完成的普通步骤。
cross_cutting_step is not a one-time sequential step.
它代表一个持续机制的定义、激活、收束或复盘。
It represents definition, activation, consolidation, or reflection of an ongoing mechanism.
Audit Trail 从第一个 push event 开始生效，不等到 step_audit_trail 才开始。
Audit Trail starts from the first push event, not from step_audit_trail.
AI Governance Brief 从第一次 brief / prompt next 开始生效。
AI Governance Brief starts from first brief / prompt next.

⸻

A.3 Cross-Cutting Obligation Map｜横切义务映射

obligation_id	activates_at	trigger	persistence	related_artifact
obligation_audit_trail	first push event after ocn init	push	accumulating	docs/21-audit-trail.md
obligation_decision_log	manual capture	pull	accumulating	docs/19-decision-log.md
obligation_dev_log	enter state_build	pull	accumulating	docs/18-dev-log.md
obligation_ai_governance_brief	every brief / prompt next	push	always-on injection	docs/23-ai-governance.md
obligation_uncertainty_policy	artifact exists or enter SHIP	push	always-on after defined	docs/24-uncertainty-policy.md
obligation_research_split	enter state_build or manual capture	pull	accumulating	docs/17-research-log.md
obligation_sop_version_detection	after ocn init	push	always-on	.ocoding/state.json
obligation_baseline_tracking	first baseline created	push	accumulating	docs/15-baseline.md

⸻

22. 下一步｜Next Step

完成本文档后，进入下一步：
After this document, move to:

#4｜Acceptance Criteria 验收标准文档
docs/03-acceptance-criteria.md

该文档将把本 PRD 中的功能需求转成可验证的 Given / When / Then 验收条件。
That document will convert this PRD’s requirements into verifiable Given / When / Then acceptance criteria.

特别注意：
Special attention:

docs/03-acceptance-criteria.md 必须覆盖：
docs/03-acceptance-criteria.md must cover:

Step Artifact Gate
Artifact Quality Checklist
Prompt Injection Rule
Self-check Rule
Blocking Rule
required_sections Markdown AST + alias table
Quality Heuristic boundary
PRD 缺少 Scenarios｜使用场景 时必须 block
mini CRM dogfood
Bilingual output
File system boundary
Performance budget
OCN debug / trace / snapshot