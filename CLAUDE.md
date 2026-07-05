# O'CodingNavigator (OCN) — Claude Code Working Contract

> Generated: 2026-04-28 · Updated: 2026-07-05
> SOP Profile: `default-ai-coding-sop@0.8.0` (runtime default since AM-015/DEC-041 — **Acceptance Backbone**; npm/SOP version lockstep; 0.1.0 / 0.2.0 / 0.3.0 / 0.4.0 / 0.5.0 / 0.7.0 frozen + importable, 0.6.0 skipped)
> Current State: shipped — Planning Gatekeeper + Execution Navigator + Logic Backbone + Readiness Backbone + **Task Backbone** + **Acceptance Backbone** (incl. `ocn sop upgrade`) + **Rewind & Cycle** (DEC-033/AM-008) + **Auto Mode** (DEC-034/AM-009) + **`ocn stop`** (terminate + uninstall wiring, DEC-042/AM-016).
> Published: `o-coding-navigation@0.8.0-beta.1` (pre-GA beta; npm latest + beta).
> Skeleton Spike (Phase 0) is **complete**; the sections below that describe it are kept as historical context.

---

## 1. Project Identity｜项目身份

- **Product Name**: O'CodingNavigator (`OCN`)
- **CLI**: `ocn`
- **Definition**: Open-source, local-first, MCP-first, state-machine driven AI Coding workflow operating system.
- **Core Promise**: Turn AI Coding from continuous-chat improvisation into a navigable, verifiable, rollback-safe, auditable, reviewable systems-engineering process.
- **License**: Apache-2.0
- **Primary Users**: Solo Builders, small teams, AI Coding coaches.

### What OCN IS NOT
Not a code generator. Not an IDE. Not a SaaS. Not a project management tool. Not a notes app. Not a scaffold-only doc factory.

### What OCN SELLS
**纪律 (discipline)** — productized as state machine, Spec artifacts, Gates, Brief, Log, Audit, MCP tools, SOP versioning.

---

## 2. Authoritative Design Documents｜权威设计文档

All design decisions live in `docs/`. **Read them before answering design questions. Do not invent.**

| Doc | Phase | Purpose |
|---|---|---|
| `docs/00-project-brief.md` | DISCOVERY | Problem definition, three failure modes, state machine, SOP step map (Appendix A) |
| `docs/01-scope.md` | DISCOVERY | v1.0 scope, alpha/beta/GA stop conditions, must-not-do list |
| `docs/02-prd.md` | SPEC | Product requirements |
| `docs/03-acceptance-criteria.md` | SPEC | Given/When/Then ACs |
| `docs/04-information-architecture.md` | DESIGN | IA, object map, dynamic flows |
| `docs/05-data-model.md` | DESIGN | Schema v1.0, stable IDs, enums, mutation matrix |
| `docs/06-api-contract.md` | DESIGN | CLI / Core / MCP contracts, exit codes, lock contracts |
| `docs/07-test-strategy.md` | DESIGN | 8-layer test stack, Skeleton Spike validation |
| `docs/08-mvp-plan.md` | PLAN | Phase 0 Skeleton Spike, Phase 1+ rollout |
| `docs/07-logic-backbone.md` | DESIGN | **Logic Backbone** — machine-verifiable computation/decision graph (SOP 0.3.0, AM-003); also OCN's own dogfood backbone |
| `docs/20-decision-log.md` | — | Decision log (DEC-001 … DEC-025) |
| `docs/amendments/` | — | Amendments (AM-001 … AM-003) — canonical record of divergences from the frozen `docs/0X` contracts |
| `docs/AI Coding SOP v1.md` | — | Source SOP profile (rendered into `src/sops/default-ai-coding-sop/{0.1.0,0.2.0,0.3.0,0.4.0}/`; 0.4.0 is the runtime default) |

> **Rule**: When answering "what should X do?" — quote the doc + section. If the doc disagrees with what you remember, **the doc wins**. The `docs/0X` design contracts are **frozen**; divergences live in `docs/amendments/` (an amendment is canonical for its divergence — do not rewrite the frozen doc).

---

