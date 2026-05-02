# README Post-Public Status Refresh

> Date: 2026-05-02
> Branch: `docs/readme-post-public-status-refresh`
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified per DEC-019. This PR does not change Host validation status.

---

## 1. Summary

The repository was made **public on GitHub** after the v0.1.0-beta.0 release-governance track closed. A targeted audit of `README.md` against current repo state surfaced 14 stale claims that would mislead public visitors about the actual project status. This PR fixes all 14 in a single-file `README.md` edit (no source / test / package / workflow change). Active install commands, Host scoping, npm `latest` policy, and bilingual coverage from the prior PRs (#33 / #43 / #46) are preserved verbatim — this PR only updates the **status / roadmap / counts / publish-history** assertions that pre-dated the beta publish track.

| Field | Value |
| --- | --- |
| Files changed | `README.md` only (single file, +32 / -14) plus this report (NEW) |
| Source / test / package / workflow changes | **none** |
| npm | no publish, no version bump, no dist-tag movement, no `latest` promotion |
| git tag / GitHub Release | no new tag, no new release; existing `v0.1.0-beta.0` annotated tag + pre-release untouched |
| Caveat impact | none. Claude Desktop validation (DEC-017) status preserved verbatim; Cursor and Cline still unverified per DEC-019. |

> Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

## 2. Trigger

The repository moved from private to **public on GitHub** between the `v0.1.0-beta.0` release-marker action (PR #45) and the bilingual install-flow completion (PR #46). The README's `## 1. What OCN is` and `## 4. Install` sections had been updated through that arc, but the **status / roadmap / counts** sections were last touched in the alpha era and still claimed:

- "internal alpha · Public: not yet on npm" (header line 5),
- "Phase 2 Complete + alpha published" (§3 heading),
- "External MCP Host Validation (PR D)" listed as not implemented (§3 ❌),
- "executable `examples/`" listed as not implemented (§3 ❌),
- "312 tests" (§9 Development),
- PR B / C / E / F still ⬜ in §10 Roadmap,
- "Public npm publish" listed as deliberately deferred (§10).

For a private repo, those staleness levels were tolerable — the audit trail was internal. For a public repo, they were the **first thing visitors read** and they directly contradicted §3's own status table and §4's install command. This PR closes that gap.

## 3. Changes (14 corrections)

All edits are inside `README.md`. No other file in `src/` / `tests/` / `package.json` / `package-lock.json` / `.github/` / `docs/quickstart.md` / `docs/mcp-usage.md` / `docs/20-decision-log.md` / `examples/` / `CLAUDE.md` / `.claude/rules.md` was modified.

| # | Section | Pre-fix | Action |
| --- | --- | --- | --- |
| 1 | Header line 5 | `**Phase**: Phase 2 Complete · **Status**: internal alpha · **Public**: not yet on npm` | Replaced with current state: phase reflects beta candidate prep complete; status `pre-GA beta`; public on npm as `@beta` → `0.1.0-beta.0` (linked to npm package page); GitHub pre-release `v0.1.0-beta.0` linked. |
| 2 | §3 heading | `## 3. Current status (Phase 2 Complete + alpha published)` | `## 3. Current status (Phase 2 Complete + beta published)` (matches the table immediately below). |
| 3 | §3 ✅ Implemented (npm bullet) | `**npm alpha**: package metadata, prepublishOnly gate, files allowlist, alpha publish on the public registry.` | Replaced with **npm publish discipline** bullet covering both `@alpha` and `@beta` channels, the `latest`-deliberately-stale rule (DEC-020 / DEC-021), and the annotated git tag + GitHub pre-release (DEC-022). |
| 4 | §3 ✅ Implemented (NEW bullet) | (missing) | Added **Real MCP Host validation** bullet referencing DEC-017 + the validation report. Cursor / Cline explicitly named as unverified. |
| 5 | §3 ✅ Implemented (NEW bullet) | (missing) | Added **Executable example** bullet pointing at `examples/discovery-to-plan/` and noting that fixtures are derived verbatim from `src/core/templates/*.ts` (RR-F-5 from the F-track plan). |
| 6 | §3 ❌ Not implemented | listed `**External MCP Host Validation** (PR D)` | Removed — PR D is done (DEC-017). Replaced with explicit `real-Host validation for Cursor / Cline ([DEC-019])` so the list still reflects what actually remains pending. |
| 7 | §3 ❌ Not implemented | listed `executable examples/ (only the planning placeholder is in the repo today)` | Removed — `examples/discovery-to-plan/` is now an executable smoke that walks all 10 v1.0 SOP steps. |
| 8 | §5 First 5 minutes | (missing) | Added **Try the example** sub-section with the `npm run build` + `bash examples/discovery-to-plan/scripts/smoke.sh` command pair plus a Chinese sidebar. Closes F4 (top-level README "Try the example" link) of the original PR F plan. |
| 9 | §8 Documentation map (Reports row) | only linked the Phase 2 closure report | Replaced with a directory pointer at [`docs/reports/`](../../docs/reports/) and a brief enumeration of the major report families now present (P1 fix train, MCP Host validation, alpha.0/.1/.2/beta.0 publish, examples F2/F3, beta release marker, bilingual install flow, doc audits). Phase 2 closure report still linked as the historical baseline. |
| 10 | §9 Development | `npm run test           # vitest run — 312 tests, ~3s` | `# vitest run — 449 tests, ~3s`. The 137-test increase came from the post-alpha P1 fix train (P1-001 / P1-002 / P1-003 / P1-004) and the lock-observability hardening. |
| 11 | §10 Roadmap intro | `## 10. Roadmap (GA Prep — not yet implemented) … No GA Prep work changes runtime behaviour today.` | `## 10. Roadmap` with intro reflecting that **most GA Prep PRs are now complete**; pointers at the reports directory + decision log. |
| 12 | §10 Roadmap PR statuses | PR B 🟡, PR C ⬜, PR E ⬜, PR F ⬜ | PR B ✅ (multi-pass README polish; bilingual install-flow refresh), PR C ✅ (`docs/security/mcp-threat-model.md` exists; P1-001 hardened `validateInitializedProjectRoot`), PR E ✅ (publish discipline DECs + Node 20+22 CI matrix + lock-observability hardening), PR F 🟢 (F1+F2+F3 done, F4 closed by §5 link in this PR). PR D 🟢 unchanged. |
| 13 | §10 "deliberately not part of any current plan" — `Public npm publish` | listed as deferred | Removed — has happened 4 times (alpha.0 / alpha.1 / alpha.2 / beta.0) on the public registry. Replaced with three real future tracks: Cursor / Cline real-Host validation, `latest`-tag movement DEC, GA promotion DEC. |
| 14 | Header / §3 / §10 — GitHub Release reference | (missing) | Added in three places: header line 5 links to the v0.1.0-beta.0 GitHub pre-release directly; §3 ✅ Implemented npm bullet mentions DEC-022 release marker; §10 PR D / PR E entries link to the relevant reports. |

## 4. What did NOT change

- ❌ No `npm publish`, no `npm version`, no `npm dist-tag` change, no `latest` promotion. `dist-tags.latest` stays at `0.1.0-alpha.0`.
- ❌ No new git tag, no new GitHub Release. Existing `v0.1.0-beta.0` annotated tag + pre-release untouched.
- ❌ No `package.json` / `package-lock.json` change. Repo version stays `0.1.0-beta.0`.
- ❌ No `src/` / `tests/` / `.github/workflows/*` change.
- ❌ No `docs/quickstart.md` / `docs/mcp-usage.md` / examples / `CLAUDE.md` / `.claude/rules.md` / `docs/20-decision-log.md` change. (These were updated in the prior PRs; this PR does not duplicate that work.)
- ❌ No untagged `npm install -g o-coding-navigation` recommended anywhere — every reference still inside explicit "Do NOT use" / "暂时不要使用" framing.
- ❌ No claim that Cursor or Cline is verified.
- ❌ No GA / production-ready claim.
- ❌ No historical doc rewriting.
- ❌ No DEC body rewriting (this is purely a README refresh; DEC-022 already covered the release-marker policy).

## 5. Validation

### Greps (post-edit)

```
$ sed -n '5p' README.md
> **Phase**: Phase 2 Complete + beta candidate prep complete · **Status**: pre-GA beta · **Public**: on npm as `@beta` → `0.1.0-beta.0` · GitHub pre-release: `v0.1.0-beta.0`

$ grep -n "vitest run" README.md
276:npm run test           # vitest run — 449 tests, ~3s

$ grep -n "Public npm publish" README.md
# (empty — confirmed removed)

$ grep -nE "^- (✅|🟡|🟢|⬜) \*\*PR " README.md
PR A ✅ · PR B ✅ · PR C ✅ · PR D 🟢 · PR E ✅ · PR F 🟢
```

Active-doc invariants (preserved verbatim from PR #46):

- `npm install -g o-coding-navigation@beta` is still the only recommended install (English at line 74, Chinese sidebar at line 86).
- "Do NOT use untagged" warning still present in §4.
- DEC-019 canonical scoped Host wording still present in §3 / §4 / §7.

### Local checks

```
$ npm run lint        → clean
$ npm run typecheck   → clean
$ npm run test        → 449 / 449 pass (unchanged from main)
```

### Diff scope

```
$ git diff --stat
 README.md | 46 ++++++++++++++++++++++++++++++++--------------
 1 file changed, 32 insertions(+), 14 deletions(-)
```

Plus this report (new file). No other path touched.

## 6. Non-goals

- ❌ No new code, no new tests, no new workflow.
- ❌ No npm publish or registry mutation.
- ❌ No git tag or GitHub Release (existing `v0.1.0-beta.0` artifacts untouched).
- ❌ No DEC body rewriting; DEC-022 + DEC-021 + DEC-020 + DEC-019 + DEC-017 referenced but not modified.
- ❌ No promotion of Cursor or Cline to a verified Host.
- ❌ No GA claim; "pre-GA beta" framing preserved.

## 7. Follow-up

This refresh closes the README staleness gap surfaced when the repo went public. The remaining tracks each gate on their own future DEC; none authorised here:

- **Cursor real-Host validation** — separate future PR following the DEC-017 pattern (scoped report + closure DEC).
- **Cline real-Host validation** — same pattern.
- **`latest`-tag movement DEC** — separate future DEC, likely tied to GA readiness or a beta-2 patch where untagged users should be on the post-fix line.
- **GA promotion DEC** — final gate tying together Host scope (Cursor / Cline status), `latest` movement, multi-OS / Node 24+ CI matrix, examples beyond `discovery-to-plan`, dogfood evidence.
- **Dogfood feedback loop** — start using `npm install -g o-coding-navigation@beta` in real workflows; surface README and CLI gaps from real users as the highest-signal input for the next sweep.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
