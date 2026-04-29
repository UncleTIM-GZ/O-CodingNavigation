# GA Prep PR E Plan｜npm publish gating + CI stability audit

> Date: 2026-04-29
> Phase: GA Prep (post-Phase-2)
> Origin: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](2026-04-28-ga-prep-gap-review-plan.md) §3.7 + §3.9.
> Companion DECs: [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available).
> Status: `proposed` — this is a planning artifact only. **No `npm publish` is run from this PR.**

---

## 1. Purpose

PR E is **not** a publish PR. It writes the gating, audit, and decision-capture work that must happen *before* OCN can ever be published to npm. It also audits CI stability across the recent PR set.

Concretely, PR E produces:

- A documented gating checklist for any future `npm publish`.
- An audit plan for `package.json`, package contents (via `npm pack --dry-run`), and the `.npmignore` / `files` field.
- A clean-machine smoke-test plan that any future release must satisfy.
- A CI stability audit scope (the audit itself runs as part of executing this plan; the report it produces will live alongside this plan when complete).
- The required DEC entries that any future publish must reference.
- Explicit handling of the [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) caveat: until PR D completes, any release notes drafted under PR E's gating must include the verbatim line *"External MCP Host Validation pending."*

PR E does not modify any `src/` file.

---

## 2. Scope

### In scope

- Package name decision **workflow** (the actual name decision is captured in DEC-007 — see §4).
- Semver lane decision **workflow** (DEC-008).
- npm publish gating checklist.
- `prepublishOnly` script plan.
- Package contents audit plan.
- `.npmignore` vs `files` field decision (DEC-009).
- Clean-machine smoke-test plan.
- CI stability audit.
- Release-notes caveat workflow (driven by DEC-005).

### Out of scope

- Running `npm publish` (in any registry, including dry-run that produces a tarball intended for upload).
- Reserving a name on npm.
- Modifying `package.json` `name` / `version` / `bin` / `files`.
- Modifying `.npmignore` (creating it is a follow-up decision; PR E only plans).
- Modifying `.github/workflows/*.yml` (the CI audit is read-only).
- Implementing remote MCP, auth, rate limiting, sandboxing, or any new product feature.
- Any change to `src/` or `tests/`.
- Any host-compatibility claim (forbidden by DEC-005 until PR D completes).
- Mini-CRM dogfood (deferred behind its own DEC).

---

## 3. Non-goals (explicit forbidden actions in PR E execution)

- ❌ No `npm publish`.
- ❌ No `npm publish --dry-run` if the dry-run uploads anything to a registry.
- ❌ No npm-name reservation.
- ❌ No `package.json` mutation.
- ❌ No README change beyond pointing at this plan (PR B already shaped the README).
- ❌ No claim that Claude Desktop / Cursor / Cline are verified.
- ❌ No claim that PR D is complete.
- ❌ No SDK self-smoke labelled as external host validation.
- ❌ No mini-CRM dogfood, no `doctor`, `reset`, `baseline`, SOP upgrade implementation.

---

## 4. Decision gates (DECs that must be captured by PR E or a follow-up)

Each DEC below is a binding decision; the recommended default is offered as a starting point that the maintainer can override. Each DEC is captured into [`docs/20-decision-log.md`](../20-decision-log.md) before any implementation step that depends on it begins.

### 4.1 DEC-006 — npm package name

- **Question**: What is the published name?
- **Options**: `ocn` (short, matches CLI; may be taken on npm) · `o-coding-navigator` (verbose, unambiguous) · `ocn-cli` (common pattern; leaves `ocn` for a library) · `@ocn/cli` (scoped; requires an org account).
- **Procedure**: query npm availability for each candidate; if `ocn` is taken, choose between the alternatives based on user-recall vs registry-friendliness.
- **Recommended default**: investigate availability first, then propose. **No name is locked in PR E itself**; PR E records the *workflow*, not the choice.
- **Captured during**: PR E execution, after npm availability is checked.

### 4.2 DEC-007 — Semver lane for the first publish

- **Question**: What version is shipped at the first publish?
- **Options**: stay at `0.0.1-alpha.x` until mini-CRM dogfood (timid); jump to `0.1.0-alpha.0` to mark Phase 2 closure (honest pre-1.0); start at `1.0.0-alpha.0` (signals GA-quality core, raises expectations).
- **Recommended default**: `0.1.0-alpha.0`. Phase 2 closure is meaningful but not GA; `0.x` keeps expectations honest.
- **Captured during**: PR E execution.

### 4.3 DEC-008 — Publish alpha *before* PR D completes?

