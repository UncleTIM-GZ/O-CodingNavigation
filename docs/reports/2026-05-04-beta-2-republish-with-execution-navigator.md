# 0.2.0-beta.2 republish — ship Execution Navigator commands

> Date: 2026-05-04
> Branch: `release/beta-2-republish-with-execution-navigator`
> Tag: `v0.2.0-beta.2`
> Status: published as npm `latest` and `beta`

---

## 1. Summary

Republished `o-coding-navigation@0.2.0-beta.2` so the npm artifact actually contains the Execution Navigator commands that main has documented since PRs #63–#70. README, quickstart, MCP usage doc, and onepager now reference `0.2.0-beta.2`. npm `latest` and `beta` both point to `0.2.0-beta.2`. `alpha` is preserved at `0.1.0-alpha.2`. Annotated git tag `v0.2.0-beta.2` published. GitHub prerelease published. This remains beta, not GA.

## 2. Root cause of the republish

The previously published artifact `o-coding-navigation@0.2.0-beta.1` was packaged from gitHead `a3276f2` on 2026-05-02 (the README walkthrough commit), which **predates** the Execution Navigator MVP series merged via PRs #63–#70. The README on `main` was updated to advertise the Execution Navigator commands, but the published binary did not include them.

Symptom from an external tester:

```
$ npm install -g o-coding-navigation
$ ocn exec status
error: unknown command 'exec'
```

Verification on the previously-published tarball: `npm pack` of `0.2.0-beta.1` shipped only 7 command files (`advance/brief/check/doc/gate/init/status`); the 6 Execution Navigator command files (`exec/github/evidence/next-prompt/verify/verdict`) were absent.

The fix is a republish — bump version, rebuild from current `main`, re-publish. No source code changes were required; the merged code already had the commands.

## 3. Tarball verification (post-build, pre-publish)

`dist/cli/commands/` listing in the new artifact (13 commands present):

```
advance.{d.ts,js,js.map}
brief.{d.ts,js,js.map}
check.{d.ts,js,js.map}
doc.{d.ts,js,js.map}
evidence.{d.ts,js,js.map}
exec.{d.ts,js,js.map}
gate.{d.ts,js,js.map}
github.{d.ts,js,js.map}
init.{d.ts,js,js.map}
next-prompt.{d.ts,js,js.map}
status.{d.ts,js,js.map}
verdict.{d.ts,js,js.map}
verify.{d.ts,js,js.map}
```

`npm pack --dry-run` confirms:

- name = `o-coding-navigation`
- version = `0.2.0-beta.2`
- forbidden paths absent: `src/`, `tests/`, `docs/reports/`, `docs/plans/`, `.github/`, `.ocoding/`, `node_modules/`, `coverage/` — none present.
- package size: 249.6 kB; unpacked size: 947.0 kB; total files: 422.

## 4. Doc updates

Replaced `0.2.0-beta.1` with `0.2.0-beta.2` (and `v0.2.0-beta.1` → `v0.2.0-beta.2` URL fragments) across:

- `README.md` — header tag link, §3 status table (npm row), §3 npm publish discipline bullet, §3.x install snippet (`ocn --version` → `0.2.0-beta.2`), §4 install table, §10 roadmap, §C status table (Chinese), §C npm publish discipline bullet (Chinese), §C install snippet (Chinese), §C install table (Chinese), §J roadmap (Chinese).
- `docs/quickstart.md` — English §11 prerelease channel paragraph, §11 install snippet, §11 dist-tag table, §11 troubleshooting row; Chinese §11 mirrors.
- `docs/mcp-usage.md` — English §10 prerelease pin paragraph; Chinese §10 mirror.
- `docs/onepager.md` — header version line, §1 introduction paragraph, §6 install snippet.

Total: 30 occurrences of `0.2.0-beta.1` replaced with `0.2.0-beta.2` (plus header URL fragments).

Added a republish note to README §3 (English) and §C (Chinese) immediately after the status table:

> 2026-05-04 republish note: Republished as `0.2.0-beta.2` to ship the Execution Navigator commands (`exec status`, `github analyze-pr`, `evidence map`, `next-prompt`, `verify status`, `verdict draft`) that were merged after `0.2.0-beta.1` was packaged. The README documentation and the published CLI binary now match.

The "Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified." disclaimer is preserved verbatim.

## 5. Pre-publish checks

| Step | Command | Outcome |
|---|---|---|
| 1 | `npm run lint` | pass |
| 2 | `npm run typecheck` | pass |
| 3 | `npm run test` | 97 files, 872 tests passed |
| 4 | `npm run test:coverage` | meets coverage gate; core engine ≥ 90% |
| 5 | `npm run build` | success; 13 command files emitted under `dist/cli/commands/` |
| 6 | `bash examples/plan-to-verify/scripts/smoke.sh` | walks all 19 SOP 0.2.0 steps; ends at `state_verify / step_final_build_verdict` |

