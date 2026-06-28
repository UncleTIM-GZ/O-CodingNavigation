// AM-006 — content of `.claude/commands/ocn-next.md` (the `/ocn-next` slash
// command). OCN-owned: regenerated verbatim by `ocn agent setup`.
// Frontmatter + !`cmd` inline-bash inclusion per the Claude Code
// slash-commands contract.

export const OCN_NEXT_COMMAND_CONTENT = `---
description: 拉取当前 OCN 简报与下一步任务并按治理契约执行｜Pull the OCN brief + next-step prompt and execute it under the OCN contract
allowed-tools: Bash(ocn brief:*), Bash(ocn next-prompt:*), Bash(ocn check:*)
---

## OCN 上下文｜Context

- 项目简报｜Session brief:
!\`ocn brief\`

- 下一步任务｜Next prompt:
!\`ocn next-prompt --agent claude-code\`

## 任务｜Task

按上面的 next prompt 执行当前 step 的工作，全程遵守 @.claude/ocn.md 的治理契约：

1. 先复述本任务要满足的契约与验收标准（此步不写代码）
2. TDD：先写能追溯到 AC 的失败测试，再实现到通过，再重构
3. 只动本任务范围内的文件，不扩 scope
4. 永不编辑 .ocoding/state.json；advance/task check 是否可执行以 brief 治理段为准
   （默认禁止；自动模式开启时按 Automation loop 区块以 OCN_ACTOR=ai_agent 执行）
5. 完成后用 \`ocn check\` 自查
6. 自动模式｜Auto mode：在以 OCN_ACTOR=ai_agent 触发 task check / advance **之前**，
   必须用 Task 工具派一个**独立、全新上下文**的 code-reviewer 子代理，以**资深人类专家**视角，
   对照本任务的契约 + 关联 AC + 改动 diff 校验代码，给出 PASS/FAIL 与具体问题；
   FAIL 则记录问题→在范围内修复→重跑 \`ocn check\`→复审，最多修 3 次，仍不过就把遗留问题写进 --rationale（并 \`ocn log\`）后继续。
   派 harness 内子代理是本步要求的动作，不触发 next prompt 里"禁止调用外部 LLM/网络"与"需要调用 LLM/外部 API 即停机"两条
   （二者约束的是任务自身的外部调用，而非你的进程内评审）；闸门（gate）才是最终裁决，评审结论只覆盖当前改动，改动变化才需复审。
7. 手动模式停下来报告等人类 advance，自动模式按停机条件自行推进或交还
`;
