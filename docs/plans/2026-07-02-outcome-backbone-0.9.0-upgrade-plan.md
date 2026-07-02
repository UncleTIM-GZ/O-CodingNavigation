# SOP 0.9.0 — Outcome Backbone Upgrade Plan｜效果主干升级实施规划

> Doc-only planning artifact. No source / tests / package / workflow / npm change is performed by this PR.
> Companion proposal: [`docs/outcome-backbone-proposal.md`](../outcome-backbone-proposal.md)（设计动机、分支裁决、FFF 案例对照）。
> 实现排期：0.8.0 dogfood 之后启动（proposal §10 裁决 1）；第一个 dogfood 对象是 OCN 自己。
> 编号预留：AM-016 / DEC-042（以实施时仓库实际下一号为准）。

---

## 0. Deepen 增强摘要｜Enhancement Summary

> Deepened on 2026-07-02 · 6 个并行评审子代理（architecture / data-integrity / typescript / security / spec-flow / simplicity）· 全部针对本计划 + proposal + 实际被镜像的模块（task 主干、contract-gate-step、state-store、authorization）落地验证。详见 §12。

**必须在动工前修正的设计洞（CRITICAL，改变实现契约）：**

1. **完整性锚点是 audit JSONL 交叉核对，不是命令哈希/自校验和**（data-integrity）。台账不是任何可重新推导的源的投影，冻结命令哈希只覆盖命令字段；verdict/value/history 都可伪造。self-checksum 在无信任根下可被重算。真正的"伪造必留痕"来自：每次 `outcome_measured` 审计事件记录 value + 证据快照哈希，gate 用永不归档的 audit 台账反查 ledger。§3.3 的 AC-9 承诺据此重写。
2. **投影 writer 目前 pin-blind，无条件出 v2 会破坏 0.8.0 逐字节不变承诺**（architecture C1）。`buildAcceptanceProjection`/`evaluateAcceptanceSpecs` 不带 profile 版本参数。必须二选一并写进 P1：(a) 把 pin 版本贯穿到 writer，<0.9.0 出 v1；或 (b) 把"逐字节不变"重定义为仅覆盖 markdown/gate 行为，显式豁免投影 JSON。
3. **SHIP 状态门必须走 cross-cutting 接线（照 `contract-gate-step.ts`），不能走 inline（照 acceptance）**（architecture C2）。`step_release` 无 required artifact → runGate 命中 null-artifact 提前返回分支，在所有 inline 门之前 auto-pass `not_applicable`。只有 `contractDriftOrNull` 在两个分支都跑。SHIP 门若做成 inline 块会静默放行零 outcome 强制。
4. **`cycle new` 必须把 live verdict 重置为 UNMEASURED**（spec-flow Q2 + architecture M3）。当前"带台账快照进下一轮" + `verdict=取最新` 自相矛盾：第一轮 MEASURED_PASS 会让第二轮改动过的系统在 SHIP 门拿旧绿灯发布——恰是本主干要杀的第六类假完成跨轮泄漏。归档到 `.ocoding/cycles/<n>/`，冻结契约保留，live verdict 归零。
5. **`--dec` 引用必须机器校验，否则复刻 `dangling_trace` 类**（spec-flow Q3/Q4）。豁免与 FAIL→SHIP 覆盖当前只存一个 DEC id、从不校验其存在 / 是否指向该 ac-id。创建时 + 每次 gate 都要校验（照 readiness waive-with-probe 复验）；FAIL 覆盖需结构化引用 ac-id + 实测值（ledger 内 per-AC 确认），不是"存在某条 DEC"。
6. **outcome-only 项目与 Task 主干 `zero_tasks` 硬缺陷冲突**（spec-flow Q7）。纯测量/研究型项目（只有 outcome AC、无 build task）过不了 build-plan 门 → 永远到不了判 outcome 的 SHIP 边界。必须裁决：outcome AC 计作满足 task，或 ≥1 到期 outcome AC 时放宽 zero_tasks，或声明 out of scope。
7. **probe 数值必须强制有限**（security）。`JSON.parse('{"value":1e400}')` = `Infinity`，`Infinity >= 1` → 假 MEASURED_PASS。`z.number()` 不拒 ±Infinity。用 `z.number().finite()` + 显式 `Number.isFinite` 守卫，比较器前拒绝。
8. **"伪造必留痕"覆盖不到 probe 程序本身**（security + data-integrity）。证据快照只哈希 `measure.source` 数据文件；改 `scripts/probe.js` 直接 `console.log` 假值不留痕。修：freeze 时同时冻结+快照 probe 入口文件的内容哈希，或收窄 §3.7/PASS 文案为"仅检测声明证据源的篡改，不含 probe 程序"。