- **Question**: Can we ship `0.1.0-alpha.0` while host validation remains deferred?
- **Options**: yes-with-caveat (every release note carries "External MCP Host Validation pending"); no (block alpha until PR D completes).
- **Recommended default**: **yes-with-caveat**. The 312/394-test suite + projectRoot validator + threat model are a defensible alpha bar; the caveat is honest.
- **Constraints if "yes"**:
  - Every release note must include the line `External MCP Host Validation pending.`
  - README and `docs/mcp-usage.md` must not claim host verification.
  - The next release after PR D completes should carry release notes that explicitly remove the pending line.
- **Captured during**: PR E execution.

### 4.4 DEC-009 — Package contents policy (`files` field vs `.npmignore`)

- **Question**: Which approach controls what gets packaged into the tarball?
- **Options**:
  - `files` (allowlist) in `package.json` — explicit, easy to audit, default-deny.
  - `.npmignore` (blocklist) — opt-out; risk of accidentally shipping `tests/` or `.ocoding/` if a new file slips through.
  - Both (npm honours `files` over `.npmignore` when both exist; using both is redundant).
- **Recommended default**: `files` (allowlist). Set `files` to `["dist", "LICENSE", "README.md", "docs/quickstart.md", "docs/mcp-usage.md", "docs/security/mcp-threat-model.md", "docs/amendments/", "docs/20-decision-log.md"]` (refine during the audit in §5.2).
- **Captured during**: PR E execution, after the audit in §5.2.

### 4.5 DEC-010 — CI matrix policy

- **Question**: What Node versions and OS does CI run against?
- **Options**: Node 20 only (current) · Node 20 + 22 · Node 20 + 22 + 24 · multi-OS (Ubuntu + macOS + Windows).
- **Recommended default**: Node 20 + 22 on Ubuntu only for v0.1.0 alpha; expand matrix at v0.2.0-beta.
- **Constraints**: must match the `engines.node` declaration in `package.json` (currently `>=20`).
- **Captured during**: PR E execution, after the audit in §5.4.

> Each of DEC-006 / 007 / 008 / 009 / 010 may be captured *as part of executing PR E*, or in follow-up DEC-only PRs if the audit reveals more options than this plan anticipates. **PR E itself can land before all five are decided** — only DEC-005 is required-by-PR-E. The remaining DECs can land as follow-up commits on the same branch or as their own DEC-only PRs.

---

## 5. Required audits

### 5.1 `package.json` audit

Read `package.json` and confirm/record each field for any future publish:

| Field | Current value (read at audit time) | Action item |
|---|---|---|
| `name` | `ocn` | Subject to DEC-006. Verify availability on npm. |
| `version` | `0.0.1-alpha.0` | Subject to DEC-007. |
| `bin` | `{ "ocn": "dist/cli/index.js", "ocn-mcp": "dist/mcp/index.js" }` | Verify shebang `#!/usr/bin/env node` exists in both bin files; build script chmods them — confirm. |
| `main` / `exports` | `exports['.']` only — no `main` | OK for ESM-only `"type": "module"`. |
| `files` | (absent) | Subject to DEC-009. |
| `scripts` | includes `prepare: husky || true` | Add `prepublishOnly` (see §5.5). |
| `engines.node` | `>=20` | Verify CI matrix in DEC-010. |
| `license` | `Apache-2.0` | Verify `LICENSE` file content matches. |
| `repository` | (absent) | Add (see §5.6). |
| `keywords` | (absent) | Add a small set: `["ai", "coding", "mcp", "workflow", "cli", "state-machine"]`. |
| `description` | present | Verify it matches the README's one-liner. |
| `homepage` / `bugs` | (absent) | Add `homepage` (GitHub repo URL) and `bugs.url` (GitHub Issues URL). |

> **PR E records the action items but does not edit `package.json`.** Each `package.json` change is a focused follow-up commit (or a follow-up PR), gated by the corresponding DEC.

### 5.2 Package contents audit

Plan to run, locally only:

```bash
npm pack --dry-run
```

This prints the tarball contents without producing a file or uploading. Confirm the tarball would include:

- `dist/` (built CLI + MCP)
- `README.md`
- `LICENSE`
- `package.json`

And confirm it would **not** include any of:

- `tests/`
- `todos/`
- `.ocoding/` (any local state)
- `secrets/`, `.env`, private keys
- `docs/plans/` (decided per DEC-009 — these may or may not ship)
- `node_modules/`
- `.git/`, `.husky/`, `.github/` (config; should not ship)
- Coverage reports (`coverage/`)

