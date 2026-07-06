# Outcome Backbone P2–P4 实现规格｜Implementation Spec (SOP 0.9.0)

> Version: 1.0 · 2026-07-02 · 编号预留 AM-017 / DEC-043（以实施时仓库实际下一号为准）
> 上游：[proposal](../outcome-backbone-proposal.md) · [升级计划 + 评审综合](2026-07-02-outcome-backbone-0.9.0-upgrade-plan.md)（§0 八条 CRITICAL 修正 + §12 分主题综合）
> P1（类型+解析+v2 投影）已在 PR #92 落地；本文档只规范 **P2 / P3 / P4**——把"定义 outcome"升级为"强制测量 + 驱动 + 落地 SHIP/REFLECT"。
> 硬约束继承 CLAUDE.md §8：文件 ≤300 行、函数 ≤50 行、参数 ≤4、圈复杂度 ≤10、导出 API 零裸 any/unknown、单 PR ≤500 行；MCP 白名单钉死 7 工具；human-only 硬区不变。

---

## 0. 阅读指引与总纲｜How to read

三阶段严格串行，每阶段独立分支 + 全量 pre-commit 门（`lint && typecheck && test`）+ 单 PR ≤500 行。**判定链只做机械操作，永不做效果好坏的内容评判**（LLM judge 宪法禁区）：指标/阈值 human-only，OCN 只控制测量的结构与执行。

| 阶段 | 交付的"效果"能力 | 一句话验收 |
|---|---|---|
| **P2** | 效果台账 + probe 执行器 + `ocn outcome check/list/waive` | 只有冻结命令的输出能写台账；AI 口头断言永不登记；哈希漂移拒绝 |
| **P3** | 判定→驱动三级闭环（仪表/派发/门禁）+ SPEC 门要求 | 到期未测拦住 VERIFY→SHIP；AI 的下一步被路由到测量路径 |
| **P4** | SOP 0.9.0 profile + SHIP/REFLECT 落地 + 迁移 + 发布 | 从零默认 0.9.0 e2e 走通 DISCOVERY→REFLECT，含 FAIL→cycle 螺旋 |

### 0.1 P1 已落成的接缝（P2+ 直接复用，勿重造）

- `src/types/outcome.ts` — `ThresholdOp` / `Threshold`(`.finite()`) / `AcceptanceKind` / `MeasureContract`。
- `src/core/outcome/threshold.ts` — `parseThreshold`（已用）+ `compareThreshold`（**P2 首个消费者**，穷尽 `never` 守卫、精确浮点、无 epsilon）。
- `src/core/acceptance/measure-parser.ts` — 契约解析已产出 `MeasureContract`。
- `.ocoding/acceptance-specs.json` **v2 投影**已携带 `kind`+`measure`——**这是 P2 读取 outcome 契约的唯一权威源**（判别联合 v1|v2，`resolveAcceptanceSpecs` 把 v1 项提升为 v2）。
- 复用锚点：`task-ledger-store.verifyHashOf`（R4 冻结哈希）、`task-verify-exec`（spawn 范式）、`state-store.withLock`（真 5 步安全写）、`contract-gate-step`（cross-cutting 门范式）、`automation/authorization`（AM-009 授权）、`audit-event`/`audit-writer`、`readiness/waiver-store`（结构化豁免先例）、`project-root.assertResolvedPathInsideRoot`（越界防护）。

---

## 1. 跨阶段不变量与已裁决修正｜Cross-cutting invariants（所有阶段必须遵守）

这些是评审综合里 load-bearing 的裁决，任何一阶段实现都不得违反：

