# O’CodingNavigator Data Model
# #6｜Data Model 数据模型文档 v1.1
文档路径：`docs/05-data-model.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.1`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
Schema Version：`1.0`  
当前状态：`DESIGN`  
当前 Step：`step_data_model`  
依赖文档：  
- `docs/00-project-brief.md`
- `docs/01-scope.md`
- `docs/02-prd.md`
- `docs/03-acceptance-criteria.md`
- `docs/04-information-architecture.md`
对应 SOP：第 6 步｜先定数据模型
---
# 1. 文档目的｜Purpose
本文档定义 O’CodingNavigator v1.0 的核心数据模型、字段、枚举、对象关系、ID 生成规则、字段约束、持久化策略、权限边界和 schema version 策略。
This document defines O’CodingNavigator v1.0 core data models, fields, enums, object relationships, ID generation strategy, field constraints, persistence strategy, mutation boundaries, and schema versioning policy.
本文档回答：
1. OCN v1.0 有哪些核心数据对象？  
   What core data objects does OCN v1.0 have?
2. 每个对象有哪些字段？  
   What fields does each object contain?
3. 每个字段的类型、是否必填、默认值和约束是什么？  
   What are the type, required status, default value, and constraints of each field?
4. 对象之间如何通过 stable string id 引用？  
   How do objects reference each other through stable string ids?
5. ID 如何生成？  
   How are IDs generated?
6. 哪些字段是 enum？  
   Which fields are enums?
7. 哪些数据进入 `.ocoding/`，哪些数据进入 `docs/`？  
   Which data belongs in `.ocoding/`, and which belongs in `docs/`?
8. 哪些对象是机器可读事实源，哪些是人类可读叙述视图？  
   Which objects are machine-readable source of truth, and which are human-readable narrative views?
9. 哪些对象由谁创建、谁更新、谁只读？  
   Which objects are created, updated, and read by which actors?
10. Data Model 如何支撑后续 API Contract、Test Strategy 和 Core Engine 实现？  
    How does the Data Model support later API Contract, Test Strategy, and Core Engine implementation?
