# O’CodingNavigator Scope
# #2｜Scope 范围边界文档
文档路径：`docs/01-scope.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.1`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
当前状态：`DISCOVERY`  
当前 Step：`step_scope`  
依赖文档：`docs/00-project-brief.md`  
对应 SOP：第 2 步｜先锁范围，再锁细节
---
## 1. 文档目的
本文档用于锁定 O’CodingNavigator v1.0 的产品范围、内部发布节奏和停止边界。
它回答四个问题：
1. v1.0 最终必须做什么？
2. v1.0-alpha、v1.0-beta、v1.0-GA 分别做到哪里就停？
3. v1.0 明确不做什么？
4. 哪些能力进入后续版本？
Scope 的核心价值不是列功能，而是防止 AI Coding 项目在早期失控。
> **没有 Scope，AI 会顺着上下文不断加功能。  
> 有了 Scope，OCN 才能知道什么该做，什么不该做，什么时候应该停止。**
---
## 2. 当前版本目标
O’CodingNavigator v1.0 的目标是交付一个：
> **开源、本地优先、MCP-first、状态机驱动的 AI Coding 流程操作系统 MVP。**
v1.0 必须证明：
AI Coding 项目可以不是连续对话里的混乱推进，而是可以通过：
```text
状态机
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

形成一个可导航、可验证、可回滚、可审计、可复盘的本地流程闭环。

⸻

3. MVP 核心判断

O’CodingNavigator v1.0 不追求“大而全”。

v1.0 的核心不是：

做一个完整研发平台。
做一个 IDE。
做一个 SaaS。
做一个 Web 管理后台。
做一个复杂协作系统。
做一个自动写代码 agent。

v1.0 的核心是：

把 AI Coding SOP 产品化为一个可执行、可检查、可被 AI agent 调用的本地流程系统。

因此，v1.0 的范围必须围绕 6 个核心闭环：

1. 状态机闭环
2. Artifact 闭环
3. Gate 闭环
4. Brief / Log / Audit 记忆闭环
5. SOP Versioning 闭环
6. Minimal MCP 调用闭环

⸻

4. v1.0 内部发布节奏

v1.0 不一次性“全做完再验证”。

v1.0 内部分为三个发布阶段：

v1.0-alpha：内部 dogfood 版
v1.0-beta：外部测试版
v1.0-GA：公开发布版

每个阶段都有明确停止边界。
前一阶段没有跑通，不进入下一阶段。

⸻

4.1 v1.0-alpha：内部 dogfood 版

阶段目标

先证明 OCN 自己能用最小流程跑起来。

alpha 的目标不是交付完整功能，而是跑通 OCN 的核心自举闭环：

State Machine
SOP Loader
Stable Step ID
Tier minimal
Artifact System
Hard Gate
Process Gate
Brief
Prompt Next
Dev Log
Audit
state.json 安全写入

⸻

alpha 必须做

Core Engine
SOP Loader
状态机
Stable Step ID
Tier minimal
Artifact System
Hard Gate
Process Gate
CLI 基础命令
Brief
Prompt Next
Dev Log
Audit Trail
state.json 安全写入

⸻

alpha 必须支持的 CLI 命令

ocn init --tier minimal
ocn status
ocn brief
ocn doc create <type>
ocn check
ocn gate
ocn advance
ocn log
ocn prompt next

⸻

alpha 暂不做

Minimal MCP Server
SOP diff / upgrade plan
Test gate
Doctor
Tier production / full
完整 CLI error code
AI Governance 完整注入
第二个 dogfood 项目
Reset 完整策略

⸻

alpha 停止条件

alpha 做到以下程度就停，不继续加功能：

OCN 自身项目能从 DISCOVERY 跑到 DESIGN 或 PLAN
至少一次 gate 合理 block
至少一次 audit 自动写入
至少一次 ocn brief 能恢复上下文
OCN 自身 dogfood 不绕过 hard gate

如果 alpha 跑不通，不进入 beta。

⸻

4.2 v1.0-beta：外部测试版

阶段目标

让非 OCN 项目也能使用，并让 AI agent 能通过 MCP 调用 OCN。

beta 的目标是验证：

OCN 不只适合开发 OCN 自己
OCN 可以服务一个非工具型业务项目
OCN 可以通过 Minimal MCP Server 被 AI agent 调用

⸻

beta 在 alpha 基础上增加

Tier production
Minimal MCP Server
Doctor
CLI Error Model
SOP version detection
SOP diff
state.json backup recovery
AI Governance Brief
Reset --keep-docs

⸻

beta 必须新增的 CLI 命令

ocn doctor
ocn sop version
ocn sop diff
ocn reset --keep-docs

⸻

beta 必须交付的 MCP tools

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

⸻

beta 不暴露的 MCP tool

v1.0-beta 不暴露：

navigator.advance_phase

原因：

状态推进是流程门禁，不应由 AI agent 在用户不知情的情况下自动推进。
v1.0 的状态推进必须由用户通过 CLI 执行：

ocn advance

未来如果支持 MCP advance，必须要求 explicit user approval 或 override reason。

⸻

beta 停止条件

beta 做到以下程度就停：

第二个非工具型业务项目能用 production tier 跑通 DISCOVERY → VERIFY
外部用户能完成 init → SPEC → 第一份 artifact
MCP server 能被至少一个 AI Coding 宿主调用
Doctor 能检测基础状态损坏
CLI error code 能被脚本稳定识别

如果 beta 不能在非工具型项目中跑通，不进入 GA。

⸻

4.3 v1.0-GA：公开发布版

阶段目标

补齐 OCN v1.0 对外发布所需的完整边界和长期演化能力。

GA 的目标是：

完成 v1.0 DoD
完成 v1.0 Success Criteria
提供可公开使用的 README
验证 SOP Loader 的版本演化能力

⸻

GA 在 beta 基础上增加

Tier full
SOP upgrade --plan
Test result gate
完整 CLI exit code
完整 README
dogfood 报告
Success Criteria 验证
Reset --keep-state
Reset --hard
AI Governance Brief 完整注入

⸻

GA 必须新增的 CLI 命令

ocn sop upgrade --plan
ocn check --include-tests
ocn test record --from vitest <path>
ocn reset --keep-state
ocn reset --hard

⸻

GA 停止条件

GA 做到以下程度就停：

DoD 33 条全部完成
Success Criteria 6 条全部满足
SOP Loader 能加载 0.2.0 并生成 diff / upgrade plan
OCN 自身 dogfood 完成
第二个非工具型业务项目 dogfood 完成
外部用户完成 init → SPEC → 第一份 artifact

⸻

5. v1.0 必须做

以下是 v1.0-GA 的完整范围。
但实际执行必须按 alpha → beta → GA 分阶段推进。

⸻

5.1 Core Engine

v1.0 必须实现 Core Engine。

Core Engine 是 OCN 的产品内核，不允许把核心逻辑写死在 CLI 命令里。

Core Engine 必须负责：

状态机加载
SOP Profile 加载
Step Registry
Artifact Registry
Gate Registry
Tier 规则
Artifact 检查
Gate 执行
状态推进
Brief 生成
Prompt 生成
Log 写入
Audit Event 写入
Baseline 创建
SOP 版本检测
SOP diff
SOP upgrade plan
AI Governance Brief 注入
Reset / Doctor 所需的状态操作

Core Engine 必须 MCP-friendly，核心函数应能被 CLI 和 MCP Server 同时调用。

必须支持的核心函数：

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
doctor()
resetProject()

⸻

5.2 SOP Loader

v1.0 必须实现 SOP Loader。

SOP Loader 是 OCN 的“编译器”。

它负责把 SOP Profile 文件加载成 Core Engine 可执行的结构化对象。

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
CrossCuttingObligationRegistry

SOP Loader 必须支持：

加载 default-ai-coding-sop@0.1.0
校验 state_id
校验 step_id
校验 step_type
校验 artifact_required
校验 depends_on
校验 gate 配置
校验 tier artifact set
校验 cross-cutting obligation
识别 SOP Profile Version
为 SOP diff / upgrade plan 提供结构化输入

v1.0 不要求支持多个复杂 profile 市场，但架构必须允许未来扩展 profile。

⸻

5.3 状态机

v1.0 必须实现 OCN 默认状态机。

状态机包括：

DISCOVERY
SPEC
DESIGN
PLAN
BUILD
VERIFY
SHIP
REFLECT

状态必须使用稳定字符串 ID：

state_discovery
state_spec
state_design
state_plan
state_build
state_verify
state_ship
state_reflect

每个状态必须包含：

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

v1.0 必须支持：

查看当前状态
查看当前 step
查看当前阻塞项
执行 gate
执行 advance
阻止非法状态跳转
记录状态转移 audit

⸻

5.4 Stable Step ID 与 Step Type

v1.0 必须使用稳定字符串 step id。

正确方式：

{
  "currentStateId": "state_spec",
  "currentStepId": "step_prd"
}

禁止用数字作为 source of truth：

{
  "currentStep": 3
}

数字只能作为 order 字段用于排序和展示。

⸻

5.4.1 Step Type

v1.0 必须区分两类 step：

sequential_step
cross_cutting_step

⸻

sequential_step

有明确开始、完成、artifact、gate-out。

例如：

step_project_brief
step_scope
step_prd
step_acceptance_criteria
step_data_model
step_api_contract

⸻

cross_cutting_step

不是一次性完成，而是持续激活、持续累积或持续约束。

v1.0 中以下 step 标记为 cross_cutting_step：

step_research_log
step_uncertainty_policy
step_audit_trail
step_ai_governance

说明：

step_audit_trail = audit 机制的收束和检查，不是 audit 第一次开始
step_ai_governance = AI 使用治理规则的定义和复盘，不是 AI governance 第一次生效
step_uncertainty_policy = 不确定性表达规则的定义，不代表此前不能表达不确定
step_research_log = 研究日志与研究 / 生产分轨机制，不代表此前不能记录研究

⸻

5.4.2 v1.0 内置 Step ID

v1.0 必须内置以下稳定 step id：

step_project_brief
step_scope
step_prd
step_acceptance_criteria
step_information_architecture
step_data_model
step_api_contract
step_test_strategy
step_mvp_plan
step_real_data_wiring
step_config_and_env
step_reproducibility
step_rollback_plan
step_small_sample_validation
step_issue_triage
step_debug_checklist
step_baseline
step_usability_acceptance
step_pr_summary
step_research_log
step_bugfix_report
step_uncertainty_policy
step_observability
step_audit_trail
step_real_world_observation
step_offline_research
step_long_term_evidence
step_ai_governance

注意：

旧命名 step_small_pr 调整为 step_pr_summary。
旧命名 step_research_production_split 调整为 step_research_log。
本版本发布后，step id 不得随意重命名。
重命名 step id 视为 breaking change。

⸻

5.5 Artifact System

v1.0 必须支持 Markdown Artifact System。

Artifact 必须落在本地项目目录中：

docs/

v1.0 必须支持创建和检查核心 artifacts。

完整 artifact 列表：

docs/00-project-brief.md
docs/01-scope.md
docs/02-prd.md
docs/03-acceptance-criteria.md
docs/04-information-architecture.md
docs/05-data-model.md
docs/06-api-contract.md
docs/07-test-strategy.md
docs/08-mvp-plan.md
docs/09-real-data-wiring.md
docs/10-config-and-env.md
docs/11-reproducibility.md
docs/12-rollback-plan.md
docs/13-validation-report.md
docs/14-debug-report.md
docs/15-baseline.md
docs/16-release-notes.md
docs/17-research-log.md
docs/18-dev-log.md
docs/19-decision-log.md
docs/20-observability.md
docs/21-audit-trail.md
docs/22-evolution-report.md
docs/23-ai-governance.md
docs/24-uncertainty-policy.md

v1.0 必须至少支持以下文档模板生成：

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

production / full tier 下支持更多 artifact 模板。

⸻

5.6 PRD / AC / Spec Profile Mapping

v1.0 必须消除 PRD / Spec 二元论。

Spec Profile 不是独立文档。

Spec Profile 是以下 artifact 的结构化字段总和：

PRD
Acceptance Criteria
Data Model
API Contract
Test Strategy
Decision Log

v1.0 不提供：

ocn doc create spec

v1.0 提供：

ocn doc create prd
ocn doc create acceptance-criteria

未来可以提供：

ocn spec status
ocn spec check

但 spec status / check 只做聚合检查，不生成独立 spec.md。

⸻

5.7 Tier System

v1.0 必须支持 Tier 系统。

命令：

ocn init --tier minimal
ocn init --tier production
ocn init --tier full

默认：

ocn init --tier minimal

Tier 影响：

init 创建哪些 artifact
gate 检查哪些 artifact
brief 展示哪些缺口
advance 时是否允许跳过部分 artifact

Tier 不影响：

状态机基本结构
stable step_id
SOP versioning
audit push 规则
AI governance brief
MCP tool interface

⸻

Tier 1：minimal

必须支持 10 份核心 artifact：

docs/00-project-brief.md
docs/01-scope.md
docs/02-prd.md
docs/03-acceptance-criteria.md
docs/04-information-architecture.md
docs/05-data-model.md
docs/06-api-contract.md
docs/07-test-strategy.md
docs/18-dev-log.md
docs/15-baseline.md

⸻

Tier 2：production

在 minimal 基础上增加：

docs/08-mvp-plan.md
docs/09-real-data-wiring.md
docs/10-config-and-env.md
docs/11-reproducibility.md
docs/12-rollback-plan.md
docs/20-observability.md
docs/21-audit-trail.md
docs/23-ai-governance.md

⸻

Tier 3：full

支持完整 artifact 集。

⸻

5.8 Gate System

v1.0 必须支持 Gate System。

Gate 类型包括：

Hard Gate
Process Gate
Soft Gate 预留

⸻

Hard Gate

v1.0 必须实现。

机器可判定，失败直接 block。

至少包括：

artifact 是否存在
artifact 是否为空
required fields 是否存在
state id 是否合法
step id 是否合法
sop version 是否存在
YAML / JSON 是否合法
baseline 是否存在
rollback plan 是否存在

⸻

Process Gate

v1.0 必须实现。

至少包括：

进入下一状态必须执行 ocn advance
跳过 artifact 必须记录 override reason
高风险操作必须人工确认

⸻

High-Risk Process Gate

v1.0 的“高风险动作被阻止”具体指高风险 process gate 被阻止，不指代码层强阻断。

触发场景包括：

ocn advance 因 rollback plan 缺失被阻止
ocn baseline create 因当前状态不满足条件被阻止
ocn gate 检测到 protected-risk artifact 缺失
ocn sop upgrade --plan 检测到 breaking change 并建议不升级

⸻

Soft Gate

v1.0 只预留，不完整实现。

预留接口：

JudgeProvider
Rubric
Score
Reason
Override

不要求接入 LLM Judge。

⸻

5.9 Test Result Gate

v1.0 必须提供测试结果流入 gate 的最小入口。

默认方式：

信任用户或 AI 在 dev-log 中声明测试结果

自动读取方式：

ocn test record --from vitest <path>
ocn check --include-tests

含义：

ocn test record --from vitest <path>

读取测试结果文件，记录到 OCN 的测试记录中。

ocn check --include-tests

在 artifact 检查基础上，把已记录的测试结果纳入判断。

v1.0 至少支持：

vitest json

未来可扩展：

jest json
pytest json
junit xml

v1.0 不提供：

ocn check tests

原因：

ocn check tests 容易让人误解为 OCN 自己在执行测试。
OCN v1.0 的职责是记录和读取测试结果，不是替代测试框架。

⸻

5.10 Brief

v1.0 必须支持：

ocn brief

以及 MCP tool：

navigator.brief

Brief 必须包含：

当前项目目标
当前状态
当前 step id
当前 tier
当前阻塞
已完成 artifact
缺失 artifact
最近关键决策
下一步行动
AI 本轮应该做什么
AI 本轮不应该做什么
AI Governance Rules

Brief 目标：

在长上下文或跨会话场景中，让 AI 无需用户重新自然语言解释，就能恢复当前工作上下文。

⸻

5.11 Prompt Next

v1.0 必须支持：

ocn prompt next

以及 MCP tool：

navigator.generate_next_prompt

Prompt Next 必须根据：

当前状态
当前 step
缺失 artifact
gate 阻塞
AI governance rules
当前 tier

生成下一步可复制给 AI Coding 工具的 prompt。

⸻

5.12 Dev Log

v1.0 必须支持：

ocn log
ocn log --type dev

以及 MCP tool：

navigator.capture_log

Dev Log 是 pull 模式。

需要用户或 AI 主动 capture。

Dev Log 至少记录：

为什么改
改了什么
改了哪些文件
是否符合 PRD / AC
是否影响 Scope
是否跑了测试
有没有失败
留下什么风险
下一步是什么

写入：

docs/18-dev-log.md

⸻

5.13 Decision Log

v1.0 固定使用：

ocn log --type decision

写入：

docs/19-decision-log.md

Decision Log 记录：

决策
背景
可选方案
最终选择
选择理由
风险
后续观察
关联 PR / artifact

v1.0 不提供：

ocn decision

ocn decision 可作为 v1.1 快捷别名候选。

⸻

5.14 Audit Trail

v1.0 必须支持 audit event 自动写入。

以下事件必须 push 写 audit：

状态转移
状态转移失败
gate 执行
gate 失败
gate override
SOP version 检测
SOP version 差异
baseline 创建
高风险 process gate 被阻止

写入：

docs/21-audit-trail.md

ocn status 默认不写 audit，避免刷屏。

⸻

5.15 Baseline

v1.0 必须支持：

ocn baseline create

创建：

docs/15-baseline.md
.ocoding/baselines/*.json

Baseline 必须记录：

版本号
对应 commit
当前状态
当前 step
当前可用功能
当前不可用功能
启动方式
测试方式
验收结果
已知问题
回滚方式
下一轮优化目标

创建 baseline 必须自动写 audit。

⸻

5.16 SOP Versioning

v1.0 必须支持 SOP versioning。

项目 init 时记录：

{
  "ocnVersion": "0.1.0",
  "sopProfileId": "default-ai-coding-sop",
  "sopProfileVersion": "0.1.0",
  "sopLockedAt": "2026-04-27T22:00:00+08:00"
}

必须支持：

ocn sop version
ocn sop diff
ocn sop upgrade --plan

原则：

OCN 可以检测版本差异
OCN 可以提示升级
OCN 可以生成 upgrade plan
OCN 不能主动修改项目 SOP

⸻

5.17 Minimal MCP Server

v1.0 必须交付 Minimal MCP Server。

最小工具集：

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

v1.0 不暴露：

navigator.advance_phase

原因：

状态推进是流程门禁。
v1.0 中状态推进必须由用户通过 CLI 执行：

ocn advance

未来如果支持 MCP advance，必须要求 explicit user approval 或 override reason。

MCP Server 只包 Core Engine，不新增业务逻辑。

v1.0 MCP Server 不做：

recall
vector memory
LLM judge
multi-agent orchestration
scope drift deep diff

⸻

5.18 CLI Client

v1.0 必须支持以下命令。

alpha 命令

ocn init
ocn init --tier minimal
ocn status
ocn brief
ocn doc create <type>
ocn check
ocn gate
ocn advance
ocn log
ocn prompt next

beta 新增命令

ocn doctor
ocn sop version
ocn sop diff
ocn reset --keep-docs

GA 新增命令

ocn init --tier production
ocn init --tier full
ocn baseline create
ocn sop upgrade --plan
ocn check --include-tests
ocn test record --from vitest <path>
ocn reset --keep-state
ocn reset --hard
ocn log --type decision

⸻

5.19 CLI Error Model

v1.0 必须实现稳定退出码和 error code。

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

5.20 State File Safety

v1.0 必须保证 .ocoding/state.json 安全写入。

最小要求：

使用 lock file：.ocoding/.lock
写入超时：5 秒
写入前备份：.ocoding/state.json.bak
写入临时文件
rename 原子替换
写入失败时不破坏旧 state

⸻

5.21 Doctor

v1.0 必须支持：

ocn doctor

检查：

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

5.22 Reset Policy

v1.0 必须支持 reset policy。

beta 支持

ocn reset --keep-docs

含义：

删除并重建 .ocoding/
保留 docs/
用于 OCN 状态损坏或初始化错误后的轻量恢复

⸻

GA 支持

ocn reset --keep-state
ocn reset --hard

含义：

ocn reset --keep-state

重新生成模板和 profile，保留当前 state.json。

ocn reset --hard

删除 .ocoding/ 和 OCN 管理的 docs，需要二次确认。

Reset 操作必须：

有明确提示
有二次确认
写入 audit
不默认删除用户业务代码

⸻

5.23 AI Governance Brief

v1.0 必须通过 brief 和 prompt 注入 AI governance。

ocn brief 必须包含：

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

v1.0 不做代码层强阻断。

⸻

6. 横切义务激活表

v1.0 必须明确每个横切义务的激活点。

Cross-Cutting Obligation	Activates At	Always-On After	Notes
audit_trail	first push event after ocn init	yes	gate / advance / baseline / sop events
decision_log	manual capture	no	ocn log --type decision
dev_log	enter state_build	yes	BUILD 到 REFLECT
ai_governance_brief	first ocn brief	yes	every brief / prompt next
sop_version_detection	ocn init 后	yes	status / gate / version
rollback_awareness	enter state_plan	yes	PLAN 到 REFLECT
baseline_tracking	first baseline created	yes	VERIFY 到 REFLECT
research_log	enter state_build or manual capture	no	research / production split
uncertainty_policy	artifact exists or enter SHIP	yes after defined	prompt / brief should reference if present

说明：

横切义务不等于阶段性 artifact。
横切义务可以早于对应 step artifact 生效。
例如 Audit Trail 从第一个 push event 开始生效，不等到 step_audit_trail 才开始。

⸻

7. v1.0 可以做，但不是必须做

以下能力可以在 v1.0 做，但不能影响核心范围交付。

7.1 README 快速入门

可以做。

内容包括：

安装方式
ocn init
ocn status
ocn brief
ocn doc create prd
ocn gate
最小示例

7.2 示例项目

可以做。

例如：

examples/restaurant-customer-preference

7.3 简单 JSON schema 输出

可以做。

用于调试：

ocn status --json
ocn gate --json

如果时间紧，--json 只覆盖 status 和 gate。

7.4 简单 MCP 安装说明

可以做。

但不做复杂跨工具集成教程。

⸻

8. v1.0 明确不做

v1.0 不做以下内容。

8.1 不做 TUI

不做：

ink
ocn tui
终端工作台
复杂快捷键交互

原因：

TUI 会增加交互复杂度，但不是 v1.0 验证核心。

⸻

8.2 不做 Web GUI

不做：

React Web
管理后台
项目看板
浏览器图形界面

原因：

Web GUI 会引入路由、状态管理、部署、样式、账号等非核心问题。

⸻

8.3 不做 SaaS

不做：

云服务
用户系统
团队权限
在线协作
云同步

原因：

OCN v1.0 必须保持 local-first。

⸻

8.4 不做数据库

v1.0 不使用：

SQLite
Postgres
向量数据库
远程数据库

原因：

Markdown + JSON + YAML 足以支撑 v1.0。
SQLite event store 留到未来版本。

⸻

8.5 不做完整 LLM Judge

不做：

自动判断 PRD 质量
自动判断 AC 是否合格
自动判断代码是否偏离 Spec
自动打分并阻断

只预留接口。

⸻

8.6 不做向量记忆

不做：

embedding
BM25 + vector hybrid retrieval
cross-project cold memory
recall(query)

原因：

v1.0 先验证 Hot Brief 和 Warm Memory。

⸻

8.7 不做代码层强阻断

不做：

git pre-commit hook
PR check
protected path enforcement
auth/payment/db migration detector
scope drift deep diff

原因：

v1.0 的 AI Governance 是 brief 注入 + audit + 流程 gate。
代码层强阻断放到 v1.1。

⸻

8.8 不自动修改业务代码

OCN 不负责：

生成业务代码
修改业务代码
重构业务代码
自动提交代码
自动创建 PR
自动合并 PR

OCN 只负责流程、artifact、gate、brief、log、audit、MCP 工具。

⸻

8.9 不做多 profile 市场

v1.0 只内置：

default-ai-coding-sop@0.1.0

不做：

profile marketplace
enterprise profile
language-specific profile
team custom profile UI

但架构必须支持未来扩展。

⸻

8.10 不做跨项目 Cold Memory

不做：

跨项目案例库
跨项目模式库
全局经验检索
团队知识库

⸻

8.11 不暴露 MCP advance

v1.0 Minimal MCP Server 不暴露：

navigator.advance_phase

状态推进必须由用户通过 CLI 执行：

ocn advance

这是 AI Governance 的一部分，不是遗漏。

⸻

9. 后续版本候选功能

9.1 v1.1 候选

git hooks
PR checks
scope drift diff checker
protected path rules
LLM Judge MVP
SOP upgrade apply
audit trail rebuild state
more test adapters
TUI prototype
ocn decision 快捷命令
MCP advance with explicit approval

9.2 v1.2 候选

SQLite event store
BM25 search
local embedding
recall(query)
cross-project memory
team profile
GitHub Action
VS Code extension

9.3 v2.0 候选

multi-agent orchestration
advanced MCP workflows
profile marketplace
cold memory library
coach dashboard
optional Web UI

⸻

10. 风险较高的功能

以下功能容易导致 v1.0 范围膨胀，应谨慎处理。

10.1 LLM Judge

风险：

需要模型选择
需要 rubric
需要评分阈值
需要 override
可能误判
可能引入成本

处理：

v1.0 只预留接口，不完整实现。

⸻

10.2 TUI

风险：

交互复杂度增加
测试复杂度增加
容易变成 UI 项目

处理：

v1.0 不做。

⸻

10.3 SQLite / Memory Retrieval

风险：

引入数据库迁移
引入索引策略
引入搜索质量问题
偏离 v1.0 核心

处理：

v1.0 不做。

⸻

10.4 代码层强阻断

风险：

需要 git hooks
需要 PR check
需要 diff 分析
需要文件路径规则
需要误伤处理

处理：

v1.0 不做。

⸻

10.5 自动升级 SOP

风险：

可能破坏项目历史
可能覆盖用户修改
可能造成不可逆状态变化

处理：

v1.0 只生成 upgrade plan，不自动修改。

⸻

10.6 MCP advance

风险：

AI agent 可能在用户不知情的情况下推进项目状态
破坏人工 gate
削弱 OCN 的流程纪律

处理：

v1.0 不暴露 navigator.advance_phase。
v1.1 若加入，必须要求 explicit approval 或 override reason。

⸻

11. 容易引起范围膨胀的功能

以下功能只记录，不进入 v1.0。

Web dashboard
在线团队协作
用户账号
云同步
插件市场
多语言 profile
跨项目知识库
高级搜索
自动 PR
自动代码审查
完整 AI reviewer
agent 长任务调度
企业权限
项目看板
图形化状态机

⸻

12. 本轮完成边界

v1.0 的完成边界分 alpha、beta、GA 三层。

⸻

12.1 alpha 完成边界

做到以下程度即停止 alpha 功能开发，进入 OCN 自身 dogfood：

Core Engine 可运行
SOP Loader 可加载 default profile
State Machine 可运行
Tier minimal 可初始化
Artifact 可创建
Hard Gate 可 block
Process Gate 可 advance
Brief 可生成
Prompt Next 可生成
Dev Log 可写入
Audit 可自动写入
state.json 安全写入可用

alpha 不为“更完整”继续加功能。
alpha 目标是 dogfood，不是发布。

⸻

12.2 beta 完成边界

做到以下程度即停止 beta 功能开发，进入外部测试：

Tier production 可用
Minimal MCP Server 可用
Doctor 可检测基础损坏
SOP version / diff 可用
Reset --keep-docs 可用
CLI error code 可用
AI Governance Brief 可用
第二个非工具型业务项目跑通 DISCOVERY → VERIFY

beta 不为“更漂亮”继续加功能。
beta 目标是验证 OCN 对真实业务项目是否有用。

⸻

12.3 GA 完成边界

做到以下程度即停止 v1.0 功能开发，进入公开发布：

Tier full 可用
SOP upgrade --plan 可用
Test result gate 可用
Reset --keep-state / --hard 可用
完整 README 可用
DoD 33 条完成
Success Criteria 6 条完成
Dogfood 报告完成

GA 不增加新能力。
GA 只补齐 v1.0 承诺的发布质量。

⸻

13. 本轮不以什么为成功标准

v1.0 不以下列事项作为成功标准：

功能数量很多
文档模板非常完整
支持所有测试框架
支持所有 AI 工具
TUI 很漂亮
能自动写业务代码
能自动判断代码质量
能跨项目召回知识
能多人协作
能云同步

v1.0 成功标准是：

OCN 能否用状态机、artifact、gate、brief、log、audit、SOP versioning 和 MCP tools，把一个 AI Coding 项目稳定推进起来。

⸻

14. Definition of Done

v1.0 的 DoD 来自 Project Brief v1.0，并按 GA 完成度验收。

必须完成：

1. ocn init 可初始化项目。
2. ocn init 支持 --tier minimal / production / full。
3. 生成 .ocoding/ 和 docs/ 基础结构。
4. 写入显式状态机配置。
5. 写入 SOP Profile 和版本号。
6. 维护 .ocoding/state.json。
7. 使用 currentStateId 和 currentStepId。
8. ocn status 显示状态、step id、阻塞项、下一步。
9. ocn brief 生成 AI 会话 brief。
10. ocn brief 包含 AI Governance Rules。
11. 可生成核心文档模板。
12. ocn check 检查 artifact。
13. ocn test record --from vitest <path> 可记录测试结果。
14. ocn check --include-tests 可纳入测试结果。
15. ocn gate 检查当前状态 gate。
16. ocn gate 自动写 audit。
17. ocn advance 在 gate 通过后进入下一状态。
18. ocn advance 成功或失败都写 audit。
19. ocn log 支持主动写入 dev log。
20. ocn log --type decision 支持写入 decision log。
21. ocn baseline create 生成 baseline 并写 audit。
22. ocn prompt next 生成下一步 prompt。
23. ocn sop version 显示版本。
24. ocn sop diff 输出版本差异。
25. ocn sop upgrade --plan 只生成升级计划。
26. ocn doctor 检测项目健康。
27. ocn reset --keep-docs / --keep-state / --hard 支持明确恢复路径。
28. state.json 写入采用 lock + backup + temp rename。
29. CLI 实现稳定退出码和 error code。
30. 交付最小 MCP Server。
31. MCP 支持最小工具集，不暴露 advance_phase。
32. Strict 模式下关键 artifact 缺失时阻止进入下一状态。
33. 所有状态和文档落在本地文件系统。
34. 不依赖数据库、云服务、Web GUI、TUI。
35. SopLoader 可加载 SOP Profile 并生成 StateMachine / StepRegistry / ArtifactRegistry / GateRegistry / CrossCuttingObligationRegistry。
36. vitest 覆盖状态机、step id、Gate、SOP 版本检测、artifact 检查、audit 写入、lock 写入和 CLI 输出。

⸻

15. Success Criteria

v1.0 的产品成功标准：

1. OCN 自身 dogfood 从 DISCOVERY 到 SHIP 跑通。
2. 第二个非工具型业务项目用 production tier 跑通生命周期。
3. 外部用户只读 README 和 ocn status，能完成 init → SPEC → 第一份 artifact。
4. 长上下文中 ocn brief 能让 AI 恢复工作上下文。
5. ocn gate / ocn advance 至少合理 block 一次真实失控。
6. SOP Loader 能加载 0.2.0 SOP 并生成 diff / upgrade plan，不改 Core Engine。

⸻

16. 最终范围判断

O’CodingNavigator v1.0 的范围不是“做一个功能很多的开发工具”。

它的范围是：

交付一个开源、本地优先、MCP-first、状态机驱动的 AI Coding 流程操作系统 MVP。

v1.0 必须把以下核心能力跑通：

State Machine
Stable Step ID
Step Type
SOP Loader
Tier System
Artifact System
Gate System
Brief
Log
Audit
Baseline
SOP Versioning
Minimal MCP Server
AI Governance Brief
State File Safety
Doctor
Reset Policy

v1.0 明确不做：

TUI
Web GUI
SaaS
数据库
LLM Judge
向量记忆
代码层强阻断
自动业务代码生成
跨项目 Cold Memory
MCP advance_phase

v1.0 的执行节奏必须是：

alpha 先自举
beta 再外测
GA 再公开发布

做到每个阶段的停止条件，就必须停止继续加功能，进入 dogfood、测试或发布。