1. **完整性锚点 = 审计 JSONL 交叉核对，不是自校验和。** 台账不是任何可重新推导的源的投影，冻结命令哈希只覆盖命令字段；verdict/value/history 都可被手改，self-checksum 在无信任根下可被重算。唯一真锚点：每次测量写一条 `outcome_measured` 审计事件（含 value/verdict/evidenceHash/commandHash/measurementId），每次 gate 用**永不归档**的 audit 台账反查 ledger。伪造需同时改 ledger 与 audit JSONL = "伪造必留痕"。
2. **台账走真锁 + 备份。** 用 `state-store` 的 `withLock`（5s 超时）+ `.bak`，**不要**照抄无锁的 `task-ledger-store`/`acceptance-spec-store`（那俩只有 temp+rename）。理由：`outcome check` phase2 可委托 → 并发/快速连调真实存在 → lost-update 风险。
3. **dual-write 定序：先 append 审计事件，再 rename ledger。** 反查容忍"ledger 落后 audit ≤1 步"（可恢复方向），把"ledger 领先 audit"判为篡改并拒绝。
4. **append-only 是不变量：** 每条 history 链入前条哈希（`prevEntryHash`）+ 单调长度校验 + 与 audit 事件计数交叉核对；截断可检测。
5. **verdict 三存一算：** 存 `NO_EVIDENCE / MEASURED_PASS / MEASURED_FAIL`；`UNMEASURED` = 无 history 条目（计算态），不作存储 enum 值。取"最新"= **history 数组末元素**，不取 `max(timestamp)`（防未来日期插队）。
6. **只拦"未测量"不拦"测量失败"：** VERIFY→SHIP 阻塞到期 `UNMEASURED / NO_EVIDENCE`；`MEASURED_FAIL` **不阻塞任何 advance**，而是强制人类决策点。理由：OCN 卖纪律不卖成功；拦 FAIL 会复刻 FFF 的 0.95 死结。
7. **诚实边界写进 PASS 消息与文档：** 本地无信任根，OCN 不做密码学防伪；只做"伪造必留痕"。且证据快照必须**同时覆盖 probe 程序入口文件本身**（否则改 `scripts/probe.js` 直接 `console.log` 假值不留痕——这是 FFF 类最直接的伪造向量）。
8. **删掉 `ocn outcome freeze` 命令（裁决）：** 冻结是**验收门通过的副作用**（命令哈希入台账，R4），契约变更 = 改 `docs/03` + 重跑验收门 + 漂移拒绝，完全对齐 Task 主干（无 `task freeze`）。命令组 = `check / list / waive` 三个。
9. **`measure` 契约里的 `actual` 运行时值必须 `.finite()` 守卫**再进 `compareThreshold`（阈值 value 已在 P1 守卫；运行时输出是新入口，probe 吐 `NaN` 会让 `!=` 恒真 → 假 PASS）。
10. **MCP 白名单不动（7 工具，测试钉死）：** `outcome check` 与 `task check` 同级——状态改变类，仅 CLI，永不上 MCP。

---

## 2. P2 — 效果台账 + probe 执行器 + `ocn outcome` 命令组

**分支** `feat/outcome-backbone-p2-ledger`。**目标**：让"测量"成为可执行、可登记、可防伪的机械操作。本阶段不接门禁、不改派发（那是 P3）。

### 2.1 数据模型｜`.ocoding/outcome-ledger.json`

新文件 `src/types/outcome-ledger.ts`（zod 单一真源）：

```ts
export const OutcomeVerdict = z.enum(["NO_EVIDENCE", "MEASURED_PASS", "MEASURED_FAIL"]);
// UNMEASURED = 无 history 条目（计算态，不入 enum）

export const EvidenceFile = z.object({
  path: z.string(),          // 相对 repo root
  sha256: z.string(),
  bytes: z.number().int().nonnegative(),
}).strict();                 // 不含 mtime（可伪造、git checkout 会误翻）

export const OutcomeMeasurement = z.object({
  measuredAt: IsoUtc,                       // ISO 8601 UTC Z
  verdict: OutcomeVerdict,
  value: z.number().finite().nullable(),    // null ⟺ NO_EVIDENCE
  commandHash: z.string(),                  // measure.command 的 verifyHashOf（测量时）
  probeEntryHash: z.string(),               // probe 入口文件内容哈希（伪造留痕，见不变量 7）
  evidenceHash: z.string(),                 // measure.source 命中文件的合并内容哈希；"" ⟺ 零命中
  evidenceFiles: z.array(EvidenceFile),
  durationMs: z.number().int().nonnegative(),
  measurementId: z.string(),                // ULID，与 outcome_measured 审计事件配对
  prevEntryHash: z.string(),                // 链上一条（append-only 防截断）
}).strict();

export const OutcomeWaiver = z.object({
  dec: z.string(),                          // DEC-<n>，gate 时校验存在
  reason: z.string().min(1),
  at: IsoUtc,
}).strict();

export const OutcomeLedgerEntry = z.object({
  acId: z.string(),
  contractHash: z.string(),                 // 冻结的 measure.command verifyHashOf
  due: z.string(),                          // 到期 state id
  history: z.array(OutcomeMeasurement),     // append-only；末元素 = 当前 verdict
  waived: OutcomeWaiver.optional(),         // per-AC 逃生（永久 NO_EVIDENCE / pivot 作废）
}).strict();

export const OutcomeLedger = z.object({
  version: z.literal(1),
  generatedAt: IsoUtc,
  entries: z.array(OutcomeLedgerEntry),
  noOutcomeWaiver: OutcomeWaiver.optional(),// 项目级 no-outcome 豁免（P3 SPEC 门用）
}).strict();
```

