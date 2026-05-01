# npm Alpha.2 P1 Fix Train Publish Report｜npm alpha.2 P1 修复列车发布报告

> Date: 2026-04-30
> Authoring DEC: `docs/20-decision-log.md` §DEC-016
> Caveat: External MCP Host Validation pending. PR D not started, no real Claude Desktop / Cursor / Cline verification has been performed.

---

## 1. Summary

| Field | Value |
| --- | --- |
| Package | `o-coding-navigation` |
| Version | `0.1.0-alpha.2` |
| Tag | `alpha` |
| Publish executed | yes |
| Publish result | **success** |
| npm URL | https://www.npmjs.com/package/o-coding-navigation |
| Publish timestamp (UTC) | 2026-04-30 (logged via npm registry server-side) |
| Purpose | Publish the four post-alpha Codex P1 fixes (P1-001 / P1-002 / P1-003 / P1-004) under the existing `@alpha` install path. |
| Caveat preserved | yes |

> **External MCP Host Validation pending.**
> Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.

`latest` was deliberately **not** promoted to `0.1.0-alpha.2`; it remains pointed at `0.1.0-alpha.0` per DEC-008 / DEC-012 / DEC-015 / DEC-016.

## 2. DEC basis

This publish is gated by, and traceable to, the following decision log entries:

- **DEC-005** — External MCP Host Validation deferral. The caveat MUST be preserved on every release artifact.
- **DEC-009** — Package contents policy: `package.json.files` allowlist. The tarball is constrained to `dist/` + `README.md` + `LICENSE` + `docs/quickstart.md` + `docs/mcp-usage.md` + `package.json`.
- **DEC-012** — Authorise separate npm alpha publish PRs with mandatory pre-publish checks. Subsequent publishes follow the same discipline.
- **DEC-015** — Authorised `0.1.0-alpha.1` publish (DEC-014 audit-markdown concurrency repair). Sets the precedent that each alpha patch is a separate, narrowly-scoped publish PR with its own evidence report.
- **DEC-016** — Authorises **this** publish: `0.1.0-alpha.2` ships the four completed P1 fixes from the post-alpha Codex audit. 14-step pre-publish checklist defined and executed below.

## 3. P1 fix train included

The four post-alpha Codex P1 findings, all merged on `main` before this publish:

| Fix | Description | PR | Merge |
| --- | --- | --- | --- |
| P1-001 | MCP tools require initialized OCN project roots — uninitialized roots return structured `ERR_IO_OR_CONFIG`, never silently mutate state. | #27 | `954de58` |
| P1-004 | CLI and MCP version surfaces match `package.json` — `ocn --version` and `MCP_SERVER_DEFAULT_INFO.version` both read from `src/version.ts` (which reads `package.json` at runtime). | #28 | `204eaa4` |
| P1-002 | `ocn check` evaluates the **current** step artifact (resolved via `state.json` + the SOP profile) instead of hard-coding `step_prd`. | #29 | `ba49b63` |
| P1-003 | Persisted `.ocoding/sop.yaml` / `gates.yaml` / `artifacts.yaml` snapshots are derived from the canonical runtime profile. `detect_sop_version` now reports `snapshotDriftDetected` for legacy/missing/unreadable snapshots. | #30 | `2979771` |

DEC-016 itself was merged to `main` in PR #31 at `d050f71`.

## 4. Version bump evidence

```
package.json before:  "version": "0.1.0-alpha.1"
package.json after:   "version": "0.1.0-alpha.2"

package-lock.json:    top-level "version" + packages[""].version synced 0.1.0-alpha.1 → 0.1.0-alpha.2
                      via `npm install --package-lock-only`

git diff --stat -- package.json package-lock.json
 package-lock.json | 4 ++--
 package.json      | 2 +-
 2 files changed, 3 insertions(+), 3 deletions(-)
```

Dependency graph: **unchanged**. No new dependencies, no removals, no version bumps in the lock file beyond the package's own version field. Confirmed via `git diff -- package.json package-lock.json`.

`npm version` was **not** used — version was bumped via a deterministic Node one-liner that asserts the previous version is `0.1.0-alpha.1` before writing.

## 5. Pre-publish checklist evidence (DEC-016 §Required pre-publish checks)

