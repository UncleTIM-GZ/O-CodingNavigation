# O’CodingNavigator Acceptance Criteria
# #4｜Acceptance Criteria 验收标准文档 v1.1
文档路径：`docs/03-acceptance-criteria.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.1`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
当前状态：`SPEC`  
当前 Step：`step_acceptance_criteria`  
依赖文档：  
- `docs/00-project-brief.md`
- `docs/01-scope.md`
- `docs/02-prd.md`
对应 SOP：第 4 步｜先写验收标准
---
# 1. 文档目的｜Purpose
本文档用于把 `docs/02-prd.md` 中的产品需求转成可执行、可审查、可测试的验收标准。
This document converts the product requirements in `docs/02-prd.md` into executable, reviewable, and testable acceptance criteria.
本文档回答：
1. 每个核心功能如何判断完成？  
   How do we determine whether each core function is complete?
2. 每条 AC 在哪个阶段验收？  
   At which phase should each AC be accepted?
3. 每条 AC 的优先级是什么？  
   What is the priority of each AC?
4. 每条 AC 来自 PRD 的哪一条需求？  
   Which PRD requirement does each AC trace back to?
5. 每条 AC 如何验收？  
   How should each AC be accepted?
6. 每条 AC 的验收结果是什么？  
   What is the expected acceptance result?
7. 哪些情况必须 block？  
   Which cases must be blocked?
8. 哪些情况只 warning？  
   Which cases should only warn?
9. 如何验证 OCN 能防止 artifact fake completion？  
   How do we verify that OCN prevents artifact fake completion?