路径登记：`src/core/paths.ts` 加 `outcomeLedgerFile = .ocoding/outcome-ledger.json`（在 `acceptanceSpecsFile` 旁）。

**计算态 helper**（`src/core/outcome/outcome-verdict.ts`）：
```ts
export function latestVerdict(entry: OutcomeLedgerEntry): "UNMEASURED" | OutcomeVerdict {
  const last = entry.history.at(-1);
  return last === undefined ? "UNMEASURED" : last.verdict;
}
```

### 2.2 probe 执行器｜`src/core/outcome/probe-runner.ts`（纯执行器，≤300 行；比较器/快照拆独立文件）

契约：确定性命令，最后一行 stdout 输出 `{"metric":"<name>","value":<number>}`，exit 三态。

```ts
// 归一到闭合联合（照 P1 typescript 评审）：exit 0 但末行非法 JSON = exec_error，不静默当 measured
type ProbeOutcome =
  | { status: "measured"; metric: string; value: number }
  | { status: "no_evidence" }
  | { status: "exec_error"; detail: string };

export interface ProbeResult {
  readonly outcome: ProbeOutcome;
  readonly durationMs: number;
}
export function runProbe(cwd: string, measure: MeasureContract): Promise<ProbeResult>;
```

实现要点（安全评审 + 数据完整性评审）：
- **spawn**：`spawn("/bin/sh", ["-c", measure.command], { cwd, detached: true, timeout: measure.timeoutSeconds*1000 })`；冻结命令**逐字**作为唯一 shell 值，绝不插值 acId/metric/source。
- **exit 映射**：`0` → 解析末行；`20` → `no_evidence`；其他/`null`(超时/信号) → `exec_error`。`=== 20` 精确匹配，不是 `>=20`。
- **末行 JSON**：`maxBuffer` 显式 1MB；末非空行长度 >64KB → `exec_error`；`JSON.parse` try/catch；`ProbeReading = z.object({metric:z.string().min(1), value:z.number().finite()}).strict()`，**禁 `z.coerce`**；解析失败 → `exec_error`（**不是** measured）。只显式读 `metric`/`value`，绝不 `{...parsed}`（防原型污染）。
- **进程组 kill**：超时 `process.kill(-child.pid, "SIGKILL")`，SIGTERM→SIGKILL 有宽限窗（Node 不自动升级；probe 跑现实负载易留孤儿树）。
- **verdict 映射**（`verdictFor`，穷尽 `never`）：`measured` → `compareThreshold(value, threshold) ? MEASURED_PASS : MEASURED_FAIL`；`no_evidence` → `NO_EVIDENCE`；`exec_error` → **不写 verdict**，返回 `ERR_IO_OR_CONFIG`(exit 4) 上抛。

**证据快照**｜`src/core/outcome/evidence-snapshot.ts`：
- 用 `measure.source` glob（复用 `readiness/repo-prober` 的 `globToRegExp` + 末段匹配）解析命中文件。
- 每个命中文件：先 `lstat` **跳过 symlink**（或 `assertResolvedPathInsideRoot` 确认 realpath 仍在 root 内），每文件哈希前设大小上限；产出 `{path, sha256, bytes}`。**不记 mtime。**
- **零命中 → 强制 `NO_EVIDENCE`**（exit 0 且空快照绝不当 PASS）。
- `probeEntryHash`：解析 `measure.command` 首个存在的本地文件参数（如 `node scripts/probe.js` → `scripts/probe.js`），哈希其内容；解析不到则记 `""` 并在 PASS 消息声明"未快照 probe 程序"。

