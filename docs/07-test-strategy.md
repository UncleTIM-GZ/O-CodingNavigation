# O’CodingNavigator Test Strategy
# #8｜Test Strategy 测试策略文档 v1.2
文档路径：`docs/07-test-strategy.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.2`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
Schema Version：`1.0`  
当前状态：`DESIGN`  
当前 Step：`step_test_strategy`  
依赖文档：  
- `docs/00-project-brief.md`
- `docs/01-scope.md`
- `docs/02-prd.md`
- `docs/03-acceptance-criteria.md`
- `docs/04-information-architecture.md`
- `docs/05-data-model.md`
- `docs/06-api-contract.md`
对应 SOP：第 8 步｜先定测试策略
---
# 1. 文档目的｜Purpose
本文档定义 O’CodingNavigator v1.0 的测试策略，确保产品不是只完成代码，而是能通过 SOP、AC、Data Model 和 API Contract 的共同验证。
This document defines O’CodingNavigator v1.0 test strategy, ensuring the product is not merely implemented in code but verified against SOP, AC, Data Model, and API Contract.
本文档回答：
1. OCN v1.0 要测试什么？  
   What must OCN v1.0 test?
2. 哪些测试是 alpha 必须通过？  
   Which tests must pass for alpha?
3. 哪些测试是 beta / GA 才必须通过？  
   Which tests are required for beta / GA?
4. 如何测试 CLI、Core Engine、MCP、Gate、Lock、Event、文件系统边界？  
   How do we test CLI, Core Engine, MCP, Gate, Lock, Event, and file system boundary?
5. 如何验证 Step Artifact Gate 能防止“假完成”？  
   How do we verify Step Artifact Gate prevents false completion?
6. 如何把 API Contract v1.1 转成测试矩阵？  
   How do we turn API Contract v1.1 into a test matrix?
7. 如何追溯 AC 到测试用例？  
   How do we trace ACs to test cases?
8. Skeleton Spike 如何成为 BUILD 前的最高优先级验证？  
   How does Skeleton Spike become the highest-priority validation before BUILD?
9. Skeleton Spike Step 0 如何验收？  
   How do we validate Skeleton Spike Step 0?
10. Skeleton Spike 失败后如何回退、修正和重跑？  
    How do we recover, amend, and rerun after Skeleton Spike failure?
11. 测试在哪里运行，如何进入 CI/CD？  
    Where do tests run, and how do they enter CI/CD?
12. mini CRM dogfood 如何验收？  
    How do we validate mini CRM dogfood?
