# Acceptance Backbone Proposal｜验收主干设计

> Status: implemented (AM-015 / DEC-041, SOP 0.8.0) · 2026-07-02

## 1. 问题｜Problem

验收标准（`docs/03-acceptance-criteria.md`）是 OCN 里唯一还停留在"自由文本 + 宽松启发式解析"的机读物件。
`acceptance-parser.ts` 只从标题 / 列表 / 行首识别 AC id、每行只取行首第一个、**跳过表格与代码围栏**，
并给无显式 id 的行**自动生成 id**。后果：

- AC 一旦写进 Markdown 表格（AC 目录最常见的写法），**一条都不登记**、且不发任何警告。
- build-plan 的 `traces` 用这个残缺集校验 → 大量 AC 无法被绑定 → 逼出"就近映射 traces 以过门"的绕行。
- 这与 OCN 自己的 **Logic Backbone（0.3.0）/ Task Backbone（0.5.0）** 范式脱节——那两者都是
  "规范化机器块 + zod 校验 + 门禁硬拦（`ERR_ARTIFACT_INVALID`）+ `.ocoding/*.json` 投影"。

AC 是这套范式里缺的最后一块。**警告不是解**（把返工推回给人）；根因修复是把 AC 规范化。

## 2. 语法｜Grammar

`docs/03` 新增机器块，一 AC 一块：

```markdown
## Acceptance Specs｜验收规格
### AC-INIT-001
- desc: minimal 初始化后 .ocoding/ 落盘，state.json 处于 state_discovery   # 必填
- priority: P0            # 可选
- given: 空目录           # 可选 Given/When/Then
- when: 执行 ocn init
- then: .ocoding/state.json 存在且 currentStateId = state_discovery
- trace: FR-INIT         # 可选，指向需求 id
```

- 块 id = AC id 本身（`### AC-<DOMAIN>-<n>`，复用 `AC_ID_RE`，解析时归一）。
- HTML 注释 / 代码围栏内的块不登记（示例，非定义）。
- 表格 / 散文里的 AC **不算定义**——只 `### AC-…` 块登记为可寻址 AC id。

## 3. 缺陷分类｜Defect taxonomy（结构性，门禁硬拦）

| code | 触发 |
|---|---|
| `no_specs` | 无 `## Acceptance Specs` 章节，或章节内零块 |
| `duplicate_id` | 归一后 id 重复（保留首个） |
| `invalid_id` | 块标题不匹配 `AC-<DOMAIN>-<n>` |
| `missing_field` | 缺 `desc` |

任一缺陷 → `ERR_ARTIFACT_INVALID`（exit 2），门禁双语列出。

## 4. 投影｜Projection

通过后冻结 `.ocoding/acceptance-specs.json`：

```json
{ "version": 1, "generatedAt": "…Z", "specsHash": "<sha256>", "items": [ { "id": "AC-INIT-001", "desc": "…", "trace": [] } ] }
```

是 AC id 的**唯一机读真源**；build-plan `traces` 与 evidence-map 都读它。

## 5. 门禁接线｜Gate wiring

`gate-runner.ts` 在 section 门之后、logic/task/readiness 门之前，对
`step_acceptance_criteria && section_acceptance_specs` 跑 `evaluateAcceptanceSpecs`：缺陷阻断，
通过写投影（写失败 `ERR_IO_OR_CONFIG`）。镜像 logic-backbone / task 门的结构。

## 6. 消费者迁移｜Consumer migration（一个适配器，下游零改动）

`docs/03` 有两条互不相干的路径：**Path A**（Markdown AC id：task-gate `readAcIds`、evidence-map、
verify-status、next-prompt、verdict、render）与 **Path B**（`ocn-readiness` 围栏块 `scenarios:`——
Readiness 子系统，独立命名空间）。**本 backbone 只接管 Path A。**

`acceptance-loader.ts` 改**投影优先、markdown 回退**：投影存在 → 映射为现有 `AcceptanceCriterion`
（`text = desc` + 拼接 G/W/T），于是全部 Path A 下游**无需改动**（只换数据源）；无投影（<0.8.0 pin，或
门未过）→ 旧 `parseAcceptanceCriteria`。`task-gate.readAcIds` 同样投影优先。

## 7. SOP 版本｜Versioning

新 backbone = SOP minor bump（沿 Logic=0.3.0 / Task=0.5.0）。`0.8.0/` 继承 `0.7.0/`，仅给
`step_acceptance_criteria` 追加 `section_acceptance_specs`（镜像 0.5.0 加 `section_task_specs`）。
`loader.ts` 注册 + 默认翻 0.8.0；`package.json` 锁步 `0.8.0-beta.0`。`ocn sop upgrade` 把新 section
落在已过的 SPEC 步（游标 + config.yaml 保留）。

## 8. 向后兼容｜Back-compat

<0.8.0 pin 的项目：无 `section_acceptance_specs` 要求 → 验收门不激活；无投影 → loader/readAcIds 走
markdown 回退。行为逐字不变。旧 `parseAcceptanceCriteria` 保留。

## 9. 测试｜Tests

单元（parser/validator/store/gate/projection-source）+ 迁移（sop-upgrade 0.7.0→0.8.0）+ 默认 0.8.0
从零 e2e（walkthrough：模板空块拦 → 补真 AC 块 → 冻结投影）。全量 1327 绿。

## 10. 明确不做｜Out of scope

Path B（Readiness scenarios）不碰；不删旧 parser；不改 MCP 工具集（仍 7）、coverage 语义（counts+enum）、
evidence-map 文本启发式（靠投影 desc 供文本）。