| Step | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1 | grep P1-001 / P1-004 / P1-002 / P1-003 evidence on main | ✅ | `validateInitializedProjectRoot` referenced from all 7 MCP tools; `src/version.ts`, `PACKAGE_VERSION` wired into CLI + MCP server; `src/core/check.ts` reads `state.currentStepId`; `src/sops/.../data.ts` + `render.ts` present; `snapshotDriftDetected` field in `detect-version.ts` + tests. |
| 2 | bump `package.json` from `0.1.0-alpha.1` → `0.1.0-alpha.2` (Node one-liner; `npm version` not used) | ✅ | `node -p "require('./package.json').version"` → `0.1.0-alpha.2`. |
| 3 | `npm install --package-lock-only` | ✅ | only top-level + `packages[""].version` synced; no graph change. |
| 4 | `node -p "require('./package.json').name"` | ✅ | `o-coding-navigation` |
| 5 | `node -p "require('./package.json').version"` | ✅ | `0.1.0-alpha.2` |
| 6 | `npm config get registry` | ✅ | `https://registry.npmjs.org/` |
| 7 | `npm whoami` | ✅ | succeeded; username redacted in public report. |
| 8 | `npm run lint`, `typecheck`, `test`, `test:coverage`, `build` | ✅ | lint clean; tsc clean; **449/449** tests pass; coverage **83.49%** overall (≥ 80% gate); build emits `dist/` cleanly. |
| 9 | 4 P1 smoke tests | ✅ | see §6 below — all four passed. |
| 10 | `npm pack --dry-run` | ✅ | 239 files, 94.0 kB packed / 355.8 kB unpacked, allowlist match — see §7. |
| 11 | `npm view o-coding-navigation@0.1.0-alpha.2 …` (preflight) | ✅ | E404 (version not yet published — safe to publish). |
| 12 | `npm publish --tag alpha` | ✅ | `+ o-coding-navigation@0.1.0-alpha.2` — see §9. |
| 13 | `npm view …` post-publish | ✅ | version-specific query confirms alpha → `0.1.0-alpha.2`, latest still `0.1.0-alpha.0` — see §10. |
| 14 | confirm no forbidden actions | ✅ | no git tag, no GH release, no README/quickstart/mcp-usage/.github diff — see §11. |

## 6. P1 smoke evidence

### P1-001 — MCP tools reject uninitialized projectRoot

```
$ npx vitest run tests/security/mcp-uninitialized-projectroot.test.ts
 ✓ tests/security/mcp-uninitialized-projectroot.test.ts (11 tests) 37ms
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

The 11 tests cover every MCP tool that mutates state (`create_artifact`, `capture_log`) and every read tool (`where_am_i`, `brief`, `run_gate`, `detect_sop_version`, `generate_next_prompt`), verifying that an uninitialized project root yields a structured `ERR_IO_OR_CONFIG` rejection with no on-disk side effects.

### P1-004 — version surface

```
$ node dist/cli/index.js --version
0.1.0-alpha.2
$ node -p "require('./package.json').version"
0.1.0-alpha.2

$ npx vitest run tests/unit/version-surface.test.ts tests/cli/version.test.ts
 ✓ tests/cli/version.test.ts (1 test) 88ms
 ✓ tests/unit/version-surface.test.ts (6 tests) 4ms
 Test Files  2 passed (2)
      Tests  7 passed (7)
```

Built CLI emits `0.1.0-alpha.2`. The 7 unit/CLI tests pin `PACKAGE_NAME` / `PACKAGE_VERSION` / `MCP_SERVER_DEFAULT_INFO.version` to `package.json`.

### P1-002 — `ocn check` current-step generic

```
$ TMP=$(mktemp -d) && cd "$TMP"
$ node $REPO/dist/cli/index.js init                                # → state_discovery / step_project_brief
$ # write a valid project-brief with all required sections
$ test ! -f docs/02-prd.md  →  docs/02-prd.md does NOT exist: OK
$ node $REPO/dist/cli/index.js check --json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Step step_project_brief passed the artifact check.",
    "zh": "step step_project_brief 已通过步骤产物检查。"
  },
  "data": {
    "artifactPath": "/tmp/.../docs/00-project-brief.md",
    "status": "pass",
    "missingRequiredSectionIds": []
  }
}
```

`ocn check` passes on `step_project_brief` with **no PRD file present**. Pre-P1-002 this returned `ERR_STATE_MACHINE`.

### P1-003 — fresh init writes aligned SOP snapshot

```
$ TMP=$(mktemp -d) && cd "$TMP" && node $REPO/dist/cli/index.js init
$ test -f .ocoding/sop.yaml         → OK
$ test -f .ocoding/gates.yaml       → OK
$ test -f .ocoding/artifacts.yaml   → OK   (P1-003 makes this a persisted file for the first time)

$ grep -c state_discovery     .ocoding/sop.yaml   → 1
$ grep -c step_project_brief  .ocoding/sop.yaml   → 1
$ grep -c step_mvp_plan       .ocoding/sop.yaml   → 1   (full DISCOVERY → PLAN coverage)

$ grep docs/00-project-brief.md  .ocoding/artifacts.yaml   → present
$ grep docs/02-prd.md            .ocoding/artifacts.yaml   → present
$ grep docs/09-mvp-plan.md       .ocoding/artifacts.yaml   → present