**建议采纳的关键设计（HIGH，见 §12.2–12.7）**：`kind` 用判别联合（非可选字段）+ 解析前归一化 `kind=build`；threshold 解析成 `{op,value}` + `never` 守卫穷尽比较器；probe tri-state 归一到闭合 `ProbeOutcome` 联合（exit 0 但 JSON 解析失败 = exec_error，非静默 PASS）；ledger 走 `state-store` 真 `withLock`+`.bak`（task/acceptance store 其实是无锁 temp+rename）；dual-write 定序（audit 先于 ledger rename）；probe-runner 进程组 kill + 符号链接跳过 + 有界解析；派发优先序落在 assembler 且 BUILD 期避免 livelock；runner 用判别 step fn + 派发注册表收敛已 6× 重复的 evaluate→block→persist。

**两处触及产品负责人既定裁决、需确认的范围决定（见 §12.8）**：
- **建议采纳**：删掉 `ocn outcome freeze` 命令——Task 主干无 `task freeze`，冻结是验收门通过的副作用；两条冻结路径合一更忠于所镜像的先例。影响 §3.4 与 AC-3/AC-10 文案。
- **建议保留（不采纳 simplicity 的"推迟"）**：REFLECT 引用核对门是 proposal §13 对 FFF 根因"方法论零实证"的直接回应，属主干闭合核心，保留在 0.9.0；但可把 verdict 由四态存储改为**三存一算**（UNMEASURED 由缺行计算），顺带消解 proposal §10 裁决 3（三态+UNMEASURED）与 §5（四态）的文档矛盾。

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

## 11. Implementation map｜实现映射（2026-07-02 codebase 已验证）

> 由代码勘察确认，计划引用的路径全部命中现状；本节把"改哪个文件、复用哪个模式、注意哪条硬约束"钉死，供 `/workflows:work` 直接消费。

### 11.1 复用锚点（已存在，勿重造）

| 计划所需能力 | 现状实现（复用） | 路径 |
|---|---|---|
| 冻结命令哈希（R4） | `verifyHashOf(command)` = sha256(trimmed command) | `src/core/task/task-ledger-store.ts` |
| probe 式执行器范式 | `executeVerify` — `/bin/sh -c`、exit-0-only、honest null on timeout、`durationMs` | `src/core/task/task-verify-exec.ts` |
| 台账原子写范式 | `writeTaskLedger`/`buildLedger`（temp+rename，id/hash 不变才保留历史） | `src/core/task/task-ledger-store.ts` |
| 到期精确激活（AM-014） | `resolveAcceptanceSpecs` staleness + dueState 语义 | `src/core/acceptance/acceptance-source.ts` |
| 投影 store 范式 | `buildAcceptanceProjection`/`writeAcceptanceSpecs`（原子；projection v1） | `src/core/acceptance/acceptance-spec-store.ts` |
| 门运行器接入点 | 验收门 block 在 `gate-runner.ts:288-341`（step_acceptance_criteria） | `src/core/gate/gate-runner.ts` |
| 0.9.0 profile 继承种子 | `0.8.0/data.ts` 继承 0.7.0 全量、仅加 `section_acceptance_specs` | `src/sops/default-ai-coding-sop/0.8.0/data.ts` |
| 审计事件工厂 | `createAuditEvent`（ULID）+ `AuditEventType` zod enum | `src/core/audit/audit-event.ts` · `src/types/audit.ts` |
| auto 授权/断路器 | `authorizeAiTaskCheck`/`phaseOfState`/circuit-breaker | `src/core/automation/*` |

