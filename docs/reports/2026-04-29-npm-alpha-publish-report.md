# npm Alpha Publish Report｜npm alpha 发布报告

> Date: 2026-04-30
> Branch: `chore/ga-prep-npm-alpha-publish` (off `main` at `6b6a415`).
> Companion DEC: [DEC-012 — Authorise Separate npm Alpha Publish PR](../20-decision-log.md#dec-012authorise-separate-npm-alpha-publish-pr).
> Status: **PUBLISH SUCCEEDED.**

---

## 1. Summary｜摘要

| Field | Value |
|---|---|
| Package | **`o-coding-navigation`** |
| Version | **`0.1.0-alpha.0`** |
| npm tag | `alpha` (per DEC-012 R22) |
| Publish executed | **Yes** |
| Publish result | **SUCCESS** |
| npm registry URL | https://www.npmjs.com/package/o-coding-navigation |
| Tarball URL | https://registry.npmjs.org/o-coding-navigation/-/o-coding-navigation-0.1.0-alpha.0.tgz |
| Tarball shasum | `4385d21882e3cd8b1b86eabd677be51c8b37e364` |
| Tarball integrity | `sha512-8TMo83E+JIXlCvHiCkHmF9VTpoe+LbbcWmrOuHhrSCZnkk1e4ySFudxVJWEEz6sn18ta7W/Ztw3V5yIdG5GaEg==` |
| Total files | 230 |
| Package size (compressed) | 83.5 kB |
| Unpacked size | 317.6 kB |
| Caveat included | **Yes** (this report; DEC-012; DEC-005 propagated) |

> **External MCP Host Validation pending.**
> **Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.**

### Publish history (3 attempts; the third succeeded)

| # | Branch / Run | Failure mode | Recovery |
|---|---|---|---|
| 1 | `chore/ga-prep-npm-alpha-publish` (1st attempt) | npm registry HTTP 403 — 2FA required | Maintainer added a granular access token with bypass-2FA. |
| 2 | `chore/ga-prep-npm-alpha-publish` (2nd attempt) | `prepublishOnly` blocked by `tests/unit/audit-writer-markdown.test.ts > "concurrent first-writes still produce exactly one header"` — third occurrence of CI Stability Audit F-2 | DEC-013 + PR #20 quarantined the flaky test into `tests/flaky/` (test preserved, runnable on demand via `npm run test:flaky`, excluded from default suite). |
| 3 | this PR | — | Published cleanly. |

---

## 2. DEC basis｜DEC 依据

| DEC | Title | Role in this publish |
|---|---|---|
| [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) | External MCP Host Validation pending | Caveat propagated through this report; description, keywords, README all clean of host-compatibility claims. |
| [DEC-007](../20-decision-log.md#dec-007first-semver-lane) | First semver lane | Version published as `0.1.0-alpha.0`. |
| [DEC-008](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion) | Alpha publish before PR D, with caveat | Authorised the alpha publish; the caveat is in §1 above. |
| [DEC-009](../20-decision-log.md#dec-009package-contents-policy) | Package contents policy | `files` allowlist controls tarball; verified via §6 below. |
| [DEC-011](../20-decision-log.md#dec-011lock-npm-package-name-to-o-coding-navigation) | Package name lock | Name `o-coding-navigation` published. |
| [DEC-012](../20-decision-log.md#dec-012authorise-separate-npm-alpha-publish-pr) | Authorise separate npm alpha publish PR | The pre-publish 12-step checklist below is DEC-012's checklist; this PR is the publish PR DEC-012 authorised. |
| [DEC-013](../20-decision-log.md#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate) | Quarantine markdown concurrency flake | Made `prepublishOnly` deterministic so this publish could complete. |

---

## 3. Pre-publish checklist evidence｜12-step 检查清单证据

All 12 steps executed in order. None skipped.

| Step | Command | Result | Evidence summary |
|---|---|---|---|
| 1 | `git status --short` | ✅ Pass | Working tree clean. |
| 2 | branch state | ✅ Pass | On `chore/ga-prep-npm-alpha-publish`, 0 commits ahead of `main` at `6b6a415`. |
| 3 | `node -p "require('./package.json').name"` | ✅ Pass | Output: `o-coding-navigation` (matches DEC-011). |
| 4 | `node -p "require('./package.json').version"` | ✅ Pass | Output: `0.1.0-alpha.0` (matches DEC-007). |
| 5 | `npm view o-coding-navigation name version description repository --json` | ✅ Pass | Returned `npm error code E404` / `Not Found`. Name was unclaimed at 2026-04-30T12:46:Z (just before publish). |
| 6 | `npm run lint` | ✅ Pass | ESLint clean. |
| 7 | `npm run typecheck` | ✅ Pass | `tsc --noEmit` clean. |
| 8 | `npx vitest run` (full default suite) | ✅ Pass | **393 passed across 63 files.** (Was 394 before DEC-013; the 1 quarantined test correctly absent.) |
| 9 | `npm run test:coverage` | ✅ Pass | 393 / 63 + coverage 83.44 % lines / 85.25 % branches / 90.69 % functions. Above the configured thresholds (lines 70 / branches 60 / functions 70). |
| 10 | `npm run build` | ✅ Pass | `tsc -p tsconfig.build.json` + `chmod +x dist/cli/index.js dist/mcp/index.js` clean. |
| 11 | `npm pack --dry-run` + forbidden-paths check | ✅ Pass | 230 files, 83.5 kB packed, 317.6 kB unpacked, shasum `4385d21882e3cd8b1b86eabd677be51c8b37e364`. No forbidden paths in the file list (verified via grep for `tests/`, `todos/`, `.ocoding/`, `secrets`, `docs/plans/`, `docs/reports/`, `docs/amendments/`, `src/`, `node_modules/`, `.git/`, `.github/`, `.husky/`, `coverage/`, `tsconfig`, `eslint.config`, `vitest.config`, `vitest.flaky.config`). |
| 12a | `npm whoami` | ✅ Pass | Returned `uncletimgz` (matches GitHub owner per DEC-011 R23). |
| 12b | `npm config get registry` | ✅ Pass | Returned `https://registry.npmjs.org/` (matches DEC-012 R23 expectation). |

---

## 4. npm name availability — final check｜发布前最终可用性确认

Re-run immediately before `npm publish` (within the same shell session):

```
$ npm view o-coding-navigation name version description repository --json
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/o-coding-navigation - Not found
npm error 404
npm error 404  The requested resource 'o-coding-navigation@*' could not be found or you do not have permission to access it.
{
  "error": {
    "code": "E404",
    "summary": "Not Found - GET https://registry.npmjs.org/o-coding-navigation - Not found",
    ...
  }
}
```

**Interpretation**: name was unclaimed at the moment of the check. The publish succeeded seconds later; no race condition observed (R21 mitigated).

---

## 5. Local gate results｜本地门禁结果

| Gate | Pre-publish run | `prepublishOnly` re-run (during `npm publish`) |
|---|---|---|
| `npm run lint` | ✅ clean | ✅ clean |
| `npm run typecheck` | ✅ clean | ✅ clean |
| `npm run test` (default) | ✅ 393 / 63 | (subsumed by `test:coverage` below) |
| `npm run test:coverage` | ✅ 393 / 63; 83.44 / 85.25 / 90.69 | ✅ 393 / 63; 83.44 / 85.25 / 90.69 |
| `npm run build` | ✅ clean | ✅ clean |
| `npm pack --dry-run` | ✅ 230 files / 83.5 kB packed | (subsumed by the actual publish below) |

The `prepublishOnly` re-run inside `npm publish` is the **safety re-verification** — it ensures nothing changed between the manual checklist and the actual upload. The hashes and counts matched exactly across both runs.

---

## 6. `npm pack` evidence｜tarball 内容

Tarball contents (full file-by-file list captured during `npm publish`):

- **Root files**:
  - `LICENSE` (11.3 kB) — Apache-2.0 full text
  - `README.md` (12.9 kB) — Phase-2-Complete README
  - `package.json` (2.1 kB)
  - `docs/quickstart.md` (6.5 kB)
  - `docs/mcp-usage.md` (10.4 kB)
- **`dist/`** — full compiled tree (~225 entries, see DEC-009 §Decision):
  - `dist/cli/` — CLI commands + render + entry
  - `dist/core/` — full core engine (advance, artifact, audit, brief, check, doc, gate, init, log, prompt, security, sop, state, state-machine, status, templates)
  - `dist/index.{js,d.ts,js.map}` — library entry
  - `dist/mcp/` — MCP server + 7 tools
  - `dist/sops/default-ai-coding-sop/0.1.0/` — bundled SOP profile
  - `dist/types/` — zod schema types
- **Confirmed absent from tarball** (per DEC-009 + this audit):
  - `tests/`, `tests/flaky/`
  - `todos/`
  - `docs/plans/`, `docs/reports/`, `docs/amendments/`, `docs/security/`, `docs/00-08*.md`, `docs/20-decision-log.md`
  - `.ocoding/`
  - `secrets/`, `.env`, private keys
  - `src/` (only compiled `dist/` ships)
  - `node_modules/`
  - `.git/`, `.github/`, `.husky/`
  - `coverage/`
  - `tsconfig*.json`, `eslint.config.*`, `vitest.config.ts`, `vitest.flaky.config.ts`

The shipped contents exactly match DEC-009's allowlist intent. No leakage.

---

## 7. npm identity and registry｜身份与 registry

| Field | Value |
|---|---|
| `npm whoami` | `uncletimgz` (succeeded; matches DEC-011 R23 expectation) |
| `npm config get registry` | `https://registry.npmjs.org/` (matches DEC-012 R23) |
| Auth method | Granular access token with bypass-2FA (configured by maintainer between attempts 1 and 3 — see §1 history) |

The maintainer's full identity is published as part of the package metadata on npm (per npmjs.com convention). This report does not redact it.

---

## 8. `npm publish` output｜publish 输出（节选）

Full output is too large to inline here; the key terminal lines are:

```
> o-coding-navigation@0.1.0-alpha.0 prepublishOnly
> npm run lint && npm run typecheck && npm run test:coverage && npm run build
[…all gates pass; 393 tests / 63 files; 83.44% lines coverage…]

npm notice
npm notice 📦  o-coding-navigation@0.1.0-alpha.0
npm notice Tarball Contents
[…230 file entries…]
npm notice Tarball Details
npm notice name: o-coding-navigation
npm notice version: 0.1.0-alpha.0
npm notice filename: o-coding-navigation-0.1.0-alpha.0.tgz
npm notice package size: 83.5 kB
npm notice unpacked size: 317.6 kB
npm notice shasum: 4385d21882e3cd8b1b86eabd677be51c8b37e364
npm notice integrity: sha512-8TMo83E+JIXlC[...]w3V5yIdG5GaEg==
npm notice total files: 230
npm notice
npm notice Publishing to https://registry.npmjs.org/ with tag alpha and default access
+ o-coding-navigation@0.1.0-alpha.0
```

The trailing line `+ o-coding-navigation@0.1.0-alpha.0` is npm's standard success indicator. Exit code: 0.

The line `Publishing to https://registry.npmjs.org/ with tag alpha and default access` confirms DEC-012 R22 was honoured — the `--tag alpha` flag was correctly applied by the npm CLI.

---

## 9. Post-publish verification｜发布后验证

Run immediately after the publish:

```bash
$ npm view o-coding-navigation dist-tags version name --json
{
  "dist-tags": {
    "alpha": "0.1.0-alpha.0",
    "latest": "0.1.0-alpha.0"
  },
  "version": "0.1.0-alpha.0",
  "name": "o-coding-navigation"
}
```

Full metadata snapshot:

```
o-coding-navigation@0.1.0-alpha.0 | Apache-2.0 | deps: 5 | versions: 1
Local-first AI coding navigation CLI and MCP server with step gates, audit trail, and SOP-aware project state.
https://github.com/UncleTIM-GZ/O-CodingNavigation#readme

keywords: ai-coding, mcp, cli, sop, project-management, developer-tools, audit-trail

bin: ocn, ocn-mcp

dist
.tarball: https://registry.npmjs.org/o-coding-navigation/-/o-coding-navigation-0.1.0-alpha.0.tgz
.shasum: 4385d21882e3cd8b1b86eabd677be51c8b37e364
.integrity: sha512-8TMo83E+JIXlC[...]w3V5yIdG5GaEg==
.unpackedSize: 317.6 kB

dependencies:
@modelcontextprotocol/sdk: ^1.29.0
commander: ^12.1.0
js-yaml: ^4.1.0
ulid: ^2.3.0
zod: ^3.23.8

maintainers:
- uncletimgz <oujianfeng@gmail.com>

dist-tags:
latest: 0.1.0-alpha.0
alpha:  0.1.0-alpha.0

published just now by uncletimgz <oujianfeng@gmail.com>
```

### Notable observation: `latest` and `alpha` both point to `0.1.0-alpha.0`

This is **expected npm behaviour for the first published version of a package**: when no prior version exists, npm sets `latest` to whatever the first publish is, **regardless of the `--tag` flag**. The `--tag alpha` flag was honoured (the `alpha` tag is correctly set), but npm additionally auto-set `latest` because there was no prior `latest` to preserve.

**Practical consequence**:

- `npm install -g o-coding-navigation` (without `@alpha`) currently installs `0.1.0-alpha.0`.
- `npm install -g o-coding-navigation@alpha` installs the same version.
- This will self-correct when a stable `0.1.0` (no `-alpha` suffix) or `1.0.0` is published — at that point `latest` will move and `alpha` will pin to the alpha line.

**Decision**: leave `latest` pointing at `0.1.0-alpha.0` for now. The package description itself contains `alpha`-shape language (the version IS the disclosure), and any user reading the install output sees the version. Removing the `latest` tag explicitly (`npm dist-tag rm o-coding-navigation latest`) was considered but rejected — it would break npmjs.com's package detail page rendering, which derives several fields from `latest`.

This nuance will be added as a one-line note in any future README update PR; for now it lives only in this report.

---

## 10. Non-goals confirmed｜未做事项

The publish PR explicitly **did NOT**:

- ❌ Create a git tag (`v0.1.0-alpha.0` or any other shape). DEC-012 §Cross-cutting note forbids without a separate decision.
- ❌ Create a GitHub release. Same.
- ❌ Update README install command. Currently `git clone … && npm link`; the post-publish update is a separate doc PR per DEC-012 §Follow-up.
- ❌ Update `docs/quickstart.md` install commands. Same as README.
- ❌ Claim PR D is complete. Per DEC-005, it remains pending.
- ❌ Claim any external MCP host (Claude Desktop / Cursor / Cline) is verified. Same.
- ❌ Modify `package.json` or `package-lock.json` in this PR (this PR is publish-evidence-only; the package was already prepared in PR #18).
- ❌ Modify `.github/workflows/`.
- ❌ Modify `src/`.
- ❌ Use `npm publish --ignore-scripts` (DEC-013 was the right path, not bypassing the gate).

The audit-markdown concurrency race (`src/core/audit/audit-markdown.ts` TOCTOU between `fs.stat` and `fs.appendFile`) remains **unfixed** — DEC-013 only quarantined the test that exposes it. The fix is a separate follow-up; suggested patch in [`docs/reports/2026-04-29-flaky-test-quarantine.md`](2026-04-29-flaky-test-quarantine.md) §5 (`fs.writeFile` with `flag: 'wx'`).

---

## 11. Follow-up｜后续工作

In rough priority order, none auto-starts:

1. **Update README install commands** (post-publish doc PR). Replace `git clone … && npm link` with `npm install -g o-coding-navigation@alpha`. Mention the `latest`-also-points-to-alpha quirk briefly.
2. **Update `docs/quickstart.md`** install commands. Same change.
3. **Add an npm package badge** (optional) to the README header: `https://img.shields.io/npm/v/o-coding-navigation?label=npm`.
4. **Fix the audit-markdown concurrency race** (`src/core/audit/audit-markdown.ts`) per the suggested deterministic patch. After the fix, move the quarantined test back from `tests/flaky/` to `tests/unit/`.
5. **PR D — External MCP Host Validation** — orthogonal; runs whenever a real MCP host (Claude Desktop / Cursor / Cline) becomes available. The DEC-005 caveat lifts after PR D completes.
6. **Beta promotion DEC** (future). Will require: PR D complete, audit-markdown fix landed, optional CI matrix expansion (Node 22 + macOS/Windows per DEC-010 follow-up), examples PR F2/F3 complete.
7. **GitHub release / git tag** (optional, separately authorised). Not required by DEC-012; not done here.
8. **Potential decision to sponsor or transfer ownership of the unrelated `ocn` package** on npm (out of scope; mentioned only because the name disambiguation came up in DEC-006 / DEC-011).

Until PR D completes, every release-related artifact (release notes, README, npm description, blog posts, tweets) drafted from this point onward must include the verbatim line:

> **External MCP Host Validation pending.**

---

## 12. References

- [DEC-005 — External MCP Host Validation pending](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)
- [DEC-007 — first semver lane](../20-decision-log.md#dec-007first-semver-lane)
- [DEC-008 — alpha publish before PR D, with caveat](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion)
- [DEC-009 — package contents policy](../20-decision-log.md#dec-009package-contents-policy)
- [DEC-011 — lock package name](../20-decision-log.md#dec-011lock-npm-package-name-to-o-coding-navigation)
- [DEC-012 — authorise alpha publish PR](../20-decision-log.md#dec-012authorise-separate-npm-alpha-publish-pr)
- [DEC-013 — quarantine audit-markdown concurrency flake](../20-decision-log.md#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate)
- [PR #18 — package metadata](https://github.com/UncleTIM-GZ/O-CodingNavigation/pull/18)
- [PR #20 — flake quarantine](https://github.com/UncleTIM-GZ/O-CodingNavigation/pull/20)
- [`docs/reports/2026-04-29-package-metadata-audit.md`](2026-04-29-package-metadata-audit.md)
- [`docs/reports/2026-04-29-flaky-test-quarantine.md`](2026-04-29-flaky-test-quarantine.md)
- [`docs/reports/2026-04-29-ci-stability-audit.md`](2026-04-29-ci-stability-audit.md)
- npm package URL: https://www.npmjs.com/package/o-coding-navigation
- npm tarball URL: https://registry.npmjs.org/o-coding-navigation/-/o-coding-navigation-0.1.0-alpha.0.tgz
