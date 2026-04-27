# O’CodingNavigator MVP Plan
# #9｜MVP Plan 最小可行产品计划 v1.1
文档路径：`docs/08-mvp-plan.md`  
产品名称：`O’CodingNavigator`  
产品简称：`OCN`  
CLI 命令：`ocn`  
文档版本：`v1.1`  
SOP Profile：`default-ai-coding-sop`  
SOP Profile Version：`0.1.0`  
Schema Version：`1.0`  
当前状态：`PLAN`  
当前 Step：`step_mvp_plan`  
依赖文档：  
- `docs/00-project-brief.md`
- `docs/01-scope.md`
- `docs/02-prd.md`
- `docs/03-acceptance-criteria.md`
- `docs/04-information-architecture.md`
- `docs/05-data-model.md`
- `docs/06-api-contract.md`
- `docs/07-test-strategy.md`
对应 SOP：第 9 步｜先做最小可用版本
---
# 1. 文档目的｜Purpose
本文档定义 O’CodingNavigator v1.0 的 MVP 执行计划。
This document defines the MVP execution plan for O’CodingNavigator v1.0.
本计划不是完整开发排期，而是为了回答一个问题：
This plan is not a full development schedule. It answers one question:
```text id="zjkn5r"
第一轮必须先做到哪里，才有资格继续扩大实现范围？
What must be done first before expanding implementation scope?

本轮 MVP 的核心判断：

OCN 不是先完整实现所有功能，而是先跑通 Skeleton Spike。
OCN should not first implement all features. It must first pass Skeleton Spike.

⸻

2. MVP 总原则｜MVP Principles

2.1 先验证设计，再扩大实现

OCN 已完成 8 份基础设计文档，但仍是纸面设计。
OCN has completed 8 foundational design documents, but they are still paper design.

MVP 第一目标不是“多做功能”，而是验证：

The first MVP goal is not to build more features, but to validate:

Data Model 是否能落到文件系统
API Contract 是否能落到 CLI
Step Artifact Gate 是否能真实拦住假完成
Test Strategy 是否能指导真实测试

⸻

2.2 第一阶段必须是 Skeleton Spike

MVP Phase 1 固定为：

Skeleton Spike｜骨架原型验证

不允许在 Skeleton Spike 之前启动完整 BUILD。

Full BUILD must not start before Skeleton Spike.

⸻

2.3 MVP 不追求完整，只追求可证伪

MVP 的价值不是证明 OCN 一定正确，而是快速暴露：

The value of MVP is not to prove OCN is correct, but to expose:

Data Model 缺字段
API Contract 不可实现
IA 流程不通
Step Artifact Gate 检测不稳定
CLI 输出不符合人机双用

⸻

2.4 失败也是 MVP 产物

如果 Skeleton Spike 失败，失败本身就是有效产物。

If Skeleton Spike fails, the failure is also a valid deliverable.

必须产出：

docs/14-debug-report.md
必要的 Amendment
Decision Log

⸻

3. SOP 第 9 步标准结构｜SOP Step 9 Standard Structure

3.1 最小主链路｜Minimal Main Path

Skeleton Spike 的最小主链路如下：

The minimal main path for Skeleton Spike is:

用户创建空目录
→ ocn init --tier minimal
→ ocn status
→ ocn doc create prd
→ 用户或 AI 写一份故意缺少 Scenarios｜使用场景 的 PRD
→ ocn check
→ OCN 返回 blocked，exit code = 2
→ 用户或 AI 补上 Scenarios｜使用场景
→ ocn check
→ OCN 返回 pass 或 warning
→ ocn brief
→ 用户确认 OCN 能恢复当前项目上下文

这条链路验证 OCN 最核心的价值：

不是生成文档，而是发现文档没有达到当前步骤要求。
Not generating documents, but detecting when an artifact does not meet the current step requirement.

⸻

3.2 必要命令｜Necessary Commands

Skeleton Spike 只实现 5 个命令：

Skeleton Spike implements only 5 commands:

ocn init
ocn status
ocn brief
ocn doc create prd
ocn check

⸻

3.3 必要接口｜Necessary Interfaces

Skeleton Spike 必须落地以下 Core Engine 接口：

Skeleton Spike must implement the following Core Engine interfaces:

initProject
getStatus
generateBrief
createArtifact
checkCurrentArtifact

Skeleton Spike 必须落地以下内部接口：

Skeleton Spike must implement the following internal interfaces:

SOP Loader 最小实现
State JSON read / write
Artifact template writer
Markdown AST parser
RequiredSection canonical / alias matcher
ArtifactGateStatus calculator
CommandResult renderer

Skeleton Spike 暂不实现：

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
MCP server

⸻

3.4 必要数据｜Necessary Data

Phase 0 必须准备以下 fixture：

Phase 0 must prepare the following fixtures:

tests/fixtures/sop/skeleton-spike-sop.yaml
tests/fixtures/artifacts/prd-missing-scenarios.md
tests/fixtures/artifacts/prd-with-scenarios.md
tests/fixtures/projects/empty/
tests/fixtures/projects/valid-minimal/
tests/fixtures/state/valid-state.json
tests/fixtures/state/invalid-state.json

其中：

prd-missing-scenarios.md:
  用于验证 ocn check 能返回 blocked。
prd-with-scenarios.md:
  用于验证修复后 ocn check 能返回 pass 或 warning。
skeleton-spike-sop.yaml:
  精简 SOP profile，只包含 Skeleton Spike 所需 state / step / artifact / gate。

⸻

3.5 必要角色｜Necessary Roles

Skeleton Spike 阶段只定义 3 个角色：

Skeleton Spike defines only 3 roles:

Implementer｜实施者:
  使用 Claude Code 实现 Phase 0 / Phase 1。
User｜使用者:
  以真实用户身份运行 ocn 命令，完成最小主链路。
Reviewer｜验收者:
  对照 docs/07-test-strategy.md 和本 MVP Plan 验收结果。

v1.0 不引入多用户协作角色。

v1.0 does not introduce multi-user collaboration roles.

⸻

3.6 必要输入｜Necessary Inputs

Skeleton Spike 需要以下输入：

Skeleton Spike requires the following inputs:

空项目目录
default-ai-coding-sop@0.1.0 精简 profile
PRD 模板
缺 Scenarios 的 PRD fixture
补全 Scenarios 的 PRD fixture

⸻

3.7 必要输出｜Necessary Outputs

Skeleton Spike 必须输出：

Skeleton Spike must output:

.ocoding/state.json
.ocoding/sop.yaml
.ocoding/gates.yaml
.ocoding/config.yaml
docs/02-prd.md
ocn status 输出
ocn brief 输出
ocn check blocked 输出
ocn check pass 或 warning 输出
dogfood-report-skeleton-spike.md

如失败，还必须输出：

docs/14-debug-report.md
必要 Amendment
docs/19-decision-log.md 相关决策记录

⸻

3.8 演示路径｜Demo Path

Skeleton Spike 完成后，必须可以按以下方式演示：

After Skeleton Spike, demo must run as follows:

mkdir /tmp/ocn-skeleton-spike-demo
cd /tmp/ocn-skeleton-spike-demo
ocn init --tier minimal
ocn status
ocn doc create prd
# 写入缺少 Scenarios｜使用场景 的 PRD
cp <repo>/tests/fixtures/artifacts/prd-missing-scenarios.md docs/02-prd.md
ocn check --json
# 修复 PRD
cp <repo>/tests/fixtures/artifacts/prd-with-scenarios.md docs/02-prd.md
ocn check --json
ocn brief

必须观察到：

第一次 ocn check:
  ok = false
  code = ERR_ARTIFACT_INVALID
  exit code = 2
  missingRequiredSectionIds includes section_scenarios
第二次 ocn check:
  ok = true 或 warning
  exit code = 0 或按 warning contract 返回

⸻

3.9 验收路径｜Acceptance Path

Skeleton Spike 验收分为 4 步：

1. Phase 0 prerequisite check 通过
2. Phase 1 11 步主链路跑通
3. dogfood-report-skeleton-spike.md 已生成
4. Post-Spike Decision Gate 输出 Pass / Conditional Pass / Fail

⸻

4. MVP 分期总览｜MVP Phases

OCN v1.0 MVP 分为 5 个阶段：

Phase 0: Test Infrastructure Setup
Phase 1: Skeleton Spike
Phase 2: Alpha Core Loop
Phase 3: Beta Workflow Expansion
Phase 4: GA Hardening and Dogfood

4.1 命名一致性

为避免与 Test Strategy 中 “Skeleton Spike Step 0” 混淆，本 MVP Plan 使用：

MVP Phase 0 = Test Strategy Skeleton Spike Step 0
MVP Phase 1 = Test Strategy Skeleton Spike Step 1-11

本 MVP Plan 优先使用 Phase 0 / Phase 1 叫法。

⸻

5. MVP 时间预算｜MVP Time Budget

说明：

这是参考预算，不是承诺日期。
This is a reference budget, not a delivery promise.
超出预算 1.5x 必须停下评估。
If exceeded by 1.5x, stop and evaluate.

Phase	目标时长	超时处理
Phase 0 Test Infrastructure	1-2 个工作日	超过 3 个工作日写 Decision Log
Phase 1 Skeleton Spike	2-3 个工作日	超过 5 个工作日触发设计评估
Post-Spike Decision Gate	0.5 个工作日	超过 1 个工作日说明原因
Phase 2 Alpha Core Loop	5-7 个工作日	超过 10 个工作日评估范围
Phase 3 Beta Workflow Expansion	7-10 个工作日	超过 15 个工作日评估范围
Phase 4 GA Hardening and Dogfood	5-7 个工作日	超过 10 个工作日评估发布风险

总参考周期：

全职 + Claude Code 加速：4-6 周
非全职：6-9 周

⸻

6. Phase 0｜Test Infrastructure Setup

6.1 目标

在写 Core Engine 主要功能前，先建立最小测试基础设施。

Before writing major Core Engine functions, establish minimal test infrastructure.

⸻

6.2 交付物

必须建立：

Vitest 配置
TypeScript 配置
fixtures 目录
temp project helper
coverage 配置
GitHub Actions workflow
pre-commit hook
Schema test 基础覆盖
CLI spawn helper
fs failure injection helper

⸻

6.3 通过标准

Phase 0 通过 = 以下 10 项全部满足最小可工作标准：

1. Vitest:
   能运行 hello-world test
   能产出 coverage 报告
2. TypeScript:
   tsc --noEmit 通过
   strict: true
3. Fixtures:
   tests/fixtures/ 已创建
   至少包含 valid-minimal project fixture
   至少包含 prd-missing-scenarios.md
4. Temp project helper:
   createTempProject() 可用
   cleanupTempProject() 可用
5. Coverage:
   coverage provider 已配置
   thresholds 对应 docs/07-test-strategy.md
6. GitHub Actions:
   .github/workflows/test.yml 已创建
   至少 ubuntu-latest 可跑通
7. Pre-commit:
   hook 文件存在
   可阻止 lint 错误 commit
   如果超过 30 秒，降级为 lint + changed tests
8. Schema test:
   至少覆盖 ProjectState 和 BilingualMessage
   valid / invalid fixture 各一个
9. CLI spawn helper:
   spawnOcn(args, opts) 返回 stdout / stderr / exitCode
   支持 cwd 和 env
10. FS failure injection helper:
   injectFsFailure() 支持 ENOSPC / EACCES / EBUSY

必须通过：

prerequisite check test

⸻

6.4 Phase 0 实现边界

Phase 0 允许：

创建 Core Engine 函数空 stub
创建 CLI commander 命令空 stub
创建 Data Model schema
创建测试 helper
创建 fixtures
创建 GitHub Actions workflow
创建 pre-commit hook

Phase 0 不允许：

实现真实 init 逻辑
实现真实 check 逻辑
实现真实 state machine
实现真实 gate
实现真实 event 写入
实现真实 MCP server

Phase 0 的精神：

代码骨架可编译，测试可运行，但主要产品功能尚未实现。
The code skeleton compiles and tests run, but major product logic is not implemented yet.

⸻

7. Phase 1｜Skeleton Spike

7.1 目标

用最小可运行代码验证 OCN 设计是否能跑通最小闭环。

Validate whether OCN design can run the minimal loop with minimal working code.

⸻

7.2 只实现 5 个命令

Skeleton Spike 只实现：

ocn init
ocn status
ocn brief
ocn doc create prd
ocn check

⸻

7.3 Fixture Strategy｜夹具策略

Phase 0 必须预先准备：

tests/fixtures/sop/skeleton-spike-sop.yaml
tests/fixtures/artifacts/prd-missing-scenarios.md
tests/fixtures/artifacts/prd-with-scenarios.md
tests/fixtures/projects/empty/
tests/fixtures/projects/valid-minimal/

Phase 1 必须使用这些 fixture 跑 Skeleton Spike，避免临场手写导致不可复现。

Phase 1 must use these fixtures to keep the Spike reproducible.

⸻

7.4 验证闭环

必须真实跑通：

1. 创建空目录
2. ocn init --tier minimal
3. ocn status
4. ocn brief
5. ocn doc create prd
6. 写入或复制一份缺少 Scenarios｜使用场景 的玩具 PRD
7. ocn check
8. check 必须 blocked
9. 补上或复制带 Scenarios｜使用场景 的 PRD
10. 再次 ocn check
11. check 必须 pass 或 warning

⸻

7.5 Skeleton Spike 成功标准

必须满足：

.ocoding/state.json 被正确创建
docs/02-prd.md 可被创建
ocn status 能显示 currentStateId 和 currentStepId
ocn brief 能输出当前上下文
ocn check 能识别缺失 required section
ocn check blocked 时 exit code = 2
ocn check --json blocked 时 stdout 输出完整 CommandResult
修复 PRD 后 ocn check 能 pass 或 warning

⸻

7.6 Skeleton Spike 失败处理

如果失败，按 docs/07-test-strategy.md 中 “Skeleton Spike 失败分类与处理” 一节处理。

失败分类：

A 实现 bug
B Data Model 缺字段
C API Contract 设计错误
D IA / 架构错误
E 工程现实约束

必须输出：

docs/14-debug-report.md
dogfood-report-skeleton-spike.md
必要 Amendment

⸻

7.7 明确不做

Skeleton Spike 不做：

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

8. dogfood-report-skeleton-spike.md 模板

Skeleton Spike 完成后必须输出：

dogfood-report-skeleton-spike.md

模板如下：

# Dogfood Report｜Skeleton Spike 自举验证报告
## 1. Spike Identification｜Spike 识别
- Implementation date:
- Implementation duration:
- Implementer:
- Reviewer:
- OCN version:
- SOP profile version:
- Commit hash:
## 2. Phase 0 Infrastructure Status｜Phase 0 基础设施状态
| Item | Status | Evidence |
|---|---|---|
| Vitest | Pass / Fail | |
| TypeScript | Pass / Fail | |
| Fixtures | Pass / Fail | |
| Temp project helper | Pass / Fail | |
| Coverage | Pass / Fail | |
| GitHub Actions | Pass / Fail | |
| Pre-commit hook | Pass / Fail | |
| Schema tests | Pass / Fail | |
| CLI spawn helper | Pass / Fail | |
| FS failure injection helper | Pass / Fail | |
## 3. Phase 1 Spike Loop Execution｜Phase 1 主链路执行
| Step | Command / Action | Expected | Actual | Exit Code | Result |
|---|---|---|---|---:|---|
| 1 | create empty dir | dir exists | | | |
| 2 | ocn init --tier minimal | state created | | | |
| 3 | ocn status | current state shown | | | |
| 4 | ocn brief | context shown | | | |
| 5 | ocn doc create prd | docs/02-prd.md created | | | |
| 6 | copy prd-missing-scenarios | PRD missing Scenarios | | | |
| 7 | ocn check | blocked | | 2 | |
| 8 | copy prd-with-scenarios | PRD has Scenarios | | | |
| 9 | ocn check | pass or warning | | 0 or warning code | |
## 4. Pass Criteria Verification｜通过标准验证
- [ ] .ocoding/state.json correctly created
- [ ] docs/02-prd.md created
- [ ] ocn status displays currentStateId and currentStepId
- [ ] ocn brief outputs current project context
- [ ] ocn check detects missing required section
- [ ] blocked check returns exit code 2
- [ ] ocn check --json outputs complete CommandResult
- [ ] fixed PRD returns pass or warning
## 5. Issues Found｜发现的问题
| Issue | Type A/B/C/D/E | Root Cause | Fixed | Amendment Needed |
|---|---|---|---|---|
## 6. Amendments Triggered｜触发的修订
- Data Model Amendment:
- API Contract Amendment:
- IA Amendment:
- Test Strategy Amendment:
- MVP Plan Amendment:
## 7. Post-Spike Decision｜Spike 后决策
Result:
- Pass
- Conditional Pass
- Fail
Reason:
Required actions before next phase:
## 8. Lessons Learned｜经验总结
- What worked:
- What failed:
- Design vs implementation gap:
- Recommendation for Alpha Core Loop:

⸻

9. Phase 2｜Alpha Core Loop

9.1 目标

在 Skeleton Spike 通过后，扩展到 alpha 核心流程。

After Skeleton Spike passes, expand to alpha core workflow.

⸻

9.2 核心能力

Alpha Core Loop 包括：

完整 init
完整 status
完整 brief
完整 prompt next
完整 doc create
完整 check
基础 gate
基础 advance
基础 dev log
基础 audit trail

⸻

9.3 通过标准

详见：

docs/07-test-strategy.md
Alpha Release Gate

MVP Plan 额外要求：

Phase 0 已 100% 完成
Skeleton Spike 已 Pass
没有未关闭的 B / C / D 类 Skeleton Spike Amendment

Conditional Pass 不允许直接进入 Phase 2，必须先关闭指定 Amendment。

⸻

10. Phase 3｜Beta Workflow Expansion

10.1 目标

把 OCN 从最小闭环扩展成可连续使用的开发流程工具。

Expand OCN from minimal loop into a continuous workflow tool.

⸻

10.2 核心能力

Beta 包括：

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
ocn test record

⸻

10.3 mini CRM Partial Dogfood

Phase 3 的 mini CRM partial dogfood 只验证：

DISCOVERY → SPEC
ocn init --tier production 能创建 production 模板
PRD / AC 能按 production tier 生成
production tier 必备 artifact 缺失时能 blocked

Phase 3 不要求：

完整业务实现
完整 CRUD
5 个测试客户
完整 validation report

⸻

10.4 通过标准

详见：

docs/07-test-strategy.md
Beta Release Gate

MVP Plan 额外要求：

mini CRM partial dogfood 完成
event dual persistence 可用
MCP safe tools 边界已测

⸻

11. Phase 4｜GA Hardening and Dogfood

11.1 目标

让 OCN 达到可开源发布标准。

Bring OCN to open-source release quality.

⸻

11.2 核心能力

GA 包括：

完整 CLI output contract
完整 exit code mapping
完整 MCP boundary
reset safety
SOP versioning
failure injection
file system boundary
performance report
OCN self dogfood
mini CRM dogfood
external user smoke test
coverage thresholds
AC coverage script

⸻

11.3 mini CRM Full Dogfood

Phase 4 的 mini CRM full dogfood 必须验证：

DISCOVERY → VERIFY
docs/02-prd.md 包含 ≥ 3 个真实业务 Scenarios
docs/05-data-model.md 包含 ≥ 3 个 entity
docs/06-api-contract.md 至少包含 1 个 CRUD endpoint
docs/12-rollback-plan.md 已生成
docs/13-validation-report.md 包含 ≥ 5 个测试客户
至少 1 次因 production tier artifact 缺失被 block
不包含人脸识别、摄像头、真实敏感个人信息
dogfood-report-mini-crm.md 已生成

⸻

11.4 通过标准

详见：

docs/07-test-strategy.md
GA Release Gate

MVP Plan 额外要求：

OCN self dogfood 完成
mini CRM full dogfood 完成
AC coverage script missing count = 0
外部用户 smoke test 通过

⸻

12. MVP 功能边界｜MVP Functional Boundary

12.1 v1.0 必做

v1.0 必须交付：

Local-first CLI
MCP safe tools
SOP Loader
State Machine
Step Artifact Gate
Artifact templates
Brief / Prompt generation
Dev / Research / Decision logs
Audit trail
Baseline
Doctor
Reset safety
Test result recording
Dogfood reports

⸻

12.2 v1.0 不做

v1.0 不做：

Web UI
TUI
SaaS sync
multi-user collaboration
remote database
LLM judge semantic quality scoring
custom SOP profile authoring
non-vitest test parser
full streaming output
force release lock

说明：

force release lock 不进入 v1.0，因此不需要 v1.0 测试。

⸻

13. Skeleton Spike 前禁止扩张｜No Expansion Before Skeleton Spike

13.1 禁止新增

Skeleton Spike 前不得新增以下需求：

新状态
新 artifact 类型
新 MCP tool
新数据库
新 UI
新 AI judge
新协作机制

⸻

13.2 与 v1.0 不做清单的区别

本节是 Phase 1 期间的范围控制，不是 v1.0 整体范围。

This section is Phase 1 scope control, not the full v1.0 scope boundary.

第 12 节：
定义整个 v1.0 都不做什么。
第 13 节：
定义 Skeleton Spike 前不允许扩张什么。

Spike 完成后，Phase 2-4 可在第 12 节定义的 v1.0 范围内扩展功能。

After Spike, Phase 2-4 may expand within the v1.0 boundary defined in Section 12.

⸻

14. MVP 技术边界｜MVP Technical Boundary

14.1 初始技术形态

v1.0 初始形态：

TypeScript
Node.js CLI
Local filesystem
Markdown + JSON / YAML
Vitest
GitHub Actions
MCP Server

⸻

14.2 存储边界

v1.0 存储范围：

.ocoding/**
docs/**

不引入：

SQLite
remote DB
cloud sync

说明：

SQLite 可作为 v1.1 / v2.0 评估项。
v1.0 先使用文件系统降低复杂度。

⸻

14.3 MCP 边界

v1.0 MCP 只暴露安全工具：

navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt

不暴露：

navigator.advance_phase
navigator.capture_decision
navigator.reset_project
navigator.modify_sop_profile

⸻

15. MVP 开发顺序｜MVP Development Order

开发顺序必须遵循：

1. Phase 0: Test Infrastructure
2. Phase 1: Skeleton Spike
3. Skeleton Spike Report
4. 必要 Amendment
5. Phase 2: Alpha Core Loop
6. Phase 3: Beta Workflow Expansion
7. Phase 4: GA Hardening and Dogfood

不允许：

在 Skeleton Spike 前实现完整功能
在测试基础设施前实现 Core Engine 主功能
在 Step Artifact Gate 未通过前推进 Alpha
在 MCP 边界未测前开放 MCP 写入能力

⸻

16. Decision Log｜OCN dogfood 偏离严格 SOP 顺序

16.1 决策

OCN 自身 dogfood 在第 9 步 MVP Plan 完成后，直接进入 Skeleton Spike，不继续完整展开第 10-13 步。

After Step 9 MVP Plan, OCN dogfood will enter Skeleton Spike directly instead of fully expanding Steps 10-13 first.

被延后的 SOP 文档：

#10 Real Data Wiring
#11 Config and Env
#12 Reproducibility
#13 Rollback Plan

⸻

16.2 理由

Skeleton Spike 是对 8 份设计文档的真实验证。
#10-#13 高度依赖实际运行结果、真实文件结构、依赖包和命令。
在 Skeleton Spike 前完整展开 #10-#13，容易基于未验证设计过度规划。

⸻

16.3 风险

OCN 在 dogfood 中偏离严格 SOP 顺序。
用户可能质疑：OCN 自己为什么不严格按 SOP？

⸻

16.4 缓解

明确记录该偏离。
将本决策写入 docs/19-decision-log.md。
Skeleton Spike 完成后立即补齐 #10-#13。
如 Skeleton Spike 暴露结构性问题，先写 Amendment，再继续 PLAN。

⸻

16.5 决策结论

形式上偏离严格 SOP 顺序。
精神上符合 SOP 第 9 步 MVP 和第 14 步小样本验证原则。

⸻

17. Post-Spike Decision Gate｜Skeleton Spike 后决策门

Skeleton Spike 完成后，必须召开一次设计校准门禁。

After Skeleton Spike, run a design calibration gate.

17.1 必须检查

Data Model 是否需要 Amendment
API Contract 是否需要 Amendment
IA 是否需要 Amendment
Test Strategy 是否需要 Amendment
MVP Plan 是否需要 Amendment
是否可以进入 Alpha Core Loop

⸻

17.2 输出文件

必须输出：

dogfood-report-skeleton-spike.md

如有问题，额外输出：

docs/14-debug-report.md
docs/amendments/<date>-data-model-amendment.md
docs/amendments/<date>-api-contract-amendment.md
docs/amendments/<date>-ia-amendment.md
docs/amendments/<date>-test-strategy-amendment.md
docs/amendments/<date>-mvp-plan-amendment.md

⸻

17.3 决策结果

Skeleton Spike 后只能有三种结果：

Pass:
  进入 Alpha Core Loop。
Conditional Pass:
  允许进入 Alpha，但必须先完成指定 Amendment。
Fail:
  不进入 Alpha，回到对应设计文档修订。

⸻

18. MVP 风险控制｜MVP Risk Control

18.1 最大风险

当前最大风险不是功能做不完，而是设计过度复杂、实现无法落地。

The biggest current risk is not failure to build enough features, but over-designed structure that cannot land.

⸻

18.2 风险控制策略

通过以下方式控制：

先 Skeleton Spike
先 5 个命令
先真实文件系统
先 PRD required section blocked
先 --json 输出验证
先 exit code 验证

⸻

18.3 禁止无限修补

如果 Skeleton Spike 连续 3 次失败：

停止继续补丁式修复
写 Decision Log
判断是否回到 Data Model / API Contract / IA 重设

⸻

19. MVP 与后续 PLAN 文档关系

19.1 为什么本 MVP Plan 保持极简

本 MVP Plan 故意保持极简，因为：

Skeleton Spike 尚未验证设计。
过早写完 #10-#13 会基于未验证设计做过度规划。

⸻

19.2 #10-#13 的推进条件

以下文档暂不展开：

#10 Real Data Wiring
#11 Config and Env
#12 Reproducibility
#13 Rollback Plan

只有在 Skeleton Spike 完成后，才进入完整撰写。

⸻

19.3 Skeleton Spike 对 #10-#13 的影响

Skeleton Spike 会影响：

实际文件结构
真实 CLI 启动命令
测试运行方式
依赖包选择
配置项
回滚策略
复现方式

因此 #10-#13 必须基于 Skeleton Spike 后的真实结果撰写。

⸻

20. AC Traceability 实施策略

20.1 alpha / beta

alpha / beta 阶段：

开始使用 @ac 注释规范
不强制 missing count = 0

⸻

20.2 GA

GA 阶段：

必须实现 AC coverage script
必须扫描 tests/**/*.test.ts
必须对照 docs/03-acceptance-criteria.md
missing count 必须 = 0

⸻

20.3 v1.1+

v1.1 之后：

AC coverage script 进入 CI
PR 引入新 AC 时必须同步引入 @ac 注释测试

⸻

21. MVP Success Criteria｜MVP 成功标准

21.1 Skeleton Spike 成功

必须满足：

Phase 0 通过
Phase 1 通过
dogfood-report-skeleton-spike.md 已生成
没有未处理的 B / C / D 类失败

⸻

21.2 Alpha 成功

必须满足：

Alpha Release Gate 通过
核心 5 命令测试通过
基础 gate / advance 可用
Step Artifact Gate 可稳定 blocked / pass

⸻

21.3 Beta 成功

必须满足：

Beta Release Gate 通过
MCP safe tools 可用
event dual persistence 可用
doctor 可用
ocn test record 可用
mini CRM partial dogfood 完成

⸻

21.4 GA 成功

必须满足：

GA Release Gate 通过
OCN self dogfood 完成
mini CRM full dogfood 完成
AC coverage script missing count = 0
外部用户 smoke test 通过

⸻

22. MVP Self-check｜MVP 计划自检

✓ MVP purpose
✓ MVP principles
✓ SOP Step 9 standard structure
✓ Minimal main path
✓ Necessary commands
✓ Necessary interfaces
✓ Necessary data
✓ Necessary roles
✓ Necessary inputs
✓ Necessary outputs
✓ Demo path
✓ Acceptance path
✓ MVP phases
✓ MVP time budget
✓ Phase 0 Test Infrastructure
✓ Phase 0 acceptance criteria
✓ Phase 0 implementation boundary
✓ Phase 1 Skeleton Spike
✓ Fixture Strategy
✓ dogfood-report-skeleton-spike.md template
✓ Phase 2 Alpha Core Loop
✓ Phase 3 Beta Workflow Expansion
✓ mini CRM partial dogfood
✓ Phase 4 GA Hardening and Dogfood
✓ mini CRM full dogfood
✓ MVP functional boundary
✓ Skeleton Spike no-expansion boundary
✓ MVP technical boundary
✓ MCP boundary
✓ MVP development order
✓ Decision Log for SOP sequence deviation
✓ Post-Spike Decision Gate
✓ MVP risk control
✓ Relationship with #10-#13
✓ AC Traceability implementation strategy
✓ MVP success criteria