### 11.2 P1–P4 精确落点（覆盖计划 §5 的文件列）

- **P1 类型/解析**：`src/types/acceptance-spec.ts`(49行) 加 `kind`+`measure.*` 可选字段并把 `AcceptanceProjection.version` 从 `literal(1)` 升到可辨识联合（v1 读兼容）；`acceptance-spec-parser.ts`(194行) 加 measure 字段解析 + 六算符校验；`acceptance-validator.ts`(32行) 加三个缺陷码文案；`acceptance-spec-store.ts`(61行) 加 v2 投影构造。均有充足行数余量。
- **P2 台账/命令组**：新建 `src/core/outcome/{outcome-ledger-store.ts, probe-runner.ts}` + `src/types/outcome-ledger.ts`（照 task 三件套镜像）；新建 `src/cli/commands/outcome.ts`（check/list/freeze/waive 四子命令，参照 `task.ts`55行 与 `verdict.ts`86行 结构）；冻结逻辑挂在验收门通过分支。
- **P3 门禁/驱动**：BUILD 任务派发改造走 `src/core/execution-navigator/next-prompt-task-dispatch.ts`(64行) 与 `next-prompt.ts`(161行)；advance 阻塞逻辑走 `src/core/advance/advance-state.ts`(208行) + 新增一个 `outcome-ledger-guard.ts`（照 `task-ledger-guard.ts`58行 范式，勿把逻辑塞进 advance-state）。
- **P4 profile/发布**：新建 `src/sops/default-ai-coding-sop/0.9.0/`（照 0.8.0/ 的 data/sop/gates/readiness/artifacts/config/render 七件套），loader 注册 + 默认翻 0.9.0；SHIP/REFLECT 各加 1 步。

### 11.3 硬约束警报（CLAUDE.md §8：文件 ≤300 行）

- 🔴 `src/core/gate/gate-runner.ts` **已 482 行（超限）**：outcome 冻结/校验**不得**再往里加 block，必须抽出 `src/core/outcome/outcome-gate.ts`（照 `acceptance-gate.ts`56行 的 PURE outcome 模式），runner 只做一行调用 + 持久化。
- 🔴 `src/core/brief.ts` **283 行**：新增"现实接触指标"会破 300，必须把 outcome 摘要抽成独立 `brief-outcome-section.ts` 再组合。
- 🟡 near-limit 需留意：`task-check.ts`(273)、`next-prompt-sections.ts`(251)、`task-spec-parser.ts`(224)、`advance-state.ts`(208)——涉及处优先新建同级文件，勿就地膨胀。

### 11.4 审计/接口增量确认

- 新 push 事件加入 `src/types/audit.ts` 的 `AuditEventType` enum：`outcome_measured` / `outcome_contract_frozen` / `outcome_waived`（单 type + result 语义，沿 rewind/cycle 先例）。验收门当前复用 `artifact_gate_*`——outcome 走**专属**事件，勿复用。
- 投影/台账路径登记进 `src/core/paths.ts`（现 `Paths.acceptanceSpecsFile` 在 line 28 旁）：新增 `Paths.outcomeLedgerFile = .ocoding/outcome-ledger.json`。
- **AM-011 现状**：源码中**无** `AM-011` 具名模块，自动审查子代理是文本层约定（governance-text + `/ocn-next` 模板）。派发优先序改动后，必须同步 `src/core/automation/governance-text.ts`(98行) 与 next-prompt 模板文案（计划 §10 风险 2 已列）。
- MCP 白名单：`outcome check` 与 `task check` 同级（状态改变类，仅 CLI）——**不进** 7 工具白名单，保留测试钉死断言。

## 12. Deepen 评审综合｜Review synthesis（2026-07-02，6 子代理）

> 本节把六路评审的可执行结论按主题固化，每条标注来源与目标文件。CRITICAL 已进 §0；此处给实现细节。

### 12.1 完整性模型重写（data-integrity CRITICAL / security M）