---
# 2. 测试原则｜Testing Principles
## 2.1 测试不是补充，是门禁
测试不是开发完成后的附加动作，而是 OCN 流程本身的 gate。
Testing is not an afterthought after implementation. It is part of OCN’s workflow gate.
---
## 2.2 先验证最小闭环，再扩展完整能力
OCN v1.0 必须先验证最小闭环：
OCN v1.0 must first validate the minimal loop:
```text id="nr73gu"
init → status → brief → doc create → check

再扩展：

gate → advance → log → baseline → doctor → reset → MCP

⸻

2.3 测试必须覆盖契约，不只覆盖代码

测试必须直接追溯到：

Tests must trace directly to:

Acceptance Criteria
Data Model
API Contract
SOP Step Gate

⸻

2.4 Business Failure 和 Unexpected Error 分开测

必须分别测试：

Must test separately:

Business Failure:
流程预期内失败，例如 gate blocked。
Unexpected Error:
系统异常，例如 state.json 损坏、lock timeout、写入失败。

⸻

2.5 CLI 输出必须可被人读，也可被脚本读

CLI 测试必须覆盖：

CLI tests must cover:

stdout
stderr
exit code
--json output
color / no-color
pipe behavior

⸻

2.6 Skeleton Spike 是进入 BUILD 前的最高优先级验证

在进入正式 BUILD 前，必须完成 Skeleton Spike。

Before entering full BUILD, Skeleton Spike must be completed.

Skeleton Spike 不追求完整功能，只验证设计是否能跑出最小闭环。

Skeleton Spike does not aim for full functionality. It validates whether the design can support a minimal working loop.

⸻

2.7 测试基础设施先于功能实现

在实现 Core Engine 主要功能之前，必须先建立测试基础设施。

Before implementing major Core Engine features, test infrastructure must be set up first.

这包括：

Vitest
TypeScript config
fixtures directory
temporary project test helper
coverage config
GitHub Actions
pre-commit hook

⸻

2.8 测试策略本身必须可审计

Test Strategy 不只列测试项，还必须能证明这些测试项覆盖了 AC、API Contract 和核心风险。

Test Strategy must not only list test items but also prove that they cover ACs, API Contract, and core risks.

GA 前必须运行 AC coverage script，确认每条 must AC 至少被一个测试用例覆盖。

Before GA, run AC coverage script to verify every must AC is covered by at least one test case.

⸻

3. 测试分层｜Test Layers

OCN v1.0 测试分为 8 层：

Layer 1: Schema / Model Tests
Layer 2: Core Engine Unit Tests
Layer 3: Step Artifact Gate Tests
Layer 4: CLI Integration Tests
Layer 5: Event / Persistence Tests
Layer 6: Lock / Concurrency Tests
Layer 7: MCP Contract Tests
Layer 8: Dogfood / End-to-End Validation

⸻

4. 测试阶段｜Test Phases

4.1 alpha 阶段

alpha 目标：

验证 OCN 能自举出最小闭环。
Validate OCN can bootstrap the minimal loop.

alpha 必测：

Skeleton Spike
Core Engine minimal unit tests
CLI init / status / brief / doc create / check
Step Artifact Gate required section missing
state.json read/write
basic error mapping
basic CLI exit code tests

⸻

4.2 beta 阶段

beta 目标：

验证主要流程可以在真实项目中连续运行。
Validate main workflow can run continuously in real projects.

beta 必测：

gate
advance
dev log
research log
decision log through CLI
baseline create
doctor
lock stale recovery
event dual persistence
MCP safe tools
mini CRM partial dogfood

⸻

4.3 GA 阶段

GA 目标：

验证 OCN 可作为开源项目公开使用。
Validate OCN is ready for public open-source usage.

GA 必测：

all AC must tests
AC traceability coverage
CLI output contract
exit code mapping
MCP boundary
reset safety
SOP versioning
failure injection
file system boundary
performance budget
OCN self dogfood
mini CRM dogfood
external user smoke test

⸻

5. Coverage Targets｜覆盖率目标

5.1 总体目标

OCN v1.0 GA 总体覆盖率目标：

line coverage ≥ 85%
branch coverage ≥ 80%

⸻

5.2 模块覆盖率目标

模块	Line	Branch	说明
Core Engine	≥ 90%	≥ 85%	覆盖 happy path、business failure、unexpected error
SOP Loader	≥ 95%	≥ 90%	SOP 解析是核心，容错路径必须覆盖
Step Artifact Gate	100%	≥ 95%	产品壁垒，不允许关键分支未测
State Machine	100%	100%	状态推进规则必须全覆盖
Lock / Concurrency	≥ 80%	≥ 75%	并发场景允许略低，但关键路径必测
CLI 渲染层	≥ 60%	不强制	渲染层测试成本高，允许较低
Doctor	≥ 80%	≥ 70%	检查逻辑必须覆盖
MCP Server	≥ 80%	≥ 75%	协议层关键路径覆盖

⸻

5.3 模块边界定义｜Module Boundary Definition

为避免覆盖率统计歧义，v1.0 按以下模块边界统计：

To avoid coverage ambiguity, v1.0 uses the following module boundaries.

5.3.1 Core Engine

Core Engine 指 17 个 Core Engine 函数的 orchestration 实现：

Core Engine refers to orchestration implementation of the 17 Core Engine functions:

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

Core Engine 覆盖率不包含以下模块内部算法：

Core Engine coverage excludes internal algorithms of:

SOP Loader
Step Artifact Gate
State Machine

⸻

5.3.2 SOP Loader

SOP Loader 指解析和校验以下文件的模块：

SOP Loader refers to modules that parse and validate:

.ocoding/sop.yaml
.ocoding/gates.yaml
built-in SOP profile

⸻

5.3.3 Step Artifact Gate

Step Artifact Gate 指以下核心算法：

Step Artifact Gate refers to the following core algorithms:

Markdown AST parsing
heading canonical / alias matching
required section detection
quality heuristic
self-check consistency check
ArtifactGateStatus calculation

⸻

5.3.4 State Machine

State Machine 指：

state transition rule
step transition rule
illegal transition detection
rollback path calculation
currentStateId / currentStepId update rule

⸻

5.3.5 跨模块调用

一个 Core Engine 函数可以调用 SOP Loader、Step Artifact Gate 或 State Machine。

A Core Engine function may call SOP Loader, Step Artifact Gate, or State Machine.

覆盖率归属按代码模块计算：

Coverage is attributed by code module.

示例：

checkCurrentArtifact 调用 Step Artifact Gate。
checkCurrentArtifact orchestration 计入 Core Engine。
AST matching 算法计入 Step Artifact Gate。

⸻

5.4 覆盖率工具

默认工具：

vitest --coverage
coverage provider: c8 or v8 coverage

⸻

5.5 覆盖率豁免规则

允许豁免：

第三方库 wrapper
纯类型定义文件
debug / trace 输出代码
平台兼容 shim

豁免必须写入：

docs/19-decision-log.md

必须包含：

豁免原因
影响范围
是否需要后续补测

⸻

6. Test Execution Strategy｜测试执行策略

6.1 本地开发｜Local Development

本地开发期间：

运行修改文件相关单元测试
使用 vitest watch mode
目标时长 < 2 秒

⸻

6.2 Pre-commit Hook

提交前建议运行：

lint
format check
修改文件相关单元测试

目标时长：

< 30 秒

说明：

全量 tsc --noEmit 可放在 PR CI。
Full tsc --noEmit may run in PR CI instead of pre-commit.
如果 pre-commit 中运行 tsc 导致超过 30 秒，应移到 PR CI。
If tsc in pre-commit exceeds 30s, move it to PR CI.

⸻

6.3 PR CI

PR 创建后必须运行：

全部单元测试
CLI integration tests
MCP contract tests
coverage check
type check
lint

运行平台：

ubuntu-latest
macos-latest
windows-latest

目标时长：

< 5 分钟

⸻

6.4 CI Workflow Specification

v1.0 最小 CI workflow 文件：

.github/workflows/test.yml

推荐结构：

name: Test
on:
  push:
  pull_request:
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20.x, 22.x]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
  dogfood-smoke:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm run dogfood:smoke

v1.0 可选 nightly workflow：

.github/workflows/nightly.yml

nightly 应运行：

concurrency tests
failure injection tests
performance benchmark
heavy project benchmark

⸻

6.5 PR 合并前必过

PR 合并前必须通过：

所有 alpha / beta release gate 测试
覆盖率不得低于阈值
dogfood smoke test

dogfood smoke test 最小流程：

init → doc create prd → check blocked → fix → check pass

⸻

6.6 Nightly

每日定时运行：

并发压力测试
失败注入测试矩阵
性能 benchmark
heavy project benchmark
long-running stability test

⸻

6.7 Release 前

Release 前必须运行：

所有 GA release gate tests
完整 dogfood 报告
外部用户 smoke test
coverage report
performance report
AC coverage script

⸻

7. Test Time Budget｜测试运行时间预算

7.1 快速测试套｜Fast Suite

包含：

schema tests
unit tests
core engine pure logic tests

目标时长：

< 30 秒

用途：

watch mode
pre-commit
快速本地验证

⸻

7.2 中等测试套｜Medium Suite

包含：

CLI integration tests
MCP contract tests
Lock tests
Event persistence tests
File boundary tests

目标时长：

< 2 分钟

用途：

PR check
本地合并前检查

⸻

7.3 完整测试套｜Full Suite

包含：

unit
integration
MCP
concurrency simulation
failure injection
performance benchmark
dogfood smoke

目标时长：

< 10 分钟

用途：

nightly
release candidate
GA 前验证

⸻

7.4 Dogfood Smoke

目标时长：

< 30 秒

最小流程：

init → check → gate → log

⸻

8. Test Filesystem Strategy｜测试文件系统策略

8.1 默认使用真实临时目录

默认测试使用真实文件系统临时目录。

Default tests use real temporary filesystem directories.

目录生成规则：

os.tmpdir() + ocn-test-<random>

每个测试必须：

创建独立 tempDir
测试结束 cleanup
不依赖外部状态
不得写入真实用户项目

⸻

8.2 真实文件系统测试

以下测试使用真实文件系统：

Schema / Model tests
Core Engine unit tests
CLI integration tests
Event persistence tests
File system boundary tests
Skeleton Spike
Dogfood smoke

⸻

8.3 Mock FS 测试

以下测试可以使用 mock fs 或 mock adapter：

Lock concurrency tests
Failure injection tests
IO error tests
Performance benchmark isolation

说明：

mock fs 不得替代全部真实 fs 测试。
mock fs is not a replacement for real fs tests.

⸻

9. Skeleton Spike｜骨架原型验证

9.1 目标｜Goal

Skeleton Spike 目标是用最小代码验证 OCN 的核心设计是否可运行。

The goal of Skeleton Spike is to validate whether OCN’s core design works with minimal code.

⸻

9.2 Skeleton Spike 与 alpha 的关系

Skeleton Spike 是 alpha 阶段的第一里程碑，但不等于 alpha 完成。

Skeleton Spike is the first milestone of alpha, but it does not equal alpha completion.

Skeleton Spike 通过：
5 个命令最小流程跑通。
Alpha 通过：
Skeleton Spike +
5 个命令的完整单元测试 +
CLI 集成测试 +
Step Artifact Gate 测试 +
state.json 安全写入测试 +
basic exit code 测试。

⸻

9.3 Skeleton Spike Step 0 与主流程的关系

Skeleton Spike 分为：

Step 0:
测试基础设施建设。
Test infrastructure setup.
Step 1-11:
5.5 节定义的 11 步真实流程。
The 11-step real loop defined in section 9.6.

规则：

Step 0 是 Skeleton Spike 的前置条件。
Step 0 is a prerequisite for Skeleton Spike.
Step 0 不算主流程通过。
Step 0 does not count as passing the main loop.
Step 1-11 才验证 OCN 最小闭环。
Step 1-11 validate the minimal OCN loop.

⸻

9.4 Step 0 验收标准｜Step 0 Acceptance Criteria

每项基础设施必须满足以下“最小可工作”标准：

Each infrastructure item must satisfy the following minimal working standard.

9.4.1 Vitest 配置

必须满足：

能运行 hello-world test
能输出覆盖率报告到 ./coverage/
watch mode 在文件变化时 < 2 秒重跑

⸻

9.4.2 TypeScript 配置

必须满足：

tsc --noEmit 通过
strict: true
至少包含核心 type definitions

⸻

9.4.3 Fixtures 目录

必须满足：

tests/fixtures/ 已创建
至少 1 个 valid-minimal project fixture
至少 1 个 prd-missing-scenarios.md fixture

⸻

9.4.4 Temp Project Helper

必须实现：

createTempProject()
cleanupTempProject()

必须满足：

能在 os.tmpdir() 创建独立 OCN 项目目录
能 cleanup
不得写入用户真实目录

⸻

9.4.5 Coverage 配置

必须满足：

coverage provider 已配置
coverage 输出目录为 ./coverage/
thresholds 对应第 5.2 节

⸻

9.4.6 GitHub Actions Workflow

必须满足：

.github/workflows/test.yml 已创建
PR 上自动触发
至少 ubuntu-latest 可跑通

⸻

9.4.7 Pre-commit Hook

必须满足：

pre-commit hook 文件存在
能阻止 lint 错误 commit
如果耗时超过 30 秒，应降级为 lint + changed tests

⸻

9.4.8 Schema Test 基础覆盖

必须至少覆盖：

ProjectState valid fixture
ProjectState invalid fixture
BilingualMessage valid fixture
BilingualMessage invalid fixture

⸻

9.4.9 CLI Spawn Helper

必须实现：

spawnOcn(args, opts)

返回：

{
  stdout: string;
  stderr: string;
  exitCode: number;
}

必须支持：

--json mode
custom cwd
custom env

⸻

9.4.10 FS Failure Injection Helper

必须实现：

injectFsFailure(operation, error)

至少支持：

ENOSPC
EACCES
EBUSY

⸻

9.4.11 Step 0 验收方式

必须写一个 prerequisite check test。

Must write one prerequisite check test.

通过条件：

以上 10 项全部通过。
All 10 items pass.

Step 0 失败：

修复基础设施后继续。
不进入 Step 1-11。

⸻

9.5 范围｜Scope

只实现以下 5 个命令：

Only implement the following 5 commands:

ocn init
ocn status
ocn brief
ocn doc create prd
ocn check

⸻

9.6 明确不做｜Non-goals

Skeleton Spike 不做：

Skeleton Spike does not implement:

MCP
advance
full gate aggregation
reset
doctor
baseline
SOP upgrade
full event system
full lock concurrency
full template customization
mini CRM full dogfood

⸻

9.7 验证流程｜Validation Loop

必须真实执行一次：

Must execute once:

1. 创建空目录
2. 执行 ocn init --tier minimal
3. 执行 ocn status
4. 执行 ocn brief
5. 执行 ocn doc create prd
6. 写一份故意缺少 Scenarios｜使用场景 的玩具 PRD
7. 执行 ocn check
8. ocn check 必须返回 blocked
9. 补上 Scenarios｜使用场景
10. 再执行 ocn check
11. ocn check 必须返回 pass 或 warning

⸻

9.8 Skeleton Spike 通过标准｜Pass Criteria

必须全部满足：

Must satisfy all:

.ocoding/state.json 被正确创建
docs/02-prd.md 可被创建
ocn status 能显示 currentStateId 和 currentStepId
ocn brief 能输出当前上下文
ocn check 能识别缺失 required section
ocn check blocked 时 exit code = 2
ocn check --json blocked 时 stdout 输出完整 CommandResult
修复 PRD 后 ocn check 能 pass 或 warning

⸻

9.9 Skeleton Spike 失败分类与处理

失败类型	表现	处理路径	是否阻塞 BUILD
A 实现 bug	单元测试失败、命令行为与契约不一致	修复代码，重跑 Spike	是，修复后继续
B Data Model 缺字段	schema 验证失败、字段不足	写 Data Model Amendment，修订 schema，重跑 Spike	是
C API Contract 设计错误	CLI 行为不可实现或不合理	写 API Contract Amendment，修订接口，重跑 Spike	是
D IA / 架构错误	SOP loader、状态机、artifact flow 根本不通	写 IA Amendment，重新设计相关结构，重跑 Spike	是
E 工程现实约束	AST 库、文件系统、平台兼容现实限制	写 Decision Log，记录替代方案	视影响决定

通用规则：

失败必须写 docs/14-debug-report.md
B / C / D 类失败必须写 Amendment
Amendment 后必须重新跑完整 Skeleton Spike
连续 3 次失败必须停止修补，写 Decision Log 评估是否需要重新设计

⸻

10. AC Traceability Matrix｜AC 追溯矩阵

10.1 目标

确保每条 must AC 至少被一个测试用例覆盖。

Ensure every must AC is covered by at least one test case.

⸻

10.2 测试代码标注规则

测试代码必须使用 AC 注释标记：

Test code must use AC annotation comments:

// @ac AC-SAG-001
it("PRD missing Scenarios returns blocked", () => {
  // test body
});

一条测试可以覆盖多个 AC：

One test may cover multiple ACs:

// @ac AC-SAG-001
// @ac AC-SECTION-001

⸻

10.3 GA 前 AC Coverage Script

GA 前必须运行 AC coverage script。

Before GA, run AC coverage script.

检查规则：

读取 docs/03-acceptance-criteria.md 中所有 must AC ID
扫描 tests/**/*.test.ts 中的 @ac 标注
确认每条 must AC 至少出现一次
输出 missing AC report
missing AC 数量必须为 0

⸻

10.4 AC Domain Traceability Matrix

Domain	Approx AC Count	覆盖测试章节
INIT	7	11.4, 13.5, 14.4
STATE	5	11.4, 13.5
STATUS	2	13.5
BRIEF	3	12
PROMPT	2	12
DOC	3	11.4, 13.2
TEMPLATE	3	18
SAG	6	12, 13.5
SECTION	5	12.2, 12.6
QUALITY	3	12.5
GATE	3	11.4, 14.4
ADV	3	11.4
LOG	2	13.2
DEC	3	11.4, 17.5
AUDIT	3	14.4
BASE	2	11.4
SOP	3	19.3
DOCTOR	3	21.1
RESET	3	21.2
MCP	4	17.5
TEST	3	11.4, 26
FS	3	18.3
LANG	3	13.5
PERF	4	20
OBS	3	21, 25
DOGFOOD	3	22
DOD	2	27
EXC	15	14.4, 15.6, 18.3
UNCERT	3	12
RESEARCH	3	11.4, 13.2

说明：

AC count 以 docs/03-acceptance-criteria.md 最新版本为准。
本表是 domain-level traceability，不替代 per-AC coverage script。

⸻

11. Schema / Model Tests｜数据模型测试

11.1 目标

验证 Data Model v1.1 可被代码稳定消费。

Validate Data Model v1.1 can be reliably consumed by code.

⸻

11.2 测试对象

必须覆盖：

Must cover:

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
AuditEvent
LogEntry
DecisionEntry
ResearchEntry
Baseline
TestRecord
LockState
DoctorReport
BriefContent
PromptContent
ErrorResult
BilingualMessage

⸻

11.3 测试类型

valid fixture should parse
invalid fixture should fail
required field missing should fail
unknown enum value should fail
path traversal should fail
empty BilingualMessage should fail
future timestamp should fail

⸻

11.4 代表性测试用例

Given state.json 缺 schemaVersion
When parse ProjectState
Then validation fails
Given currentStateId = "state_unknown"
When parse ProjectState
Then validation fails
Given BilingualMessage.zh = ""
When parse BilingualMessage
Then validation fails
Given artifact path = "../secret"
When parse ArtifactDefinition
Then validation fails
Given RequiredSection.aliases = []
When parse RequiredSection
Then validation fails

⸻

12. Brief / Prompt Content Tests｜简报与 Prompt 内容契约测试

12.1 目标

验证 ocn brief 和 ocn prompt next 输出包含 OCN 防止迷路、失控、失忆和假完成所需的核心上下文。

Validate ocn brief and ocn prompt next include core context required to prevent getting lost, losing control, losing memory, and false completion.

⸻

12.2 BriefContent 必含字段测试

Given valid project at state_spec / step_prd
When generateBrief runs
Then BriefContent must contain:

currentStateId = state_spec
currentStepId = step_prd
currentBlockers
completedArtifactIds
missingArtifactIds
latestGateResult if available
recent decisions
recent logs
aiGovernanceRules
uncertaintyPolicy
nextActions

⸻

12.3 Uncertainty Policy 测试

BriefContent 必须包含 uncertainty policy。

BriefContent must contain uncertainty policy.

必须至少包含：

无法判断 / unable to determine
数据不足 / insufficient data
需要人工确认 / requires human confirmation

⸻

12.4 AI Governance Rules 测试

BriefContent 必须包含：

AI 不得把 blocked artifact 标记为 complete
AI 不得推进状态
AI 不得写 DecisionEntry
AI 不得绕过 hard gate

⸻

12.5 PromptContent 必含字段测试

Given current step = step_prd
When generateNextPrompt runs
Then PromptContent must contain:

targetStepId = step_prd
targetArtifactId = artifact_prd
requiredSections
blockingCriteria
warningCriteria
qualityChecklist
aiGovernanceRules
uncertaintyPolicy
Self-check Rule
Do not mark blocked artifact as complete

⸻

12.6 代表性测试用例

Given current step = step_prd
When generateNextPrompt
Then PromptContent.instruction.en includes "Step Artifact Gate Self-check"
And PromptContent.instruction.zh includes "步骤产物门禁自检"
And PromptContent.requiredSections.length >= 6
And PromptContent.instruction.en includes "Do not mark blocked artifact as complete"

⸻

13. Core Engine Unit Tests｜核心引擎单元测试

13.1 目标

验证 Core Engine 每个函数的输入输出和副作用。

Validate inputs, outputs, and side effects of each Core Engine function.

⸻

13.2 必测函数

必须覆盖 API Contract v1.1 中所有 Core Engine 函数：

Must cover all Core Engine functions in API Contract v1.1:

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

注：本清单依赖 API Contract v1.1 完整定义。
Note: This list depends on complete API Contract v1.1 definitions.

如果 API Contract 缺少任一函数详细签名，Test Strategy 实施前必须先补 API Contract Amendment。

If API Contract lacks any function signature, an API Contract Amendment must be written before implementing this Test Strategy.

⸻

13.3 每个函数至少测试

每个函数至少包含：

Each function must include:

happy path
business failure
unexpected error
side effect verification
no raw exception leakage

⸻

13.4 代表性测试用例

initProject:
  Given empty temp directory
  When initProject minimal
  Then state.json / sop.yaml / gates.yaml / config.yaml are created
getStatus:
  Given valid state.json
  When getStatus
  Then currentStateId and currentStepId are returned
checkCurrentArtifact:
  Given PRD missing Scenarios
  When checkCurrentArtifact
  Then result ok=false and code=ERR_ARTIFACT_INVALID
advanceState:
  Given gate blocked
  When advanceState
  Then state remains unchanged and advance_failed audit is generated
captureDecision:
  Given ctx.client = mcp
  When captureDecision
  Then returns ERR_GATE_FAILED
recordTestResult:
  Given unsupported source
  When recordTestResult
  Then returns ERR_IO_OR_CONFIG

⸻

14. Step Artifact Gate Tests｜步骤产物门禁测试

14.1 目标

验证 OCN 能防止“假完成”。

Validate OCN can prevent false completion.

⸻

14.2 Required Section 测试

必须覆盖：

Must cover:

canonical heading match
alias heading match
case-insensitive match
heading level within range
heading level out of range
missing required section
markdown link heading
leading / trailing whitespace

⸻

14.3 RequiredSection Alias Fixture Coverage

每个 RequiredSection 的 aliases 必须覆盖至少 5 类 heading：

Each RequiredSection alias must cover at least 5 heading styles:

canonical: Scenarios｜使用场景
English alias: Scenarios
Chinese alias: 使用场景
English variant: Use Cases / User Scenarios
Chinese variant: 用户场景

边界 fixture：

大小写变体：scenarios / SCENARIOS
前后空白：  Scenarios  
markdown link：[Scenarios](#scenarios)
错误 heading level：#### Scenarios

⸻

14.4 Self-check vs AST 测试

必须覆盖：

Must cover:

self-check says ✓ but AST missing section → blocked
self-check says ✗ and AST missing section → blocked
self-check says ✓ and AST has section → pass
self-check absent but AST has required sections → warning or pass according to rule

⸻

14.5 QualityCheck 测试

必须覆盖：

Must cover:

min_chars warning
min_bullets warning
required_example warning
heuristic warning message included

⸻

14.6 代表性测试用例

Given docs/02-prd.md contains ## Problem｜问题
And docs/02-prd.md lacks ## Scenarios｜使用场景
When ocn check
Then status = blocked
And code = ERR_ARTIFACT_INVALID
And missingRequiredSectionIds contains section_scenarios
Given docs/02-prd.md contains ## 使用场景
When ocn check
Then section_scenarios is considered present
Given self-check marks [✓] Scenarios｜使用场景
But AST cannot find Scenarios
When ocn check
Then selfCheckConsistent = false
And status = blocked

⸻

15. CLI Integration Tests｜CLI 集成测试

15.1 目标

验证 CLI 命令行为符合 API Contract v1.1。

Validate CLI command behavior against API Contract v1.1.

⸻

15.2 必测命令与 flag 组合

必须按命令 + flag 组合测试，而不只是测试命令名。

Must test command + flag combinations, not only command names.

ocn init --tier minimal
ocn init --tier production
ocn init --tier full
ocn status
ocn status --json
ocn brief
ocn brief --json
ocn prompt next
ocn prompt next --json
ocn doc create prd
ocn doc create acceptance-criteria
ocn doc create information-architecture
ocn check
ocn check --include-tests
ocn check --json
ocn gate
ocn gate --json
ocn advance
ocn advance --json
ocn log --type dev
ocn log --type research
ocn log --type decision
ocn baseline create
ocn baseline create --json
ocn sop version
ocn sop diff
ocn sop upgrade --plan
ocn doctor
ocn doctor --snapshot
ocn doctor --release-lock
ocn reset --keep-docs
ocn reset --keep-state
ocn reset --hard
ocn reset --hard --confirm
ocn test record --from vitest <path>

⸻

15.3 Doctor flag 互斥规则

v1.0 不支持同时使用：

ocn doctor --snapshot --release-lock

规则：

--snapshot 和 --release-lock 互斥。
同时传入时返回 ERR_IO_OR_CONFIG。

必须测试：

Given user runs ocn doctor --snapshot --release-lock
Then exit code = 4
And code = ERR_IO_OR_CONFIG

⸻

15.4 CLI 输出契约测试

必须覆盖：

Must cover:

stdout for ok=true
stderr for ok=false in human-readable mode
--json outputs full CommandResult to stdout
--json ok=false still outputs JSON to stdout
exit code matches ErrorCode
NO_COLOR disables color
pipe disables color
debug / trace outputs to stderr

⸻

15.5 Exit Code 测试

场景	Expected Code
OK	0
gate failed	1
artifact invalid	2
state machine error	3
IO / config error	4
SOP version error	5

⸻

15.6 代表性测试用例

Given empty project
When run ocn status
Then exit code = 3
And stderr includes OCN project not initialized
Given valid project
When run ocn status --json
Then stdout is valid JSON
And JSON.ok = true
And exit code = 0
Given PRD missing Scenarios
When run ocn check --json
Then stdout is valid JSON
And JSON.ok = false
And JSON.code = ERR_ARTIFACT_INVALID
And exit code = 2
Given NO_COLOR=1
When run ocn status
Then stdout contains no ANSI color codes

⸻

16. Event / Persistence Tests｜事件与持久化测试

16.1 目标

验证双轨持久化和事务边界。

Validate dual persistence and transaction boundaries.

⸻

16.2 必测文件

.ocoding/state.json
.ocoding/state.json.bak
.ocoding/events/audit-events.jsonl
.ocoding/events/log-events.jsonl
.ocoding/events/decision-events.jsonl
.ocoding/events/research-events.jsonl
docs/21-audit-trail.md
docs/18-dev-log.md
docs/19-decision-log.md
docs/17-research-log.md
.ocoding/.errors.log

⸻

16.3 事务测试

必须覆盖：

Must cover:

state write fails before atomic rename
JSONL write fails after state commit
Markdown write fails after JSONL success
backup is created before state write
state.json.tmp is renamed atomically

⸻

16.4 代表性测试用例

Given advanceState is about to update state
And state.json.tmp write fails
When advanceState runs
Then state.json remains unchanged
And advance_succeeded audit is not written
And error code = ERR_IO_OR_CONFIG
Given state commit succeeds
And JSONL audit write fails
When advanceState runs
Then state is updated
And command returns warning
And .errors.log records JSONL failure
Given JSONL succeeds
And Markdown audit write fails
When gate runs
Then audit-events.jsonl contains event
And docs/21-audit-trail.md may be missing event
And command returns warning

⸻

17. Failure Injection Tests｜失败注入测试

17.1 目标

验证 OCN 在 IO、解析、并发和外部破坏场景下不会写坏项目状态。

Validate OCN does not corrupt project state under IO, parsing, concurrency, and external corruption scenarios.

⸻

17.2 写入失败注入

必须覆盖：

state.json.tmp 写入时磁盘满
state.json rename 时权限拒绝
audit-events.jsonl append 时 IO 失败
docs/21-audit-trail.md 写入失败
.ocoding/.errors.log 写入失败

⸻

17.3 读取失败注入

必须覆盖：

state.json 读取时文件被另一进程占用
sop.yaml 读取到部分内容
gates.yaml 内容损坏

⸻

17.4 解析失败注入

必须覆盖：

state.json 是合法 JSON 但缺 schemaVersion
state.json 是非法 JSON
markdown 解析遇到 unicode 错误
vitest json 是空字符串
vitest json 字段缺失

⸻

17.5 并发失败注入

必须覆盖：

两个 ocn check 同时启动
ocn status 在 ocn check 写 state 中读取
lock 文件被外部工具修改
.ocoding/.lock 在 acquire 后被外部删除

⸻

17.6 验收标准

所有失败注入场景必须：

不抛裸异常
返回 ErrorResult with stable ErrorCode
不破坏现有 state.json
必要时写 .errors.log
必要时保留 .bak 可恢复

⸻

18. Lock / Concurrency Tests｜锁与并发测试

18.1 目标

验证 CLI / MCP 并发时写操作不会破坏 state。

Validate concurrent CLI / MCP writes do not corrupt state.

⸻

18.2 必测场景

two CLI writes concurrently
CLI write and MCP write concurrently
read while write in progress
lock timeout
stale lock recovery
invalid lock file
atomic lock write

⸻

18.3 Lock Contract Tests

必须验证：

LockState schema parse
retry interval = 200ms ± 10ms
timeout = 5000ms ± 50ms
stale threshold = 30000ms ± 100ms
pid alive detection
lock file write is atomic
lock release writes lock_released audit
stale lock recovery writes lock_stale_recovered audit

⸻

18.4 代表性测试用例

Given ocn check is holding lock
When another ocn log starts
Then ocn log waits
And either succeeds after lock release or returns ERR_IO_OR_CONFIG after timeout
Given .ocoding/.lock exists
And pid is not alive
And createdAt older than 30s
When ocn doctor --release-lock runs
Then lock is removed
And lock_stale_recovered audit is written
Given read operation ocn status runs while ocn check writes state
Then ocn status reads either old complete state or new complete state
And never reads partial JSON

⸻

19. MCP Contract Tests｜MCP 契约测试

19.1 目标

验证 MCP tool 与 API Contract 一致，且安全边界有效。

Validate MCP tools match API Contract and enforce safety boundaries.

⸻

19.2 必测 MCP Tools

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

⸻

19.3 禁止工具测试

必须确认以下工具不存在或不可调用：

Must verify the following tools do not exist or cannot be called:

navigator.advance_phase
navigator.capture_decision
navigator.reset_project
navigator.modify_sop_profile

⸻

19.4 Boundary 测试

navigator.capture_log with type=decision must return ERR_GATE_FAILED
navigator.run_gate may write audit but must not advance state
navigator.create_artifact may create draft but must not mark complete
MCP tool timeout returns ERR_IO_OR_CONFIG

⸻

19.5 代表性测试用例

Given MCP client calls navigator.capture_log with type=decision
When tool executes
Then result.ok = false
And result.code = ERR_GATE_FAILED
And message says use CLI ocn log --type decision
Given MCP client calls navigator.run_gate
When gate is blocked
Then latestGateResult is updated
And currentStateId remains unchanged
Given MCP tool list is requested
Then navigator.advance_phase is not present

⸻

20. File System Boundary Tests｜文件系统边界测试

20.1 目标

验证 OCN 不越界读写。

Validate OCN does not read/write outside allowed boundaries.

⸻

20.2 必测边界

allowed write: .ocoding/**
allowed write: docs/**
disallowed default write: src/**
disallowed default write: .git/**
disallowed default write: package.json
disallowed path traversal: ../
explicit test result path exception

⸻

20.3 代表性测试用例

Given artifact path = ../secret.md
When createArtifact runs
Then returns ERR_ARTIFACT_INVALID
Given reset --keep-docs
When reset runs
Then src/ remains untouched
And package.json remains untouched
And .git/ remains untouched
Given test result path explicitly provided
When ocn test record --from vitest ./tmp/vitest.json
Then OCN may read that file only
And must not scan project automatically

⸻

21. SOP Versioning Tests｜SOP 版本测试

21.1 目标

验证项目锁定 SOP 版本，OCN 检测版本差异但不主动升级。

Validate project locks SOP version and OCN detects diff without auto-upgrade.

⸻

21.2 必测场景

sopProfileVersion equal supported version
sopProfileVersion older than supported version
sopProfileVersion newer than supported version
ocn sop diff returns SOPVersionDiff
ocn sop upgrade --plan does not modify files

⸻

21.3 代表性测试用例

Given project locked to SOP 0.1.0
And installed OCN supports SOP 0.2.0
When ocn sop version runs
Then compatible status is returned
And diff detected audit is written if applicable
Given ocn sop upgrade --plan
When command runs
Then SOPUpgradePlan is returned
And .ocoding/sop.yaml is not modified

⸻

22. Performance Tests｜性能测试

22.1 目标

验证 API Contract 和 AC 中定义的性能预算。

Validate performance budgets defined in API Contract and AC.

⸻

22.2 测试基准

使用 AC-PERF 定义的 reference project：

typical project:
  10-15 artifacts
  average 5KB each
  .ocoding/ < 200KB
  state.json < 20KB
heavy project:
  30 artifacts
  audit-trail > 1MB
  benchmark only, not GA blocking by default

⸻

22.3 必测命令

Command	Target
ocn status	P95 < 200ms
ocn brief	P95 < 500ms
ocn check	P95 < 300ms
ocn gate	P95 < 1s
SOP loader cold start	< 200ms
state.json write	< 50ms

⸻

22.4 工具

建议工具：

vitest bench
tinybench

⸻

22.5 性能失败处理

P95 超出目标 < 1.5x:
  warning
  写 dev-log
P95 超出目标 ≥ 1.5x:
  blocked
  写 Decision Log 决定是否豁免

⸻

22.6 Skeleton Spike 性能规则

Skeleton Spike 阶段：

记录性能
不作为阻塞

Beta 阶段：

性能作为 should

GA 阶段：

核心路径性能作为 release review 项

⸻

23. Reset / Doctor Tests｜重置与诊断测试

23.1 Doctor 测试

必须覆盖：

Must cover:

valid project
missing .ocoding
invalid state.json
invalid sop.yaml
invalid gates.yaml
stale lock
non-stale lock
snapshot creation
release stale lock
doctor flag mutual exclusion

⸻

23.2 Reset 测试

必须覆盖：

Must cover:

reset --keep-docs
reset --keep-state
reset --hard without confirm
reset --hard with confirm
src/ untouched
.git/ untouched
package.json untouched

⸻

24. Dogfood Validation｜自举验证

24.1 Dogfood Project 1: OCN 自身

GA 前必须完成 OCN 自身 dogfood。

Before GA, OCN must dogfood itself.

验收证据：

OCN 自身项目从 DISCOVERY 跑到 SHIP
docs/21-audit-trail.md 至少 1 条 advance failed
docs/21-audit-trail.md 至少 5 条 advance succeeded
docs/19-decision-log.md 至少 3 条 decision
docs/15-baseline.md 至少 1 个 baseline
没有通过 override 跳过 hard gate
生成 dogfood-report-ocn.md

⸻

24.2 Dogfood 状态覆盖说明

v1.0 dogfood 状态覆盖：

OCN 自身 dogfood:
  DISCOVERY → SHIP
mini CRM dogfood:
  DISCOVERY → VERIFY

v1.0 未完整验证：

REFLECT state

说明：

REFLECT 状态依赖上线后的真实使用观察。
v1.0 实现 REFLECT 状态，但不要求完整 dogfood 验证 REFLECT。
REFLECT 完整验证放入 v1.1。

⸻

24.3 OCN dogfood 的测试隔离

OCN 自测时，测试代码不得依赖被测函数读取被测结果。

During OCN self-test, test code must not rely on the same function under test to read expected results.

规则：

测试 getStatus 时，直接读 state.json 比较，不通过 getStatus 比较。
测试 captureLog 时，直接读取 log-events.jsonl 和 dev-log.md，不通过 OCN parse。
测试 checkCurrentArtifact 时，直接检查 ArtifactGateStatus 输出和 state.json，不通过二次封装函数判断。

目的：

防止 OCN 自我观察掩盖 bug。
Prevent OCN self-observation from hiding bugs.

⸻

24.4 Dogfood Project 2: mini CRM

mini CRM 锁定为第二个 dogfood 项目。

mini CRM is locked as Dogfood Project 2.

验收范围：

使用 ocn init --tier production 初始化
项目从 DISCOVERY 跑到 VERIFY
docs/02-prd.md 包含 ≥ 3 个真实业务 Scenarios
docs/05-data-model.md 包含 ≥ 3 个 entity
docs/06-api-contract.md 至少包含 1 个 CRUD endpoint
docs/12-rollback-plan.md 已生成
docs/13-validation-report.md 包含 ≥ 5 个测试客户
至少 1 次因 production tier artifact 缺失被 block
不包含人脸识别、摄像头、真实敏感个人信息
生成 dogfood-report-mini-crm.md

⸻

24.5 Dogfood Report Template

每份 dogfood report 必须包含以下结构：

Each dogfood report must include the following structure.

# Dogfood Report｜自举验证报告
## 1. Project Identification｜项目识别
- Project name:
- Dogfood start date:
- Dogfood end date:
- Tier:
- OCN version:
- SOP profile version:
## 2. State Coverage｜状态覆盖
- States passed:
- State entry / exit timestamps:
- Transition count:
- Failed transition count:
## 3. Artifact Coverage｜产物覆盖
- Artifacts created:
- Artifact status summary:
- draft:
- draft_blocked:
- complete:
- Step Artifact Gate blocked count:
## 4. Audit Evidence｜审计证据
- advance_succeeded count:
- advance_failed count:
- artifact_gate_blocked count:
- baseline_created count:
- audit file path:
## 5. Decision Coverage｜决策覆盖
- decision count:
- key decisions:
- decision-log path:
## 6. Issues Found｜发现的问题
- Issue:
- Root cause:
- Related layer:
- Amendment needed: yes / no
- Amendment path:
## 7. Conclusion｜结论
- Pass / Conditional Pass / Fail:
- Reason:
- Recommendation for next phase:

⸻

25. Test Fixtures｜测试夹具

25.1 必备夹具

valid minimal project
valid production project
invalid state.json
old SOP version project
future schemaVersion project
PRD missing Scenarios
PRD with canonical heading Scenarios｜使用场景
PRD with English alias Scenarios
PRD with Chinese alias 使用场景
PRD with English alias variant Use Cases
PRD with Chinese alias variant 用户场景
PRD with lowercase scenarios
PRD with markdown link heading
PRD with wrong heading level
PRD with fake self-check
valid vitest json
invalid vitest json
stale lock file
non-stale lock file
path traversal artifact definition

⸻

25.2 夹具目录建议

tests/fixtures/
  projects/
    valid-minimal/
    valid-production/
    invalid-state/
    old-sop-version/
    future-schema-version/
  artifacts/
    prd-missing-scenarios.md
    prd-canonical-heading.md
    prd-valid-zh-alias.md
    prd-valid-en-alias.md
    prd-valid-use-cases-alias.md
    prd-valid-user-scenarios-alias.md
    prd-lowercase-heading.md
    prd-markdown-link-heading.md
    prd-wrong-heading-level.md
    prd-fake-self-check.md
  test-results/
    vitest-valid.json
    vitest-invalid.json
  locks/
    stale-lock.json
    active-lock.json
  paths/
    path-traversal-artifact.yaml

⸻

26. Coverage Matrix｜覆盖矩阵

Area	Unit	Integration	Contract	Dogfood
Data Model	yes	no	yes	indirect
Core Engine	yes	partial	yes	yes
CLI	no	yes	yes	yes
MCP	no	yes	yes	partial
Step Artifact Gate	yes	yes	yes	yes
Lock	yes	yes	yes	yes
Event Persistence	yes	yes	yes	yes
File Boundary	yes	yes	yes	no
Brief / Prompt Content	yes	yes	yes	yes
Performance	no	yes	yes	no
Dogfood	no	no	no	yes
AC Traceability	no	yes	yes	yes

⸻

27. Test Infrastructure Prerequisite for MVP｜MVP 测试基础设施前置条件

进入 MVP BUILD 前，以下测试基础设施必须先建立：

Before MVP BUILD, the following test infrastructure must be established:

1. vitest 配置
2. tsconfig 配置
3. fixtures 目录结构
4. temp project helper
5. coverage 配置
6. GitHub Actions workflow
7. pre-commit hook
8. Schema test 基础覆盖
9. CLI spawn helper
10. fs failure injection helper

建议作为 Skeleton Spike Step 0：

Recommended as Skeleton Spike Step 0:

在写 Core Engine 任何主要功能前，先建立测试基础设施。
Before writing any major Core Engine feature, establish test infrastructure first.

Step 0 验收标准见第 9.4 节。

Step 0 acceptance criteria are defined in Section 9.4.

⸻

28. Test Result Recording Bootstrap｜测试结果记录引导顺序

28.1 Skeleton Spike 阶段

Skeleton Spike 阶段：

vitest 直接运行
测试结果可以手工保存到 .ocoding/test-results/
不强制通过 ocn test record

原因：

ocn test record 尚未实现。

⸻

28.2 Alpha 末期

Alpha 末期：

实现 ocn test record
OCN 自身测试结果开始通过 ocn test record 记录

⸻

28.3 Beta 起

Beta 起：

所有 OCN 自身测试结果必须通过 ocn test record 记录

⸻

29. Release Gate｜发布门禁

29.1 Alpha Release Gate

alpha 必须通过：

Skeleton Spike
Core Engine minimal unit tests
CLI init / status / brief / doc create / check tests
Step Artifact Gate missing section tests
state.json schema validation
basic CLI exit code tests
测试基础设施已建立

⸻

29.2 Beta Release Gate

beta 必须通过：

all alpha tests
gate / advance tests
log / decision / research tests
event dual persistence tests
lock stale recovery tests
doctor tests
MCP safe tool tests
mini CRM partial dogfood
ocn test record 可用

⸻

29.3 GA Release Gate

GA 必须通过：

all beta tests
all must AC tests
AC coverage script missing count = 0
CLI output contract tests
MCP boundary tests
reset safety tests
SOP versioning tests
failure injection tests
performance report
OCN self dogfood
mini CRM dogfood
external user smoke test
coverage thresholds

⸻

30. Test Result Recording｜测试结果记录

30.1 测试结果写入

OCN 自身测试结果在 alpha 末期后必须通过：

OCN self-test results after late alpha must be recorded through:

ocn test record --from vitest <path>

⸻

30.2 Validation Report

进入 VERIFY 阶段后，测试结果必须汇总到：

After entering VERIFY, test results must be summarized into:

docs/13-validation-report.md

⸻

30.3 Baseline

通过关键测试后，应创建 baseline：

After key tests pass, create baseline:

ocn baseline create

⸻

31. 明确不测｜Out of Scope Tests for v1.0

v1.0 不测试：

v1.0 does not test:

Web UI
TUI
SaaS sync
multi-user collaboration
remote database
LLM judge semantic quality
custom SOP profile authoring
non-vitest test parser
full streaming output
Windows-specific shell edge cases beyond basic path compatibility

⸻

32. Test Strategy Self-check｜测试策略自检

✓ Testing principles
✓ Test layers
✓ Test phases
✓ Coverage Targets
✓ Module Boundary Definition
✓ Test Execution Strategy
✓ CI Workflow Specification
✓ Test Time Budget
✓ Test Filesystem Strategy
✓ Skeleton Spike
✓ Skeleton Spike and alpha relationship
✓ Skeleton Spike Step 0 acceptance criteria
✓ Skeleton Spike failure classification
✓ AC Traceability Matrix
✓ AC coverage script rule
✓ Schema / Model Tests
✓ Brief / Prompt Content Tests
✓ Core Engine Unit Tests
✓ Step Artifact Gate Tests
✓ Bilingual alias fixture coverage
✓ CLI Integration Tests with flag combinations
✓ Doctor flag mutual exclusion
✓ Event / Persistence Tests
✓ Failure Injection Tests
✓ Lock / Concurrency Tests
✓ Lock Contract Tests
✓ MCP Contract Tests
✓ File System Boundary Tests
✓ SOP Versioning Tests
✓ Performance Tests
✓ Reset / Doctor Tests
✓ OCN dogfood
✓ Dogfood state coverage explanation
✓ OCN dogfood test isolation
✓ mini CRM dogfood
✓ Dogfood Report Template
✓ Test fixtures
✓ Coverage Matrix
✓ Test Infrastructure Prerequisite for MVP
✓ Test Result Recording Bootstrap
✓ Release Gate
✓ Test Result Recording
✓ Out of Scope Tests

⸻

33. 下一步｜Next Step

完成本文档后，DESIGN 阶段四件套完成：

After this document, DESIGN phase core documents are complete:

docs/04-information-architecture.md
docs/05-data-model.md
docs/06-api-contract.md
docs/07-test-strategy.md

下一步进入 PLAN 阶段第一份文档：

Next step enters the first PLAN phase document:

#9｜MVP Plan
docs/08-mvp-plan.md

但根据本文档，#9 MVP Plan 必须把第一阶段定义为：

However, according to this document, #9 MVP Plan must define Phase 1 as:

Skeleton Spike｜骨架原型验证

特别注意：

Special note:

#9 MVP Plan 应保持极简，避免在 Skeleton Spike 验证前继续堆叠过多上层计划。
#9 MVP Plan should stay minimal and avoid over-planning before Skeleton Spike validation.
Skeleton Spike 如果暴露 Data Model / API Contract / IA 结构性问题，必须写 Amendment 后再继续后续 PLAN 文档。
If Skeleton Spike exposes structural issues in Data Model / API Contract / IA, write Amendment before continuing later PLAN documents.