# Amendment AM-013 — `ocn init` 默认接线 Claude Code（`--no-agent` 退出）

**Status**: Accepted (implemented)

## Date

2026-06-30

## Supersedes

None（additive，兑现 AM-006/DEC-031 Out-of-scope 里预留的 `ocn init --with-agent` 后续）。
不改写任何 frozen `docs/0X` 契约；core `initProject` 的 agent 无关语义不变。

## Applies to

- `src/cli/commands/init.ts` — 新增 `--no-agent` 选项与 `withAgentWiring()` 编排（CLI 层）。
- `tests/cli/init.test.ts` — 默认接线 / `--no-agent` 退出 / `--json` 携带 `agentSetup` 三例。
- `docs/quickstart.md` §2.1/§2.7 及 zh 镜像 §B.1/§B.7。
- `docs/20-decision-log.md` DEC-038。

不动：`src/core/init.ts`（保持 agent 无关、MCP-friendly）、`src/core/agent-setup/setup.ts`
（复用其幂等 core，逐字不变）、MCP 白名单（仍 7 工具）。

## 背景｜Why

`ocn agent setup` 写 `.claude/commands/ocn-next.md`，但 `ocn init` 不写。用户 init 后直接在
Claude Code 敲 `/ocn-next` → `Unknown command`，因为斜杠命令文件从未生成、而 setup 这步极易被忘。
"纪律靠机制不靠记忆"同样适用于接线本身。

## 决议｜Decision

`ocn init` 成功后**默认**调用 `setupAgentIntegration`（与 `ocn agent setup` 同一份 core，幂等）：

1. **默认开 + `--no-agent` 退出**（用户决策）。`ocn init --no-agent` 只写 `.ocoding/`，输出与改动前逐字一致。
2. **失效安全**（沿 DEC-031 §1）：init 已成功 ⇒ 接线失败不让 init 失败，降级为
   "运行 `ocn agent setup --force`" 提示，退出码仍 0；init 自身被阻时（如已初始化 exit 4）不触发接线。
3. **单一 CommandResult 信封**：复用 init `data`（保留 `stateFile`/`currentStateId`…，text/JSON 渲染不变），
   附加 `data.agentSetup`（`{ ok, files }` 或 `{ ok:false, code }`）。
4. **CLI 层编排，不下沉 core**：接线写配置（human-only），与 MCP 无关，放 CLI 保 core 纯净且接线永不经 MCP。
5. **非 SOP bump**（沿 AM-008/009/010/011 先例）。

## 验收｜Acceptance

- `ocn init` → 存在 `.claude/commands/ocn-next.md` + `.claude/ocn.md` + CLAUDE.md 含 `@.claude/ocn.md`
  + 审计含 `agent_setup_completed` + stdout 提及 `/ocn-next`。
- `ocn init --no-agent` → 有 `.ocoding/state.json`，无 `.claude/commands/ocn-next.md`，审计无 `agent_setup_completed`。
- `ocn init --json` → `data.currentStateId` 仍在，`data.agentSetup.ok === true`。
- 全量 1293 测试 + lint + typecheck 绿。
