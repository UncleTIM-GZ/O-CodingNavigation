# O’CodingNavigator API Contract
# #7｜API Contract 接口契约文档 v1.1
文档路径：`docs/06-api-contract.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.1`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
Schema Version：`1.0`  
当前状态：`DESIGN`  
当前 Step：`step_api_contract`  
依赖文档：  
- `docs/00-project-brief.md`
- `docs/01-scope.md`
- `docs/02-prd.md`
- `docs/03-acceptance-criteria.md`
- `docs/04-information-architecture.md`
- `docs/05-data-model.md`
对应 SOP：第 7 步｜先定 API 契约
---
# 1. 文档目的｜Purpose
本文档定义 O’CodingNavigator v1.0 的接口契约，包括 CLI 命令契约、Core Engine 函数契约、MCP tool 契约、统一返回结构、stdout / stderr 输出规则、exit code 映射、错误返回契约、并发契约、事件写入契约和锁机制契约。
This document defines O’CodingNavigator v1.0 API contracts, including CLI command contracts, Core Engine function contracts, MCP tool contracts, unified result structure, stdout / stderr rules, exit code mapping, error result contracts, concurrency contracts, event persistence contracts, and lock contracts.
本文档回答：
1. 用户可以调用哪些 CLI 命令？  
   Which CLI commands can users call?
2. 每个命令的输入、输出、副作用和错误是什么？  
   What are the inputs, outputs, side effects, and errors of each command?
3. CLI 的 stdout / stderr / exit code 如何工作？  
   How do CLI stdout / stderr / exit codes work?
4. Core Engine 对外暴露哪些函数？  
   What Core Engine functions are exposed?
5. MCP Server 暴露哪些 tool，不暴露哪些 tool？  
   Which MCP tools are exposed or not exposed?
6. 所有接口如何返回 `BaseResult`、`CommandResult`、`CoreResult`、`MCPToolResult`？  
   How do APIs return `BaseResult`, `CommandResult`, `CoreResult`, and `MCPToolResult`?
7. 哪些接口会写 `.ocoding/`，哪些会写 `docs/`？  
   Which APIs write `.ocoding/`, and which write `docs/`?
8. 哪些接口必须加 lock？  
   Which APIs must acquire lock?
9. 哪些接口必须写 audit event？  
   Which APIs must write audit events?
10. 业务失败和异常错误如何区分？  
    How are business failures and unexpected errors distinguished?
11. 并发调用时 CLI / MCP 如何共享 lock？  
    How do CLI / MCP share locks under concurrent calls?
12. API Contract 如何继承 Data Model v1.1 的约束？  
    How does this API Contract inherit constraints from Data Model v1.1?
