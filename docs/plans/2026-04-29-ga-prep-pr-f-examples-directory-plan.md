# GA Prep PR F Plan｜examples/ directory plan

> Date: 2026-04-29
> Phase: GA Prep (post-Phase-2)
> Origin: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](2026-04-28-ga-prep-gap-review-plan.md) §3.8 + §5 (PR F).
> Companion DECs: [DEC-003](../20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion), [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available).
> Status: `proposed` — this is a planning artifact only. **PR F does not implement a full executable example.**

---

## 1. Purpose｜目的

`examples/` is a future top-level directory containing small, inspectable OCN example projects. Its job is to make OCN **concrete**:

> A user should be able to inspect an example project and understand how OCN moves from DISCOVERY to PLAN.

> 用户应能通过查看一个 example project，理解 OCN 如何从 DISCOVERY 推进到 PLAN。

Specifically, `examples/` is **not**:

- a replacement for [`README.md`](../../README.md) — the README answers *what / why / install*; the examples answer *what does it look like in practice*.
- a replacement for [`docs/quickstart.md`](../quickstart.md) — quickstart is a step-by-step recipe; examples are static, copy-able artifacts.
- a dogfood substitute — mini-CRM dogfood is a separate (and deferred) work item; `examples/` is generic and domain-neutral.
- a verified-host showcase — per [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available), nothing in `examples/` may claim Claude Desktop / Cursor / Cline compatibility until PR D completes.

---

## 2. Context｜背景

This plan is anchored on the following prior work, all of which is on `main`:

- **[`README.md`](../../README.md)** — Phase 2 Complete posture, first-5-minutes path. Today the README has *no* "Try the example" link because `examples/` does not exist.
- **[`docs/quickstart.md`](../quickstart.md)** — DISCOVERY → SPEC walkthrough using `/tmp/ocn-mcp-demo`. The example, when built, will offer a *static* version of this same journey for users who don't want to run commands.
- **[DEC-003](../20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion)** — frozen `docs/00-08` are not renumbered; new projects get the SOP v1.1 layout via the bundled default profile; the OCN repo runs against a deferred profile override.
- **[DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)** — External MCP Host Validation is deferred. Every artifact (including examples) must carry the "External MCP Host Validation pending" caveat where MCP-host compatibility might be implied.
- **[GA Prep Gap Review Plan §3.8 + §5 (PR F)](2026-04-28-ga-prep-gap-review-plan.md#38-examples-directory-plan)** — names this PR F and orders it after PR A → E.
- **[Phase 2 Completion Report §6 + §8 row 5](../reports/2026-04-28-phase2-completion-report.md)** — records the absence of `examples/` as a non-GA backlog item and a GA Prep gap.
- **[`docs/security/mcp-host-validation-checklist.md`](../security/mcp-host-validation-checklist.md)** — preserves the host-validation procedure; examples must not be confused with this.
- **[`implementation-notes.md`](../../implementation-notes.md)** — current implementation state. No examples yet.
- **[`package.json`](../../package.json)** — current `files` field is absent (per DEC-009 in PR E plan). Whether `examples/` ships in the npm tarball is gated by DEC-013 (see §12).

---

## 3. Example strategy｜示例策略

### 3.1 Single canonical example (this PR's choice)

The first (and for v0.1.0-alpha, the only) example is named:

```
examples/discovery-to-plan/
```

**Why this name and not `mini-ocn-project/`, `ocn-demo/`, or `mini-crm/`:**

| Candidate | Rejected because |
|---|---|
| `mini-ocn-project/` | Vague — doesn't communicate scope. |
| `ocn-demo/` | Implies the example is the demo for the *whole* product, which inflates expectations. |
| `mini-crm/` | Couples the example to a specific business domain. Mini-CRM is the *dogfood* track per `docs/08-mvp-plan.md` §39.2; it is not the same artifact as a generic example. Confusing the two would mean the example drifts every time the dogfood scope shifts. |
| **`discovery-to-plan/`** | (chosen) Names the SOP coverage, not the domain. Communicates exactly what a reader will see. Future examples can mirror the naming pattern (`build-to-verify/`, etc.). |

### 3.2 Future examples (out of scope for PR F)

This plan does not commit to additional examples. Possible future names:

- `examples/build-to-verify/` — a continuation showing BUILD → VERIFY (cannot exist until BUILD/VERIFY step IDs are wired).
- `examples/mini-crm/` — only if the dogfood track later decides to expose a redacted snapshot. Subject to its own DEC.

PR F intentionally produces only `discovery-to-plan/` plans; further examples are deferred behind their own DEC entries.

---

## 4. Proposed `examples/` structure｜建议目录结构

```
examples/
  README.md                           # placeholder + plan index (created in PR F)
  .gitkeep                            # ensures the directory tracks empty (created in PR F)
  discovery-to-plan/                  # PR F1+ — NOT created in PR F
    README.md                         # the example's own walkthrough
    docs/
      00-project-brief.md             # 4 required sections filled
      01-scope.md                     # 4 required sections filled
      02-prd.md                       # 5 required sections filled
      03-acceptance-criteria.md       # 3 required sections filled
      04-technical-architecture.md    # 5 required sections filled
      05-information-architecture.md  # placeholder (no required sections in current SOP)
      06-data-model.md                # placeholder
      07-api-contract.md              # placeholder
      08-test-strategy.md             # placeholder
      09-mvp-plan.md                  # placeholder
    .ocoding.example/                 # NOT `.ocoding/` — see §5
      state.json                      # frozen at state_plan / step_mvp_plan
      sop.yaml                        # snapshot of the bundled profile
      gates.yaml
      config.yaml
```

> **PR F creates only the top-level `examples/README.md` and `examples/.gitkeep`.** It does NOT create `examples/discovery-to-plan/` or any of its contents. Those land in PR F2 (skeleton) and PR F3 (executable example) per §9.

---

## 5. Why `.ocoding.example` instead of `.ocoding`｜为什么使用 `.ocoding.example`

If a future implementation PR ships an example with a real `.ocoding/` directory, it would mean:

1. `cd examples/discovery-to-plan && ocn status` would silently treat the example as the active OCN project.
2. CI smoke tests that walk into `examples/discovery-to-plan/` could accidentally mutate the example's `state.json`.
3. New contributors might run `ocn init` inside the example by mistake and corrupt the bundled state.

> Examples should not accidentally become an active OCN project unless the user explicitly copies or initialises them.
> 示例目录不应该被 OCN 误认为当前项目状态。

The remediation:

- Use the directory name `.ocoding.example/` (with the `.example` suffix) for any bundled OCN state files.
- The example's `README.md` instructs the user to either (a) copy `.ocoding.example` → `.ocoding` after copying the example into a fresh directory, or (b) run `ocn init` from scratch and copy individual `docs/*.md` over.
- OCN's CLI never touches `.ocoding.example/`; only `.ocoding/`. This is mechanical safety, not policy.

A future implementation PR (F3) will need to prove this by adding a test that asserts `ocn status` from inside `examples/discovery-to-plan/` reports "not an OCN project" rather than picking up the bundled state.

---

## 6. Example content policy｜示例内容策略

Every artifact in `examples/` must satisfy the following constraints. These are enforced by the implementation PR's review (and, ideally, by a CI check added in PR F3).

### Mandatory

- Docs must be **short** — each artifact one page or less (≤ 80 lines preferred). Examples are scannable, not exhaustive.
- Bilingual section headings (`Title｜标题`) preferred for any required-section heading.
- Every artifact, when copied into a real OCN project, must pass the corresponding Step Artifact Gate. *No example artifact is allowed to fail a gate it would otherwise be subject to.*
- Every example must include its own `README.md` explaining what it shows and how to use it.

### Forbidden

- ❌ No fake production claims (e.g. "used in production", "deployed to 10K users").
- ❌ No real secrets, API keys, OAuth tokens, JWTs, private keys, `.env` content.
- ❌ No private user data, real customer names, real email addresses, real internal URLs.
- ❌ No external MCP host compatibility claim. Per [DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available), examples may describe MCP usage as *intended* but must not say "verified in Claude Desktop / Cursor / Cline" until PR D lands.
- ❌ No npm publish claim. Per [DEC-005 + PR E plan](2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md), examples may not state that OCN is on npm until DEC-008 fires and the publish actually happens.
- ❌ No "validation done" statement that does not match an artifact in `docs/reports/`.
- ❌ No reports of validation that was not actually performed.

---

## 7. Relation to DEC-003｜与 DEC-003 的关系

[DEC-003](../20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion) decided to keep OCN's own frozen `docs/04-08` at the historical layout and to ship a project-level profile override (implementation deferred).

The implication for examples:

- **OCN's own `docs/00-08` are NOT renumbered.** Examples use the *current public SOP profile* — i.e. the SOP v1.1 layout (`04-technical-architecture.md` is slot 04, IA is slot 05, …, MVP plan is slot 09). This is exactly what `ocn init` produces today for a fresh project.
- **The OCN repository's profile override is deferred.** Until that override ships, any example fixture that runs against the OCN repo (e.g. as a CI fixture executed from inside this repo) would face the OLD/NEW layout mismatch.
- **The implementation PR for F3 must decide**: does the example use the public SOP v1.1 layout (recommended — matches what users get from `ocn init`), or does it adopt the OCN repo's deferred override (would couple the example to private repo state)?
- **Recommendation for F3**: the example uses the public SOP v1.1 layout. The example is the *user* perspective, not the OCN-on-OCN perspective. The override implementation, when it lands, only affects the OCN repo's own dogfood — it does not change what `ocn init` produces in a fresh project.

This also means: **PR F itself can plan against the SOP v1.1 layout without waiting for the override implementation.** Only F3 (executable example) would interact with profile-loading code, and only via `ocn init`'s public output — not via the override surface.

---

## 8. Relation to DEC-005｜与 DEC-005 的关系

[DEC-005](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) defers External MCP Host Validation.

The implication for examples:

> External MCP Host Validation pending.
> The example must NOT claim Claude Desktop / Cursor / Cline verified compatibility until PR D is completed.

Concrete rules carried into PR F1 (this PR) and every later implementation PR:

- The placeholder `examples/README.md` written in PR F (this PR) explicitly mentions the deferral.
- Any future `examples/discovery-to-plan/README.md` describing MCP usage must say "intended usage" or "configuration target" — never "verified".
- If an example covers the `ocn-mcp` startup, it may describe the configuration block (taken from `docs/mcp-usage.md` and `docs/quickstart.md` §5), but must include the verbatim caveat: `External MCP Host Validation pending.`
- After PR D completes and the validation report lands, a follow-up doc edit will revisit any caveat and remove it where it has become stale.

---

## 9. Implementation phases｜实现阶段

Phase plan (only F1 lands in this PR):

| Phase | Scope | Files created | Lands in |
|---|---|---|---|
| **F1 — plan only** *(this PR)* | Write this plan; create `examples/README.md` placeholder + `examples/.gitkeep`. **No example artifacts.** | `docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`, `examples/README.md`, `examples/.gitkeep` | PR F (this PR) |
| **F2 — example skeleton** | Create `examples/discovery-to-plan/README.md` + a placeholder list of `docs/00-09-*.md` filenames (not their contents). No `.ocoding.example/`. No content. | `examples/discovery-to-plan/README.md`, empty `examples/discovery-to-plan/docs/.gitkeep` | follow-up PR |
| **F3 — executable example** | Generate full bilingual content for the 10 docs. Generate `.ocoding.example/{state,sop,gates,config}.{json,yaml}` snapshot. Add a CI check that validates the example artifacts pass their corresponding required-section gates when copied into a fresh OCN project. Add a CI check that asserts `cd examples/discovery-to-plan && ocn status` reports "not initialised". | full content under `examples/discovery-to-plan/` | follow-up PR |
| **F4 — README integration** | Add a "Try the example" section to top-level `README.md` and a backlink to the example from `docs/quickstart.md` §6. | edit `README.md`, `docs/quickstart.md` | follow-up PR |

> Each follow-up phase requires its own scope DEC if the implementing PR introduces a new constraint (e.g. F3's CI check choice — see §11 RR-2).

---

## 10. Acceptance criteria｜验收标准

PR F (this PR) is complete when:

- [x] This planning artifact (`docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md`) lands on `main`.
- [x] `examples/README.md` exists as a short placeholder pointing at this plan and at the deferred status.
- [x] `examples/.gitkeep` ensures the directory survives even if `examples/README.md` is later moved.
- [ ] No `examples/discovery-to-plan/` directory exists (deferred to F2).
- [ ] No `.ocoding/` or `.ocoding.example/` directory exists anywhere under `examples/` (deferred to F3).
- [ ] No claim that Claude Desktop / Cursor / Cline are verified.
- [ ] No `package.json` change (the `files` allowlist for `examples/` is decided by DEC-013 in PR E follow-up, not here).
- [ ] No `src/` change.
- [x] Local `lint + typecheck + test` pass.

The first three boxes are positive deliverables. The next four are negative constraints — they describe what PR F does *not* do.

---

## 11. Risks｜风险

| ID | Risk | Mitigation |
|----|------|------------|
| RR-F-1 | **Examples become stale** as OCN's templates and SOP profile evolve. | F3 must add a CI check that copies each example artifact into a fresh OCN project and runs the corresponding gate. Stale examples fail CI. |
| RR-F-2 | **Examples conflict with the deferred profile override** (DEC-003). | §7 of this plan locks the example to the *public* SOP v1.1 layout. The override does not affect `ocn init`'s public output, so examples are decoupled. |
| RR-F-3 | **Examples are mistaken for dogfood** (mini-CRM). | The directory name `discovery-to-plan/` is intentionally domain-neutral. The example's README will state explicitly that it is not a production deployment and not the dogfood track. |
| RR-F-4 | **Examples accidentally claim unverified MCP host compatibility.** | §6 + §8 of this plan forbid such claims. F3 reviewers must reject any example text that names a host as "verified" until PR D is on `main`. |
| RR-F-5 | **Example docs drift from the current bundled templates** in `src/core/templates/*.ts`. | F3 must derive each example's section structure from the bundled templates (not from a separate hand-written copy). The CI check from RR-F-1 closes the loop. |
| RR-F-6 | **A user runs `ocn init` inside `examples/discovery-to-plan/` by mistake** and corrupts the bundled state. | §5 mandates `.ocoding.example/`. F3 adds a CI check asserting `ocn status` reports "not initialised" from inside the example directory. |
| RR-F-7 | **Examples ship in the npm tarball before content is verified** (i.e. F1's placeholder gets included in v0.1.0-alpha). | The `files` allowlist decision (DEC-013, in PR E follow-up) controls this. The placeholder created in PR F is small and explicitly says it's a placeholder; if it ships, no harm. F3's content is what really needs the gating. |

---

## 12. Follow-up decisions｜后续决策

These are the binding decisions queued for follow-up DEC entries. None are captured by PR F itself — each will land via a focused DEC-only commit or an implementation PR.

| DEC | Question | When captured |
|---|---|---|
| **DEC-011** | Should examples be **executable** (i.e. running `ocn` commands inside them works) before alpha publish? | Before F3 begins. |
| **DEC-012** | Should `examples/` be included in the npm package tarball (alongside `dist/`, `LICENSE`, `README.md`, `docs/quickstart.md`, `docs/mcp-usage.md`)? | At the same time DEC-009 (PR E `files` allowlist) is decided. |
| **DEC-013** | Should `examples/discovery-to-plan/` use `.ocoding.example/` (recommended in §5) or no state at all (purely docs-only)? | Before F3 begins. |
| **DEC-014** | Should examples be wired as CI fixtures (i.e. CI walks the example through every gate)? | Before F3 begins. |
| **DEC-015** | Should mini-CRM dogfood, when it eventually happens, become `examples/mini-crm/` — or stay in a separate `dogfood/` directory? | After mini-CRM dogfood is scoped (currently deferred). |

---

## 13. Hard rules

- ❌ No full executable example in this PR.
- ❌ No `examples/discovery-to-plan/` directory in this PR.
- ❌ No `.ocoding/` or `.ocoding.example/` anywhere in this PR.
- ❌ No batch generation of 10+ example artifacts.
- ❌ No runtime behaviour change.
- ❌ No `package.json` change.
- ❌ No `npm publish`.
- ❌ No profile-override implementation.
- ❌ No frozen `docs/00-08` renumber.
- ❌ No claim that Claude Desktop / Cursor / Cline are verified.
- ❌ No PR D validation report generated.
- ❌ No mini-CRM dogfood.
- ❌ No new MCP tools.

---

## 14. References

- [DEC-003 — Documentation numbering policy](../20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion)
- [DEC-005 — PR D deferral](../20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available)
- [GA Prep Gap Review Plan §3.8 + §5](2026-04-28-ga-prep-gap-review-plan.md)
- [PR E plan §4.4 (DEC-009 `files` allowlist)](2026-04-29-ga-prep-pr-e-npm-publish-ci-stability-plan.md)
- [Phase 2 Completion Report §6 + §8 row 5](../reports/2026-04-28-phase2-completion-report.md)
- [`README.md`](../../README.md) — first-5-minutes target audience
- [`docs/quickstart.md`](../quickstart.md) — sibling user-journey artifact
- [`docs/mcp-usage.md`](../mcp-usage.md) — MCP reference; examples must align with §5a safety boundaries
- [`docs/security/mcp-host-validation-checklist.md`](../security/mcp-host-validation-checklist.md) — preserved checklist; examples are NOT a substitute
- [`docs/amendments/README.md`](../amendments/README.md) — amendment-vs-edit policy that future example doc-edits must respect
- [`src/core/templates/*.ts`](../../src/core/templates/) — bundled templates the examples must mirror
- [`package.json`](../../package.json) — current state; `files` field absent (gated by DEC-009 + DEC-012)