### 2.3 台账存取｜`src/core/outcome/outcome-ledger-store.ts`

- `readOutcomeLedger(root): Promise<OutcomeLedger | null>` —— 防御式，zod safeParse 即完整性校验（裸 `as` 禁用）。
- `writeOutcomeLedger(root, ledger)` —— 走 `state-store.withLock` + `.bak` + temp+rename（不变量 2）。
- `appendMeasurement(root, acId, m)` —— 读-改-写在**锁临界区内**完成；计算 `prevEntryHash`（链上一条）；长度单调校验。
- 冻结：**不在此**——契约哈希在**验收门通过时**由 store 冻结（P2 扩验收门旁路：门 pass 时把每条 outcome AC 的 `verifyHashOf(measure.command)` 写入台账 entry 的 `contractHash`，history 为空）。

### 2.4 完整性反查｜`src/core/outcome/outcome-integrity.ts`（P3 门会调用，但逻辑在 P2 建好）

```ts
// 返回 null=一致；否则给出不一致 acId + 两个数值，指引重新测量
export function reconcileLedgerWithAudit(root: string): Promise<IntegrityBreach | null>;
```
- 读 audit JSONL 里所有 `outcome_measured` 事件，按 acId 取最后一条；与 ledger entry 末条 history 比对 `measurementId`/`value`/`verdict`/`evidenceHash`。
- "ledger 末条的 measurementId 不在 audit" 或 "值不符" → breach（篡改）。
- "audit 有而 ledger 落后一条" → 可恢复（不 breach，提示重跑）。
- 哈希漂移：ledger `contractHash` ≠ 当前 v2 投影里该 AC 的 `verifyHashOf(measure.command)` → breach，指引 human-only 重新冻结（改 docs/03 + 重跑验收门）。

### 2.5 命令组｜`src/cli/commands/outcome.ts`（参照 `task.ts`/`verdict.ts` 结构）

| 命令 | 模式 | 权限 | 行为 |
|---|---|---|---|
| `ocn outcome check <ac-id>` | push（审计 `outcome_measured`） | phase2 auto 可委托（AM-011 审查子代理前置 + `--rationale` 必填） | 先 `reconcileLedgerWithAudit`+哈希漂移检查→漂移则拒绝(exit 2)；跑 `runProbe`；`exec_error`→exit 4 不写台账；否则 `appendMeasurement` +（先）写 `outcome_measured` 审计 |
| `ocn outcome list` | pull（无审计） | 任意 | 只读台账：每 AC 的 `latestVerdict` + 距上次测量天数（数据源=history 时间戳）+ waived 标记 |
| `ocn outcome waive <ac-id> --dec <id> --reason …` | push（审计 `outcome_waived`） | **human-only 硬区** | per-AC 逃生：写 `entry.waived`；`--dec` 校验存在（见 P3 §3.1）|
| `ocn outcome waive --no-outcome --dec <id> --reason …` | push | **human-only 硬区** | 项目级 no-outcome 豁免：写 `ledger.noOutcomeWaiver` |

**审计事件**（`src/types/audit.ts` 的 `AuditEventType` enum 新增，单 type + result 语义，沿 rewind/cycle 先例）：`outcome_measured`（result: pass|fail|no_evidence）、`outcome_waived`。**不复用** `artifact_gate_*`。**不新增** `outcome_contract_frozen`（已删 freeze 命令；冻结是验收门副作用，沿用 `artifact_gate_passed`）。

**自动化接线**｜`src/core/automation/`：新增 `authorizeAiOutcomeCheck`（平行 `authorizeAiTaskCheck`，**非复用**）——`outcome check` 归 phase2，仅 BUILD/VERIFY 相位可委托（`phaseOfState` 天然把 SHIP/REFLECT 锁成 human-only，写明）；`waive`（两种）进 human-only 硬区，ai_agent 技术性拒绝。

### 2.6 exit codes（复用现有表）
门/契约无效=2，IO/超时/exec_error=4；probe 的 `20` 是 probe 侧约定，**不进** ocn exit 表。