## 3. Tech Stack｜技术栈（已锁定，不要换）

```
language       : TypeScript (Node.js)
cli            : commander
schema         : zod
config         : yaml (js-yaml)
test           : vitest
distribution   : npm package (`ocn`)
mcp            : Minimal MCP Server (7 tools, MCP SDK)
storage        : Markdown + JSON + JSONL + YAML + local filesystem ONLY
```

**Forbidden in v1.0**: SQLite, databases, web GUI, TUI (ink), vector stores, LLM judge enforcement, cloud services, embeddings.

---

## 4. 🚨 OCN-Specific Hard Rules｜OCN 专用硬约束（违反即停）

These are **non-negotiable** because they encode product invariants. Breaking them invalidates the design.

### 4.1 Stable String IDs Only｜状态/步骤指针使用稳定字符串 ID

```ts
// ✅ correct
{ currentStateId: "state_spec", currentStepId: "step_prd" }

// ❌ FORBIDDEN — numeric pointers as source of truth
{ currentStep: 3 }                  // breaks SOP versioning
{ currentStateIndex: 2 }            // breaks SOP versioning
```

`order` field exists **only for sorting and display**, never as a primary key.

### 4.2 ID Naming Convention

| Object | Prefix | Example |
|---|---|---|
| State | `state_` | `state_spec` |
| Step | `step_` | `step_prd` |
| Artifact | `artifact_` | `artifact_prd` |
| Gate | `gate_` | `gate_step_prd` |
| Section | `section_` | `section_scenarios` |
| Obligation | `obligation_` | `obligation_audit_trail` |

Renaming a stable ID = **breaking change** = SOP minor or major version bump.

### 4.3 Time Format

All internal times are **ISO 8601 UTC ending with `Z`**. Display layer may convert.

```ts
new Date().toISOString()    // "2026-04-28T03:14:15.000Z" ✅
```

### 4.4 BilingualMessage for Human-Readable Output

```ts
type BilingualMessage = { en: string; zh: string };
// machine keys: English snake_case stable
// human messages: { en, zh } both required
```

### 4.5 State File Safety｜state.json 安全写入

Every write to `.ocoding/state.json` (and similar critical files) MUST:

1. Acquire `.ocoding/.lock` (5s timeout)
2. Read backup to `.ocoding/state.json.bak`
3. Write to a temp file
4. `fs.rename` for atomic replace
5. On failure, leave the previous good state intact

### 4.6 Exit Codes (Stable, Machine-Readable)

| Code | Meaning | Error Code |
|---|---|---|
| 0 | OK / pass | `OK` |
| 1 | gate failed | `ERR_GATE_FAILED` |
| 2 | artifact missing or invalid | `ERR_ARTIFACT_INVALID` |
| 3 | state machine error | `ERR_STATE_MACHINE` |
| 4 | config / lock / IO error | `ERR_IO_OR_CONFIG` |
| 5 | SOP version incompatibility | `ERR_SOP_VERSION` |

MCP tool errors reuse the same codes.

### 4.7 Push vs Pull Audit Events

| Event | Mode | Auto-write audit |
|---|---|---|
| `ocn advance` | push | yes |
| `ocn gate` | push | yes |
| `ocn baseline create` | push | yes |
| `ocn sop version` (diff) | push | yes |
| `ocn log` | pull | yes (capture-time) |
| `ocn status` | pull | **no** (avoid log spam) |
| `ocn brief` | pull | optional |

### 4.8 MCP Tool Whitelist (v1.0)

Exposed:
```
navigator.where_am_i
navigator.brief
navigator.run_gate
navigator.create_artifact
navigator.capture_log
navigator.detect_sop_version
navigator.generate_next_prompt
```

**FORBIDDEN to expose in v1.0**: `navigator.advance_phase` (state advancement is human-**authorized** via CLI — see AM-009 Auto Mode below; never over MCP), reset, rewind, cycle new (cursor movement and round lifecycle — DEC-033; the milestone-loop rewind is ai-delegable via CLI under phase-2 auto mode only, AM-009), `ocn stop` (terminate OCN + uninstall the Claude Code wiring — one-way, human-only, CLI-only; AM-016/DEC-042), sop upgrade apply, capture decision (formal decisions are human-only). **AM-009/AM-016 add NOTHING to the MCP surface — the whitelist stays at exactly these 7 tools (test-pinned).**

