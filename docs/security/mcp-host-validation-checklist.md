# OCN MCP — External Host Validation Checklist

> Status: Checklist prepared. External MCP Host validation is **deferred** until a real host is available ([DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)). This file is **not** a validation report.

> Companion to a future PR D (External MCP host validation) per [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](../plans/2026-04-28-ga-prep-gap-review-plan.md) §3.3.
> The validation report (`docs/reports/<DATE>-mcp-external-host-validation-report.md`) and PR D itself are **not** produced from this checklist alone — they are produced *after* the maintainer has run the steps below in a real MCP host and pasted the raw evidence back.

---

## 1. Purpose｜目的

This checklist is for **real MCP Host validation**.

- It is NOT a self-smoke test.
- It is NOT an SDK client simulation.
- It is NOT a fabricated validation report.

本 checklist 用于**真实 MCP Host 验证**：

- 它不是 self-smoke。
- 它不是 SDK client 模拟测试。
- 它不是伪造的 validation report。

> A PR D external validation report can only be written **after** real host evidence is collected.
> 只有在真实宿主证据采集完成后，才能生成 PR D external validation report。

---

## 2. Supported hosts｜支持宿主

In priority order:

1. **Claude Desktop** (preferred)
2. **Cursor**
3. **Cline** (VS Code extension)

> At least one real host must be validated before PR D can proceed.
> If none of the three hosts can be run, PR D remains **blocked**.

> 至少需要验证一个真实 host，PR D 才能继续。
> 如果三个 host 都无法运行，PR D 继续阻塞。

---

## 3. Validation mode｜验证模式

This checklist follows **Option A** of the GA Prep PR D blocker resolution:

- The user runs the real MCP host locally.
- Claude Code (CC) only provides this checklist and later structures the evidence.

用户在真实 MCP host 上执行验证。CC 只提供 checklist，并在用户贴回原始证据后整理报告。

**Forbidden in this validation cycle:**

- Do NOT label an SDK stdio self-test as external host validation.
- Do NOT fabricate `tools/list` or tool-call outputs.
- Do NOT create PR D before raw host evidence is provided.

---

## 4. Preflight｜前置准备

### 4.1 Repo state

- [ ] OCN repo is cloned locally on the same machine that will run the MCP host.
- [ ] PR #11 (MCP `projectRoot` validation) is merged into `main`.
- [ ] Local `main` is up to date.
- [ ] Node.js ≥ 20 is available.
- [ ] `npm install` has succeeded.
- [ ] `npm run build` has succeeded.

```bash
cd <ABSOLUTE_PATH_TO_OCN_REPO>
git checkout main
git pull
npm install
npm run build
npm run lint
npm run typecheck
npm run test
```

Expected after `npm run test`: **394 tests passed across 63 files** (or higher if a later PR has merged).

### 4.2 Confirm the MCP server entrypoint

Do NOT guess the path. Confirm what the repo actually ships:

```bash
cd <ABSOLUTE_PATH_TO_OCN_REPO>
grep -A 4 '"bin"' package.json
ls -la dist/mcp/
```

Expected `package.json` excerpt:

```json
"bin": {
  "ocn": "dist/cli/index.js",
  "ocn-mcp": "dist/mcp/index.js"
}
```

Expected `dist/mcp/` listing must include `index.js` (the runnable bin) and `server.js` (factory module).

> The canonical runnable entry is `dist/mcp/index.js`. `dist/mcp/server.js` is the McpServer factory module and is NOT a standalone entrypoint. Configure your host to use `dist/mcp/index.js` (or the `ocn-mcp` bin if `npm link` / `npm install -g` is in effect).

### 4.3 Confirm MCP server starts standalone

```bash
node <ABSOLUTE_PATH_TO_OCN_REPO>/dist/mcp/index.js
```

Expected: the process starts and waits silently on stdin (it is now reading JSON-RPC frames). Press `Ctrl+C` to exit. **No stderr output should appear on the success path.**

If you see stderr output, capture it verbatim — it is evidence for §9.

---

## 5. Create disposable test project｜创建一次性测试项目

> **Use a disposable directory.** Do not point the host at a real project.