Anything unexpected in the dry-run output → file a finding for the post-PR-E follow-up that introduces the `files` allowlist (DEC-009).

### 5.3 Clean-machine smoke-test plan

Plan only — do **not** execute against any registry. The plan describes the smoke-test that future releases must pass:

```bash
# In a temp directory on a clean machine (or a Docker container) with Node 20:
TMP=$(mktemp -d /tmp/ocn-clean-smoke-XXXXX)
cd "$TMP"

# 1. Build a tarball locally from the OCN repo:
cd /path/to/OCN
npm pack                                 # produces ocn-<version>.tgz
TARBALL=$(ls -t ocn-*.tgz | head -1)

# 2. Install globally from the tarball:
cd "$TMP"
npm install -g "/path/to/OCN/$TARBALL"

# 3. CLI smoke:
ocn --help
ocn --version

# 4. End-to-end project smoke:
ocn init
ocn status                               # state_discovery / step_project_brief
ocn doc create project-brief
ocn gate                                 # blocked: required sections missing
# (in a real smoke we'd fill in the brief; for the plan, the BLOCKED result is sufficient evidence the gate works)

# 5. MCP smoke (server-only, no host required):
ocn-mcp &                                # starts and waits silently on stdin
sleep 1
kill %1                                  # success = process started cleanly + exited cleanly

# 6. Cleanup:
npm uninstall -g ocn
cd /
rm -rf "$TMP"
```

**Important**: this plan is what gets executed when a real publish is being prepared. PR E records the plan; it does **not** run it (no smoke install of an unpublished tarball into your global npm prefix as part of this PR).

### 5.4 CI stability audit

The audit reads `.github/workflows/*.yml` (no edits) and the recent run history.

Audit dimensions:

| Dimension | What to check | Target |
|---|---|---|
| Workflow definition | What scripts run on which events? Caching of `node_modules`? | Document current state. |
| Node matrix | Single Node version (20) vs matrix? | Compare against DEC-010. |
| OS matrix | Ubuntu only vs multi-OS? | Compare against DEC-010. |
| Recent run history | Last ~10 runs across PRs #1–#11. Pass rate, runtime trend, flake patterns. | Identify any flake; file findings. |
| Caching | Is `npm ci` cached? `node_modules/.cache`? Vitest cache? | If absent and runs are slow, file a follow-up. |
| Coverage | Does CI run `test:coverage` or just `test`? | Document; not a blocker for alpha. |
| Required-checks | Which checks are required to merge? | Verify the `build` check is required. |
| Release pipeline | Is there any auto-publish? | Should be **none**. Confirm. |

The audit produces a section in the PR E execution thread that is folded into a future `docs/reports/2026-04-29-ci-stability-audit.md` once PR E executes. **PR E (this planning artifact) only specifies the audit scope; the audit report is a runtime output of executing this plan.**

### 5.5 `prepublishOnly` script plan

Add to `package.json` `scripts` (deferred edit — not in this PR):

```json
"prepublishOnly": "npm run lint && npm run typecheck && npm run test:coverage && npm run build"
```

This makes any future `npm publish` fail unless lint, typecheck, full test suite, and coverage report all pass first. Acts as a hard gate against accidental "publish from a dirty branch" mistakes.

If the `prepublishOnly` script is added in a follow-up PR, that PR must include a test/CI verification that running `npm pack` (which does NOT trigger `prepublishOnly`) still works — i.e. that `prepublishOnly` only fires on `npm publish` and not on every `npm pack`.

### 5.6 `repository`, `homepage`, `bugs`, `keywords` plan

