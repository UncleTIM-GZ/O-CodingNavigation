# Amendment AM-016 — `ocn stop`：终止 OCN 驱动（彻底卸载，单向）

**Status**: Accepted (implemented)

## Date

2026-07-05

## Supersedes

None（additive；引擎/CLI 特性，**非 SOP bump**，沿 AM-008/009/010/011/013 先例）。
不改写任何 frozen `docs/0X` 契约；不新增 MCP 工具（白名单仍 7 个）。

## Applies to

- `src/types/state.ts` — `ProjectState` 新增 `stoppedAt: string \| null`（`.default(null)`，向后兼容）。
- `src/types/audit.ts` — 审计事件枚举新增 `project_stopped`（单类型，result `success\|failed`）。
- `src/core/stop/stopped.ts` — 共享 `isStopped()` 谓词 + 停止横幅文案（新建）。
- `src/core/stop/stop-project.ts` — `stopProject()` 引擎（新建，照抄 `cycle-new.ts` 骨架）。
- `src/core/agent-setup/teardown.ts` + `settings-merge.ts` 的 `unmergeClaudeSettings` — 卸载注入面（`setupAgentIntegration` 的逆操作）。
- `src/cli/commands/stop.ts` + `src/cli/index.ts` — `ocn stop` 命令（human-only，`--yes` 强制）。
- 各 AI 面向面 honor `stoppedAt`：`brief.ts`、`advance/advance-state.ts`、`agent-hooks/stop-hook.ts`、
  `prompt/generate-next-prompt.ts`（MCP）、`status.ts`、`execution-navigator/{ocn-state-reader,next-prompt-assemble,types}.ts`。
- 测试：`stop-project` / `agent-setup-teardown` / `stop-surfaces` / `schema-project-state`（back-compat）单测 + `tests/e2e/stop-walkthrough.test.ts`。

不动：`src/core/init.ts` 语义（只多写一个 `stoppedAt: null`）、`governance-text.ts`（避开其 manual-mode
byte-identical 契约——停止分支在各生成器最早处拦截，不进 governance 文本）、MCP 白名单、frozen 契约。

## 背景｜Why

OCN 没有"结束"状态：走到 REFLECT 终点后 `ocn advance` 只会永远 `blocked` 并指向 `cycle new` / `rewind`
（`advance-state.ts` 终点分支），OCN 永远在驱动。用户的真实场景是"规划文档写完就想停掉 OCN、进入自由自我
开发"，而 OCN 通过 5 个注入面持续把 AI 拉回 `.ocoding/*.json` 工作流，其中 Stop hook 还会在 AI 想收回合时
硬性 `{"decision":"block"}` 逼它继续。用户要求："增加一个 OCN 的终止命令，告诉 `.claude/ocn.md` 等系统
文件不要再进入 json 文件。"

## 决议｜Decision

新增 `ocn stop`：**彻底卸载、单向**，两条杠杆同时用——

1. **运行时标记（机器真相）**：`state.json` 加 `stoppedAt`（ISO8601 UTC；null=仍驱动）。锁内 stale-check
   后经 `writeStateUnlocked` 写入，审计 `project_stopped`。每个 AI 面向面在最早处 `isStopped` 拦截 →
   转静默（brief/next-prompt/status）或礼貌拒绝（advance→`ERR_STATE_MACHINE`）；Stop hook stopped 即 allow
   （不再逼 AI 继续）。CLI 与 MCP（`navigator.brief`/`generate_next_prompt`）同步静默。
2. **物理卸载（移除指令文件）**：`teardownAgentIntegration` 复用 setup 写入的同一批 marker 精准移除：删
   `.claude/ocn.md`、`.claude/commands/ocn-next.md`；`unmergeClaudeSettings` 只摘 command 含 `ocn hook`
   的 hook 组与 `env.OCN_ACTOR===ai_agent`；去掉 `CLAUDE.md` 的 `@.claude/ocn.md` 导入行——用户其它内容
   逐字保留。幂等（缺文件即跳过）、失效安全（malformed settings 不动）。

### Sub-decisions

1. **彻底卸载 + 单向**（用户决策）：不做内建 `ocn attach` 回退。要回来需重跑 `ocn agent setup` 重新接线
   （属文档外手动路径）。命名 `ocn stop`（用户选定，对应"终止命令"直白语义）。
2. **从任意状态可执行**：重点就是规划做完即可脱离，不必走到 REFLECT。游标不动、docs/ 不动、审计 JSONL 不动。
3. **非 SOP bump**：像 rewind/cycle/auto 是引擎/CLI 生命周期特性，不新增 backbone、不动 profile。
4. **human-only、CLI-only、绝不进 MCP**：`exitIfAiAgent` 守卫；`--yes` 强制（破坏性/终局，缺失 →
   `ERR_IO_OR_CONFIG` exit 4，沿 `cycle new` 先例）。加入"硬人类专属区"。
5. **teardown 失效安全**：state 已提交后卸载失败不回滚，降级为审计 `teardownWarning`（沿 AM-013 init wiring
   的 fail-open）。
6. **只碰 OCN 自己拥有/注入的文件**：仓库根手写 `CLAUDE.md` 正文、Claude Code 的 `memory/*.md` 非 OCN 生成物，
   不改——它们本就不指示读 `.ocoding/json`（只有注入的 `.claude/ocn.md` 才指向 logic-graph/state.json）。

## 验收｜Acceptance

- `ocn stop`（无 `--yes`）→ exit 4，`stoppedAt` 仍 null。
- `ocn stop --yes` → exit 0；`state.json.stoppedAt` 非空；`.claude/ocn.md` 与 `/ocn-next` 已删、
  settings.json 无 `ocn hook`/`OCN_ACTOR`、CLAUDE.md 无 `@.claude/ocn.md`；审计一条 `project_stopped` success。
- `ocn brief` → exit 0 但显示"已终止"横幅、无工作流下一步；`ocn advance` → exit 3；Stop hook → allow。
- teardown 保留用户自定义 hook / settings 其它键 / CLAUDE.md 用户正文；幂等；malformed settings 不动。
- 老 `state.json`（无 `stoppedAt`）仍解析（默认 null）。
- 全量 1353 测试 + lint + typecheck 绿（新增 19 例，含默认 0.3.0 e2e `stop-walkthrough`）。