```bash
TEST_ROOT=/tmp/ocn-mcp-demo
rm -rf "$TEST_ROOT"
mkdir -p "$TEST_ROOT"
cd "$TEST_ROOT"
```

Initialise OCN. Use the `ocn` bin if it is on PATH (i.e. `npm link` was run from the repo); otherwise call the built CLI directly:

```bash
# Option A: ocn is on PATH
ocn init
ocn doc create project-brief

# Option B: call the built CLI directly
node <ABSOLUTE_PATH_TO_OCN_REPO>/dist/cli/index.js init
node <ABSOLUTE_PATH_TO_OCN_REPO>/dist/cli/index.js doc create project-brief
```

Now write a minimal Project Brief that satisfies the gate's 4 required sections:

```bash
cat > /tmp/ocn-mcp-demo/docs/00-project-brief.md <<'EOF'
# Project Brief｜项目简报

## Problem｜问题
We need a disposable project to validate OCN MCP host integration.
我们需要一个一次性项目，用于验证 OCN MCP 宿主集成。

## Goal｜目标
Validate that OCN MCP tools can read project state and run gates.
验证 OCN MCP tools 能读取项目状态并运行 gate。

## Users｜用户
Maintainer and AI coding agent.
维护者和 AI coding agent。

## Success Criteria｜成功标准
- MCP host can list OCN tools.
- MCP host can call where_am_i.
- MCP host can call brief.
- MCP host can call run_gate.
- Invalid projectRoot returns structured error.
EOF
```

Verify the gate passes locally before involving the host:

```bash
cd /tmp/ocn-mcp-demo

# Option A: ocn is on PATH
ocn status
ocn gate --json
ocn brief

# Option B: call the built CLI directly
node <ABSOLUTE_PATH_TO_OCN_REPO>/dist/cli/index.js status
node <ABSOLUTE_PATH_TO_OCN_REPO>/dist/cli/index.js gate --json
node <ABSOLUTE_PATH_TO_OCN_REPO>/dist/cli/index.js brief
```

Expected: `status` reports `state_discovery / step_project_brief`; `gate --json` returns `ok: true, code: "OK"`. If `gate` returns `ok: false`, the brief above is missing required content — fix it before continuing.

The absolute path of the test project is what you'll pass to the host as `projectRoot`. Record it now:

```
TEST_PROJECT_ROOT = /tmp/ocn-mcp-demo
```

(On Windows / macOS, adjust the directory accordingly. Whatever you use, the value must be an **absolute** path.)

---

## 6. Claude Desktop configuration｜Claude Desktop 配置

### 6.1 Config file path

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | Claude Desktop is not officially supported on Linux. If your build provides a config path, use it; otherwise validate via Cursor or Cline (§7 / §8). |

### 6.2 Config block

Pick **one** of the two forms below. Both are valid. Replace `<ABSOLUTE_PATH_TO_OCN_REPO>` with the real path to your local OCN clone.

**Form 1 — direct invocation of the built bin** (most reliable, no global install):

```json
{
  "mcpServers": {
    "ocn": {
      "command": "node",
      "args": [
        "<ABSOLUTE_PATH_TO_OCN_REPO>/dist/mcp/index.js"
      ]
    }
  }
}
```

**Form 2 — invocation via the `ocn-mcp` bin** (only after `npm link` from the repo, or `npm install -g`):

```json
{
  "mcpServers": {
    "ocn": {
      "command": "ocn-mcp",
      "args": []
    }
  }
}
```

> Some platforms (notably macOS GUI apps) do not see the same `PATH` your shell sees. If Form 2 fails with "command not found", switch to Form 1. Form 1 is recommended for first-time validation.

### 6.3 Apply the config

1. Save the JSON above.
2. **Fully quit** Claude Desktop. On macOS: `Cmd-Q` (the menu-bar Quit), not just close the window. On Windows: right-click the tray icon → Quit, or Task Manager → end the `Claude Desktop` process.
3. Reopen Claude Desktop.
4. Inspect the host's MCP / tool-list view. The `ocn` server should appear, and 7 tools should be listed under it.

---

## 7. Cursor configuration｜Cursor 配置

