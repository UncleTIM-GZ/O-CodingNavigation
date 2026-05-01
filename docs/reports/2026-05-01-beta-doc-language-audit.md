# Beta Candidate Documentation Language Audit

> Date: 2026-05-01
> Branch: `docs/beta-language-audit`
> Caveat: External MCP Host Validation closed for Claude Desktop only (DEC-017). Cursor and Cline remain unverified per DEC-019. This PR does not change Host validation status.

---

## 1. Summary

| Field | Value |
| --- | --- |
| Audit verdict | **Pass with edits** |
| Beta promotion | not authorised, not promoted |
| `npm publish` | not executed |
| `latest` movement | none — `dist-tags.latest` remains `0.1.0-alpha.0` per DEC-020 |
| Cursor / Cline status | remain explicitly unverified per DEC-019 |
| Active docs edits | 3 minimal corrections (README ×2, quickstart ×1) |
| Source / test code changes | none |
| `package.json` / `package-lock.json` changes | none |
| Workflow changes | none |

Three active-doc inaccuracies were found and corrected. All other audit-target files were already DEC-017 / DEC-018 / DEC-019 / DEC-020-compliant. Historical reports / plans / DEC bodies were reviewed as context only and were **not** rewritten — they record state-of-the-world at the time they were written and rewriting them would falsify the audit trail.

## 2. Scope

**Active docs audited (correction targets):**

| File | Status |
| --- | --- |
| `README.md` | edited (2 corrections) |
| `docs/quickstart.md` | edited (1 correction) |
| `docs/mcp-usage.md` | already compliant (no edit) |
| `examples/README.md` | already compliant (no edit) |
| `examples/discovery-to-plan/README.md` | already compliant (no edit) |
| `CLAUDE.md` | already compliant (no edit) |
| `.claude/rules.md` | already compliant (no edit) |

**Reviewed for context only (not rewritten):**

- `docs/reports/*` — historical state-of-the-world snapshots. The DEC-005 caveat phrasing (`"External MCP Host Validation pending."`) deliberately stays verbatim in pre-PR-D reports as audit-trail evidence of when validation actually completed.
- `docs/plans/*` — historical planning artifacts.
- `docs/20-decision-log.md` — append-only history. Prior DEC bodies (DEC-005 through DEC-020) keep their wording unchanged; DEC-017 supersedes the Claude Desktop scope of DEC-005, and DEC-019 / DEC-020 add the new policy surface, but the older DEC bodies record what was true at the time of decision.
- `docs/amendments/*` — historical amendments.

## 3. Rules applied

The audit applied the active-doc language rules from:

| DEC | Rule applied |
| --- | --- |
| **DEC-017** | Active-doc Host wording must say "Claude Desktop on Windows with WSL2 validated" (or equivalent scoped wording) — no broader Host claim allowed. |
| **DEC-018** | Beta candidate preparation is in progress; **not** authorised as beta promotion. Active docs must not imply beta is shipped. |
| **DEC-019** | Cursor and Cline must be named as **unverified** wherever they appear in active docs. No "compatible with all MCP hosts" or equivalent broad wording. Examples must not claim support for unverified Hosts. |
| **DEC-020** | Active docs must recommend `npm install -g o-coding-navigation@alpha`. The untagged form `npm install -g o-coding-navigation` must NOT be the recommended install path. `latest` is intentionally unchanged at `0.1.0-alpha.0`; any doc text suggesting `latest` "self-corrects" or "points to the recommended version" is wrong. |

## 4. Findings

