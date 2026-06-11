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
4. 永不编辑 .ocoding/state.json，永不执行 ocn advance
5. 完成后用 \`ocn check\` 自查；通过后停下来报告，等人类 review 与 advance
`;
