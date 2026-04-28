# OCN GA Prep — Gap Review Plan

> Date: 2026-04-28
> Phase: post-Phase 2, pre-implementation
> Origin: [DEC-002](../20-decision-log.md#dec-002phase-2-complete-after-mcp-safe-tools) — Phase 2 closed at PR #6 merge; next phase is Gap Review.
> Companion: [`docs/reports/2026-04-28-phase2-completion-report.md`](../reports/2026-04-28-phase2-completion-report.md) (§7 non-GA backlog, §8 GA Prep Gap matrix).
> Status: `proposed` — this is a planning artifact only. **No source code changes. No new functionality.**

---

## 1. Objective

Determine what OCN still lacks before it can move from *internal-tool-running-on-the-author's-machine* to *publicly usable alpha → beta → GA*.

The Gap Review answers four questions, in order:

1. **What's broken or missing** that an external first-time user would notice within their first 5 minutes (README, install, `--help`, MCP wiring)?
2. **What's structurally inconsistent** in the project itself (docs numbering vs SOP profile, frozen-doc references to old paths, amendments unconsolidated)?
3. **What's a safety risk** if a third party connects an MCP host to OCN today (path traversal on `projectRoot`, prompt-injection misuse, DoS via repeated tool calls)?
4. **What human decisions** are required before any GA-prep PR can ship (npm package name, semver lane, dogfood-before-publish vs publish-then-dogfood, frozen-doc reconciliation strategy)?

Out of scope for this Gap Review: implementing fixes for any gap. The Gap Review's job is to *identify, classify, and sequence* — not to ship.

---

## 2. Non-goals

This planning artifact will **not** result in any of the following:

- ❌ Any change to `src/`
- ❌ `ocn doctor` implementation
- ❌ `ocn reset` implementation
- ❌ `ocn baseline` implementation
- ❌ SOP upgrade tooling (`ocn sop {version,diff,upgrade --plan}`) implementation
- ❌ npm publish (no package name decision is locked here, no `npm publish` is run)
- ❌ Mini-CRM dogfood (deferred behind a separate DEC entry)
- ❌ MCP tool surface change (the 7 allowed / 4 forbidden are frozen for GA Prep)
- ❌ External release (no `v1.0-alpha` / `-beta` / GA tag from this PR)
- ❌ Examples directory implementation (planned, not built here)
- ❌ Production / full tier artifact-set enforcement
- ❌ HTTP / SSE MCP transport
- ❌ MCP auth or session management
- ❌ README rewrite (planned in PR B but not executed in this artifact)
- ❌ CLI `--help` copy edits (planned in PR B but not executed in this artifact)

**This document writes a plan; it does not change behaviour.**

---

## 3. Gap Areas

Each gap is summarised as: *what the gap is*, *why it matters before GA*, *current evidence in-tree*, and *what a "fix" looks like* (so the future implementing PR has a starting point — but the fix itself is not done here).

### 3.1 README first-5-minutes experience

- **What**: The top-level `README.md` does not yet present a coherent first-5-minutes story (what OCN is in one sentence; install; `ocn init` + `ocn advance` walkthrough; how to wire `ocn-mcp` into a host).
- **Why**: The product thesis (encoded in `CLAUDE.md` §1: "turn AI Coding into navigable, gated, auditable process") is invisible to a first-time reader. Anyone landing on the GitHub repo today must read `docs/00-08` to understand intent, which is a 5,000+-line ask.
- **Evidence**: `package.json` references `README.md`; the file's adequacy for an external reader has not been audited (see Phase 2 Completion Report §8 row 1).
- **Fix shape**: Rewrite `README.md` with a quick-start + value proposition + MCP wiring + link to `docs/00-project-brief.md` for full context. Bilingual where appropriate.

### 3.2 Docs numbering divergence / SOP v1.1 alignment

- **What**: The bundled SOP profile (after PR #4) expects the "new layout" (`docs/04-technical-architecture.md`, etc.) while OCN's own `docs/04-08` use the "old layout" (`04-information-architecture.md`, `05-data-model.md`, `06-api-contract.md`, `07-test-strategy.md`, `08-mvp-plan.md`). The decision-log path moved from `19-` to `20-` in PR #7, but `docs/00-08`, plan files, `CLAUDE.md`, and `.claude/rules.md` still reference the old path.
- **Why**: OCN-on-OCN dogfood with the new SOP profile cannot succeed today — `ocn check` would report the new-layout artifacts as missing while OCN's own docs sit in old-layout slots. This silently breaks the strongest credibility signal a user can ask for ("does OCN run on itself?").
- **Evidence**: Captured in PR #4 plan §4 ("Note on existing OCN repo doc layout"), Phase 2 Completion Report §8 row 7, DEC-002 Risk R6, DEC-002 follow-up observation about reconciling `19 → 20` references.
- **Fix shape**: A binding decision (tracked under §6 Decision Gates) — either renumber OCN's own `docs/04-08` to match, or ship a profile override that lets OCN run with its existing layout. Either way, write an amendment file in `docs/amendments/` recording the choice.

### 3.3 MCP usage external host validation

- **What**: `docs/mcp-usage.md` describes how to wire `ocn-mcp` into an MCP host (Claude Desktop config block as the canonical example). No external host has been verified to:
  - Successfully list the 7 tools.
  - Confirm the 4 forbidden tools are absent from the host-side `tools/list` response.
  - Round-trip a real `navigator.create_artifact` and `navigator.run_gate` call.
- **Why**: The contract OCN owns (envelope shape, audit emission, no stderr writes on success) is fully covered by `tests/mcp/mcp-tools.integration.test.ts`. The contract OCN does **not** own (host-side parsing, schema rendering, error display) is unverified. Any host-specific friction will surface as a "looks broken" first impression for early adopters.
- **Evidence**: Phase 2 Completion Report §8 row 4; DEC-002 follow-up observation about validating against an external MCP host.
- **Fix shape**: Run `ocn-mcp` against at least 2 of {Claude Desktop, Cursor, Cline}, capture screenshots / transcripts, file any host-specific issues as todos, update `docs/mcp-usage.md` with host-specific tips.

### 3.4 MCP `projectRoot` path-traversal audit

- **What**: All 7 MCP tool handlers accept a `projectRoot: string` argument. Current validation per `src/mcp/tools/*.ts` is "must be an absolute path" — no canonicalisation, no allow-list, no symlink resolution check.
- **Why**: An adversarial host (or a misconfigured agent following a malicious prompt) could pass a `projectRoot` that traverses outside the user's intended workspace — e.g., `/etc`, a sibling project, or via a symlink. Tools that mutate the filesystem (`create_artifact`, `capture_log`) would then write into the wrong directory; tools that read state would leak across boundaries.
- **Evidence**: Phase 2 Completion Report §8 row 11 ("Is the file-system boundary safe?"); DEC-002 follow-up observation about path-traversal audit.
- **Fix shape**: Audit the 7 handlers + `src/core/state/lock.ts`, `src/core/audit/audit-paths.ts`, `src/core/templates/*` for path handling. Add canonicalisation (`fs.realpath`), reject `..` segments, optionally require `.ocoding/` to exist before any mutation. Document the result in a new amendment + update `docs/mcp-usage.md`.

### 3.5 CLI `--help` copy audit

- **What**: `tests/cli/help.test.ts` confirms `--help` runs and exits 0 for all 7 commands (`init`, `status`, `brief`, `doc`, `check`, `gate`, `advance`). The copy itself — does each command's description match its real behaviour? Are bilingual messages consistent? — has not been audited.
- **Why**: `--help` is the CLI's documentation surface for users who don't read `docs/`. Stale or imprecise help text creates friction during the first 5 minutes and erodes the "this tool is rigorous" signal that OCN sells.
- **Evidence**: Phase 2 Completion Report §8 row 3; DEC-002 follow-up observation about CLI help audit.
- **Fix shape**: Read each command's `commander` registration in `src/cli/commands/*.ts`. Cross-check description / option list / examples against the actual behaviour and the bilingual `BilingualMessage` keys in `src/core/i18n.ts`. Edit copy where divergent. **No behaviour changes.**

### 3.6 `docs/amendments/` consolidation

- **What**: `docs/amendments/` currently contains exactly one file (`2026-04-28-audit-storage-path-amendment.md` — AM-001). Two amendments are now pending:
  - **AM-002 (decision log path)**: `docs/19-decision-log.md → docs/20-decision-log.md` rename adopted in PR #7. Frozen design docs still reference the old path.
  - **AM-003 (docs layout vs SOP profile)**: see §3.2 above.
- There is no `docs/amendments/README.md` index, no naming convention guide, no instruction for future amendments.
- **Why**: Amendments are how OCN reconciles "frozen design docs" with "implementation reality" without rewriting the design. Without a documented convention, future amendments will drift in style and discoverability.
- **Evidence**: Phase 2 Completion Report §8 row 6.
- **Fix shape**: Write `docs/amendments/README.md` with naming convention (`YYYY-MM-DD-<short-slug>-amendment.md`), table-of-contents (auto-or-manual), and amendment template. Then write AM-002 (decision-log path move) as the first follow-up amendment.

### 3.7 npm publish gating plan

- **What**: No package name decision; package not published; no semver lane (`v1.0-alpha` / `-beta` / GA); no `prepublishOnly` hook; no `.npmignore` audit; no clean-machine smoke test.
- **Why**: Until OCN is `npm install -g`-able, every external user must clone + build, which contradicts the "local-first, MCP-first, runs anywhere" pitch. But publishing prematurely is worse than not publishing — once a name is taken on npm, it's hard to give back.
- **Evidence**: Phase 2 Completion Report §6 (npm publish in remaining non-GA items); §8 row 8 (npm package readiness gap).
- **Fix shape**: A planning-only PR that decides: (a) package name (current `ocn` may be taken — investigate alternatives like `o-coding-navigator`, `ocn-cli`); (b) semver lane (`0.1.0-alpha.0` exists in `package.json` already); (c) `prepublishOnly`: `npm run lint && npm run typecheck && npm run test:coverage && npm run build`; (d) `.npmignore` audit; (e) the smoke-test script. **No actual `npm publish` runs from this gating PR.**

### 3.8 `examples/` directory plan

- **What**: No `examples/` directory exists. New users can't see the full DISCOVERY → PLAN walkthrough without manually running every command.
- **Why**: The product's strongest demo is a fully-walked example project showing `ocn init` → `doc create project-brief` → fill in sections → `ocn advance` → repeat → end at `step_prd`. Without it, users have to imagine the value.
- **Evidence**: Phase 2 Completion Report §6, §8 row 5.
- **Fix shape**: A planning-only PR that decides: directory layout (`examples/01-fresh-init/`, `examples/02-blocked-prd/`, `examples/03-walkthrough-discovery-to-plan/`), what gets bundled (just docs? snapshot of `.ocoding/`?), and how to keep examples in sync with SOP profile changes (auto-regenerate or manual pin). **No examples are built here.**

### 3.9 CI stability audit

- **What**: All 5 Phase-2 engineering PRs (and the 2 docs PRs) reported CI SUCCESS at merge. The CI workflow definition (caching, matrix, flake patterns over time, runtime trends) has not been audited.
- **Why**: A flaky CI surface erodes contributor trust and tempts maintainers into `--no-verify` shortcuts. Phase 2's pre-commit hook also runs `lint + typecheck + test`, which doubles compute on every push if CI doesn't share a cache.
- **Evidence**: Phase 2 Completion Report §8 row 9.
- **Fix shape**: Read `.github/workflows/*.yml` (assuming GitHub Actions). Document: how long does CI take, is `npm ci` cached, is `node_modules/.cache` cached, do we run `test:coverage` in CI or just `test`, what node versions are tested. File issues for any flake or runtime regression observed. **No workflow edits in the audit PR — edits land in a follow-up.**

### 3.10 MCP external security review

- **What**: No external review of the MCP surface for: misuse-via-prompt (a malicious prompt could try to coax the LLM into calling `capture_log` with `type: "decision"` repeatedly until it finds a bypass — none exists today, but the threat model isn't documented), DoS via repeated `run_gate` calls, malicious `projectRoot` (covered in §3.4), input injection in `message: string` arguments to `capture_log`.
- **Why**: OCN's safety claim is structural ("forbidden tools never registered"), but the soft surface (input arguments, error messages, audit emission frequency) hasn't been threat-modelled.
- **Evidence**: Phase 2 Completion Report §8 row 12; DEC-002 follow-up observation.
- **Fix shape**: Threat-model document at `docs/security/2026-XX-XX-mcp-threat-model.md` enumerating the threats above and the existing/needed mitigations. **No code changes in the threat-model PR — code changes (if any) land in a separate follow-up.**

---

## 4. Outputs

This Gap Review is *planning-only*. It produces:

| Output | Location | Format |
|---|---|---|
| Gap matrix | this file §3 + §5 | table + prose |
| Recommended PR sequence | this file §5 | ordered list with dependencies |
| Risk ranking | this file §5 | per-PR risk band |
| Decision candidates | this file §6 | `Decision needed:` items + recommended default |
| Open questions | this file §10 | bulleted list |

**Outputs explicitly excluded**: any code, any `npm publish`, any new MCP tool, any tagged release, any merge to `main` other than this plan file.

---

## 5. Recommended GA Prep PR Sequence

The 6 PRs below are ordered by dependency and risk. Each is a *planning or audit* PR until otherwise noted. Implementation PRs (if any) are flagged explicitly.

### Gap matrix → PR mapping

| PR | Title | Gaps addressed | Type | Risk | Dependencies |
|---|---|---|---|---|---|
| **PR A** | docs: numbering reconciliation + amendments index | §3.2, §3.6 | Docs only | Low | None — branches off `main` post-PR #7 |
| **PR B** | docs: README first-5-minutes + CLI help copy audit | §3.1, §3.5 | Docs + minor copy edits in `commander` strings | Low | PR A (so README references current paths) |
| **PR C** | security: MCP `projectRoot` path-traversal audit + threat-model doc | §3.4, §3.10 | Audit doc + targeted code change if a real vulnerability is found | Medium (only if a vuln is found) | PR A (so amendment files have a home) |
| **PR D** | validation: external MCP host smoke tests + transcripts | §3.3 | Manual validation + doc updates | Low (no code change) | PR C (so any path-traversal mitigation is in place before external eyes) |
| **PR E** | plan: npm publish gating + CI stability audit | §3.7, §3.9 | Planning doc + `.github/workflows` audit (no edits) | Medium (touches release + CI surface) | PR B (README must be ready before publish), PR D (host validation done) |
| **PR F** | plan: `examples/` directory layout + first example pinning strategy | §3.8 | Planning doc; example creation deferred to a follow-up | Low | PR A (docs numbering must be settled), PR B (README sets up navigation to examples) |

### Why this order

1. **PR A first** because every subsequent doc PR will write the wrong path if the docs-numbering / amendments situation isn't reconciled.
2. **PR B second** because README + `--help` are the user-visible surface; once they're correct, every other doc-changing PR can link into them.
3. **PR C before PR D** because external host validation (PR D) effectively publishes OCN's MCP surface to a third-party tool — any path-traversal fix should land first.
4. **PR D before PR E** because the npm-publish gating plan must reference verified MCP-host compatibility evidence.
5. **PR E before PR F** because example-project decisions (which commands to demonstrate, what `.ocoding/` snapshot to pin) depend on whether OCN is publishable as `npm install -g ocn` or only as `git clone + npm link`.
6. **PR F last** because examples are a multiplier on top of correct docs + correct CLI + verified MCP — building them earlier risks rebuilds.

### Risk ranking (single-line summary)

```
High   : (none in this sequence)
Medium : PR C (security audit may surface code changes), PR E (release + CI surface)
Low    : PR A, PR B, PR D, PR F
```

No PR in this sequence is gated by mini-CRM dogfood, npm publish, or any external tagging event.

---

## 6. Decision Gates

These are the binding decisions that must be captured as DEC entries in `docs/20-decision-log.md` **before** each PR can begin implementation. Each decision is shown with options + the recommended default the maintainer can override.

### 6.1 Renumber `docs/04-08` to match the SOP v1.1 layout?

- **Context**: §3.2.
- **Options**:
  - **A** — Renumber: rename `04-information-architecture.md → 05-information-architecture.md` (etc.) so the new SOP profile lines up. Requires editing every cross-reference inside the renamed files and external references in `CLAUDE.md`, `.claude/rules.md`, plans, etc.
  - **B** — Profile override: ship a project-specific `.ocoding/sop-overrides.yaml` (or similar) that maps the new SOP step IDs to OCN's existing doc paths.
  - **C** — Defer: keep OCN's docs frozen and label the divergence as a "known historical artifact" until a future major version reset.
- **Recommended default**: **B** — profile override. Renaming locked design docs is a high-blast-radius operation that affects every old PR/issue/comment link; an override is a single-file change confined to OCN's `.ocoding/` directory.
- **DEC entry required**: yes — `DEC-003`, captured before PR A begins.

### 6.2 Treat OCN's internal frozen `docs/00-08` as historical artifacts?

- **Context**: §3.2, §3.6. Even if §6.1 chooses Option B (override), the frozen-doc references to `docs/19-decision-log.md` (now `20-`) need a policy.
- **Options**:
  - **A** — Strict: every reference in `docs/00-08` must be updated when the canonical path changes. Requires "amendment-then-edit" cycles, which contradict the "frozen" label.
  - **B** — Pragmatic: amendment files carry the new canonical state; `docs/00-08` are historical artifacts that show *what was decided when*. Future readers consult `docs/amendments/README.md` for the live canonical paths.
- **Recommended default**: **B** — pragmatic. This is what AM-001 (audit storage path) already does in practice; the policy just makes it explicit.
- **DEC entry required**: yes — `DEC-004`, captured before PR A begins (it shapes PR A's amendments-index design).

### 6.3 npm package name

- **Context**: §3.7.
- **Options**:
  - **A** — `ocn` — short, matches CLI command. May be taken on npm.
  - **B** — `o-coding-navigator` — verbose but unambiguous.
  - **C** — `ocn-cli` — common pattern for CLI tools, leaves `ocn` available for a future library.
  - **D** — `@ocn/cli` (scoped) — requires an organisation account but isolates naming.
- **Recommended default**: **investigate first**. The actual decision depends on what's available on npm; the planning PR (PR E) will check availability and propose the chosen name. Maintainer signs off in `DEC-005`.
- **DEC entry required**: yes — `DEC-005`, captured during PR E planning.

### 6.4 Semver lane for the first publish

- **Context**: §3.7. Current `package.json` has `0.0.1-alpha.0`.
- **Options**:
  - **A** — Stay at `0.0.1-alpha.x` until mini-CRM dogfood; then `0.1.0-beta.x`; then `1.0.0`.
  - **B** — Jump to `0.1.0-alpha.0` for the first publish to signal "Phase 2 complete, public alpha." Then `0.2.0-beta.x` after dogfood.
  - **C** — Adopt `1.0.0-alpha.0` immediately — strong signal of "GA-quality core" but raises expectations.
- **Recommended default**: **B** — `0.1.0-alpha.0`. Phase 2 closure is a meaningful milestone but not GA; `0.x` signals pre-1.0 honesty.
- **DEC entry required**: yes — `DEC-006`, captured during PR E planning.

### 6.5 Publish alpha *before* mini-CRM dogfood?

- **Context**: §3.7 + Phase 2 Completion Report §6.
- **Options**:
  - **A** — Publish alpha now (after PR A–E land), gather external feedback, dogfood mini-CRM during alpha.
  - **B** — Dogfood mini-CRM first, then publish alpha after that learning is encoded.
- **Recommended default**: **A** — publish alpha first. Dogfood is a feedback signal, not a gate. The 312-test suite + CI green + completion report is a defensible alpha bar.
- **DEC entry required**: yes — `DEC-007`, captured during PR E planning. Note: this decision shapes whether PR F (examples) needs to be dogfood-driven or template-driven.

### 6.6 Mini-CRM dogfood required before public beta?

- **Context**: Phase 2 Completion Report §6.
- **Options**:
  - **A** — Yes — mini-CRM is the GA success criterion per `docs/08-mvp-plan.md` §39.2 and should also gate beta.
  - **B** — No — mini-CRM gates GA only; beta can ship after alpha + 2 external-host validations + 0 P1 issues for 2 weeks.
- **Recommended default**: **B** — mini-CRM gates GA, not beta. Loading dogfood onto beta inflates the beta bar and delays the alpha→beta promotion that the public expects to be fast.
- **DEC entry required**: yes — `DEC-008`, captured during PR E planning.

---

## 7. Completion Criteria

The Gap Review is **complete** when:

- [ ] No `src/` change has been made.
- [ ] No `npm publish` has been run.
- [ ] All 10 gaps in §3 are classified (each has *what / why / evidence / fix shape*).
- [ ] PR sequence in §5 is approved by the maintainer (binary signal — accepted or revised).
- [ ] All 6 decision gates in §6 are recognised — each one either has a DEC entry queued (e.g., "`DEC-003` will be drafted in PR A") or is explicitly deferred with a reason.
- [ ] The next implementation PR is chosen — most likely PR A (docs numbering reconciliation + amendments index), but the maintainer may choose otherwise.

The Gap Review does **not** require:

- ❌ Any of the 6 PRs in §5 to be drafted, written, or merged.
- ❌ Any DEC entry beyond DEC-002 to be written.
- ❌ Any external host smoke test to be run.
- ❌ Any npm name reservation.

---

## 8. Completion Output

Once this plan is merged, the following will be true on `main`:

| Output | Location | Status after this PR merges |
|---|---|---|
| Plan path | `docs/plans/2026-04-28-ga-prep-gap-review-plan.md` | ✅ on `main` |
| Gap matrix summary | this file §3 + §5 | ✅ on `main` |
| Recommended first GA Prep PR | this file §5 (PR A — docs numbering reconciliation + amendments index) | ✅ stated, not yet drafted |
| Decisions needed from maintainer | this file §6 (DEC-003 through DEC-008) | ✅ enumerated, not yet captured |

### Recommended first GA Prep PR

**PR A — `docs: numbering reconciliation + amendments index`**

- Branch: `docs/ga-prep-pr-a-amendments-index`
- Scope:
  1. Capture `DEC-003` (renumber vs override decision) and `DEC-004` (frozen-doc policy) in `docs/20-decision-log.md`.
  2. Write `docs/amendments/README.md` with naming convention + index.
  3. Write `AM-002` recording the `docs/19-decision-log.md → docs/20-decision-log.md` move and the policy from `DEC-004`.
  4. If `DEC-003` chooses Option B (profile override), write `AM-003` recording the override approach (the override implementation itself is *not* in PR A — it is a deferred follow-up because it touches `src/core/sop/loader.ts`).
- Out of scope for PR A: any `src/` change, any new SOP loading behaviour, any examples.

### Decisions needed from maintainer (queue)

| Decision | DEC ID | Captured during | Recommended default |
|---|---|---|---|
| Renumber `docs/04-08` vs profile override vs defer | DEC-003 | PR A | Profile override |
| Frozen `docs/00-08` policy (strict vs pragmatic) | DEC-004 | PR A | Pragmatic |
| npm package name | DEC-005 | PR E | Investigate first; recommend after availability check |
| Semver lane for first publish | DEC-006 | PR E | `0.1.0-alpha.0` |
| Publish alpha before mini-CRM dogfood | DEC-007 | PR E | Yes — publish first |
| Mini-CRM gates beta (vs GA only) | DEC-008 | PR E | GA only |

---

## 9. Hard Rules (re-statement)

This is a planning artifact. The following are not allowed in this PR:

- ❌ No `src/` edits.
- ❌ No new functionality.
- ❌ No implementation PR opened from this artifact.
- ❌ No `npm publish`.
- ❌ No mini-CRM dogfood started.
- ❌ No README rewrite.
- ❌ No CLI help copy edits.
- ❌ No MCP tool surface change.
- ❌ No tag, no release.

The PR for this plan must be:
- ✅ Branch: `docs/ga-prep-gap-review-plan`
- ✅ Single new file: `docs/plans/2026-04-28-ga-prep-gap-review-plan.md`
- ✅ Type: documentation only.

---

## 10. Open Questions (for the maintainer to answer when convenient — do not block this PR)

1. **External validation hosts** — which 2 of {Claude Desktop, Cursor, Cline} should PR D target first? (The plan above suggests "at least 2 of the 3"; the maintainer can pin specific ones.)
2. **CI provider** — confirm GitHub Actions is the long-term host. The CI stability audit (PR E) assumes this.
3. **Threat-model author** — PR C's threat-model doc is currently scoped to be authored by the maintainer (or delegated). Should it be an internal artifact or a published one?
4. **License + attribution** — Apache-2.0 is locked in `LICENSE`. PR B's README needs to verify LICENSE + headers are consistent. No license change is implied.
5. **Bilingual coverage** — the README + `--help` audit in PR B will surface places where bilingual coverage is patchy. Is bilingual coverage *required* for GA, or *nice-to-have*?
6. **`docs/amendments/` discovery** — should the future amendment index be auto-generated from frontmatter (requires tooling) or manually maintained (requires discipline)?

These open questions are **not** blockers for approving this Gap Review plan; they are inputs that shape PR B and PR C scope when those PRs are drafted.