> Cursor's MCP configuration UI and storage location vary by Cursor version. **Do not edit blindly.** Use Cursor Settings → MCP (or the current Cursor MCP configuration UI) if available. If Cursor exposes a `mcp.json` (or similar) file, add the same server definition shown below.

### 7.1 Config block

**Form 1 — direct invocation:**

```json
{
  "mcpServers": {
    "ocn": {
      "command": "node",
      "args": [
        "<ABSOLUTE_PATH_TO_OCN_REPO>/dist/mcp/index.js"
      ]
    }
  }
}
```

**Form 2 — via `ocn-mcp` bin:**

```json
{
  "mcpServers": {
    "ocn": {
      "command": "ocn-mcp",
      "args": []
    }
  }
}
```

### 7.2 Apply the config

1. Save the JSON via Cursor's UI or its MCP config file.
2. Restart Cursor (full quit + reopen — not just reloading the window).
3. Open the MCP / tool-list view. The `ocn` server should appear with 7 tools.

> Only document Cursor as **verified** in §9 if the validation actually runs *inside Cursor*. Do not mark Cursor verified based on Claude Desktop evidence.

---

## 8. Cline configuration｜Cline 配置

> Cline is a VS Code extension. Its MCP config path varies by VS Code and extension version. Use Cline's MCP settings UI if available. If Cline exposes a JSON-based MCP server configuration, add the same server definition shown below.

### 8.1 Config block

**Form 1 — direct invocation:**

```json
{
  "mcpServers": {
    "ocn": {
      "command": "node",
      "args": [
        "<ABSOLUTE_PATH_TO_OCN_REPO>/dist/mcp/index.js"
      ]
    }
  }
}
```

**Form 2 — via `ocn-mcp` bin:**

```json
{
  "mcpServers": {
    "ocn": {
      "command": "ocn-mcp",
      "args": []
    }
  }
}
```

### 8.2 Apply the config

