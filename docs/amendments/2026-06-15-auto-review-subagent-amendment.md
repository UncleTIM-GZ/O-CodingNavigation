# Amendment AM-011 — Auto-mode 独立专家评审子代理（触发前的尽职调查）

**Status**: Accepted (implemented)

## Date

2026-06-15

## Supersedes

None（additive，细化 AM-009/DEC-034）。不改写任何 frozen `docs/0X` 契约，不动 AM-009
的裁决/触发分界。

## Applies to

- `src/core/automation/governance-text.ts` — `automationLoopLines()` 与
  `governanceReminder()` 的 **auto 分支**（manual 分支字节对齐，由
  `tests/unit/automation-governance-text.test.ts` pin 死，不动）。
- `src/core/agent-setup/templates/ocn-next-command.ts` — `/ocn-next` 命令模板
  （由 `ocn agent setup` 生成；现有仓库需重跑 setup 刷新
  `.claude/commands/ocn-next.md`）。

## 背景｜Context

AM-009 把 auto 模式的分界定为 **"触发权可委托，裁决权永不委托"**：gate + 冻结 verify
命令说了算，AI 只是在 gate 过后按触发键（`ocn advance` / phase2 的
`ocn task check` + 里程碑 rewind）。但 auto 模式跨里程碑/跨步之间**没有人类把关**——
被跳过的恰是"人类专家看一眼这份改动到底对不对"这一环。原治理文本对此**零提示**，
甚至 `FORBIDDEN_ACTIONS` 里 "Do not call any LLM API or external network service"
字面上会让诚实的 agent **拒绝**派子代理。净效果：gate 能拦住"缺章节/逻辑未接线/任务
未完成"，但拦不住"章节齐全、gate 全绿、却在专家眼里实现错了"的改动在无人值守下被推过。

## 决策｜Decision

1. **触发前强制独立评审**：auto 模式下，AI 在行使**任何** ai_agent 触发键之前
   （phase1 = `ocn advance` 前；phase2 = `ocn task check` 前 + `ocn advance` 前），
   必须派一个**独立、全新上下文**的子代理，以**资深人类专家**视角，拿到
   〔本 step 要求 + 关联 AC ids + 改动 diff/变更文件 + OCN 契约〕，返回
   **PASS/FAIL + 具体问题**。此评审**替代被跳过的人类审查**。

2. **裁决权零变更**：评审是**建议性尽职调查**，**不是**硬门——deterministic gate +
   冻结 verify 命令仍是唯一裁决。评审 PASS 不放宽 gate，评审未过也不额外硬卡
   （见下条有界环）。"裁决权不委托"原样不变。

3. **FAIL = 有界修复环**：记录问题 → 在任务范围内修复 → 复审，**最多 3 次修复**；
   3 次后仍未过，则把**遗留问题写进 `--rationale`（并 `ocn log` 记一笔）后继续进入
   下一步**。避免无界自旋；遗留问题进审计留痕，gate 仍是最后一道。

4. **红线澄清（防自锁）**：派 **harness 内子代理**（Claude Code Task/Agent 工具，
   无外网）是 auto 模式下被**要求**的动作。豁免文案**逐字点名**同一份 next-prompt
   里并存的两条——`FORBIDDEN_ACTIONS` 的 "Do not call any LLM API or external network
   service" 与 `STOP_CONDITIONS` 的 "LLM or external API call becomes necessary"
   ——并界定其只约束**任务自身**的外部调用、不约束进程内评审，避免严格按字面执行的
   agent 在停机条件上自锁。该澄清只放在 auto-only 的 loop 文本里，**不动**共享常量
   `FORBIDDEN_ACTIONS` / `STOP_CONDITIONS` / `AGENT_OVERLAYS`（避免误伤 manual 与
   pin 死的契约）。

5. **不做无用功**：评审结论只覆盖**当前改动**；BUILD 内 task check 与 advance 之间
   若改动未变，复用同一结论，不强制二次全量评审（"改动变化才需复审"）。

6. **纯文本层 / 非 SOP bump**（沿 AM-008/AM-009/AM-010 先例）：不动状态机、schema、
   退出码、审计事件类型；**MCP 白名单 7 工具不增不减**。manual 模式输出与
   AM-011 前**逐字一致**（评审/子代理字样仅在 auto 模式出现）。

## 后果｜Consequences

把 auto 模式"无人值守跨步"里缺失的人类专家把关，以"AI 自带的独立评审尽职调查"补上，
堵住"gate 全绿但实现错了"这一类在无人值守下被推过的改动。代价是 auto 模式每次触发前
多一道子代理评审（最多 3 次修复环），换取无人值守推进的可信度；评审始终建议性，
gate 仍是最终裁决，分界不变。
