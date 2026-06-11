# O'CodingNavigator (OCN) — Claude Code Working Contract

> Generated: 2026-04-28 · Updated: 2026-06-11
> SOP Profile: `default-ai-coding-sop@0.4.0` (runtime default since DEC-030; 0.1.0 / 0.2.0 / 0.3.0 frozen + importable)
> Current State: shipped — Planning Gatekeeper + Execution Navigator + Logic Backbone + **Readiness Backbone** (incl. `ocn sop upgrade`).
> Published: `o-coding-navigation@0.4.0-beta.0` (pre-GA beta).
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

**FORBIDDEN to expose in v1.0**: `navigator.advance_phase` (state advancement is human-only via CLI), reset, sop upgrade apply, capture decision (formal decisions are human-only).

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
SOP Profile  : default-ai-coding-sop@0.4.0 (runtime default — DEC-030)
Published    : o-coding-navigation@0.4.0-beta.0 (npm latest + beta; alpha preserved at 0.1.0-alpha.2)
Surface      : Planning Gatekeeper (00–19) + Execution Navigator + readiness (list/waive) + sop upgrade + MCP (7 tools)
State machine: 20 wired steps across DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY (SHIP/REFLECT stubs)
Status       : pre-GA beta, dogfooded; Skeleton Spike + 0.2.0/0.3.0/0.4.0 cutovers + logic & readiness backbones shipped
```

### What shipped (high level)

- **Skeleton Spike (Phase 0) — done.** `init / status / brief / doc create / check` + the core engine (SOP loader, state store with lock+backup+atomic rename, markdown parser, required-section matcher, gate-status calculator, bilingual CommandResult renderer).
- **SOP 0.2.0 — done.** `runGate`, `advanceState`, audit trail, full 19-step Plan→Build→Verify pipeline, MCP server (7 tools), Execution Navigator commands.
- **SOP 0.3.0 — done (AM-003 / DEC-025).** The **Logic Backbone**: a DESIGN-phase artifact `docs/07-logic-backbone.md` whose computation/decision graph is machine-validated. `ocn check` blocks (`ERR_ARTIFACT_INVALID`, exit 2) on missing role / duplicate node id / dangling reference / dependency cycle / orphan node / unbound trigger; on pass it writes `.ocoding/logic-graph.json` and `ocn brief` surfaces execution order + trigger bindings. See `src/core/gate/logic-backbone-validator.ts` + `docs/amendments/2026-06-03-logic-backbone-amendment.md`.
- **SOP 0.4.0 — done (AM-004/AM-005, DEC-028/029/030).** The **Readiness Backbone**: a role-based cross-cutting readiness gate (55 falsifiable checks from 54 IT roles) that runs in `check`/`gate`/`advance` after the section + logic gates. Open-world: `block`-severity tier-required checks must be `PASS` or `WAIVED` — `FAIL` and `UNKNOWN` both block (`ERR_GATE_FAILED`, exit 1) with per-check `fix_hint`s; ledger at `.ocoding/readiness.json`. `ocn readiness list` / `ocn readiness waive … --reason --probe` (waive-with-probe: grant-time probe, re-verified every gate, expires on state change; human-only). `ocn sop upgrade [--target] [--plan]` (DEC-029) re-pins existing projects forward (preserves `config.yaml` + cursor + artifacts). Runtime default flipped to 0.4.0 (DEC-030); pins are honored at runtime — a 0.3.0-pinned repo keeps 0.3.0 behavior until upgraded.

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
- Advance project state without the user running `ocn advance` — advance is human-only.
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
