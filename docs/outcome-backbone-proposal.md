# Outcome Backbone Proposal｜效果主干设计

> Status: proposed · 2026-07-02 · 实现排期在 0.8.0 dogfood 之后（见 §10 裁决 1）
> 定位：把 OCN 从"过程控制器"升级为"效果结果控制器"——覆盖第六类假完成。

## 1. 问题｜Problem

OCN 已闭合的五类假完成（章节缺失 / 逻辑未接线 / 就绪未达 / 回执式完成 / 假追溯）全部在**过程内**。
FFF 失败案例（2026-07 复盘）证明存在正交方向的第六类：

**过程完备式假完成（process-complete completion）**——零偏移、全合规、所有门全绿，
但系统从未接触能证明目标的现实。成因是三个机制缺口：

- **Goodhart 漏斗**：现实结果型 AC（"准确率>55%""用户完成首次使用"）无法写成 exit-0 的冻结
  verify 命令 → 要么降级成过程代理（"回测脚本存在"），要么作为孤儿挂在文档里永不执行。
- **判定 ≠ 驱动**：gate 诚实判 FAIL 后，没有机制把精力路由到"让它变绿的唯一路径"；
  构建型工作每天出绿灯、现实型工作 30 天不出灯，反馈梯度决定精力系统性流向前者。
- **管辖终点在现实边界之前**：VERIFY 是章节门，SHIP/REFLECT 是 stub——恰是 FFF 的死亡地点。

**警告/仪表不是解**（FFF 自己的门诚实 FAIL 了 2.5 个月，温度计不退烧）；根因修复是把
"效果测量"纳入 可判定 + 可驱动 的范围。

## 2. 定位与原则｜Positioning

OCN **不做**"效果好坏的内容评判者"（= LLM judge，宪法禁区）；
OCN **做**"效果测量的结构与执行控制器"。判定链拆分：

| 环节 | 性质 | 归属 |
|---|---|---|
| 指标选择、阈值设定 | 内容/领域判断 | **human-only（永久边界）** |
| 测量是否被执行、产出数值、阈值比较 | 机械操作 | OCN 判（冻结命令 + 机器解析） |

这是任务主干"冻结命令决定完成"哲学向现实边界的延伸，不是新哲学。

## 3. 语法｜Grammar（验收主干的加性扩展，不新增第 7 层机制）

0.8.0 `### AC-<DOMAIN>-<n>` 块新增可选字段 `kind: build | outcome`（缺省 `build`，
既有项目行为逐字节不变）。`outcome` 类必须携带测量契约：

```markdown
### AC-CORE-3
- desc: 新用户可在 30 分钟内完成 init→SPEC→第一份 artifact
- kind: outcome
- measure.command: node scripts/probe-onboarding.js   # 冻结哈希（复用任务主干 R4）
- measure.threshold: ">= 1"                            # 单比较：>= <= > < == !=
- measure.source: case-records/onboarding/*.json       # 证据来源，人类冻结时确认
- measure.due: state_ship                              # 到期状态，缺省 state_ship
- measure.timeout: 60                                  # 可选，秒，缺省 60
```

SPEC 门新增要求：**≥1 条 outcome AC，或一条显式 no-outcome 豁免**（human-only，
**写入 DEC 决策日志，不进 config.yaml**——豁免是业务决策，不是部署配置；见 §10 裁决 4）。
纯库类项目由此可豁免，且豁免可审计、可证伪（对照就绪 waive 先例）。

## 4. 测量命令契约｜Probe contract

确定性命令；最后一行输出 `{"metric": "<name>", "value": <number>}`；exit 三态：

| exit | 含义 |
|---|---|
| `0` | 测量成功（value 有效，engine 做阈值比较） |
| `20` | **NO_EVIDENCE**——证据尚不存在（与"测量失败"严格区分） |
| 其他 | 测量执行错误（归 `ERR_IO_OR_CONFIG` 类，不写 verdict） |

## 5. 效果台账｜Outcome ledger

`.ocoding/outcome-ledger.json`，engine 持锁独写（五步安全写）。verdict 枚举：
`UNMEASURED / NO_EVIDENCE / MEASURED_PASS / MEASURED_FAIL`（STALE/新鲜度窗口留 1.0，见 §10 裁决 3）。
每次测量追加历史（含 value、时间戳、证据快照），verdict 取最新。

**幻觉控制的根**：只有 `ocn outcome check <ac-id>` 运行冻结命令的输出才能写台账——
AI 的任何口头断言（"准确率 62%"）永不登记。哈希漂移 → 拒绝执行，要求人类重新冻结。

## 6. 判定→驱动闭环｜Verdict → effort routing（本设计的灵魂）

三级驱动各守其位：

| 级 | 机制 | 位置 |
|---|---|---|
| 仪表 | brief 增"现实接触指标"：台账摘要 + 距上次测量天数（数据源=已有 audit 时间戳，零新增） | `ocn brief`（pull） |
| **派发** | **next-prompt 派发优先序：到期未测/失败的 outcome AC > pending build task**。AI 严格跟随派发——这是对 AI coding 最有效的杠杆 | `ocn next-prompt` / `/ocn-next` |
| 门禁 | VERIFY→SHIP 边界阻塞 `UNMEASURED / NO_EVIDENCE`（没测过不准发布，`ERR_GATE_FAILED`）；**`MEASURED_FAIL` 不阻塞任何 advance**，而是强制人类决策点：带实测数字 rewind/cycle 进下一轮，或 DEC 记录接受降级发布 | `ocn advance` |