- **锚点=审计台账，非自校验和**：新 `outcome_measured` 事件必须携带 `value` + `evidenceSnapshotHash` + `commandHash`。每次 gate 运行 `outcome-ledger-guard` 反查：ledger 最新条目的 value/verdict 必须与最后一条对应 `outcome_measured` 审计事件一致。分歧即拒绝（AC-9 重定义为"ledger 与 audit 台账不符 → refuse"）。伪造需同时改 ledger 与永不归档的 audit JSONL。
- **dual-write 定序**：`ocn outcome check` 先 append 审计事件，再 rename ledger。反查容忍"ledger 落后 audit 一步"（可恢复方向），把"ledger 领先 audit"判为篡改。崩溃恢复语义写进 store 单测。
- **真锁 + 备份**：ledger 走 `src/core/state/state-store.ts` 的 `withLock`（5s 超时）+ `.bak`，**不要**照抄无锁的 `task-ledger-store`/`acceptance-spec-store`（二者只有 temp+rename）。理由：`outcome check` 是 phase2 可委托 → 并发/快速连调真实存在 → lost-update 风险高于 task/acceptance。
- **append-only 是不变量不是愿望**：每写校验 `history.length` 单调不减 + 每条链入前条哈希（prev-entry hash chain），截断即可检测；再与 audit 事件计数交叉核对。
- **latest 取数组末元素，不取 `max(timestamp)`**：防未来日期条目插队。

### 12.2 类型设计（typescript review，全部建议采纳）

- `AcceptanceSpec` 改为 `z.discriminatedUnion("kind", [BuildSpec, OutcomeSpec])`；`OutcomeSpec` 必带 `measure: MeasureContract`。解析器在 `.parse()` **前**把缺 `kind` 的块归一化为 `kind:"build"`（判别量不可靠地 default），逐字节不变由此成为解析器职责、单测可证。`measure.*` 用 `min(1)` 让 `missing_measure_field` 从 ZodError 落出。
- Threshold：`ThresholdOp = z.enum([">=","<=",">","<","==","!="])` + `{op, value:number}`；比较器 `switch` 带 `const _e: never = op` 穷尽守卫；**解析器按最长算符优先**匹配（`>=`/`<=`/`==`/`!=` 先于 `>`/`<`），否则 `">= 1"` 会误解析成 `>` + `"= 1"`。`==` 保持精确浮点相等（契约如此，勿加 epsilon——那是被禁的内容判断），加一行注释。
- 投影 `version` 判别联合（v1 literal 1 / v2 literal 2）；**v1 schema 冻结不得就地加宽**（0.8.0 盘上文件必须 v2 binary 下仍 v1 解析）；`acceptance-loader` 适配器 `switch(version)` 带 `never` 守卫。
- Probe 归一到闭合 `ProbeOutcome = measured{metric,value} | no_evidence | exec_error{detail}`：**exit 0 但末行 JSON 解析失败 = exec_error，不得静默当 measured**（否则就是它要杀的假完成）；`exec_error` 不写 verdict、返回 `ERR_IO_OR_CONFIG`(4)。`20` 必须 `=== 20`。`verdictFor` 只产 后三态。
- `UNMEASURED` 是"无 ledger 行"的计算态，不作存储 enum 值（存 `{NO_EVIDENCE, MEASURED_PASS, MEASURED_FAIL}`）——同时消解 三态/四态 文档矛盾（simplicity #4）。
- 唯一 `any` 危险点=probe stdout：`ProbeReading = z.object({metric:z.string().min(1), value:z.number().finite()}).strict()`，**禁用 `z.coerce`**（字符串数字必须判 exec_error）；`JSON.parse` try/catch，失败→exec_error 不抛。ledger/acceptance 读盘的完整性校验就是 zod parse 本身，勿旁挂 `as` 松校验。

### 12.3 probe-runner 加固（security，新文件 `src/core/outcome/probe-runner.ts`）

