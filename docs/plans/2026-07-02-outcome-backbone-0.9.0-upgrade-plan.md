# SOP 0.9.0 — Outcome Backbone Upgrade Plan｜效果主干升级实施规划

> Doc-only planning artifact. No source / tests / package / workflow / npm change is performed by this PR.
> Companion proposal: [`docs/outcome-backbone-proposal.md`](../outcome-backbone-proposal.md)（设计动机、分支裁决、FFF 案例对照）。
> 实现排期：0.8.0 dogfood 之后启动（proposal §10 裁决 1）；第一个 dogfood 对象是 OCN 自己。
> 编号预留：AM-016 / DEC-042（以实施时仓库实际下一号为准）。

---

## 1. Goal｜目标

**Upgrade OCN from a process controller into an outcome controller.**

把 OCN 的假完成分类学从过程轴五层（章节 / 逻辑 / 就绪 / 任务 / 验收）扩展到效果轴，闭合第六类假完成——**过程完备式假完成**（零偏移、全合规、所有门全绿，但系统从未接触能证明目标的现实）。升级后：

- 现实结果型 AC 成为一等公民（`kind: outcome` + 机器可验的测量契约），不再被降级为过程代理或搁置为文档孤儿；
- 判定接通驱动：到期未测/失败的 outcome AC 会重定向 `ocn next-prompt` 的派发，AI 的默认下一步被路由到测量路径；
- SHIP / REFLECT 两个 stub 以**现实接触证据**（效果台账）为判定对象落地，OCN 的管辖权首次越过现实边界；
- AI 幻觉在效果层被机制性排除：口头断言永不登记，只有冻结 probe 的输出能写台账。

OCN 仍然**不做**效果好坏的内容评判（LLM judge 宪法禁区）：指标选择与阈值设定 human-only（永久边界），OCN 只控制测量的**结构与执行**。

## 2. Scope & non-goals｜范围与非目标

**范围**：验收主干加性扩展（kind + measure 契约）、效果台账、`ocn outcome` 命令组、三级驱动闭环、SHIP/REFLECT 最小接线（各 1 步）、SOP 0.9.0 profile + 默认翻转 + 迁移、npm lockstep 发布。

**非目标**（proposal §12，防机制增殖）：

- 不做指标推荐 / 指标合理性检查（内容判断，human-only，永久边界）；
- 不做合成"健康度/效果评分"（启发式 + 新 Goodhart 目标）；
- 不做定时调度 / 守护进程（测量由派发驱动，运维归用户项目）；
- 不做复杂遥测（brief 指标只读已有 audit JSONL + 台账）；
- 不动 MCP 白名单（仍 7 工具，测试钉死）；
- STALE / `measure.window` 新鲜度语义留 1.0（裁决 3）；
- **0.9.0 后冻结新 backbone**：除非发现新的正交轴，不再开新机制层。

## 3. Design spec｜设计规格（实现基准）

### 3.1 AC 块语法（0.8.0 加性扩展）

```markdown
### AC-CORE-3
- desc: 新用户可在 30 分钟内完成 init→SPEC→第一份 artifact
- kind: outcome                                        # 可选，缺省 build（既有项目逐字节不变）
- measure.command: node scripts/probe-onboarding.js    # outcome 必填；冻结哈希（复用任务主干 R4）
- measure.threshold: ">= 1"                            # outcome 必填；单比较：>= <= > < == !=（裁决 2）
- measure.source: case-records/onboarding/*.json       # outcome 必填；证据来源，人类冻结时确认
- measure.due: state_ship                              # 可选，缺省 state_ship；AM-014 精确激活语义
- measure.timeout: 60                                  # 可选，秒，缺省 60
```

新缺陷码（`ERR_ARTIFACT_INVALID`，exit 2）：`missing_measure_field` / `invalid_threshold` / `invalid_due`。

### 3.2 Probe 契约

