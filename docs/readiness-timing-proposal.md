# Proposal — Precise Per-Gate Readiness Activation（就绪门"准时激活"：不提前且不缺失）

> Status: **Draft — awaiting acceptance** (becomes DEC-040 / AM-014 on accept).
> Date: 2026-06-30 · Author: dogfood finding
> Scope: engine refinement + a readiness-rulebook revision in the **0.7.0** profile (the runtime default after DEC-039). Engine half is backward-compatible; an untagged rulebook (0.4.0/0.5.0) behaves identically. **Not** a SOP bump beyond the DEC-039 number unification (precedent: AM-008 Rewind, AM-009 Auto — engine/CLI features).
> Supersedes nothing; refines the Readiness Backbone (AM-004 / DEC-028). Vehicle retargeted from "in-place 0.5.0" to profile 0.7.0 after DEC-039 (npm/SOP lockstep).

---

## 1. Problem

A clean `ocn init` (minimal tier) cannot advance past the **first** step (`step_project_brief`). The readiness gate blocks with 8 checks demanding **downstream** artifacts that belong to later phases:

```
[cio_cto]   scope 量化停止条件         → SPEC
[ciso]      PRD 安全约束               → SPEC
[ba]        PRD 结构化需求             → SPEC
[it_pm]     mvp-plan 阶段 + 风险       → PLAN
[developer] git init + 构建命令通过     → BUILD
[devops]    .github/workflows CI       → BUILD
[qa]        每条 AC 的测试             → BUILD
[service_desk] README                  → BUILD
```

None of these belong to DISCOVERY. The first `ocn advance` effectively demands near-complete project readiness.

### 1.1 Why it surfaced "suddenly"

The Readiness Backbone shipped in **SOP 0.4.0** (DEC-028 / DEC-030, 2026-06-11; `readiness.ts` first landed in commit `286f945`). Versions 0.1.0–0.3.0 have **no** readiness module — the gate is a no-op there (`runReadinessGate` returns "not applicable" when `profile.readinessYaml === undefined`, `src/core/gate/readiness-gate.ts:57-62`). A fresh `ocn init` now pins **0.5.0** (DEC-032) → gate ON.

**Every e2e walkthrough pins `--sop-version 0.3.0` on purpose** (`tests/e2e/example-plan-to-verify.test.ts:144`, `skeleton-spike-demo.test.ts:38`, `auto-mode-phase1.test.ts:36`, `rewind-cycle-roundtrip.test.ts:25`). So the readiness gate has **never been walked from step 1 by any dogfood** — a blind spot, not a project-state corruption. The gate is doing exactly what its (state-blind) rules say.

### 1.2 Root cause (3 layers, evidence)

1. **State-blind enforcement.** `ReadinessRule` (`src/types/readiness.ts:73-92`) has no state/phase field; requirement is scoped only by `tier_required` + `severity` (`grep -c state_` over the rulebook = 0). The gate runs unconditionally on every advance (`src/core/gate/gate-runner.ts:135`, `src/core/check.ts:176`).
2. **All-from-start at minimal tier.** 8 `severity: block` rules include tier `solo` (`minimal → solo`, `TIER_MAP` `src/types/readiness.ts:22-26`), so they bind from the very first gate.
3. **Open-world: UNKNOWN blocks.** The blocking filter (`src/core/gate/readiness-gate.ts:119-121`) is `severity==='block' && (FAIL || UNKNOWN)`. At step 1 the downstream inputs don't exist → UNKNOWN/FAIL → block.

Net: the gate ignores the SOP's own progressive disclosure (scope/PRD in SPEC, mvp-plan in PLAN, code/CI/tests in BUILD).

## 2. Correctness target

> **每一关都要准确拦截 — 不提前且不缺失.** Every block rule must become enforcing at **exactly** the state where its inputs are due: never earlier (no false cliff), never later/skippable (no missed enforcement).

Formalized as a **per-gate precision invariant**. For each block rule define its **deadline state**:

```
due(rule) = max_state(  { owning_state(artifact) | artifact-backed dep }
                      ∪ { policy_state(probe)    | repo-probe dep }  )
```