- **进程组 kill**：`spawn(..., {detached:true})`，超时 `process.kill(-child.pid, 'SIGKILL')`，SIGTERM→SIGKILL 有宽限窗（Node 不自动升级）。probe 跑"现实"负载易留孤儿进程树。
- **符号链接 + 越界**：快照前对每个匹配文件 `lstat` 跳过 symlink（或用 `project-root.ts` 的 `assertResolvedPathInsideRoot` 校验 realpath 仍在 root 内），每文件哈希前设大小上限。防读/哈希 root 外文件（`-> ~/.ssh/id_rsa` / `-> /dev/zero` DoS）。
- **有界解析**：`maxBuffer` 显式设 1MB（照 `task-verify-exec.ts`，勿依赖平台默认）；末行长度上限（如 >64KB 拒绝）再 `JSON.parse`。
- **原型污染安全**：只显式读 `metric`/`value`，绝不 `{...parsed}` 展开进 ledger；zod 对象无 passthrough。
- **timeout 上限**：`measure.timeout` 校验为正有限整数且 ≤600s。
- **env 说明**：probe 继承 `process.env`（含本仓 `.env` 的 `NPM_token`）；因 `outcome check` 可 AI 委托，在 amendment 显式记录，考虑文档化/可选清洗敏感变量。
- 保持 probe-runner 为**纯执行器**；threshold 比较器与证据快照各自独立小文件（≤300 行）。

### 12.4 状态机 & 迁移（architecture H1/M2/M3，spec-flow Q1）

- **升级态终点移动测试**（区别于冻结 pin）：`nextStep(step_final_build_verdict)` 由 null→`step_release`。停在旧终点的项目升级后 `ocn advance` 会续进 SHIP。加迁移测试：0.8.0 停 `step_final_build_verdict` → upgrade → advance 进 `step_release`，且 SPEC 级 outcome 要求按 AM-014 `dueState` **精确激活**不追溯炸已过 SPEC。比 AM-015 加节先例重（是跨终点的状态扩展）。
- **due-already-passed 规则**：`dueState(rule) < currentState` 于升级后首次激活时 **clamp 到下一可达边界**（下关强制，不追溯 explode），一次性迁移提示；进迁移测试矩阵。
- **phaseOfState 天然把 SHIP/REFLECT 锁成 human-only**（`PHASE2_STATES={build,verify}`）——是真实缓解，写明。推论：outcome 必须在 **VERIFY 内测量**，VERIFY→SHIP 边界门强制；SHIP 相位不可委托测量。P2 需**新** `authorizeAiOutcomeCheck`（平行 `authorizeAiTaskCheck`，非复用）。
- **硬编码终点文案迁移**：`advance-state.ts:143-146` 的 `no_next_step` 拒绝文案与 cycle/rewind signpost 钉死在旧终点，须移动；相关"终点在 VERIFY"断言的测试同步改。

### 12.5 门运行器分解（architecture H2，硬约束）

- `gate-runner.ts` 已 482 行且含 3 份近同 evaluate→block→persist（acceptance/logic/task）；outcome 再加最多 3 个门点（SPEC 存在-或-豁免 / SHIP 状态 / REFLECT 引用核对）。单抽 `outcome-gate.ts` 不够。
- 每个 outcome 门做成**判别-kind step fn**（`{kind: skip|pass|io_error|blocked}`，照 `runContractDriftStep`），runner 真正一调一行；并引入小型 **step-gate 派发表/注册表**把 6× 重复迁上去——收缩 runner 而非长出第 5/6 份拷贝。
- SHIP 门走 §0-C2 的 cross-cutting 接线（null-artifact 分支内也要调用）。

### 12.6 派发与驱动（architecture M1，spec-flow Q6）

- outcome 派发优先序落在 `next-prompt-assemble.ts`/`next-prompt-sections.ts`（后者 251 行，近上限）**之上新增独立 sibling 模块**，勿塞进 `next-prompt-task-dispatch.ts`（其 `state_build` 短路，而 outcome 从 VERIFY 起可测、非 BUILD 限定）。
- **BUILD 期防 livelock**（早 `due` 场景）：outcome AC 仅在 build ledger 清空时 / BUILD 之外 才盖过 build task；`NO_EVIDENCE` 的 outcome 在其 trace 闭包内降到 pending build task 之下。扁平优先序需 BUILD 相位 carve-out。
- 同步 `governance-text.ts`(98) + `/ocn-next` 模板（§10 风险 2）。