### 4.9 Artifact Existence ≠ Step Complete

```
Artifact exists                                        ⇒ NOT enough
Artifact exists + required_sections pass + blocking_criteria pass = step may complete
```

`ocn check` must distinguish empty file / missing required sections / blocking criteria failure / quality warnings.

### 4.10 Markdown vs Structured Data

- `docs/*.md` = formal workflow evidence + human narrative.
- `.ocoding/*.json|jsonl|yaml` = machine source of truth for runtime queries.
- Runtime structured queries prefer `.ocoding/`, not parsing Markdown.

---

## 5. State Machine｜OCN 自身项目状态机

```
DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT
```

| State ID | Stage Artifacts |
|---|---|
| `state_discovery` | 00-project-brief, 01-scope |
| `state_spec` | 02-prd, 03-acceptance-criteria |
| `state_design` | 04-IA, 05-data-model, 06-api-contract, 07-test-strategy |
| `state_plan` | 08-mvp-plan, 09-real-data-wiring, 10-config-and-env, 11-reproducibility, 12-rollback-plan |
| `state_build` | PR summary, 18-dev-log |
| `state_verify` | 13-validation-report, 14-debug-report, 15-baseline, 16-release-notes |
| `state_ship` | 20-observability, 21-audit-trail, 24-uncertainty-policy, release notes |
| `state_reflect` | 22-evolution-report, 23-ai-governance |

### State Transitions Are Gated

`ocn advance` ALWAYS runs `ocn gate` first. There is no bypass — only documented `override` with reason written to audit.

### Cross-Cutting Obligations (always-on after activation)

| Obligation | Activates At |
|---|---|
| `obligation_audit_trail` | first push event after `ocn init` |
| `obligation_decision_log` | manual capture |
| `obligation_sop_version_detection` | after `ocn init` |
| `obligation_ai_governance_brief` | first `ocn brief` |
| `obligation_dev_log` | enter `state_build` |
| `obligation_rollback_awareness` | enter `state_plan` |
| `obligation_baseline_tracking` | first baseline created |
| `obligation_research_log` | enter `state_build` or manual |
| `obligation_uncertainty_policy` | artifact exists or enter SHIP |

---

## 6. Current Project Position｜本项目当前位置

```
SOP Profile  : default-ai-coding-sop@0.8.0 (runtime default — AM-015/DEC-041, Acceptance Backbone; npm/SOP lockstep)
Published    : o-coding-navigation@0.8.0-beta.1 (npm latest + beta; alpha preserved at 0.1.0-alpha.2)
Surface      : Planning Gatekeeper (00–19) + Execution Navigator + readiness (list/waive) + task (list/check) + sop upgrade + rewind/cycle + stop + MCP (7 tools)
State machine: 20 wired steps across DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY (SHIP/REFLECT stubs)
Status       : pre-GA beta, dogfooded; Skeleton Spike + 0.2.0/0.3.0/0.4.0/0.5.0/0.7.0/0.8.0 cutovers + logic, readiness, task & acceptance backbones shipped
```

### What shipped (high level)

