# Amendment AM-009 — Auto Mode（可选自动模式：human-only → human-authorized）

**Status**: Accepted (implemented)

## Date

2026-06-13

## Supersedes

None（additive，但**受控放宽**了一条治理裁决的表述）：DEC-033 与冻结契约中
"advance is human-only / 推进状态是人类专属操作" 改述为 **human-authorized**
——默认（手动模式）下仍然 human-only，且首次获得技术性拦截（诚实代理带
`OCN_ACTOR=ai_agent` 时被引擎直接拒绝）；只有当人通过 human-only 的
`ocn auto on` 显式授权后，AI 才在被授权的阶段内获得**触发权**。

## Applies to

- `docs/06-api-contract.md` — 新增 `ocn auto on|off|resume|status|trace`
  （均不进 MCP 白名单，§2.6 的 7 工具面不增不减）；`advance` / `task check`
  新增 `--actor` / `--rationale`；`rewind` 新增 `--actor`。退出码沿用既有
  稳定表（automation_* 拒绝 = `ERR_IO_OR_CONFIG`，exit 4）。
- `docs/05-data-model.md` §12.15 — 审计事件新增 `auto_mode_changed`（单事件
  类型，`data.action: on|off|resume|suspend`，沿 `cursor_rewind` 先例）；
  `advance_*` / `task_completed` / `cursor_rewind` 事件的 `actor` 字段开始
  实际承载 `ai_agent`。
- `.ocoding/` 存储布局 — `config.yaml` 新增用户所有的 `automation:` 块
  （人的授权意图；缺失/损坏 = 全手动，fail-safe）；新增运行时文件
  `automation-runtime.json`（熔断器机器状态；`cycle new` 随轮归档重置）。
- `src/core/automation/*`（新增）；`src/core/advance/*`、`src/core/task/*`、
  `src/core/rewind/rewind-state.ts`、`src/core/brief.ts`、两套 next-prompt
  生成器、`src/core/agent-setup/*`、`src/cli/commands/*`（修改）。

## Context

OCN 的 advance / task check 一直是 human-only。该约束的实现本质是治理授权
（MCP 白名单 + brief/next-prompt 治理文案 + 文档规定），不是技术锁死——AI
编码代理有终端，技术上一直能跑 CLI。随着 gate 栈（章节门 + 逻辑主干门 +
就绪门 + 任务台账门）足够硬化，"每一步都等人按回车"成为新的瓶颈：判定已经
是机器的，触发还是人的。

Owner 需求（2026-06-13）：两阶段可分别开启自动模式——第一阶段
（DISCOVERY→SPEC→DESIGN→PLAN，文档 00-11）、第二阶段（BUILD→VERIFY），
或两个一起全自动；手动保持默认。补充裁决（同日）：build plan 含多个 P
（里程碑）时，完成一个 P 后需自动回拨游标继续下一个 P，直至全部开发完成。

## Decision

### 1. 核心改述：触发权可委托，裁决权永不委托

自动化让渡的只是**触发权**：advance 仍 100% 通过完整 gate 栈，任务完成仍
只认冻结命令的 exit 0，回拨仍走目标合法性校验。所有"是否合格"的裁决都在
机器（gate / frozen command）手里，AI 只是那只按按钮的手——而按钮的授权来自
人开的 `ocn auto`。

### 2. 授权面（phase 归属按 advance 的目标态）

| 操作 | 手动模式 | phase1 auto | phase2 auto |
|---|---|---|---|
| advance（目标 ∈ DISCOVERY…PLAN） | 人 | **AI 可** | 人 |
| advance（目标 ∈ BUILD/VERIFY，含 PLAN→BUILD 跨界） | 人 | 人 | **AI 可** |
| advance（目标 ∈ SHIP/REFLECT） | 人 | 人 | 人（永不委托） |
| `task check` | 人 | 人 | **AI 可**（限 BUILD/VERIFY） |
| 里程碑回拨 `rewind --to step_build_plan`（从 BUILD/VERIFY 发起） | 人 | 人 | **AI 可** |
| 任意其他 rewind / cycle new / readiness waive / sop upgrade / advance override / `ocn auto` 本身 | 人 | 人 | 人（**硬禁区**） |

### 3. 开关 = 授权事件

`ocn auto on --phase <1|2|all>`（--phase 必填，杜绝误开全自动）/
`off [--phase]` / `resume` / `status` / `trace`。开关本身 human-only
（拒绝 ai_agent）、CLI-only；on/off/resume/suspend 写 `auto_mode_changed`
push 审计（before/after 载荷）；status/trace 为 pull 模式不写审计（§4.7）。
配置写入 config.yaml 走"区块外科手术"（只替换 `automation:` 块，保留用户
注释），锁 + temp + rename。

