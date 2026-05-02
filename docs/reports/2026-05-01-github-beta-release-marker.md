# GitHub Beta Release Marker Report

> Date: 2026-05-01 (UTC) — release-marker action executed 2026-05-02 03:07Z
> Authoring DEC: `docs/20-decision-log.md` §DEC-022 (authorisation), §DEC-021 (publish discipline pattern), §DEC-019 (Host wording)
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified per DEC-019. This report does not change Host validation status.

---

## 1. Summary

| Field | Value |
| --- | --- |
| Tag | `v0.1.0-beta.0` |
| Tag type | **annotated** (`git cat-file -t v0.1.0-beta.0` → `tag`) |
| GitHub Release type | **pre-release** (`isPrerelease: true`, `isDraft: false`) |
| Release title | `O'CodingNavigator v0.1.0-beta.0` |
| Target commit | `036a7a61113fa4fe1b526788b7acbdb6748cbb05` (PR #44 merge commit, contains `package.json@0.1.0-beta.0` + DEC-022 + both beta reports) |
| Release URL | https://github.com/UncleTIM-GZ/O-CodingNavigation/releases/tag/v0.1.0-beta.0 |
| Tag created | yes |
| Tag pushed to origin | yes |
| GitHub Release created | yes |
| `npm publish` | **no** |
| npm `latest` movement | **no** — `dist-tags.latest` remains `0.1.0-alpha.0` |
| Caveat preserved | yes |

> **Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.**

This report records the source-control release marker for OCN's first beta. The npm publish itself was executed earlier in PR #42 / DEC-021; this action only adds the matching annotated git tag and the GitHub pre-release that DEC-022 authorised. No package, npm, or active-doc state changed during this action.

## 2. DEC basis

- **DEC-019** — beta Host support boundary. Provides the canonical scoped wording carried verbatim into the release notes.
- **DEC-021** — first beta promotion authorisation. Produced the underlying npm publish (`o-coding-navigation@0.1.0-beta.0`) that this marker mirrors in source control.
- **DEC-022** — GitHub tag and pre-release policy for beta. Authorises this exact action (annotated git tag + GitHub pre-release with prerelease=true), defines the release-notes-required wording, and lists the 8-item pre-action checklist.

The relevant evidence reports referenced by DEC-022 (and by the release notes themselves):

- `docs/reports/2026-05-01-npm-beta-0-publish-report.md` — beta publish evidence.
- `docs/reports/2026-05-01-post-beta-install-docs.md` — post-publish docs handoff.
- `docs/reports/2026-04-30-mcp-external-host-validation-report.md` — Claude Desktop real-Host validation.

## 3. Pre-check evidence (DEC-022 §Required release-marker checklist)

All 8 checklist items verified pre-action.

| # | Check | Result |
| --- | --- | --- |
| 1 | `package.json` version on target commit | `0.1.0-beta.0` ✅ (verified via `git show 036a7a6:package.json | grep '"version"'`) |
| 2 | `docs/reports/2026-05-01-npm-beta-0-publish-report.md` on `main` | present ✅ (verified via `git ls-tree -r 036a7a6 --name-only`) |
| 3 | `docs/reports/2026-05-01-post-beta-install-docs.md` on `main` | present ✅ (same verification) |
| 4 | `npm view o-coding-navigation dist-tags version name --json` | `beta: 0.1.0-beta.0`, `alpha: 0.1.0-alpha.2`, `latest: 0.1.0-alpha.0` ✅ |
| 5 | Active docs recommend `npm install -g o-coding-navigation@beta` | `README.md:74`, `docs/quickstart.md:12` ✅ |
| 5b | Host wording present | "MCP Host validation completed for Claude Desktop on Windows with WSL2" / "Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified." appears in `README.md`, `docs/quickstart.md`, `docs/mcp-usage.md` ✅ |
| 5c | Cursor / Cline scoping | Every active-doc Cursor / Cline mention is scoped to "not yet verified" / "remain unverified" ✅ |
| 6 | No existing `v0.1.0-beta.0` git tag | `git tag --list "v0.1.0-beta.0"` returned empty pre-action ✅ |
| 7 | No existing GitHub Release for `v0.1.0-beta.0` | `gh release view v0.1.0-beta.0` returned `release not found` pre-action ✅ |
| 8 | CI on `main` is green | `gh run view 25242208343` (post-merge run on `036a7a6`) — `status: completed`, `conclusion: success`, both `build (node 20)` and `build (node 22)` ✅ |

PR #44 merge confirmation: `mergeCommit: 036a7a61113fa4fe1b526788b7acbdb6748cbb05`, `mergedAt: 2026-05-02T03:03:13Z`, `state: MERGED`.

## 4. Tag evidence

### Local tag

```
$ git tag --list "v0.1.0-beta.0"
v0.1.0-beta.0

$ git tag -n99 v0.1.0-beta.0
v0.1.0-beta.0   O'CodingNavigator v0.1.0-beta.0

$ git show v0.1.0-beta.0 --stat | head -10
tag v0.1.0-beta.0
Tagger: Tim Ou <timothy.ou@outlook.com>
Date:   Sat May 2 11:06:18 2026 +0800

O'CodingNavigator v0.1.0-beta.0

commit 036a7a61113fa4fe1b526788b7acbdb6748cbb05
Merge: 9f1ced5 fb3c93d
Author: Tim O <130391127+UncleTIM-GZ@users.noreply.github.com>
Date:   Sat May 2 11:03:12 2026 +0800

$ git cat-file -t v0.1.0-beta.0
tag
```

`git cat-file -t` returning `tag` (not `commit`) is the strict invariant for **annotated** tags. Lightweight tags would return `commit`. This satisfies DEC-022 §"Authorised release marker" (annotated, not lightweight).

### Remote tag

```
$ git push origin v0.1.0-beta.0
To github.com:UncleTIM-GZ/O-CodingNavigation.git
 * [new tag]         v0.1.0-beta.0 -> v0.1.0-beta.0

$ git ls-remote --tags origin "refs/tags/v0.1.0-beta.0"
95c1c086a9b1e500734b02e847f8d04a48f92ff5	refs/tags/v0.1.0-beta.0
```

`95c1c086a9b1e500734b02e847f8d04a48f92ff5` is the annotated-tag-object SHA on origin (distinct from the target commit SHA `036a7a6...`, as expected for annotated tags — the tag object holds metadata and points at the commit).

### Target commit

`036a7a61113fa4fe1b526788b7acbdb6748cbb05` is the merge commit of PR #44 (`Merge pull request #44 from UncleTIM-GZ/docs/dec-github-release-tag-policy`). Its tree contains:

- `package.json` with `"version": "0.1.0-beta.0"`.
- `docs/20-decision-log.md` containing DEC-022 (6 hits for the string `DEC-022`).
- `docs/reports/2026-05-01-npm-beta-0-publish-report.md`.
- `docs/reports/2026-05-01-post-beta-install-docs.md`.
- `docs/reports/2026-04-30-mcp-external-host-validation-report.md`.

## 5. GitHub Release evidence

### Creation command

```
gh release create v0.1.0-beta.0 \
  --title "O'CodingNavigator v0.1.0-beta.0" \
  --notes-file <drafted-notes-file> \
  --prerelease \
  --target 036a7a61113fa4fe1b526788b7acbdb6748cbb05
```

The `--prerelease` flag is mandatory per DEC-022 §"Authorised release marker"; the `--target` flag pins the release to the same commit the git tag points at.

### Post-creation verification

```
$ gh release view v0.1.0-beta.0 --json tagName,name,isPrerelease,isDraft,url,targetCommitish,createdAt,publishedAt
{
  "createdAt":      "2026-05-02T03:06:18Z",
  "isDraft":        false,
  "isPrerelease":   true,
  "name":           "O'CodingNavigator v0.1.0-beta.0",
  "publishedAt":    "2026-05-02T03:07:00Z",
  "tagName":        "v0.1.0-beta.0",
  "targetCommitish":"036a7a61113fa4fe1b526788b7acbdb6748cbb05",
  "url":            "https://github.com/UncleTIM-GZ/O-CodingNavigation/releases/tag/v0.1.0-beta.0"
}

$ gh release list --limit 5
O'CodingNavigator v0.1.0-beta.0	Pre-release	v0.1.0-beta.0	2026-05-02T03:07:00Z
```

Confirmed:

- `tagName` = `v0.1.0-beta.0` ✅ (matches the annotated git tag)
- `name` = `O'CodingNavigator v0.1.0-beta.0` ✅ (matches DEC-022's authorised title)
- **`isPrerelease` = `true`** ✅ (the load-bearing flag — DEC-022 Option C, not Option D)
- `isDraft` = `false` ✅ (release is published, not drafted)
- `targetCommitish` = `036a7a6...` ✅ (matches the git tag's target)
- `gh release list` shows the "Pre-release" badge ✅

### Release URL

https://github.com/UncleTIM-GZ/O-CodingNavigation/releases/tag/v0.1.0-beta.0

## 6. Release notes policy compliance

The drafted release notes (uploaded with `--notes-file`) include each of the items DEC-022 §"Release notes required wording" requires:

| Required content | Present in notes |
| --- | --- |
| `npm install -g o-coding-navigation@beta` (the recommended install command) | ✅ — appears in the `## Install` section |
| Canonical scoped Host wording: *"Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified."* | ✅ — appears verbatim in the `## Host support` section as a blockquote |
| Link to `docs/reports/2026-05-01-npm-beta-0-publish-report.md` | ✅ — listed under `## Included evidence` |
| Link to `docs/reports/2026-04-30-mcp-external-host-validation-report.md` | ✅ — listed under `## Included evidence` |
| Reference to DEC-021 | ✅ — listed under `## Included evidence` |
| Reference to DEC-022 | ✅ — listed under `## Included evidence` |
| Explicit "do NOT use untagged install" framing | ✅ — appears under `## Install` |
| Explicit "not GA" framing | ✅ — `## Not GA` section |

The notes deliberately do **not** claim:

- ❌ GA or general availability — "Not GA" section explicitly rejects.
- ❌ production-ready — explicitly rejected in `## Not GA`.
- ❌ Cursor support / verified — explicitly rejected.
- ❌ Cline support / verified — explicitly rejected.
- ❌ untagged install as recommended — explicitly rejected.
- ❌ npm `latest` as recommended — explicitly rejected.

### Note on storage of the drafted notes

Per the prompt's hard rules and DEC-022's scope, the drafted notes file was created with `mktemp` and is **not** committed to the repository. The canonical copy of the rendered release notes lives on GitHub at the release URL above; this report's §6 captures the policy compliance summary so a future audit can compare against the live release page.

## 7. Non-goals confirmed

The following are confirmed **not** to have happened during the release-marker action:

- ❌ **No `npm publish`.** The npm beta was published earlier in PR #42 / DEC-021. No npm command was issued during this action.
- ❌ **No `npm version`, no `npm dist-tag` change, no `latest` promotion.** Verified post-action via `npm view`: `dist-tags.latest = 0.1.0-alpha.0` (unchanged), `dist-tags.alpha = 0.1.0-alpha.2` (unchanged), `dist-tags.beta = 0.1.0-beta.0` (unchanged from PR #42).
- ❌ **No `package.json` change.** Repo version stays `0.1.0-beta.0`.
- ❌ **No `package-lock.json` change.**
- ❌ **No `README.md` / `docs/quickstart.md` / `docs/mcp-usage.md` change.**
- ❌ **No `src/` / `tests/` / `.github/workflows/*` change.**
- ❌ **No `examples/` / `CLAUDE.md` / `.claude/rules.md` change.**
- ❌ **No DEC body rewriting.** Append-only history preserved.
- ❌ **No lightweight tag.** The tag is annotated (`git cat-file -t` → `tag`).
- ❌ **No normal (non-prerelease) GitHub Release.** The release is pre-release (`isPrerelease: true`).
- ❌ **No claim that Cursor or Cline is verified.**
- ❌ **No GA or production-ready claim.**

## 8. Follow-up

Future work remains separately gated; none authorised by this report:

- **Cursor real-Host validation.** Separate future PR following the DEC-017 pattern (scoped report + closure DEC). Cursor remains unverified.
- **Cline real-Host validation.** Same pattern.
- **`latest`-tag movement DEC.** Likely tied to GA readiness or a follow-up beta patch; DEC-020 / DEC-021 / DEC-022 all explicitly defer this.
- **Release-marker policy for ongoing alpha-line patches.** DEC-022 only authorised `v0.1.0-beta.0` specifically. The next ongoing-alpha-line patch (if one is needed before GA) would require either a successor DEC-022-style policy (consistent — every patch gets a marker) or a successor "alpha patches don't get markers" DEC (also consistent — the asymmetry is acceptable as long as documented).
- **GA readiness DEC.** Out of scope for the current release governance pass; will be a separate decision tying together: Host scope (Cursor / Cline status), `latest` movement, multi-OS / Node 24+ CI matrix, examples beyond `discovery-to-plan`, dogfood evidence.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