### 2.7 P2 测试（`npm run test` 必绿）
- 单元：`compareThreshold` 各算符；probe tri-state 映射（含 exit0+坏 JSON=exec_error、exit20=no_evidence、超时=exec_error）；`ProbeReading` 拒 `NaN`/`Infinity`/字符串数字；末行 >64KB 拒绝；证据快照跳 symlink + 零命中→NO_EVIDENCE + probeEntryHash；台账 append 的 prevEntryHash 链 + 长度单调；`reconcileLedgerWithAudit` 的一致/篡改/可恢复三态。
- 并发：两个 `outcome check` 竞争 append 不丢更新（真锁）。
- CLI：哈希漂移拒绝(exit 2)；`exec_error`→exit 4 且**不写台账**；ai_agent 调 `waive` 被拒；`outcome check` 先写审计再 rename 台账（崩溃点测试）。

---

## 3. P3 — 判定→驱动三级闭环 + SPEC 门要求

**分支** `feat/outcome-backbone-p3-drive`。**目标**：让台账**驱动**行为——SPEC 门强制声明、派发路由到测量、VERIFY→SHIP 拦未测量。**这是整套设计的灵魂。**

### 3.1 SPEC 门：≥1 outcome AC 或有效 no-outcome 豁免

- 位置：验收门通过分支之后追加一个检查（`step_acceptance_criteria`）。
- 条件：v2 投影中 ≥1 条 `kind:outcome`，**或** `ledger.noOutcomeWaiver` 存在**且** `--dec` 指向的 DEC 在 `docs/20-decision-log.md` 里真实存在（结构化解析 DEC id，非 prose 猜测）。二者皆无 → `ERR_GATE_FAILED`(exit 1) + fix_hint（"加一条 outcome AC，或 `ocn outcome waive --no-outcome --dec …`"）。
- **`--dec` 机器校验**（防 dangling-ref 逃生，spec-flow Q3/Q4）：豁免状态存在**引擎独写的结构化台账**（`ledger.noOutcomeWaiver` / `entry.waived`），DEC id 仅作**引用**；每次 gate 复验 DEC 存在（照 readiness waive-with-probe 复验）。DEC 后被删 → 豁免失效并 block。
- **waiver × outcome 互斥**：若项目级 no-outcome 豁免与 `kind:outcome` AC 同现 → 双语 block（声明互斥）。

### 3.2 outcome 激活时序（复用 AM-014 精确激活）

- `dueState(outcomeAC)` = `measure.due`（缺省 `state_ship`）。`due` 之前显示 **DEFERRED**——不阻塞、不派发（不提前吵）。
- **due-already-passed clamp**（升级项目，spec-flow Q1）：升级后首次激活时若 `dueState < currentState`，**clamp 到下一可达边界**（下关强制，不追溯 explode 已过的门），一次性迁移提示。进迁移测试矩阵。

### 3.3 VERIFY→SHIP 门 + MEASURED_FAIL 决策提示（`src/core/advance/`）

- `advance` 在 VERIFY→SHIP 边界：先 `reconcileLedgerWithAudit`（篡改→拒）；到期 outcome AC 中任一为 `UNMEASURED / NO_EVIDENCE` 且未 waived → `ERR_GATE_FAILED`(exit 1) + fix_hint 指向 `ocn outcome check`。
- `MEASURED_FAIL`：**不阻塞任何 advance**；输出双语决策提示（"带实测数字 cycle/rewind 进下一轮，或 `ocn outcome waive --dec` 记录接受降级"）。
- 新增 `src/core/advance/outcome-ledger-guard.ts`（照 `task-ledger-guard` 范式，**勿把逻辑塞进 advance-state.ts**，其已 208 行）。

### 3.4 next-prompt 派发优先序（灵魂杠杆）

- 新增**独立 sibling 模块** `src/core/execution-navigator/next-prompt-outcome-dispatch.ts`（**勿塞进** `next-prompt-task-dispatch.ts`——其 `state_build` 短路，而 outcome 从 VERIFY 起可测、非 BUILD 限定；也勿撑大 251 行的 `next-prompt-sections.ts`）。
- 优先序：**到期未测/失败的 outcome AC > pending build task**。
- **BUILD 期防 livelock**（spec-flow Q6）：outcome AC 仅在 build ledger 清空时 / BUILD 之外 才盖过 build task；`NO_EVIDENCE` 的 outcome 在其 trace 闭包内降到 pending build task 之下（否则派发反复路由到 `outcome check`→NO_EVIDENCE，而 `task-ledger-guard` 又不让出 BUILD → 活锁）。
- 同步 `governance-text.ts`(98) 的自动化文案 + `/ocn-next` 模板 + AM-011 审查子代理指令（否则 auto mode 拿到过期指令）。