确定性命令；最后一行输出 `{"metric": "<name>", "value": <number>}`；exit 三态：
`0` = 测量成功（engine 做阈值机械比较）；`20` = **NO_EVIDENCE**（证据尚不存在，与失败严格区分）；
其他 = 测量执行错误（归 `ERR_IO_OR_CONFIG` 类，不写 verdict）。超时按执行错误处理。

### 3.3 效果台账

`.ocoding/outcome-ledger.json`，engine 持锁独写（五步安全写）+ 完整性校验。
verdict 四态：`UNMEASURED / NO_EVIDENCE / MEASURED_PASS / MEASURED_FAIL`。
每次测量追加历史（value、时间戳、证据快照：`measure.source` 匹配文件的 内容哈希+大小+mtime），verdict 取最新。
**幻觉控制的根**：只有 `ocn outcome check` 运行冻结命令的输出能写台账；AI 断言永不登记；哈希漂移 → 拒绝执行。

### 3.4 命令组与权限

| 命令 | 模式 | 权限 |
|---|---|---|
| `ocn outcome check <ac-id>` | push（审计 `outcome_measured`） | phase2 auto mode 可委托（AM-011 审查子代理前置，`--rationale` 必填） |
| `ocn outcome list` | pull（无审计） | 任意 |
| `ocn outcome freeze <ac-id>` | push | **human-only 硬区**（契约首次冻结/变更） |
| `ocn outcome waive --dec <id> --reason …` | push | **human-only 硬区**；no-outcome 豁免，DEC 引用必填（裁决 4：豁免是业务决策，不进 config.yaml） |

### 3.5 判定→驱动三级闭环

| 级 | 机制 | 位置 |
|---|---|---|
| 仪表 | brief 增"现实接触指标"：台账摘要 + 距上次测量天数 | `ocn brief`（pull） |
| **派发** | **到期未测/失败 outcome AC > pending build task** | `ocn next-prompt` / `/ocn-next` |
| 门禁 | VERIFY→SHIP 阻塞到期 `UNMEASURED / NO_EVIDENCE`（exit 1 + fix_hint）；**`MEASURED_FAIL` 不阻塞**，强制人类决策点（cycle 带实测数字进下一轮，或 DEC 降级发布） | `ocn advance` |

只拦"未测量"不拦"测量失败"：OCN 卖纪律不卖成功；拦失败会复刻 FFF 的 0.95 门槛死结。

### 3.6 SHIP / REFLECT 落地（预先立法：判定对象是现实接触证据，不得退化为章节门）

- **SHIP（1 步）** `step_release`：门 = 台账状态门（全部 `MEASURED_*` 且 FAIL 项均有 DEC 记录）。
- **REFLECT（1 步）** `step_evolution_report`：门 = 闭环门——22-evolution-report 的"测量数字引用块"
  与台账机械核对（纯 JSON vs markdown 比对，无内容判断）；完成后指引 `ocn cycle new` 带台账快照进下一轮。

### 3.7 诚实边界（写入 PASS 消息）

本地文件系统无信任根，OCN 不能密码学防伪造证据；OCN 做到"伪造必留痕"（证据快照 + 审计）。
PASS 消息声明："本判定不担保证据来源真实性，来源由人类冻结时确认。"

## 4. Target state graph delta｜目标状态图增量

```
state_verify（现有终点 step_final_build_verdict 之后）
  └─► state_ship
        └─ step_release              → 门 = outcome-ledger 状态门（非章节门）
  └─► state_reflect
        └─ step_evolution_report     → docs/22-evolution-report.md + 引用核对门
              └─ ocn cycle new（带台账快照）→ 下一轮 state_discovery
```

<0.9.0 pin 的项目：终点仍是 `step_final_build_verdict`，行为不变（迁移测试钉死）。

## 5. Phased execution｜分阶段执行（严格串行，每阶段独立分支 + 全量 pre-commit 门 + 单 PR ≤500 行）

