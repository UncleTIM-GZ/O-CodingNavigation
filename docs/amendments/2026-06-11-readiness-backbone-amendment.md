# Amendment AM-004 — Readiness Backbone (role-based cross-cutting readiness gate)

**Status**: Proposed (design only — engine not yet implemented; ships behind new SOP 0.4.0 when built)

## Date

2026-06-11

## Supersedes

None (new cross-cutting gate + new SOP minor version; additive).

## Applies to

> All paths below are **to-be-created** unless noted. This amendment is the build blueprint.

- `sops/default-ai-coding-sop/0.4.0/*` (new profile = 0.3.0 + `readiness` cross-cutting gate + bundled rulebook `readiness-backbone.yaml`)
- `sops/default-ai-coding-sop/0.4.0/readiness-backbone.yaml` (the rulebook; current draft lives at `docs/readiness-backbone.yaml` v0.3.0)
- `src/types/readiness.ts` (new zod: `ReadinessRule` / `ReadinessCheck` / `Verdict` / `Tier` / `Severity` enums)
- `src/core/readiness/rulebook-loader.ts` (load + parse the YAML rulebook from the active profile)
- `src/core/readiness/artifact-resolver.ts` (resolve `artifact_aliases` globs → actual project doc; §calibration①)
- `src/core/readiness/repo-prober.ts` (resolve `repo_probes`: path globs + command runs; §calibration②)
- `src/core/readiness/predicate-eval.ts` (predicate vocabulary: `not_empty` `exists` `true` `numeric_with_unit` `count_gte:N` `enum_in` `xref` + derived `each_acceptance_scenario_has_test_ref` etc.)
- `src/core/readiness/tier.ts` (filter checks by project tier)
- `src/core/readiness/readiness-evaluator.ts` (orchestration → per-check verdicts)
- `src/core/readiness/readiness-store.ts` (`.ocoding/readiness.json` projection; machine source of truth per §4.10)
- `src/core/readiness/waiver-store.ts` (`.ocoding/readiness-waivers.yaml`)
- `src/core/gate/readiness-gate.ts` (gate wrapper; aggregate pass/fail)
- `src/core/gate/gate-runner.ts` (chain `readiness` gate after section + logic gates in `check`, and inside `advance`) — existing file, modified
- `src/cli/commands/check.ts`, `src/cli/commands/advance.ts` (wire the gate) — existing files, modified
- `src/cli/commands/readiness.ts` (new `ocn readiness [list|waive]`)
- `src/core/config.ts` + `.ocoding/config.yaml` (new `tier` field; default `solo`)
- `src/core/brief.ts`, `src/cli/render/text.ts` (surface open readiness items + `fix_hint` as next-step todos)
- `src/mcp/tools/run-gate.ts` (readiness is read-only-evaluable via `navigator.run_gate`)

## Context

OCN already blocks two classes of false-completion: **missing sections** (the section
gate) and **logically un-wired** designs (AM-003 logic backbone). Dogfooding on the
Lattice project exposed a third class — **role-blind completion**: dozens of design docs
pass every gate, yet a product/dev/test/ops director review still surfaces basic gaps (no
git/CI, no adopter, no cost, no operability owner, 1052 LOC behind 2 smoke tests). The
gaps are invisible because OCN's verification surface is **intra-artifact** (document vs.
SOP schema) and **closed-world** (silence reads as pass). What is missing is verification
that the design is *ready against the set of stakeholders who must accept it*.

"Which dimensions are missing" is open and unenumerable; "which roles must have signed
off" is bounded, stable, and externally catalogued. The established fix is to convert the
unverifiable predicate (is content complete?) into a verifiable one (has every required
acceptor PASSED or explicitly WAIVED?) — the readiness-review / definition-of-done /
RACI-accountability lineage (Cooper Stage-Gate; NASA NPR 7123.1 entry/exit criteria;
Google SRE PRR; ATAM quality-attribute scenarios; RACI unique-Accountable; Reiter 1978
open-world default; Gawande checklists). See `docs/readiness-backbone-proposal.md` §9 for
the cited evidence base.

## Decision

Add a **cross-cutting `readiness` gate** (not a new state-machine step — it validates the
*other* artifacts rather than producing one). It is driven by a rulebook YAML
(`readiness-backbone.yaml`) bundled in the SOP profile, sourced from oprocess's 54 curated
roles across 4 layers. Each rule carries:

