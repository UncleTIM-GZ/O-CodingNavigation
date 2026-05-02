# Post-Beta Install Documentation Update

> Date: 2026-05-01
> Branch: `docs/post-beta-install-instructions`
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified per DEC-019. This PR does not change Host validation status.

---

## 1. Summary

| Field | Value |
| --- | --- |
| Beta publish | completed (PR #42 / `0.1.0-beta.0` / `dist-tags.beta = 0.1.0-beta.0`) |
| Active install docs | now recommend `npm install -g o-coding-navigation@beta` |
| `latest` movement | **none** — `dist-tags.latest` remains `0.1.0-alpha.0` per DEC-020 / DEC-021 |
| `@alpha` channel | preserved as a secondary, still-available channel; explicitly **not** the recommended path |
| Untagged install | explicitly **not** recommended in active docs while `latest` is intentionally stale |
| Host support wording | preserved verbatim per DEC-019 / DEC-021: *"Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified."* |
| Files changed | `README.md`, `docs/quickstart.md`, plus this report (NEW) |
| Source / test code changes | none |
| `package.json` / `package-lock.json` changes | none |
| npm | no publish, no version bump, no dist-tag movement, no `latest` promotion |

This PR completes the post-beta-publish docs handoff that DEC-021's "Beta documentation rule (post-publish)" allows once `npm view o-coding-navigation@beta` returns `0.1.0-beta.0` (verified at this PR's authoring time).

## 2. DEC basis

- **DEC-019** — Beta Host support boundary. Canonical scoped wording (Claude Desktop on Windows with WSL2 validated; Cursor / Cline not yet verified) carried forward into every active doc.
- **DEC-020** — npm `latest` tag strategy. `latest` stays at `0.1.0-alpha.0`; active docs MUST continue to require an explicit selector for installation. This PR enforces that constraint with `@beta` as the new explicit-default selector.
- **DEC-021** — first beta promotion authorisation. §"Beta documentation rule (post-publish)" explicitly allows active docs to introduce `npm install -g o-coding-navigation@beta` after the publish PR succeeds, and explicitly forbids replacing scoped Host wording or recommending untagged installs while DEC-020 / DEC-021 are in force.
- `docs/reports/2026-05-01-npm-beta-0-publish-report.md` — the publish evidence that DEC-021's documentation rule keys off of (`npm view o-coding-navigation@beta` returns `0.1.0-beta.0`, 18-step checklist all green).

## 3. Files updated