| File | Line | Finding | Severity | Action |
| --- | --- | --- | --- | --- |
| `README.md` | 95 | **Stale dist-tag claim.** Pre-fix wording said `alpha` and `latest` "both point to `0.1.0-alpha.0` because this is the first published version" and that `latest` co-pointing "self-corrects on the next non-prerelease publish". Both clauses are factually wrong post-DEC-015 / DEC-016 (after alpha.1 and alpha.2 publishes, `alpha = 0.1.0-alpha.2` while `latest = 0.1.0-alpha.0` — they no longer co-point) and contradict DEC-020 (which says `latest` stays unchanged until the beta promotion DEC). | High | Rewrote the note: explicit reference to DEC-020, accurate `alpha = 0.1.0-alpha.2` / `latest = 0.1.0-alpha.0` state, mandatory `@alpha` install guidance, future-beta-DEC pointer. |
| `README.md` | 172 | **Implicit Cursor / Cline support claim.** Pre-fix lead sentence of §7 ("Wire it into any MCP-aware host (e.g. Claude Desktop, Cursor, Cline).") listed Cursor and Cline as equivalent wiring targets. Per DEC-019, only Claude Desktop on Windows with WSL2 is verified; Cursor and Cline are explicitly unverified. The "e.g." softening was insufficient because the sentence still functioned as a wiring recommendation across all three. | High | Rewrote: names Claude Desktop as the validated wiring target with DEC-017 / report links; explicitly states Cursor and Cline are MCP-aware but not yet verified; points at DEC-019 for the support boundary; tells the reader not to treat them as supported until each has its own validation report. |
| `docs/quickstart.md` | 31 | **Stale dist-tag claim** (same as README:95). Pre-fix wording said `alpha` and `latest` "both point to `0.1.0-alpha.0`" and gestured at "a stable `0.1.0` (no `-alpha`) or `1.0.0`" as the trigger that would move `latest`. Both clauses are wrong post-DEC-015 / DEC-016 / DEC-020. | High | Rewrote: explicit DEC-020 reference, accurate dist-tag state, `@alpha` install guidance, link to the npm global install smoke evidence. |

No other findings in any audited file.

### Examined and confirmed compliant (no edit)

