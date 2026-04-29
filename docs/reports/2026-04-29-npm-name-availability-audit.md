# npm Name Availability Audit｜npm 包名可用性审计

> Date: 2026-04-29
> Scope: per [DEC-006](../20-decision-log.md#dec-006npm-package-name-decision-workflow), check candidate npm package names with the npm CLI; record raw evidence; recommend a candidate. **No `package.json` change. No npm publish. No name reservation.**
> Branch: `docs/ga-prep-npm-name-availability` (off `main` at `ffe8145`).

---

## 1. Summary｜摘要

**Verdict: Recommendation only, no `package.json` change.**

The current `package.json` declares `name: "ocn"`. **`ocn` is already taken on npm** by an unrelated project ("Server for flexible communication over the Open Charging Network" — electric-vehicle charging infrastructure). OCN cannot publish under the name `ocn` without conflicting with that package. A different name must be chosen before any future package-metadata PR mutates `package.json`.

Of the 10 candidates checked via real `npm view` calls, **9 returned `E404` (potentially available)** — but for the 3 scoped variants (`@uncletim/*`), an E404 only proves "no package by that exact name exists today"; it does **not** prove the auditor or the maintainer owns the `@uncletim` scope on the npm registry. Scope-ownership verification is a separate publish-time step.

### Recommended candidate: **`o-coding-navigation`**

- Unscoped (no scope-ownership verification needed).
- Returned `E404` from npm (potentially available at the time of audit).
- Reads as the lower-cased version of the repo name `O-CodingNavigation`, minimising user confusion.
- Distinct enough from the unrelated `ocn` package to avoid typo-squatting concerns.

### Alternative recommendation: **`@uncletim/ocn`** *(only if scope ownership is verified)*

- Returned `E404` for the package itself.
- **Scope ownership not verified in this audit.** Before any publish under this name, the maintainer must log in to npm with their credentials and confirm `@uncletim` is owned (or available for registration). If the scope is owned by someone else, this candidate becomes invalid.

> This report does not mutate `package.json`.
> This report does not reserve or publish any npm package name.

---

## 2. Context｜背景

This audit follows from:

- **[DEC-006](../20-decision-log.md#dec-006npm-package-name-decision-workflow)** — Adopts an availability-first workflow. `npm view` checks must precede any name lock. Run candidate names through the registry, record output, propose. *This audit is the first step under that workflow.*
- **[DEC-007](../20-decision-log.md#dec-007first-semver-lane)** — First semver lane is `0.1.0-alpha.0` if publishing proceeds. The chosen name will publish as `<name>@0.1.0-alpha.0`.
- **[DEC-008](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion)** — Alpha publish may be planned before PR D, with mandatory caveat. Whatever name is chosen, the alpha release notes must include the verbatim line below.
- **[DEC-009](../20-decision-log.md#dec-009package-contents-policy)** — Package contents will be controlled via the `files` allowlist.
- **[DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)** — External MCP Host Validation is deferred. The chosen package's metadata must not claim verified host compatibility until PR D completes.

> External MCP Host Validation pending.
> Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.

---

## 3. Current package metadata｜当前 package 信息

Read directly from `package.json` on `main` at `ffe8145`:

| Field | Current value |
|---|---|
| `name` | `ocn` |
| `version` | `0.0.1-alpha.0` |
| `description` | `O'CodingNavigator — local-first AI Coding workflow operating system` |
| `bin` | `{ "ocn": "dist/cli/index.js", "ocn-mcp": "dist/mcp/index.js" }` |
| `repository` | **missing** |
| `homepage` | **missing** |
| `bugs` | **missing** |
| `keywords` | **missing** |
| `license` | `Apache-2.0` |
| `engines.node` | `>=20` |
| `files` | `["dist", "LICENSE", "README.md"]` (per DEC-009 decision; PR E plan §5.1 + §5.6 enumerate the missing fields above) |

Note: the `bin` entries (`ocn`, `ocn-mcp`) are independent of the **package name**. Whatever package name is chosen, `npm install -g <package-name>` will still expose the bins as `ocn` and `ocn-mcp` on the user's PATH.

---

## 4. Candidate list｜候选名列表

| # | Candidate | Reason for checking |
|---|---|---|
| 1 | `ocn` | Current value in `package.json`; the most desirable short form; matches the CLI bin name. |
| 2 | `o-coding-navigation` | Lower-case of repo name `O-CodingNavigation`. Unscoped, unambiguous. |
| 3 | `ocoding-navigation` | Variant of #2 without the leading apostrophe-style hyphen — accommodates users who type without the leading hyphen. |
| 4 | `ocodingnavigator` | Single token; mirrors the OCN product display name "O'CodingNavigator". |
| 5 | `o-codingnavigator` | Variant of #4 with leading hyphen. |
| 6 | `ocn-cli` | Common CLI suffix pattern (`<short>-cli`); leaves `ocn` available for a future library if the EV-charging project ever unpublishes. |
| 7 | `ocn-tools` | Alternative suffix pattern. |
| 8 | `@uncletim/ocn` | Scoped; isolates from the unrelated `ocn`; uses the GitHub owner `UncleTIM-GZ` as scope (lowercased without the `-GZ` suffix). |
| 9 | `@uncletim/o-coding-navigation` | Scoped variant of #2. |
| 10 | `@uncletim/ocoding-navigation` | Scoped variant of #3. |

---

## 5. npm CLI evidence｜npm CLI 证据

Each candidate was checked via:

```bash
npm view <name> name version description repository --json
```

Run on 2026-04-29 (date of report) against the public npm registry. Output captured verbatim per the npm CLI's stdout/stderr.

### Result legend

- **`exists`** — Returns package metadata. The name is registered to a different package and **cannot be claimed**.
- **`not_found`** — Returns `npm error code E404`. The exact name does not exist in the registry. *For unscoped names this means the name is potentially available. For scoped names, it means the package within the scope does not exist; it does NOT prove scope ownership.*
- **`network_error`** / **`permission_unknown`** / **`scope_ownership_unknown`** — qualifiers added where applicable.

### Per-candidate results

| # | Candidate | Result | Interpretation | Notes |
|---|---|---|---|---|
| 1 | `ocn` | **`exists`** | **Cannot use.** Name is taken by an unrelated EV-charging project. | npm view returned: `{"name":"ocn","version":"0.0.1-alpha.0","description":"Server for flexible communication over the Open Charging Network"}`. The published version `0.0.1-alpha.0` is coincidentally the same numeric value as OCN's local placeholder version — purely a coincidence; they are different packages. The taken name effectively rules out a public publish under `ocn`. |
| 2 | `o-coding-navigation` | **`not_found`** | Potentially available. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/o-coding-navigation - Not found"`. |
| 3 | `ocoding-navigation` | **`not_found`** | Potentially available. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/ocoding-navigation - Not found"`. |
| 4 | `ocodingnavigator` | **`not_found`** | Potentially available. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/ocodingnavigator - Not found"`. |
| 5 | `o-codingnavigator` | **`not_found`** | Potentially available. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/o-codingnavigator - Not found"`. |
| 6 | `ocn-cli` | **`not_found`** | Potentially available. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/ocn-cli - Not found"`. |
| 7 | `ocn-tools` | **`not_found`** | Potentially available. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/ocn-tools - Not found"`. |
| 8 | `@uncletim/ocn` | **`not_found` + `scope_ownership_unknown`** | Potentially available; **scope ownership not verified**. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/@uncletim%2focn - Not found"`. The npm registry's E404 for a scoped package only confirms "no package at this exact path"; it does NOT confirm the auditor or the maintainer can publish under `@uncletim`. Verifying scope ownership requires an authenticated `npm whoami` + `npm org ls` (or a `npm owner add`) by the maintainer. |
| 9 | `@uncletim/o-coding-navigation` | **`not_found` + `scope_ownership_unknown`** | Same caveat as #8. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/@uncletim%2fo-coding-navigation - Not found"`. |
| 10 | `@uncletim/ocoding-navigation` | **`not_found` + `scope_ownership_unknown`** | Same caveat as #8. | npm error: `code E404, summary "Not Found - GET https://registry.npmjs.org/@uncletim%2focoding-navigation - Not found"`. |

### Raw output excerpts

The full per-candidate output was captured during the audit. Excerpts below preserve the npm CLI's exact wording. Boilerplate ("Note that you can also install from a tarball, folder, http url, or git url." and "A complete log of this run can be found in: …") is elided as `[…]`.

#### Candidate 1 — `ocn` (exists)

```
{
  "name": "ocn",
  "version": "0.0.1-alpha.0",
  "description": "Server for flexible communication over the Open Charging Network"
}
```

(No `repository` field returned by the registered package's metadata.)

#### Candidates 2–10 (not_found)

All nine return the same shape:

```
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/<name> - Not found
npm error 404
npm error 404  The requested resource '<name>@*' could not be found or you do not have permission to access it.
[…]
{
  "error": {
    "code": "E404",
    "summary": "Not Found - GET https://registry.npmjs.org/<name> - Not found",
    "detail": "The requested resource '<name>@*' could not be found or you do not have permission to access it.\n\nNote that you can also install from a\ntarball, folder, http url, or git url."
  }
}
[…]
```

(For scoped candidates, the URL contains `%2f` URL-encoding of the `/` between scope and name, e.g. `@uncletim%2focn`. This is normal npm CLI behaviour for scoped lookups.)

---

## 6. Risk review｜风险审查

| Risk dimension | `o-coding-navigation` | `@uncletim/ocn` | `ocn-cli` | Notes |
|---|---|---|---|---|
| **Too generic** | Low — specific to "coding navigation" domain. | Low — scoped + short. | Medium — `ocn` part collides with unrelated EV-charging context. | — |
| **Typo-squatting risk** | Low — distinctive token. | Low — scope isolates. | **Medium-High** — typing `ocn` in npm search returns the EV-charging package; users may accept the wrong one and never reach `ocn-cli`. | — |
| **Confusion with existing package** | Low. | Low — `@uncletim/ocn` and bare `ocn` are different namespaces; npm search lists them distinctly. | **High** — `ocn-cli` will appear next to `ocn` in npm search; users may install the wrong one. | — |
| **Mismatch with CLI command (`ocn`)** | Acceptable — `npm install -g o-coding-navigation` still produces `/usr/local/bin/ocn`. | Acceptable — same. | Acceptable — same. | The `bin` entry in `package.json` controls the binary name, not the package name. |
| **Mismatch with repo name (`O-CodingNavigation`)** | **Best fit** — direct lower-case. | Acceptable — short form OK; scope is unrelated to repo. | Weak — drops the "navigation" identity. | — |
| **Scoped-package ownership risk** | N/A (unscoped). | **Unverified.** Maintainer must confirm `@uncletim` ownership before lock. | N/A (unscoped). | — |
| **Future brand risk** | Low — name reads as the project. | Low — scope is private namespace. | Medium — encodes "this is the CLI" forever; if a library variant emerges, naming gets awkward. | — |

### Specifically about `ocn` being taken

The fact that `ocn` is taken does not make OCN's CLI command less valid (the binary is named via `bin`, not via package name). It only forecloses publishing the *package* under `ocn`. Documentation users who run `ocn --help` after `npm install -g <chosen-name>` will see the same CLI output regardless of package name.

### Specifically about scope ownership

For the three `@uncletim/*` candidates: the npm registry E404 on a scoped lookup confirms only that **no package exists at that exact `<scope>/<name>` path today**. It does NOT confirm that the maintainer (or anyone else) currently owns or can publish under the `@uncletim` scope. Verifying scope ownership requires the maintainer to:

```bash
npm whoami                    # confirms login
npm org ls @uncletim          # lists members of the scope (or fails if scope not yet created)
```

Neither command was run during this audit (auditor does not have publish credentials). The maintainer must run them before locking on a scoped name.

If the maintainer attempts `npm publish @uncletim/ocn` and the scope is owned by someone else, the publish fails. If the scope is unowned, the publish creates the scope (under the maintainer's account) and registers the package atomically.

---

## 7. Recommendation｜推荐

### Primary recommendation: **`o-coding-navigation`**

Adopt this name for the future package-metadata PR unless the maintainer prefers the scoped alternative below.

Why:
- npm CLI evidence: **`not_found`** at audit time. Potentially available.
- Reads as the lower-case form of the repo name `O-CodingNavigation`. A user landing on either the GitHub repo or the npm page makes the connection immediately.
- No scope-ownership verification step required.
- Distinct enough from the registered `ocn` (EV-charging) package that npm search will not confuse the two.
- The `bin` entries (`ocn`, `ocn-mcp`) are unaffected — the CLI experience for end users is identical.

### Alternative recommendation: **`@uncletim/ocn`** *(only if scope ownership is verified)*

This is the cleanest name aesthetically — short, scoped, mirrors the historical `ocn` shape — but it is contingent on the maintainer verifying that `@uncletim` is available or already owned. Steps:

```bash
# 1. Authenticate to npm (one-time):
npm login

# 2. Confirm scope status:
npm whoami                       # should print your npm username
npm org ls @uncletim             # if it lists members → scope already exists; you must already be a member to publish under it
                                 # if it errors with 404 → scope does not yet exist; npm publish will create it under your user
```

If the scope already exists and the maintainer is **not** a member, this candidate is invalid and the recommendation falls back to `o-coding-navigation`.

### Notes on this recommendation

- **The recommendation is advisory.** Final package name requires explicit maintainer approval, captured in either an amendment to DEC-006 or a focused DEC-only commit recording the choice.
- **`package.json` mutation requires a separate PR.** This audit does not change `package.json`. The future package-metadata PR is the carrier for the `name` change.
- **The recommendation does not lock anything** with the npm registry. No name is reserved; the maintainer's first `npm publish` is what claims the name. Until publish, the candidate names remain "potentially available" and could be claimed by someone else.

---

## 8. Follow-up actions｜后续动作

1. **Maintainer confirms preferred package name** — choose `o-coding-navigation` (primary) or `@uncletim/ocn` (alternative if scope verified). Capture the choice in either:
   - a focused DEC-only commit (preferred — short, traceable), or
   - an amendment to DEC-006 in `docs/20-decision-log.md` recording the chosen name and the npm view evidence date.
2. **If a scoped name is preferred**: maintainer runs `npm whoami` + `npm org ls @uncletim` and pastes the output back to confirm scope publish permission.
3. **Future package-metadata PR mutates `package.json`** — sets `name`, `version → 0.1.0-alpha.0` (per DEC-007), expands `files` per DEC-009, adds `repository` / `homepage` / `bugs` / `keywords` per PR E plan §5.6, adds `prepublishOnly` per PR E plan §5.5.
4. **Future PR runs `npm pack --dry-run`** and records the tarball contents in the PR description (per DEC-009 follow-up).
5. **No host-compatibility claim** until PR D completes — applies to README, npm metadata `description`, npm metadata `keywords`, and any release notes drafted from this point onward.

---

## 9. Acceptance criteria｜验收标准

This audit is complete when:

- [x] DEC-006 followed (availability-first workflow).
- [x] npm CLI checks run for all 10 candidates.
- [x] Real evidence recorded verbatim (raw error codes, JSON outputs, registry URLs).
- [x] Risk review covers generic-ness, typo-squatting, confusion, CLI/repo mismatch, scope ownership, brand risk.
- [x] Recommendation made with primary + scoped alternative.
- [x] **No `package.json` change.**
- [x] **No `package-lock.json` change.**
- [x] **No `npm publish`.**
- [x] Local lint / typecheck / test pass.

---

## 10. References

- [DEC-006 — npm package name decision workflow](../20-decision-log.md#dec-006npm-package-name-decision-workflow) — origin of this audit.
- [DEC-007 — first semver lane (`0.1.0-alpha.0`)](../20-decision-log.md#dec-007first-semver-lane).
- [DEC-008 — publish alpha before PR D](../20-decision-log.md#dec-008publish-alpha-before-pr-d-completion).
- [DEC-009 — package contents policy (`files` allowlist)](../20-decision-log.md#dec-009package-contents-policy).
- [DEC-005 — External MCP Host Validation pending](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available).
- [PR E plan §4.1 (DEC-006 origin) + §5.1 (`package.json` audit) + §5.6 (`repository` etc.)](../plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md).
- [CI Stability Audit](2026-04-29-ci-stability-audit.md) — adjacent audit; same auditor session.
- `package.json` — current state at `ffe8145`.

---

## 11. Hard constraints honoured

- ✅ No `package.json` change.
- ✅ No `package-lock.json` change.
- ✅ No `npm publish`.
- ✅ No `npm pack` (read-only or otherwise) was run.
- ✅ No `src/` change.
- ✅ No `.github/workflows/*.yml` change.
- ✅ No new tests.
- ✅ No git tag created.
- ✅ No release notes drafted.
- ✅ No claim that PR D is complete.
- ✅ No claim that any external MCP host is verified.
- ✅ No README install-command change.
- ✅ Real `npm view` evidence captured; no third-party-website results substituted.
