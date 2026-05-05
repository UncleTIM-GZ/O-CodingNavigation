# O'CodingNavigator (OCN) — 一页纸介绍 + 操作手册

> 版本：`0.2.0-beta.1` · 适用范围：tester / 内部使用 · 状态：beta，非 GA

---

## 是什么

本地优先、MCP-first、状态机驱动的 AI Coding 工作流操作系统。CLI `ocn` + MCP 服务 `ocn-mcp`。所有数据落本地文件（Markdown + JSON + JSONL + YAML），无云、无数据库、不调 LLM。Apache-2.0。

当前版本：`0.2.0-beta.1`（npm `latest` 与 `beta` 同指此版）。仅在 Claude Desktop on Windows + WSL2 验证。Cursor / Cline 未验证。仍是 beta，不是 GA。

---

## 解决什么痛点

| 痛点 | 表现 | OCN 应对 |
|---|---|---|
| **Lost（迷路）** | 没人知道项目当前在哪一步 | 状态机 + `ocn status` |
| **Drift（漂移）** | Agent 输出越走越偏离需求 | 强门禁 + AC 校验，gate 不通过不能推进 |
| **Amnesia（失忆）** | 新 chat 必须重头讲一遍背景 | `ocn brief` 给 Agent 灌当前 step 上下文 |
| **False-completion（假完成）** | 文档存在但缺少必需 section，Agent 仍宣称"完成" | required-section 校验，gate 拦截 |
| **实现阶段卡死** | LFG / Codex / Claude Code 在 PR / CI / 修复循环里停滞 | Execution Navigator 6 命令读证据、出下一轮简报 |
| **Verdict 草率** | 仅凭"CI 绿了"就 merge | `verdict draft` 综合 git / PR / AC / verify 信号，倾向保守 |
| **审计缺失** | AI 改完什么、何时推进的，事后难复盘 | 所有 push 事件双轨写入 `.ocoding/audit-events.jsonl` 与 `docs/22-audit-trail.md` |

---

## 典型落地场景

1. **新项目从 0 到 1** — 用 Planning Gatekeeper 锁定 brief / scope / PRD / AC / 架构 / build plan，再开始实现。前期不省，后期不返工。
2. **多 Agent / 多 session 接力** — 每个新 session 调 `ocn brief` 或 `ocn next-prompt`，把当前 step 必需 section 与 governance 直接喂给 Agent，不用人再解释一遍。
3. **PR 评审前** — 用 `evidence map` 看 AC 覆盖、`verify status` 看就绪度、`verdict draft` 拿草案，再做人工裁决；避免凭直觉 merge。
4. **CI 失败 / 实现卡住** — `ocn next-prompt --mode fix --pr <n>` 生成限定 scope（allowed files / forbidden actions / required commands / stop conditions）的下一轮 Agent 简报，防止 Agent 改飞。
5. **跨人 / 跨周交接** — 接手人跑 `ocn status` + `ocn brief` 即知项目位置；不用读完整 chat 历史。
6. **审计与合规追溯** — 每次 advance / gate / artifact 创建都有 audit 事件，可对外证明决策路径。

---

## 两阶段模型

| 阶段 | 角色 | 时机 |
|---|---|---|
| Planning Gatekeeper | 实现前锁定范围、架构、验收、build plan | 项目启动 → `state_plan` 关闭 |
| Execution Evidence Navigator | 实现中读取 git / GitHub PR / 验收 / CI 证据 | `state_plan` 关闭后 |

前半段强门禁，后半段只读证据归纳。**两段都不替你写代码、不替你做最终决策。**

---

## 安装

```bash
npm install -g o-coding-navigation        # 推荐
npm install -g o-coding-navigation@beta   # 显式固定 beta
ocn --version                              # → 0.2.0-beta.1
```

要求：Node.js ≥ 20。

MCP 接入 Claude Desktop（Windows + WSL2）：在 `%APPDATA%\Claude\claude_desktop_config.json` 写入