---
# 2. 验收原则｜Acceptance Principles
## 2.1 文件存在不等于完成｜File Existence Does Not Mean Completion
OCN 不允许把 artifact 文件存在等同于 step 完成。
OCN must not treat artifact file existence as step completion.
验收规则：
```text
Artifact exists ≠ Step complete
Artifact exists + required sections pass + blocking criteria pass = Step may complete

⸻

2.2 当前 Step Gate 优先｜Current Step Gate First

每一个当前 step 都必须先通过 Step Artifact Gate，才能进入下一状态。

Each current step must pass Step Artifact Gate before advancing.

⸻

2.3 Given / When / Then 为主｜Given / When / Then First

本文档中的验收标准优先使用以下格式：

This document uses the following format as the primary acceptance structure:

Given
When
Then
And
Result
Error Code

⸻

2.4 机器 key 英文，人类信息双语｜English Stable Keys, Bilingual Messages

机器可读字段必须使用英文 stable key。
人类可读内容必须中英文双语。

Machine-readable keys must use English stable keys.
Human-readable content must be bilingual Chinese-English.

⸻

2.5 v1.0 不做 LLM Judge｜No LLM Judge in v1.0

v1.0 只验收确定性结构检查和启发式 warning。
v1.0 does not verify deep semantic quality.

v1.0 does not include full LLM Judge.

⸻

2.6 Phase 是验收时机分组｜Phase as Acceptance Grouping

Phase 表示该 AC 在哪个发布阶段必须验收通过，不是运行时功能。

Phase indicates at which release phase an AC must be accepted. It is not runtime functionality.

Phase: alpha
Phase: beta
Phase: GA

规则：

Phase: alpha 的 AC 在 alpha、beta、GA 都必须继续通过。
Phase: beta 的 AC 在 beta、GA 都必须继续通过。
Phase: GA 的 AC 在 GA 发布前必须通过。

Phase 不代表功能只能在该阶段实现。
Phase does not mean the feature can only be implemented in that phase.

某个 GA AC 可以提前实现，但 alpha / beta 验收时不强制测试。
A GA AC may be implemented earlier, but it is not required for alpha / beta acceptance.

⸻

2.7 Priority 是发布约束强度｜Priority as Release Constraint

Priority 表示该 AC 对发布的约束强度。

Priority indicates the release constraint level.

must
should
nice-to-have

must

违反则不能进入对应发布阶段。

If violated, the release phase cannot proceed.

should

应满足；如果不满足，必须有书面豁免理由。

Should be satisfied. If not, a written exemption is required.

nice-to-have

可延后，不阻塞当前版本。

Can be deferred and does not block the current version.

⸻

2.8 Traceability 必须明确｜Traceability Required

每条 AC 必须引用其来源需求。

Each AC must reference its source requirement.

格式：

Traceability: PRD 11.8｜Step Artifact Gate

如果 AC 找不到 PRD 来源，说明它可能在创造新需求。
If an AC cannot trace back to PRD, it may be creating new requirements.

这种情况必须先补 PRD amendment，或删除该 AC。
In that case, add a PRD amendment first or remove the AC.

⸻

2.9 Acceptance Method 固定枚举｜Acceptance Method Enum

每条 AC 必须标明验收方式。

Each AC must specify acceptance method.

允许值：

automated test
manual review
dogfood evidence
external review

⸻

2.10 所有错误路径必须稳定退出｜Stable Exit for Error Paths

所有错误路径 AC 隐含以下规则：

All error-path ACs imply the following:

OCN 不得 unhandled exception。
OCN must not leak unhandled exceptions.
OCN 必须以 stable exit code 退出。
OCN must exit with stable exit code.
OCN 必须输出 error code。
OCN must output error code.
OCN 必须输出中英文提示。
OCN must output bilingual message.
OCN 应尽可能输出 next action。
OCN should output next action whenever possible.

⸻

3. AC 标准格式｜Standard AC Format

每条 AC 必须采用以下格式：

Each AC must follow this format:

## AC-DOMAIN-001｜Title
Phase: alpha | beta | GA  
Priority: must | should | nice-to-have  
Traceability: PRD x.x｜Requirement Name  
Acceptance Method: automated test | manual review | dogfood evidence | external review  
Given ...
When ...
Then ...
And ...
Result: pass | warning | blocked | not_applicable  
Error Code: OK | ERR_GATE_FAILED | ERR_ARTIFACT_INVALID | ERR_STATE_MACHINE | ERR_IO_OR_CONFIG | ERR_SOP_VERSION | N/A

⸻

4. 验收状态定义｜Acceptance Result States

所有验收结果必须落入以下状态之一：

All acceptance results must be one of:

pass
warning
blocked
not_applicable

4.1 pass

满足当前验收标准，可以继续。

Criteria satisfied. May continue.

4.2 warning

存在风险或不足，但不一定阻止推进。

Risk or insufficiency exists, but may not block transition.

4.3 blocked

存在阻塞项，不允许进入下一状态。

Blocking item exists. State transition is not allowed.

4.4 not_applicable

当前 tier、state、phase 或场景不适用。

Not applicable for current tier, state, phase, or scenario.

⸻

5. Error Code 验收规则｜Error Code Acceptance Rules

v1.0 必须支持以下稳定错误码：

v1.0 must support stable error codes:

Error Code	含义 Meaning
OK	成功 / Success
ERR_GATE_FAILED	Gate failed
ERR_ARTIFACT_INVALID	Artifact missing or invalid
ERR_STATE_MACHINE	State machine error
ERR_IO_OR_CONFIG	Config, lock, IO, unsupported format error
ERR_SOP_VERSION	SOP version incompatibility
N/A	不适用，通常用于人工验收、dogfood evidence、external review

所有 CLI 错误输出必须包含：

All CLI error output must include:

error code
bilingual human-readable message
next action if available

⸻

6. Performance Acceptance Baseline｜性能验收基准

本节定义性能 AC 的统一测量条件。

This section defines the shared measurement baseline for performance ACs.

6.1 Reference Hardware｜参考硬件

满足以下任一环境：

Any of the following environments:

Apple M2, 16GB RAM, macOS 15
or Ubuntu 22.04, 4-core, 8GB RAM, NVMe SSD

6.2 Runtime｜运行环境

Node.js Active LTS
Local filesystem
No cloud dependency
No network dependency unless explicitly stated

6.3 Sample｜样本

100 executions
First 5 executions discarded as warmup
P95 measured from remaining executions

6.4 Mode｜启动模式

Hot start by default
SOP Loader already cached where applicable
Cold start is not mandatory in v1.0 unless explicitly stated

6.5 Typical Project｜典型项目

docs/ markdown artifact count: 10–15
average markdown artifact size: 5KB
max single markdown artifact size: 50KB
.ocoding/ total size < 200KB
state.json < 20KB
audit-trail.md < 100KB

6.6 Heavy Project｜重型项目

Heavy Project 仅记录，不作为 v1.0 强制验收条件。

Heavy Project is recorded only and is not mandatory for v1.0 acceptance.

artifact count: 30
audit-trail.md > 1MB
.ocoding/ total size > 1MB

⸻

7. Project Initialization｜项目初始化

AC-INIT-001｜minimal tier 初始化

Phase: alpha
Priority: must
Traceability: PRD 11.1｜Project Initialization
Acceptance Method: automated test

Given 当前目录没有 .ocoding/
When 用户执行：

ocn init --tier minimal

Then 系统必须创建：

.ocoding/
docs/
.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
.ocoding/config.yaml
docs/21-audit-trail.md

And state.json 必须包含：

currentStateId
currentStepId
sopProfileId
sopProfileVersion
sopLockedAt
tier

And tier 必须为：

minimal

Result: pass
Error Code: OK

⸻

AC-INIT-002｜默认 minimal tier

Phase: alpha
Priority: must
Traceability: PRD 11.1｜Project Initialization
Acceptance Method: automated test

Given 当前目录没有 .ocoding/
When 用户执行：

ocn init

Then 系统必须等同于：

ocn init --tier minimal

And state.json.tier 必须为：

minimal

Result: pass
Error Code: OK

⸻

AC-INIT-003｜production tier 初始化

Phase: beta
Priority: must
Traceability: PRD 11.1｜Project Initialization, PRD 16｜Phased Requirement Table
Acceptance Method: automated test

Given 当前目录没有 .ocoding/
When 用户执行：

ocn init --tier production

Then 系统必须创建或注册 production tier 所需 artifact 集。
And state.json.tier 必须为：

production

And production tier 必须包含 minimal tier artifact 集。

Result: pass
Error Code: OK

⸻

AC-INIT-004｜full tier 初始化

Phase: GA
Priority: must
Traceability: PRD 11.1｜Project Initialization, PRD 16｜Phased Requirement Table
Acceptance Method: automated test

Given 当前目录没有 .ocoding/
When 用户执行：

ocn init --tier full

Then 系统必须注册完整 artifact 集。
And state.json.tier 必须为：

full

Result: pass
Error Code: OK

⸻

AC-INIT-005｜重复初始化保护

Phase: alpha
Priority: must
Traceability: PRD 14.1｜Exception Scenarios
Acceptance Method: automated test

Given 当前目录已经存在 .ocoding/
When 用户执行：

ocn init --tier minimal

Then 系统不得覆盖现有 state.json。
And 系统必须输出中英文提示：

OCN project already initialized.
OCN 项目已经初始化。

And 提示用户可使用：

ocn reset --keep-docs

Result: blocked
Error Code: ERR_STATE_MACHINE

⸻

AC-INIT-006｜init 创建 audit trail

Phase: alpha
Priority: must
Traceability: PRD 11.16｜Audit Trail, PRD 12.9｜Audit Rule
Acceptance Method: automated test

Given 当前目录没有 .ocoding/
When 用户执行：

ocn init --tier minimal

Then 系统必须创建：

docs/21-audit-trail.md

And docs/21-audit-trail.md 必须包含 OCN metadata header。
And 必须包含第一条 audit event：

event_type: project_initialized
sopProfileId
sopProfileVersion
ocnVersion
tier
timestamp

Result: pass
Error Code: OK

⸻

8. State Machine｜状态机

AC-STATE-001｜初始状态

Phase: alpha
Priority: must
Traceability: PRD 5.1｜v1.0 Overall Goal
Acceptance Method: automated test

Given 项目刚完成：

ocn init --tier minimal

When 用户执行：

ocn status

Then 当前状态必须为：

state_discovery

And 当前 step 必须为：

step_project_brief

Result: pass
Error Code: OK

⸻

AC-STATE-002｜非法状态跳转阻止

Phase: alpha
Priority: must
Traceability: PRD 12.1｜State Transition Rule, PRD 14.8｜Illegal State Transition
Acceptance Method: automated test

Given 当前状态为：

state_discovery

When 用户试图直接跳转到：

state_build

Then 系统必须阻止。

Result: blocked
Error Code: ERR_STATE_MACHINE

⸻

AC-STATE-003｜currentStateId 和 currentStepId 是 source of truth

Phase: alpha
Priority: must
Traceability: PRD 12.7｜Step ID Rule
Acceptance Method: automated test

Given .ocoding/state.json 存在
When 系统读取当前状态
Then 系统必须使用：

currentStateId
currentStepId

作为 source of truth。
And 数字 order 只能用于排序和展示。

Result: pass
Error Code: OK

⸻

9. Status｜状态查看

AC-STATUS-001｜status 基础输出

Phase: alpha
Priority: must
Traceability: PRD 11.2｜Status
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn status

Then 输出必须包含：

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

And 人类可读信息必须中英文双语。

Result: pass
Error Code: OK

⸻

AC-STATUS-002｜status 不写 audit

Phase: alpha
Priority: must
Traceability: PRD 11.2｜Status, PRD 12.9｜Audit Rule
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn status

Then 系统不得向 docs/21-audit-trail.md 写入 audit event。

Result: pass
Error Code: OK

⸻

10. Brief｜会话简报

AC-BRIEF-001｜brief 必须包含核心上下文

Phase: alpha
Priority: must
Traceability: PRD 11.3｜Brief
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn brief

Then 输出必须包含：

当前项目目标 / Current project goal
当前状态 / Current state
当前 step id / Current step id
当前 tier / Current tier
当前阻塞 / Current blockers
已完成 artifact / Completed artifacts
缺失 artifact / Missing artifacts
当前 Step Artifact Gate 状态 / Current Step Artifact Gate status
最近关键决策 / Recent key decisions
下一步行动 / Next actions
AI 本轮应该做什么 / What AI should do
AI 本轮不应该做什么 / What AI should not do
AI Governance Rules

Result: pass
Error Code: OK

⸻

AC-BRIEF-002｜brief 必须注入 AI Governance Rules

Phase: alpha
Priority: must
Traceability: PRD 11.3｜Brief, PRD 12.12｜AI Governance Rule
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn brief

Then 输出必须包含 AI Governance Rules。
And 至少包含：

AI must not advance state.
AI 不得自动推进状态。
AI must not modify SOP profile.
AI 不得自动修改 SOP profile。
AI must not mark blocked artifact as complete.
AI 不得把未通过门禁的产物标记为完成。

Result: pass
Error Code: OK

⸻

AC-BRIEF-003｜长上下文恢复

Phase: GA
Priority: must
Traceability: PRD 19｜Success Criteria
Acceptance Method: dogfood evidence

Given 项目已有至少：

3 artifacts
3 dev log entries
1 decision log entry
1 gate result

When 用户执行：

ocn brief

Then brief 必须足以让 AI 理解当前状态和下一步。
And dogfood report 必须记录一次长上下文恢复案例。

Result: pass
Error Code: N/A

⸻

11. Prompt Next｜下一步 Prompt

AC-PROMPT-001｜prompt next 注入当前 step contract

Phase: alpha
Priority: must
Traceability: PRD 11.4｜Prompt Next, PRD 12.5｜Prompt Injection Rule
Acceptance Method: automated test

Given 当前 step 为：

step_prd

When 用户执行：

ocn prompt next

Then 输出必须包含 step_prd 的 required sections：

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

And 输出必须要求 AI 附上：

Step Artifact Gate Self-check｜步骤产物门禁自检

Result: pass
Error Code: OK

⸻

AC-PROMPT-002｜缺少 Scenarios 时不得标记完成

Phase: alpha
Priority: must
Traceability: PRD 11.4｜Prompt Next, PRD 12.6｜Self-check Rule
Acceptance Method: automated test

Given 当前 step 为：

step_prd

When 用户执行：

ocn prompt next

Then prompt 必须包含：

不要把缺少 Scenarios｜使用场景 的 PRD 标记为完成。
Do not mark a PRD missing Scenarios｜使用场景 as complete.

Result: pass
Error Code: OK

⸻

12. Artifact Creation｜产物创建

AC-DOC-001｜创建 PRD 模板

Phase: alpha
Priority: must
Traceability: PRD 11.5｜Artifact Creation, PRD 15.14｜Language Strategy
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn doc create prd

Then 系统必须创建：

docs/02-prd.md

And 模板必须包含中英文双语标题。
And 至少包含：

## Problem｜问题
## Goals｜目标
## Non-goals｜非目标
## Users｜用户
## Scenarios｜使用场景
## Requirements｜需求
## Risks｜风险
## Business Rules｜业务规则
## Permission Rules｜权限规则
## Exception Scenarios｜异常场景
## Non-functional Requirements｜非功能需求

Result: pass
Error Code: OK

⸻

AC-DOC-002｜不支持 spec 独立文档

Phase: alpha
Priority: must
Traceability: PRD 11.5｜Artifact Creation, PRD 12.2｜Artifact Rule
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn doc create spec

Then 系统必须拒绝。
And 输出：

Spec Profile is not an independent document.
Spec Profile 不是独立文档。

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-DOC-003｜模板包含标准 Self-check Block

Phase: alpha
Priority: must
Traceability: PRD 11.8｜Step Artifact Gate, PRD 12.6｜Self-check Rule
Acceptance Method: automated test

Given 用户执行：

ocn doc create prd

Then 模板末尾必须包含：

## Step Artifact Gate Self-check｜步骤产物门禁自检
Required sections:
- [ ] Problem｜问题
- [ ] Goals｜目标
- [ ] Non-goals｜非目标
- [ ] Users｜用户
- [ ] Scenarios｜使用场景
- [ ] Requirements｜需求
- [ ] Risks｜风险
- [ ] Business Rules｜业务规则
- [ ] Permission Rules｜权限规则
- [ ] Exception Scenarios｜异常场景
- [ ] Non-functional Requirements｜非功能需求
If any required item is unchecked, this artifact is `draft_blocked` and must not be marked as `complete`.
如果任何必需项未勾选，本产物状态为 `draft_blocked`，不得标记为 `complete`。
<!-- ocn-meta
artifact: docs/02-prd.md
step: step_prd
status: draft | draft_blocked | complete
checked_at: <ISO 8601 timestamp>
checked_by: ai | human | ocn
-->

Result: pass
Error Code: OK

⸻

AC-DOC-004｜Self-check 不得覆盖实际 AST 检测

Phase: alpha
Priority: must
Traceability: PRD 11.8｜Step Artifact Gate, PRD 12.6｜Self-check Rule
Acceptance Method: automated test

Given artifact 的 Self-check block 标记：

- [x] Scenarios｜使用场景

And artifact 实际内容中没有任何匹配 scenarios 的 heading
When 用户执行：

ocn check

Then 系统必须以 Markdown AST required_sections 检测结果为准。
And 必须返回 blocked。
And 必须输出中英文提示：

Self-check inconsistent with actual artifact.
自检结果与实际文档不一致。
AI claimed Scenarios｜使用场景 exists, but section is missing.
AI 声称 Scenarios｜使用场景 已存在，但实际章节缺失。

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

13. Template Customization｜模板自定义

AC-TEMPLATE-001｜允许覆盖模板

Phase: beta
Priority: should
Traceability: PRD 11.6｜Template Customization
Acceptance Method: automated test

Given 项目存在：

.ocoding/templates/prd.md

When 用户执行：

ocn doc create prd

Then 系统应优先使用项目内自定义模板。

Result: pass
Error Code: OK

⸻

AC-TEMPLATE-002｜自定义模板不得删除 required sections

Phase: beta
Priority: must
Traceability: PRD 11.6｜Template Customization
Acceptance Method: automated test

Given .ocoding/templates/prd.md 缺少：

Scenarios｜使用场景

When 用户执行：

ocn doctor

Then 系统必须报告模板不兼容。

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-TEMPLATE-003｜v1.0 不支持自定义 SOP Profile

Phase: beta
Priority: must
Traceability: PRD 11.6｜Template Customization, PRD 20｜Out of Scope
Acceptance Method: automated test

Given 用户尝试添加自定义 SOP Profile
When 用户执行 OCN 相关命令
Then v1.0 不应加载用户自定义 SOP Profile。
And 系统应提示：

Custom SOP Profile is not supported in v1.0.
v1.0 不支持自定义 SOP Profile。

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

14. Step Artifact Gate｜步骤产物门禁

AC-SAG-001｜artifact 存在但缺 required section 必须 blocked

Phase: alpha
Priority: must
Traceability: PRD 11.8｜Step Artifact Gate
Acceptance Method: automated test

Given docs/02-prd.md 存在
And 文件缺少：

Scenarios｜使用场景

When 用户执行：

ocn check

Then 系统必须返回：

blocked

And 输出必须包含：

Scenarios｜使用场景 section is missing
缺少 Scenarios｜使用场景 章节

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-SAG-002｜blocked 时 ocn gate 不允许通过

Phase: alpha
Priority: must
Traceability: PRD 11.8｜Step Artifact Gate, PRD 12.4｜Blocking Rule
Acceptance Method: automated test

Given 当前 state 为：

state_spec

And step_prd 的 Step Artifact Gate 为：

blocked

When 用户执行：

ocn gate

Then 结果必须为：

blocked

And 不允许进入：

state_design

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

AC-SAG-003｜blocked 时 ocn advance 必须失败

Phase: alpha
Priority: must
Traceability: PRD 11.13｜Advance, PRD 12.4｜Blocking Rule
Acceptance Method: automated test

Given 当前 state 为：

state_spec

And 当前 state 下存在 blocking Step Artifact Gate
When 用户执行：

ocn advance

Then 系统必须拒绝推进。
And 必须写 audit。

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

AC-SAG-004｜pass / warning / blocked 三态

Phase: alpha
Priority: must
Traceability: PRD 11.8｜Step Artifact Gate
Acceptance Method: automated test

Given 当前 step artifact 被检查
When 系统执行 Step Artifact Gate
Then 结果必须为以下之一：

pass
warning
blocked

And 不得返回未定义状态。

Result: pass
Error Code: OK

⸻

AC-SAG-005｜navigator.run_gate 返回结构化结果

Phase: beta
Priority: must
Traceability: PRD 11.23｜Minimal MCP Server, PRD 11.8｜Step Artifact Gate
Acceptance Method: automated test

Given MCP Server 可用
When AI agent 调用：

navigator.run_gate

Then 返回必须包含：

{
  "stepId": "step_prd",
  "artifact": "docs/02-prd.md",
  "status": "blocked",
  "passed": [],
  "warnings": [],
  "blocked": [],
  "nextActions": []
}

And 字段名必须为英文 stable key。
And human-readable message must be bilingual.

Result: pass
Error Code: OK

⸻

AC-SAG-006｜artifactGateStatus 写入 state.json

Phase: alpha
Priority: must
Traceability: PRD 11.8｜Step Artifact Gate
Acceptance Method: automated test

Given 用户执行：

ocn check

When 当前 step artifact gate 运行完成
Then .ocoding/state.json 必须记录：

{
  "artifactGateStatus": {
    "step_prd": {
      "artifact": "docs/02-prd.md",
      "status": "blocked",
      "missingRequiredSections": ["scenarios"],
      "warnings": [],
      "checkedAt": "<timestamp>"
    }
  }
}

Result: pass
Error Code: OK

⸻

15. required_sections 检测算法｜Required Sections Detection

AC-SECTION-001｜使用 Markdown AST

Phase: alpha
Priority: must
Traceability: PRD 11.8｜required_sections Detection Algorithm
Acceptance Method: automated test

Given docs/02-prd.md 包含 markdown headings
When OCN 检查 required sections
Then OCN 必须通过 Markdown AST 解析 headings。

Result: pass
Error Code: OK

⸻

AC-SECTION-002｜canonical heading 可匹配

Phase: alpha
Priority: must
Traceability: PRD 11.8｜required_sections Detection Algorithm
Acceptance Method: automated test

Given PRD 中存在 heading：

## Scenarios｜使用场景

When OCN 检查 scenarios section
Then 检查必须通过。

Result: pass
Error Code: OK

⸻

AC-SECTION-003｜英文 alias 可匹配

Phase: alpha
Priority: must
Traceability: PRD 11.8｜required_sections Detection Algorithm
Acceptance Method: automated test

Given PRD 中存在 heading：

## User Scenarios

And SOP Profile 中 scenarios.aliases 包含：

User Scenarios

When OCN 检查 scenarios section
Then 检查必须通过。

Result: pass
Error Code: OK

⸻

AC-SECTION-004｜中文 alias 可匹配

Phase: alpha
Priority: must
Traceability: PRD 11.8｜required_sections Detection Algorithm
Acceptance Method: automated test

Given PRD 中存在 heading：

## 使用场景

And SOP Profile 中 scenarios.aliases 包含：

使用场景

When OCN 检查 scenarios section
Then 检查必须通过。

Result: pass
Error Code: OK

⸻

AC-SECTION-005｜heading level 超出范围

Phase: alpha
Priority: must
Traceability: PRD 11.8｜required_sections Detection Algorithm
Acceptance Method: automated test

Given SOP Profile 定义：

min_heading_level: 2
max_heading_level: 3

And PRD 中存在：

#### Scenarios｜使用场景

When OCN 检查 required sections
Then 系统必须根据 section rule 返回 warning 或 blocked。

Result: warning
Error Code: OK

⸻

16. Artifact Quality Checklist｜产物质量清单

AC-QUALITY-001｜风险内容过短产生 warning

Phase: alpha
Priority: should
Traceability: PRD 11.9｜Artifact Quality Checklist
Acceptance Method: automated test

Given PRD 存在 Risks｜风险 章节
And 该章节字符数低于 SOP Profile 中的 min_chars 阈值
When 用户执行：

ocn check

Then 系统必须返回 warning。
And 不得声称已判断真实风险深度。

Result: warning
Error Code: OK

⸻

AC-QUALITY-002｜Quality warning 是启发式

Phase: alpha
Priority: must
Traceability: PRD 11.8｜Quality Heuristic Boundary
Acceptance Method: automated test

Given OCN 输出 quality warning
Then 输出必须说明其为 heuristic。

示例：

This is a heuristic warning, not semantic quality judgment.
这是启发式提醒，不是真正的语义质量判断。

Result: pass
Error Code: OK

⸻

AC-QUALITY-003｜v1.0 不做 LLM Judge

Phase: alpha
Priority: must
Traceability: PRD 6.4｜No Full LLM Judge, PRD 11.9｜Artifact Quality Checklist
Acceptance Method: automated test

Given 用户执行：

ocn check

Then 系统不得调用 LLM Judge。
And 不得输出 AI semantic score。

Result: pass
Error Code: OK

⸻

17. Gate｜门禁

AC-GATE-001｜gate 聚合当前 state 的 step gate

Phase: alpha
Priority: must
Traceability: PRD 11.12｜Gate
Acceptance Method: automated test

Given 当前 state 为：

state_spec

When 用户执行：

ocn gate

Then 系统必须聚合：

step_prd
step_acceptance_criteria

的 Step Artifact Gate 结果。

Result: pass
Error Code: OK

⸻

AC-GATE-002｜任一 blocking 导致 gate failed

Phase: alpha
Priority: must
Traceability: PRD 11.12｜Gate, PRD 12.4｜Blocking Rule
Acceptance Method: automated test

Given 当前 state 下任一步骤存在 blocking result
When 用户执行：

ocn gate

Then 系统必须返回：

blocked

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

AC-GATE-003｜gate 执行必须写 audit

Phase: alpha
Priority: must
Traceability: PRD 11.12｜Gate, PRD 11.16｜Audit Trail
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn gate

Then 系统必须向：

docs/21-audit-trail.md

写入 audit event。

Result: pass
Error Code: OK

⸻

18. Advance｜状态推进

AC-ADV-001｜gate pass 后 advance 成功

Phase: alpha
Priority: must
Traceability: PRD 11.13｜Advance
Acceptance Method: automated test

Given 当前 state 的 gate 结果为：

pass

When 用户执行：

ocn advance

Then 系统必须推进到允许的下一状态。
And 写入 audit。

Result: pass
Error Code: OK

⸻

AC-ADV-002｜gate failed 时 advance 失败

Phase: alpha
Priority: must
Traceability: PRD 11.13｜Advance, PRD 12.4｜Blocking Rule
Acceptance Method: automated test

Given 当前 state 的 gate 结果为：

blocked

When 用户执行：

ocn advance

Then 系统不得改变：

currentStateId
currentStepId

And 必须写 audit。

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

AC-ADV-003｜MCP 不支持 advance

Phase: beta
Priority: must
Traceability: PRD 6.7｜No MCP Advance, PRD 11.23｜Minimal MCP Server
Acceptance Method: automated test

Given MCP Server 可用
When AI agent 请求：

navigator.advance_phase

Then 系统必须拒绝。
And 返回中英文错误信息。

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

19. Dev Log｜开发日志

AC-LOG-001｜写 dev log

Phase: alpha
Priority: must
Traceability: PRD 11.14｜Dev Log
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn log --type dev

Then 系统必须写入：

docs/18-dev-log.md

And 记录至少包含：

why
what changed
files changed
test result
risk
next action

Result: pass
Error Code: OK

⸻

AC-LOG-002｜默认 log 类型为 dev

Phase: alpha
Priority: must
Traceability: PRD 11.14｜Dev Log
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn log

Then 系统应等同于：

ocn log --type dev

Result: pass
Error Code: OK

⸻

20. Decision Log｜决策日志

AC-DEC-001｜beta 支持 decision log 命令

Phase: beta
Priority: must
Traceability: PRD 11.15｜Decision Log
Acceptance Method: automated test

Given 当前验收阶段为 beta 或 GA
When 用户执行：

ocn log --type decision

Then 系统必须写入：

docs/19-decision-log.md

And 记录至少包含：

decision
context
options
chosen option
reason
risk
related artifact

Result: pass
Error Code: OK

⸻

AC-DEC-002｜v1.0 不提供 ocn decision

Phase: beta
Priority: must
Traceability: PRD 10.10｜Record Decision Log, PRD 11.15｜Decision Log
Acceptance Method: automated test

Given 用户执行：

ocn decision

When 当前版本为 v1.0
Then 系统必须提示：

ocn decision is not supported in v1.0.
v1.0 不支持 ocn decision。

And 建议使用：

ocn log --type decision

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

AC-DEC-003｜MCP 不支持 capture_decision

Phase: beta
Priority: must
Traceability: PRD 6.8｜No MCP capture_decision, PRD 11.23｜Minimal MCP Server
Acceptance Method: automated test

Given MCP Server 可用
When AI agent 请求：

navigator.capture_decision

Then 系统必须拒绝。
And 提示正式决策必须由 CLI 用户执行。

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

21. Research / Production Split｜研究与生产分轨

AC-RESEARCH-001｜brief 提醒研究 / 生产分轨

Phase: GA
Priority: should
Traceability: PRD 21｜Appendix A Cross-Cutting Obligation Map
Acceptance Method: automated test

Given 当前 state 为 state_design 或之后
When 用户执行：

ocn brief

Then brief 必须包含：

Research / Production Split Reminder
研究 / 生产分轨提醒

And 提醒用户区分：

research artifact
production artifact

Result: pass
Error Code: OK

⸻

AC-RESEARCH-002｜research log 写入

Phase: GA
Priority: should
Traceability: PRD 21｜Appendix A Cross-Cutting Obligation Map
Acceptance Method: automated test

Given 当前 state 为 state_design 或之后
When 用户执行：

ocn log --type research

Then 系统应写入：

docs/17-research-log.md

And 写入内容应包含：

research question
hypothesis
method
finding
whether it enters production line

Result: pass
Error Code: OK

⸻

AC-RESEARCH-003｜过早 research log 产生 warning

Phase: GA
Priority: should
Traceability: PRD 21｜Appendix A Cross-Cutting Obligation Map
Acceptance Method: automated test

Given 当前 state 为：

state_discovery

或：

state_spec

When 用户执行：

ocn log --type research

Then 系统应输出 warning：

Research split is not activated before state_design.
研究 / 生产分轨在 state_design 前尚未激活。

And 仍可写入 docs/17-research-log.md，不 hard block。

Result: warning
Error Code: OK

⸻

22. Uncertainty Policy｜不确定性表达规则

AC-UNCERT-001｜brief 注入不确定性规则

Phase: GA
Priority: must
Traceability: PRD 21｜Appendix A Cross-Cutting Obligation Map, PRD 12.12｜AI Governance Rule
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn brief

Then 输出必须包含：

Uncertainty Policy｜不确定性表达规则

And 必须列出至少以下允许表达：

无法判断 / unable to determine
数据不足 / insufficient data
需要人工确认 / requires human confirmation

And 必须列出至少以下禁止表达：

一定正确 / definitely correct
完全准确 / completely accurate

Result: pass
Error Code: OK

⸻

AC-UNCERT-002｜prompt next 注入不确定性规则

Phase: GA
Priority: must
Traceability: PRD 11.4｜Prompt Next, PRD 21｜Cross-Cutting Obligation Map
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn prompt next

Then prompt 必须包含 uncertainty 表达指引。
And 必须明确告知 AI：

如果数据不足或无法判断，必须使用允许表达；不得使用禁止表达。
If data is insufficient or cannot be determined, use allowed expressions and do not use forbidden expressions.

Result: pass
Error Code: OK

⸻

AC-UNCERT-003｜项目自定义 uncertainty policy 优先

Phase: GA
Priority: should
Traceability: PRD 21｜Cross-Cutting Obligation Map
Acceptance Method: manual review

Given 项目内存在：

docs/24-uncertainty-policy.md

When 用户执行：

ocn brief

Then 注入的 uncertainty policy 应优先使用项目自定义版本。
And 在没有自定义版本时，使用 OCN 内置默认版本。

Result: pass
Error Code: OK

⸻

23. Audit Trail｜审计链

AC-AUDIT-001｜gate 执行写 audit

Phase: alpha
Priority: must
Traceability: PRD 11.16｜Audit Trail
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn gate

Then docs/21-audit-trail.md 必须追加一条 audit event。

Result: pass
Error Code: OK

⸻

AC-AUDIT-002｜Step Artifact Gate blocked 写 audit

Phase: alpha
Priority: must
Traceability: PRD 11.16｜Audit Trail, PRD 12.9｜Audit Rule
Acceptance Method: automated test

Given step_prd 缺少：

Scenarios｜使用场景

When 用户执行：

ocn gate

Then docs/21-audit-trail.md 必须记录：

Step Artifact Gate blocked

Result: pass
Error Code: OK

⸻

AC-AUDIT-003｜reset 写 audit

Phase: beta
Priority: must
Traceability: PRD 11.16｜Audit Trail, PRD 11.22｜Reset
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn reset --keep-docs

Then reset 操作必须写入 audit。

Result: pass
Error Code: OK

⸻

24. Baseline｜基线

AC-BASE-001｜创建 baseline

Phase: beta
Priority: must
Traceability: PRD 11.17｜Baseline
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn baseline create

Then 系统必须创建或更新：

docs/15-baseline.md
.ocoding/baselines/*.json

And 必须写 audit。

Result: pass
Error Code: OK

⸻

AC-BASE-002｜baseline 内容

Phase: beta
Priority: must
Traceability: PRD 11.17｜Baseline
Acceptance Method: automated test

Given baseline 已创建
Then baseline 必须包含：

version
commit
currentStateId
currentStepId
available features
unavailable features
start command
test command
acceptance result
known issues
rollback method
next goal

Result: pass
Error Code: OK

⸻

25. SOP Versioning｜SOP 版本管理

AC-SOP-001｜显示 SOP 版本

Phase: beta
Priority: must
Traceability: PRD 11.18｜SOP Version
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn sop version

Then 系统必须输出：

sopProfileId
sopProfileVersion
sopLockedAt
ocnVersion

Result: pass
Error Code: OK

⸻

AC-SOP-002｜SOP diff 不修改文件

Phase: beta
Priority: must
Traceability: PRD 11.19｜SOP Diff
Acceptance Method: automated test

Given 项目 SOP 版本与内置版本不同
When 用户执行：

ocn sop diff

Then 系统必须显示差异。
And 不得修改项目文件。

Result: pass
Error Code: OK

⸻

AC-SOP-003｜upgrade plan 只生成计划

Phase: GA
Priority: must
Traceability: PRD 11.20｜SOP Upgrade Plan
Acceptance Method: automated test

Given 项目 SOP 版本与目标版本不同
When 用户执行：

ocn sop upgrade --plan

Then 系统必须生成升级计划。
And 不得修改项目文件。

Result: pass
Error Code: OK

⸻

26. Doctor｜诊断

AC-DOCTOR-001｜doctor 检查 state.json

Phase: beta
Priority: must
Traceability: PRD 11.21｜Doctor
Acceptance Method: automated test

Given .ocoding/state.json 存在
When 用户执行：

ocn doctor

Then 系统必须检查 state.json 是否合法。

Result: pass
Error Code: OK

⸻

AC-DOCTOR-002｜doctor 检查 template override

Phase: beta
Priority: must
Traceability: PRD 11.21｜Doctor, PRD 11.6｜Template Customization
Acceptance Method: automated test

Given .ocoding/templates/prd.md 存在
When 用户执行：

ocn doctor

Then 系统必须检查模板是否保留 required sections。

Result: pass
Error Code: OK

⸻

AC-DOCTOR-003｜doctor snapshot

Phase: GA
Priority: should
Traceability: PRD 15.13｜OCN Internal Observability
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn doctor --snapshot

Then 系统必须生成：

.ocoding/snapshot-<timestamp>.json

And snapshot 必须包含：

state
sop version
artifact list
gate status
artifact gate status
recent errors

Result: pass
Error Code: OK

⸻

27. Reset｜重置

AC-RESET-001｜keep-docs

Phase: beta
Priority: must
Traceability: PRD 11.22｜Reset
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn reset --keep-docs

Then 系统必须重建：

.ocoding/

And 必须保留：

docs/

And 必须写 audit。

Result: pass
Error Code: OK

⸻

AC-RESET-002｜hard reset 必须二次确认

Phase: GA
Priority: must
Traceability: PRD 11.22｜Reset, PRD 14.15｜reset –hard Without Second Confirmation
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn reset --hard

And 未提供二次确认
Then 系统必须拒绝执行。
And 不得删除任何文件。

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

AC-RESET-003｜reset 不删除业务代码

Phase: beta
Priority: must
Traceability: PRD 15.15｜File System Boundary, PRD 11.22｜Reset
Acceptance Method: automated test

Given 项目包含：

src/
package.json

When 用户执行任何 reset 命令
Then 系统不得默认删除或修改项目根目录中 .ocoding/ 和 docs/ 之外的任何路径。
And 不得默认修改：

src/
package.json
.git/

Result: pass
Error Code: OK

⸻

28. MCP Server｜MCP 服务

AC-MCP-001｜最小工具集

Phase: beta
Priority: must
Traceability: PRD 11.23｜Minimal MCP Server
Acceptance Method: automated test

Given MCP Server 启动
Then 必须暴露：

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

Result: pass
Error Code: OK

⸻

AC-MCP-002｜不暴露 advance_phase

Phase: beta
Priority: must
Traceability: PRD 6.7｜No MCP Advance, PRD 11.23｜Minimal MCP Server
Acceptance Method: automated test

Given MCP Server 启动
Then 不得暴露：

navigator.advance_phase

Result: pass
Error Code: OK

⸻

AC-MCP-003｜不暴露 capture_decision

Phase: beta
Priority: must
Traceability: PRD 6.8｜No MCP capture_decision, PRD 11.23｜Minimal MCP Server
Acceptance Method: automated test

Given MCP Server 启动
Then 不得暴露：

navigator.capture_decision

Result: pass
Error Code: OK

⸻

AC-MCP-004｜MCP 返回中英文 message

Phase: beta
Priority: must
Traceability: PRD 15.14｜Language Strategy, PRD 11.23｜Minimal MCP Server
Acceptance Method: automated test

Given MCP tool 返回错误
Then 返回必须包含：

{
  "code": "ERR_ARTIFACT_INVALID",
  "message": {
    "en": "Required section is missing: Scenarios",
    "zh": "缺少必需章节：Scenarios｜使用场景"
  }
}

Result: pass
Error Code: OK

⸻

29. Test Result Record｜测试结果记录

AC-TEST-001｜记录 vitest json

Phase: GA
Priority: must
Traceability: PRD 11.10｜Test Result Record
Acceptance Method: automated test

Given 存在 vitest json 测试结果文件
When 用户执行：

ocn test record --from vitest <path>

Then 系统必须读取测试结果。
And 记录到 OCN 状态或测试记录中。

Result: pass
Error Code: OK

⸻

AC-TEST-002｜不支持格式返回错误

Phase: GA
Priority: must
Traceability: PRD 14.14｜Unsupported Test Record Format
Acceptance Method: automated test

Given 用户执行：

ocn test record --from unknown result.json

Then 系统必须返回：

ERR_IO_OR_CONFIG

And 输出：

Unsupported test result format.
不支持的测试结果格式。

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

AC-TEST-003｜include-tests 纳入测试结果

Phase: GA
Priority: must
Traceability: PRD 11.11｜Check With Tests
Acceptance Method: automated test

Given 已记录 vitest 测试结果
When 用户执行：

ocn check --include-tests

Then 系统必须把测试结果纳入 check 输出。

Result: pass
Error Code: OK

⸻

30. Exception Path Acceptance Criteria｜异常路径验收

AC-EXC-001｜未初始化项目

Phase: alpha
Priority: must
Traceability: PRD 14.1｜Project Not Initialized
Acceptance Method: automated test

Given 当前目录没有 .ocoding/
When 用户执行：

ocn status

Then 系统必须输出双语提示：

OCN project not initialized.
OCN 项目未初始化。

And 必须建议运行：

ocn init --tier minimal

Result: blocked
Error Code: ERR_STATE_MACHINE

⸻

AC-EXC-002｜state.json 损坏

Phase: beta
Priority: must
Traceability: PRD 14.2｜state.json Corrupted
Acceptance Method: automated test

Given .ocoding/state.json 文件存在但 JSON 格式损坏
When 用户执行：

ocn status

Then 系统必须不崩溃。
And 必须输出双语提示：

state.json is invalid. Run ocn doctor.
state.json 损坏，请运行 ocn doctor。

And 如果存在：

.ocoding/state.json.bak

Then 必须额外提示：

Backup found: .ocoding/state.json.bak
发现备份：.ocoding/state.json.bak

Result: blocked
Error Code: ERR_STATE_MACHINE

⸻

AC-EXC-003｜SOP 版本不兼容

Phase: beta
Priority: must
Traceability: PRD 14.3｜SOP Version Incompatible
Acceptance Method: automated test

Given 项目 SOP 版本与当前 OCN 不兼容
When 用户执行：

ocn status

Then 系统必须输出双语提示：

Project SOP version is incompatible with current OCN version.
项目 SOP 版本与当前 OCN 版本不兼容。

And 建议执行：

ocn sop diff
ocn sop upgrade --plan

Result: blocked
Error Code: ERR_SOP_VERSION

⸻

AC-EXC-004｜artifact 缺失

Phase: alpha
Priority: must
Traceability: PRD 14.4｜Artifact Missing
Acceptance Method: automated test

Given 当前 step 要求：

docs/02-prd.md

And 文件不存在
When 用户执行：

ocn check

Then 系统必须输出缺失 artifact。
And 建议执行：

ocn doc create prd

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-EXC-005｜artifact 结构不完整

Phase: alpha
Priority: must
Traceability: PRD 14.5｜Artifact Structure Incomplete
Acceptance Method: automated test

Given docs/02-prd.md 存在
And 缺少：

Scenarios｜使用场景

When 用户执行：

ocn check

Then 系统必须返回 blocked。
And ocn gate 不允许进入 DESIGN。

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-EXC-006｜artifact 内容太浅

Phase: alpha
Priority: should
Traceability: PRD 14.6｜Artifact Content Too Shallow
Acceptance Method: automated test

Given PRD 有 Risks｜风险 章节
And 内容低于启发式阈值
When 用户执行：

ocn check

Then 结构检查可以通过。
And Artifact Quality Checklist 必须给 warning。
And 输出必须说明 warning 是启发式。

Result: warning
Error Code: OK

⸻

AC-EXC-007｜gate 失败

Phase: alpha
Priority: must
Traceability: PRD 14.7｜Gate Failed
Acceptance Method: automated test

Given 当前 state 下存在 blocking gate
When 用户执行：

ocn gate

Then 系统必须输出 gate failed。
And 列出阻塞原因。

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

AC-EXC-008｜非法状态跳转

Phase: alpha
Priority: must
Traceability: PRD 14.8｜Illegal State Transition
Acceptance Method: automated test

Given 当前状态为：

state_discovery

When 用户尝试跳转到不允许的状态
Then 系统必须阻止。

Result: blocked
Error Code: ERR_STATE_MACHINE

⸻

AC-EXC-009｜lock file 未超时

Phase: beta
Priority: must
Traceability: PRD 14.9｜Lock File Exists, PRD 15.10｜Atomic Write
Acceptance Method: automated test

Given .ocoding/.lock 存在且未超时，时间小于 5 秒
When 用户执行：

ocn log

Then 系统必须等待 lock 释放。
And 最多等待 5 秒。
And 等待期间应每 200ms 重试一次。

Result: pass
Error Code: OK

⸻

AC-EXC-010｜lock file 超时

Phase: beta
Priority: must
Traceability: PRD 14.9｜Lock File Exists
Acceptance Method: automated test

Given .ocoding/.lock 存在且超过 5 秒
When 用户执行：

ocn log

Then 系统必须输出双语提示：

OCN project is locked by another process.
OCN 项目被另一进程锁定。

And 不得修改任何文件。

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

AC-EXC-011｜MCP 请求非法操作

Phase: beta
Priority: must
Traceability: PRD 14.10｜MCP Requests Illegal Operation
Acceptance Method: automated test

Given MCP Server 可用
When MCP agent 请求：

navigator.advance_phase

或：

navigator.capture_decision

Then 系统必须拒绝。

Result: blocked
Error Code: ERR_GATE_FAILED

⸻

AC-EXC-012｜Tier 与 artifact 不匹配

Phase: beta
Priority: must
Traceability: PRD 14.11｜Tier and Artifact Mismatch
Acceptance Method: automated test

Given 项目 tier 为：

production

And 缺少 production tier 必需 artifact：

docs/09-real-data-wiring.md

When 用户执行：

ocn check

Then 系统必须输出 missing artifact。
And ocn gate 必须根据当前 state 和 tier 判断是否 block。

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-EXC-013｜step_id 在 SOP 中不存在

Phase: beta
Priority: must
Traceability: PRD 14.12｜step_id Not Found in SOP
Acceptance Method: automated test

Given .ocoding/state.json 包含：

{
  "currentStepId": "step_unknown"
}

When 用户执行：

ocn doctor

Then 系统必须报告 state machine error。
And 指出未知 step id。

Result: blocked
Error Code: ERR_STATE_MACHINE

⸻

AC-EXC-014｜cross-cutting obligation 配置不合法

Phase: GA
Priority: must
Traceability: PRD 14.13｜Invalid Cross-cutting Obligation Config
Acceptance Method: automated test

Given sop.yaml 中某个 cross-cutting obligation 引用不存在的 step_id 或 state_id
When 用户执行：

ocn doctor

Then 系统必须报告 SOP 配置错误。
And 必须指出具体哪个 obligation 配置不合法。

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

AC-EXC-015｜test record 文件格式不支持

Phase: GA
Priority: must
Traceability: PRD 14.14｜Unsupported Test Record Format
Acceptance Method: automated test

Given 用户执行：

ocn test record --from unknown result.json

Then 系统必须输出：

Unsupported test result format.
不支持的测试结果格式。

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

AC-EXC-016｜reset –hard 未二次确认

Phase: GA
Priority: must
Traceability: PRD 14.15｜reset –hard Without Second Confirmation
Acceptance Method: automated test

Given 用户执行：

ocn reset --hard

And 未提供二次确认
Then 系统必须拒绝执行。
And 不得删除文件。

Result: blocked
Error Code: ERR_IO_OR_CONFIG

⸻

31. File System Boundary｜文件系统边界

AC-FS-001｜默认只读写 .ocoding 和 docs

Phase: alpha
Priority: must
Traceability: PRD 15.15｜File System Boundary
Acceptance Method: automated test

Given 项目包含：

src/
.git/
docs/
.ocoding/

When 用户执行：

ocn status
ocn check
ocn gate

Then OCN 默认只应读写：

.ocoding/**
docs/**

And 不应读取：

src/**
.git/**

Result: pass
Error Code: OK

⸻

AC-FS-002｜test record 只读取显式路径

Phase: GA
Priority: must
Traceability: PRD 15.15｜File System Boundary, PRD 11.10｜Test Result Record
Acceptance Method: automated test

Given 用户执行：

ocn test record --from vitest ./tmp/vitest.json

Then OCN 可以读取：

./tmp/vitest.json

And 不得扫描整个项目查找测试结果。

Result: pass
Error Code: OK

⸻

AC-FS-003｜不修改 package.json

Phase: alpha
Priority: must
Traceability: PRD 15.15｜File System Boundary
Acceptance Method: automated test

Given 项目包含：

package.json

When 用户执行任何 v1.0 OCN 命令
Then OCN 不得默认修改：

package.json

Result: pass
Error Code: OK

⸻

32. Language Strategy｜语言策略

AC-LANG-001｜CLI 输出双语

Phase: alpha
Priority: must
Traceability: PRD 15.14｜Language Strategy
Acceptance Method: manual review

Given 用户执行：

ocn check

When 输出 human-readable message
Then message 必须包含中文和英文。

Result: pass
Error Code: OK

⸻

AC-LANG-002｜机器字段英文 stable key

Phase: alpha
Priority: must
Traceability: PRD 15.14｜Language Strategy
Acceptance Method: automated test

Given OCN 输出 JSON 或 MCP response
Then 机器字段必须使用英文 stable key。

Example:

{
  "currentStateId": "state_spec",
  "currentStepId": "step_prd",
  "status": "blocked"
}

Result: pass
Error Code: OK

⸻

AC-LANG-003｜artifact heading 双语

Phase: alpha
Priority: must
Traceability: PRD 15.14｜Language Strategy
Acceptance Method: automated test

Given OCN 创建 artifact 模板
Then heading 必须使用：

## English｜中文

格式。

Result: pass
Error Code: OK

⸻

33. Performance Budget｜性能预算

AC-PERF-001｜status 性能

Phase: GA
Priority: should
Traceability: PRD 15.12｜Performance Budget
Acceptance Method: automated test

Given Reference Hardware、Sample、Mode 和 Typical Project 符合第 6 节 Performance Acceptance Baseline
When 执行：

ocn status

Then P95 必须小于：

200ms

Result: pass
Error Code: OK

⸻

AC-PERF-002｜brief 性能

Phase: GA
Priority: should
Traceability: PRD 15.12｜Performance Budget
Acceptance Method: automated test

Given Reference Hardware、Sample、Mode 和 Typical Project 符合第 6 节 Performance Acceptance Baseline
When 执行：

ocn brief

Then P95 必须小于：

800ms

Result: pass
Error Code: OK

⸻

AC-PERF-003｜gate 性能

Phase: GA
Priority: should
Traceability: PRD 15.12｜Performance Budget
Acceptance Method: automated test

Given Reference Hardware、Sample、Mode 和 Typical Project 符合第 6 节 Performance Acceptance Baseline
When 执行：

ocn gate

Then 单 state P95 必须小于：

1s

Result: pass
Error Code: OK

⸻

AC-PERF-004｜MCP tool 性能

Phase: GA
Priority: should
Traceability: PRD 15.12｜Performance Budget
Acceptance Method: automated test

Given MCP Server 已启动
And Reference Hardware、Sample、Mode 和 Typical Project 符合第 6 节 Performance Acceptance Baseline
When 调用任一 v1.0 MCP tool
Then P95 必须小于：

800ms

Result: pass
Error Code: OK

⸻

34. Observability｜可观测性

AC-OBS-001｜OCN_DEBUG

Phase: alpha
Priority: should
Traceability: PRD 15.13｜OCN Internal Observability
Acceptance Method: automated test

Given 设置：

OCN_DEBUG=1

When 用户执行：

ocn status

Then 系统必须输出基本调试信息。

Result: pass
Error Code: OK

⸻

AC-OBS-002｜trace gate

Phase: beta
Priority: should
Traceability: PRD 15.13｜OCN Internal Observability
Acceptance Method: automated test

Given 项目已初始化
When 用户执行：

ocn --trace gate

Then 系统必须输出：

SOP Loader 加载顺序
Gate 评估顺序
Artifact 解析过程
required_sections 匹配结果

Result: pass
Error Code: OK

⸻

AC-OBS-003｜errors log

Phase: beta
Priority: should
Traceability: PRD 15.13｜OCN Internal Observability
Acceptance Method: automated test

Given OCN 命令发生非交互错误
Then 系统必须写入：

.ocoding/.errors.log

And 最多保留最近 100 条。

Result: pass
Error Code: OK

⸻

35. Dogfood｜自举验证

AC-DOGFOOD-P1-001｜OCN 自身完整生命周期

Phase: GA
Priority: must
Traceability: PRD 19｜Success Criteria 1
Acceptance Method: dogfood evidence

Given v1.0 GA 候选版本
And OCN 自身已被作为 dogfood 项目使用 OCN 开发
When 执行 GA 发布前审查
Then 必须在 OCN 自己的 .ocoding/ 和 docs/ 中验证以下证据：

.ocoding/state.json 或 audit trail 显示曾完整经过 DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP
docs/21-audit-trail.md 至少 1 条 advance 失败记录
docs/21-audit-trail.md 至少 5 条 advance 成功记录
docs/19-decision-log.md 至少 3 条决策记录
docs/18-dev-log.md 至少 10 条开发日志
docs/15-baseline.md 已生成至少 1 次
没有任何 advance 通过 override 跳过 hard gate

And 必须在 dogfood-report.md 中记录这些证据的具体位置。

Result: pass
Error Code: N/A

⸻

AC-DOGFOOD-P1-002｜OCN 自身验证 Step Artifact Gate

Phase: GA
Priority: must
Traceability: PRD 19｜Success Criteria 7
Acceptance Method: dogfood evidence

Given OCN 自身 dogfood 项目
When docs/02-prd.md 曾缺少：

Scenarios｜使用场景

Then ocn check 必须返回 blocked。
And 修复后必须通过。
And 该过程必须记录在 dogfood-report.md 中。

Result: pass
Error Code: N/A

⸻

AC-DOGFOOD-P2-001｜mini CRM production tier dogfood

Phase: GA
Priority: must
Traceability: PRD 19｜Success Criteria 2, PRD 9.6｜mini CRM Scenario
Acceptance Method: dogfood evidence

Given 第二个 dogfood 项目为：

mini CRM｜客户偏好管理系统 mini 版

When 使用：

ocn init --tier production

Then 项目必须跑通：

DISCOVERY → VERIFY

And 必须满足：

docs/02-prd.md 包含 ≥ 3 个真实业务 Scenarios
docs/05-data-model.md 包含 ≥ 3 个核心 entity
docs/06-api-contract.md 至少包含 1 个 CRUD endpoint 定义
docs/12-rollback-plan.md 已生成
docs/13-validation-report.md 包含小样本验证，≥ 5 个测试客户
至少 1 次因 production tier artifact 缺失被 block 的记录
不包含人脸识别
不接摄像头
不处理真实敏感个人信息
使用模拟客户数据

And 必须生成：

dogfood-report-mini-crm.md

记录上述证据。

Result: pass
Error Code: N/A

⸻

36. DoD and Success Criteria｜完成定义与成功标准

AC-DOD-001｜v1.0 GA DoD 完成

Phase: GA
Priority: must
Traceability: PRD 18｜Definition of Done
Acceptance Method: manual review

Given v1.0 GA 候选版本
When 执行发布前 DoD 审查
Then PRD 第 18 节列出的所有 Definition of Done 项目必须全部满足。

Result: pass
Error Code: N/A

⸻

AC-DOD-002｜Success Criteria 完成

Phase: GA
Priority: must
Traceability: PRD 19｜Success Criteria
Acceptance Method: manual review

Given v1.0 GA 候选版本
When 执行发布前审查
Then PRD 第 19 节列出的所有 Success Criteria 项目必须全部满足。

Result: pass
Error Code: N/A

⸻

AC-DOD-003｜should 级豁免机制

Phase: GA
Priority: should
Traceability: PRD 18｜Definition of Done, PRD 19｜Success Criteria
Acceptance Method: manual review

Given v1.0 GA 候选版本
And 存在未满足的 Priority: should AC
When 执行发布前审查
Then 每条未满足项必须写入：

docs/19-decision-log.md

And 豁免必须包含：

原因
影响范围
补救计划
补救时间

And Priority: must AC 不允许通过豁免绕过，除非先修订 PRD / AC。

Result: pass
Error Code: N/A

⸻

AC-LOGIC-001｜逻辑主干缺角色 / 悬空引用 / 环 / 孤儿 / 未绑定触发被拦截

Phase: GA
Priority: must
Traceability: PRD 9.x｜Logic Backbone (AM-003 / DEC-025)
Acceptance Method: automated test

Given 当前步骤为 step_logic_backbone（SOP 0.3.0）
And docs/07-logic-backbone.md 的 ocn-logic-graph 块含以下任一缺陷：

某节点缺少有效 role
某节点 id 重复
某条边引用了未定义节点（悬空引用）
驱动子图（feeds/serves/triggers）存在依赖环
某 input/intermediate 节点无任何下游消费者（孤儿；仅指向未定义节点也算孤儿）
某 role=trigger 节点没有 triggers 边指向已定义目标（未绑定触发）

When 运行 ocn check
Then 必须返回 blocked，退出码 = 2，错误码 = ERR_ARTIFACT_INVALID
And 双语消息必须逐条点名具体缺陷（节点 id / 环路径 / 悬空端点）
And 不得写入 .ocoding/logic-graph.json

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-LOGIC-002｜逻辑主干缺图块或图不可解析被拦截

Phase: GA
Priority: must
Traceability: PRD 9.x｜Logic Backbone (AM-003 / DEC-025)
Acceptance Method: automated test

Given 当前步骤为 step_logic_backbone
When docs/07-logic-backbone.md 缺少 ocn-logic-graph 围栏块，或块内不是合法 YAML/JSON，或不符合 LogicGraph schema
And 运行 ocn check
Then 必须返回 blocked（ERR_ARTIFACT_INVALID），blockingReason 为
  logic_backbone_graph_missing 或 logic_backbone_graph_invalid

Result: blocked
Error Code: ERR_ARTIFACT_INVALID

⸻

AC-LOGIC-003｜接线完整的逻辑主干通过并生成机器投影

Phase: GA
Priority: must
Traceability: PRD 9.x｜Logic Backbone (AM-003 / DEC-025)
Acceptance Method: automated test

Given 当前步骤为 step_logic_backbone
And docs/07-logic-backbone.md 含全部必需章节，且图无五类缺陷
When 运行 ocn check
Then 必须返回 pass
And 必须在 .ocoding/logic-graph.json 写入规范化后的图（机器事实源）
And ocn brief 必须输出该图的执行顺序（拓扑序）与 trigger 绑定摘要

Result: pass
Error Code: N/A

⸻

37. ADR-001 Dogfood Project 2 Selection｜第二个 Dogfood 项目选择

本 ADR 应写入 docs/19-decision-log.md。
This ADR should be written into docs/19-decision-log.md.

# ADR-001｜Dogfood Project 2 Selection
日期｜Date: 2026-04-27
## 决策｜Decision
Dogfood Project 2 锁定为：
Dogfood Project 2 is locked as:
mini CRM｜客户偏好管理系统 mini 版
## 可选方案｜Options
1. 炖品店进销存系统  
   Stew shop inventory and sales system
2. OPC Legal 子模块  
   OPC Legal submodule
3. Twig Loop 子模块  
   Twig Loop submodule
4. mini CRM｜客户偏好管理系统 mini 版  
   mini CRM customer preference management system
## 最终选择｜Final Choice
选择方案 4。
Choose option 4.
## 选择理由｜Reason
- mini CRM 是大多数 SaaS 创业者能立即理解的业务。  
  mini CRM is immediately understandable to most SaaS builders.
- 适合作为开源项目 example。  
  Suitable as an open-source example.
- 控制变量好，能专注验证 OCN 的 SOP 是否对业务项目有效。  
  Controlled scope helps verify whether OCN SOP works for business projects.
- 不涉及真实敏感数据。  
  Does not involve real sensitive personal data.
## 边界｜Boundary
- 不做人脸识别。  
  No face recognition.
- 不接摄像头。  
  No camera integration.
- 不处理真实敏感个人信息。  
  No real sensitive personal data.
- 使用模拟客户数据。  
  Use simulated customer data.
## 风险｜Risks
- 合成项目可能缺少真实业务约束。  
  Synthetic project may lack real business constraints.
## 缓解｜Mitigation
- 在 dogfood 中模拟真实餐厅或服务业场景。  
  Simulate realistic restaurant or service business scenarios in dogfood.
- 加入数据迁移、权限边界、异常路径、小样本验证。  
  Include data migration, permission boundary, exception paths, and small-sample validation.
## 后续观察｜Follow-up
GA 后可考虑将炖品店系统作为 v1.1 dogfood。
After GA, consider stew shop system as v1.1 dogfood.

⸻

38. 本 AC 文档自身的 Step Artifact Gate Self-check｜Self-check

✓ Purpose｜文档目的
✓ Acceptance Principles｜验收原则
✓ Standard AC Format｜标准 AC 格式
✓ Result States｜验收状态
✓ Error Code Rules｜错误码规则
✓ Performance Acceptance Baseline｜性能验收基准
✓ Project Initialization AC
✓ State Machine AC
✓ Status AC
✓ Brief AC
✓ Prompt Next AC
✓ Artifact Creation AC
✓ Template Customization AC
✓ Step Artifact Gate AC
✓ required_sections Detection AC
✓ Artifact Quality Checklist AC
✓ Gate AC
✓ Advance AC
✓ Dev Log AC
✓ Decision Log AC
✓ Research / Production Split AC
✓ Uncertainty Policy AC
✓ Audit Trail AC
✓ Baseline AC
✓ SOP Versioning AC
✓ Doctor AC
✓ Reset AC
✓ MCP Server AC
✓ Test Result Record AC
✓ Exception Path AC
✓ File System Boundary AC
✓ Language Strategy AC
✓ Performance Budget AC
✓ Observability AC
✓ Dogfood AC
✓ DoD and Success Criteria AC
✓ ADR-001 mini CRM decision

⸻

39. 下一步｜Next Step

完成本文档后，进入下一步：

After this document, move to:

#5｜Information Architecture 信息架构与流程文档
docs/04-information-architecture.md

下一份文档将定义：

The next document will define:

OCN 状态流
OCN command flow
Artifact flow
Gate flow
Brief / Prompt flow
MCP interaction flow
Error / recovery flow
Dogfood flow

本 AC v1.1 封版后，后续若发现新验收要求，原则上通过 amendment 追加，不直接反复改写主体。

After AC v1.1 is sealed, future acceptance changes should be added through amendments rather than repeatedly rewriting the main body.