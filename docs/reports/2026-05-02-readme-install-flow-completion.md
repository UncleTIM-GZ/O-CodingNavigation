# README and Install Flow Completion Report

> Date: 2026-05-02
> Branch: `docs/readme-install-flow-completion`
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified per DEC-019. This PR does not change Host validation status.

---

## 1. Summary

`README.md`, `docs/quickstart.md`, and `docs/mcp-usage.md` were reviewed and completed for **post-beta public usage**. The English content was already DEC-017 / DEC-019 / DEC-020 / DEC-021 / DEC-022-compliant (verified after PR #43's post-beta install update); this PR adds the bilingual coverage that was missing — concise Chinese sidebars at every user-flow touchpoint (install, verify, first-run, MCP host config, common errors, allowed/forbidden tools) — and pulls the validated WSL2 + Claude Desktop MCP config into the top-level `README.md` so an external user can complete the install + verify + Claude-Desktop-MCP-config flow without leaving the README.

| Field | Value |
| --- | --- |
| Files audited | `README.md`, `docs/quickstart.md`, `docs/mcp-usage.md` |
| Files changed | 3 active docs + 1 new report |
| English coverage | already complete pre-PR (verified by audit) — strengthened in places |
| Chinese coverage | added bilingual sidebars at install / verify / first-run / MCP-host / common-errors / allowed-tools / forbidden-tools touchpoints |
| CJK character density | `README.md` 0.07% → 1.52%; `docs/quickstart.md` 0.17% → 2.98%; `docs/mcp-usage.md` 0.19% → 2.10% |
| Source / test / package / workflow changes | **none** |
| npm | no publish, no version bump, no dist-tag movement, no `latest` promotion |
| git tag / GitHub Release | no new tag, no new release; existing `v0.1.0-beta.0` pre-release untouched |

> Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

> **中文说明｜Chinese summary**
> 当前已通过真实 Host 验证的路径是 **Windows + WSL2 + Claude Desktop**；Cursor 与 Cline 暂未验证，不应视为正式支持路径。

## 2. Scope

**Active docs audited and edited:**

| File | What changed |
| --- | --- |
| `README.md` | §4 Install — added bilingual sidebar (recommended `@beta` install, version expectation, "do not use untagged" warning). §5 First 5 minutes — added bilingual sidebar describing the init → status → doc create → check/gate → advance → brief loop. §7 MCP tools — added bilingual sidebar on the Host scoping; **NEW** "Wire into Claude Desktop on Windows + WSL2" sub-section with the `wsl.exe -e ocn-mcp` config snippet and post-edit-restart instruction (the snippet previously only lived in `docs/mcp-usage.md`; now the README is self-sufficient for the install + verify + Claude-Desktop-MCP-config flow). |
| `docs/quickstart.md` | §1 Install — bilingual sidebar. §2 First 5 minutes — bilingual sidebar at the section heading. §4 Common errors — added 3 new English rows (`ocn` not found / `ocn --version` not `0.1.0-beta.0` / Claude Desktop doesn't show OCN tools after config edit) plus a bilingual summary block. §5 Wiring `ocn-mcp` into a host — replaced the bare `ocn-mcp` config snippet with the **validated** WSL2 path as the primary example, kept the native Linux/macOS form as a clearly-marked "not yet validated end-to-end" secondary block, added a bilingual summary block. |
| `docs/mcp-usage.md` | §"Wire into an MCP host" — restructured into Validated (Windows + WSL2) and Native (Linux/macOS, unverified) sub-sections; added bilingual summary. §2 Allowed tools — added bilingual summary listing the 7 tool names. §3 Forbidden tools — added bilingual summary listing the 4 forbidden names + the safety boundary intent. |

**Reviewed for context only (not rewritten):**

- `docs/reports/*` — historical evidence, append-only.
- `docs/plans/*` — historical planning artifacts.
- `docs/20-decision-log.md` — append-only DEC history; no DEC body rewriting.
- `examples/*`, `CLAUDE.md`, `.claude/rules.md` — out of scope; no changes needed.

## 3. Install flow

The post-PR end-state for new users (in any of the three active docs):

```bash
npm install -g o-coding-navigation@beta
ocn --version       # expected: 0.1.0-beta.0
ocn --help
```

Followed by a first-run loop:

```bash
mkdir my-ocn-project
cd my-ocn-project
ocn init
ocn status
ocn doc create project-brief
# edit docs/00-project-brief.md and fill in:
#   Problem · Goal · Users · Success Criteria
ocn check
ocn gate
ocn advance
ocn brief
```

And, for the validated Host, a Claude Desktop on Windows + WSL2 config:

```json
{
  "mcpServers": {
    "ocn": {
      "command": "wsl.exe",
      "args": ["-e", "ocn-mcp"]
    }
  }
}
```

(at `%APPDATA%\Claude\claude_desktop_config.json`).

The `do NOT use untagged install` warning is preserved everywhere it appeared pre-PR (DEC-020 / DEC-021 enforcement).

## 4. Bilingual coverage

**Pre-PR baseline** (CJK character density, measured via Python `'一' <= ch <= '鿿'`):

| File | CJK chars | Density |
| --- | --- | --- |
| `README.md` | 11 | 0.07% |
| `docs/quickstart.md` | 14 | 0.17% |
| `docs/mcp-usage.md` | 23 | 0.19% |

(The pre-PR CJK characters were all inside payload-example heading strings like `Scenarios｜使用场景`, not at user-flow touchpoints. A Chinese-reading user could not navigate the install + verify + first-run + MCP-config flow without translating English on the fly.)

**Post-PR coverage**:

| File | CJK chars | Density | Sidebars added |
| --- | --- | --- | --- |
| `README.md` | 289 | 1.52% | §4 Install · §5 First 5 minutes · §7 MCP tools (Host scoping + Claude Desktop config) |
| `docs/quickstart.md` | 343 | 2.98% | §1 Install · §2 First 5 minutes · §4 Common errors · §5 MCP host wiring |
| `docs/mcp-usage.md` | 300 | 2.10% | §"Wire into an MCP host" · §2 Allowed tools · §3 Forbidden tools |

The bilingual additions are **sidebar-style** (single blockquote labelled `中文说明｜Chinese summary` per touchpoint), not a full parallel translation. This keeps the diff narrow, lets the canonical English remain the source of truth, and gives a Chinese-reading user enough context to navigate the flow without ambiguity.

Every sidebar uses consistent terminology:

| English | 中文 |
| --- | --- |
| recommended install | 推荐安装 |
| validated Host | 已验证 Host / 已验证路径 |
| not yet verified | 暂未验证 / 未完成验证 |
| do not use untagged install | 不要使用不带 tag 的安装命令 |
| fully quit and reopen Claude Desktop | 完全退出再重启 Claude Desktop（含系统托盘） |
| forbidden tools (must not appear) | 禁止暴露的工具（绝不会出现在工具面板） |

## 5. MCP support boundary

The canonical scoped Host wording from DEC-019 / DEC-021 is preserved verbatim everywhere it appeared pre-PR:

> Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

> **中文说明｜Chinese summary**
> 当前已验证路径是 **Windows + WSL2 + Claude Desktop**；Cursor 与 Cline 暂未完成真实 Host 验证，不能声明兼容。每个 Host 都需要独立的真实 Host 验证报告（DEC-017 模式）才能加入支持声明。

The `docs/quickstart.md` §5 and `docs/mcp-usage.md` §"Wire into an MCP host" config snippets were both updated to lead with the validated WSL2 path (`wsl.exe -e ocn-mcp`). The Linux/macOS-native config is retained but explicitly framed as **not yet validated end-to-end with a real Host** — accurate, and consistent with DEC-019's support-boundary discipline.

## 6. Checks performed

### Greps (post-edit)

```
$ grep -RIn "npm install -g o-coding-navigation@beta" README.md docs/quickstart.md docs/mcp-usage.md
README.md:74           ← English primary install command
README.md:86           ← Chinese sidebar referencing the same command
docs/quickstart.md:12  ← English primary install command
docs/quickstart.md:24  ← Chinese sidebar
docs/quickstart.md:175 ← Common errors fix
docs/quickstart.md:185 ← Chinese common-errors sidebar

$ grep -RInE "npm install -g o-coding-navigation([^@]|$)" README.md docs/quickstart.md docs/mcp-usage.md
# Only matches inside "Do NOT use untagged" / "暂时不要使用不带 tag" framing.
# No untagged install presented as a recommendation.

$ grep -RIn "Validated with Claude Desktop on Windows with WSL2|MCP Host validation completed for Claude Desktop on Windows with WSL2" \
            README.md docs/quickstart.md docs/mcp-usage.md
# Hits in all three active docs. Verbatim wording preserved.

$ grep -RIn "Cursor and Cline are not yet verified|Cursor and Cline remain unverified" \
            README.md docs/quickstart.md docs/mcp-usage.md
# Hits in all three active docs.

$ grep -RIn "0\.1\.0-beta\.0" README.md docs/quickstart.md docs/mcp-usage.md
# Recommended-version mentions appear in install commands, status tables,
# and Chinese sidebars in all three active docs.
```

### Local checks

```
$ npm run lint        → clean
$ npm run typecheck   → clean
$ npm run test        → 449 / 449 pass (unchanged from main)
```

Coverage skipped — docs-only PR.

### Diff scope

```
$ git diff --stat
 README.md          | 44 +++++++++++++++++++++++++++++++++++----
 docs/mcp-usage.md  | 44 ++++++++++++++++++++++++++++++++++++---
 docs/quickstart.md | 61 +++++++++++++++++++++++++++++++++++++++++++++++-------
 3 files changed, 135 insertions(+), 14 deletions(-)
```

Plus this report (new file). No `src/`, `tests/`, `package.json`, `package-lock.json`, `.github/`, examples, `CLAUDE.md`, `.claude/rules.md`, or `docs/20-decision-log.md` change.

## 7. Non-goals

The following are confirmed **not** to have happened during this PR:

- ❌ **No `npm publish`, no `npm version`, no `npm dist-tag` change.**
- ❌ **No `latest` promotion.** `dist-tags.latest` stays at `0.1.0-alpha.0`.
- ❌ **No new git tag.** Existing `v0.1.0-beta.0` annotated tag untouched.
- ❌ **No new GitHub Release.** Existing `v0.1.0-beta.0` pre-release untouched.
- ❌ **No `package.json` / `package-lock.json` change.** Repo version stays `0.1.0-beta.0`.
- ❌ **No `src/` / `tests/` / `.github/workflows/*` change.**
- ❌ **No `examples/` / `CLAUDE.md` / `.claude/rules.md` / `docs/20-decision-log.md` change.**
- ❌ **No GA claim, no production-ready claim.**
- ❌ **No claim that Cursor or Cline is verified.**
- ❌ **No untagged `npm install -g o-coding-navigation` recommended anywhere** in active docs — every reference is inside explicit "Do NOT use" / "暂时不要使用" framing.
- ❌ **No historical doc rewriting.**

## 8. Follow-up

The active docs are now bilingual at the user-flow touchpoints and self-sufficient through the install + verify + first-run + Claude-Desktop-MCP-config flow. The natural next step is **outside engineering**:

- **Start dogfood with real projects.** Use `npm install -g o-coding-navigation@beta` in a real workflow and capture rough edges as feedback. Doc gaps surfaced by real users are the highest-signal input for the next docs sweep.
- **Cursor real-Host validation** — separate future PR following the DEC-017 pattern (scoped report + closure DEC). Cursor remains unverified until then.
- **Cline real-Host validation** — same pattern.
- **`latest`-tag movement DEC** — separate future DEC, likely tied to GA readiness.
- **GA readiness DEC** — final gate tying together Host scope, `latest` movement, multi-OS / Node-24+ CI, examples beyond `discovery-to-plan`, dogfood evidence.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