```json
{ "mcpServers": { "ocn": { "command": "wsl.exe", "args": ["-e", "ocn-mcp"] } } }
```

重启 Claude Desktop。

---

## Stage 1 — Planning Gatekeeper 命令

| 命令 | 作用 |
|---|---|
| `ocn init [--tier minimal]` | 初始化 `.ocoding/` 与 `docs/` 骨架 |
| `ocn status` | 当前 state / step / artifact 路径 |
| `ocn doc create <type>` | 从模板写出 19 个 artifact 之一 |
| `ocn check` | 检查当前 step artifact 必需 section |
| `ocn gate` | 只读门禁聚合，不改 state |
| `ocn advance` | gate 通过则推进 step；锁保护，原子写入 |
| `ocn brief` | 当前 step 的 AI session brief |

退出码：`0` OK · `1` gate failed · `2` artifact 无效 · `3` 状态机错误 · `4` IO/lock · `5` SOP 版本不兼容。

---

## Stage 2 — Execution Evidence Navigator 命令

**全部只读，无 LLM，无写盘，无 GitHub 写操作。** `gh` 调用仅在显式带 `--pr <n>` 时发生，且仅 `gh pr view` / `gh auth status`。

| 命令 | 输出 |
|---|---|
| `ocn exec status` | 本地 git + OCN 状态快照 |
| `ocn github analyze-pr <n>` | PR 元信息、改动、checks、reviews |
| `ocn evidence map [--pr <n>]` | AC → 证据映射（`evidence-found` / `candidate` / `missing-evidence` / `needs-human-review`） |
| `ocn next-prompt [--agent claude-code\|codex\|lfg\|generic] [--mode continue\|fix\|verify\|review] [--pr <n>] [--issue ...]` | 下一轮 Agent 简报（9 个固定章节，确定性输出） |
| `ocn verify status [--mode local\|pr\|combined] [--pr <n>]` | 验证就绪度（`ready` / `partial` / `blocked` / `pending` / `no-verification-data`） |
| `ocn verdict draft [--mode ...] [--pr <n>]` | verdict 草案（`continue-work` / `request-changes` / `ready-for-review` / `ready-to-merge` / `hold-for-manual-review`） |

所有命令支持 `--json` 输出结构化 envelope。

---

## 最小使用路径

### 1. 规划阶段

```bash
mkdir my-project && cd my-project
ocn init
ocn doc create project-brief    # 编辑 docs/00-project-brief.md
ocn gate && ocn advance         # gate 过则推进
```

循环 `doc create → gate → advance`，直到 00–10 全部完成。

### 2. 实现阶段

在你常用的 IDE / Agent 里写代码与开 PR。OCN 不参与编码本身。

### 3. 执行证据导航

```bash
ocn exec status                                # 本地状态
ocn github analyze-pr 123                      # PR 证据
ocn evidence map --pr 123                      # AC 覆盖
ocn next-prompt --agent claude-code --pr 123   # 下一轮 Agent 简报
ocn verify status --mode combined --pr 123     # 验证就绪度
ocn verdict draft --mode combined --pr 123     # verdict 草案
```

### 4. 合并前

人工审阅 verdict 草案与证据。OCN 倾向保守：宁可给 `continue-work` 或 `hold-for-manual-review`，不轻易给 `ready-to-merge`。

---

## 边界

- 不生成代码、不替你做最终决策、不发外网请求（除可选 `--pr` 时调 `gh`）
- 不动 git 历史、不写 PR 评论、不动 npm / CI / release
- MCP 暴露 7 个只读/准备工具；`advance` / `capture_decision` / `reset` / `force_release_lock` **不**暴露给 MCP，必须人工 CLI 调用
- 仅 Claude Desktop on Windows + WSL2 已验证；其他 Host 不在支持承诺范围内
- `ocn doctor` / `ocn reset` / `ocn baseline` / SOP 版本升级工具未实现