只拦"未测量"不拦"测量失败"的理由：OCN 卖纪律不卖成功。"测过且诚实记录失败"是纪律达成；
拦失败会复刻 FFF 的 0.95 门槛死结（永远等不到就绪 → 弃用）。

到期语义复用 AM-014 精确激活：`measure.due` 之前 outcome AC 显示 DEFERRED，不阻塞不派发。

## 7. SHIP / REFLECT 落地｜Filling the stubs（一个设计填两个 stub）

- **SHIP 的门 = 台账状态门**：进入条件——无到期 `UNMEASURED/NO_EVIDENCE`；
  完成条件——全部 `MEASURED_*` 且 FAIL 项均有 DEC 决策记录。
- **REFLECT 的门 = 闭环门**：22-evolution-report 必须含"测量数字引用块"，解析器**机械核对**
  引用值与台账一致（防复盘编数字，纯 JSON vs markdown 比对，无内容判断）。
  REFLECT 后 `ocn cycle new` 携带台账快照进下一轮 → 测量→反思→新假设 的螺旋。

设计约束（预先立法）：SHIP/REFLECT 的判定对象是**现实接触证据**，不得退化为又两个章节门。

## 8. 权限与防伪边界｜Permissions & honesty boundary

- 测量契约**首次冻结/变更 = human-only**（同 readiness waive 级硬人类区）；
  **执行测量** = phase2 auto mode 可委托（AM-011 审查子代理照常前置，`--rationale` 必填）。
- **诚实边界（写入文档与 PASS 消息）**：本地文件系统无信任根，OCN 不能密码学防伪造证据。
  OCN 做到"伪造必留痕"：测量时对 `measure.source` 匹配文件写 内容哈希+大小+mtime 快照
  入台账与审计，事后可核对。PASS 消息声明"本判定不担保证据来源真实性，来源由人类冻结时确认"。
- MCP 白名单不动（`outcome check` 与 `task check` 同级：状态改变类，仅 CLI；7 工具测试钉死）。

## 9. SOP 版本与迁移｜Versioning & migration

新增 AC 字段 + SPEC 门要求 = SOP minor bump → **0.9.0**（沿 Logic=0.3.0 / Task=0.5.0 /
Acceptance=0.8.0）。npm lockstep（DEC-039）。`ocn sop upgrade` 照 DEC-029；SPEC 门新要求按
AM-015 先例精确激活——已过 SPEC 的项目在下次触碰该步（rewind/cycle）或 VERIFY→SHIP 边界时
才生效，不追溯炸已过的门。<0.9.0 pin 冻结 + importable，行为不变（无 kind 字段 → 全 build）。

## 10. 已裁决问题｜Decided（2026-07-02，产品负责人裁决）

1. **排期**：proposal 先落仓；实现排在 0.8.0 dogfood 之后，**第一个 dogfood 对象是 OCN 自己**
   （现成 outcome AC = `docs/01-scope.md` beta 停止条件三条，probe 读案例记录文件）。
2. **threshold 表达力**：只支持单比较（`>= <= > < == !=`），不做区间。
3. **STALE/新鲜度窗口**：留 1.0；首版 verdict 三态（+UNMEASURED）够用。
4. **no-outcome 豁免**：放 DEC 决策日志，不进 config.yaml——豁免是业务决策，不是部署配置。

## 11. 测试｜Tests

单元（measure 契约解析 / 非法 threshold / 台账完整性 / 三态 exit 映射 / 引用核对器）
+ 门禁层（SPEC 无 outcome 且无豁免 → blocked；VERIFY→SHIP 四种 verdict 组合；REFLECT 引用不一致）
+ CLI 层（哈希漂移拒绝；auto mode 下 ai_agent 冻结契约被拒）
+ 迁移（sop-upgrade 0.8.0→0.9.0）
+ 默认 0.9.0 从零 e2e `outcome-backbone-walkthrough.test.ts`（DISCOVERY→REFLECT 全程，
  含 MEASURED_FAIL → cycle new 带快照进第二轮的螺旋路径）。

## 12. 明确不做｜Out of scope（防机制增殖的自我约束）

- 不做指标推荐/指标合理性检查（内容判断，human-only，**永久边界**）。
- 不做合成"健康度/效果评分"（启发式 + 新 Goodhart 目标）。
- 不做定时调度/守护进程（测量由派发驱动；运维归用户项目）。
- 不做复杂遥测（brief 指标只读已有 audit JSONL + 台账）。
- **0.9.0 后冻结新 backbone**：过程轴五层 + 效果轴一层 = 假完成分类学闭合；
  除非发现新的正交轴，不再开新机制层。

## 13. 对 FFF 四根因的回应｜Why this closes the FFF class

| FFF 根因 | 本设计的回应 |
|---|---|
| 每日循环从未运转 | NO_EVIDENCE 每天出现在 AI 派发里；SHIP 边界硬拦未测量 |
| 被治理的核心是占位公式 | 阈值/指标 human-only 显式声明——占位至少是显式、可审计的 |
| 方法论零实证 | 不测量到不了 SHIP；REFLECT 引用数字机器核对，防编造 |
| 遇问题就加检查机制 | 派发把精力路由到测量路径而非新机制；本设计自身以 backbone 冻结自律 |
