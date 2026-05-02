# npm Beta.0 Publish Report｜npm beta.0 发布报告

> Date: 2026-05-01
> Authoring DEC: `docs/20-decision-log.md` §DEC-021 (authorisation), §DEC-016 (publish discipline pattern)
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified per DEC-019. This report does not change Host validation status.

---

## 1. Summary

| Field | Value |
| --- | --- |
| Package | `o-coding-navigation` |
| Version | `0.1.0-beta.0` |
| Tag | `beta` (literal `--tag beta`; no shortcuts, no `--ignore-scripts`) |
| Publish executed | yes |
| Publish result | **success** |
| npm package URL | https://www.npmjs.com/package/o-coding-navigation |
| `latest` movement | **no** — `dist-tags.latest` remained `0.1.0-alpha.0` per DEC-020 / DEC-021 Option A |
| Caveat preserved | yes |

> **Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.**

This publish is the first crossing of the alpha → beta semver boundary for OCN. It ships as a narrow promotion: same content as the post-P1-fix-train alpha plus the post-alpha hardening reports, lifted to a new opt-in `@beta` install lane, with no changes to active install docs (those land in a separate follow-up PR per DEC-021's Beta documentation rule).

## 2. DEC basis

This publish is gated by, and traceable to, the following decision log entries on `main`:

- **DEC-005** — original "External MCP Host Validation pending." caveat.
- **DEC-009** — package contents allowlist (`package.json.files`).
- **DEC-016** — alpha.2 publish discipline pattern (manual version handling, evidence report, DEC-009 enforcement, no `--ignore-scripts`, `--tag <tag>` always explicit).
- **DEC-017** — close Claude Desktop MCP Host validation caveat (scoped).
- **DEC-018** — begin beta candidate preparation.
- **DEC-019** — beta Host support boundary = Claude Desktop on Windows with WSL2 only; Cursor / Cline explicitly unverified.
- **DEC-020** — npm `latest` tag strategy: keep `latest` unchanged during alpha; future beta promotion DEC must explicitly choose.
- **DEC-021** — **authorises this publish.** 18-step pre-publish checklist; Option A from DEC-020 (publish under `beta` only, leave `latest` unchanged); binding Host wording carried forward from DEC-019.

The full evidence chain referenced by DEC-021 is on `main`:

| Evidence | Path |
| --- | --- |
| alpha.2 publish report | `docs/reports/2026-04-30-npm-alpha-2-publish-report.md` |
| Claude Desktop real Host validation | `docs/reports/2026-04-30-mcp-external-host-validation-report.md` |
| state-store lock-observability flake hardening | `docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md` |
| CI Node 22 matrix expansion | `docs/reports/2026-05-01-ci-node-22-matrix-expansion.md` |
| npm global install smoke | `docs/reports/2026-05-01-npm-global-install-smoke.md` |
| examples/discovery-to-plan walkthrough | `docs/reports/2026-05-01-examples-discovery-to-plan.md` |
| beta doc language audit | `docs/reports/2026-05-01-beta-doc-language-audit.md` |

## 3. Version bump evidence

```
package.json before: "version": "0.1.0-alpha.2"
package.json after:  "version": "0.1.0-beta.0"

package-lock.json:   top-level "version" + packages[""].version mirrored
                     0.1.0-alpha.2 → 0.1.0-beta.0
                     via `npm install --package-lock-only`

git diff --stat -- package.json package-lock.json
 package-lock.json | 4 ++--
 package.json      | 2 +-
 2 files changed, 3 insertions(+), 3 deletions(-)
```

Dependency graph: **unchanged**. The lock file diff contains exactly two `version` mirrors (top-level and `packages[""].version`); no other field changed. Confirmed via `git diff -- package-lock.json | grep '^[+-]'`.

`npm version` was **not** used. The bump was performed via a deterministic Node one-liner that asserts the previous version is `0.1.0-alpha.2` before writing.

## 4. Pre-publish checklist evidence (DEC-021 §Required pre-publish checklist)

| Step | Command / check | Result | Evidence summary |
| --- | --- | --- | --- |
| 1 | `grep -c "DEC-021" docs/20-decision-log.md` | ✅ | 6 hits — DEC-021 fully present on the publish branch's base (post-merge `main`). |
| 2 | `node -p "require('./package.json').name"` | ✅ | `o-coding-navigation` |
| 3 | `node -p "require('./package.json').version"` (pre-bump) | ✅ | `0.1.0-alpha.2` |
| 4 | hand-edit `package.json` version → `0.1.0-beta.0` (Node one-liner; `npm version` NOT used) | ✅ | post-bump `node -p` returns `0.1.0-beta.0`. |
| 5 | `npm install --package-lock-only` | ✅ | "up to date in 654ms" — no install of new packages. |
| 6 | `git diff -- package.json package-lock.json` | ✅ | exactly the version-mirror diff; no dependency graph change. |
| 7 | `npm config get registry` | ✅ | `https://registry.npmjs.org/` |
| 8 | `npm whoami` | ✅ | succeeded; username redacted in public report. |
| 9 | `npm view o-coding-navigation@0.1.0-beta.0 …` (preflight) | ✅ | E404 — version not yet published; safe to publish. |
| 10 | `npm run lint`, `typecheck`, `test`, `test:coverage`, `build` | ✅ | lint clean; tsc clean; **449 / 449** tests pass; coverage **83.47%**; build emits `dist/` cleanly with `chmod +x dist/cli/index.js dist/mcp/index.js`. |
| 11 | `bash examples/discovery-to-plan/scripts/smoke.sh` | ✅ | walked all 10 enumerated steps to terminal `state_plan / step_mvp_plan`; closing line `Discovery-to-plan smoke completed.` |
| 12 | local install smoke (current dir → temp prefix) | ✅ | see §7. |
| 13 | `npm pack --dry-run` | ✅ | 239 files, 94.4 kB packed / 358.1 kB unpacked, shasum `758487bee7cb8d50e1d1c581aa349ca59a37eafd`. |
| 14 | DEC-009 allowlist verification | ✅ | grep for forbidden paths returned empty; tarball contains only `LICENSE`, `README.md`, `package.json`, `docs/quickstart.md`, `docs/mcp-usage.md`, `dist/**`. |
| 15 | `npm publish --tag beta` | ✅ | `+ o-coding-navigation@0.1.0-beta.0` — see §9. |
| 16 | `npm view o-coding-navigation@0.1.0-beta.0 …` (post-publish) | ✅ | confirmed `dist-tags.beta = 0.1.0-beta.0`, `dist-tags.alpha = 0.1.0-alpha.2`, `dist-tags.latest = 0.1.0-alpha.0`. |
| 17 | expected tag state confirmation | ✅ | matches DEC-021 §"latest strategy for first beta": alpha unchanged, beta NEW, latest unchanged. |
| 18 | forbidden-action verification | ✅ | no git tag, no GitHub release, no README/quickstart/mcp-usage/workflows diff, package-lock diff is version-only. |

18 / 18 steps green.

## 5. Local gate evidence

```
$ npm run lint
> eslint .
(no output)

$ npm run typecheck
> tsc --noEmit
(no output)

$ npm run test
 Test Files  68 passed (68)
      Tests  449 passed (449)
   Duration  3.61s

$ npm run test:coverage
 All files  | 83.47 | 85.91 | 89.93 | 83.47 |  (≥ 80% gate)

$ npm run build
> tsc -p tsconfig.build.json && chmod +x dist/cli/index.js dist/mcp/index.js
(no output)

$ node dist/cli/index.js --version
0.1.0-beta.0
```

## 6. Example smoke evidence

`bash examples/discovery-to-plan/scripts/smoke.sh` walked all 10 enumerated v1.0 SOP steps end-to-end through a hermetic `mktemp -d` temp project against the rebuilt `dist/cli/index.js`:

| Iteration | Step | check | gate | advance | next |
| --- | --- | --- | --- | --- | --- |
| 1 | `step_project_brief` | ✅ | ✅ | ✅ | `step_scope` |
| 2 | `step_scope` | ✅ | ✅ | ✅ | `step_prd` |
| 3 | `step_prd` | ✅ | ✅ | ✅ | `step_acceptance_criteria` |
| 4 | `step_acceptance_criteria` | ✅ | ✅ | ✅ | `step_technical_architecture` |
| 5 | `step_technical_architecture` | ✅ | ✅ | ✅ | `step_information_architecture` |
| 6 | `step_information_architecture` | ✅ | ✅ | ✅ | `step_data_model` |
| 7 | `step_data_model` | ✅ | ✅ | ✅ | `step_api_contract` |
| 8 | `step_api_contract` | ✅ | ✅ | ✅ | `step_test_strategy` |
| 9 | `step_test_strategy` | ✅ | ✅ | ✅ | `step_mvp_plan` |
| 10 | `step_mvp_plan` | ✅ | ✅ | ⛔ documented terminal `ERR_STATE_MACHINE` | — |

Final state: `state_plan / step_mvp_plan`. Closing line: `Discovery-to-plan smoke completed.`

## 7. Install smoke evidence

A hermetic `mktemp -d` smoke installed the **current branch's package** (`npm install -g "$(pwd)" --prefix <temp>`) — i.e. exactly the bits that will be published — into a temporary npm prefix, then exercised the binaries.

```
$ SMOKE_ROOT=$(mktemp -d -t ocn-beta-smoke-XXXXXX)
$ NPM_PREFIX="$SMOKE_ROOT/npm-global"
$ npm install -g "$(pwd)" --prefix "$NPM_PREFIX"
added 1 package in 258ms

$ ls "$NPM_PREFIX/bin"
ocn
ocn-mcp

$ "$NPM_PREFIX/bin/ocn" --version
0.1.0-beta.0

$ "$NPM_PREFIX/bin/ocn" --help     # head 5
Usage: ocn [options] [command]

O'CodingNavigator — local-first AI Coding workflow operating system.

Options:

# ocn-mcp boot test, stdin=/dev/null, separate stdout/stderr capture, 2s wait
$ "$NPM_PREFIX/bin/ocn-mcp" </dev/null >stdout 2>stderr &
$ # process exited on its own with rc=0 within ~2s
ocn-mcp self-exited rc=0 on stdin EOF
stdout bytes: 0 | stderr bytes: 0
```

`ocn-mcp` exited cleanly on stdin EOF, **zero** stdout, **zero** stderr — confirms `silentAuditFallbackLogger` is active in the published artifact (the same protocol-cleanliness Claude Desktop's PR D / DEC-017 validation observed).

Disposable project smoke through the **installed** binary:

```
$ "$NPM_PREFIX/bin/ocn" init
OCN initialized at /tmp/ocn-beta-smoke-CcPa5Z/ocn-demo (tier=minimal).
Current State: state_discovery
Current Step:  step_project_brief

$ # populate docs/00-project-brief.md with all 4 required sections
$ "$NPM_PREFIX/bin/ocn" status   # → state_discovery / step_project_brief, current artifact docs/00-project-brief.md
$ "$NPM_PREFIX/bin/ocn" check --json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "Step step_project_brief passed the artifact check.",
    "zh": "step step_project_brief 已通过步骤产物检查。"
  },
  "data": {
    "artifactPath": "/tmp/ocn-beta-smoke-CcPa5Z/ocn-demo/docs/00-project-brief.md",
    "status": "pass",
    "missingRequiredSectionIds": []
  }
}

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

End-to-end verified: P1-001 / P1-002 / P1-003 / P1-004 all reach the installed beta artifact. The user's actual `~/.npm-global` prefix was not modified (verified before/after); smoke artifacts cleaned up after evidence capture.

## 8. `npm pack` evidence

```
npm notice Tarball Details
npm notice name:           o-coding-navigation
npm notice version:        0.1.0-beta.0
npm notice filename:       o-coding-navigation-0.1.0-beta.0.tgz
npm notice package size:   94.4 kB
npm notice unpacked size:  358.1 kB
npm notice shasum:         758487bee7cb8d50e1d1c581aa349ca59a37eafd
npm notice total files:    239
```

Tarball roots:

- `LICENSE`
- `README.md`
- `package.json`
- `docs/quickstart.md`
- `docs/mcp-usage.md`
- `dist/**` (compiled JS + `.d.ts` + sourcemaps for cli/, core/, mcp/, sops/, types/, version)

Excluded (DEC-009 allowlist verified empty for every entry):

- `tests/`, `todos/`, `.ocoding/`
- `.env`, secrets, private keys
- `docs/plans/`, `docs/reports/`, `docs/amendments/`
- `src/`, `node_modules/`
- `.git/`, `.github/`, `.husky/`, `coverage/`

Size delta vs alpha.2 (94.0 kB / 355.8 kB / 239 files) is +0.4 kB packed, +2.3 kB unpacked, same file count — within expected noise from the post-alpha-2 internal-doc edits compiled into `dist/sops/.../data.js` etc.

## 9. `npm publish` output

```
npm notice Tarball Details
npm notice name: o-coding-navigation
npm notice version: 0.1.0-beta.0
npm notice filename: o-coding-navigation-0.1.0-beta.0.tgz
npm notice package size: 94.4 kB
npm notice unpacked size: 358.1 kB
npm notice shasum: 758487bee7cb8d50e1d1c581aa349ca59a37eafd
npm notice total files: 239
npm notice
npm notice Publishing to https://registry.npmjs.org/ with tag beta and default access
+ o-coding-navigation@0.1.0-beta.0
```

- Status: **success**
- Package: `o-coding-navigation`
- Version: `0.1.0-beta.0`
- Tag: `beta` (literal flag — verified in DEC-021 §15)
- Registry: `https://registry.npmjs.org/`
- npm package URL: https://www.npmjs.com/package/o-coding-navigation

The exact command was `npm publish --tag beta` — no `--ignore-scripts`, no `--tag latest`, no implicit-default tag. `prepublishOnly` ran (lint + typecheck + test:coverage + build, all green) before the upload.

## 10. Post-publish `npm view`

```
$ npm view o-coding-navigation dist-tags version name --json
{
  "dist-tags": {
    "latest": "0.1.0-alpha.0",
    "alpha":  "0.1.0-alpha.2",
    "beta":   "0.1.0-beta.0"
  },
  "version": "0.1.0-alpha.0",
  "name": "o-coding-navigation"
}

$ npm view o-coding-navigation@0.1.0-beta.0 name version dist-tags --json
{
  "name": "o-coding-navigation",
  "version": "0.1.0-beta.0",
  "dist-tags": {
    "latest": "0.1.0-alpha.0",
    "alpha":  "0.1.0-alpha.2",
    "beta":   "0.1.0-beta.0"
  }
}
```

The unqualified `npm view` resolves the package's "default" version via `dist-tags.latest`, which deliberately remains `0.1.0-alpha.0` per DEC-008 / DEC-012 / DEC-015 / DEC-016 / DEC-020 / DEC-021. The version-specific query is authoritative for the new beta resolution.

Confirmed (DEC-021 §17 expected state):

- `name` = `o-coding-navigation` ✅
- `dist-tags.alpha` = `0.1.0-alpha.2` (unchanged) ✅
- `dist-tags.beta` = `0.1.0-beta.0` (NEW) ✅
- `dist-tags.latest` = `0.1.0-alpha.0` (deliberately unchanged — no promotion) ✅

## 11. Non-goals confirmed

The following are confirmed **not** to have happened during this publish:

- ❌ **No `npm dist-tag` command.** The `beta` tag was created by `npm publish --tag beta`, never via `npm dist-tag add/set`.
- ❌ **No `latest` promotion.** `dist-tags.latest` stayed at `0.1.0-alpha.0`. Verified pre- and post-publish.
- ❌ **No git tag created.** `git tag --list` returns empty.
- ❌ **No GitHub release created.** `gh release list --limit 5` returns empty.
- ❌ **No `README.md` install-command update.** This PR records evidence; the active-doc update from `@alpha` to `@beta` is a separate follow-up PR per DEC-021 §"Beta documentation rule (post-publish)".
- ❌ **No `docs/quickstart.md` install-command update.** Same.
- ❌ **No `docs/mcp-usage.md` change.** Same.
- ❌ **No `.github/workflows/*` change.**
- ❌ **No `--ignore-scripts`** during publish.
- ❌ **No `--tag latest`** or bare `npm publish` used.
- ❌ **No Cursor compatibility claim added.** Cursor remains unverified per DEC-019.
- ❌ **No Cline compatibility claim added.** Same.
- ❌ **No DEC-017 caveat removal beyond the pre-existing Claude Desktop scope.**

## 12. Follow-up

This publish is the **end of the DEC-018 beta candidate preparation track**. All eight DEC-018 prerequisites are now complete and the first beta is live on npm under `@beta`. The following next moves each require their own focused decision and PR; none are authorised by this report:

- **Active-doc install-command update.** A separate docs PR may update `README.md` / `docs/quickstart.md` to introduce `npm install -g o-coding-navigation@beta` alongside or in place of the `@alpha` form. Per DEC-021's Beta documentation rule, that PR may proceed only after `npm view o-coding-navigation@beta` returns `0.1.0-beta.0` (verified above) and may not introduce untagged install commands while DEC-020 is in force.
- **Cursor real-Host validation.** A separate future PR following the DEC-017 pattern (scoped report + closure DEC) widens the validated Host set. Cursor remains unverified until then.
- **Cline real-Host validation.** Same pattern.
- **`latest`-tag movement DEC.** The next DEC that touches `dist-tags.latest` would have to weigh the trade-off between exposing untagged installs to a pre-GA package vs. leaving `latest` indefinitely stale at `0.1.0-alpha.0`. Likely tied to a GA readiness decision rather than a beta-2 patch.
- **GitHub release / git tag decision.** OCN has so far avoided git tags + GitHub releases per the publish-discipline DECs. A future beta-or-later DEC may revisit if external observability (e.g. dependabot signals, GitHub release notifications) becomes valuable.
- **CI matrix expansion past `[20, 22]`.** Multi-OS expansion (Windows / macOS) and additional Node versions (24+) remain a separate later DEC, likely at GA.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