---
# 2. IA Amendment DM-001｜IA 修订记录
## 2.1 背景｜Background
在 Data Model 阶段，发现 IA v1.1 中有两个隐含横切义务已经被 PRD / AC 间接要求，但 IA 的 CrossCuttingObligation Map 没有显式列出。
During the Data Model phase, two implicit cross-cutting obligations were identified. They are indirectly required by PRD / AC but were not explicitly listed in the IA v1.1 CrossCuttingObligation Map.
## 2.2 新增横切义务｜Added Obligations
```text
obligation_sop_version_detection
obligation_baseline_tracking

2.3 修订理由｜Reason

obligation_sop_version_detection：
SOP 版本检测在每次项目启动、status、gate、advance、doctor 中持续生效。
SOP version detection is active across project startup, status, gate, advance, and doctor flows.
obligation_baseline_tracking：
Baseline tracking 在 VERIFY 阶段之后持续记录稳定状态、可回滚点和交付证据。
Baseline tracking continuously records stable checkpoints, rollback references, and delivery evidence after VERIFY.

2.4 是否新增产品需求｜Does This Add Product Requirements?

不新增用户侧功能。
It does not add new user-facing functionality.

本 Amendment 只是把已存在于 PRD / AC / IA 流程中的隐含机制显式建模。
This amendment only makes already-existing implicit mechanisms explicit in the data model.

2.5 对 IA 的影响｜Impact on IA

IA v1.1 的 CrossCuttingObligation Map 应追加：

obligation_sop_version_detection
obligation_baseline_tracking

⸻

3. 设计原则｜Design Principles

3.1 Local-first｜本地优先

OCN v1.0 不使用数据库。
OCN v1.0 does not use a database.

核心持久化介质：

JSON
YAML
JSONL
Markdown

核心目录：

.ocoding/
docs/

⸻

3.2 Stable String ID｜稳定字符串 ID

所有核心对象主键必须使用 stable string id。

All core object primary keys must use stable string ids.

示例：

state_spec
step_prd
artifact_prd
gate_step_prd
section_scenarios
obligation_audit_trail

禁止使用以下内容作为跨对象主键：

数字 order
数组 index
文件显示顺序
自然语言标题

⸻

3.3 ID 引用优先｜ID-based References

所有跨对象引用必须使用 id。

All cross-object references must use ids.

例如：

{
  "currentStateId": "state_spec",
  "currentStepId": "step_prd"
}

不要写成：

{
  "currentStateIndex": 2,
  "currentStepNumber": 3
}

⸻

3.4 ISO 8601 UTC 时间｜ISO 8601 UTC Time

所有内部时间字段必须使用 UTC ISO 8601 字符串，并以 Z 结尾。

All internal time fields must use UTC ISO 8601 strings ending with Z.

示例：

2026-04-27T15:00:00Z

显示层可以根据系统时区或用户配置转换。
Display layer may convert to system timezone or user-configured timezone.

⸻

3.5 Enum 显式定义｜Explicit Enums

所有 enum 字段必须在本文档中显式定义。

All enum fields must be explicitly defined in this document.

禁止 free-form string 承担 enum 角色。

Free-form strings must not be used as enum fields.

⸻

3.6 BilingualMessage｜双语消息

所有人类可读信息必须使用 BilingualMessage。

All human-readable messages must use BilingualMessage.

{
  "en": "Required section is missing: Scenarios",
  "zh": "缺少必需章节：Scenarios｜使用场景"
}

⸻

3.7 Markdown 是正式 artifact，不是结构化事实源

Markdown artifacts in docs/ are formal workflow evidence and human-readable narrative views, not the primary structured source of truth for runtime queries.

docs/*.md 是正式流程证据和人类可读叙述视图。
docs/*.md is formal workflow evidence and human-readable narrative view.

结构化运行时查询优先读取 .ocoding/ 下的 JSON / JSONL / YAML。
Runtime structured queries should prefer JSON / JSONL / YAML under .ocoding/.

⸻

3.8 Data Model 不创造新产品需求

本文档承接 IA v1.1 第 28 节定义的 Required Objects 和 Engineering Rules。

This document inherits Required Objects and Engineering Rules from IA v1.1 Section 28.

如果本文档发现 IA 对象关系需要调整，应写入 IA Amendment，不应静默修改。

If this document discovers that IA object relationships need adjustment, an IA Amendment should be written instead of silently changing the model.

⸻

4. ID Generation Strategy｜ID 生成策略

4.1 ID 分类｜ID Categories

OCN 使用两类 ID：

OCN uses two categories of IDs:

Stable Constant ID
Runtime Instance ID

⸻

4.2 Stable Constant ID｜稳定常量 ID

Stable Constant ID 由 SOP Profile 定义，不在运行时动态生成。

Stable Constant IDs are defined by SOP Profile and are not dynamically generated at runtime.

适用对象：

State
SequentialStep
CrossCuttingObligation
ArtifactDefinition
RequiredSection
QualityCheck
GateRule

格式：

<category>_<lowercase_snake_case_name>

示例：

state_spec
step_prd
artifact_prd
section_scenarios
quality_risks_min_chars
gate_step_prd
obligation_audit_trail

规则：

必须小写。
必须使用 snake_case。
必须带 category prefix。
写入 SOP Profile 后不得修改。
用户和 AI Agent 不得动态生成 Stable Constant ID。

⸻

4.3 Runtime Instance ID｜运行时实例 ID

Runtime Instance ID 由 OCN 自动生成。

Runtime Instance IDs are generated by OCN.

适用对象：

AuditEvent
LogEntry
DecisionEntry
ResearchEntry
Baseline
TestRecord
DoctorReport
SOPUpgradePlan
GateResult

格式：

<type>_<UTC timestamp compact>_<random suffix>

示例：

audit_20260427T150000Z_ab12cd
log_20260427T150000Z_ef34gh
decision_20260427T150000Z_ij56kl
baseline_20260427T150000Z_mn78op
test_20260427T150000Z_qr90st
doctor_20260427T150000Z_uv12wx
gate_20260427T150000Z_yz34ab

规则：

Runtime Instance ID 由 OCN 生成。
用户和 AI Agent 不得提供 Runtime Instance ID。
Runtime Instance ID 在项目内必须唯一。
Runtime Instance ID 一旦写入不得修改。

⸻

4.4 File-safe ID｜文件安全 ID

用于文件名的 ID 必须避免以下字符：

File-safe IDs must avoid:

/
\
:
*
?
"
<
>
|
空格

示例：

baseline_20260427T150000Z_ab12cd.json
test-record_20260427T150000Z_cd34ef.json
snapshot_20260427T150000Z_gh56ij.json

⸻

5. Field Constraint Rules｜字段约束规约

5.1 String 字段

默认规则：

所有 string 字段 trim 后不得为空，除非明确标注 optional。
All string fields must not be empty after trim unless explicitly optional.
显示名称类字段最大 200 字符。
Display name fields max 200 characters.
description / reason / context 类字段最大 2000 字符。
Description / reason / context fields max 2000 characters.
path 字段必须使用相对路径。
Path fields must use relative paths by default.

⸻

5.2 Array 字段

默认规则：

Array 默认允许为空数组，除非明确标注 minItems。
Arrays are allowed to be empty by default unless minItems is specified.
aliases 必须至少 1 项。
aliases must have at least one item.
relatedArtifactIds 可以为空数组。
relatedArtifactIds may be empty.

⸻

5.3 Time 字段

默认规则：

所有内部时间字段必须使用 UTC ISO 8601。
All internal time fields must use UTC ISO 8601.
必须以 Z 结尾。
Must end with Z.
不得写入 future timestamp。
Must not write a future timestamp.
显示层可按系统时区转换。
Display layer may convert to system timezone.

⸻

5.4 Path 字段安全规则

默认规则：

path 必须是相对路径。
path must be relative by default.
不得包含 ..
Must not contain ..
不得指向 .git/
Must not point to .git/
不得默认指向项目目录之外。
Must not point outside project root by default.
Artifact path 必须在 docs/ 或 .ocoding/ 内。
Artifact path must be under docs/ or .ocoding/.
TestRecord.sourcePath 是例外，但必须由用户显式传入。
TestRecord.sourcePath is an exception but must be explicitly provided by user.

⸻

5.5 Number 字段

默认规则：

number 字段不得为 NaN。
number fields must not be NaN.
count / total / duration 字段必须 >= 0。
count / total / duration fields must be >= 0.
order 字段仅用于排序和展示，不得作为跨对象引用。
order fields are for sorting and display only, never cross-object references.

⸻

5.6 Boolean 字段

Boolean 字段不得缺省为 undefined。
Boolean fields must not default to undefined.

必须显式写入：

true
false

⸻

6. Schema Versioning｜Schema 版本策略

6.1 schemaVersion

所有 .ocoding/state.json 必须包含顶层字段：

All .ocoding/state.json files must include top-level field:

{
  "schemaVersion": "1.0"
}

⸻

6.2 schemaVersion 与 sopProfileVersion 的区别

schemaVersion:
OCN 本地数据结构版本。
Version of local OCN data structure.
sopProfileVersion:
SOP 流程定义版本。
Version of SOP workflow definition.

二者独立演化。
They evolve independently.

⸻

6.3 启动检查规则

OCN 启动或执行命令时必须检查：

OCN must check on startup or command execution:

schemaVersion exists?
schemaVersion supported?
sopProfileVersion compatible?

规则：

schemaVersion 高于当前 OCN 支持版本 → blocked
schemaVersion 低于当前 OCN 支持版本 → 提示 migration
schemaVersion 等于当前 OCN 支持版本 → pass

错误码：

ERR_STATE_MACHINE

v1.0 不新增 ERR_SCHEMA_VERSION。
v1.0 does not add ERR_SCHEMA_VERSION.

⸻

6.4 v1.0 固定版本

schemaVersion = "1.0"

⸻

7. Dual Persistence Strategy｜双轨持久化策略

7.1 核心决策

OCN v1.0 采用双轨持久化：

OCN v1.0 uses dual persistence:

机器可读层：.ocoding/**/*.json / .jsonl / .yaml
人类可读层：docs/*.md

Machine-readable layer:

.ocoding/**/*.json
.ocoding/**/*.jsonl
.ocoding/**/*.yaml

Human-readable layer:

docs/*.md

⸻

7.2 事件类对象双轨持久化

对象	机器可读副本	人类可读文档
AuditEvent	.ocoding/events/audit-events.jsonl	docs/21-audit-trail.md
LogEntry	.ocoding/events/log-events.jsonl	docs/18-dev-log.md
DecisionEntry	.ocoding/events/decision-events.jsonl	docs/19-decision-log.md
ResearchEntry	.ocoding/events/research-events.jsonl	docs/17-research-log.md
Baseline	.ocoding/baselines/*.json	docs/15-baseline.md
TestRecord	.ocoding/test-results/*.json	none required

⸻

7.3 双轨写入规则

OCN 写事件时必须同时写机器可读副本和人类可读文档。
OCN must write both machine-readable copy and human-readable document for events.
机器读取优先读取 .ocoding/events/*.jsonl。
Machine reads should prefer .ocoding/events/*.jsonl.
Markdown 是人类叙述视图。
Markdown is the human narrative view.
如果二者不一致，v1.0 以 .jsonl 为准。
If inconsistent, v1.0 treats .jsonl as source of truth.
v1.0 不强制实现从 Markdown 重建 jsonl。
v1.0 does not require rebuilding jsonl from Markdown.

⸻

7.4 JSONL 行格式

每一行必须是一个完整 JSON 对象。

Each line must be a complete JSON object.

示例：

{"eventId":"audit_20260427T150000Z_ab12cd","eventType":"gate_failed","timestamp":"2026-04-27T15:00:00Z"}

⸻

8. Serialization Layer｜序列化层

8.1 文件可序列化对象

写入 .ocoding/**/*.json 或 .yaml：

Project
ProjectState
SOPProfile
State
SequentialStep
CrossCuttingObligation
ArtifactDefinition
RequiredSection
QualityCheck
GateRule
ArtifactGateStatus
GateResult
Baseline
TestRecord
LockState
DoctorReport

⸻

8.2 JSONL 可序列化对象

写入 .ocoding/events/*.jsonl：

AuditEvent
LogEntry
DecisionEntry
ResearchEntry

⸻

8.3 Markdown 叙述视图

写入 docs/*.md：

AuditEvent
LogEntry
DecisionEntry
ResearchEntry
Baseline

⸻

8.4 MCP 可传输对象

MCP 可以传输：

MCPToolResult
GateResult
ArtifactGateStatus
BriefContent
PromptContent
DoctorReport
ErrorResult
BilingualMessage

注意：

SOPProfile 可能很大，MCP v1.0 不默认完整返回。
SOPProfile may be large and is not returned in full by default in MCP v1.0.

⸻

8.5 仅内存对象

运行时派生，不要求单独持久化：

BriefContent
PromptContent
ErrorResult
SOPVersionDiff
SOPUpgradePlan

如需保存，可由用户显式执行相关命令。
Can be saved only if user explicitly requests via relevant command.

⸻

9. Object Ownership and Mutation Matrix｜对象创建与更新权限矩阵

Object	Created By	Updated By	Read By	规则
Project	ocn init	基本不可变	CLI / MCP	初始化后不应修改核心身份字段
ProjectState	ocn init	Core Engine	CLI / MCP	currentStateId / currentStepId 只能由 Core Engine 更新
SOPProfile	OCN 内置 / init copy	不可被项目运行时修改	CLI / MCP	项目锁定版本
State	SOPProfile	不可变	CLI / MCP	stable constant
SequentialStep	SOPProfile	不可变	CLI / MCP	stable constant
CrossCuttingObligation	SOPProfile	不可变	CLI / MCP	stable constant
ArtifactDefinition	SOPProfile	不可变	CLI / MCP	stable constant
Artifact	OCN / user file operation	Core Engine on check	CLI / MCP	内容在 docs，状态在 state
ArtifactGateStatus	Core Engine	Core Engine	CLI / MCP	由 ocn check 更新
GateResult	Core Engine	latest cache / append	CLI / MCP	由 ocn gate 生成
AuditEvent	Core Engine	immutable append	CLI / MCP	双轨写入
LogEntry	CLI / MCP	immutable append	CLI / MCP	dev / research
DecisionEntry	CLI user only	immutable append	CLI / MCP read	MCP 不可写
ResearchEntry	CLI / MCP	immutable append	CLI / MCP	pull 模式
Baseline	CLI	immutable	CLI / MCP	创建后不修改
TestRecord	CLI	immutable	CLI / MCP	读取显式路径
LockState	Core Engine	Core Engine	internal	写操作内部使用
DoctorReport	Core Engine	immutable per run	CLI / MCP	snapshot 可持久化
BriefContent	Core Engine	ephemeral	CLI / MCP	默认不持久化
PromptContent	Core Engine	ephemeral	CLI / MCP	默认不持久化
MCPToolResult	MCP Server	ephemeral	MCP	响应对象
ErrorResult	Core Engine	ephemeral / errors log	CLI / MCP	错误响应

⸻

10. Data Model ERD｜数据模型实体关系图

erDiagram
    Project ||--|| ProjectState : "embedded in state.json"
    Project ||--|| SOPProfile : "locks by sopProfileId + version"
    SOPProfile ||--o{ State : "contains"
    SOPProfile ||--o{ SequentialStep : "contains"
    SOPProfile ||--o{ CrossCuttingObligation : "contains"
    SOPProfile ||--o{ ArtifactDefinition : "contains"
    State ||--o{ SequentialStep : "groups by stateId"
    SequentialStep ||--|| ArtifactDefinition : "produces by artifactId"
    SequentialStep ||--|| GateRule : "evaluated by gateRuleId"
    SequentialStep ||--o{ RequiredSection : "requires"
    SequentialStep ||--o{ QualityCheck : "checks"
    GateRule ||--o{ RequiredSection : "blocks on"
    GateRule ||--o{ QualityCheck : "warns on"
    ArtifactDefinition ||--o| Artifact : "instantiated as"
    Artifact ||--o| ArtifactGateStatus : "has status"
    ProjectState ||--o{ ArtifactGateStatus : "indexed by stepId"
    ProjectState ||--o| GateResult : "latestGateResult"
    Project ||--o{ AuditEvent : "records"
    Project ||--o{ LogEntry : "records"
    Project ||--o{ DecisionEntry : "records"
    Project ||--o{ ResearchEntry : "records"
    Project ||--o{ Baseline : "snapshots"
    Project ||--o{ TestRecord : "stores"
    Project ||--o{ DoctorReport : "diagnoses"
    AuditEvent }o--o{ Artifact : "relates to"
    DecisionEntry }o--o{ Artifact : "relates to"
    ResearchEntry }o--o{ Artifact : "relates to"

⸻

11. 关键字段速查表｜Key Field Dictionary

Object	Field	Type	Required	Source	说明
ProjectState	schemaVersion	string	是	OCN	数据结构版本
Project	projectId	string	是	init	项目稳定 ID
Project	sopProfileVersion	string	是	init	锁定 SOP 版本
ProjectState	currentStateId	StateId	是	Core Engine	当前 state
ProjectState	currentStepId	StepId	是	Core Engine	当前 step
SequentialStep	stepId	StepId	是	SOPProfile	step stable id
SequentialStep	order	number	是	SOPProfile	仅排序
ArtifactDefinition	artifactId	string	是	SOPProfile	artifact 定义 ID
Artifact	status	ArtifactStatus	是	Core Engine	artifact 当前状态
ArtifactGateStatus	selfCheckConsistent	boolean	是	Core Engine	self-check 与 AST 是否一致
GateRule	gateRuleId	string	是	SOPProfile	gate 规则 ID
AuditEvent	eventId	string	是	Core Engine	audit event ID
LogEntry	logId	string	是	CLI / MCP	log entry ID
DecisionEntry	decisionId	string	是	CLI user	decision ID
ResearchEntry	researchId	string	是	CLI / MCP	research ID
Baseline	baselineId	string	是	CLI	baseline ID
TestRecord	testRecordId	string	是	CLI	test record ID
LockState	pid	number	是	Core Engine	锁进程 ID
LockState	createdAt	ISO UTC	是	Core Engine	锁创建时间
DoctorReport	reportId	string	是	Core Engine	doctor report ID
BilingualMessage	en	string	是	any	英文消息
BilingualMessage	zh	string	是	any	中文消息

⸻

12. Enum 定义｜Enum Definitions

12.1 StateId

type StateId =
  | "state_discovery"
  | "state_spec"
  | "state_design"
  | "state_plan"
  | "state_build"
  | "state_verify"
  | "state_ship"
  | "state_reflect";

⸻

12.2 StepId

type StepId =
  | "step_project_brief"
  | "step_scope"
  | "step_prd"
  | "step_acceptance_criteria"
  | "step_information_architecture"
  | "step_data_model"
  | "step_api_contract"
  | "step_test_strategy"
  | "step_mvp_plan"
  | "step_real_data_wiring"
  | "step_config_and_env"
  | "step_reproducibility"
  | "step_rollback_plan"
  | "step_small_sample_validation"
  | "step_issue_triage"
  | "step_debug_checklist"
  | "step_baseline"
  | "step_usability_acceptance"
  | "step_pr_summary"
  | "step_bugfix_report"
  | "step_observability"
  | "step_real_world_observation"
  | "step_offline_research"
  | "step_long_term_evidence";

⸻

12.3 ObligationId

type ObligationId =
  | "obligation_audit_trail"
  | "obligation_ai_governance_brief"
  | "obligation_uncertainty_policy"
  | "obligation_research_split"
  | "obligation_sop_version_detection"
  | "obligation_baseline_tracking";

⸻

12.4 ArtifactStatus

type ArtifactStatus =
  | "missing"
  | "draft"
  | "draft_blocked"
  | "complete"
  | "stale";

说明：

missing:
文件不存在。
draft:
文件存在，但未通过 check 或尚未完成。
draft_blocked:
文件存在，但 blocking criteria 失败。
complete:
文件存在，且最近一次 check pass。
stale:
曾经 complete，但文件 mtime 晚于 lastCheckedAt。

⸻

12.5 GateStatus

type GateStatus =
  | "pass"
  | "warning"
  | "blocked"
  | "not_applicable";

⸻

12.6 StepType

type StepType =
  | "sequential";

说明：

v1.0 不再使用 cross_cutting_step 作为 StepType。
横切机制统一建模为 CrossCuttingObligation。

⸻

12.7 Tier

type Tier =
  | "minimal"
  | "production"
  | "full";

⸻

12.8 TriggerMode

type TriggerMode =
  | "push"
  | "pull"
  | "injection"
  | "reminder";

⸻

12.9 PersistenceMode

type PersistenceMode =
  | "always_on"
  | "accumulating"
  | "event_based";

⸻

12.10 Severity

type Severity =
  | "info"
  | "warning"
  | "error";

⸻

12.11 Priority

type Priority =
  | "must"
  | "should"
  | "nice_to_have";

⸻

12.12 ActorType

type ActorType =
  | "user"
  | "ai_agent"
  | "system";

⸻

12.13 ClientType

type ClientType =
  | "cli"
  | "mcp"
  | "system";

⸻

12.14 LogType

type LogType =
  | "dev"
  | "research";

⸻

12.15 AuditEventType

type AuditEventType =
  | "project_initialized"
  | "gate_run"
  | "gate_failed"
  | "advance_succeeded"
  | "advance_failed"
  | "artifact_gate_blocked"
  | "baseline_created"
  | "reset_executed"
  | "sop_version_checked"
  | "sop_version_diff_detected"
  | "doctor_run"
  | "lock_acquired"
  | "lock_released"
  | "lock_stale_recovered";

⸻

12.16 AuditResult

type AuditResult =
  | "success"
  | "failed"
  | "pass"
  | "warning"
  | "blocked"
  | "detected"
  | "executed";

映射规则：

project_initialized → success
gate_run → pass / warning / blocked
gate_failed → blocked
advance_succeeded → success
advance_failed → failed
baseline_created → success
reset_executed → executed
sop_version_checked → success
sop_version_diff_detected → detected
doctor_run → executed
lock_acquired → success
lock_released → executed
lock_stale_recovered → executed

⸻

12.17 ErrorCode

type ErrorCode =
  | "OK"
  | "ERR_GATE_FAILED"
  | "ERR_ARTIFACT_INVALID"
  | "ERR_STATE_MACHINE"
  | "ERR_IO_OR_CONFIG"
  | "ERR_SOP_VERSION";

⸻

12.18 AcceptanceMethod

type AcceptanceMethod =
  | "automated_test"
  | "manual_review"
  | "dogfood_evidence"
  | "external_review";

⸻

12.19 TestSource

type TestSource =
  | "vitest";

说明：

v1.0 只支持 vitest。
v1.1 可扩展 jest / pytest / junit。

⸻

12.20 ActivationTrigger

type ActivationTrigger =
  | { type: "always_on" }
  | { type: "state_threshold"; activatesAfter: StateId }
  | { type: "event"; eventType: AuditEventType }
  | { type: "command"; command: string };

示例：

{ "type": "always_on" }
{ "type": "state_threshold", "activatesAfter": "state_design" }
{ "type": "event", "eventType": "project_initialized" }
{ "type": "command", "command": "ocn brief" }

⸻

13. BilingualMessage｜双语消息模型

13.1 类型定义

interface BilingualMessage {
  en: string;
  zh: string;
}

13.2 字段说明

字段	类型	必填	说明
en	string	是	英文消息
zh	string	是	中文消息

13.3 约束

en 和 zh trim 后不得为空。
en 和 zh 最大 2000 字符。
机器字段不得使用中文 key。

13.4 示例

{
  "en": "Required section is missing: Scenarios",
  "zh": "缺少必需章节：Scenarios｜使用场景"
}

⸻

14. Project｜项目模型

14.1 类型定义

interface Project {
  projectId: string;
  name: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  ocnVersion: string;
  sopProfileId: string;
  sopProfileVersion: string;
  sopLockedAt: string;
  tier: Tier;
}

14.2 字段说明

字段	类型	必填	说明
projectId	string	是	项目 stable id
name	string	是	项目名称
rootPath	string	是	项目根目录
createdAt	ISO UTC string	是	创建时间
updatedAt	ISO UTC string	是	更新时间
ocnVersion	string	是	初始化时 OCN 版本
sopProfileId	string	是	锁定 SOP Profile id
sopProfileVersion	string	是	锁定 SOP Profile 版本
sopLockedAt	ISO UTC string	是	SOP 锁定时间
tier	Tier	是	minimal / production / full

14.3 持久化位置

.ocoding/state.json

14.4 示例

{
  "projectId": "ocn",
  "name": "O'CodingNavigator",
  "rootPath": ".",
  "createdAt": "2026-04-27T15:00:00Z",
  "updatedAt": "2026-04-27T15:00:00Z",
  "ocnVersion": "0.1.0-alpha.1",
  "sopProfileId": "default-ai-coding-sop",
  "sopProfileVersion": "0.1.0",
  "sopLockedAt": "2026-04-27T15:00:00Z",
  "tier": "minimal"
}

⸻

15. ProjectState｜项目状态模型

15.1 类型定义

interface ProjectState {
  schemaVersion: "1.0";
  project: Project;
  currentStateId: StateId;
  currentStepId: StepId;
  artifactGateStatus: Partial<Record<StepId, ArtifactGateStatus>>;
  latestGateResult?: GateResult;
  lastUpdatedAt: string;
}

15.2 字段说明

字段	类型	必填	说明
schemaVersion	“1.0”	是	本地数据 schema 版本
project	Project	是	项目信息
currentStateId	StateId	是	当前 state
currentStepId	StepId	是	当前 step
artifactGateStatus	Partial<Record<StepId, ArtifactGateStatus>>	是	step 到 artifact gate 状态的映射
latestGateResult	GateResult	否	最近一次 gate 结果
lastUpdatedAt	ISO UTC string	是	最近更新时间

15.3 持久化位置

.ocoding/state.json

15.4 约束

currentStateId 和 currentStepId 是项目当前位置 source of truth。
不得使用 order 或 index 推断当前位置。
artifactGateStatus 中的 key 必须是 StepId。
recent logs / decisions / research 不写入 ProjectState，应由 BriefContent 生成时从 JSONL 动态读取。

⸻

16. SOPProfile｜SOP 配置模型

16.1 类型定义

interface SOPProfile {
  sopProfileId: string;
  version: string;
  name: BilingualMessage;
  description: BilingualMessage;
  states: State[];
  sequentialSteps: SequentialStep[];
  crossCuttingObligations: CrossCuttingObligation[];
  artifacts: ArtifactDefinition[];
}

16.2 字段说明

字段	类型	必填	说明
sopProfileId	string	是	SOP profile id
version	string	是	SOP 版本
name	BilingualMessage	是	SOP 名称
description	BilingualMessage	是	描述
states	State[]	是	状态定义
sequentialSteps	SequentialStep[]	是	顺序步骤定义
crossCuttingObligations	CrossCuttingObligation[]	是	横切义务定义
artifacts	ArtifactDefinition[]	是	Artifact 定义

16.3 持久化位置

.ocoding/sop.yaml

⸻

17. State｜状态模型

17.1 类型定义

interface State {
  stateId: StateId;
  name: BilingualMessage;
  purpose: BilingualMessage;
  order: number;
  allowedNextStateIds: StateId[];
  allowedRollbackStateIds: StateId[];
}

17.2 字段说明

字段	类型	必填	说明
stateId	StateId	是	状态 id
name	BilingualMessage	是	状态名称
purpose	BilingualMessage	是	状态目标
order	number	是	展示排序
allowedNextStateIds	StateId[]	是	合法下一状态
allowedRollbackStateIds	StateId[]	是	合法 rollback 状态

17.3 示例

{
  "stateId": "state_spec",
  "name": {
    "en": "SPEC",
    "zh": "需求定义"
  },
  "purpose": {
    "en": "Define product requirements and acceptance criteria.",
    "zh": "定义产品需求和验收标准。"
  },
  "order": 20,
  "allowedNextStateIds": ["state_design"],
  "allowedRollbackStateIds": ["state_discovery"]
}

⸻

18. SequentialStep｜顺序步骤模型

18.1 类型定义

interface SequentialStep {
  stepId: StepId;
  stateId: StateId;
  order: number;
  name: BilingualMessage;
  purpose: BilingualMessage;
  artifactId: string;
  requiredSectionIds: string[];
  qualityCheckIds: string[];
  gateRuleId: string;
}

18.2 字段说明

字段	类型	必填	说明
stepId	StepId	是	stable step id
stateId	StateId	是	所属 state
order	number	是	SOP step number × 10，仅排序
name	BilingualMessage	是	step 名称
purpose	BilingualMessage	是	step 目标
artifactId	string	是	产出 artifact id
requiredSectionIds	string[]	是	必需章节 id
qualityCheckIds	string[]	是	质量检查 id
gateRuleId	string	是	gate rule id

18.3 约束

stepId 是主键。
order 不得作为引用主键。
order 只适用于 SequentialStep。
CrossCuttingObligation 没有 order 字段。
artifactId 必须引用 ArtifactDefinition。
gateRuleId 必须引用 GateRule。

18.4 示例

{
  "stepId": "step_prd",
  "stateId": "state_spec",
  "order": 30,
  "name": {
    "en": "Product Requirements Document",
    "zh": "产品需求文档"
  },
  "purpose": {
    "en": "Define users, scenarios, requirements, risks, and rules.",
    "zh": "定义用户、场景、需求、风险和规则。"
  },
  "artifactId": "artifact_prd",
  "requiredSectionIds": [
    "section_problem",
    "section_goals",
    "section_non_goals",
    "section_users",
    "section_scenarios",
    "section_requirements"
  ],
  "qualityCheckIds": [
    "quality_risks_min_chars",
    "quality_exception_scenarios_min_items"
  ],
  "gateRuleId": "gate_step_prd"
}

⸻

19. CrossCuttingObligation｜横切义务模型

19.1 类型定义

interface CrossCuttingObligation {
  obligationId: ObligationId;
  name: BilingualMessage;
  primaryStateId: StateId;
  activationTrigger: ActivationTrigger;
  triggerMode: TriggerMode;
  persistence: PersistenceMode;
  relatedArtifactId?: string;
  description: BilingualMessage;
}

19.2 字段说明

字段	类型	必填	说明
obligationId	ObligationId	是	横切义务 id
name	BilingualMessage	是	名称
primaryStateId	StateId	是	主属 state
activationTrigger	ActivationTrigger	是	结构化激活规则
triggerMode	TriggerMode	是	push / pull / injection / reminder
persistence	PersistenceMode	是	always_on / accumulating / event_based
relatedArtifactId	string	否	相关 artifact
description	BilingualMessage	是	描述

19.3 示例

{
  "obligationId": "obligation_audit_trail",
  "name": {
    "en": "Audit Trail",
    "zh": "审计链"
  },
  "primaryStateId": "state_discovery",
  "activationTrigger": {
    "type": "event",
    "eventType": "project_initialized"
  },
  "triggerMode": "push",
  "persistence": "accumulating",
  "relatedArtifactId": "artifact_audit_trail",
  "description": {
    "en": "Record key workflow events automatically.",
    "zh": "自动记录关键流程事件。"
  }
}

19.4 约束

CrossCuttingObligation 不是 SequentialStep。
CrossCuttingObligation 不参与 step order。
CrossCuttingObligation 是否阻塞流程，由 gate rule 明确决定。
activationTrigger 不得使用 free-form string。

⸻

20. ArtifactDefinition｜产物定义模型

20.1 类型定义

interface ArtifactDefinition {
  artifactId: string;
  type: string;
  path: string;
  title: BilingualMessage;
  layer: ArtifactLayer;
  tierRequired: Tier[];
  mustReferenceArtifactIds: string[];
  optionalReferenceArtifactIds: string[];
}

20.2 ArtifactLayer

type ArtifactLayer =
  | "definition"
  | "design"
  | "plan"
  | "execution"
  | "governance";

20.3 字段说明

字段	类型	必填	说明
artifactId	string	是	artifact stable id
type	string	是	artifact 类型
path	string	是	文件路径
title	BilingualMessage	是	标题
layer	ArtifactLayer	是	层级
tierRequired	Tier[]	是	哪些 tier 需要
mustReferenceArtifactIds	string[]	是	必须引用的上游 artifact
optionalReferenceArtifactIds	string[]	是	可选引用

20.4 示例

{
  "artifactId": "artifact_prd",
  "type": "prd",
  "path": "docs/02-prd.md",
  "title": {
    "en": "Product Requirements Document",
    "zh": "产品需求文档"
  },
  "layer": "definition",
  "tierRequired": ["minimal", "production", "full"],
  "mustReferenceArtifactIds": ["artifact_scope"],
  "optionalReferenceArtifactIds": ["artifact_project_brief"]
}

⸻

21. Artifact｜产物实例模型

21.1 类型定义

interface Artifact {
  artifactId: string;
  path: string;
  status: ArtifactStatus;
  createdAt?: string;
  updatedAt?: string;
  lastCheckedAt?: string;
  fileMtime?: string;
  producedByStepId?: StepId;
}

21.2 字段说明

字段	类型	必填	说明
artifactId	string	是	artifact id
path	string	是	文件路径
status	ArtifactStatus	是	missing / draft / draft_blocked / complete / stale
createdAt	ISO UTC string	否	创建时间
updatedAt	ISO UTC string	否	更新时间
lastCheckedAt	ISO UTC string	否	最近检查时间
fileMtime	ISO UTC string	否	文件修改时间
producedByStepId	StepId	否	产出 step

21.3 stale 规则

如果 status = complete 且 fileMtime 晚于 lastCheckedAt，则 artifact 状态应显示为 stale。
If status = complete and fileMtime is later than lastCheckedAt, artifact should be shown as stale.
ocn check 后重新计算状态。
After ocn check, status is recalculated.

21.4 持久化位置

结构化状态可在：

.ocoding/state.json

正式内容在：

docs/*.md

⸻

22. RequiredSection｜必需章节模型

22.1 类型定义

interface RequiredSection {
  sectionId: string;
  canonical: string;
  aliases: string[];
  minHeadingLevel: number;
  maxHeadingLevel: number;
  severity: "blocked" | "warning";
  message: BilingualMessage;
}

22.2 字段说明

字段	类型	必填	说明
sectionId	string	是	section stable id
canonical	string	是	标准 heading
aliases	string[]	是	可匹配别名
minHeadingLevel	number	是	最小 heading level
maxHeadingLevel	number	是	最大 heading level
severity	blocked / warning	是	缺失时严重级别
message	BilingualMessage	是	缺失提示

22.3 匹配算法｜Matching Algorithm

匹配优先级：

1. 完全匹配 canonical
2. 完全匹配 aliases 中任意一项
3. 不匹配则 missing

匹配规则：

trim 前后空白
大小写不敏感
忽略 markdown heading 前缀
canonical 不需要重复写入 aliases
v1.0 不做模糊匹配
v1.0 不做语义相似度匹配

22.4 示例

{
  "sectionId": "section_scenarios",
  "canonical": "Scenarios｜使用场景",
  "aliases": [
    "Scenarios",
    "使用场景",
    "Use Cases",
    "User Scenarios",
    "用户场景"
  ],
  "minHeadingLevel": 2,
  "maxHeadingLevel": 3,
  "severity": "blocked",
  "message": {
    "en": "Scenarios section is missing.",
    "zh": "缺少 Scenarios｜使用场景 章节。"
  }
}

⸻

23. QualityCheck｜质量检查模型

23.1 类型定义

interface QualityCheck {
  qualityCheckId: string;
  type: QualityCheckType;
  targetSectionId: string;
  threshold?: number;
  severity: "warning" | "blocked";
  message: BilingualMessage;
  heuristic: true;
}

23.2 QualityCheckType

type QualityCheckType =
  | "min_chars"
  | "min_bullets"
  | "required_example"
  | "required_reference";

23.3 字段说明

字段	类型	必填	说明
qualityCheckId	string	是	quality check id
type	QualityCheckType	是	检查类型
targetSectionId	string	是	目标 section
threshold	number	否	阈值
severity	warning / blocked	是	严重级别
message	BilingualMessage	是	提示
heuristic	true	是	v1.0 必须为 true

23.4 约束

v1.0 QualityCheck 是启发式，不是语义质量判断。
QualityCheck 不调用 LLM Judge。
如果输出 warning，必须说明这是 heuristic。

⸻

24. GateRule｜门禁规则模型

24.1 类型定义

interface GateRule {
  gateRuleId: string;
  scope: "step" | "state";
  targetId: StepId | StateId;
  requiredArtifactIds: string[];
  requiredSectionIds: string[];
  qualityCheckIds: string[];
  blockingOnMissingArtifact: boolean;
  blockingOnMissingRequiredSection: boolean;
}

24.2 字段说明

字段	类型	必填	说明
gateRuleId	string	是	gate rule id
scope	step / state	是	作用范围
targetId	StepId / StateId	是	作用对象
requiredArtifactIds	string[]	是	必需 artifact
requiredSectionIds	string[]	是	必需 section
qualityCheckIds	string[]	是	质量检查
blockingOnMissingArtifact	boolean	是	artifact 缺失是否阻塞
blockingOnMissingRequiredSection	boolean	是	section 缺失是否阻塞

24.3 示例

{
  "gateRuleId": "gate_step_prd",
  "scope": "step",
  "targetId": "step_prd",
  "requiredArtifactIds": ["artifact_prd"],
  "requiredSectionIds": [
    "section_problem",
    "section_goals",
    "section_non_goals",
    "section_users",
    "section_scenarios",
    "section_requirements"
  ],
  "qualityCheckIds": [
    "quality_risks_min_chars"
  ],
  "blockingOnMissingArtifact": true,
  "blockingOnMissingRequiredSection": true
}

⸻

25. ArtifactGateStatus｜产物门禁状态模型

25.1 类型定义

interface ArtifactGateStatus {
  stepId: StepId;
  artifactId: string;
  artifactPath: string;
  status: GateStatus;
  missingRequiredSectionIds: string[];
  warningIds: string[];
  selfCheckConsistent: boolean;
  checkedAt: string;
}

25.2 字段说明

字段	类型	必填	说明
stepId	StepId	是	step id
artifactId	string	是	artifact id
artifactPath	string	是	artifact path
status	GateStatus	是	pass / warning / blocked
missingRequiredSectionIds	string[]	是	缺失 section
warningIds	string[]	是	warning id
selfCheckConsistent	boolean	是	self-check 是否与 AST 一致
checkedAt	ISO UTC string	是	检查时间

25.3 示例

{
  "stepId": "step_prd",
  "artifactId": "artifact_prd",
  "artifactPath": "docs/02-prd.md",
  "status": "blocked",
  "missingRequiredSectionIds": ["section_scenarios"],
  "warningIds": ["quality_risks_min_chars"],
  "selfCheckConsistent": false,
  "checkedAt": "2026-04-27T15:00:00Z"
}

⸻

26. GateResult｜门禁结果模型

26.1 类型定义

interface GateResult {
  gateResultId: string;
  stateId: StateId;
  stepId?: StepId;
  status: GateStatus;
  stepResults: ArtifactGateStatus[];
  warnings: BilingualMessage[];
  blocked: BilingualMessage[];
  nextActions: BilingualMessage[];
  checkedAt: string;
}

26.2 字段说明

字段	类型	必填	说明
gateResultId	string	是	gate result id
stateId	StateId	是	所属 state
stepId	StepId	否	当前 step
status	GateStatus	是	聚合结果
stepResults	ArtifactGateStatus[]	是	step gate 结果
warnings	BilingualMessage[]	是	warning
blocked	BilingualMessage[]	是	blocked
nextActions	BilingualMessage[]	是	下一步建议
checkedAt	ISO UTC string	是	检查时间

⸻

27. AuditEvent｜审计事件模型

27.1 类型定义

interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  timestamp: string;
  stateId?: StateId;
  stepId?: StepId;
  actor: ActorType;
  source: ClientType;
  result: AuditResult;
  reason?: BilingualMessage;
  relatedArtifactIds: string[];
  metadata?: Record<string, unknown>;
}

27.2 字段说明

字段	类型	必填	说明
eventId	string	是	audit event id
eventType	AuditEventType	是	事件类型
timestamp	ISO UTC string	是	时间
stateId	StateId	否	关联 state
stepId	StepId	否	关联 step
actor	ActorType	是	user / ai_agent / system
source	ClientType	是	cli / mcp / system
result	AuditResult	是	事件结果
reason	BilingualMessage	否	原因
relatedArtifactIds	string[]	是	关联 artifact
metadata	object	否	扩展信息

27.3 示例

{
  "eventId": "audit_20260427T150000Z_ab12cd",
  "eventType": "gate_failed",
  "timestamp": "2026-04-27T15:00:00Z",
  "stateId": "state_spec",
  "stepId": "step_prd",
  "actor": "user",
  "source": "cli",
  "result": "blocked",
  "reason": {
    "en": "Scenarios section is missing.",
    "zh": "缺少 Scenarios｜使用场景 章节。"
  },
  "relatedArtifactIds": ["artifact_prd"],
  "metadata": {
    "command": "ocn gate"
  }
}

27.4 持久化位置

机器可读：

.ocoding/events/audit-events.jsonl

人类可读：

docs/21-audit-trail.md

⸻

28. LogEntry｜日志条目模型

28.1 类型定义

interface LogEntry {
  logId: string;
  logType: LogType;
  timestamp: string;
  actor: ActorType;
  source: ClientType;
  summary: BilingualMessage;
  changedFiles: string[];
  testResultId?: string;
  risk?: BilingualMessage;
  nextAction?: BilingualMessage;
}

28.2 字段说明

字段	类型	必填	说明
logId	string	是	log id
logType	LogType	是	dev / research
timestamp	ISO UTC string	是	时间
actor	ActorType	是	actor
source	ClientType	是	cli / mcp
summary	BilingualMessage	是	摘要
changedFiles	string[]	是	修改文件
testResultId	string	否	测试结果
risk	BilingualMessage	否	风险
nextAction	BilingualMessage	否	下一步

28.3 持久化位置

机器可读：

.ocoding/events/log-events.jsonl

人类可读：

docs/18-dev-log.md
docs/17-research-log.md

⸻

29. DecisionEntry｜决策条目模型

29.1 类型定义

interface DecisionEntry {
  decisionId: string;
  timestamp: string;
  actor: "user";
  decision: BilingualMessage;
  context: BilingualMessage;
  options: BilingualMessage[];
  chosenOption: BilingualMessage;
  reason: BilingualMessage;
  risks: BilingualMessage[];
  relatedArtifactIds: string[];
}

29.2 字段说明

字段	类型	必填	说明
decisionId	string	是	decision id
timestamp	ISO UTC string	是	时间
actor	user	是	v1.0 只允许 user
decision	BilingualMessage	是	决策
context	BilingualMessage	是	背景
options	BilingualMessage[]	是	备选方案
chosenOption	BilingualMessage	是	选择
reason	BilingualMessage	是	理由
risks	BilingualMessage[]	是	风险
relatedArtifactIds	string[]	是	关联 artifact

29.3 持久化位置

机器可读：

.ocoding/events/decision-events.jsonl

人类可读：

docs/19-decision-log.md

29.4 约束

DecisionEntry 只能通过 CLI 用户写入。
MCP v1.0 不允许直接写 DecisionEntry。
AI / MCP 可以建议 decision draft，但不能写入 formal DecisionEntry。

⸻

30. ResearchEntry｜研究条目模型

30.1 类型定义

interface ResearchEntry {
  researchId: string;
  timestamp: string;
  actor: ActorType;
  researchQuestion: BilingualMessage;
  hypothesis?: BilingualMessage;
  method?: BilingualMessage;
  finding?: BilingualMessage;
  entersProductionLine: boolean;
  relatedArtifactIds: string[];
}

30.2 字段说明

字段	类型	必填	说明
researchId	string	是	research id
timestamp	ISO UTC string	是	时间
actor	ActorType	是	actor
researchQuestion	BilingualMessage	是	研究问题
hypothesis	BilingualMessage	否	假设
method	BilingualMessage	否	方法
finding	BilingualMessage	否	发现
entersProductionLine	boolean	是	是否进入生产线
relatedArtifactIds	string[]	是	关联 artifact

30.3 持久化位置

机器可读：

.ocoding/events/research-events.jsonl

人类可读：

docs/17-research-log.md

⸻

31. Baseline｜基线模型

31.1 类型定义

interface Baseline {
  baselineId: string;
  createdAt: string;
  version: string;
  commit?: string;
  currentStateId: StateId;
  currentStepId: StepId;
  availableFeatures: BilingualMessage[];
  unavailableFeatures: BilingualMessage[];
  startCommand?: string;
  testCommand?: string;
  acceptanceResult?: GateStatus;
  knownIssues: BilingualMessage[];
  rollbackMethod: BilingualMessage;
  nextGoal?: BilingualMessage;
}

31.2 字段说明

字段	类型	必填	说明
baselineId	string	是	baseline id
createdAt	ISO UTC string	是	创建时间
version	string	是	版本
commit	string	否	git commit
currentStateId	StateId	是	当前 state
currentStepId	StepId	是	当前 step
availableFeatures	BilingualMessage[]	是	可用功能
unavailableFeatures	BilingualMessage[]	是	不可用功能
startCommand	string	否	启动命令
testCommand	string	否	测试命令
acceptanceResult	GateStatus	否	验收结果
knownIssues	BilingualMessage[]	是	已知问题
rollbackMethod	BilingualMessage	是	回滚方式
nextGoal	BilingualMessage	否	下一步目标

31.3 持久化位置

机器可读：

.ocoding/baselines/baseline-<timestamp>.json

人类可读：

docs/15-baseline.md

⸻

32. TestRecord｜测试记录模型

32.1 类型定义

interface TestRecord {
  testRecordId: string;
  createdAt: string;
  source: TestSource;
  sourcePath: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs?: number;
  rawSummary?: Record<string, unknown>;
}

32.2 字段说明

字段	类型	必填	说明
testRecordId	string	是	test record id
createdAt	ISO UTC string	是	创建时间
source	TestSource	是	测试来源
sourcePath	string	是	用户显式提供的路径
total	number	是	总数
passed	number	是	通过
failed	number	是	失败
skipped	number	是	跳过
durationMs	number	否	耗时
rawSummary	object	否	原始摘要

32.3 持久化位置

.ocoding/test-results/test-record-<timestamp>.json

32.4 约束

OCN 只读取用户显式传入的 sourcePath。
OCN 不扫描项目寻找测试结果。
sourcePath 可以是显式相对路径。
sourcePath 不得默认越过项目根目录。

⸻

33. LockState｜锁状态模型

33.1 类型定义

interface LockState {
  pid: number;
  createdAt: string;
  command: string;
  client: ClientType;
}

33.2 字段说明

字段	类型	必填	说明
pid	number	是	进程 id
createdAt	ISO UTC string	是	创建时间
command	string	是	当前命令
client	ClientType	是	cli / mcp

33.3 持久化位置

.ocoding/.lock

33.4 约束

写操作必须先 acquire lock。
每 200ms 重试一次。
最多等待 5 秒。
pid 不存在且 createdAt 超过 30 秒，可视为 stale lock。

⸻

34. SOPVersionDiff｜SOP 版本差异模型

34.1 类型定义

interface SOPVersionDiff {
  fromVersion: string;
  toVersion: string;
  addedSteps: StepId[];
  removedSteps: StepId[];
  changedSteps: StepId[];
  addedArtifacts: string[];
  changedArtifacts: string[];
  changedGateRules: string[];
  breakingChanges: BilingualMessage[];
}

34.2 持久化位置

默认不持久化。
Default: not persisted.

可作为命令输出：

ocn sop diff

⸻

35. SOPUpgradePlan｜SOP 升级计划模型

35.1 类型定义

interface SOPUpgradePlan {
  planId: string;
  createdAt: string;
  currentVersion: string;
  targetVersion: string;
  diff: SOPVersionDiff;
  impact: BilingualMessage[];
  recommendedActions: BilingualMessage[];
  shouldUpgradeNow: boolean;
}

35.2 持久化位置

v1.0 默认只输出，不修改文件。
v1.0 outputs only and does not modify files.

可选保存路径：

.ocoding/upgrade-plan-<timestamp>.json

但 v1.0 不强制保存。

⸻

36. DoctorReport｜诊断报告模型

36.1 类型定义

interface DoctorReport {
  reportId: string;
  createdAt: string;
  status: GateStatus;
  issues: DoctorIssue[];
}
interface DoctorIssue {
  issueId: string;
  severity: Severity;
  message: BilingualMessage;
  relatedFile?: string;
  suggestedAction?: BilingualMessage;
  autoFixable: boolean;
  relatedCommand?: string;
}

36.2 字段说明

字段	类型	必填	说明
reportId	string	是	doctor report id
createdAt	ISO UTC string	是	创建时间
status	GateStatus	是	总体状态
issues	DoctorIssue[]	是	问题列表

36.3 持久化位置

普通 doctor 默认不持久化。
普通 ocn doctor only outputs report and does not persist by default.

snapshot 持久化：

.ocoding/snapshots/snapshot-<timestamp>.json

⸻

37. BriefContent｜简报内容模型

37.1 类型定义

interface BriefContent {
  generatedAt: string;
  project: Project;
  currentStateId: StateId;
  currentStepId: StepId;
  currentBlockers: BilingualMessage[];
  completedArtifactIds: string[];
  missingArtifactIds: string[];
  latestGateResult?: GateResult;
  recentDecisionIds: string[];
  recentLogIds: string[];
  recentResearchIds: string[];
  aiGovernanceRules: BilingualMessage[];
  uncertaintyPolicy: BilingualMessage[];
  nextActions: BilingualMessage[];
}

37.2 数据来源

currentStateId / currentStepId 来自 state.json。
latestGateResult 来自 state.json。
recentDecisionIds 来自 .ocoding/events/decision-events.jsonl。
recentLogIds 来自 .ocoding/events/log-events.jsonl。
recentResearchIds 来自 .ocoding/events/research-events.jsonl。

37.3 持久化位置

默认不持久化。
Default: not persisted.

作为命令输出：

ocn brief

或 MCP 返回：

navigator.brief

⸻

38. PromptContent｜Prompt 内容模型

38.1 类型定义

interface PromptContent {
  generatedAt: string;
  targetStepId: StepId;
  targetArtifactId: string;
  requiredSections: RequiredSection[];
  blockingCriteria: BilingualMessage[];
  warningCriteria: BilingualMessage[];
  qualityChecklist: QualityCheck[];
  aiGovernanceRules: BilingualMessage[];
  uncertaintyPolicy: BilingualMessage[];
  instruction: BilingualMessage;
}

38.2 持久化位置

默认不持久化。
Default: not persisted.

作为命令输出：

ocn prompt next

或 MCP 返回：

navigator.generate_next_prompt

⸻

39. MCPToolResult｜MCP 工具结果模型

39.1 类型定义

interface MCPToolResult<T = unknown> {
  code: ErrorCode;
  message: BilingualMessage;
  data?: T;
}

39.2 示例

{
  "code": "ERR_ARTIFACT_INVALID",
  "message": {
    "en": "Required section is missing: Scenarios",
    "zh": "缺少必需章节：Scenarios｜使用场景"
  },
  "data": {
    "stepId": "step_prd",
    "artifact": "docs/02-prd.md",
    "status": "blocked"
  }
}

⸻

40. ErrorResult｜错误结果模型

40.1 类型定义

interface ErrorResult {
  code: ErrorCode;
  message: BilingualMessage;
  nextActions: BilingualMessage[];
  relatedFile?: string;
  details?: Record<string, unknown>;
}

40.2 字段说明

字段	类型	必填	说明
code	ErrorCode	是	错误码
message	BilingualMessage	是	双语消息
nextActions	BilingualMessage[]	是	下一步建议
relatedFile	string	否	相关文件
details	object	否	扩展细节

⸻

41. .ocoding/state.json 结构｜state.json Structure

41.1 结构示例

{
  "schemaVersion": "1.0",
  "project": {
    "projectId": "ocn",
    "name": "O'CodingNavigator",
    "rootPath": ".",
    "createdAt": "2026-04-27T15:00:00Z",
    "updatedAt": "2026-04-27T15:00:00Z",
    "ocnVersion": "0.1.0-alpha.1",
    "sopProfileId": "default-ai-coding-sop",
    "sopProfileVersion": "0.1.0",
    "sopLockedAt": "2026-04-27T15:00:00Z",
    "tier": "minimal"
  },
  "currentStateId": "state_design",
  "currentStepId": "step_data_model",
  "artifactGateStatus": {
    "step_prd": {
      "stepId": "step_prd",
      "artifactId": "artifact_prd",
      "artifactPath": "docs/02-prd.md",
      "status": "pass",
      "missingRequiredSectionIds": [],
      "warningIds": [],
      "selfCheckConsistent": true,
      "checkedAt": "2026-04-27T15:00:00Z"
    }
  },
  "latestGateResult": null,
  "lastUpdatedAt": "2026-04-27T15:00:00Z"
}

⸻

42. .ocoding/sop.yaml 结构｜sop.yaml Structure

42.1 结构示例

sopProfileId: default-ai-coding-sop
version: 0.1.0
name:
  en: Default AI Coding SOP
  zh: 默认 AI Coding SOP
description:
  en: Default structured workflow for AI coding projects.
  zh: AI Coding 项目的默认结构化流程。
states:
  - stateId: state_discovery
    name:
      en: DISCOVERY
      zh: 发现
    purpose:
      en: Define project and scope.
      zh: 定义项目和范围。
    order: 10
    allowedNextStateIds:
      - state_spec
    allowedRollbackStateIds: []
sequentialSteps:
  - stepId: step_prd
    stateId: state_spec
    order: 30
    name:
      en: Product Requirements Document
      zh: 产品需求文档
    purpose:
      en: Define users, scenarios, requirements, risks, and rules.
      zh: 定义用户、场景、需求、风险和规则。
    artifactId: artifact_prd
    requiredSectionIds:
      - section_problem
      - section_goals
      - section_scenarios
    qualityCheckIds:
      - quality_risks_min_chars
    gateRuleId: gate_step_prd
crossCuttingObligations:
  - obligationId: obligation_audit_trail
    name:
      en: Audit Trail
      zh: 审计链
    primaryStateId: state_discovery
    activationTrigger:
      type: event
      eventType: project_initialized
    triggerMode: push
    persistence: accumulating
    relatedArtifactId: artifact_audit_trail
    description:
      en: Record key workflow events automatically.
      zh: 自动记录关键流程事件。

⸻

43. .ocoding/gates.yaml 结构｜gates.yaml Structure

43.1 结构示例

requiredSections:
  - sectionId: section_scenarios
    canonical: "Scenarios｜使用场景"
    aliases:
      - "Scenarios"
      - "使用场景"
      - "Use Cases"
      - "User Scenarios"
      - "用户场景"
    minHeadingLevel: 2
    maxHeadingLevel: 3
    severity: blocked
    message:
      en: Scenarios section is missing.
      zh: 缺少 Scenarios｜使用场景 章节。
qualityChecks:
  - qualityCheckId: quality_risks_min_chars
    type: min_chars
    targetSectionId: section_risks
    threshold: 200
    severity: warning
    heuristic: true
    message:
      en: Risks section may be too shallow. This is a heuristic warning.
      zh: 风险章节可能过浅。这是启发式提醒。
gateRules:
  - gateRuleId: gate_step_prd
    scope: step
    targetId: step_prd
    requiredArtifactIds:
      - artifact_prd
    requiredSectionIds:
      - section_problem
      - section_goals
      - section_non_goals
      - section_users
      - section_scenarios
      - section_requirements
    qualityCheckIds:
      - quality_risks_min_chars
    blockingOnMissingArtifact: true
    blockingOnMissingRequiredSection: true

⸻

44. .ocoding/config.yaml 结构｜config.yaml Structure

44.1 类型定义

interface OCNConfig {
  languageMode: "bilingual";
  defaultTier: Tier;
  debug: boolean;
  trace: boolean;
  lockTimeoutMs: number;
  lockRetryIntervalMs: number;
  staleLockAfterMs: number;
}

44.2 示例

languageMode: bilingual
defaultTier: minimal
debug: false
trace: false
lockTimeoutMs: 5000
lockRetryIntervalMs: 200
staleLockAfterMs: 30000

44.3 约束

v1.0 languageMode 固定为 bilingual。
v1.0 不支持 locale 切换。

⸻

45. .ocoding/events/*.jsonl 结构｜Events JSONL Structure

45.1 文件列表

.ocoding/events/audit-events.jsonl
.ocoding/events/log-events.jsonl
.ocoding/events/decision-events.jsonl
.ocoding/events/research-events.jsonl

45.2 写入规则

每条记录一行。
每行必须是完整 JSON。
不得跨行写一个对象。
写入必须 append-only。
修改历史事件必须通过追加 correction event，而不是直接改旧行。

⸻

46. Data Model 与 API Contract 的边界

本文档定义数据结构，不定义函数签名。

This document defines data structures, not function signatures.

下一份 docs/06-api-contract.md 应基于本文档定义：

CLI command contract
Core Engine function contract
MCP tool contract
Gate result contract
Doctor report contract
Error result contract
Bilingual message contract
Lock state contract
Event persistence contract

⸻

47. Data Model Self-check｜数据模型自检

✓ IA Amendment DM-001
✓ ID Generation Strategy
✓ Field Constraint Rules
✓ Schema Versioning
✓ Dual Persistence Strategy
✓ Serialization Layer
✓ Object Ownership and Mutation Matrix
✓ Data Model ERD
✓ Key Field Dictionary
✓ Project
✓ ProjectState
✓ SOPProfile
✓ State
✓ SequentialStep
✓ CrossCuttingObligation
✓ ArtifactDefinition
✓ Artifact
✓ RequiredSection
✓ QualityCheck
✓ GateRule
✓ ArtifactGateStatus
✓ GateResult
✓ AuditEvent
✓ LogEntry
✓ DecisionEntry
✓ ResearchEntry
✓ Baseline
✓ TestRecord
✓ LockState
✓ SOPVersionDiff
✓ SOPUpgradePlan
✓ DoctorReport
✓ BriefContent
✓ PromptContent
✓ MCPToolResult
✓ ErrorResult
✓ BilingualMessage
✓ Enum definitions
✓ state.json structure
✓ sop.yaml structure
✓ gates.yaml structure
✓ config.yaml structure
✓ events jsonl structure
✓ Persistence boundaries

⸻

48. 下一步｜Next Step

完成本文档后，进入下一步：

After this document, move to:

#7｜API Contract 接口契约文档
docs/06-api-contract.md

下一份文档将基于本文档定义：

The next document will define based on this document:

CLI command contracts
Core Engine function contracts
MCP tool contracts
Input / Output schemas
Error contracts
Bilingual message contracts
Gate result contracts
Doctor report contracts
Lock state contracts
Event persistence contracts

特别注意：

Special note:

API Contract 不得重新定义数据模型。
API Contract must not redefine the data model.
如果 API Contract 发现字段缺失，应写入 Data Model Amendment。
If API Contract finds missing fields, write a Data Model Amendment.
API Contract 必须继承本文档的 ID、字段约束、双轨持久化、schema version 和权限边界。
API Contract must inherit ID strategy, field constraints, dual persistence, schema versioning, and mutation boundaries from this document.