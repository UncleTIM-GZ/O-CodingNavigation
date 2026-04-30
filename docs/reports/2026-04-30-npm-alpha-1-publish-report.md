# npm Alpha.1 Patch Publish Report｜npm alpha.1 补丁发布报告

> Date: 2026-04-30
> Branch: `chore/ga-prep-npm-alpha-1-publish` (off `main` at `4d14c85`).
> Companion DEC: [DEC-015 — Authorise `0.1.0-alpha.1` Patch Publish](../20-decision-log.md#dec-015authorise-010-alpha1-patch-publish).
> Status: **PUBLISH SUCCEEDED.**

---

## 1. Summary｜摘要

| Field | Value |
|---|---|
| Package | **`o-coding-navigation`** |
| Version | **`0.1.0-alpha.1`** (patch over `0.1.0-alpha.0`) |
| npm tag | `alpha` (per DEC-012 R22 + DEC-015) |
| Publish executed | **Yes** |
| Publish result | **SUCCESS** |
| npm registry URL | https://www.npmjs.com/package/o-coding-navigation |
| Tarball URL | https://registry.npmjs.org/o-coding-navigation/-/o-coding-navigation-0.1.0-alpha.1.tgz |
| Tarball shasum | `79cb3d0326a553bf1a7439564988532dc92deadd` |
| Tarball integrity | `sha512-FBA7j++/9DPop[...]m6Zq+8vVie3OQ==` |
| Total files | 230 |
| Package size (compressed) | 85.8 kB |
| Unpacked size | 323.8 kB |
| Purpose | Ship the [DEC-014](../20-decision-log.md#dec-014restore-audit-markdown-concurrency-test-to-default-gate) audit-markdown concurrency fix to npm alpha users. Nothing else. |
| Caveat included | **Yes** (this report; DEC-015; DEC-005 propagated) |

> **External MCP Host Validation pending.**
> **Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.**

---

## 2. DEC basis｜DEC 依据

| DEC | Title | Role in this publish |
|---|---|---|
| [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) | External MCP Host Validation pending | Caveat propagated through this report; description, keywords, README all clean of host-compatibility claims. |
| [DEC-008](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion) | Alpha publish before PR D, with caveat | Authorised the publish line; the caveat is in §1 above. |
| [DEC-009](../20-decision-log.md#dec-009package-contents-policy) | Package contents policy | `files` allowlist controls tarball; verified via §6 below. |
| [DEC-012](../20-decision-log.md#dec-012authorise-separate-npm-alpha-publish-pr) | Authorise alpha publish PR (with 12-step checklist) | Established the publish-checklist pattern; DEC-015 extended it to 14 steps for the patch publish. |
| [DEC-014](../20-decision-log.md#dec-014restore-audit-markdown-concurrency-test-to-default-gate) | Restore audit-markdown concurrency test (race fixed) | The fix that this publish ships. |
| [DEC-015](../20-decision-log.md#dec-015authorise-010-alpha1-patch-publish) | Authorise `0.1.0-alpha.1` patch publish | The 14-step checklist below is DEC-015's checklist; this PR is the publish PR DEC-015 authorised. |

---

## 3. Version bump evidence｜版本升级证据

### `package.json`

```diff
 {
   "name": "o-coding-navigation",
-  "version": "0.1.0-alpha.0",
+  "version": "0.1.0-alpha.1",
   ...
 }
```

Performed via direct hand-edit through Node (not `npm version`, which would create a git tag — forbidden by DEC-015):

```bash
node -e '
const fs = require("fs");
const p = "package.json";
const json = JSON.parse(fs.readFileSync(p, "utf8"));
if (json.version !== "0.1.0-alpha.0") {
  throw new Error(`Expected version 0.1.0-alpha.0, got ${json.version}`);
}
json.version = "0.1.0-alpha.1";
fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n");
'
```

Output: `OK: bumped to 0.1.0-alpha.1`. The pre-bump version assertion `0.1.0-alpha.0` was satisfied.

### `package-lock.json`

Re-synced via:

```bash
npm install --package-lock-only
```

Diff is **+2 / −2 lines** — top-level `version` and `packages[""].version` updated to `0.1.0-alpha.1`. **No dependency-graph change** (no package added, removed, upgraded, or downgraded). This matches DEC-015 step 3 expectations.

```diff
 {
   "name": "o-coding-navigation",
-  "version": "0.1.0-alpha.0",
+  "version": "0.1.0-alpha.1",
   "lockfileVersion": 3,
   "requires": true,
   "packages": {
     "": {
       "name": "o-coding-navigation",
-      "version": "0.1.0-alpha.0",
+      "version": "0.1.0-alpha.1",
       "license": "Apache-2.0",
       "dependencies": { ... unchanged ... },
```

---

## 4. Pre-publish checklist evidence｜14-step 检查清单证据

All 14 steps executed in order. None skipped.

| Step | Command | Result | Evidence summary |
|---|---|---|---|
| 1 | `grep "^## DEC-014" docs/20-decision-log.md && test -f docs/reports/2026-04-30-audit-markdown-concurrency-fix.md && grep "100-run" .../fix.md` | ✅ Pass | DEC-014 present (1 body match); fix report present; "100-run" appears 2× in fix report. |
| 2 | Hand-edit `package.json` version bump (no `npm version`) | ✅ Pass | `0.1.0-alpha.0 → 0.1.0-alpha.1`. Pre-edit guard verified `0.1.0-alpha.0` first. |
| 3 | `npm install --package-lock-only`; verify diff is name/version-only | ✅ Pass | +2 / −2 lines on `package-lock.json`. No dependency graph change. |
| 4 | `node -p "require('./package.json').name"` | ✅ Pass | Output: `o-coding-navigation`. |
| 5 | `node -p "require('./package.json').version"` | ✅ Pass | Output: `0.1.0-alpha.1`. |
| 6 | `npm config get registry` | ✅ Pass | Output: `https://registry.npmjs.org/`. |
| 7 | `npm whoami` | ✅ Pass | Output: `uncletimgz`. Bypass-2FA token from the alpha.0 publish session is still valid. |
| 8 | `npm run lint && typecheck && test && test:coverage && build` | ✅ Pass | Lint clean; typecheck clean; **394 / 63 tests**; coverage **83.45 % lines / 85.09 % branches / 90.76 % functions**; build clean. |
| 9 | 100-run targeted validation: `for i in $(seq 1 100); do npx vitest run tests/unit/audit-writer-markdown.test.ts \|\| exit 1; done` | ✅ Pass | **100 / 100 passed.** No early exit. The restored concurrency test is now deterministic per DEC-014. |
| 10 | `npm pack --dry-run` | ✅ Pass | 230 files, 85.8 kB packed, 323.8 kB unpacked, shasum `79cb3d0326a553bf1a7439564988532dc92deadd`. |
| 11 | Forbidden-paths check on tarball + `npm view o-coding-navigation@0.1.0-alpha.1` | ✅ Pass | No forbidden paths. `npm view` returned E404 (alpha.1 not yet on registry, safe to proceed). |
| 12 | `npm publish --tag alpha` | ✅ **SUCCESS** | npm CLI emitted `+ o-coding-navigation@0.1.0-alpha.1`. "Publishing to https://registry.npmjs.org/ with tag alpha and default access" line confirmed. |
| 13 | Post-publish `npm view o-coding-navigation dist-tags version name --json` | ✅ Pass | `dist-tags.alpha = 0.1.0-alpha.1`; `dist-tags.latest` stayed at `0.1.0-alpha.0` (correct behaviour for `--tag alpha` on a non-first publish). |
| 14 | Forbidden-actions audit: no git tag, no GitHub release, no README change, etc. | ✅ Pass | `git tag --list` empty; `gh release list` empty; only `package.json` + `package-lock.json` modified in working tree. |

---

## 5. Audit-markdown fix validation｜DEC-014 修复验证

### Targeted 100-run validation

```
$ for i in $(seq 1 100); do
    npx vitest run tests/unit/audit-writer-markdown.test.ts || exit 1
  done
=== Result: 100 / 100 passed ===
```

The restored test (in `tests/unit/audit-writer-markdown.test.ts`, last `it()` block of the existing `describe("appendAuditMarkdown — first-write + append")`) passed all 100 consecutive runs without any failure. The DEC-014 fix (writeFile-to-tmp + atomic `fs.link()`) holds deterministically.

### Default suite

| Surface | Test count | Coverage |
|---|---|---|
| Default `npm run test` | 394 / 63 files | — |
| Default `npm run test:coverage` | 394 / 63 + 83.45 % lines / 85.09 % branches / 90.76 % functions | (above thresholds 70 / 60 / 70 / 70) |

Restored test is in the default suite (`tests/unit/audit-writer-markdown.test.ts`); no longer quarantined per DEC-014.

---

## 6. `npm pack --dry-run` evidence｜tarball 内容

```
npm notice 📦  o-coding-navigation@0.1.0-alpha.1
npm notice Tarball Details
npm notice name:           o-coding-navigation
npm notice version:        0.1.0-alpha.1
npm notice filename:       o-coding-navigation-0.1.0-alpha.1.tgz
npm notice package size:   85.8 kB
npm notice unpacked size:  323.8 kB
npm notice shasum:         79cb3d0326a553bf1a7439564988532dc92deadd
npm notice integrity:      sha512-FBA7j++/9DPop[...]m6Zq+8vVie3OQ==
npm notice total files:    230
```

Tarball includes (per DEC-009 allowlist):
- `LICENSE` (11.3 kB)
- `README.md` (now ~12.9 kB; the post-alpha install rewrite from PR #22)
- `docs/quickstart.md` (now 7.7 kB; restructured with the `@alpha`-recommendation primary path)
- `docs/mcp-usage.md` (10.4 kB)
- `package.json` (2.1 kB)
- `dist/` — full compiled tree, ~225 entries (cli, core, mcp, sops, types). The compiled audit-markdown module reflects DEC-014's `ensureMarkdownHeader` + `randomUUID` + atomic-link fix.

Confirmed absent (forbidden paths verified by grep):
- `tests/`, `todos/`, `.ocoding/`, secrets, `.env`, private keys
- `docs/plans/`, `docs/reports/`, `docs/amendments/`, `docs/00-08*`, `docs/security/`, `docs/20-decision-log.md`
- `src/`, `node_modules/`, `.git/`, `.github/`, `.husky/`, `coverage/`
- `tsconfig*.json`, `eslint.config.*`, `vitest.config.ts`

The tarball is **slightly larger than alpha.0** (85.8 kB vs 83.5 kB packed; 323.8 kB vs 317.5 kB unpacked) because:
- README.md was rewritten in PR #22 (~12.9 kB vs prior ~13 kB — roughly equal)
- docs/quickstart.md grew from 6.5 kB → 7.7 kB (restructured for `@alpha` primary path)
- The compiled audit-markdown module gained the new `ensureMarkdownHeader` helper

The size delta is consistent with the doc/quickstart rewrites in PR #22 + the audit-markdown fix; no unexpected files.

---

## 7. npm identity and registry｜身份与 registry

| Field | Value |
|---|---|
| `npm whoami` | `uncletimgz` (succeeded; bypass-2FA token from the alpha.0 publish session is still valid) |
| `npm config get registry` | `https://registry.npmjs.org/` |
| Auth method | Granular access token with bypass-2FA enabled (configured between attempts 1 and 3 of the alpha.0 publish; same token continues to work) |

---

## 8. `npm publish` output｜publish 输出（节选）

```
> o-coding-navigation@0.1.0-alpha.1 prepublishOnly
> npm run lint && npm run typecheck && npm run test:coverage && npm run build
[…all gates pass; 394/63 tests; 83.45% lines coverage…]

npm notice
npm notice 📦  o-coding-navigation@0.1.0-alpha.1
npm notice Tarball Contents
[…230 file entries…]
npm notice Tarball Details
npm notice name: o-coding-navigation
npm notice version: 0.1.0-alpha.1
npm notice filename: o-coding-navigation-0.1.0-alpha.1.tgz
npm notice package size: 85.8 kB
npm notice unpacked size: 323.8 kB
npm notice shasum: 79cb3d0326a553bf1a7439564988532dc92deadd
npm notice integrity: sha512-FBA7j++/9DPop[...]m6Zq+8vVie3OQ==
npm notice total files: 230
npm notice
npm notice Publishing to https://registry.npmjs.org/ with tag alpha and default access
+ o-coding-navigation@0.1.0-alpha.1
```

The trailing line `+ o-coding-navigation@0.1.0-alpha.1` is npm's standard success indicator. Exit code: 0.

The line `Publishing to https://registry.npmjs.org/ with tag alpha and default access` confirms DEC-012 R22 + DEC-015 R34 honoured — the `--tag alpha` flag was correctly applied. **No bare `npm publish`. No `--tag latest`. No `--ignore-scripts`.**

---

## 9. Post-publish verification｜发布后验证

### `npm view o-coding-navigation dist-tags version name`

```json
{
  "dist-tags": {
    "alpha":  "0.1.0-alpha.1",
    "latest": "0.1.0-alpha.0"
  },
  "version": "0.1.0-alpha.0",
  "name":    "o-coding-navigation"
}
```

> Note: The default `version` field that `npm view` reports is whatever `latest` points at — i.e. still `0.1.0-alpha.0`. To inspect alpha.1 specifically, use the next query.

### `npm view o-coding-navigation@0.1.0-alpha.1`

```json
{
  "name":    "o-coding-navigation",
  "version": "0.1.0-alpha.1",
  "dist-tags": {
    "alpha":  "0.1.0-alpha.1",
    "latest": "0.1.0-alpha.0"
  }
}
```

### Notable: `latest` did NOT auto-promote (different from alpha.0)

| Publish | `dist-tags.alpha` | `dist-tags.latest` | Why |
|---|---|---|---|
| alpha.0 (first publish) | `0.1.0-alpha.0` | `0.1.0-alpha.0` | npm auto-promotes the FIRST published version of a package to `latest`, regardless of `--tag`. This is a registry-side rule. Documented in alpha.0 publish report §9. |
| alpha.1 (this publish) | **`0.1.0-alpha.1`** ✅ | **`0.1.0-alpha.0`** (unchanged) | `--tag alpha` on a SUBSEQUENT publish correctly tags only the named tag. `latest` stays where it was. This is the desired and expected behaviour for a pre-1.0 alpha-tagged publish. |

**Practical consequence**:

- `npm install -g o-coding-navigation@alpha` → installs **`0.1.0-alpha.1`** (the fixed version) ✅ — this is the install command in `README.md §4` and `docs/quickstart.md §1a`.
- `npm install -g o-coding-navigation@latest` → installs `0.1.0-alpha.0` (the racy version).
- `npm install -g o-coding-navigation` (no selector) → defaults to `latest`, so installs `0.1.0-alpha.0` (the racy version).

The OCN docs **explicitly** instruct users to use the `@alpha` selector. Users who follow the docs will get the fix automatically on their next install. Users who omit `@alpha` will get the older version, but no published OCN doc tells them to do that.

DEC-015 explicitly forbade `npm dist-tag` ("不要 npm dist-tag"), so we did NOT promote alpha.1 to `latest`. That is a separate decision that, if ever wanted, would need its own DEC entry. For now, the alpha line is correctly threaded.

---

## 10. Non-goals confirmed｜未做事项

This PR explicitly **did NOT**:

- ❌ Use `npm version` (would create a git tag — DEC-015 §Options E).
- ❌ Use bare `npm publish` (DEC-015 R34).
- ❌ Use `--tag latest` (DEC-015 + DEC-012 R22).
- ❌ Use `--ignore-scripts` (would bypass `prepublishOnly` — DEC-013 history forbade this).
- ❌ Use `npm dist-tag add ... latest` (DEC-015 explicit forbid).
- ❌ Create a git tag (`v0.1.0-alpha.1` or any other shape). `git tag --list` is empty.
- ❌ Create a GitHub release. `gh release list` is empty.
- ❌ Update `README.md` install commands. Verified untouched.
- ❌ Update `docs/quickstart.md` install commands. Verified untouched.
- ❌ Modify `docs/mcp-usage.md`. Verified untouched.
- ❌ Modify `src/`. Verified untouched.
- ❌ Modify `.github/workflows/`. Verified untouched.
- ❌ Add new MCP tools.
- ❌ Claim PR D is complete.
- ❌ Claim any external MCP host (Claude Desktop / Cursor / Cline) is verified.

The audit-markdown concurrency race fixed by DEC-014 is now live for npm alpha users. The DEC-005 caveat continues to apply.

---

## 11. Follow-up｜后续工作

In rough priority order, none auto-starts:

1. **Watch `npm install` traffic for ~1–2 weeks**. If anyone reports installing alpha.1 and seeing the audit-markdown race recur, the fix is incomplete and a follow-up DEC + PR would be needed. (Highly unlikely given the 100-run validation, but worth a soft-monitor window.)
2. **PR D — External MCP Host Validation** — orthogonal; lifts the DEC-005 caveat once a real MCP host (Claude Desktop / Cursor / Cline) becomes available and the validation report is captured. After PR D, every doc that currently carries the verbatim caveat needs a follow-up edit to remove it.
3. **Beta promotion DEC** (future) — gated on PR D + DEC-010 follow-ups (CI matrix expansion to Node 22) + examples F2/F3 (executable example). Each is its own DEC.
4. **Optional: promote alpha.1 to `latest`** via `npm dist-tag add o-coding-navigation@0.1.0-alpha.1 latest`. Currently `latest` points at the racy alpha.0. Would require its own DEC entry. Recommended to defer until beta when there's a real story for "what `latest` means in pre-1.0 alpha territory."
5. **`ocn doctor` sweep of stale `*.tmp` files** — deferred from DEC-014; not blocking.
6. **Optional: npm package badge on README header**. Not done in this PR.

Until PR D completes, every release-related artifact (release notes, README, npm description, blog posts, tweets) drafted from this point onward must include the verbatim line:

> **External MCP Host Validation pending.**

---

## 12. References

- [DEC-005 — External MCP Host Validation pending](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)
- [DEC-008 — alpha publish before PR D, with caveat](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion)
- [DEC-009 — package contents policy](../20-decision-log.md#dec-009package-contents-policy)
- [DEC-012 — authorise alpha publish PR (12-step checklist)](../20-decision-log.md#dec-012authorise-separate-npm-alpha-publish-pr)
- [DEC-014 — restore concurrency test (race fixed)](../20-decision-log.md#dec-014restore-audit-markdown-concurrency-test-to-default-gate)
- [DEC-015 — authorise alpha.1 patch publish (14-step checklist)](../20-decision-log.md#dec-015authorise-010-alpha1-patch-publish)
- [`docs/reports/2026-04-30-audit-markdown-concurrency-fix.md`](2026-04-30-audit-markdown-concurrency-fix.md) — the fix this publish ships
- [`docs/reports/2026-04-29-npm-alpha-publish-report.md`](2026-04-29-npm-alpha-publish-report.md) — alpha.0 publish for comparison
- [`docs/reports/2026-04-29-package-metadata-audit.md`](2026-04-29-package-metadata-audit.md) — the package metadata that's now bumped to alpha.1
- npm package URL: https://www.npmjs.com/package/o-coding-navigation
- npm tarball URL: https://registry.npmjs.org/o-coding-navigation/-/o-coding-navigation-0.1.0-alpha.1.tgz