- **`README.md` line 49** — "Maturity: alpha — not stable, not GA, not production-ready" — DEC-018-compliant; explicit "not GA, not production-ready" framing.
- **`README.md` line 97** — pre-GA caveat — already DEC-017 / DEC-019-aligned (Claude Desktop validated, Cursor / Cline unverified).
- **`README.md` line 238** — PR D status flipped to 🟢 with Claude-Desktop-scoped wording and explicit "Cursor and Cline remain unverified".
- **`README.md` line 247** — "Mini-CRM dogfood (Tier 2 GA success criterion)" — describes a future criterion, not a current claim. Compliant.
- **`docs/quickstart.md` line 12** — install command uses `@alpha`. DEC-020-compliant.
- **`docs/quickstart.md` line 23-25** — Claude Desktop validation statement, DEC-017-aligned.
- **`docs/mcp-usage.md` §"Wire into an MCP host (example: Claude Desktop)"** (line 27) — names Claude Desktop as the example. The §43-48 note explicitly scopes Cursor / Cline as unverified per DEC-017.
- **`docs/mcp-usage.md` line 199** — "HTTP / SSE transport (for browser-side MCP hosts)" — describes a future feature; no Cursor / Cline implication. Compliant.
- **`examples/README.md`** — already DEC-017 / DEC-019-aligned (PR #38 added the scoped wording).
- **`examples/discovery-to-plan/README.md`** — already DEC-017 / DEC-019-aligned.
- **`CLAUDE.md`** — internal contract for AI sessions, not user-facing release wording. The "alpha/beta/GA stop conditions" reference at line 34 is a reference to `docs/01-scope.md`'s scope discussion, not a release claim. The "beta+" markers at lines 308 / 323 are roadmap TODOs ("expanded at beta+"), not release claims. Compliant.
- **`.claude/rules.md`** — same shape as CLAUDE.md. The "beta+" markers at lines 287 / 288 / 323 are internal roadmap markers, not user-facing release wording. Compliant.

## 5. Active docs final wording (post-audit)

- **Install command (`README.md:74`, `docs/quickstart.md:12`):** `npm install -g o-coding-navigation@alpha` — DEC-020-compliant.
- **Host wording (everywhere `Claude Desktop` / `Cursor` / `Cline` appears in active docs):** Claude Desktop on Windows with WSL2 named as the validated Host with DEC-017 / report references; Cursor and Cline explicitly named as unverified with DEC-019 reference. DEC-019-compliant.
- **Cursor / Cline status:** unverified everywhere — no active doc claims compatibility, support, or "verified" status. DEC-019-compliant.
- **Beta wording:** active docs say "beta candidate preparation" (DEC-018) and "future beta promotion DEC" (DEC-020); never say "beta released" or "beta available". DEC-018-compliant.
- **`latest` wording:** active docs explain `latest = 0.1.0-alpha.0` is intentionally unchanged per DEC-020, and that `latest` will only move when a future beta promotion DEC authorises it. DEC-020-compliant.
- **GA / production-ready wording:** active docs say "not stable, not GA, not production-ready" (`README.md:49`, `README.md:97`). The roadmap section (`README.md:231-241`) is explicitly titled "GA Prep — not yet implemented". No active doc claims GA or production-readiness.

## 6. Historical docs policy

The audit deliberately did NOT rewrite:

- `docs/reports/*` (every report from 2026-04-28 through 2026-05-01) — the DEC-005 caveat (`"External MCP Host Validation pending."`) remains verbatim in pre-PR-D reports because that wording records the state-of-the-world at the time of writing. Rewriting it retroactively would falsify the audit trail.
- `docs/plans/*` — same policy.
- `docs/20-decision-log.md` body of every prior DEC (DEC-001 through DEC-019). Append-only discipline: superseding facts go in DEC-017 / DEC-019 / DEC-020 themselves, not by rewriting earlier DEC bodies in place.
- `docs/amendments/*` — same policy.

This matches the explicit policy from DEC-017 §10 ("For historical artifacts: the caveat **stays verbatim** because those documents record the state-of-the-world at the time they were written") and from DEC-019's append-only context.

## 7. Validation

### Greps applied (post-edit)

```
grep -RIn "Cursor"   README.md docs/quickstart.md docs/mcp-usage.md examples/README.md examples/discovery-to-plan/README.md
grep -RIn "Cline"    README.md docs/quickstart.md docs/mcp-usage.md examples/README.md examples/discovery-to-plan/README.md
grep -RIn "latest"   README.md docs/quickstart.md docs/mcp-usage.md examples/README.md examples/discovery-to-plan/README.md
grep -RIn "npm install -g o-coding-navigation" \
                     README.md docs/quickstart.md docs/mcp-usage.md examples/README.md examples/discovery-to-plan/README.md
```

Results post-edit:

- **Cursor / Cline mentions** — every occurrence is scoped to "not yet verified" / "unverified" / "remain unverified" / "must not claim support".
- **latest mentions** — every occurrence is DEC-020-aligned (intentionally unchanged at `0.1.0-alpha.0`, `@alpha` is the canonical install path).
- **`npm install -g` commands** — every occurrence uses the `@alpha` selector.

No active-doc untagged install commands. No unscoped Cursor / Cline implication. No claim that `latest` will "self-correct" or move on its own.

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
 README.md          | 4 ++--
 docs/quickstart.md | 2 +-
 2 files changed, 3 insertions(+), 3 deletions(-)
```

Plus this report (new file). No `src/`, `tests/`, `package.json`, `package-lock.json`, `.github/`, examples, CLAUDE.md, or `.claude/rules.md` change.

## 8. Follow-up

DEC-018 prerequisite progress after this PR merges:

- ✅ **CI Node 22 matrix expansion** (PR #35).
- ✅ **Host support boundary** (PR #36 / DEC-019).
- ✅ **`npm install -g` smoke evidence** (PR #37).
- ✅ **Examples F2 / F3** (PR #38).
- ✅ **`latest`-tag strategy DEC** (PR #39 / DEC-020).
- ✅ **Doc audit for accidental beta language** — this PR.
- ⬜ **Beta promotion DEC** (final gate).

The **next** beta candidate preparation step is the **Beta Promotion DEC** itself. That DEC must:

1. Reference DEC-017, DEC-018, DEC-019, DEC-020 + this audit report as the evidence chain.
2. Choose between the three `latest`-tag movement options DEC-020 left open: (i) publish beta under `beta` only; (ii) publish beta under both `beta` and `latest`; (iii) keep `latest` unchanged until GA.
3. Explicitly authorise (or not) the `npm publish --tag beta` command.
4. Carry forward DEC-019's canonical scoped wording verbatim into beta release notes ("Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.").
5. Stipulate the version bump (`0.1.0-alpha.2` → `0.1.0-beta.0`) and the publish discipline pattern from DEC-016 (manual version handling, evidence report, no `--ignore-scripts`, no implicit `--tag`).

Until that DEC is accepted, **beta publish remains unauthorised** and `latest` remains unchanged. Cursor and Cline remain unverified. No public-facing "beta" claim is allowed.

External MCP Host Validation closed for Claude Desktop. Cursor and Cline remain unverified.