### 3.5 brief 现实接触指标（仪表，只读）

- `src/core/brief.ts` 已 283 行——**抽独立** `src/core/brief-outcome-section.ts` 再组合（加进去必破 300）。
- 内容：台账摘要（各 verdict 计数）+ 距上次测量天数（数据源=已有 audit 时间戳，零新增遥测）。**只显 verdict 计数**，不做合成"健康度评分"（启发式 + 新 Goodhart 目标，明确不做）。

### 3.6 门运行器分解（architecture H2，硬约束）

- `gate-runner.ts` 已 482 行、含 3 份近同 evaluate→block→persist（acceptance/logic/task）。SPEC outcome 门与 SHIP/REFLECT 门（P4）共 3 个新门点。
- 每个 outcome 门做成**判别-kind step fn**（`{kind: skip|pass|io_error|blocked}`，照 `runContractDriftStep`）；引入小型 **step-gate 派发表/注册表**把 6× 重复迁上去——**收缩 runner 而非长出第 5/6 份拷贝**。

### 3.7 与 Task 主干 `zero_tasks` 调和（spec-flow Q7）

- 纯 outcome 项目（只有 outcome AC、无 build task）当前过不了 build-plan 门（`zero_tasks` 硬缺陷）→ 到不了判 outcome 的 SHIP。
- **裁决（本 spec 定）**：`zero_tasks` 缺陷在"存在 ≥1 到期 outcome AC"时放宽（一条冻结 probe 的 outcome AC 视作满足"有可验证交付物"）。写进 task-gate + 迁移/e2e 测试。

### 3.8 P3 测试
- 门禁层：SPEC 无 outcome 且无豁免→blocked；no-outcome 豁免 DEC 不存在→blocked；waiver×outcome 同现→blocked；VERIFY→SHIP 四种 verdict×waived 组合；MEASURED_FAIL 不阻塞但出提示；DEFERRED 不提前吵；due-already-passed clamp。
- 派发：到期 UNMEASURED outcome + pending build task → 派发测量（非 BUILD）；BUILD 内早 due 不活锁。
- 篡改：手改 outcome-ledger.json → 下次 gate `reconcileLedgerWithAudit` 失败并指引重测。
- 调和：纯 outcome（零 task）项目能过 build-plan 门走到 SHIP。

---

## 4. P4 — SOP 0.9.0 profile + SHIP/REFLECT 落地 + 迁移 + 发布

**分支** `feat/outcome-backbone-p4-sop090`。**目标**：状态机首次越过 `step_final_build_verdict`，把管辖权推过现实边界；默认翻 0.9.0；lockstep 发布。

### 4.1 0.9.0 profile｜`src/sops/default-ai-coding-sop/0.9.0/`（照 0.8.0/ 七件套）

- `data.ts` 继承 0.8.0 全量 state/step/path；**新增两步**（SHIP/REFLECT 的 state 数组本就存在、当前为空）：
  - `state_ship` → `step_release`
  - `state_reflect` → `step_evolution_report`
- `PROFILE_VERSION = "0.9.0"`；`precise_activation` 标志继承 0.7.0+。
- loader 注册 + 默认翻 0.9.0；0.8.0 及更早**冻结 + importable**。

### 4.2 SHIP 门｜`step_release`（状态门，非章节门；**cross-cutting 接线**）

- **关键（architecture C2）**：`step_release` **无 required artifact** → runGate 命中 null-artifact 提前返回分支，会在 inline 门之前 auto-pass。**必须照 `contractDriftOrNull` 在两个分支都调用**——SHIP outcome 门若做成 inline 块会静默放行零强制。
- 进入条件：无到期 `UNMEASURED / NO_EVIDENCE`（未 waived）。完成条件：全部 `MEASURED_*` 且每条 `MEASURED_FAIL` 有 `entry.waived`（带 DEC）或项目级豁免。先跑 `reconcileLedgerWithAudit`。