- **Skeleton Spike (Phase 0) — done.** `init / status / brief / doc create / check` + the core engine (SOP loader, state store with lock+backup+atomic rename, markdown parser, required-section matcher, gate-status calculator, bilingual CommandResult renderer).
- **SOP 0.2.0 — done.** `runGate`, `advanceState`, audit trail, full 19-step Plan→Build→Verify pipeline, MCP server (7 tools), Execution Navigator commands.
- **SOP 0.3.0 — done (AM-003 / DEC-025).** The **Logic Backbone**: a DESIGN-phase artifact `docs/07-logic-backbone.md` whose computation/decision graph is machine-validated. `ocn check` blocks (`ERR_ARTIFACT_INVALID`, exit 2) on missing role / duplicate node id / dangling reference / dependency cycle / orphan node / unbound trigger; on pass it writes `.ocoding/logic-graph.json` and `ocn brief` surfaces execution order + trigger bindings. See `src/core/gate/logic-backbone-validator.ts` + `docs/amendments/2026-06-03-logic-backbone-amendment.md`.
- **SOP 0.4.0 — done (AM-004/AM-005, DEC-028/029/030).** The **Readiness Backbone**: a role-based cross-cutting readiness gate (55 falsifiable checks from 54 IT roles) that runs in `check`/`gate`/`advance` after the section + logic gates. Open-world: `block`-severity tier-required checks must be `PASS` or `WAIVED` — `FAIL` and `UNKNOWN` both block (`ERR_GATE_FAILED`, exit 1) with per-check `fix_hint`s; ledger at `.ocoding/readiness.json`. `ocn readiness list` / `ocn readiness waive … --reason --probe` (waive-with-probe: grant-time probe, re-verified every gate, expires on state change; human-only). `ocn sop upgrade [--target] [--plan]` (DEC-029) re-pins existing projects forward (preserves `config.yaml` + cursor + artifacts). Runtime default flipped to 0.4.0 (DEC-030); pins are honored at runtime — a 0.3.0-pinned repo keeps 0.3.0 behavior until upgraded.
- **SOP 0.5.0 — done (AM-007 / DEC-032).** The **Task Backbone**: build plans carry machine-parseable Task Spec blocks (`## Task Specs｜任务规格`: goal/traces/touches/verify/dod + optional depends/phase/timeout). The build-plan gate validates six hard defects (duplicate/invalid id, missing field, dangling `traces` → AC ids, dangling `touches` → logic-graph nodes, dangling/cyclic `depends`, zero tasks) and freezes each task's verify-command hash into `.ocoding/task-ledger.json` (R4). Completion is decided ONLY by `ocn task check` running the frozen command (exit 0 → done + `task_completed` audit; drift → refused); `ocn task list` is the read-only ledger view (pull-mode, no audit). `/ocn-next` / `ocn next-prompt` dispatch the first pending task in `state_build`; `ocn advance` blocks on **any** forward move in BUILD while tasks are pending（任务台账不清，不准在 BUILD 内前进——AM-010/DEC-035 把 AM-007 的 BUILD→VERIFY 边界门扩成 task-first，含 BUILD 内步进）; `ocn brief` shows the ledger summary. Closes the fourth false-completion class: receipt-only completion (honest-but-empty BUILD receipts passing every gate; discovered via the Lattice dogfood). Runtime default flipped to 0.5.0 (DEC-032); 0.4.0 frozen + importable; `ocn sop upgrade` migrates. See `docs/amendments/2026-06-12-task-backbone-amendment.md` + `docs/amendments/2026-06-14-build-task-first-amendment.md`.
- **Rewind & Cycle — done (AM-008 / DEC-033).** Controlled cursor rollback + round restart (engine/CLI feature, NOT an SOP bump). `ocn rewind --to <step> --reason …` moves the cursor to a strictly-earlier step in the pinned profile's declaration order (mandatory reason; docs/ untouched; `latestGateResult` cleared; zero gate exemption — every advance afterwards re-runs the full gate stack). `ocn cycle new --yes` archives the round's runtime state to `.ocoding/cycles/<n>-<ISO-ts>/` (the dir name IS the round counter — no schema field) and restarts at the first step; docs/ kept for gate fast-forward; pin and user-owned `config.yaml` preserved. The audit JSONL is never archived — one continuous log spans all rounds; push events `cursor_rewind` / `cycle_started` (single type each, result success|failed). Both commands are human-only, CLI-only — never exposed over MCP. The terminal `no_next_step` refusal signposts both. Naming ruling: `rewind` yields the `reset` name to the frozen contract §25 file-deletion semantics (untouched). See `docs/rewind-cycle-proposal.md` + `docs/amendments/2026-06-12-rewind-cycle-amendment.md`.
- **Auto Mode — done (AM-009 / DEC-034).** Optional per-phase delegation (engine/CLI feature, NOT an SOP bump): "advance is human-only" restated as human-**authorized**. `ocn auto on --phase <1|2|all>` (human-only switch, push audit `auto_mode_changed`) delegates the **trigger** — never the **judgement** (gates + frozen verify commands still decide everything). Phase ownership follows the advance TARGET state: phase1 = DISCOVERY→PLAN, phase2 = BUILD→VERIFY (so the PLAN→BUILD boundary needs phase2; SHIP/REFLECT are never delegable). Phase2 also delegates `ocn task check` (BUILD/VERIFY only) and the **milestone-loop rewind** (`rewind --to step_build_plan` from BUILD/VERIFY — multi-P build plans complete without a human between milestones). ai_agent calls require `OCN_ACTOR=ai_agent` (injected into `.claude/settings.json` by `ocn agent setup`) + mandatory `--rationale` (background/evidence/action); the engine independently records machine context (gate verdict, ledger summary, frozen command, durationMs). Circuit breaker: N consecutive gate failures on one step (default 5) suspend automation (`.ocoding/automation-runtime.json`; humans unaffected; `ocn auto resume` re-arms). `ocn auto trace` replays the decision trail. Manual mode stays the default, is byte-identical to pre-AM-009 output, and now technically refuses honest ai_agent callers. Hard human-only zones in every mode: readiness waive, cycle new, sop upgrade, override, any non-milestone rewind, the switch itself. MCP surface unchanged (7 tools). See `docs/amendments/2026-06-13-auto-mode-amendment.md`.
- **Auto-mode review subagent — done (AM-011 / DEC-036).** Refines AM-009 (text layer only, NOT an SOP bump): in auto mode, before exercising ANY ai_agent trigger (phase1 = before `advance`; phase2 = before `task check` + `advance`), the AI MUST dispatch an **independent, fresh-context subagent acting as a senior human expert** to review the changes against 〔step requirements + traced AC ids + diff + OCN contract〕 and return PASS/FAIL + concrete findings — it stands in for the human review auto mode otherwise skips. The review is **advisory due-diligence; the gate, not the review, is the arbiter** (judgement still not delegated). On FAIL: record → fix in scope → re-review, **at most 3 fix attempts**, then record the unresolved findings in `--rationale` (+ `ocn log`) and proceed. Dispatching an in-harness subagent (Task/Agent tool, no external network) is required here and is NOT the prohibited "external LLM/network call". Manual mode output stays byte-identical (no review text). Surfaced in the `ocn brief` governance reminder + the next-prompt **Automation loop** + the `/ocn-next` template. See `docs/amendments/2026-06-15-auto-review-subagent-amendment.md`.
- **Readiness precise activation — done (AM-014 / DEC-040).** Engine/CLI refinement of the Readiness Backbone (NOT an SOP bump): a block check is enforced only from its dependency-derived deadline state onward (`dueState(rule)` = latest SOP state among its inputs; artifact dep → producing step's state, repo-probe → policy table). Before that it's the new `DEFERRED` verdict — non-blocking, surfaced as "Forthcoming｜将到期" in `ocn brief` + `[DEFERRED]` in `ocn readiness list`. Kills the first-step readiness cliff (不提前) while every gate still fires at exactly the right state and nothing slips past (不缺失 — can't reach VERIFY with a block check unmet). Opt-in via the rulebook flag `precise_activation` (0.7.0 has it; 0.4.0/0.5.0 frozen → unchanged). Fail-safe: an unresolvable deadline → not deferred (enforced from gate 1). New from-scratch default-0.7.0 e2e (`readiness-precision-walkthrough.test.ts`) closes the dogfood blind spot (all prior e2e pin 0.3.0). See `docs/readiness-timing-proposal.md` + `docs/amendments/2026-06-30-readiness-timing-amendment.md`.
- **SOP 0.8.0 — done (AM-015 / DEC-041).** The **Acceptance Backbone**: `docs/03` carries a machine-parseable `## Acceptance Specs｜验收规格` section (`### AC-<DOMAIN>-<n>` blocks with `desc` required + optional `priority`/`given`/`when`/`then`/`trace`). The acceptance gate (runs at `step_acceptance_criteria` after the section gate) validates four structural defects (`no_specs`, `duplicate_id`, `invalid_id`, `missing_field` → `ERR_ARTIFACT_INVALID`, exit 2) and, on pass, freezes `.ocoding/acceptance-specs.json` — the **canonical machine source of AC ids** that build-plan `traces` bind to. This closes the "AC hidden in a table silently doesn't register → traces can't bind → gate greenlights false traceability" hole: acceptance criteria in tables/prose are **not** definitions (empty-section block + `dangling_trace` block enforce it by construction — no heuristic table-detection). Only **Path A** (Markdown AC ids) is touched; **Path B** (the `ocn-readiness` block's `scenarios:` — a separate subsystem) is untouched. All Path A consumers (evidence-map/verify-status/next-prompt/verdict/render) migrate for free via a projection→`AcceptanceCriterion` adapter in `acceptance-loader.ts` (projection-first, markdown fallback for <0.8.0 pins). Runtime default flipped to 0.8.0 (npm `0.8.0-beta.0`, lockstep); 0.7.0 and earlier frozen + importable; `ocn sop upgrade` migrates (new section lands on the already-passed SPEC step). New from-scratch default-0.8.0 e2e (`acceptance-backbone-walkthrough.test.ts`). MCP surface unchanged (7 tools). See `docs/acceptance-backbone-proposal.md` + `docs/amendments/2026-07-02-acceptance-backbone-amendment.md`.
- **Init wires Claude Code by default — done (AM-013 / DEC-038).** Engine/CLI convenience, NOT an SOP bump: `ocn init` now runs `ocn agent setup` by default (the DEC-031 follow-up), so `/ocn-next` works without a forgotten second step. `ocn init --no-agent` opts out (writes only `.ocoding/`, byte-identical to pre-AM-013). Fail-open (DEC-031 §1): a wiring hiccup never fails init — it downgrades to a "run `ocn agent setup --force`" hint, exit 0. Orchestrated in the CLI layer (`src/cli/commands/init.ts`); core `initProject` stays agent-agnostic and off the MCP path; the result carries `data.agentSetup`. MCP surface unchanged (7 tools). See `docs/amendments/2026-06-30-init-agent-default-amendment.md`.
- **`ocn stop` — terminate OCN, done (AM-016 / DEC-042).** Engine/CLI lifecycle feature, NOT an SOP bump: gives a project a clean "get off OCN" exit once planning is done (works from **any** state, not just the REFLECT terminal). Two levers: (1) a `stoppedAt` marker on `state.json` (`.strict()` field, `.default(null)` = back-compat) that every AI-facing surface — `brief` / both next-prompts (incl. MCP `navigator.*`) / `status` — reads and goes quiet on, while `advance` refuses (`ERR_STATE_MACHINE`) and the Stop hook allows (stops forcing the AI onward); (2) `teardownAgentIntegration` (the inverse of `ocn agent setup`) uninstalls the injected wiring — deletes `.claude/ocn.md` + `/ocn-next`, surgically strips OCN's hooks + `OCN_ACTOR` from `.claude/settings.json` and the `@.claude/ocn.md` import from `CLAUDE.md`, preserving all user content. One-way (no built-in re-attach; re-wire via `ocn agent setup`), human-only, CLI-only, `--yes` required; **never exposed over MCP** (whitelist stays 7 tools). Push audit `project_stopped`. Only touches OCN-owned/injected files — the repo-root `CLAUDE.md` prose and Claude Code `memory/*.md` are left alone. See `docs/amendments/2026-07-05-stop-detach-amendment.md`.

### Original Skeleton Spike acceptance (historical)

The original false-completion-detection main path — still the canonical demo of OCN's value:
```
empty dir → ocn init → ocn doc create <step> → write artifact missing a required section
→ ocn check ⇒ blocked (exit 2) → add the section → ocn check ⇒ pass → ocn brief ⇒ AI resumes context
```
**The product value is detection of false-completion, not document generation** — now extended by the logic-backbone gate to detect *logically-un-wired* completion, not just missing sections.

---

## 7. Project Structure｜项目结构

```
.
├── CLAUDE.md
├── LICENSE                          # Apache-2.0
├── README.md                        # Phase 1+
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .claude/
│   ├── rules.md
│   ├── patterns.md
│   └── anti-patterns.md
├── docs/                            # 24 artifact slots (existing 9 docs frozen as design contracts)
├── sops/
│   └── default-ai-coding-sop/
│       └── 0.1.0/
│           ├── sop.yaml
│           ├── gates.yaml
│           ├── artifacts.yaml
│           ├── README.md            # human-readable, sourced from docs/AI Coding SOP v1.md
│           └── CHANGELOG.md
├── src/
│   ├── core/                        # Core Engine — MCP-friendly pure functions
│   │   ├── state-machine.ts
│   │   ├── sop-loader.ts
│   │   ├── artifact/
│   │   │   ├── registry.ts
│   │   │   ├── template-writer.ts
│   │   │   ├── markdown-parser.ts
│   │   │   └── required-section-matcher.ts
│   │   ├── gate/
│   │   │   ├── hard-gate.ts
│   │   │   └── process-gate.ts
│   │   ├── state/
│   │   │   ├── state-store.ts        # lock + backup + temp rename
│   │   │   └── audit-writer.ts
│   │   ├── brief/
│   │   │   └── brief-generator.ts
│   │   ├── prompt/
│   │   │   └── next-prompt.ts
│   │   ├── result.ts                 # BaseResult / CommandResult / CoreResult / MCPToolResult
│   │   ├── id.ts                     # stable id helpers + validators
│   │   ├── time.ts                   # ISO 8601 UTC helpers
│   │   └── i18n.ts                   # BilingualMessage helpers
│   ├── cli/
│   │   ├── index.ts                  # commander entry
│   │   ├── render/                   # human-readable renderers (text + --json)
│   │   └── commands/
│   │       ├── init.ts
│   │       ├── status.ts
│   │       ├── brief.ts
│   │       ├── doc.ts
│   │       └── check.ts
│   ├── mcp/                          # beta+
│   │   └── server.ts
│   └── types/
│       └── index.ts                  # zod schemas + inferred TS types (single source of truth)
├── tests/
│   ├── fixtures/
│   │   ├── sop/
│   │   ├── artifacts/
│   │   ├── projects/
│   │   └── state/
│   ├── unit/                         # Layer 1-2
│   ├── gate/                         # Layer 3
│   ├── cli/                          # Layer 4
│   ├── persistence/                  # Layer 5
│   ├── lock/                         # Layer 6
│   ├── mcp/                          # Layer 7 (beta+)
│   └── e2e/                          # Layer 8 — dogfood
└── .ocoding/                         # GENERATED by `ocn init`, do not commit hand-edits
    ├── state.json
    ├── sop.yaml                      # snapshot of locked profile
    ├── gates.yaml
    ├── config.yaml
    ├── .lock
    ├── state.json.bak
    └── baselines/
```

---

## 8. Code Quality Hard Limits｜代码硬约束

| Metric | Limit | Action on violation |
|---|---|---|
| File length | ≤ 300 lines | split |
| Function length | ≤ 50 lines | refactor |
| Function params | ≤ 4 | use object/struct |
| Nesting depth | ≤ 3 | early return / extract |
| Cyclomatic complexity | ≤ 10 | split branches |
| Single PR diff | ≤ 500 lines | split commits |
| `any` / `unknown` (raw) | 0 in exported API | use zod + inferred type |

### Forbidden in source code

- Hardcoded secrets, passwords, tokens, URLs (use config + env)
- `any` to escape type checking — prefer `unknown` + zod parse
- Numeric step pointers (see §4.1)
- Mutating state objects in place — return new copies
- Catching errors silently
- Magic numbers / magic strings without named constants

---

## 9. Workflow｜开发流程

### Before coding (every feature)
1. Confirm **state + step** — are we still in PLAN, or did we cross into BUILD?
2. Read the relevant `docs/*.md` section (Data Model / API Contract / AC) — those are the contract.
3. Check existing similar code (no duplication) and battle-tested libs (no reinventing).
4. Sketch types / zod schemas first — they ARE the spec.
5. Write the test first (Layer 1-3 minimum).

### Coding
1. Increment ≤ 100 lines per logical change.
2. RED → GREEN → IMPROVE.
3. Function = single responsibility. Compose small functions.
4. Guard clauses + early return; no deep nesting.
5. Naming = documentation (don't add comments to explain what — only why-non-obvious).

### Pre-commit gate (run before EVERY commit)
```bash
npm run lint            # ESLint must pass
npm run typecheck       # tsc --noEmit must pass
npm run test            # vitest run must pass
```

Any failure ⇒ fix immediately, do not commit. Coverage targets:
- Core Engine ≥ 90%
- CLI integration ≥ 70%
- Overall ≥ 80%

### Commit format
```
<type>(<scope>): <subject>

<body>
```
Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Examples:
- `feat(core): add SOP loader minimal implementation`
- `test(gate): cover required-section blocked path with bilingual error`
- `docs(05-data-model): amendment DM-002 add obligation_X`

---

## 10. AI Governance Rules for THIS Session

These are the rules OCN itself will inject via `ocn brief`. While we're building OCN, we follow them:

**AI MAY:**
- Generate document drafts following exact templates in `docs/`.
- Suggest code changes for the current state/step only.
- Generate test cases that trace to ACs in `docs/03-acceptance-criteria.md`.
- Summarize project state from `.ocoding/state.json` (when it exists) and `docs/`.
- Read `docs/`, `.claude/`, `CLAUDE.md`, `package.json`, source files.

**AI MUST NOT:**
- Modify `.ocoding/state.json` directly (only Core Engine writes it, with lock).
- Change SOP profile content without an explicit Decision Log entry.
- Advance project state in manual mode (the default) — whether `ocn advance` / `ocn task check` may be run by the AI is decided by the **governance section of `ocn brief`** (AM-009): default forbidden; only when the human has enabled auto mode (`ocn auto on --phase …`) may the AI run them with `OCN_ACTOR=ai_agent` + `--rationale`, and the circuit breaker + hard human-only zones (readiness waive / cycle new / sop upgrade / override / non-milestone rewind / `ocn stop` / `ocn auto` itself) always apply. **In auto mode, before any such trigger the AI must first run an independent fresh-context expert-review subagent (AM-011/DEC-036) — advisory due-diligence, bounded to 3 fix attempts; the gate remains the arbiter.**
- Delete or rewrite any `docs/0X-*.md` file without showing diff and getting confirmation.
- Rewrite a frozen `docs/0X` design contract instead of adding an amendment under `docs/amendments/`.
- Expose `navigator.advance_phase` MCP tool in v1.0.
- Add features outside the current state's scope (`docs/01-scope.md` is law).
- Skip pre-commit lint/typecheck/test (CLAUDE.md §9).
- Use numeric step pointers as source of truth.
- Hardcode secrets, URLs, or tokens.
- Merge PRs autonomously.

---

## 11. References｜常用快查

- Stable IDs definition → `docs/00-project-brief.md` §10, `docs/05-data-model.md` §3.2
- SOP Step Map → `docs/00-project-brief.md` Appendix A
- Tier definitions → `docs/01-scope.md` §5.7
- Gate types → `docs/01-scope.md` §5.8
- Cross-cutting obligations table → `docs/01-scope.md` §6
- Result types (BaseResult / CommandResult / CoreResult / MCPToolResult) → `docs/06-api-contract.md`
- Test layers → `docs/07-test-strategy.md` §3
- Skeleton Spike spec → `docs/08-mvp-plan.md` §3

---

## 12. Open Questions / Pending

These remain unresolved and need a Decision Log entry when chosen:

- [ ] Package manager: npm vs pnpm (default to **npm** unless decided otherwise — already implied by `npm package` in §27 of project brief)
- [ ] ESLint config: `@typescript-eslint/recommended` + import order
- [x] Git hook tool: **husky** (in use — pre-commit runs lint + typecheck + test)
- [ ] CI provider: GitHub Actions (Phase 1)

When resolved, write to `docs/19-decision-log.md` with format from `docs/01-scope.md` §5.13.