- `role` (exactly one — RACI unique-Accountable), `layer`, `concern`
- `tier_required` (derived from oprocess `min_team_size`: small→[solo,team,platform], medium→[team,platform], large→[platform])
- `requires` (logical `artifact_<slug>.<field>` resolved via `artifact_aliases`, or `repo.<fact>` resolved via `repo_probes` — **number-agnostic**)
- `check` (falsifiable predicates — "discussed" can never pass)
- `severity` (`block` | `warn`), optional `waivable: false`
- `scenario` (Given-When-Then, for the evaluator) + `fix_hint{zh,en}` (for the human / the AI's next step)

**Evaluation (`ocn check`, after section + logic gates):**

1. Read project `tier` from `.ocoding/config.yaml` (default `solo`); drop rules whose `tier_required` excludes it (→ `N/A`).
2. For each remaining rule: resolve `requires`. If any input is absent → `UNKNOWN(missing=…)`. Else evaluate `check` → `PASS` / `FAIL`.
3. Apply waivers from `.ocoding/readiness-waivers.yaml` → `WAIVED` (rejected if rule is `waivable:false`).
4. Persist all verdicts to `.ocoding/readiness.json`.

**Gate verdict & blocking (open-world, per Reiter 1978):**

- A `block`-severity, tier-required rule **passes the gate only if `PASS` or `WAIVED`**. `FAIL` **and** `UNKNOWN` both block — silence is never pass.
- `warn`-severity rules never block; they surface in `brief` only (this is where `process_proportionality` lives — the symmetric over-preparation signal).
- On block, the gate returns **`ERR_GATE_FAILED` (exit 1)** and prints each blocking rule's `fix_hint` (by locale) with its `concern` and resolved doc/probe.
- `ocn advance` runs this gate before transition (no bypass; only documented `override` with reason → audit, per §5).

**`ocn brief`** lists open readiness items (`FAIL`/`UNKNOWN`) with their `fix_hint`, so BUILD-phase prompts always carry the unmet-readiness worklist.

**Five sub-decisions:**

1. **Cross-cutting gate, not a step.** Readiness has no single authored artifact; it reads across all docs + the repo. It is registered as a gate in `gates.yaml` and a cross-cutting obligation `obligation_readiness` (activates at `ocn init`, always-on, enforced at every `advance`). The 20-step state machine is unchanged.
2. **Rulebook ships in the SOP profile** (like `gates.yaml`/`artifacts.yaml`), versioned with the SOP. The LLM authors/expands the rulebook offline; the runtime engine only *enforces* it — preserving the no-LLM-judge / local-first invariants (§3). Every predicate is deterministic.
3. **`ERR_GATE_FAILED` (exit 1), not `ERR_ARTIFACT_INVALID` (exit 2).** Readiness is a cross-artifact *gate*, not a single invalid artifact. (The `fail_code` field inside the rulebook is informational for the audit record; the process exit is the gate code.)
4. **New SOP version 0.4.0, runtime default.** Adding a cross-cutting gate is an additive minor bump (§4.2): 0.3.0 stays frozen and importable via `loadSopProfileByVersion("0.3.0")`; `loadSopProfile()` returns 0.4.0.
5. **Waivers are human-only.** `ocn readiness waive <check_id> --reason "…"` writes `{check_id, reason, who, ts}` as a push/audit event; `waivable:false` rules reject it. Like formal decisions (§4.8), waiver application is **not** exposed over MCP. `navigator.run_gate` may *evaluate* readiness (read-only); it cannot waive.

## Impact

- Every fresh project gains a mandatory, machine-checked, role-based readiness gate before each advance — catching role-blind completion the way AM-003 catches logic drift.
- One new gate, one new cross-cutting obligation, one new `.ocoding/` file (`readiness.json`) + one waiver file; one new `tier` config field; one new CLI command (`ocn readiness`).
- No new state-machine step; the 20 wired steps are unchanged.
- No breaking change to 0.1.0–0.3.0 (frozen, importable by explicit version).
- `navigator.run_gate` gains readiness evaluation (read-only); waiver/override remain human-only per §4.8.

## Resolved design decisions (2026-06-11 tri-agent review: architecture + red-team + industry research)

The field-extraction question and the gaming threat model were adjudicated by three
independent reviews (architecture review against the actual codebase; red-team attack
under the threat model "the AI that fills the docs is the AI that wants to pass the
gate"; industry-practice research with verified sources). Convergent verdict: the
embedded-structured-block direction (option B) is industry-converged (frontmatter, dbt
schema.yml, Sphinx-Needs, OpenFastTrace, doctest all converge on "human prose + delimited
machine block + deterministic tool"), **but blocks must be unable to express
conclusions**. Four resulting laws (rulebook header, R1–R4):

- **R1 — Pointers, not conclusions.** The per-doc `ocn-readiness` fenced block (same
  parser pipeline as `ocn-logic-graph`: tag-scoped fence → yaml.load → zod strict) may
  only carry pointers/parameters (commands, AC IDs, thresholds, file paths). Self-assessed
  conclusion fields (`passed/tested/verified: true`) are schema-illegal. Green can only be
  computed by the engine. (Precedent: dbt declares assertion *parameters*, never results.)
- **R2 — If the engine can run it, self-report is void.** AC→test trace is resolved
  against the engine-collected test node names (`pytest --collect-only` / vitest list);
  comment references don't count (a one-line `# AC-F01 AC-F02…` comment defeats grep).
  Coverage is the engine's own run, never a declared number.
- **R3 — Un-anchorable numerics demote to `warn`.** Declarations with no objective truth
  reachable from a local-first engine (monthly cost, SLA, RTO/RPO, capacity without a
  bench probe, acceptance signoff in a solo+AI context, "backup tested" booleans) must not
  be `block`+`numeric_with_unit`: that combination forces the AI to replace an honest TBD
  with a fabricated confident number — the gate would manufacture the false completion it
  exists to prevent. Demoted in rulebook v0.4.0 (48 block / 7 warn).
- **R4 — The referee is outside the player's write path.** Build/test probe commands and
  `tier` are hash-frozen into `.ocoding/` at `ocn init`; changing them is an audited push
  event (closes "configure build cmd as `echo ok`" and the tier-flip mass-waiver). The
  rulebook ships in the SOP profile (AI-immutable). Verdicts bind to the content hash of
  the verified object and expire on change (precedent: GitHub dismiss-stale-approvals;
  OpenFastTrace revision anchoring).

**Additional resolved items:**

- **`ocn sop lint` is a build prerequisite, not a nice-to-have.** A meta-validator over the
  rulebook itself: every `check` field ⊆ `requires`-declared fields; alias globs resolvable;
  predicate names legal; `waivable:false` mutually exclusive with WAIVED-mentioning
  fix_hints. Dry-running this lint on rulebook v0.3.0 found **19 real drift bugs**
  (5 by red-team reading + 14 by mechanical check) — all fixed in v0.4.0. An unlinted
  rulebook drifts within one version.
- **Waivers are conditional, not free-text** (waive-with-probe): a waiver must carry a
  machine-checkable precondition probe (e.g. waiving `rdy_network_engineer` attaches
  "no socket/http imports in src"), re-verified at every `advance`; if the precondition
  fails the waiver auto-voids back to UNKNOWN. Waivers expire per-state (re-affirm on
  advance) and the WAIVED/(PASS+WAIVED) ratio is always surfaced in `brief`.
- **`tier` provenance**: default `solo`, set via `ocn config set tier <…>`, hash-frozen +
  audited per R4.
- **`ci_runs_tests` v1 semantics**: parse the workflow for a test-execution step;
  "actually ran and passed in CI" is beyond local-first reach and is not claimed.

## Remaining open points

- **Proportionality ceilings** (`process_events_vs_tier_ceiling`): concrete per-tier
  thresholds (doc count / advance-event count) still need values.
- **`fix_hint` runtime interpolation** ("3 of 5 scenarios untested") — evaluator threads
  per-check detail into the message; static text until then.
- **Assertion-density lint** (optional hardening against assertion-free tests): AST-level
  check, deferred.
- **Block migration for existing projects** (`ocn readiness init-blocks`, TODO): the
  P2 `ocn-readiness` stubs ship only in the 0.4.0 doc *templates*; projects authored
  before 0.4.0 (or under 0.1.0–0.3.0) have no stub to fill, so adopting readiness needs
  a command that APPENDS an `ocn-readiness` block to each carrier doc that lacks one.
  Surfaced by the Lattice validation run (see `docs/reports/2026-06-11-readiness-lattice-validation.md`).

## Validation evidence (pre-implementation)

Manually backfilled against the Lattice project (`/home/timou/repos/Lattice`, tier=solo)
with rulebook v0.2.0 → v0.3.0. Results: correctly flagged a real gap (no README feedback
entry → `service_desk_analyst` FAIL), correctly fired `process_proportionality` (solo,
38 docs / 22 design-review docs / 1052 LOC behind 2 tests), and the v0.2.0 calibration
(slug aliases + probe vocabulary + solo AC-trace gate) turned the under-tested code from a
HOLLOW_PASS into a true `qa_engineer` FAIL. Filled result:
`/home/timou/repos/Lattice/docs/readiness-backbone-filled.yaml`.

## References

- DEC-028 (this amendment's decision-log entry).
- Proposal + cited best-practice evidence: `docs/readiness-backbone-proposal.md` (§9).
- Rulebook draft: `docs/readiness-backbone.yaml` (v0.4.0, 55 checks — 48 block / 7 warn, 54 oprocess roles, R1–R4 laws).
- Pattern precedent: AM-003 `docs/amendments/2026-06-03-logic-backbone-amendment.md` (structurally isomorphic).
