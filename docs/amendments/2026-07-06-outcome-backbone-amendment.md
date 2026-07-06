# Amendment AM-017 — Outcome Backbone（效果主干，SOP 0.9.0）

**Status**: Accepted (implemented)

## Date

2026-07-06

## Supersedes

None（additive；新增一条 backbone = SOP minor bump，沿 Logic=0.3.0 / Task=0.5.0 / Acceptance=0.8.0 先例）。
不改写任何 frozen `docs/0X` 契约。**编号说明**：本主干起草时占用 AM-016/DEC-042，但 `ocn stop`（引擎/CLI 特性）
先行 ship + 发布并占用了该号，故 Outcome Backbone 整体**改号为 AM-017 / DEC-043**。

## Applies to

- **新 SOP 0.9.0 profile**：`src/sops/default-ai-coding-sop/0.9.0/{data,sop,gates,artifacts,readiness,config,render}.ts`——继承 0.8.0，唯二增量是把 `state_ship=[step_release]`、`state_reflect=[step_evolution_report]`（docs/23）两键从空数组填上。运行时默认翻 0.9.0（`src/core/sop/loader.ts`）；0.8.0 及更早冻结 + importable。
- **验收层扩展（P1）**：`src/types/{outcome,outcome-ledger,acceptance-spec}.ts` + `src/core/acceptance/{measure-parser,acceptance-spec-parser,...}.ts`——AC 增 `kind: build|outcome` + `measure`（metric/probe/threshold/due/timeout）；投影升 **v2**（判别 `kind`），`<0.9.0` pin 出 **v1** + warn。
- **台账 + probe + CLI（P2）**：`src/core/outcome/*`（ledger-store 走真 `withLock`+bak、probe-runner spawn+bounded-stdout+pid-guarded-kill、evidence-snapshot、integrity 链式核对）+ `src/cli/commands/outcome.ts`（`ocn outcome check/list/waive`）。
- **驱动门（P3/P4）**：SPEC 门 `outcome-spec-gate.ts`（≥1 outcome AC 或有效 no-outcome 豁免）、激活 `outcome-activation.ts`（DEFERRED/dueReached）、VERIFY→SHIP 守卫 `advance/outcome-ledger-guard.ts`、SHIP 闭包门 `gate/outcome-ship-gate-step.ts`、REFLECT 门 `gate/outcome-reflect-gate-step.ts` + `outcome/outcome-references-parser.ts`、brief 段 `brief-outcome-section.ts`。
- **迁移**：`ocn sop upgrade 0.8.0→0.9.0`（`src/core/sop/upgrade.ts` + 种子）。
- **文档**：本修正案 + DEC-043 + `docs/23-evolution-report.md` slot + CLAUDE.md §5/§6。

不动：MCP 白名单（仍 7 工具，test-pinned）；`ocn stop` 的 AM-016/DEC-042；Readiness Path B。

## 背景｜Why

Outcome Backbone 封的是**第六类假完成——过程完备式**：任务台账全绿、门全过，却没有任何"这东西真的达成了目标"
的可验证数字。前五类（缺 section / 逻辑未接 / 就绪缺失 / 只有回执 / AC 藏表格）都在"过程"层，Outcome 是唯一
落到"**结果**"层的——AC 携带机读的 `measure`（metric + probe 命令 + 阈值 + due），probe 冻结命令跑出真实数字，
门在 SHIP 前要求"到期的 outcome 必须已测量、MEASURED_FAIL 必须被人类决策覆盖"，REFLECT 逐条按 `measurementId`
核对报告数字 vs 台账数字。信任根是**永不归档的 `outcome_measured` audit 事件链**（`prevEventHash`），伪造台账必留痕。

## 决议｜Decision

新增 SOP 0.9.0 profile，激活 P1–P4 造好的全部机件：结构化 outcome AC（v2 投影）→ 冻结 probe 契约 → `ocn outcome check`
跑冻结命令登账（链式 audit 信任根）→ SPEC/SHIP/REFLECT 三道门按 pin（`requiresOutcome(v)`，≥0.9.0）驱动 → `cycle new`
螺旋重置 verdict/waiver。运行时默认翻 0.9.0，`ocn sop upgrade` 迁移老项目（含台账种子）。

### Sub-decisions（关键裁决）

1. **信任根 = audit 事件链，非台账自校验**：命令哈希只覆盖命令，台账 verdict/value 可伪造；`reconcileLedgerWithAudit`
   拿 round-scoped `outcome_measured` 链核对台账——**这是无泄漏的真因**（非游标位置）。
2. **C-3 独立信任源**：SHIP/advance 守卫**不得**以"台账缺失/坏"当 legacy pass（`rm outcome-ledger.json` 即绕过全product）。
   先读冻结验收投影 / 扫 audit 判"应否有 outcome"，应有却台账 null → blocked。
3. **`nextStep` 按 pin 解析（4 处，含 MCP 面）**：默认翻 0.9.0 后，0.8.0-pin 老项目必须仍在 `step_final_build_verdict`
   终止——advance / auto-advance / `navigator.generate_next_prompt` 四调用点同解（AC-15）。
4. **SHIP 门 = cross-cutting 闭包**（`step_release` 无 artifact → 照 `contractDriftOrNull` 惯用法两分支自守卫），
   绝不进 step-keyed 分支（否则 null-artifact 早返回 pass）。
5. **REFLECT 引用键 = `measurementId`**（非 `measuredAt`，同秒碰撞可洗值）；解析器 total 永不 throw；覆盖每条未豁免 outcome AC。
6. **`no_tasks` 放宽**：纯 outcome 项目（≥1 **未豁免** outcome AC）降级 warning，可过 build-plan 门走到 SHIP。
7. **迁移种子 5 不变量**：snapshots→seed→pin 顺序 / target-profile 投影 / 未加锁写入器 / 有效才跳过 / 失败回滚。
8. **SHIP/REFLECT 单步 stub**（`step_release` / `step_evolution_report`）：刻意压缩，暂不落 §5 所列 20/21/24 等多产物——范围决策，记于此。
9. **auto-mode 永不委托 SHIP/REFLECT**（`PHASE2_STATES={build,verify}`）：phase-2 auto 项目在 VERIFY→SHIP 边界停机等人。
10. **编号 23 归 evolution-report**；ai-governance 让号（CLAUDE.md §5 勘正）。
11. **0.9.0 后冻结新 backbone**（proposal §12）。

## 验收｜Acceptance

- 默认 0.9.0 从零 e2e（`tests/e2e/outcome-backbone-walkthrough.test.ts`）：SPEC（outcome AC）→ BUILD → VERIFY `ocn outcome check` → SHIP 门 → REFLECT 引用核对 → cycle 螺旋；含 C-3 篡改拦截、MCP pin 不泄漏、白名单 7 工具、auto-mode SHIP 边界停机。
- AC-7/9/12/13/14/15/16 + SHIP（未测量/未决策 blocked、全 PASS 过）+ 迁移矩阵。
- 全量测试 + lint + typecheck 绿；MCP 白名单钉死 7 工具。

## 后续｜Follow-up

npm `0.9.0-beta.0`（lockstep DEC-039，latest+beta）+ GitHub pre-release。gate-runner（>300 行）字节等同分解为独立跟进（不 gate 发布）。