Plan to add to `package.json` (follow-up edit):

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/UncleTIM-GZ/O-CodingNavigation.git"
  },
  "homepage": "https://github.com/UncleTIM-GZ/O-CodingNavigation#readme",
  "bugs": {
    "url": "https://github.com/UncleTIM-GZ/O-CodingNavigation/issues"
  },
  "keywords": ["ai", "coding", "mcp", "workflow", "cli", "state-machine", "discipline"]
}
```

These are required for npm registry hygiene (the package page on npmjs.com derives links from these fields). Adding them is **not** equivalent to publishing.

---

## 6. PR D caveat (driven by DEC-005)

Until PR D completes:

1. **No release note may claim** "Claude Desktop verified", "Cursor verified", or "Cline verified".
2. **Every release note** drafted under PR E's gating must include verbatim:

   ```
   External MCP Host Validation pending.
   ```

3. **README and `docs/mcp-usage.md`** describe the MCP configuration as *intended* usage, not as verified usage. No verification claim is permitted.
4. **`package.json` `keywords`** may include `mcp` (the protocol is implemented), but the description must not claim host compatibility.
5. **The npm publish gating checklist** (§7) includes a row for "External MCP Host Validation status". The row reads `pending (DEC-005)` until PR D lands; it flips to `complete (PR D #N merged)` only after the PR D merge commit is on `main`.

> PR E does not unblock PR D. The two PRs are independent and will land in either order. The caveat above remains active for as long as PR D is not on `main`.

---

## 7. Output of PR E (planning vs execution)

PR E (this PR) lands the *plan*. The plan's full execution may unfold across multiple follow-up PRs:

| Artifact | Lands in this PR? | Lands later? |
|---|---|---|
| This planning document | ✅ this PR | — |
| DEC-005 (PR D deferral) | ✅ this PR | — |
| Updated checklist banner | ✅ this PR | — |
| DEC-006 (npm name) | ⬜ deferred | follow-up DEC-only commit |
| DEC-007 (semver lane) | ⬜ deferred | follow-up DEC-only commit |
| DEC-008 (publish before PR D) | ⬜ deferred | follow-up DEC-only commit |
| DEC-009 (`files` vs `.npmignore`) | ⬜ deferred | follow-up DEC-only commit |
| DEC-010 (CI matrix) | ⬜ deferred | follow-up DEC-only commit |
| `package.json` field additions (§5.1) | ⬜ deferred | follow-up edit PR |
| `prepublishOnly` script (§5.5) | ⬜ deferred | follow-up edit PR |
| `files` allowlist (§5.2 / DEC-009) | ⬜ deferred | follow-up edit PR |
| `npm pack --dry-run` audit run | ⬜ deferred | runtime audit when DEC-009 lands |
| Clean-machine smoke (§5.3) | ⬜ deferred | only when a publish is being prepared |
| CI stability audit report | ⬜ deferred | runtime audit |

> **PR E itself is doc-only.** No `package.json`, `.npmignore`, `.github/workflows/*.yml`, or `src/` change ships in this PR.

---

## 8. Acceptance criteria

PR E is complete when:

- [x] DEC-005 (PR D deferral) is appended to `docs/20-decision-log.md`.
- [x] `docs/security/mcp-host-validation-checklist.md` is preserved on `main` with a top-of-file status banner pointing at DEC-005.
- [x] This planning artifact (`docs/plans/2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md`) lands on `main`.
- [ ] No `npm publish` is performed.
- [ ] No `package.json` mutation lands in this PR.
- [ ] No release notes are drafted in this PR (release notes are a follow-up artifact gated by DEC-007/008).
- [ ] No host-compatibility claim is added to README or `docs/mcp-usage.md`.
- [x] Local `lint + typecheck + test` pass.

The first four boxes are satisfied by this PR. The last four boxes are negative constraints — they describe what this PR does **not** do.

---

## 9. Hard rules

- ❌ No `npm publish`.
- ❌ No `npm publish --dry-run` that contacts a registry.
- ❌ No npm-name reservation.
- ❌ No `package.json` change in this PR.
- ❌ No `.npmignore` creation in this PR.
- ❌ No `.github/workflows/*.yml` edit in this PR.
- ❌ No host-compatibility claim anywhere (until PR D completes).
- ❌ No SDK self-smoke labelled as external host validation.
- ❌ No `src/` change.
- ❌ No new MCP tool, no remote MCP, no auth, no rate limiting.
- ❌ No mini-CRM dogfood.

---

## 10. References

- [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) — the deferral that this plan is anchored on.
- [DEC-002](../20-decision-log.md#dec-002phase-2-complete-after-mcp-safe-tools) — Phase 2 closure that authorised GA Prep.
- [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](2026-04-28-ga-prep-gap-review-plan.md) §3.7 (npm gating gap) + §3.9 (CI stability gap).
- [`docs/security/mcp-host-validation-checklist.md`](../security/mcp-host-validation-checklist.md) — preserved for future PR D execution.
- [`docs/security/mcp-threat-model.md`](../security/mcp-threat-model.md) — security baseline that any release must reference.
- [`docs/reports/2026-04-28-phase2-completion-report.md`](../reports/2026-04-28-phase2-completion-report.md) §6 (non-GA backlog) + §8 row 8 (npm package readiness gap) + §8 row 9 (CI stability gap).
- `package.json` — current state of fields enumerated in §5.1.
- `.github/workflows/` — read-only audit target for §5.4.