### 4.3 REFLECT 门｜`step_evolution_report`（闭环门）+ cycle 螺旋

- artifact：`docs/22-evolution-report.md`，含"测量数字引用块"（`### Outcome References` 语法：每条 `- <ac-id>: value=<n> @ <measuredAt>`）。
- 门 = **机械核对**引用值与台账一致（纯 JSON vs markdown，无内容判断）：
  - **多历史条目裁决**（spec-flow Q5）：canonical = **当前轮最新条目**；引用必须标注 `@ measuredAt` 并匹配该具体条目；拒绝引用当前轮 history 之外的值（防用旧 PASS 洗当前 FAIL）。
  - 不一致 → blocked，指出 acId + 两个数值。
- **`ocn cycle new` 螺旋（CRITICAL，spec-flow Q2）**：归档 `outcome-ledger.json` 到 `.ocoding/cycles/<n>/`，**下一轮 live verdict 重置为 UNMEASURED**，只保留冻结契约（`contractHash`/`due`/`measure`）。**绝不 carry live verdict**——否则第一轮 PASS 让第二轮改动过的系统在 SHIP 拿旧绿灯发布 = 第六类假完成跨轮泄漏。审计 JSONL 永不归档（一条连续日志跨所有轮）。
- 硬编码终点文案迁移：`advance-state.ts:143-146` 的 `no_next_step` 拒绝文案 + cycle/rewind signpost 钉死在旧终点 `step_final_build_verdict`，须移到 `step_evolution_report`；相关"终点在 VERIFY"断言测试同步改。

### 4.4 迁移｜`ocn sop upgrade` 0.8.0→0.9.0（照 DEC-029/AM-015 先例）

- 保 `config.yaml` + 游标 + 产物；SPEC 门新要求 + 新状态按 AM-014 精确激活，**不追溯炸已过的门**。
- **升级态终点移动测试（区别于冻结 pin，architecture H1）**：`nextStep(step_final_build_verdict)` 由 null→`step_release`。停在旧终点的 0.8.0 项目升级后 `ocn advance` 会续进 SHIP。加迁移测试：0.8.0 停 `step_final_build_verdict`→upgrade→advance 进 `step_release`，且 SPEC outcome 要求精确激活。**同时**保留"冻结 0.8.0 pin 终点仍是 `step_final_build_verdict`"断言。

### 4.5 投影 v2 pin 感知（P1 遗留的 C1 收尾）

- P1 的 `buildAcceptanceProjection` 目前 "有 outcome 就出 v2"（pin-blind）。P4 把 **pin 版本贯穿** `evaluateAcceptanceSpecs → buildAcceptanceProjection` 与 gate-runner 调用点：`<0.9.0` pin 即使 docs 里有 `kind:outcome` 也**仍出 v1 并 warn**（"outcome AC needs SOP 0.9.0"），保 `<0.9.0` pin 行为不变。这是 gate-runner 调用点的签名改动，恰在 P4 触碰门运行器时一并做。

### 4.6 发布
- npm `0.9.0-beta.0`（lockstep DEC-039，latest+beta）+ GitHub release；MCP 白名单钉死断言确认**仍 7 工具**。
- 文档收尾：amendment（`docs/amendments/2026-07-xx-outcome-backbone-amendment.md`）+ DEC-043 + CLAUDE.md §6 + README/onepager + proposal Status 翻 implemented。PDF 走 build/pdf 管线（pandoc→xelatex）。

### 4.7 P4 e2e｜`tests/e2e/outcome-backbone-walkthrough.test.ts`（从零默认 0.9.0）
- 全程 DISCOVERY→REFLECT：init→SPEC（含 outcome AC）→…→BUILD→VERIFY 内 `outcome check`→VERIFY→SHIP→REFLECT→`cycle new`。
- **螺旋第二轮**：第一轮 `MEASURED_FAIL`→cycle new→第二轮 verdict 起始 UNMEASURED→重测→PASS→SHIP。
- 迁移分支：0.8.0 项目 upgrade→终点移动。

---

## 5. 汇总验收标准｜Consolidated Acceptance Criteria（Given-When-Then → 测试）