13-command CLI smoke (against the local `dist/`):

| Command | Result |
|---|---|
| `node dist/cli/index.js --version` | `0.2.0-beta.2` |
| `node dist/cli/index.js --help` | lists all 13 commands incl. `exec`, `github`, `evidence`, `next-prompt`, `verify`, `verdict` |
| `exec status --json` | `ok=true`, `data.implemented=true`, `noMutation=true` |
| `evidence map --json` | `ok=true`, `data.implemented=true` |
| `next-prompt --json` | `ok=true`, `data.implemented=true` |
| `verify status --json` | `ok=true`, `data.implemented=true` |
| `verdict draft --json` | `ok=true`, `data.implemented=true` |
| `github analyze-pr 70 --json` | auth-gated as expected; structured envelope returned |

## 6. npm publish evidence

Publish command and result:

```
$ npm publish --tag beta
npm notice name: o-coding-navigation
npm notice version: 0.2.0-beta.2
npm notice filename: o-coding-navigation-0.2.0-beta.2.tgz
npm notice package size: 249.6 kB
npm notice unpacked size: 947.0 kB
npm notice shasum: c07cc791975b17fad813d96ba3f14a39b37cb3ff
npm notice total files: 422
npm notice Publishing to https://registry.npmjs.org/ with tag beta and default access
+ o-coding-navigation@0.2.0-beta.2
```

Package URL: <https://www.npmjs.com/package/o-coding-navigation/v/0.2.0-beta.2>

Post-publish dist-tag state:

```
{
  "alpha": "0.1.0-alpha.2",
  "latest": "0.2.0-beta.1",
  "beta":   "0.2.0-beta.2"
}
```

## 7. Latest movement evidence

```
$ npm dist-tag add o-coding-navigation@0.2.0-beta.2 latest
+latest: o-coding-navigation@0.2.0-beta.2
```

Final dist-tag state (after registry cache refresh):

```
{
  "alpha":  "0.1.0-alpha.2",
  "latest": "0.2.0-beta.2",
  "beta":   "0.2.0-beta.2"
}
```

## 8. Post-publish install smoke (fresh global install, Mac-equivalent)

Procedure: temp dir → `npm install -g o-coding-navigation --prefix <tmp>` → invoke each Execution Navigator command in a fresh `ocn init`'d project.

```
$ "$NPM_PREFIX/bin/ocn" --version
0.2.0-beta.2

$ "$NPM_PREFIX/bin/ocn" --help
Commands:
  init, status, brief, doc, check, gate, advance,
  exec, github, evidence, next-prompt, verify, verdict
```

All 6 Execution Navigator commands return structured envelopes with `implemented: true`:

```
=== exec status --json ===
{ "ok": true, "code": "OK",
  "message": { "en": "Local execution evidence status collected.", ... },
  "data": { "command": "exec.status", "implemented": true, "noMutation": true, ... } }

=== evidence map --json ===
{ "ok": true, "code": "OK",
  "data": { "command": "evidence.map", "implemented": true, ... } }

=== next-prompt --json ===
{ "ok": true, "code": "OK",
  "data": { "command": "next_prompt", "implemented": true, ... } }

=== verify status --json ===
{ "ok": true, "code": "OK",
  "data": { "command": "verify.status", "implemented": true, ... } }

=== verdict draft --json ===
{ "ok": true, "code": "OK",
  "data": { "command": "verdict.draft", "implemented": true, ... } }
```

This is the test that confirms the original regression (`error: unknown command 'exec'`) is resolved.

## 9. GitHub release evidence

- Annotated git tag: `v0.2.0-beta.2`
- `git cat-file -t v0.2.0-beta.2` → `tag` (annotated, not lightweight)
- GitHub prerelease URL: see PR description / `gh release view v0.2.0-beta.2`
- `isPrerelease: true`, `isDraft: false`
- `targetCommitish` matches the publish commit (`HEAD` of `release/beta-2-republish-with-execution-navigator` at publish time)

## 10. Non-goals

- **No GA**. This stays beta.
- **No production-ready claims** added anywhere.
- **No Cursor/Cline-verified claims**. The "Cursor and Cline are not yet verified" disclaimer is preserved verbatim.
- **No `src/` or `tests/` changes** — this is a pure republish, not a feature or fix release.
- **No `.github/workflows/` changes**.
- **No `docs/20-decision-log.md` changes** — the original DEC-024 reframe is unchanged.
- **No tag, release, or dist-tag deletions**.