- `owning_state(artifact)` — state of the step that produces that artifact, from the SOP step map (`profile.artifactPathForStep` inverted ∘ glob aliases).
- `policy_state(probe)` — explicit small table for repo-probes (no owning step; §4.2).
- `max_state` — latest in `profile.stateOrder` (`DISCOVERY < SPEC < DESIGN < PLAN < BUILD < VERIFY < SHIP < REFLECT`).

The invariant the design guarantees, for **every** block rule:

- **不提前** — while `currentState < due(rule)` → verdict **DEFERRED**, never blocks. (At least one input isn't due yet, so the rule's aggregate verdict isn't even meaningful.)
- **不缺失** — for **every** state `≥ due(rule)` the rule is enforced (blocks on FAIL/UNKNOWN) and stays enforced until satisfied. Enforcement is "from `due` **onward**", not a window: once an obligation comes due it blocks continuously, so **no advance into a later phase can slip past it** — the project cannot reach VERIFY/SHIP with any block rule unmet.
- **准确** — `enforced_from` is set to `due(rule)`, and **lint requires exact equality** to the derived value. A tag one state too early **or** too late is a lint error. The precision is machine-guaranteed, not trusted to hand-authoring — explicit tag, validated as a fitness function against the SOP dependency graph (the "more scientific than naive hand-tagging" property).

## 3. Design principle

Refine open-world into two distinct "not satisfied" states:

- **UNKNOWN** = obligation is *due now* but unresolved → **blocks** (unchanged).
- **DEFERRED** (new) = obligation *not due yet* → does not block; surfaced as forward-looking so it stays visible (nothing is silently skipped — it's shown as "due at <state>").

`enforced_from = due(rule)` is the single knob; the §2 invariant pins it precisely in both directions.

## 4. The change

### 4.1 Engine (backward-compatible — an **untagged** rulebook behaves identically to today)

1. **Schema** (`src/types/readiness.ts`): add optional `enforced_from?: string` to `ReadinessRule` (regex `^state_[a-z0-9_]+$`); add `DEFERRED` to the `ReadinessVerdict` enum (`PASS|FAIL|UNKNOWN|WAIVED|NA|DEFERRED`).
2. **Deadline resolver** (new `src/core/readiness/due-state.ts`): pure `dueState(rule, profile) → stateId | null` implementing §2. Split `requires` into artifact-slug vs `repo.*` deps (logic already exists at `evaluator.ts:217-219`, `rulebook-lint.ts:30-56`), map each to a state, take the max in `profile.stateOrder`. Reuses `profile.artifactPathForStep`, a path→state index, the glob aliases, and the §4.2 repo-probe policy.
3. **Evaluator** (`src/core/readiness/evaluator.ts`): thread `stateOrder` + the resolved per-rule `enforced_from` into `EvaluateReadinessOptions`. In `evaluateRule`, after the tier-NA short-circuit (`:214-216`): if `enforced_from` is set and `indexOf(currentState) < indexOf(enforced_from)` → return verdict **DEFERRED**, detail `"not due until <state>"`, skipping field evaluation. Order: NA (tier) → DEFERRED (not due) → evaluate. `applyWaiver` only touches FAIL/UNKNOWN, so DEFERRED bypasses waivers automatically.
4. **Gate** (`src/core/gate/readiness-gate.ts`): the blocking filter (`:119-121`) is **unchanged** — DEFERRED is neither FAIL nor UNKNOWN, so it never blocks. Pass `stateOrder` into `evaluateReadiness`.
5. **Surfacing**: `summarizeReadiness` (`src/core/brief.ts:240-258`) gains a `forthcoming` bucket (`"[role] due at <state>: <fixHint>"`) + a `counts` slot. Render a "Forthcoming｜将到期" sub-block in `src/cli/render/text.ts` `appendReadinessSummaryBlock` (`:57-77`) and in the `readiness list` block (`:114-135`) + counts template (`src/cli/commands/readiness.ts:62`). DEFERRED rows show `due at <state>` (not a fix-hint-as-error) and are not NA-suppressed.
6. **Lint — the precision guard** (`src/core/readiness/rulebook-lint.ts`): add findings
   - `enforced_from_invalid` — state not in the profile's order.
   - `enforced_from_imprecise` — `enforced_from !== dueState(rule, profile)` (catches **both** 提前 and 缺失). This is the machine guarantee of §2.
   - `enforced_from_ambiguous` — a required artifact slug whose glob resolves to >1 step/state (e.g. `artifact_acceptance` matches `03-acceptance-criteria` SPEC and `16-acceptance-mapping` VERIFY); must be disambiguated in `artifact_aliases` so `dueState` is deterministic.

   Lint runs at build/test time over the shipped rulebook → a misplaced gate fails CI, not production.

Verdict-enum consumer sites to update for DEFERRED: evaluator (sets it), brief filters/counts, text brief block, `readiness list` render + counts template. The gate filter and waiver guard need **no** change.

### 4.2 Rulebook — tag profile 0.7.0 (0.4.0/0.5.0 stay frozen)

**Break 0.7.0's readiness re-export** so `src/sops/default-ai-coding-sop/0.7.0/readiness.ts` ships its **own** rulebook (= 0.4.0 content + `enforced_from` on every block rule + alias disambiguation). `0.5.0/readiness.ts` and `0.4.0/readiness.ts` are **untouched / byte-frozen** → all 0.4.0/0.5.0-pinned tests and repos behave exactly as today. 0.7.0 is the runtime default (DEC-039), so fresh inits get the precise gates.

**Repo-probe due-state policy** (the only hand-authored mapping; explicit + tunable; lint derives `enforced_from` from it):

| repo fact | due state | rationale |
|---|---|---|
| `git_initialized`, `build_passes`, `test_dir`, `test_command_passes` | `state_build` | runnable only once code exists |
| `ci_config` | `state_build` | CI wired by BUILD (candidate: `state_verify`) |
| `readme` | `state_build` | (candidate: `state_ship`) |

**Resulting `enforced_from` for the 8 solo-tier block rules** (= `dueState`, lint-verified):

| rule | deps → states | enforced_from |
|---|---|---|
| `rdy_cio_cto` | brief(DISC), scope(SPEC) | `state_spec` |
| `rdy_ciso` | prd(SPEC) | `state_spec` |
| `rdy_ba` | prd(SPEC) | `state_spec` |
| `rdy_it_pm` | mvp_plan(PLAN) | `state_plan` |
| `rdy_qa_engineer` | acceptance(SPEC) + test(BUILD) | `state_build` |
| `rdy_developer` | git, build(BUILD) | `state_build` |
| `rdy_devops_engineer` | ci(BUILD) | `state_build` |
| `rdy_service_desk_analyst` | readme(BUILD) | `state_build` |

At the first advance (`currentState = DISCOVERY`) all 8 are DEFERRED → readiness passes → brief advances. Each re-arms at its `enforced_from` state and blocks if then unmet — progressive enforcement preserved and **relocated to the correct gate**.

**Completeness — all tiers, not just the 8.** The same derivation tags **every** block rule, including `[team]`/`[platform]` rules, so production/full tier is equally precise. Edge to resolve in implementation: rules whose deadline is `state_ship`/`state_reflect` (un-wired states, empty step lists) stay enforced from VERIFY's end onward — safe 不缺失: you cannot leave VERIFY with them unmet. Documented explicitly.

### 4.3 Backward compatibility

- An untagged rulebook (0.4.0) → no `enforced_from` → always-enforced = today. 0.4.0 frozen.
- The R4 freeze snapshot covers only tier + 3 probe commands (`src/core/readiness/freeze-store.ts`) → the new verdict/timing does **not** trigger spurious `readiness_config_changed`.
- MCP `run_gate` stays read-only (`executeCommands: false`); DEFERRED is independent of command execution.

## 5. Test plan — proves the invariant, not just step 1

- **Unit — deadline resolver** (`tests/unit/readiness-due-state.test.ts`): `dueState` returns the correct max for artifact-only, repo-only, mixed rules; ambiguous slug detected.
- **Unit — evaluator** (`tests/unit/readiness-engine.test.ts`): DEFERRED iff `currentState < enforced_from`; enforces (UNKNOWN/FAIL/PASS) at and after; tier-NA precedes DEFERRED.
- **Unit — lint** (`tests/unit/readiness-rulebook-lint.test.ts`): `enforced_from_imprecise` fires when a tag is one state too early **and** when one too late; `enforced_from_ambiguous` fires on `artifact_acceptance` unless disambiguated; shipped 0.5.0 lints clean.
- **Shipped rulebook** (`tests/unit/readiness-rulebook-shipped.test.ts`): drop the "0.7.0 === 0.4.0 re-export" invariant for readiness; assert 0.4.0/0.5.0 untagged (55 checks) and 0.7.0 every block rule tagged with `enforced_from === dueState`, lint-clean.
- **E2E — per-gate precision walkthrough** (new `tests/e2e/readiness-precision-walkthrough.test.ts`, fresh **default 0.5.0**, minimal tier — closes the dogfood blind spot). Asserts **both** halves at every boundary:
  - **不提前**: from `step_project_brief`, advancing DISCOVERY→SPEC succeeds with all 8 DEFERRED.
  - **不缺失**: at the SPEC exit with scope/prd readiness fields **missing**, `rdy_cio_cto/ciso/ba` **block** (cannot leave SPEC); fill them → pass; at PLAN exit `rdy_it_pm` blocks if mvp-plan lacks phases/risks; in BUILD `rdy_developer/devops/qa/service_desk` block until git/build/CI/tests/README exist. Confirm the project **cannot reach VERIFY** with any block rule unmet.
- Keep `tests/cli/readiness.test.ts` exit-1 ordering; add a DEFERRED-passes-at-step-1 case.
- Full gate: `npm run lint && npm run typecheck && npm run test` (+ rebuild `dist/` for spawn tests).

## 6. Versioning / governance

- No new SOP profile version: **engine refinement + in-place 0.5.0 rulebook revision**. Pure relaxation of timing — it only unblocks-early or relocates a gate to its correct state; the set of obligations and the open-world "due ⇒ UNKNOWN blocks" rule are unchanged.
- New artifacts on accept: this proposal, `docs/amendments/2026-06-30-readiness-timing-amendment.md` (**AM-014**), `docs/20-decision-log.md` **DEC-040**, CLAUDE.md "What shipped" +1 line. (DEC-039 = the npm/SOP version unification; DEC-037 reserved for AM-012; next free = AM-014 / DEC-040.)

## 7. Non-goals / open (tunable) questions

- Repo-probe due states and a few artifact deadlines are policy (e.g. CI `state_build` vs `state_verify`; README `state_build` vs `state_ship`) — the §4.2 tables are the proposal; lint enforces whatever is chosen.
- Not changing tier membership, the 55-check set, waiver mechanics, or "due ⇒ UNKNOWN blocks".
- `enforced_from` is explicit-but-lint-derived — neither free-floating hand-tagging nor fragile pure auto-derivation.

## 8. Critical files

- Schema/verdict: `src/types/readiness.ts`
- Activation + deadline: `src/core/readiness/evaluator.ts`, **new** `src/core/readiness/due-state.ts`, `src/core/gate/readiness-gate.ts`
- Lint (precision guard): `src/core/readiness/rulebook-lint.ts`
- Surfacing: `src/core/brief.ts`, `src/cli/render/text.ts`, `src/cli/commands/readiness.ts`
- Rulebook: **new own copy** `src/sops/default-ai-coding-sop/0.7.0/readiness.ts` (break its re-export); reference frozen `0.5.0/readiness.ts` → `0.4.0/readiness.ts`
- Reuse: `profile.stateOrder`, `profile.artifactPathForStep` (`src/core/sop/loader.ts:165-193`), `resolveArtifactPaths` (`src/core/readiness/artifact-resolver.ts:19`), the require-split (`src/core/readiness/rulebook-lint.ts:30-56`)
