# npm Global Install Smoke Report｜npm 全局安装冒烟验证报告

> Date: 2026-05-01
> Branch: `docs/npm-global-install-smoke`
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified. This report does not change Host validation status.

---

## 1. Summary

| Field | Value |
| --- | --- |
| Package | `o-coding-navigation` |
| Selector | `@alpha` |
| Resolved version | `0.1.0-alpha.2` |
| Verdict | **Pass** |
| Environment | WSL2 Linux with **temporary** npm prefix at `/tmp/ocn-smoke-jCRXDt/npm-global`. The user's actual global prefix (`/home/timou/.npm-global`) was not modified. |
| Tested binaries | `ocn`, `ocn-mcp` (both linked under the temp prefix's `bin/`) |
| End-to-end project flow exercised | `init` → `status` → `doc create project-brief` → `check --json` → `gate --json`, all run through the **installed** binary, not from the repo's `dist/` tree. |
| DEC-018 prerequisite | "Install smoke from real `npm install -g`" ✅ now satisfied. |
| Caveat impact | None. Claude Desktop validation status (DEC-017) unchanged; Cursor / Cline still unverified per DEC-019. |
| npm side effects | None. No `npm publish`, no `npm version`, no `npm dist-tag` change, no `latest` promotion, no git tag, no GitHub release. |

## 2. Scope

**In scope:**

- Validate that `npm install -g o-coding-navigation@alpha` resolves, downloads, and installs cleanly from the public npm registry into a fresh prefix.
- Validate that the installed `ocn` binary is on the prefix's `PATH`-equivalent (`bin/`) and reports the correct version.
- Validate that the installed `ocn-mcp` binary boots, exits cleanly on stdin EOF, emits zero stderr pollution, and produces zero stdout outside the JSON-RPC framing channel.
- Validate that the installed `ocn` binary can drive a fresh disposable project end-to-end (`init` → `status` → `doc create project-brief` → `check` → `gate`) — i.e., the published tarball is a self-contained working CLI.
- Capture canonical npm registry metadata for the package and for the `@alpha` selector.

**Out of scope (deliberate):**

- No publish — this is read-only consumption of the existing `0.1.0-alpha.2` artifact.
- No `latest` promotion — `dist-tags.latest` remains `0.1.0-alpha.0` per DEC-008 / DEC-012 / DEC-015 / DEC-016.
- No real MCP Host validation — Claude Desktop is already covered by PR D / DEC-017. Cursor and Cline remain unverified per DEC-019.
- No `npm install -g` on the user's actual global prefix. A `--prefix` override into a temp directory was used so the user's environment is unaffected.
- No multi-OS validation. WSL2 Linux only. Windows-native `npm install -g` is a separate later concern.
- No HTTP/SSE MCP transport check — OCN ships stdio only in v1.0.

## 3. Install command

The exact command used:

```bash
SMOKE_ROOT=$(mktemp -d -t ocn-smoke-XXXXXX)
NPM_PREFIX="$SMOKE_ROOT/npm-global"
mkdir -p "$NPM_PREFIX"
npm install -g o-coding-navigation@alpha --prefix "$NPM_PREFIX"
```

Output:

```
added 96 packages in 33s

28 packages are looking for funding
  run `npm fund` for details
```

Exit code: `0`. Wall-clock duration: ~33 seconds (cold cache + 96 transitive packages, dominated by `@modelcontextprotocol/sdk`, `commander`, `zod`, `js-yaml`, and `ulid` plus their transitive deps).

Resulting `bin/` contents:

```
$ ls "$NPM_PREFIX/bin"
ocn
ocn-mcp
```

Both binaries linked, neither shimmed by a wrapper script that an installer might hide a crash inside. Verified via `file "$NPM_PREFIX/bin/ocn"` (symlink to `dist/cli/index.js`) and the equivalent for `ocn-mcp`.

## 4. CLI evidence

### `ocn --version`

```
$ "$NPM_PREFIX/bin/ocn" --version
0.1.0-alpha.2
```

Matches `dist-tags.alpha` (`0.1.0-alpha.2`) — the version-surface fix from P1-004 is reaching real installs end-to-end.

### `ocn --help`

```
$ "$NPM_PREFIX/bin/ocn" --help
Usage: ocn [options] [command]

O'CodingNavigator — local-first AI Coding workflow operating system.

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  init [options]     Initialize an OCN project in the current directory
  status [options]   Show current OCN project state, step, and next action
  brief [options]    Print the current-step brief (state, step, required
                     sections, AI governance reminders) for an AI coding
                     session
  doc                Manage OCN artifacts
  check [options]    Check the current step's artifact against its required
                     sections
  gate [options]     Run the artifact gate against the current step (read-only)
  advance [options]  Run gate, then advance the project to the next step on
                     pass
  help [command]     display help for command
```

All seven user-facing commands are visible (`init`, `status`, `brief`, `doc`, `check`, `gate`, `advance`, plus `help`). The `check` command's description is the post-P1-002 wording ("Check the current step's artifact against its required sections"), confirming the P1-002 fix is also reaching real installs.

### `ocn-mcp` startup

The MCP stdio server has no `--help` switch by design — its protocol is JSON-RPC over stdio. Two boot tests were performed:

**Boot 1 — bare invocation under timeout:**

```
$ timeout 3 "$NPM_PREFIX/bin/ocn-mcp"
$ echo $?
0
```

Exit code `0` within the 3s window indicates the server detected its inherited stdin had no live producer and shut down cleanly.

**Boot 2 — explicit `</dev/null` plus separate stdout/stderr capture:**

```
$ "$NPM_PREFIX/bin/ocn-mcp" </dev/null >stdout 2>stderr &
$ # within 2 s the process exited on its own with rc=0
$ wc -c stdout stderr
0 stdout
0 stderr
```

- Exit code: `0` (clean exit on stdin EOF — no hang, no crash, no `SIGTERM` needed).
- `stdout`: 0 bytes — the JSON-RPC framing channel was not polluted.
- `stderr`: 0 bytes — confirming the `setAuditFallbackLogger(silentAuditFallbackLogger)` mechanism in `src/mcp/server.ts:32` is taking effect in the published artifact (P1-001 indirect evidence — uninitialised audit writes that would otherwise pollute stderr in stdio mode are silenced at server construction).

This is the protocol-clean-stdio behaviour the Claude Desktop validation also observed (PR D §7); the smoke confirms it survives the round-trip through npm publish + global install.

## 5. Disposable project evidence

A fresh disposable project was created **using the installed binary**, not the repo's `dist/`:

```
$ PROJECT_ROOT="$SMOKE_ROOT/ocn-demo"
$ mkdir -p "$PROJECT_ROOT" && cd "$PROJECT_ROOT"
$ "$NPM_PREFIX/bin/ocn" init
已在 /tmp/ocn-smoke-jCRXDt/ocn-demo 初始化 OCN（tier=minimal）。
OCN initialized at /tmp/ocn-smoke-jCRXDt/ocn-demo (tier=minimal).

Current State: state_discovery
Current Step:  step_project_brief
```

Bilingual messaging works through the install. State machine starts at the canonical `state_discovery / step_project_brief`.

```
$ "$NPM_PREFIX/bin/ocn" status
Project: Local OCN Project (local-project)
Tier: minimal
SOP Profile: default-ai-coding-sop@0.1.0
Current State: state_discovery
Current Step:  step_project_brief
Current Artifact: /tmp/ocn-smoke-jCRXDt/ocn-demo/docs/00-project-brief.md
Next Action: Edit docs/00-project-brief.md, run `ocn gate` to verify, then `ocn advance` once it passes.
```

```
$ "$NPM_PREFIX/bin/ocn" doc create project-brief --overwrite
Created project-brief template at /tmp/ocn-smoke-jCRXDt/ocn-demo/docs/00-project-brief.md.

Artifact: /tmp/ocn-smoke-jCRXDt/ocn-demo/docs/00-project-brief.md
```

After populating the brief with the four required sections (Problem / Goal / Users / Success Criteria):

```
$ "$NPM_PREFIX/bin/ocn" check --json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Step step_project_brief passed the artifact check.",
    "zh": "step step_project_brief 已通过步骤产物检查。"
  },
  "data": {
    "artifactPath": "/tmp/ocn-smoke-jCRXDt/ocn-demo/docs/00-project-brief.md",
    "status": "pass",
    "missingRequiredSectionIds": []
  }
}
```

`ok: true`, current-step generic — the P1-002 fix is observable in the installed artifact (`step_project_brief`, not hard-coded `step_prd`).

```
$ "$NPM_PREFIX/bin/ocn" gate --json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Step step_project_brief passed the artifact gate.",
    "zh": "step step_project_brief 已通过步骤产物门禁。"
  },
  "data": {
    "status": "pass",
    "currentStateId": "state_discovery",
    "currentStepId": "step_project_brief",
    "artifactPath": "docs/00-project-brief.md",
    "missingRequiredSectionIds": []
  }
}
```

Read-only `gate` returned `ok: true`, gate `pass`. The disposable project's `.ocoding/state.json` was not mutated by the call (lock-protected, gate is read-only by contract).

## 6. npm metadata evidence

```
$ npm view o-coding-navigation dist-tags version name --json
{
  "dist-tags": {
    "latest": "0.1.0-alpha.0",
    "alpha": "0.1.0-alpha.2"
  },
  "version": "0.1.0-alpha.0",
  "name": "o-coding-navigation"
}
```

The unqualified `npm view` resolves the package's "default" version via `dist-tags.latest`, which remains `0.1.0-alpha.0` per DEC-008 / DEC-012 / DEC-015 / DEC-016 (deliberate non-promotion).

```
$ npm view o-coding-navigation@alpha name version bin dist-tags --json
{
  "name": "o-coding-navigation",
  "version": "0.1.0-alpha.2",
  "bin": {
    "ocn": "dist/cli/index.js",
    "ocn-mcp": "dist/mcp/index.js"
  },
  "dist-tags": {
    "latest": "0.1.0-alpha.0",
    "alpha": "0.1.0-alpha.2"
  }
}
```

Confirmed:

- `name` = `o-coding-navigation` ✅
- `@alpha` resolves to `0.1.0-alpha.2` ✅
- `bin` exposes both `ocn` (→ `dist/cli/index.js`) and `ocn-mcp` (→ `dist/mcp/index.js`) ✅
- `dist-tags.alpha` = `0.1.0-alpha.2` ✅
- `dist-tags.latest` = `0.1.0-alpha.0` (unchanged — deliberate) ✅

## 7. Result matrix

| Check | Expected | Observed | Result |
| --- | --- | --- | --- |
| `npm install -g o-coding-navigation@alpha --prefix <temp>` | exit 0, both `ocn` and `ocn-mcp` linked | exit 0, both binaries present in `bin/` | ✅ Pass |
| `ocn --version` | `0.1.0-alpha.2` | `0.1.0-alpha.2` | ✅ Pass |
| `ocn --help` | lists 7 commands + `help` | lists 7 commands + `help` (P1-002 wording for `check`) | ✅ Pass |
| `ocn-mcp` boot under stdin EOF | exits cleanly with no stderr pollution | exit 0, 0 bytes stdout, 0 bytes stderr | ✅ Pass |
| `ocn init` (installed binary) | initialises at `state_discovery / step_project_brief` | matches | ✅ Pass |
| `ocn status` | shows current state/step + current artifact path | matches | ✅ Pass |
| `ocn doc create project-brief --overwrite` | writes `docs/00-project-brief.md` | matches | ✅ Pass |
| `ocn check --json` (current-step generic) | `ok: true`, status `pass`, artifact path `00-project-brief.md` | matches (P1-002 active) | ✅ Pass |
| `ocn gate --json` | `ok: true`, status `pass`, no missing sections | matches | ✅ Pass |
| `npm view o-coding-navigation@alpha name` | `o-coding-navigation` | matches | ✅ Pass |
| `npm view o-coding-navigation@alpha version` | `0.1.0-alpha.2` | matches | ✅ Pass |
| `npm view o-coding-navigation@alpha bin` | `{ ocn, ocn-mcp }` | matches | ✅ Pass |
| `npm view o-coding-navigation dist-tags.alpha` | `0.1.0-alpha.2` | matches | ✅ Pass |
| `npm view o-coding-navigation dist-tags.latest` | `0.1.0-alpha.0` (deliberately unchanged) | matches | ✅ Pass |
| User's `~/.npm-global` | unchanged (no `ocn` / `ocn-mcp`) | unchanged | ✅ Pass |

15 / 15 checks pass.

## 8. Non-goals

The following are confirmed **not** to have happened during this smoke:

- ❌ **No `npm publish`.** Read-only consumption of the existing `0.1.0-alpha.2` artifact.
- ❌ **No `npm version`.** `package.json` untouched.
- ❌ **No `npm dist-tag` change.** `dist-tags.alpha` and `dist-tags.latest` are read-only observations.
- ❌ **No `latest` promotion.** `latest` remains `0.1.0-alpha.0` per the standing alpha-line policy.
- ❌ **No git tag.**
- ❌ **No GitHub release.**
- ❌ **No beta promotion.** This evidence checks one DEC-018 prerequisite; beta promotion remains gated on the remaining prerequisites + a future DEC.
- ❌ **No Cursor compatibility claim.** Cursor remains unverified per DEC-019.
- ❌ **No Cline compatibility claim.** Cline remains unverified per DEC-019.
- ❌ **No modification of the user's actual global npm prefix.** The smoke used a temp `--prefix` so `/home/timou/.npm-global` is unchanged.
- ❌ **No source / test / package / workflow / README / quickstart / mcp-usage edit** in this PR.
- ❌ **No external MCP Host invocation.** That was already covered by PR D / DEC-017 for Claude Desktop. The `ocn-mcp` boot test in §4 is a startup / stderr / exit-code check, not a Host integration check.

## 9. Follow-up

DEC-018 prerequisite progress after this PR merges:

- ✅ **CI Node 22 matrix expansion** (PR #35 / `docs/reports/2026-05-01-ci-node-22-matrix-expansion.md`).
- ✅ **Host support boundary** (PR #36 / DEC-019).
- ✅ **`npm install -g` smoke evidence** — this PR.
- ⬜ **Examples F2 / F3** (executable example projects per `docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`).
- ⬜ **`latest`-tag strategy DEC** (when / whether to move `latest` off `0.1.0-alpha.0`).
- ⬜ **Doc audit for accidental beta language** before beta promotion.
- ⬜ **Beta promotion DEC** (final gate). The promotion PR will follow the DEC-016 publish discipline pattern with its own evidence report.

Optional, not gating beta:

- Cursor real-Host validation in a separate future PR (DEC-017-style scoped report + closure DEC). Cursor remains unverified per DEC-019.
- Cline real-Host validation in a separate future PR (same pattern). Cline remains unverified per DEC-019.
- Windows-native (non-WSL) `npm install -g` smoke — a strict superset of this PR's WSL2 evidence; only worth running if a Windows-native support claim is later proposed.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