1. Save via Cline's settings UI or its MCP config file.
2. Reload VS Code (`Developer: Reload Window` from the command palette is usually enough; if not, fully quit + reopen).
3. Open Cline and trigger an MCP-aware operation (or check Cline's tool-list view).

> Only document Cline as **verified** in §9 if the validation actually runs *inside Cline*. Do not mark Cline verified based on Claude Desktop or Cursor evidence.

---

## 9. Evidence capture format｜证据采集格式

Paste the following sections back to the chat **verbatim**. If a field is unavailable, write `Not available` — do **not** guess. If a host shows a value you cannot decipher, paste it raw and I'll structure it later.

### 9.1 Host info｜宿主信息

```
Host:                  (Claude Desktop | Cursor | Cline | other)
Host version:          (string from the host's About dialog, or "Not available")
OS:                    (macOS 14.5 / Windows 11 23H2 / Ubuntu 22.04 / ...)
Local machine:         (e.g. MacBook Pro M3, Apple Silicon)
Node version:          (`node --version` output)
OCN repo path:         (absolute path)
OCN commit:            (`git -C <repo> rev-parse HEAD`)
MCP server command:    (Form 1 with full args, or Form 2 with bin name)
Test projectRoot:      (e.g. /tmp/ocn-mcp-demo — absolute path)
```

### 9.2 `tools/list` evidence｜工具列表证据

Open the host's tool-list view (or use Prompt 1 in §10) and paste **the exact tool names you see** under the `ocn` server.

```
Tools visible:
- (one tool name per line, exactly as shown by the host)
- ...

Allowed tools present (mark yes/no):
- navigator.where_am_i:           yes/no
- navigator.brief:                yes/no
- navigator.run_gate:             yes/no
- navigator.create_artifact:      yes/no
- navigator.capture_log:          yes/no
- navigator.detect_sop_version:   yes/no
- navigator.generate_next_prompt: yes/no

Forbidden tools absent (mark yes/no — "yes" means the tool is correctly NOT listed):
- navigator.advance_phase:        yes/no
- navigator.capture_decision:     yes/no
- navigator.reset_project:        yes/no
- navigator.force_release_lock:   yes/no
```

### 9.3 Tool-call evidence｜工具调用证据

Use Prompts 2–5 from §10. For each call, paste:

```
Tool:           navigator.where_am_i
Input:          { "projectRoot": "<TEST_PROJECT_ROOT>" }
Raw output:     <paste the host's full response, including the JSON envelope, verbatim>
Observed ok:    true/false
Observed code:  OK | ERR_GATE_FAILED | ERR_IO_OR_CONFIG | ...
Notes:          (anything the host showed in addition — warnings, retries, latency)
```

Repeat the block for `navigator.brief`, `navigator.run_gate`, and the invalid-`projectRoot` test (Prompt 5).

### 9.4 stderr / protocol cleanliness｜协议清洁度

```
Did the host show any MCP protocol error?         yes/no — if yes, paste verbatim
Did the host show any JSON-RPC framing error?     yes/no — if yes, paste verbatim
Did stderr pollution appear in the host log?      yes/no — if yes, paste verbatim
Did the OCN server crash or restart?              yes/no — if yes, paste verbatim
```

> Where to find the host's logs:
> - Claude Desktop (macOS): `~/Library/Logs/Claude/`
> - Claude Desktop (Windows): `%APPDATA%\Claude\logs\`
> - Cursor: see Cursor's Output panel for "MCP" or via its settings.
> - Cline: see VS Code's Output panel for "Cline" / "MCP".

---

## 10. Suggested prompts to run inside the host｜宿主内可复制测试 Prompt

Paste these one at a time into the host's chat. Replace `<ABSOLUTE_TEST_PROJECT_ROOT>` with your actual test path (e.g. `/tmp/ocn-mcp-demo`).

### Prompt 1 — tools list

```
List the available OCN MCP tools. Do not call them yet. Show the exact tool names you can see.
```

### Prompt 2 — `where_am_i`

```
Call navigator.where_am_i with projectRoot="<ABSOLUTE_TEST_PROJECT_ROOT>". Return the raw result without modification.
```

### Prompt 3 — `brief`

```
Call navigator.brief with projectRoot="<ABSOLUTE_TEST_PROJECT_ROOT>". Return the raw result without modification.
```

### Prompt 4 — `run_gate`

```
Call navigator.run_gate with projectRoot="<ABSOLUTE_TEST_PROJECT_ROOT>". Return the raw result without modification.
```

### Prompt 5 — invalid `projectRoot`

```
Call navigator.where_am_i with projectRoot="../not-a-valid-project". Return the raw result. Do not retry with a corrected path. Do not interpret or summarise — return the structured envelope verbatim.
```

### Prompt 6 — forbidden-tool check

```
Check whether any of these tools are available: navigator.advance_phase, navigator.capture_decision, navigator.reset_project, navigator.force_release_lock. Do not call them. Just report whether each appears in the available tools list.
```

### Prompt 7 — protocol cleanliness

```
Did the host show any MCP protocol error, JSON-RPC framing error, stderr pollution warning, or server crash during these calls? Report exactly what you observed. Quote any error message verbatim.
```

---

## 11. Expected outputs｜预期输出

### 11.1 `navigator.where_am_i`

```
ok:    true
code:  OK
data:  includes currentStateId (e.g. "state_discovery")
data:  includes currentStepId  (e.g. "step_project_brief")
```

> If the disposable project is at a different state because you advanced it earlier, the IDs will differ — that is fine, only the **shape** is asserted.

### 11.2 `navigator.brief`

```
ok:    true
code:  OK
data or message: includes current-step context
data or message: includes governance reminder / uncertainty policy markers
```

### 11.3 `navigator.run_gate`

```
ok:    true OR false   (depending on gate state)
code:  OK              when ok=true
code:  ERR_GATE_FAILED when ok=false (e.g. required sections missing)
result: structured envelope, no raw exception
```

> If you wrote the Project Brief from §5 verbatim, the gate should pass (`ok=true`).

### 11.4 invalid `projectRoot`

```
ok:    false
code:  ERR_IO_OR_CONFIG
message.en: present, non-empty
message.zh: present, non-empty
no raw exception, no Node.js stack trace, no host-level "tool crashed" indicator
```

---

## 12. Pass / Conditional Pass / Fail criteria｜通过标准

### Pass

All of:

- Real host starts the OCN MCP server.
- 7 allowed tools visible in `tools/list`.
- 4 forbidden tools absent from `tools/list`.
- `where_am_i` returns `ok=true` with structured `data`.
- `brief` returns `ok=true` with structured `data`.
- `run_gate` returns a structured `ok`/`code` envelope (true or false depending on gate state — both are pass-shaped).
- Invalid `projectRoot` returns `ok=false`, `code=ERR_IO_OR_CONFIG`, with bilingual `message.en` and `message.zh`.
- No protocol error observed.
- No raw exception or Node.js stack trace exposed to the host.

### Conditional Pass

All of these:

- One smoke tool fails due to a known **host-side UX limitation** (e.g. host truncates output, host doesn't render structured errors well).
- `tools/list` succeeds.
- At least 2 tool calls succeed end-to-end.
- Invalid `projectRoot` returns a structured error.
- No security-critical issue found.
- The issue is documented verbatim in §9 evidence.

### Fail

Any of:

- Host cannot start the OCN MCP server.
- `tools/list` is unavailable.
- Any forbidden tool appears in `tools/list`.
- Invalid `projectRoot` causes a raw exception or Node.js stack trace.
- Protocol framing error observed.
- stderr pollution breaks host display.
- Host crashes during normal tool calls.

---

## 13. What not to do｜不要做

- ❌ Do **not** paste secrets or API keys into the test project.
- ❌ Do **not** expose private repo tokens in the host's chat (which logs locally).
- ❌ Do **not** paste private SSH keys.
- ❌ Do **not** test on important project data — use the disposable `/tmp/ocn-mcp-demo` (or equivalent).
- ❌ Do **not** grant remote or untrusted host access during validation.
- ❌ Do **not** modify OCN source during validation (run on a clean `main` checkout).
- ❌ Do **not** try to coax the host into "secretly" calling forbidden tools (the test in §10 Prompt 6 is observation-only).
- ❌ Do **not** accept corrected retries as evidence for the invalid-`projectRoot` test. Capture the **first raw failure** that comes back from the agent — even if the agent then auto-retries with a corrected path, the first response is the evidence.

---

## 14. After you paste evidence back｜我贴回证据后 CC 要做什么

Once you paste the §9 evidence into the chat, CC will:

1. Verify the evidence is from a real MCP Host (cross-reference the §9.1 Host info against host-specific quirks).
2. Confirm at least one host was actually used.
3. Generate `docs/reports/2026-04-29-mcp-external-host-validation-report.md`.
4. Update `docs/mcp-usage.md` only where verified instructions need correction (e.g. host-specific config caveats).
5. Open PR D against `main` from a fresh branch (`docs/ga-prep-pr-d-mcp-external-host-validation`).

The PR D report will explicitly record:

- host tested
- host version (or "Not available")
- OCN commit
- MCP server command
- `tools/list` result (per host)
- smoke-call results (per host)
- invalid-`projectRoot` result (per host)
- stderr / protocol cleanliness (per host)
- issues found (per host)
- verdict: **Pass / Conditional Pass / Fail**

If you tested multiple hosts, the report includes a per-host section. If you tested only one, the report covers that one — and the verdict is scoped to that single host. **No host's verdict is ever extrapolated to another host.**

---

## 15. Hard rules｜硬性规则

- ❌ Do **not** fabricate host validation.
- ❌ Do **not** create PR D yet.
- ❌ Do **not** write self-smoke as external validation.
- ❌ Do **not** add code in the same step as this checklist.
- ❌ Do **not** open a branch unless explicitly told.
- ✅ This turn only produces the checklist / script for human-run validation.

---

## 16. Quick start summary

Once everything in §4 + §5 is set up, the round-trip is roughly:

1. Edit your host's MCP config (§6 / §7 / §8) — pick **one** host.
2. Restart the host fully.
3. Paste Prompt 1 (§10) — capture the tool list (§9.2).
4. Paste Prompts 2 → 4 in turn — capture each tool's raw output (§9.3).
5. Paste Prompt 5 — capture the invalid-`projectRoot` envelope (§9.3).
6. Paste Prompt 6 — confirm the 4 forbidden tools are absent (§9.2).
7. Paste Prompt 7 — capture cleanliness signals (§9.4).
8. Send the §9 block back to me.

Approximate time from a clean host: **15–25 minutes** (most of which is restarting the host and waiting for tool discovery).
