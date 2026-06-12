# Amendment AM-008 — `ocn rewind` + `ocn cycle new`（受控游标回拨与重开循环）

**Status**: Accepted (implemented)

## Date

2026-06-12

## Supersedes

None（additive — 冻结契约 §25 的删除式 `ocn reset` 原文**不动**：按 DEC-033
开放点⑦裁决，游标回拨命名 `rewind` 给 `reset` 让位，`reset_executed` 事件
保留给 §25 语义，留待后续独立立项实现）。

## Applies to

- `docs/06-api-contract.md` — 新增两条 CLI 命令（rewind / cycle new），均不
  进入 MCP 白名单（§2.6 不变）；退出码沿用既有稳定表，不新增码位。
- `docs/05-data-model.md` §12.15 — 审计事件分类法新增 `cursor_rewind` 与
  `cycle_started`（均为单事件类型：`result: success|failed` +
  `data.failureReason`，与 advance 的多阶段事件流有意不同——一次回拨/重开
  是一个原子决定）。
- `.ocoding/` 存储布局 — 新增 `cycles/<n>-<ISO-ts>/` 归档目录（轮次号 =
  目录名前缀，不新增任何 state.json 字段；schemaVersion 不动）。
- `src/core/rewind/*`、`src/core/cycle/*`、`src/cli/commands/rewind.ts`、
  `src/cli/commands/cycle.ts`（新增）；`src/core/advance/advance-state.ts`
  （终点步报错指路文案）、`src/types/audit.ts`、`src/types/state-machine.ts`、
  `src/cli/index.ts`（修改）。

## Context

设计契约只给了游标一个合法写入者（`ocn advance`，只进不退）。2026-06-12
dogfood 暴露三个现实缺口（DEC-033 / `docs/rewind-cycle-proposal.md` §1）：
① 项目在 0.4.0 通过 build-plan 门禁后中途升级 0.5.0，游标越过任务台账唯一
生成点，Task Backbone 本轮静默失效且无恢复路径；② 终点步
`step_final_build_verdict` 之后无受控重开方式；③ 手改 `state.json` 成为
事实逃生通道——绕过锁/备份/原子写且零审计。核心矛盾：**没有受控逃生通道，
用户就会用不受控的方式逃生**。

## Divergence

| 命令 | 范围 | 语义 |
|---|---|---|
| `ocn rewind --to <stepId> --reason <text> [--json]` | 轮内 | 游标拨回当前 pin profile 声明序中**严格更早**的一步；`--reason` 必填；docs/ 产物一律不动；`latestGateResult` 置 null；回拨零豁免——之后每次 advance 重过完整门禁 |
| `ocn cycle new --yes [--json]` | 跨轮 | 本轮 `.ocoding` 运行时状态归档至 `.ocoding/cycles/<n>-<ts>/`，游标归零到 profile 首步；docs/ 保留供门禁快进；维持当前 pin；`config.yaml`（用户所有）现场保留、归档存副本；`--yes` 强制 |

不变量与机制（与 advance 完全同构）：

1. **写入纪律**：持锁（`.ocoding/.lock`）+ 锁内 stale 重读比对 + 备份 +
   临时文件 + 原子改名（CLAUDE.md §4.5）；并发竞争只有一个赢家，败者返回
   结构化 `ERR_STATE_MACHINE`。
2. **审计**：push 事件 `cursor_rewind` / `cycle_started`（from/to/reason/
   round/archivePath/correlationId；actor=user）。审计 JSONL **不随轮归档**
   （DEC-033 裁决③方案甲）——单链贯穿项目全生命周期，`cycle_started` 是
   轮与轮之间的缝合事件。时间线永远向前，游标可以向后。
3. **人类专属**：两命令均 CLI-only，MCP 白名单 7 工具不变——移动游标即
   改写"项目位于何处"这一最高权力，与 `advance_phase` 同类，不交给 agent。
4. **退出码**：`--reason`/`--yes` 缺失、锁超时、归档 IO 失败 →
   `ERR_IO_OR_CONFIG`（4）；目标非法/不严格更早/stale →
   `ERR_STATE_MACHINE`（3）。
5. **数字指针红线**：目标位置比较由 profile 声明序临时推导，仅用于比较，
   不落任何数字指针（CLAUDE.md §4.1）。
6. **终点步指路**（裁决⑨）：`advance` 的 `no_next_step` 拒绝消息双语指明
   `ocn cycle new --yes`（收档重开）与 `ocn rewind`（轮内返工），不加机器
   强判。

## Verification

- `tests/unit/rewind-target.test.ts` — 目标解析纯函数矩阵（7 例）。
- `tests/unit/rewind-state.test.ts` + `rewind-state-concurrency.test.ts` —
  引擎集成 + 双发竞态（10 例）。
- `tests/unit/cycle-new.test.ts` — 归档/审计连续/轮次编号/竞态（8 例）。
- `tests/cli/rewind.test.ts` + `tests/cli/cycle.test.ts` — spawn 真实 CLI，
  退出码表 + 双语渲染 + 副作用断言（14 例）。
- `tests/e2e/rewind-cycle-roundtrip.test.ts` — 前进 → 回拨 → 零豁免重过
  门禁 → cycle new → 第二轮快进 → 单链审计完整（1 例）。
- 终点指路文案断言并入 `tests/unit/advance-state.test.ts` 的 20 步全程走查。

## References

- DEC-033（`docs/20-decision-log.md`）— 决策 + 开放点裁决全文。
- `docs/rewind-cycle-proposal.md` — 已接受设计提案（含 §8 十项裁决记录）。