| File | What changed | Why |
| --- | --- | --- |
| `README.md` §3 status table | `npm` row now lists current `@beta` / `@alpha` / `latest` resolutions; `Maturity` row now says "pre-GA beta"; `External host validation` row now reflects DEC-017's Claude-Desktop-scoped closure (was: stale "pending"). | Status table contradicted §1's caveat banner and the registry reality post-DEC-016 / DEC-017 / DEC-021. |
| `README.md` §4 Install heading | "Recommended: alpha from npm" → "Recommended: beta from npm". | DEC-021 §"Beta documentation rule (post-publish)" allows `@beta` as the recommended channel after publish. |
| `README.md` §4 install command | `npm install -g o-coding-navigation@alpha` → `npm install -g o-coding-navigation@beta` (primary recommendation). | Same. |
| `README.md` §4 verify block | Adds explicit `ocn --version` line showing `0.1.0-beta.0`. | Mirror of `docs/quickstart.md` §1a behaviour; lets a new user catch a wrong-version install immediately. |
| `README.md` §4 "Currently published" table | Replaces the single "Current alpha" table with a 3-row table listing `beta`, `alpha`, and `latest` with their versions, npm tags, and scoping notes. | Honest representation of the current registry state under DEC-020 / DEC-021. |
| `README.md` §4 dist-tag note | Updated to reference DEC-021 alongside DEC-020; explicit "Do NOT use untagged" instruction; named selectors for both `@beta` (recommended) and `@alpha` (still available). | DEC-021 §"Beta documentation rule (post-publish)" plus DEC-020's binding rule against untagged installs. |
| `README.md` §4 Pre-GA caveat | "this is an **alpha** release" → "this is a **pre-GA beta** release". Host wording, Cursor / Cline scoping, and DEC-005 historical pointer all preserved. | Truth maintenance: the package's recommended channel is now `@beta`. The DEC-005 historical caveat link is kept as audit-trail evidence of the original deferral. |
| `docs/quickstart.md` §1a heading | "Recommended — install the alpha package from npm" → "Recommended — install the beta package from npm". | Same as README §4. |
| `docs/quickstart.md` §1a install command | `@alpha` → `@beta` (primary). | Same. |
| `docs/quickstart.md` §1a verify line | `ocn --version       # 0.1.0-alpha.0` → `# 0.1.0-beta.0`. | Was a stale alpha.0 reference (predates the alpha.1 / alpha.2 / beta.0 publishes). |
| `docs/quickstart.md` §1a "Alpha is still available" callout | NEW — explicit pointer at `@alpha` for users who specifically need the alpha line, with explicit framing that `@beta` is the recommended channel. | DEC-021 allows `@alpha` to remain visible as a still-available secondary channel; this PR makes that explicit so users don't think `@alpha` was deprecated. |
| `docs/quickstart.md` §1a dist-tag note | Updated to reference DEC-021 alongside DEC-020; current dist-tag table inline; explicit "Do NOT use untagged" instruction; pointers to both the install smoke report and the beta publish report. | Same logic as README §4. |
| `docs/mcp-usage.md` | **not changed**. Has no install commands or release-version claims (line 12's `npm install` refers to source-checkout setup, not user install). The DEC-017 Host scoping at §"Wire into an MCP host" remains correct. | Minimal blast radius. |

## 4. Install command policy (post-beta)

| Path | Command | Status |
| --- | --- | --- |
| **Recommended pre-GA** | `npm install -g o-coding-navigation@beta` | resolves to `0.1.0-beta.0` |
| Still available (secondary) | `npm install -g o-coding-navigation@alpha` | resolves to `0.1.0-alpha.2` |
| **Do NOT use** while `latest` is intentionally stale | `npm install -g o-coding-navigation` (untagged) | resolves to `0.1.0-alpha.0` (the historical first publish, NOT the recommended channel) |

The "Do NOT use untagged" rule comes from DEC-020 §Documentation rule (binding) and DEC-021 §"Beta documentation rule (post-publish)". Reviewers reject any future PR that adds an untagged `npm install -g o-coding-navigation` to active docs while these DECs are in force.

## 5. Host support wording (preserved verbatim)

Every active doc that mentions Host compatibility uses one of these scoped phrasings:

- *"Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified."* (canonical, fixed in DEC-019 / DEC-021)
- *"MCP Host validation completed for Claude Desktop on Windows with WSL2"* (preserved from PR #33 / DEC-017 closure)
- *"Cursor and Cline remain unverified"* (preserved from the doc audit in PR #40)

No active doc claims Cursor or Cline compatibility. No active doc broadens the Host scope beyond Claude Desktop on Windows with WSL2.

## 6. Validation

### Greps applied (post-edit)

```
$ grep -RIn "npm install -g o-coding-navigation@beta" README.md docs/quickstart.md docs/mcp-usage.md
README.md:74:npm install -g o-coding-navigation@beta
docs/quickstart.md:12:npm install -g o-coding-navigation@beta

$ grep -RIn "npm install -g o-coding-navigation@alpha" README.md docs/quickstart.md docs/mcp-usage.md
docs/quickstart.md:31:> **Alpha is still available** at `npm install -g o-coding-navigation@alpha` (resolves to `0.1.0-alpha.2`) but `@beta` is now the recommended pre-GA channel. …

$ grep -RInE "npm install -g o-coding-navigation([^@]|$)" README.md docs/quickstart.md docs/mcp-usage.md
# Only matches inside "Do NOT use untagged …" framing (README:97, docs/quickstart.md:33). No untagged recommendation.
```

Confirmed:

- `@beta` is the only recommended install (in two active-doc files).
- `@alpha` appears only inside an explicit "still available, secondary" callout.
- Untagged `npm install -g o-coding-navigation` appears only inside explicit "Do NOT use" / "do not rely on" framing.
- Every `latest` mention is DEC-020 / DEC-021-aligned.
- Every Cursor / Cline mention is scoped to "not yet verified" / "remain unverified".
- DEC-019's canonical scoped Host wording is preserved verbatim.

### Local checks

```
$ npm run lint        → clean
$ npm run typecheck   → clean
$ npm run test        → 449 / 449 pass (unchanged from main)
```

Coverage skipped — docs-only PR.

### Diff scope

```
$ git diff --stat
 README.md          | 36 +++++++++++++++++++-----------------
 docs/quickstart.md | 10 ++++++----
 2 files changed, 25 insertions(+), 21 deletions(-)
```

Plus this report (new file). No `src/`, `tests/`, `package.json`, `package-lock.json`, `.github/`, examples, CLAUDE.md, `.claude/rules.md`, or `docs/mcp-usage.md` change.

## 7. Non-goals

The following are confirmed **not** to have happened during this PR:

- ❌ **No `npm publish`, no `npm version`, no `npm dist-tag` change.**
- ❌ **No `latest` promotion.** `dist-tags.latest` stays at `0.1.0-alpha.0`. Verified pre- and post-edit.
- ❌ **No git tag, no GitHub release.**
- ❌ **No `package.json` / `package-lock.json` change.** Repo version stays `0.1.0-beta.0` (the same as PR #42).
- ❌ **No `src/` / `tests/` / `.github/workflows/*` change.**
- ❌ **No `docs/mcp-usage.md` change.** That file had no install commands or version claims to update.
- ❌ **No examples, CLAUDE.md, or `.claude/rules.md` change.**
- ❌ **No Cursor / Cline compatibility claim.**
- ❌ **No DEC-017 caveat removal beyond the pre-existing Claude Desktop scope.**
- ❌ **No untagged `npm install -g o-coding-navigation` recommended anywhere in active docs.**

## 8. Follow-up

This PR closes the docs handoff that DEC-021 anticipated. The remaining tracks each gate on their own future DEC; none are authorised here:

- **`latest`-tag movement DEC.** The next DEC that touches `dist-tags.latest` would have to weigh the trade-off between exposing untagged installs to a pre-GA package vs. leaving `latest` indefinitely stale at `0.1.0-alpha.0`. Likely tied to a GA readiness decision (or a beta-2 patch where the project decides untagged users should be on the post-fix line).
- **Optional GitHub release / git tag DEC.** OCN has avoided git tags + GitHub releases per the publish-discipline DECs (DEC-008 / DEC-012 / DEC-015 / DEC-016 / DEC-021). A future DEC may revisit if external observability (dependabot signals, release-notification feeds, third-party tooling that watches GitHub releases) becomes valuable.
- **Cursor real-Host validation.** A separate future PR following the DEC-017 pattern (scoped report + closure DEC) widens the validated Host set. Cursor remains unverified until then; no active doc may claim Cursor support.
- **Cline real-Host validation.** Same pattern.
- **Multi-OS / Node-24+ CI matrix expansion.** Out of scope for v1.0; likely revisited at GA per DEC-007's "GA requires" follow-ups.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