### 12.7 流程边界补全（spec-flow HIGH/MEDIUM）

- **REFLECT 多历史条目**：规范"canonical = 当前轮最新条目"；引用值须标注 measurement/round 并匹配该具体条目，拒绝引用当前轮 history 之外的值（防用旧 PASS 洗当前 FAIL）。AC-8 据此细化。
- **永久 NO_EVIDENCE 的 per-AC 逃生**：证据永不出现的单条 outcome（pivot 作废）需 per-AC human-only 降级/waive（带 `--dec`，复用 §0-5 的 DEC 校验），不必弃整个 outcome 门；否则部分复刻 0.95 死结。
- **waiver × outcome 共存**：声明互斥；两者同现时 gate 以双语消息 block。
- **post-SPEC 注入 outcome AC**：`acceptance-specs.json` 于 SPEC 门冻结；升级项目在 VERIFY→SHIP 边界被要求"加 ≥1 outcome AC 或豁免"时须 `rewind --to step_acceptance_criteria` 重投影，或定义显式 re-projection 触发；否则新 AC 对冻结投影不可见。
- **零匹配 glob**：`measure.source` 匹配 0 文件而 probe exit 0 → 引擎强制 coerce 为 `NO_EVIDENCE`（或 contract-invalid），绝不空快照 PASS。
- **re-freeze × history**：re-freeze 开启**新 history 段**（标注新命令哈希）；REFLECT 匹配器与 cycle carry 只看当前哈希段，防跨不兼容 probe 版本比对。

### 12.8 范围决定（simplicity，触及既定裁决 → 见 §0 末）

- **采纳：删 `ocn outcome freeze`**。冻结改为验收门通过的副作用（命令哈希入台账，R4），契约变更=改 `docs/03` + 重跑验收门 + 漂移拒绝，完全对齐 Task 主干（无 `task freeze`）。删掉 1 子命令 + `outcome_contract_frozen` 事件 + 1 人类硬区 + 相应测试面，零能力损失。AC-3/AC-10 相应改为"改 command → 哈希漂移 → 验收门重跑时人类重新确认"。命令组降为 `check/list/waive` 三命令。
- **保留：REFLECT 引用核对门**（不采纳"推迟到 1.0"）——它是对 FFF 根因"方法论零实证/防编造复盘"的直接机制回应，属主干闭合核心。
- **采纳：verdict 三存一算**（§12.2）+ **证据快照收成单内容哈希、去掉 size/mtime**（mtime 唯一消费者是已推迟到 1.0 的 freshness，且 `git checkout`/`clone` 会误翻，data-integrity 亦主张去除）+ **brief 仪表只显 verdict 计数、去掉"距上次测量天数"**（同属推迟到 1.0 的 freshness 信号）。
- 明确**不动**（load-bearing，勿因简化误删）：SPEC 级"≥1 outcome AC 或豁免"、`waive` 命令、NO_EVIDENCE 与 MEASURED_FAIL 的严格区分、独立 `outcome-ledger.json`。

### 12.9 验收标准增量（并入 §6）

- AC-9 重写为"ledger 与 audit 台账不符 → refuse"（非"self-checksum 失败"）。
- 新 AC：probe 输出 `Infinity`/`NaN`/`1e400` → exec_error（不写 verdict、非 PASS）。
- 新 AC：exit 0 但末行非 `{metric,value}` JSON → exec_error（非静默 PASS）。
- 新 AC：`cycle new` 后第二轮 outcome AC 起始 verdict = UNMEASURED（不带旧绿灯）。
- 新 AC：`--dec` 指向不存在/后被删的 DEC → gate 时豁免失效并 block。
- 新 AC：outcome-only（零 build task）项目能走到 SHIP（zero_tasks 冲突已裁决）。
- 新 AC：0.8.0 pin 项目在 0.9.0 binary 下重跑验收门 → 投影仍 v1、逐字节不变。