1. Given outcome AC 契约哈希漂移，When `ocn outcome check`，Then 拒绝(exit 2) 指引改 docs/03 重跑验收门。（P2）
2. Given probe exit 20，When check，Then verdict=NO_EVIDENCE（非 FAIL），审计 result=no_evidence。（P2）
3. Given probe exit 0 但末行非 `{metric,value}` JSON，Then exec_error(exit 4)，**不写 verdict**。（P2）
4. Given probe 输出 `Infinity`/`NaN`/`1e400`，Then exec_error（不写 verdict、非 PASS）。（P2）
5. Given ai_agent 调 `outcome waive`（任一种），Then 技术性拒绝（human-only 硬区）。（P2）
6. Given AI 直接编辑 outcome-ledger.json，When 下次任何 gate，Then `reconcileLedgerWithAudit` 失败，指引重测。（P2/P3）
7. Given SPEC 无 outcome AC 且无有效 no-outcome 豁免，When 验收门，Then blocked(exit 1)。（P3）
8. Given no-outcome 豁免的 `--dec` 指向不存在/后被删的 DEC，When gate，Then 豁免失效并 block。（P3）
9. Given 到期 UNMEASURED outcome + pending build task，When `ocn next-prompt`（非 BUILD），Then 派发测量任务。（P3）
10. Given MEASURED_FAIL，When advance（非 SHIP 边界），Then 不阻塞但输出双语决策提示。（P3）
11. Given VERIFY→SHIP 存在到期 NO_EVIDENCE，When advance，Then blocked(exit 1) fix_hint 指向 probe。（P3/P4）
12. Given 纯 outcome（零 build task）项目，Then 能过 build-plan 门走到 SHIP。（P3）
13. Given evolution-report 引用值 ≠ 当前轮台账实测值，When REFLECT 门，Then blocked，指出 acId + 两数值。（P4）
14. Given `cycle new`，When 进第二轮，Then outcome AC 起始 verdict=UNMEASURED（不带旧绿灯），冻结契约保留，审计 JSONL 未归档。（P4）
15. Given 0.8.0 项目停旧终点升级 0.9.0，When advance，Then 进 `step_release`；冻结 0.8.0 pin 终点仍是 `step_final_build_verdict`。（P4）
16. Given `<0.9.0` pin 项目 docs 有 kind:outcome，When 验收门，Then 投影仍 v1 + warn（行为不变）。（P4）
17. Given 任何阶段，Then MCP 白名单仍 7 工具（钉死断言）。（P2–P4）

---

## 6. PR 拆分与排序｜Sequencing

| PR | 分支 | 内容 | 约束 |
|---|---|---|---|
| P2 | `feat/outcome-backbone-p2-ledger` | §2 全部（台账/probe/命令组/审计/自动化授权） | ≤500 行；不接门禁/派发 |
| P3 | `feat/outcome-backbone-p3-drive` | §3 全部（SPEC 门/激活/SHIP 边界/派发/brief/runner 分解/zero_tasks 调和） | ≤500 行；依赖 P2 |
| P4 | `feat/outcome-backbone-p4-sop090` | §4 全部（0.9.0 profile/SHIP/REFLECT/迁移/pin 感知/发布/e2e） | ≤500 行（发布单独提交）；依赖 P3 |

每 PR：先写测试（RED）→实现（GREEN）→`lint && typecheck && test` 全绿→独立分支→PR。**human-gated：** merge、`ocn advance`（OCN 自身状态）、`ocn sop upgrade` 默认翻转、npm publish 均需人类。**0.9.0 后冻结新 backbone**（proposal §12）。

---

## 7. 风险｜Risks

1. **状态机首次扩到 20 步之外**：`sop upgrade` 对"已到 VERIFY 末端老项目"的游标语义必须在迁移测试钉死（升级态 vs 冻结 pin 两条都测）。
2. **派发优先序改动波及 `/ocn-next` + AM-011 审查文案**：不同步则 auto mode 审查子代理拿到过期指令。
3. **证据伪造是已声明边界而非已解决问题**：靠 audit 交叉核对 + 证据/probe-入口快照留痕 + human-only 冻结缓解；文案不得夸大担保范围（不做密码学防伪）。
4. **runner 已 482 行**：P3/P4 若不先做 step-gate 注册表分解，会长出第 5/6 份重复块并破 300 行限。