$ node $REPO/dist/cli/index.js status   → state_discovery / step_project_brief, current artifact docs/00-project-brief.md
```

The persisted snapshot now matches the runtime profile end-to-end.

## 7. `npm pack --dry-run` evidence

```
npm notice Tarball Details
npm notice name:           o-coding-navigation
npm notice version:        0.1.0-alpha.2
npm notice filename:       o-coding-navigation-0.1.0-alpha.2.tgz
npm notice package size:   94.0 kB
npm notice unpacked size:  355.8 kB
npm notice shasum:         a3cc23544223bd3cf3bfb292318a41ec75ed2882
npm notice total files:    239
```

Tarball roots:

- `LICENSE`
- `README.md`
- `package.json`
- `docs/quickstart.md`
- `docs/mcp-usage.md`
- `dist/**` (compiled JS + `.d.ts` + sourcemaps)

Excluded (verified absent — DEC-009 allowlist enforcement):

- `tests/`
- `todos/`
- `.ocoding/`
- `.env`, secrets, private keys
- `docs/plans/`
- `docs/reports/`
- `docs/amendments/`
- `src/`
- `node_modules/`
- `.git/`
- `.github/`
- `.husky/`
- `coverage/`

`grep` for any of those patterns over the dry-run output returned zero matches.

## 8. npm identity and registry

- `npm config get registry` → `https://registry.npmjs.org/`
- `npm whoami` → succeeded; **username redacted in public report** (matches DEC-015 alpha.1 publish report convention).

## 9. `npm publish` output

```
npm notice Tarball Details
npm notice name: o-coding-navigation
npm notice version: 0.1.0-alpha.2
npm notice filename: o-coding-navigation-0.1.0-alpha.2.tgz
npm notice package size: 94.0 kB
npm notice unpacked size: 355.8 kB
npm notice shasum: a3cc23544223bd3cf3bfb292318a41ec75ed2882
npm notice total files: 239
npm notice
npm notice Publishing to https://registry.npmjs.org/ with tag alpha and default access
+ o-coding-navigation@0.1.0-alpha.2
```

- Status: **success**
- Package: `o-coding-navigation`
- Version: `0.1.0-alpha.2`
- Tag: `alpha`
- Registry: `https://registry.npmjs.org/`
- npm package URL: https://www.npmjs.com/package/o-coding-navigation

The command was the literal `npm publish --tag alpha` — no `--ignore-scripts`, no `--tag latest`, no implicit-default tag.

## 10. Post-publish verification

```
$ npm view o-coding-navigation dist-tags version name --json
{
  "dist-tags": {
    "alpha": "0.1.0-alpha.1",
    "latest": "0.1.0-alpha.0"
  },
  "version": "0.1.0-alpha.0",
  "name": "o-coding-navigation"
}
```

The unqualified `npm view` returned cached metadata — `dist-tags.alpha` shown as `0.1.0-alpha.1`. The version-specific query is authoritative and was used to confirm the publish:

```
$ npm view o-coding-navigation@0.1.0-alpha.2 name version dist-tags --json
{
  "name": "o-coding-navigation",
  "version": "0.1.0-alpha.2",
  "dist-tags": {
    "latest": "0.1.0-alpha.0",
    "alpha": "0.1.0-alpha.2"
  }
}
```

Confirmed:

- `name` = `o-coding-navigation` ✅
- queried version = `0.1.0-alpha.2` ✅
- `dist-tags.alpha` = `0.1.0-alpha.2` ✅
- `dist-tags.latest` = `0.1.0-alpha.0` (deliberately **unchanged** — not promoted) ✅

The reverse-cache lag in the unqualified query is consistent with npm's documented dist-tag propagation behaviour and resolves on its own; downstream installs via `@alpha` already resolve to `0.1.0-alpha.2`.

## 11. Non-goals confirmed

The following are confirmed **not** to have happened during this publish:

- ❌ **No git tag created.** `git tag --list` returns empty.
- ❌ **No GitHub release created.** `gh release list --limit 5` returns empty.
- ❌ **No README install update.** `git diff -- README.md` empty.
- ❌ **No quickstart install update.** `git diff -- docs/quickstart.md` empty.
- ❌ **No `docs/mcp-usage.md` change.** `git diff -- docs/mcp-usage.md` empty.
- ❌ **No `latest` promotion.** `dist-tags.latest` still `0.1.0-alpha.0`.
- ❌ **No PR D claim.** External MCP Host Validation remains pending.
- ❌ **No external host compatibility claim.** No "verified Claude Desktop / Cursor / Cline" wording added anywhere.
- ❌ **No `--ignore-scripts`** used during publish.
- ❌ **No `--tag latest`** used during publish.

## 12. Follow-up

This publish is the end of the post-alpha P1 fix train. The following are deliberately **not** authorised by this publish; each requires its own future DEC entry before being executed:

- **PR D — External MCP Host Validation.** Wire `ocn-mcp` into a real Claude Desktop / Cursor / Cline session, document the result, and lift the long-standing DEC-005 caveat.
- **Beta readiness DEC.** Decide when OCN is beta-ready and what the beta install lane looks like.
- **Examples F2 / F3.** Concrete cookbook examples for MCP host integration after PR D lands.
- **CI matrix expansion.** DEC-010 holds CI to single-cell `ubuntu-latest` + Node 20 for alpha; expansion to multi-Node / multi-OS happens at beta.
- **Optional `latest` tag strategy DEC.** Whether and when to promote `latest` past `0.1.0-alpha.0`.

Until those DECs land, every release-related artifact MUST continue to include:

> External MCP Host Validation pending.
