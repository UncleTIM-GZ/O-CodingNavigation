# Package Metadata Audit｜npm 包元数据审计

> Date: 2026-04-29
> Branch: `chore/ga-prep-package-metadata` (off `main` at `52bc648`).
> Scope: first GA Prep PR that mutates `package.json`. Records the metadata changes, the `npm view` re-check, and the `npm pack --dry-run` evidence. **Does not run `npm publish`.**

---

## 1. Summary｜摘要

| Field | Value |
|---|---|
| Package name | **`o-coding-navigation`** |
| Version | **`0.1.0-alpha.0`** |
| Publish status | **NOT PUBLISHED** |
| `npm publish` executed | **No** |
| `package.json` changed | **Yes** |
| `package-lock.json` changed | **Yes** (name + version + missing `ocn-mcp` bin re-sync; no dependency-graph change — see §10) |
| Tarball produced | Yes — via `npm pack --dry-run` only (no actual tarball file written, no upload) |
| PR D caveat included | **Yes** (in this report; in DEC-005; release-related text follows the same caveat path) |

> External MCP Host Validation pending.
> Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.

---

## 2. DEC basis｜DEC 依据

This package-metadata change is gated on, and traces to, the following DEC entries on `main`:

| DEC | Title | What it authorises |
|---|---|---|
| [DEC-007](../20-decision-log.md#dec-007first-semver-lane) | First semver lane | Version `0.1.0-alpha.0` |
| [DEC-009](../20-decision-log.md#dec-009package-contents-policy) | Package contents policy | `package.json` `files` allowlist |
| [DEC-011](../20-decision-log.md#dec-011lock-npm-package-name-to-o-coding-navigation) | Lock npm package name | `name: "o-coding-navigation"` |
| [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) | External MCP Host Validation pending | Caveat propagated into description / keywords / release-related text |
| [DEC-008](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion) | Alpha publish may be planned before PR D, with caveat | Permits this PR's *planning* step (writing metadata, running dry-run) without lifting the host-compat caveat |

DEC-006 is the *workflow* this PR is the implementation step of. DEC-010 is unrelated to this change (CI matrix policy).

---

## 3. Name availability re-check｜名称可用性复查

Per DEC-011 §Risks R18 and DEC-006's availability-first workflow, `npm view o-coding-navigation` was re-run **immediately before** the `package.json` mutation, on this branch.

**Command:**

```bash
npm view o-coding-navigation name version description repository --json
```

**Run at**: 2026-04-29T15:33:25Z (UTC). Branch: `chore/ga-prep-package-metadata` at parent `52bc648`. Registry: public npm registry (https://registry.npmjs.org/).

**Raw output (verbatim):**

```
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/o-coding-navigation - Not found
npm error 404
npm error 404  The requested resource 'o-coding-navigation@*' could not be found or you do not have permission to access it.
npm error 404
npm error 404 Note that you can also install from a
npm error 404 tarball, folder, http url, or git url.
{
  "error": {
    "code": "E404",
    "summary": "Not Found - GET https://registry.npmjs.org/o-coding-navigation - Not found",
    "detail": "The requested resource 'o-coding-navigation@*' could not be found or you do not have permission to access it.\n\nNote that you can also install from a\ntarball, folder, http url, or git url."
  }
}
npm error A complete log of this run can be found in: /home/timou/.npm/_logs/2026-04-29T15_33_25_539Z-debug-0.log
```

**Interpretation**: `not_found` (`E404`). Consistent with [PR #16's audit](2026-04-29-npm-name-availability-audit.md) result for this candidate. **Safe to proceed with `package.json` mutation.**

**Caveat**: an `E404` proves only that no package exists at this exact path *at this moment*. The name remains unreserved until an actual `npm publish`. The next time this name is checked (e.g. before any future actual publish PR), the same command must be re-run.

---

## 4. `package.json` changes｜package.json 变更

| Field | Before (on `main` at `52bc648`) | After (this PR) | DEC basis |
|---|---|---|---|
| `name` | `"ocn"` | `"o-coding-navigation"` | **DEC-011** |
| `version` | `"0.0.1-alpha.0"` | `"0.1.0-alpha.0"` | **DEC-007** |
| `description` | `"O'CodingNavigator — local-first AI Coding workflow operating system"` | `"Local-first AI coding navigation CLI and MCP server with step gates, audit trail, and SOP-aware project state."` | DEC-005 / DEC-008 (no host-compat claim); refines focus from product-name to feature surface for npm registry searchability |
| `type` | `"module"` | unchanged | — |
| `bin` | `{ "ocn": "dist/cli/index.js", "ocn-mcp": "dist/mcp/index.js" }` | unchanged | — (DEC-011 §Consequences: bin keys stay independent of package name) |
| `exports["."]` | unchanged | unchanged | — |
| `files` | `["dist", "LICENSE", "README.md"]` | `["dist", "LICENSE", "README.md", "docs/quickstart.md", "docs/mcp-usage.md"]` | **DEC-009** |
| `engines.node` | `">=20"` | unchanged | — (kept; this is what CI runs and what users need) |
| `scripts.prepublishOnly` | (absent) | `"npm run lint && npm run typecheck && npm run test:coverage && npm run build"` | PR E plan §5.5 |
| `scripts.*` (other) | (full set) | unchanged | — |
| `repository` | (absent) | `{ "type": "git", "url": "git+https://github.com/UncleTIM-GZ/O-CodingNavigation.git" }` | PR E plan §5.6 |
| `bugs` | (absent) | `{ "url": "https://github.com/UncleTIM-GZ/O-CodingNavigation/issues" }` | PR E plan §5.6 |
| `homepage` | (absent) | `"https://github.com/UncleTIM-GZ/O-CodingNavigation#readme"` | PR E plan §5.6 |
| `keywords` | (absent) | `["ai-coding", "mcp", "cli", "sop", "project-management", "developer-tools", "audit-trail"]` | PR E plan §5.6 |
| `license` | `"Apache-2.0"` | unchanged | — (LICENSE file already exists at repo root, content matches) |
| `dependencies.*` | (full set) | unchanged | — |
| `devDependencies.*` | (full set) | unchanged | — |

### Structural notes

- **Field order** restructured slightly to follow the conventional npm-registry-friendly order: `name`, `version`, `description`, `type`, `bin`, `exports`, `files`, `engines`, `scripts`, `repository`, `bugs`, `homepage`, `keywords`, `license`, `dependencies`, `devDependencies`. No semantic change.
- **No dependency was added, removed, upgraded, or downgraded.**
- **No script behaviour change** — `prepublishOnly` is the only new script; existing scripts (`build`, `dev`, `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `test:coverage`, `prepare`) are untouched.

### Description rationale

The new description explicitly describes *what the package does* (CLI + MCP server, step gates, audit trail, SOP-aware project state) rather than *what the brand is called*. This improves npm-registry searchability (keywords like "MCP", "audit trail", "SOP", "step gates" are searchable via the npm UI). It does **not** make any host-compatibility claim.

---

## 5. `files` allowlist review｜files 白名单审查

```json
"files": [
  "dist",
  "LICENSE",
  "README.md",
  "docs/quickstart.md",
  "docs/mcp-usage.md"
]
```

| Entry | Why included | Verified by `npm pack --dry-run` |
|---|---|---|
| `dist` | Built CLI + MCP server. Required at runtime. | ✅ Present (full directory tree). |
| `LICENSE` | Apache-2.0 license file. Required for redistribution. npm includes it by default; listed explicitly here for clarity. | ✅ Present (11.3 kB). |
| `README.md` | First-touch documentation. npm pages render this on the package detail view. npm includes it by default; listed explicitly here for clarity. | ✅ Present (12.9 kB). |
| `docs/quickstart.md` | Recipe for first-5-minutes user journey. README links to it. | ✅ Present (6.5 kB). |
| `docs/mcp-usage.md` | MCP safety boundaries + tool list. Users wiring `ocn-mcp` need this in the package, not just on GitHub. | ✅ Present (10.4 kB). |

### npm default-include behaviour (recorded for clarity)

Per npm's published rules, the following are automatically included regardless of the `files` field:
- `package.json`
- `README.md` (and aliases — `readme.markdown`, `README`, etc.)
- `LICENSE` / `LICENSE.md` / `LICENCE` etc.

Listing `README.md` and `LICENSE` explicitly in `files` is redundant but not harmful; it documents intent.

### License-file presence

```bash
ls -la LICENSE LICENSE.md 2>&1
```

Result:
- `LICENSE` — present, 11302 bytes (Apache-2.0 full text).
- `LICENSE.md` — not present.

**No license gap.** No license content change required.

---

## 6. `prepublishOnly` gate｜prepublishOnly 门禁

```json
"prepublishOnly": "npm run lint && npm run typecheck && npm run test:coverage && npm run build"
```

This is a **publish-time gate**, not a publish action. Its semantics:

- Runs **only** on `npm publish` (not on `npm pack`, not on `npm install`, not on `npm test`).
- If any subscript fails (`lint`, `typecheck`, `test:coverage`, `build`), `npm publish` aborts before contacting the registry.
- `lint` ensures style + correctness against ESLint.
- `typecheck` ensures `tsc --noEmit` passes — no type errors in the source tree.
- `test:coverage` ensures the full vitest suite passes AND a coverage report is generated. (Coverage thresholds are not enforced today; that is a deferred follow-up per CI Stability Audit §7.)
- `build` ensures `dist/` is fresh and bin shebangs are chmod +x. Without this, a stale `dist/` could ship with broken bin permissions.

The order is intentional: the cheaper checks (lint, typecheck) run first to fail fast; tests run third; build runs last so the freshly-tested code is the code that gets packed.

### What this gate is NOT

- ❌ Not equivalent to `npm publish`.
- ❌ Not a CI replacement (CI runs the same gates on every PR + every push, before any publish would happen).
- ❌ Not a publish-readiness statement. A green `prepublishOnly` does not authorise `npm publish` — that requires explicit maintainer action and (per DEC-008) preserves the `External MCP Host Validation pending` caveat.

---

## 7. `npm pack --dry-run` evidence｜tarball 内容证据

**Command:**

```bash
npm pack --dry-run
```

**Run at**: 2026-04-29T15:34Z. Branch: `chore/ga-prep-package-metadata`. After the `package.json` mutation but before commit.

### Tarball summary

| Field | Value |
|---|---|
| Package name | `o-coding-navigation` |
| Version | `0.1.0-alpha.0` |
| Tarball filename | `o-coding-navigation-0.1.0-alpha.0.tgz` |
| Package size (compressed) | **83.5 kB** |
| Unpacked size | **317.5 kB** |
| Total files | **230** |
| Shasum (of the dry-run tarball) | `8967693c35e4b08ef546e8d80b5777bd5a7dca3c` |

> The dry-run does NOT write a tarball to disk and does NOT upload to any registry. The shasum reflects what *would have been* produced. Different runs at the same commit are expected to produce the same shasum (within npm's determinism guarantees).

### Tarball contents — top-level + roots

**Root-level files included** (5):

```
LICENSE              11.3 kB
README.md            12.9 kB
package.json         2.1 kB
docs/mcp-usage.md    10.4 kB
docs/quickstart.md   6.5 kB
```

**`dist/` — included in full** (~225 entries; sample structure):

```
dist/cli/                         CLI commands + render + entry
  commands/{init,status,brief,doc,check,gate,advance}.{js,d.ts,js.map}
  render/{json,text}.{js,d.ts,js.map}
  index.{js,d.ts,js.map}
  output.{js,d.ts,js.map}
dist/core/                        Core engine
  advance/, artifact/, audit/, brief.{js,...}, check.{js,...},
  doc.{js,...}, gate/, i18n.{js,...}, id.{js,...}, init.{js,...},
  log/, paths.{js,...}, prompt/, result.{js,...}, security/,
  sop/, state/, state-machine/, status.{js,...},
  templates/{acceptance-criteria,index,prd,project-brief,scope,technical-architecture}.{js,...},
  time.{js,...}
dist/index.{js,d.ts,js.map}       Library entry
dist/mcp/                         MCP server + tools
  index.{js,d.ts,js.map}
  result.{js,d.ts,js.map}
  server.{js,d.ts,js.map}
  tools/{brief,capture-log,create-artifact,detect-sop-version,
         generate-next-prompt,index,run-gate,where-am-i}.{js,d.ts,js.map}
dist/sops/default-ai-coding-sop/0.1.0/{artifacts,config,gates,sop}.{js,d.ts,js.map}
dist/types/{artifact,audit,i18n,index,lock,result,sop,state-machine,state}.{js,d.ts,js.map}
```

The full per-file list with sizes is in the raw `npm pack --dry-run` output captured in this PR's commit (the build artifact is not stored in the report — it's regeneratable by running the same command at the same commit).

---

## 8. Exclusion review｜禁止条目复查

Verified directly from the `npm pack --dry-run` file list. The tarball does **not** include any of the following:

| Excluded | Verified absent from tarball |
|---|---|
| `tests/` | ✅ Confirmed absent (no `tests/` paths in the file list). |
| `todos/` | ✅ Confirmed absent. |
| `.ocoding/` | ✅ Confirmed absent (no project-state files in the tarball). |
| `.env` / any env file | ✅ Confirmed absent. |
| `secrets/` / private keys | ✅ Confirmed absent. |
| `docs/plans/` | ✅ Confirmed absent. |
| `docs/reports/` | ✅ Confirmed absent (this report itself does **not** ship in the npm package — by design, per DEC-009). |
| `docs/amendments/` | ✅ Confirmed absent (per DEC-009 §Decision: ship only what users need at runtime + first-touch docs). |
| `docs/00-08*.md` (frozen design docs) | ✅ Confirmed absent. |
| `docs/security/` | ✅ Confirmed absent. |
| `docs/20-decision-log.md` | ✅ Confirmed absent. |
| `src/` | ✅ Confirmed absent (only `dist/` ships — the compiled output is what runs). |
| `node_modules/` | ✅ Confirmed absent. |
| `.git/`, `.husky/`, `.github/` | ✅ Confirmed absent. |
| `coverage/` | ✅ Confirmed absent. |
| `tsconfig*.json`, `eslint.config.*`, `vitest.config.*` | ✅ Confirmed absent. |

**No issue found.** The tarball matches DEC-009's intended shape exactly.

---

## 9. Acceptance criteria｜验收标准

This PR's audit is complete when all of the following hold:

- [x] `package.json` updated per DEC-007 (`version: 0.1.0-alpha.0`).
- [x] `package.json` updated per DEC-009 (`files` allowlist set to 5 entries).
- [x] `package.json` updated per DEC-011 (`name: "o-coding-navigation"`).
- [x] Name availability re-checked via `npm view`. Result: `not_found` (E404). Recorded verbatim.
- [x] `prepublishOnly` script added with the 4-step gate (lint + typecheck + test:coverage + build).
- [x] `repository`, `homepage`, `bugs`, `keywords` fields added per PR E plan §5.6.
- [x] `npm pack --dry-run` recorded with package size, unpacked size, file count, shasum, and tarball content review.
- [x] Excluded paths confirmed absent (tests, todos, plans, reports, amendments, frozen docs, security, src, etc.).
- [x] **No `npm publish`** executed.
- [x] **No `npm login` / `npm adduser`** executed.
- [x] **No git tag** created.
- [x] **No GitHub release** created.
- [x] **No external MCP host claim** added anywhere (description, keywords, README — all clean).
- [x] **No `.github/workflows/`** change.
- [x] **No `src/`** change.
- [x] **No new MCP tools.**
- [x] **No README install-command change** in this PR.
- [x] **No `docs/mcp-usage.md`** change in this PR.
- [x] Local `lint + typecheck + test + test:coverage + build` all pass.
- [x] `package-lock.json` change is constrained to name+version resync + `ocn-mcp` bin entry sync (no dependency-graph change).

---

## 10. `package-lock.json` change rationale

`package-lock.json` was re-synced via `npm install` after the `package.json` mutation. The diff is:

| Field | Before | After | Why changed |
|---|---|---|---|
| Top-level `name` | `"ocn"` | `"o-coding-navigation"` | Lockfile mirrors `package.json.name`; `npm ci` fails if they disagree. |
| Top-level `version` | `"0.0.1-alpha.0"` | `"0.1.0-alpha.0"` | Lockfile mirrors `package.json.version`. |
| `packages[""].name` | `"ocn"` | `"o-coding-navigation"` | Same constraint as top-level. |
| `packages[""].version` | `"0.0.1-alpha.0"` | `"0.1.0-alpha.0"` | Same constraint. |
| `packages[""].bin` | `{ "ocn": "dist/cli/index.js" }` | `{ "ocn": "dist/cli/index.js", "ocn-mcp": "dist/mcp/index.js" }` | Pre-existing tiny lockfile drift from PR #6 — `ocn-mcp` was added to `package.json.bin` in PR #6 but never propagated to the lockfile. The current `npm install` corrected it. **No new bin was introduced in this PR**; this is a sync-up of a pre-existing lockfile drift. |

**No dependency-graph change.** No new packages added, none removed, no version updates to any dependency. The total diff is **+6 / −5 lines** in `package-lock.json`.

This is acceptable per the PR's spec ("不修改 package-lock.json，除非 npm install/script 机制实际需要且你必须解释原因") — the resync is necessary for `npm ci` to pass in CI.

---

## 11. References

- [DEC-005 — External MCP Host Validation pending](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)
- [DEC-007 — first semver lane (`0.1.0-alpha.0`)](../20-decision-log.md#dec-007first-semver-lane)
- [DEC-008 — alpha publish before PR D, with caveat](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion)
- [DEC-009 — package contents policy (`files` allowlist)](../20-decision-log.md#dec-009package-contents-policy)
- [DEC-011 — lock npm package name to `o-coding-navigation`](../20-decision-log.md#dec-011lock-npm-package-name-to-o-coding-navigation)
- [PR E plan §5 (audits) + §5.5 (`prepublishOnly`) + §5.6 (`repository` etc.)](../plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md)
- [npm name availability audit (PR #16, merged)](2026-04-29-npm-name-availability-audit.md)
- [CI Stability Audit (PR #14, merged)](2026-04-29-ci-stability-audit.md)
- `package.json` — current state (this PR).
- `package-lock.json` — current state (this PR).
- `LICENSE` — Apache-2.0 full text.

---

## 12. Hard constraints honoured

- ✅ No `npm publish`.
- ✅ No `npm login` / `npm adduser`.
- ✅ No git tag.
- ✅ No GitHub release.
- ✅ No `.github/workflows/` change.
- ✅ No `src/` runtime-logic change.
- ✅ No new MCP tools.
- ✅ No README install-command change.
- ✅ No `docs/mcp-usage.md` change.
- ✅ No examples implementation.
- ✅ No claim that PR D is complete.
- ✅ No claim that any external MCP host is verified (`description`, `keywords`, this report, PR description — all clean).
- ✅ Real `npm view` evidence captured (re-checked at audit time, not relying on PR #16's stale snapshot).
- ✅ Real `npm pack --dry-run` evidence captured.
- ✅ `package-lock.json` change scope justified (name+version sync + pre-existing bin-drift fix; no dependency change).
