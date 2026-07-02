# Amendment AM-015 — 验收主干（Acceptance Backbone，SOP 0.8.0）

**Status**: Accepted (implemented)

## Date

2026-07-02

## Supersedes

None（additive，新增一条 Backbone；细化 DEC-024 的验收标准解析与 AM-007 的 build-plan `traces`
校验）。不改写任何 frozen `docs/0X` 契约；0.7.0 及更早 profile 逐字冻结、仍可 `ocn init --sop-version …`
导入。设计全文见 `docs/acceptance-backbone-proposal.md`。

## 背景｜Why

验收标准（`docs/03`）是 OCN 里**唯一**还停留在"自由文本 + 宽松启发式解析"的机读物件：
`acceptance-parser.ts` 跳过表格/围栏、并给无显式 id 的行**自动生成 id**。这与 OCN 自己的既有范式——
**Logic Backbone（0.3.0）/ Task Backbone（0.5.0）** 的"规范化机器块 + zod 校验 + 门禁硬拦 + JSON
投影"——脱节，构成一处潜在的 false-completion 漏洞：AC 一旦写成表格/非规范形态就**静默不登记**，
build-plan 的 `traces` 无从绑定真实 AC，纪律形同虚设，而门禁却可能绿灯通过。dogfood 里正是这个盲区
逼出了"把 traces 就近映射到漏网 AC id"以过门的绕行。

## 决议｜Decision（把 AC 拉齐到 Backbone 范式）

`docs/03` 新增机器可解析章节 `## Acceptance Specs｜验收规格`，一 AC 一块：

```
### AC-<DOMAIN>-<n>
- desc: <一句话验收文本，必填>
- priority: P0            # 可选
- given / when / then     # 可选 Given/When/Then
- trace: FR-1, NFR-2      # 可选，指向需求 id
```

- **门禁硬拦**：`step_acceptance_criteria` 在 section 门之后跑验收门；结构缺陷
  （`no_specs`/`duplicate_id`/`invalid_id`/`missing_field`）→ `ERR_ARTIFACT_INVALID`（exit 2）。
- **冻结投影**：通过后写 `.ocoding/acceptance-specs.json`（AC id 的唯一机读真源）。
- **规范由构造保证**：AC 写进表格/散文 = 不算定义 → 验收门空块即拦；build-plan `traces` 指向未定义
  AC → `dangling_trace` 拦。**"不许用表格"无需靠启发式判断表格**。
- **只碰 Path A**（Markdown AC id）；Path B（`ocn-readiness` 围栏块的 `scenarios:`，Readiness 子系统、
  独立命名空间）一行不动。

## 实现｜How（引擎向后兼容；下游靠适配器零改动）

- 类型：`src/types/acceptance-spec.ts`（zod `AcceptanceSpec` / `AcceptanceProjection`，`.strict()`）。
- 核心（纯函数，镜像 Task Backbone 各站点）：`src/core/acceptance/` 下 `acceptance-spec-parser.ts`
  / `acceptance-validator.ts`（双语 `describeAcceptanceDefect`）/ `acceptance-gate.ts`
  （`evaluateAcceptanceSpecs`）/ `acceptance-spec-store.ts`（原子写 + 防御读；`Paths.acceptanceSpecsFile`）。
- 门层：`gate-runner.ts` 新增门禁块，`step_acceptance_criteria && section_acceptance_specs` 守卫；
  缺陷 `ERR_ARTIFACT_INVALID`，通过写投影（写失败 `ERR_IO_OR_CONFIG`，reason `acceptance_specs_write_failed`）。
- 消费者迁移：`acceptance-loader.ts` 改**投影优先、markdown 回退**——投影存在则映射为现有
  `AcceptanceCriterion`（`text = desc` + G/W/T），于是 evidence-map / verify-status / next-prompt /
  verdict / render **全部零改动**；无投影（<0.8.0 pin 或门未过）→ 旧 `parseAcceptanceCriteria`。
  `task-gate.ts readAcIds` 同样投影优先。
- profile：新建 `src/sops/default-ai-coding-sop/0.8.0/`（继承 0.7.0，仅给 `step_acceptance_criteria`
  追加 `section_acceptance_specs`，镜像 0.5.0 加 `section_task_specs` 的写法）；`loader.ts` 注册 +
  默认翻 0.8.0；`package.json` → `0.8.0-beta.0`（npm/SOP 锁步，DEC-039）。
- 模板：`acceptance-criteria.ts` 增注释化规范块；`ocn brief` 增验收规格 summary。

## 验收｜Acceptance（已验证）

- 单元：`acceptance-spec-parser` / `acceptance-validator` / `acceptance-spec-store`（结构缺陷、
  id 归一、去重、fence/comment 排除、原子读写）；`acceptance-gate`（0.8.0 项目：空块/重复/缺 desc/
  非法 id 各自 `ERR_ARTIFACT_INVALID`；通过冻结投影）；`acceptance-projection-source`（投影优先映射、
  markdown 回退、build-plan traces 仅凭投影解析）。
- 迁移：`sop-upgrade` 加 0.7.0→0.8.0（section 落在已过的 SPEC 步、游标 + config.yaml 保留）。
- e2e：`acceptance-backbone-walkthrough`（**默认 0.8.0、干净 init、真 gate**）——模板空块拦 `no_specs`
  → 补真 AC 块 → 过门冻结投影。**填补了此前全部 e2e 钉 0.3.0 的盲区。**
- 全量 1327 测试 + lint + typecheck 绿；<0.8.0 pin 行为逐字不变（走 markdown 回退）。

SOP 0.8.0 additive backbone（沿 Logic=0.3.0 / Task=0.5.0 先例，新 backbone = SOP minor bump）；
MCP 白名单 7 工具不变。