---
# 2. 契约原则｜Contract Principles
## 2.1 API Contract 不重新定义 Data Model
本文档只引用 `docs/05-data-model.md` 中定义的数据模型，不重新定义字段和 enum。
This document references data models defined in `docs/05-data-model.md` and does not redefine fields or enums.
如果 API Contract 发现字段缺失，必须写入 Data Model Amendment。
If a missing field is discovered, write a Data Model Amendment.
---
## 2.2 继承 Data Model v1.1
本文档继承 Data Model v1.1 中的以下设计：
This document inherits the following from Data Model v1.1:
```text id="u1iwl7"
ID Generation Strategy
Field Constraint Rules
Schema Versioning
Dual Persistence Strategy
Serialization Layer
Object Ownership and Mutation Matrix
BilingualMessage
TestSource
AuditResult
ActivationTrigger
ArtifactStatus stale

⸻

2.3 所有输出必须结构化｜All Outputs Must Be Structured

所有 CLI / Core Engine / MCP 返回都必须能映射为结构化对象。

All CLI / Core Engine / MCP outputs must map to structured objects.

人类可读输出只是结构化结果的渲染。
Human-readable output is only a rendering of structured result.

⸻

2.4 CLI 输出双语，机器 key 英文｜Bilingual CLI, English Machine Keys

CLI 的人类可读信息必须中英文双语。

CLI human-readable messages must be bilingual.

机器字段必须使用英文 stable key。

Machine keys must use English stable keys.

⸻

2.5 Core Engine 不关心展示｜Core Engine Is Presentation-free

Core Engine 返回结构化对象，不负责终端排版。

Core Engine returns structured objects and does not handle terminal formatting.

CLI Layer 负责渲染：

table
plain text
JSON
debug trace

⸻

2.6 MCP 只暴露安全工具｜MCP Exposes Safe Tools Only

MCP v1.0 不暴露任何可推进状态、重置项目、修改 SOP 或写正式决策的工具。

MCP v1.0 does not expose tools that advance state, reset project, modify SOP, or write formal decisions.

禁止暴露：

navigator.advance_phase
navigator.capture_decision
navigator.reset_project
navigator.modify_sop_profile

⸻

2.7 写操作必须加锁｜Write Operations Must Lock

所有写操作必须通过 LockState。

All write operations must use LockState.

写操作包括：

init
doc create
check
gate
advance
log
baseline create
reset
test record
doctor --snapshot
doctor --release-lock

⸻

2.8 事件类对象双轨写入｜Events Use Dual Persistence

事件类对象必须同时写：

Event objects must be written to both:

机器可读层：.ocoding/events/*.jsonl
人类可读层：docs/*.md

除非 Data Model 明确说明该对象只有机器可读层。

⸻

2.9 错误不得抛裸异常｜No Raw Exception Leakage

任何接口不得向用户或 MCP agent 泄漏未处理异常。

No API may leak unhandled exceptions to user or MCP agent.

错误必须返回：

ErrorResult
stable ErrorCode
BilingualMessage
nextActions

⸻

2.10 支持 piping，不支持 streaming｜Piping Supported, Streaming Not Required

v1.0 支持 piping。

v1.0 supports piping.

示例：

ocn brief | cat
ocn brief --json | jq .data

v1.0 不要求支持 streaming。

v1.0 does not require streaming.

pipe 场景：

禁用 color
禁用 progress indicator
输出必须可被下游命令稳定消费

⸻

3. 通用返回结构｜Common Result Contracts

3.1 BaseResult

所有层统一基于 BaseResult<T>。

All layers use BaseResult<T> as the base shape.

interface BaseResult<T = unknown> {
  ok: boolean;
  code: ErrorCode;
  message?: BilingualMessage;
  data?: T;
  error?: ErrorResult;
}

规则：

ok = true 时 code 必须为 OK。
When ok = true, code must be OK.
ok = false 时 error 必须存在。
When ok = false, error must exist.
data 只承载业务数据，不承载错误。
data contains business data only, not errors.

⸻

3.2 CommandResult

CLI 命令统一返回 CommandResult<T>，CLI Layer 再渲染为终端输出。

CLI commands return CommandResult<T>, rendered by CLI Layer.

type CommandResult<T = unknown> = BaseResult<T>;

⸻

3.3 CoreResult

Core Engine 函数统一返回 CoreResult<T>。

Core Engine functions return CoreResult<T>.

type CoreResult<T = unknown> = BaseResult<T>;

Core Engine 可以不设置 message，但 ok=false 时必须设置 error。

Core Engine may omit message, but must provide error when ok=false.

⸻

3.4 MCPToolResult

MCP tool 返回 MCPToolResult<T>。

MCP tools return MCPToolResult<T>.

type MCPToolResult<T = unknown> = BaseResult<T> & {
  message: BilingualMessage;
};

规则：

MCPToolResult.message 必填。
MCPToolResult.message is required.
MCP 客户端可通过 ok 或 code 判断成功失败。
MCP clients may use ok or code to determine success.

⸻

3.5 ErrorResult

错误统一使用 Data Model 中定义的 ErrorResult。

Errors use ErrorResult defined in Data Model.

interface ErrorResult {
  code: ErrorCode;
  message: BilingualMessage;
  nextActions: BilingualMessage[];
  relatedFile?: string;
  details?: Record<string, unknown>;
}

⸻

4. CLI Output Contract｜CLI 输出契约

4.1 stdout / stderr 分流

默认规则：

stdout:
正常结果输出。
Normal result output.
stderr:
错误信息、warning、debug trace、progress message。
Error messages, warnings, debug traces, and progress messages.

⸻

4.2 默认人类可读模式｜Default Human-readable Mode

默认模式下：

ok=true:
  bilingual message 和主要结果输出到 stdout。
ok=false:
  bilingual error message 输出到 stderr。
  nextActions 输出到 stderr。
  exit code 非 0。

⸻

4.3 --json 模式

--json 模式下：

输出完整 CommandResult<T>。
Output full CommandResult<T>.
输出到 stdout。
Output to stdout.
即使 ok=false，也输出 JSON 到 stdout，方便脚本解析。
Even when ok=false, JSON is still written to stdout for script parsing.
stderr 仅用于 debug trace 或无法序列化 JSON 的极端异常。
stderr is used only for debug trace or extreme JSON serialization failures.
JSON 使用单行 minified 格式。
JSON uses single-line minified format.

示例：

{"ok":false,"code":"ERR_GATE_FAILED","message":{"en":"Gate failed.","zh":"门禁未通过。"},"error":{"code":"ERR_GATE_FAILED","message":{"en":"Gate failed.","zh":"门禁未通过。"},"nextActions":[{"en":"Run ocn check.","zh":"运行 ocn check。"}]}}

⸻

4.4 Exit Code Mapping｜退出码映射

ErrorCode	Exit Code
OK	0
ERR_GATE_FAILED	1
ERR_ARTIFACT_INVALID	2
ERR_STATE_MACHINE	3
ERR_IO_OR_CONFIG	4
ERR_SOP_VERSION	5
unhandled exception	99

说明：

unhandled exception 不应在正常实现中出现。
unhandled exception should not occur in normal implementation.
如果出现，必须写 .ocoding/.errors.log，如果 .ocoding 可用。
If it occurs, write .ocoding/.errors.log when .ocoding is available.

⸻

4.5 Color Contract｜颜色输出契约

颜色规则：

stdout 是 TTY 时默认启用 color。
Enable color by default when stdout is TTY.
NO_COLOR=1 禁用 color。
NO_COLOR=1 disables color.
--no-color 禁用 color。
--no-color disables color.
--color=always 强制启用 color。
--color=always forces color.
pipe 场景默认禁用 color。
Disable color by default when output is piped.

⸻

4.6 Quiet / Debug / Trace

v1.0 支持：

--debug
--trace

输出规则：

debug / trace 输出到 stderr。
debug / trace output goes to stderr.
debug / trace 不得污染 --json stdout。
debug / trace must not pollute --json stdout.

v1.0 不要求支持：

--quiet

⸻

5. Concurrency Contract｜并发契约

5.1 读写并发原则

读操作：

不获取 lock。
Do not acquire lock.
必须使用 atomic read。
Must use atomic read.
读到 commit 前或 commit 后的完整文件。
Read either pre-commit or post-commit full file.
不得读到半截文件。
Must never read partial file.

写操作：

必须获取 lock。
Must acquire lock.
同一项目同一时刻只有一个写操作。
Only one write operation per project at a time.

⸻

5.2 CLI / MCP 并发

CLI 和 MCP 共用同一份 .ocoding/.lock。
CLI and MCP share the same .ocoding/.lock.
LockState.client 必须记录 cli 或 mcp。
LockState.client must record cli or mcp.
同一项目内，CLI 写操作和 MCP 写操作互斥。
Within the same project, CLI writes and MCP writes are mutually exclusive.

⸻

5.3 MCP Server 并发模型

v1.0 MCP Server：

单进程。
Single process.
读操作可并发。
Read operations may run concurrently.
写操作通过 lock 串行化。
Write operations are serialized through lock.
单个 tool call 超时 30 秒。
Single tool call timeout: 30 seconds.

超时返回：

ERR_IO_OR_CONFIG

⸻

5.4 Lock Holder 信息

当 lock 被占用时，错误或等待提示应包含：

pid
command
client
createdAt

来源：

.ocoding/.lock

⸻

6. Audit Trigger Contract｜审计触发契约

6.1 Audit 触发表

AuditEventType	Trigger
project_initialized	ocn init 成功
lock_acquired	写操作成功获得 lock
lock_released	写操作释放 lock
lock_stale_recovered	stale lock 被恢复
artifact_gate_blocked	ocn check 发现 blocked
gate_run	每次 ocn gate
gate_failed	ocn gate 结果为 blocked
advance_succeeded	ocn advance 成功
advance_failed	ocn advance gate blocked 或非法推进
baseline_created	ocn baseline create 成功
reset_executed	任意 reset 成功
sop_version_checked	ocn sop version 执行
sop_version_diff_detected	sop version / diff / upgrade 检测到差异
doctor_run	每次 ocn doctor

⸻

6.2 Audit 写入规则

AuditEvent 必须双轨写入：

.ocoding/events/audit-events.jsonl
docs/21-audit-trail.md

如果 JSONL 写入失败：

返回 ERR_IO_OR_CONFIG
不得只写 Markdown

如果 Markdown 写入失败：

返回 warning
写 .ocoding/.errors.log
机器事实源以 JSONL 为准

⸻

7. Event Persistence and Transaction Boundary｜事件写入与事务边界

7.1 改 state 的写操作

适用于：

ocn check
ocn gate
ocn advance
ocn reset
ocn init
ocn doctor --release-lock

事务顺序：

1. 内存中计算 state diff 和 audit event
2. acquire lock
3. backup state.json
4. write state.json.tmp
5. atomic rename state.json.tmp → state.json
6. write JSONL event
7. write Markdown narrative view
8. release lock

事务边界：

step 5 之前失败：
  整个操作失败。
  state 不变。
  不写成功 audit。
step 5 成功后：
  state 已提交。
  JSONL / Markdown 写失败时返回 warning，并写 .errors.log。

⸻

7.2 不改 state 的事件写操作

适用于：

ocn log
ocn log --type decision
ocn baseline create

写入顺序：

1. generate runtime id
2. write JSONL event
3. write Markdown narrative view

失败规则：

JSONL 写入失败：
  整个操作失败。
  返回 ERR_IO_OR_CONFIG。
  不得只写 Markdown。
Markdown 写入失败：
  返回 warning。
  写 .ocoding/.errors.log。
  JSONL 仍为机器事实源。

⸻

7.3 JSONL append-only

JSONL 事件文件必须 append-only。

JSONL event files must be append-only.

历史修正不得直接改旧行。
Historical correction must not edit old lines directly.

应追加 correction event。
Append a correction event instead.

⸻

8. Common Execution Pipeline｜通用执行流程

8.1 CLI 命令通用流程

parse args
  ↓
load project context when needed
  ↓
load SOP profile when needed
  ↓
verify schemaVersion
  ↓
verify sopProfileVersion compatibility
  ↓
acquire lock if write operation
  ↓
call Core Engine
  ↓
write files / events if needed
  ↓
release lock
  ↓
render according to CLI Output Contract

⸻

8.2 Core Engine 通用输入

大多数 Core Engine 函数接受：

interface CoreContext {
  projectRoot: string;
  client: ClientType;
  actor: ActorType;
  now: string;
  debug?: boolean;
  trace?: boolean;
}

字段来自 Data Model：

ClientType
ActorType
ISO UTC time

⸻

8.3 Pre-flight 缓存策略

CLI：

v1.0 单次命令不跨进程缓存。
v1.0 CLI does not cache across processes.

MCP Server：

v1.0 MCP server 可在单进程内缓存 SOPProfile。
v1.0 MCP server may cache SOPProfile in-process.
缓存必须基于 mtime invalidation。
Cache must be invalidated by mtime.

⸻

9. Business Failure vs Unexpected Error｜业务失败与异常错误

9.1 Business Failure

Business Failure 是 OCN 预期中的流程结果。

Business Failure is an expected workflow outcome.

示例：

gate blocked
artifact required section missing
advance blocked by gate
research log before DESIGN returns warning

规则：

返回 ok=false。
Return ok=false.
返回稳定 ErrorCode。
Return stable ErrorCode.
必要时写 audit。
Write audit when required.
不得抛异常。
Must not throw raw exception.

⸻

9.2 Unexpected Error

Unexpected Error 是系统异常或 IO / 配置错误。

Unexpected Error is system, IO, or config failure.

示例：

state.json 损坏
sop.yaml 无法解析
写文件失败
lock timeout
unsupported test source

规则：

返回 ok=false。
Return ok=false.
返回 ErrorResult。
Return ErrorResult.
尽力写 .ocoding/.errors.log。
Best-effort write to .ocoding/.errors.log.

⸻

10. CLI Command Contract 总览

10.1 CLI 命令列表

v1.0 定义以下 CLI 命令：

ocn init [--tier minimal|production|full] [--json]
ocn status [--json]
ocn brief [--json]
ocn prompt next [--json]
ocn doc create <type> [--json]
ocn check [--include-tests] [--json]
ocn gate [--json]
ocn advance [--json]
ocn log [--type dev|research|decision] [--json]
ocn baseline create [--json]
ocn sop version [--json]
ocn sop diff [--json]
ocn sop upgrade --plan [--target <version>] [--json]
ocn doctor [--snapshot] [--release-lock] [--json]
ocn reset --keep-docs [--json]
ocn reset --keep-state [--json]
ocn reset --hard [--confirm] [--json]
ocn test record --from vitest <path> [--json]

⸻

10.2 CLI 命令属性表

Command	R/W	Lock	Audit	MCP Equivalent
ocn init	write	yes	always	no
ocn status	read	no	no	navigator.where_am_i
ocn brief	read	no	no	navigator.brief
ocn prompt next	read	no	no	navigator.generate_next_prompt
ocn doc create <type>	write	yes	no	navigator.create_artifact
ocn check [--include-tests]	write	yes	only if blocked	navigator.run_gate partial
ocn gate	write	yes	always	navigator.run_gate
ocn advance	write	yes	always	no
`ocn log [–type dev	research]`	write	yes	no
ocn log --type decision	write	yes	no	no
ocn baseline create	write	yes	always	no
ocn sop version	read	no	only if diff detected	navigator.detect_sop_version
ocn sop diff	read	no	only if diff detected	no
ocn sop upgrade --plan	read / optional output	no	only if diff detected	no
ocn doctor	read	no	always	no
ocn doctor --snapshot	write	yes	always	no
ocn doctor --release-lock	write	yes	if stale lock recovered	no
ocn reset --keep-docs	write	yes	always	no
ocn reset --keep-state	write	yes	always	no
ocn reset --hard	write	yes	always	no
ocn test record	write	yes	no	no

⸻

11. ocn init Contract

11.1 用途｜Purpose

初始化 OCN 项目。

Initialize an OCN project.

11.2 Command

ocn init [--tier minimal|production|full] [--json]

11.3 Input

interface InitInput {
  tier?: Tier;
  json?: boolean;
}

默认：

tier = minimal

11.4 Output

CommandResult<ProjectState>

11.5 Side Effects

必须创建：

.ocoding/
docs/
.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
.ocoding/config.yaml
.ocoding/events/
.ocoding/events/audit-events.jsonl
.ocoding/events/log-events.jsonl
.ocoding/events/decision-events.jsonl
.ocoding/events/research-events.jsonl
docs/21-audit-trail.md

必须写入：

AuditEvent: project_initialized

11.6 已初始化定义｜Initialized Definition

“已初始化”定义为：

.ocoding/state.json 存在且内容是合法 JSON。
.ocoding/state.json exists and is valid JSON.

如果 .ocoding/ 部分存在但 state.json 缺失或损坏：

返回 ERR_STATE_MACHINE
建议运行 ocn doctor

11.7 Business Failure

场景	ErrorCode
已初始化	ERR_STATE_MACHINE
tier 不合法	ERR_IO_OR_CONFIG

11.8 Unexpected Error

场景	ErrorCode
写文件失败	ERR_IO_OR_CONFIG
内置 SOPProfile 缺失	ERR_IO_OR_CONFIG

⸻

12. ocn status Contract

12.1 用途

查看当前项目位置、阻塞和下一步。

Show current project position, blockers, and next actions.

12.2 Command

ocn status [--json]

12.3 Input

interface StatusInput {
  json?: boolean;
}

12.4 Output

interface StatusOutput {
  project: Project;
  currentStateId: StateId;
  currentStepId: StepId;
  currentArtifactStatus?: ArtifactStatus;
  currentArtifactGateStatus?: ArtifactGateStatus;
  latestGateResult?: GateResult;
  blockers: BilingualMessage[];
  nextActions: BilingualMessage[];
}

Return:

CommandResult<StatusOutput>

12.5 Side Effects

无。
None.

12.6 Errors

场景	ErrorCode
未初始化	ERR_STATE_MACHINE
state.json 损坏	ERR_STATE_MACHINE
schemaVersion 不兼容	ERR_STATE_MACHINE
SOP 版本不兼容	ERR_SOP_VERSION

⸻

13. ocn brief Contract

13.1 用途

生成当前项目的 AI / 用户上下文简报。

Generate current project brief for AI / user.

13.2 Command

ocn brief [--json]

13.3 Input

interface BriefInput {
  json?: boolean;
}

13.4 Output

CommandResult<BriefContent>

13.5 Data Sources

BriefContent 来源：

.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
.ocoding/events/log-events.jsonl
.ocoding/events/decision-events.jsonl
.ocoding/events/research-events.jsonl
docs/*.md existence / mtime

13.6 Side Effects

无。
None.

13.7 Required Content

Brief 必须包含：

currentStateId
currentStepId
current blockers
completed artifacts
missing artifacts
latest gate result
recent decisions
recent logs
recent research
AI governance rules
uncertainty policy
next actions

⸻

14. ocn prompt next Contract

14.1 用途

生成当前 step 的下一步 AI 执行 prompt。

Generate next AI prompt for current step.

14.2 Command

ocn prompt next [--json]

14.3 Input

interface PromptNextInput {
  json?: boolean;
}

14.4 Output

CommandResult<PromptContent>

14.5 Side Effects

无。
None.

14.6 Required Injection

必须注入：

targetStepId
targetArtifactId
requiredSections
blockingCriteria
warningCriteria
qualityChecklist
AI governance rules
uncertainty policy
Self-check rule
Do not mark blocked artifact as complete

⸻

15. ocn doc create <type> Contract

15.1 用途

创建 artifact 模板。

Create artifact template.

15.2 Command

ocn doc create <type> [--json]

示例：

ocn doc create prd
ocn doc create acceptance-criteria
ocn doc create information-architecture

15.3 Input

interface DocCreateInput {
  type: string;
  json?: boolean;
}

15.4 Output

interface DocCreateOutput {
  artifactId: string;
  path: string;
  created: boolean;
  usedTemplate: "builtin" | "project_override";
}

Return:

CommandResult<DocCreateOutput>

15.5 Side Effects

写入：

docs/<artifact>.md

如果项目存在：

.ocoding/templates/<type>.md

优先使用项目模板，但必须保留 required sections。

15.6 Business Failure

场景	ErrorCode
type 不存在	ERR_ARTIFACT_INVALID
type = spec	ERR_ARTIFACT_INVALID
自定义模板缺 required sections	ERR_ARTIFACT_INVALID

15.7 Unexpected Error

场景	ErrorCode
未初始化	ERR_STATE_MACHINE
写文件失败	ERR_IO_OR_CONFIG

⸻

16. ocn check Contract

16.1 用途

检查当前 step artifact。

Check current step artifact.

16.2 Command

ocn check [--include-tests] [--json]

16.3 Input

interface CheckInput {
  includeTests?: boolean;
  json?: boolean;
}

16.4 Output

interface CheckOutput {
  currentStateId: StateId;
  currentStepId: StepId;
  artifactGateStatus: ArtifactGateStatus;
  testRecord?: TestRecord;
  nextActions: BilingualMessage[];
}

Return:

CommandResult<CheckOutput>

16.5 Side Effects

必须更新：

.ocoding/state.json.artifactGateStatus[currentStepId]

如 blocked，必须写：

AuditEvent: artifact_gate_blocked

写入：

.ocoding/events/audit-events.jsonl
docs/21-audit-trail.md

16.6 Business Failure

场景	ErrorCode
artifact 缺失	ERR_ARTIFACT_INVALID
required section 缺失	ERR_ARTIFACT_INVALID
self-check 与 AST 不一致	ERR_ARTIFACT_INVALID

16.7 Unexpected Error

场景	ErrorCode
markdown parser crash	ERR_ARTIFACT_INVALID
state 写入失败	ERR_IO_OR_CONFIG
SOP profile 无效	ERR_SOP_VERSION
include-tests 但 test record 不存在	ERR_IO_OR_CONFIG

16.8 Result Mapping

ArtifactGateStatus.status	CommandResult.ok	code
pass	true	OK
warning	true	OK
blocked	false	ERR_ARTIFACT_INVALID
not_applicable	true	OK

⸻

17. ocn gate Contract

17.1 用途

执行当前 state 的 gate 聚合检查。

Run current state gate aggregation.

17.2 Command

ocn gate [--json]

17.3 Input

interface GateInput {
  json?: boolean;
}

17.4 Output

CommandResult<GateResult>

17.5 Side Effects

必须写：

AuditEvent: gate_run

如果 blocked：

AuditEvent: gate_failed

写入：

.ocoding/state.json.latestGateResult
.ocoding/events/audit-events.jsonl
docs/21-audit-trail.md

17.6 Business Failure

场景	ErrorCode
任一 required artifact blocked	ERR_GATE_FAILED

17.7 Unexpected Error

场景	ErrorCode
state 不存在	ERR_STATE_MACHINE
SOP profile 不兼容	ERR_SOP_VERSION
写入 latestGateResult 失败	ERR_IO_OR_CONFIG

⸻

18. ocn advance Contract

18.1 用途

在 gate pass 后推进状态。

Advance project state after gate pass.

18.2 Command

ocn advance [--json]

18.3 Input

interface AdvanceInput {
  json?: boolean;
}

18.4 Output

interface AdvanceOutput {
  previousStateId: StateId;
  previousStepId: StepId;
  currentStateId: StateId;
  currentStepId: StepId;
  gateResult: GateResult;
}

Return:

CommandResult<AdvanceOutput>

18.5 Side Effects

如果成功：

更新 .ocoding/state.json.currentStateId
更新 .ocoding/state.json.currentStepId
写 AuditEvent: advance_succeeded

如果失败：

不改变 currentStateId
不改变 currentStepId
写 AuditEvent: advance_failed

18.6 Business Failure

场景	ErrorCode	Side Effect
gate blocked	ERR_GATE_FAILED	写 advance_failed audit
非法状态跳转	ERR_STATE_MACHINE	写 advance_failed audit

18.7 Unexpected Error

场景	ErrorCode
SOP 版本不兼容	ERR_SOP_VERSION
写 state 失败	ERR_IO_OR_CONFIG
state.json 损坏	ERR_STATE_MACHINE

⸻

19. ocn log Contract

19.1 用途

写入 dev log、research log 或 formal decision。

Write dev log, research log, or formal decision.

19.2 Command

ocn log [--type dev|research|decision] [--json]

默认：

type = dev

⸻

19.3 Input Discriminated Union

type LogCommandInput =
  | DevLogInput
  | ResearchLogInput
  | DecisionLogInput;
interface DevLogInput {
  type?: "dev";
  message: string;
  changedFiles?: string[];
  testResultId?: string;
  risk?: string;
  nextAction?: string;
  json?: boolean;
}
interface ResearchLogInput {
  type: "research";
  message: string;
  changedFiles?: string[];
  testResultId?: string;
  risk?: string;
  nextAction?: string;
  json?: boolean;
}
interface DecisionLogInput {
  type: "decision";
  decision: BilingualMessage;
  context: BilingualMessage;
  options: BilingualMessage[];
  chosenOption: BilingualMessage;
  reason: BilingualMessage;
  risks: BilingualMessage[];
  relatedArtifactIds: string[];
  json?: boolean;
}

⸻

19.4 Validation Rules

type = decision 时：
  decision / context / options / chosenOption / reason 必填。
  拒绝 message / changedFiles / testResultId。
type = dev 或 research 时：
  message 必填。
  拒绝 decision / options / chosenOption / reason 等 decision 专用字段。

⸻

19.5 Output

如果 type = dev 或 research：

CommandResult<LogEntry>

如果 type = decision：

CommandResult<DecisionEntry>

⸻

19.6 Side Effects

dev：

.ocoding/events/log-events.jsonl
docs/18-dev-log.md

research：

.ocoding/events/research-events.jsonl
docs/17-research-log.md

decision：

.ocoding/events/decision-events.jsonl
docs/19-decision-log.md

⸻

19.7 Research Warning

如果当前 state 早于 state_design，执行：

ocn log --type research

应返回 warning，但不 hard block。

⸻

19.8 Decision 权限规则

DecisionEntry 只能由 CLI user 创建。
MCP / AI agent 不可创建 DecisionEntry。

⸻

19.9 Business Failure

场景	ErrorCode
decision 由 MCP 写入	ERR_GATE_FAILED
research 早于 DESIGN	OK with warning

19.10 Unexpected Error

场景	ErrorCode
input schema 不合法	ERR_IO_OR_CONFIG
写入 JSONL 失败	ERR_IO_OR_CONFIG
写入 Markdown 失败	OK with warning

⸻

20. ocn baseline create Contract

20.1 用途

创建稳定基线。

Create stable baseline.

20.2 Command

ocn baseline create [--json]

20.3 Input

interface BaselineCreateInput {
  json?: boolean;
}

20.4 Output

CommandResult<Baseline>

20.5 Side Effects

写入：

.ocoding/baselines/baseline-<timestamp>.json
docs/15-baseline.md
.ocoding/events/audit-events.jsonl
docs/21-audit-trail.md

AuditEvent：

baseline_created

20.6 Business Failure

场景	ErrorCode
当前状态不适合 baseline	ERR_GATE_FAILED

20.7 Unexpected Error

场景	ErrorCode
项目未初始化	ERR_STATE_MACHINE
写入失败	ERR_IO_OR_CONFIG

⸻

21. ocn sop version Contract

21.1 用途

显示项目锁定的 SOP 版本和当前 OCN 支持的 SOP 版本。

Show locked SOP version and current OCN supported SOP version.

21.2 Command

ocn sop version [--json]

21.3 Output

interface SOPVersionOutput {
  sopProfileId: string;
  lockedVersion: string;
  supportedVersion: string;
  sopLockedAt: string;
  compatible: boolean;
}

Return:

CommandResult<SOPVersionOutput>

21.4 Side Effects

如果检测到 diff：

AuditEvent: sop_version_diff_detected

否则无。
Otherwise none.

⸻

22. ocn sop diff Contract

22.1 用途

显示项目 SOP 与当前支持 SOP 的差异。

Show diff between locked project SOP and current supported SOP.

22.2 Command

ocn sop diff [--json]

22.3 Output

CommandResult<SOPVersionDiff>

22.4 Side Effects

如果检测到 diff：

AuditEvent: sop_version_diff_detected

否则不修改项目文件。
Otherwise does not modify project files.

⸻

23. ocn sop upgrade --plan Contract

23.1 用途

生成 SOP 升级计划，但不修改项目。

Generate SOP upgrade plan without modifying project.

23.2 Command

ocn sop upgrade --plan [--target <version>] [--json]

23.3 Input

interface SOPUpgradePlanInput {
  targetVersion?: string;
  json?: boolean;
}

23.4 Output

CommandResult<SOPUpgradePlan>

23.5 Side Effects

默认不写文件。
No file write by default.

如果检测到 diff：

AuditEvent: sop_version_diff_detected

如果用户显式传入保存参数，可写：

.ocoding/upgrade-plan-<timestamp>.json

v1.0 不要求保存。

⸻

24. ocn doctor Contract

24.1 用途

诊断项目状态、配置、锁、模板、SOP 兼容性。

Diagnose project state, config, lock, templates, and SOP compatibility.

24.2 Command

ocn doctor [--snapshot] [--release-lock] [--json]

24.3 Input

interface DoctorInput {
  snapshot?: boolean;
  releaseLock?: boolean;
  json?: boolean;
}

24.4 Output

CommandResult<DoctorReport>

24.5 Checks

必须检查：

.ocoding exists
state.json valid
schemaVersion supported
sop.yaml valid
gates.yaml valid
currentStateId exists
currentStepId exists
artifact paths valid
template overrides valid
SOP version compatible
lock state valid

24.6 Side Effects

普通 doctor：

写 AuditEvent: doctor_run

--snapshot：

写 .ocoding/snapshots/snapshot-<timestamp>.json

--release-lock：

仅 stale lock 可释放
写 AuditEvent: lock_stale_recovered

24.7 Force Release

v1.0 不支持：

ocn doctor --release-lock --force

作为 v1.1 candidate。
Candidate for v1.1.

24.8 Business Failure

场景	ErrorCode
lock 未 stale 却 release	ERR_IO_OR_CONFIG

24.9 Unexpected Error

场景	ErrorCode
state.json 损坏	ERR_STATE_MACHINE
SOP 版本不兼容	ERR_SOP_VERSION
snapshot 写入失败	ERR_IO_OR_CONFIG

⸻

25. ocn reset Contract

25.1 用途

重置 OCN 管理文件。

Reset OCN-managed files.

25.2 Commands

ocn reset --keep-docs [--json]
ocn reset --keep-state [--json]
ocn reset --hard [--confirm] [--json]

25.3 Input

interface ResetInput {
  mode: "keep_docs" | "keep_state" | "hard";
  confirm?: boolean;
  json?: boolean;
}

25.4 Output

interface ResetOutput {
  mode: "keep_docs" | "keep_state" | "hard";
  deletedPaths: string[];
  preservedPaths: string[];
}

Return:

CommandResult<ResetOutput>

25.5 Side Effects

必须写：

AuditEvent: reset_executed

25.6 Safety Rules

reset 不得默认删除 src/
reset 不得默认删除 package.json
reset 不得默认删除 .git/
reset --hard 必须二次确认

25.7 Business Failure

场景	ErrorCode
hard reset 未确认	ERR_IO_OR_CONFIG

25.8 Unexpected Error

场景	ErrorCode
删除失败	ERR_IO_OR_CONFIG
未初始化	ERR_STATE_MACHINE

⸻

26. ocn test record Contract

26.1 用途

记录测试结果。

Record test result.

26.2 Command

ocn test record --from vitest <path> [--json]

26.3 Input

interface TestRecordInput {
  source: TestSource;
  path: string;
  json?: boolean;
}

26.4 Output

CommandResult<TestRecord>

26.5 Side Effects

写入：

.ocoding/test-results/test-record-<timestamp>.json

26.6 Business Failure

场景	ErrorCode
source 不支持	ERR_IO_OR_CONFIG
path 非用户显式传入	ERR_IO_OR_CONFIG

26.7 Unexpected Error

场景	ErrorCode
path 不存在	ERR_IO_OR_CONFIG
格式解析失败	ERR_IO_OR_CONFIG
写入失败	ERR_IO_OR_CONFIG

⸻

27. Core Engine Function Contracts

27.1 函数列表

Core Engine v1.0 暴露以下内部函数：

initProject
getStatus
generateBrief
generateNextPrompt
createArtifact
checkCurrentArtifact
runGate
advanceState
captureLog
captureDecision
createBaseline
getSOPVersion
diffSOPVersion
planSOPUpgrade
runDoctor
resetProject
recordTestResult

⸻

27.2 initProject

function initProject(
  ctx: CoreContext,
  input: InitInput
): Promise<CoreResult<ProjectState>>;

副作用：

create .ocoding/
create docs/
write state.json
write sop.yaml
write gates.yaml
write config.yaml
write initial audit event

⸻

27.3 getStatus

function getStatus(
  ctx: CoreContext,
  input: StatusInput
): Promise<CoreResult<StatusOutput>>;

副作用：

none

⸻

27.4 generateBrief

function generateBrief(
  ctx: CoreContext,
  input: BriefInput
): Promise<CoreResult<BriefContent>>;

副作用：

none

⸻

27.5 generateNextPrompt

function generateNextPrompt(
  ctx: CoreContext,
  input: PromptNextInput
): Promise<CoreResult<PromptContent>>;

副作用：

none

⸻

27.6 createArtifact

function createArtifact(
  ctx: CoreContext,
  input: DocCreateInput
): Promise<CoreResult<DocCreateOutput>>;

副作用：

write docs/<artifact>.md

⸻

27.7 checkCurrentArtifact

function checkCurrentArtifact(
  ctx: CoreContext,
  input: CheckInput
): Promise<CoreResult<CheckOutput>>;

副作用：

update state.json.artifactGateStatus
write audit if blocked

⸻

27.8 runGate

function runGate(
  ctx: CoreContext,
  input: GateInput
): Promise<CoreResult<GateResult>>;

副作用：

update state.json.latestGateResult
write audit

⸻

27.9 advanceState

function advanceState(
  ctx: CoreContext,
  input: AdvanceInput
): Promise<CoreResult<AdvanceOutput>>;

副作用：

run gate
update state.json if pass
write audit success or failed

⸻

27.10 captureLog

function captureLog(
  ctx: CoreContext,
  input: DevLogInput | ResearchLogInput
): Promise<CoreResult<LogEntry>>;

副作用：

write .ocoding/events/log-events.jsonl
write docs/18-dev-log.md
or write .ocoding/events/research-events.jsonl
or write docs/17-research-log.md

⸻

27.11 captureDecision

function captureDecision(
  ctx: CoreContext,
  input: DecisionLogInput
): Promise<CoreResult<DecisionEntry>>;

约束：

ctx.client 必须是 cli。
ctx.actor 必须是 user。

副作用：

write .ocoding/events/decision-events.jsonl
write docs/19-decision-log.md

⸻

27.12 createBaseline

function createBaseline(
  ctx: CoreContext,
  input: BaselineCreateInput
): Promise<CoreResult<Baseline>>;

副作用：

write .ocoding/baselines/*.json
write docs/15-baseline.md
write audit

⸻

27.13 getSOPVersion

function getSOPVersion(
  ctx: CoreContext
): Promise<CoreResult<SOPVersionOutput>>;

副作用：

write audit only if diff detected

⸻

27.14 diffSOPVersion

function diffSOPVersion(
  ctx: CoreContext
): Promise<CoreResult<SOPVersionDiff>>;

副作用：

write audit only if diff detected

⸻

27.15 planSOPUpgrade

function planSOPUpgrade(
  ctx: CoreContext,
  input: SOPUpgradePlanInput
): Promise<CoreResult<SOPUpgradePlan>>;

副作用：

default none
optional write upgrade plan if explicit save flag is later introduced
write audit only if diff detected

⸻

27.16 runDoctor

function runDoctor(
  ctx: CoreContext,
  input: DoctorInput
): Promise<CoreResult<DoctorReport>>;

副作用：

write audit
optional write snapshot
optional release stale lock

⸻

27.17 resetProject

function resetProject(
  ctx: CoreContext,
  input: ResetInput
): Promise<CoreResult<ResetOutput>>;

副作用：

delete / rebuild OCN-managed files according to reset mode
write audit

⸻

27.18 recordTestResult

function recordTestResult(
  ctx: CoreContext,
  input: TestRecordInput
): Promise<CoreResult<TestRecord>>;

副作用：

write .ocoding/test-results/*.json

⸻

28. MCP Tool Contracts

28.1 MCP 暴露列表

v1.0 暴露：

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

⸻

28.2 MCP 禁止列表

v1.0 不暴露：

navigator.advance_phase
navigator.capture_decision
navigator.reset_project
navigator.modify_sop_profile

⸻

28.3 navigator.where_am_i

function navigator_where_am_i(): Promise<MCPToolResult<StatusOutput>>;

对应 CLI：

ocn status

副作用：

none

⸻

28.4 navigator.brief

function navigator_brief(): Promise<MCPToolResult<BriefContent>>;

对应 CLI：

ocn brief

副作用：

none

⸻

28.5 navigator.run_gate

function navigator_run_gate(): Promise<MCPToolResult<GateResult>>;

对应 CLI：

ocn gate

副作用：

write audit
update latestGateResult

⸻

28.6 navigator.create_artifact

function navigator_create_artifact(
  input: DocCreateInput
): Promise<MCPToolResult<DocCreateOutput>>;

对应 CLI：

ocn doc create <type>

副作用：

write docs/<artifact>.md

⸻

28.7 navigator.capture_log

function navigator_capture_log(
  input: DevLogInput | ResearchLogInput
): Promise<MCPToolResult<LogEntry>>;

对应 CLI：

ocn log --type dev
ocn log --type research

限制：

type 不得为 decision。

如果 input.type = decision：

{
  "ok": false,
  "code": "ERR_GATE_FAILED",
  "message": {
    "en": "MCP tools cannot capture formal decisions. Use CLI: ocn log --type decision.",
    "zh": "MCP 工具不能写入正式决策。请通过 CLI 使用 ocn log --type decision。"
  },
  "error": {
    "code": "ERR_GATE_FAILED",
    "message": {
      "en": "MCP tools cannot capture formal decisions.",
      "zh": "MCP 工具不能写入正式决策。"
    },
    "nextActions": [
      {
        "en": "Use CLI: ocn log --type decision.",
        "zh": "请通过 CLI 使用 ocn log --type decision。"
      }
    ]
  }
}

⸻

28.8 navigator.detect_sop_version

function navigator_detect_sop_version(): Promise<MCPToolResult<SOPVersionOutput>>;

对应 CLI：

ocn sop version

⸻

28.9 navigator.generate_next_prompt

function navigator_generate_next_prompt(): Promise<MCPToolResult<PromptContent>>;

对应 CLI：

ocn prompt next

⸻

29. Lock Contract

29.1 需要 lock 的 Core 函数

initProject
createArtifact
checkCurrentArtifact
runGate
advanceState
captureLog
captureDecision
createBaseline
runDoctor when snapshot or releaseLock
resetProject
recordTestResult

⸻

29.2 Lock 超时

retry interval = 200ms
timeout = 5000ms
stale lock threshold = 30000ms

⸻

29.3 Lock 错误

场景	ErrorCode
lock 等待超时	ERR_IO_OR_CONFIG
lock 文件格式错误	ERR_IO_OR_CONFIG
非 stale lock 被 release	ERR_IO_OR_CONFIG

⸻

30. Error Contract

30.1 ErrorResult 必须包含

code
message
nextActions
relatedFile optional
details optional

30.2 常见错误映射

场景	ErrorCode
未初始化	ERR_STATE_MACHINE
state.json 损坏	ERR_STATE_MACHINE
schemaVersion 不支持	ERR_STATE_MACHINE
SOP 版本不兼容	ERR_SOP_VERSION
artifact 缺失	ERR_ARTIFACT_INVALID
required section 缺失	ERR_ARTIFACT_INVALID
self-check 不一致	ERR_ARTIFACT_INVALID
gate failed	ERR_GATE_FAILED
lock timeout	ERR_IO_OR_CONFIG
unsupported test source	ERR_IO_OR_CONFIG
写文件失败	ERR_IO_OR_CONFIG

⸻

31. Security and Boundary Contract｜安全与边界契约

31.1 File System Boundary

OCN 默认只读写：

.ocoding/**
docs/**

例外：

用户显式传入 test result path

禁止默认读写：

src/**
.git/**
package.json
项目目录之外路径

⸻

31.2 MCP Boundary

MCP 不允许：

advance state
reset project
capture formal decision
modify SOP profile
delete files
release lock

⸻

31.3 AI Governance Boundary

AI agent 可以：

create artifact draft
capture dev / research log
run gate
generate brief
generate next prompt

AI agent 不可以：

mark blocked artifact as complete
write DecisionEntry
advance state
reset project
modify SOPProfile

⸻

32. Test Coverage Expectation｜测试覆盖期望

下一份 Test Strategy 必须至少覆盖以下契约：

The next Test Strategy must cover at least the following contracts:

32.1 Core Engine Unit Tests

每个 Core Engine 函数必须有 unit test：

initProject
getStatus
generateBrief
generateNextPrompt
createArtifact
checkCurrentArtifact
runGate
advanceState
captureLog
captureDecision
createBaseline
getSOPVersion
diffSOPVersion
planSOPUpgrade
runDoctor
resetProject
recordTestResult

⸻

32.2 CLI Integration Tests

每个 CLI 命令必须有 integration test：

stdout / stderr
--json output
exit code
side effects
error mapping

⸻

32.3 MCP Contract Tests

每个 MCP tool 必须有 contract test：

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

必须测试禁止工具不存在或不可调用：

navigator.advance_phase
navigator.capture_decision
navigator.reset_project
navigator.modify_sop_profile

⸻

32.4 Result Mapping Tests

必须显式测试：

ArtifactGateStatus.pass → ok=true, code=OK
ArtifactGateStatus.warning → ok=true, code=OK
ArtifactGateStatus.blocked → ok=false, code=ERR_ARTIFACT_INVALID
Gate blocked → ok=false, code=ERR_GATE_FAILED

⸻

32.5 Failure Injection Tests

必须测试：

state write failure before commit
JSONL write failure after state commit
Markdown write failure after JSONL success
lock timeout
stale lock recovery
schemaVersion unsupported

⸻

32.6 Security Boundary Tests

必须测试：

path traversal
writing outside .ocoding/ and docs/
MCP decision write rejection
MCP advance rejection
reset safety

⸻

33. API Contract Self-check｜接口契约自检

✓ Contract principles
✓ Inherits Data Model v1.1
✓ Unified BaseResult
✓ CLI Output Contract
✓ Exit Code Mapping
✓ Color / JSON output rules
✓ Concurrency Contract
✓ Audit Trigger Contract
✓ Event transaction boundary
✓ Business Failure vs Unexpected Error
✓ CLI command overview
✓ ocn init
✓ ocn status
✓ ocn brief
✓ ocn prompt next
✓ ocn doc create
✓ ocn check
✓ ocn gate
✓ ocn advance
✓ ocn log discriminated union
✓ ocn baseline create
✓ ocn sop version
✓ ocn sop diff
✓ ocn sop upgrade --plan
✓ ocn doctor
✓ ocn reset
✓ ocn test record
✓ Core Engine contracts complete
✓ MCP tool contracts
✓ navigator.capture_log decision rejection
✓ Lock contract
✓ Error contract
✓ File system boundary
✓ MCP boundary
✓ AI governance boundary
✓ Test Coverage Expectation

⸻

34. 下一步｜Next Step

完成本文档后，进入下一步：

After this document, move to:

#8｜Test Strategy 测试策略文档
docs/07-test-strategy.md

下一份文档将定义：

The next document will define:

unit tests
integration tests
contract tests
CLI command tests
Core Engine tests
MCP boundary tests
Step Artifact Gate tests
required_sections AST tests
lock / atomic write tests
event persistence tests
failure injection tests
dogfood validation tests

特别注意：

Special note:

Test Strategy 必须直接覆盖本 API Contract 中定义的接口。
Test Strategy must directly cover the interfaces defined in this API Contract.
如果测试策略发现接口契约不完整，应写入 API Contract Amendment。
If Test Strategy finds missing interface contracts, write an API Contract Amendment.