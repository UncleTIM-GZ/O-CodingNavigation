// AM-006 — content of `.claude/ocn.md`, the OCN governance contract loaded
// into every Claude Code session via the CLAUDE.md `@.claude/ocn.md` import.
// OCN-owned: `ocn agent setup` regenerates it verbatim on every run.

export const OCN_MD_CONTENT = `# OCN 治理契约｜OCN Governance Contract

> 本文件由 \`ocn agent setup\` 生成并维护，请勿手工编辑（重跑会覆盖）。
> Generated and owned by \`ocn agent setup\`; do not hand-edit.

## 1. 文档优先｜Docs First

- \`docs/\` 下的设计文档是契约。代码与文档冲突时，**文档赢**。
- 要改方向，先改文档（须经人类确认），再改代码。
- 实现任何任务前，先读相关契约：数据模型、接口契约、逻辑主干
  （\`.ocoding/logic-graph.json\` 的执行顺序）、验收标准。

## 2. TDD 与 AC 追溯｜TDD & Acceptance Traceability

- 先写测试，再写实现（RED → GREEN → IMPROVE）。
- 每个测试必须能追溯到验收标准（acceptance criteria）中的一条 AC。
- 没有一条对应 AC 的失败测试，不准写实现代码。

## 3. 禁止动作｜Forbidden Actions

- 永不编辑 \`.ocoding/state.json\`（仅 OCN 引擎持锁写入）。
- 永不执行 \`ocn advance\` —— 推进状态是人类专属操作。
- 永不扩大当前 step 的范围；scope 文档即法律。
- 永不跳过或绕过 \`ocn check\` 门禁。Stop 钩子拦截时：按 fix hints
  修复后重试；仍不过则停下，把问题交还人类处理。
- 永不自主 merge / 发布 / 打 tag。

## 4. 每任务循环｜Per-task Loop

1. \`ocn brief\` —— 恢复上下文（当前位置、逻辑主干、就绪清单）。
2. \`ocn next-prompt --agent claude-code\` —— 取得本步任务简报，照此执行。
3. TDD 小步实现（增量 ≤100 行/次逻辑变更）。
4. \`ocn check\` —— 自查三道门（章节/逻辑主干/就绪）；blocked 则按 fix hints 修复。
5. 报告结果，停下等待人类 review 与 \`ocn advance\`。

> 提示：在 Claude Code 中输入 \`/ocn-next\` 可自动完成第 1–2 步并开始执行。
`;