### P1 — 类型与解析层（纯加性，零行为变化）

| 改动 | 文件 |
|---|---|
| zod：`kind` + `measure.*` 可选字段 | `src/types/acceptance-spec.ts` |
| 解析新字段；threshold 六算符单比较 | `src/core/acceptance/acceptance-spec-parser.ts` |
| 三个新缺陷码 | `src/core/acceptance/acceptance-validator.ts` |
| 投影 schema v1→v2（携带 kind/measure；旧投影读取兼容） | `src/core/acceptance/acceptance-spec-store.ts` |

**出口标准**：单测扩展全绿 + 回归断言"纯 build 文档的投影与门禁行为逐字节不变"。

### P2 — 效果台账 + outcome 命令组

| 改动 | 文件 |
|---|---|
| 台账 zod（四态 verdict、历史、证据快照、命令哈希） | `src/types/outcome-ledger.ts` |
| 台账存取（五步安全写 + 完整性校验） | `src/core/outcome/outcome-ledger-store.ts` |
| probe 执行器（spawn、末行 JSON、三态 exit、timeout、阈值比较、证据快照） | `src/core/outcome/probe-runner.ts` |
| 冻结：验收门通过时冻 command 哈希入台账（R4 模式） | 验收门扩展 |
| CLI 四命令 + render + 审计事件 | `src/cli/commands/outcome.ts` 等 |
| AM-009 接线：check 归 phase2；freeze/waive 进硬人类区 | automation 层 |

**出口标准**：哈希漂移拒绝、exit 20 → NO_EVIDENCE（非 FAIL）、ai_agent 调 freeze/waive 被技术性拒绝——全部有测试。

### P3 — 门禁与驱动接线

| 改动 | 位置 |
|---|---|
| SPEC 验收门追加：≥1 outcome AC 或台账中有效 no-outcome 豁免 | `gate-runner.ts` |
| advance：VERIFY→SHIP 阻塞逻辑 + MEASURED_FAIL 双语决策提示 | `advance-state` |
| 到期语义：due 之前 DEFERRED（复用 AM-014 dueState） | outcome 激活计算 |
| 派发优先序改造 | `next-prompt.ts` + execution-navigator dispatch |
| brief 现实接触指标 | `brief-generator.ts` |
| PASS 消息边界声明 | render 层 |

**出口标准**：四种 verdict × advance 组合、派发优先序、DEFERRED 不提前吵——门禁层测试全绿。

### P4 — SOP 0.9.0 + SHIP/REFLECT + 发布

| 改动 | 内容 |
|---|---|
| `src/sops/default-ai-coding-sop/0.9.0/` 继承 0.8.0；SHIP/REFLECT 各 1 步接线（§3.6） | profile |
| loader 注册 + 默认翻 0.9.0；0.8.0 冻结 + importable；`ocn sop upgrade` 迁移（新要求精确激活，不追溯炸已过的门） | DEC-029/AM-015 先例 |
| 从零默认 0.9.0 e2e：`outcome-backbone-walkthrough.test.ts`（DISCOVERY→REFLECT + MEASURED_FAIL→cycle 螺旋第二轮） | tests/e2e |
| amendment + DEC + CLAUDE.md §6 + README/onepager + proposal Status 翻 implemented | docs |
| npm `0.9.0-beta.0`（lockstep，latest+beta）+ GitHub release；MCP 白名单钉死断言确认仍 7 | release |

**出口标准**：sop-upgrade 迁移测试 + 全量绿 + 发布完成。

## 6. Acceptance criteria｜验收标准（Given-When-Then，转 e2e/门禁测试）