### 4. actor 通道（治理签名，非安全边界）

`--actor` flag > `OCN_ACTOR` env > 默认 `user`；`system` 为引擎内部专用。
`ocn agent setup` 向 `.claude/settings.json` 注入 `env.OCN_ACTOR=ai_agent`，
使代理的所有 Bash 调用自动带签名。**可伪造边界**：unset env 即可冒充人——
OCN 的威胁模型是诚实代理，actor 的价值是审计区分度与对诚实代理的硬约束；
开关事件本身因 human-only 而始终可信。

### 5. 熔断器（token 失控与带病推进的兜底）

同一 stepId 连续 N 次（默认 5，`automation.circuitBreaker.
maxConsecutiveGateFailures` 可配 1–20）ai_agent 门禁失败 → 自动模式
suspended（`auto_mode_changed`/suspend，actor=system），AI 的
advance/task check/rewind 一律拒绝（`automation_suspended`），**人不受任何
影响**；`ocn auto resume`（human-only）解除。门禁通过、换步、开关动作均
清零计数。熔断状态存独立运行时文件（暂停 ≠ 撤销授权：config 是人的意图，
runtime 是机器状态）。已知残余风险：task check 的 verify 失败暂不计入熔断
（靠 verify 命令自带 timeout 兜底），runtime 结构已预留扩展位。

### 6. 决策痕迹（复盘三层）

1. **AI 自述**：ai_agent 的 advance / task check 强制 `--rationale`
   （背景/依据/操作三要素；rewind 复用强制的 `--reason`），缺失即拒
   （`automation_rationale_required`）。
2. **引擎机器上下文**（不依赖 AI 诚实）：advance 成功事件附
   `{ gatePassed, taskLedger:{done,pending} }`；task_completed 附
   `{ frozenCommand, durationMs, exitCode }`。
3. **复盘视图**：`ocn auto trace [--limit N]` 从跨轮连续的审计 JSONL
   过滤 actor ∈ {ai_agent, system} 事件按时间线重放。

### 7. 里程碑循环（Owner 裁决 2026-06-13）

phase2 auto 下，AI 可执行**唯一一种形态**的回拨：`ocn rewind --to
step_build_plan`，且只能从 BUILD/VERIFY 发起——即 milestone-loop 的固定轨道
（P0 验证完 → 回拨 → 追加 P1 任务规格 → 重过门禁（done 台账保留）→ 继续
BUILD）。自动循环的停机条件：被拒（automation_* reason）、熔断、advance
目标越出授权阶段、终步且无剩余里程碑。任意其他回拨目标保持 human-only。

### 8. 治理文案动态化（单一事实源）

`governance-text.ts` 供给 brief + 两套 next-prompt：手动模式输出与 AM-009
之前**逐字节一致**；授权后 "AI must NOT advance" 替换为委托声明 + 硬禁区
重申；熔断时标注 SUSPENDED 并指路 resume。CLI next-prompt 在自动模式追加
`## Automation loop` 区块（含机器停机条件）；agent setup 模板改为
"advance/task check 是否可执行以 brief 治理段为准"。

### 9. 不 bump SOP 版本；MCP 面零变化

纯引擎/CLI 特性（沿 AM-008 先例）：不改任何 profile 的 sop/gates/artifacts
内容，0.3.0–0.5.0 pin 均适用。MCP 白名单 7 工具不增不减，测试断言钉死。

## Consequences

- **对"卖纪律"的影响**：默认手动 + 开关 human-only + 熔断 + 硬禁区 +
  判定权零让渡，五件套保住产品叙事——纪律不是放慢人，而是约束机器。
  反向加固：手动模式下诚实代理首次被技术拦截（此前只有文案约束）。
- **伪完成风险的对冲**：phase1 无人复核连推 4 个状态的风险，由 gate 栈硬
  校验 + （phase1-only 时）PLAN→BUILD 强制人审 + 文档推荐 phase1-only 起步
  对冲。
- **审计语义**：`actor` 字段从此有实际区分度；自动化轨迹可全程复盘。

## Verification

`tests/unit/automation-*.test.ts`（config/runtime/actor/authorization/
circuit-breaker/governance-text）、`tests/cli/auto*.test.ts`（开关/执法/
phase2 委托/治理文案）、`tests/e2e/auto-mode-phase1.test.ts`（AI actor 无人
值守走完 DISCOVERY→PLAN 全部 11 步、在 PLAN→BUILD 边界被拒、trace 重放全部
rationale）、`tests/unit/mcp-tool-registry.test.ts`（MCP 面不变断言）。