1. Given 0.8.0 项目升级 0.9.0，When 运行任何 gate，Then 既有 AC 全按 build 处理，行为逐字节不变。
2. Given outcome AC 缺 measure.command/threshold，When 验收门运行，Then `ERR_ARTIFACT_INVALID`(2) + 指出缺失字段。
3. Given 测量命令哈希漂移，When `ocn outcome check`，Then 拒绝执行并指引 human-only `ocn outcome freeze`。
4. Given probe exit 20，When check 完成，Then verdict=NO_EVIDENCE（非 FAIL），审计 `outcome_measured` result=no_evidence。
5. Given 存在到期 UNMEASURED outcome AC 且有 pending build task，When `ocn next-prompt`，Then 派发测量任务而非 build task。
6. Given MEASURED_FAIL，When `ocn advance`（非 SHIP 边界），Then 不阻塞但输出双语决策提示。
7. Given VERIFY→SHIP 且存在到期 NO_EVIDENCE，When advance，Then `ERR_GATE_FAILED`(1) + fix_hint 指向 probe。
8. Given evolution-report 引用值 ≠ 台账实测值，When REFLECT 门运行，Then blocked + 指出不一致的 ac id 与两个数值。
9. Given AI 直接编辑 outcome-ledger.json，When 下次任何 gate 运行，Then 台账完整性校验失败，指引重新测量。
10. Given ai_agent（OCN_ACTOR=ai_agent）调用 `outcome freeze` 或 `outcome waive`，When 命令执行，Then 技术性拒绝（硬人类区）。

## 7. Data & interface contracts｜数据与接口契约

- 新文件：`.ocoding/outcome-ledger.json`（engine 独写）；`acceptance-specs.json` 投影 v2。
- exit code 复用现有表：门禁失败=1，契约无效=2，IO/超时=4；probe 的 20 是 probe 侧约定，不进 ocn exit 表。
- 审计新 push 事件：`outcome_measured` / `outcome_contract_frozen` / `outcome_waived`（单 type + result 语义，沿 rewind/cycle 先例）。
- 迁移：`ocn sop upgrade` 照 DEC-029（保 config + 游标 + 产物）；npm/SOP lockstep（DEC-039）。
- MCP surface：不变（7 工具）。

## 8. Decided questions｜已裁决问题（2026-07-02，产品负责人）

1. 排期：proposal 先行，实现在 0.8.0 dogfood 之后；OCN 自身是第一个 dogfood 对象（outcome AC = beta 停止条件三条）。
2. threshold 只支持单比较六算符，不做区间。
3. STALE / measure.window 留 1.0；首版 verdict 四态。
4. no-outcome 豁免写 DEC 决策日志（CLI 侧 `--dec` 引用必填），不进 config.yaml。

## 9. Test strategy & commands｜测试策略与必跑命令

- 单元：measure 契约解析 / 非法 threshold / 台账完整性 / 三态 exit 映射 / 阈值比较器 / 引用核对器。
- 门禁层：SPEC 无 outcome 且无豁免 → blocked；VERIFY→SHIP 四种 verdict 组合；REFLECT 引用不一致。
- CLI 层：哈希漂移拒绝；auto mode 权限矩阵（check 可委托 / freeze・waive 拒绝）。
- 迁移：sop-upgrade 0.8.0→0.9.0（含"老 pin 终点不变"断言）。
- e2e：从零默认 0.9.0 `outcome-backbone-walkthrough.test.ts`（全程 + FAIL→cycle 螺旋）。
- 每阶段必跑：`npm run lint && npm run typecheck && npm run test`（§9 pre-commit 门）。

## 10. Risks｜风险

1. **状态机首次扩到 20 步之外**：`sop upgrade` 对"已到 VERIFY 末端的老项目"的游标语义必须在迁移测试里钉死（老 pin 终点仍是 `step_final_build_verdict`）。
2. **派发优先序改动波及 `/ocn-next` 模板**：AM-011 自动审查文案需同步更新，否则 auto mode 的审查子代理拿到过期指令。
3. **证据伪造是已声明边界而非已解决问题**：靠快照留痕 + human-only 冻结缓解；不得在文案中夸大担保范围。
