# O'CodingNavigator (OCN)

> Local-first, MCP-first, state-machine-driven **AI coding workflow operating system**.
> CLI: `ocn` · MCP: `ocn-mcp` · License: Apache-2.0
> **Phase**: SOP 0.5.0 (Task Backbone) mainline · **Status**: pre-GA beta · **Public**: on npm as `latest` and `@beta` → [`0.5.0-beta.2`](https://www.npmjs.com/package/o-coding-navigation) · GitHub pre-release: [`v0.5.0-beta.2`](https://github.com/UncleTIM-GZ/O-CodingNavigation/releases/tag/v0.5.0-beta.2)

> 📑 This README has two parts:
> **Part 1 — English** (sections 1 – 11) · **Part 2 — 中文版** (§§ A – K)
> 本 README 分两部分阅读：先看英文（§§ 1–11），中文从下方 §A 开始。

---

# Part 1 · English

OCN turns AI coding from continuous-chat improvisation into a navigable, gated, auditable, reviewable systems-engineering process. It is a *navigator*, not an IDE, not a SaaS, not a project-management board.

### Table of contents (English)

**Understand OCN**
1. [What OCN is](#1-what-ocn-is)
2. [Why OCN exists](#2-why-ocn-exists)
3. [Current status](#3-current-status-sop-050-task-backbone-mainline)
   - 3.1 [Two-stage product model](#31-two-stage-product-model)

**Use OCN**
4. [Install](#4-install)
5. [First 5 minutes](#5-first-5-minutes)
   - 5.4 [Full walkthrough: how it looks inside Claude Code](#54-full-walkthrough-how-it-looks-inside-claude-code)
   - 5.5 [Adopting OCN mid-project](#55-adopting-ocn-mid-project)
   - 5.6 [Post-plan execution flow](#56-post-plan-execution-flow)
6. [Core CLI commands](#6-core-cli-commands)
   - 6.1 [Planning Gatekeeper commands](#61-planning-gatekeeper-commands)
   - 6.2 [Execution Navigator commands](#62-execution-navigator-commands)
7. [MCP tools](#7-mcp-tools)

**Reference**
8. [Documentation map](#8-documentation-map)
9. [Development](#9-development)
10. [Roadmap](#10-roadmap)
11. [License](#11-license)

---

## Understand OCN

### 1. What OCN is

OCN is the local discipline layer for AI coding. It runs on your machine, persists everything to plain files (Markdown + JSON + JSONL + YAML), exposes a small CLI for humans, and a small MCP server for agents. There is no cloud component.

OCN sells **discipline** — productized as:

- a **state machine** (DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT) with forward-only transitions,
- a **Step Artifact Gate** that blocks advancement when the current step's required sections are missing,
- a **dual-track audit trail** (`.ocoding/audit/audit-events.jsonl` + `docs/22-audit-trail.md`),
- a **Logic Backbone (SOP 0.3.0)** — a DESIGN-phase artifact whose computation/decision graph is machine-validated; `ocn check` blocks on orphan scores, dangling references, cycles, and unbound triggers, so the system's logic is wired before BUILD,
- a **Readiness Backbone (SOP 0.4.0)** — a role-based cross-cutting readiness gate: 55 falsifiable checks derived from 54 curated IT roles (developer, QA, DevOps, CISO, service desk, …) run inside `ocn check` / `ocn gate` / `ocn advance` on every step; open-world semantics mean both `FAIL` and `UNKNOWN` block (silence is not a pass), catching role-blind completion before SHIP,
- a **Task Backbone (new in SOP 0.5.0)** — build plans carry machine-parseable Task Spec blocks (goal / traces / touches / verify / DoD); the build-plan gate validates six hard defects and freezes each task's verify-command hash into `.ocoding/task-ledger.json`; a task is *done* only when `ocn task check` reruns the frozen command and it exits 0, and `ocn advance` out of BUILD is blocked while tasks are pending — closing the fourth false-completion class, receipt-only completion,
- a **safe MCP surface** that lets agents read, prepare, and create artifacts but never advance state, capture decisions, reset the project, or force-release the lock.

OCN is **not** a code generator, an IDE, a SaaS, a project-management tool, a notes app, or a scaffold-only doc factory.

### 2. Why OCN exists

Working with an AI coding agent for any non-trivial task tends to fail in four ways:

| Failure | Symptom |
|---|---|
| **lost** | Nobody — human or AI — knows which step the project is on. |
| **drift** | The agent keeps generating, but each new chunk is further from the original requirement. |
| **amnesia** | A new chat starts and the agent re-derives what the previous chat already decided. |
| **false-completion** | A document exists on disk, but it's missing a required section. The agent declares "done" anyway. |

OCN treats these as the same problem: *the AI coding loop has no rigorous notion of "where we are" and "what counts as done"*. OCN supplies both as code, not as exhortation.

### 3. Current status (SOP 0.5.0 (Task Backbone) mainline)

| | |
|---|---|
| Phase | **SOP 0.5.0 (Task Backbone) mainline** — Plan → Build → Verify, with the machine-verified DESIGN logic-backbone gate, a role-based cross-cutting readiness gate (55 checks) on every step, and a frozen-verify task ledger that gates BUILD exit; plan-to-verify smoke covers all 20 steps |
| Tests | full vitest suite green on Node 20 + Node 22 |
| Coverage | meets the publish-time gate |
| npm | `latest` → `0.5.0-beta.2`; `beta` → `0.5.0-beta.2`; `alpha` → `0.1.0-alpha.2` (historical; preserved) |
| Maturity | **pre-GA beta** — not stable, not GA, beta only (for controlled testing / dogfood) |
| External host validation | Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified. |
| MCP transport | stdio only (HTTP/SSE not started) |

> **2026-05-04 republish note**: Republished as `0.2.0-beta.2` to ship the Execution Navigator commands (`exec status`, `github analyze-pr`, `evidence map`, `next-prompt`, `verify status`, `verdict draft`) that were merged after `0.2.0-beta.1` was packaged. The README documentation and the published CLI binary now match.

#### 3.1 Two-stage product model

OCN now works in two connected phases:

1. **Planning Gatekeeper** — define scope, architecture, acceptance, and build plan before implementation. Drives `state_discovery` → `state_plan`, gates artifact completion, and is the surface covered by §6.1.
2. **Execution Evidence Navigator** — read git, GitHub PR, acceptance evidence, and verification signals during implementation. Six new read-only commands (§6.2) summarise that evidence and draft the next agent prompt, the verification readiness signal, and the final verdict. They never mutate state, never call an LLM, never run `npm`/`gh` mutating commands.

The two stages are connected: planning artifacts (00–10) must pass their gates before the execution stage's `evidence map`, `verify status`, and `verdict draft` can read meaningful inputs. Authoritative reframe: [DEC-024](./docs/20-decision-log.md). Series closure report: [`docs/reports/2026-05-04-execution-navigator-verdict-draft.md`](./docs/reports/2026-05-04-execution-navigator-verdict-draft.md).

**Implemented**

- **CLI**: `init`, `status`, `brief`, `doc create`, `check`, `gate`, `advance` (full list in §6).
- **State machine**: 8 states, forward-only transitions; DISCOVERY → PLAN have stable-ID steps wired (BUILD / VERIFY / SHIP / REFLECT have state IDs only — steps deferred).
- **Step Artifact Gate**: required-section detection with NFKC-normalised heading match for bilingual `Title｜标题` headings.
- **State safety**: `.ocoding/.lock` (5 s timeout + stale recovery), `state.json.bak` rolling backup, atomic temp-rename writes; concurrent-advance race fixed (post-Codex P1).
- **Audit**: dual-track persistence, 16 event types, `correlationId` threading across the entire `ocn advance` event chain.
- **MCP safe tools**: 7 read/prepare/create/log tools over stdio; 4 forbidden tools never registered (full list in §7); `projectRoot` validator + threat model ([`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md)).
- **Real MCP Host validation**: Claude Desktop on Windows with WSL2 validated end-to-end ([DEC-017](./docs/20-decision-log.md), [report](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline remain unverified.
- **Executable example**: [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) walks all 10 v1.0 SOP steps end-to-end via `scripts/smoke.sh`. Bundled fixtures derived verbatim from `src/core/templates/*.ts` so they cannot drift.
- **npm publish discipline**: SOP 0.5.0 mainline published as `o-coding-navigation@0.5.0-beta.2` under strict pre-publish checklists, `prepublishOnly` gate, and `files` allowlist. `latest` and `beta` both point to `0.5.0-beta.2`; `alpha` is preserved at `0.1.0-alpha.2` for historical use. Annotated git tag `v0.5.0-beta.2` and matching GitHub pre-release published.

**Not implemented (deliberately deferred — see §10)**

`ocn doctor`, `ocn reset`, `ocn baseline`, SOP versioning / upgrade, `production` / `full` tiers, mini-CRM dogfood, real-Host validation for Cursor / Cline ([DEC-019](./docs/20-decision-log.md)), remote MCP transport, MCP auth.

---

## Use OCN

### 4. Install

#### 4.1 Recommended: install from npm

```bash
npm install -g o-coding-navigation
```

As of v0.5.0-beta.2, npm latest and beta both point to the SOP 0.5.0 (Task Backbone) release.

Verify:

```bash
ocn --version       # 0.5.0-beta.2
ocn --help
ocn-mcp             # starts the MCP stdio server; press Ctrl+C to exit
```

Use @beta when you want to pin the prerelease channel explicitly:

```bash
npm install -g o-coding-navigation@beta
```

To uninstall: `npm uninstall -g o-coding-navigation`.

#### 4.2 Currently published channels

| Channel | Version | npm tag | Notes |
|---|---|---|---|
| `latest` (recommended) | `0.5.0-beta.2` | `latest` | SOP 0.5.0 (Task Backbone) mainline. |
| Beta (explicit prerelease pin) | `0.5.0-beta.2` | `beta` | Same artifact as `latest`; use `@beta` when you want to pin the prerelease channel explicitly. |
| Alpha (still available) | `0.1.0-alpha.2` | `alpha` | Prior pre-GA channel; preserved for historical use only. |

Package home: https://www.npmjs.com/package/o-coding-navigation

**Prerequisites**: Node.js ≥ 20 (see `engines` in `package.json`).

> **Pre-GA caveat**: this is a **pre-GA beta** release — beta only, intended for controlled testing / dogfood, not GA. Validated with Claude Desktop on Windows with WSL2. Cursor and Cline are not yet verified.

#### 4.3 Alternative: local development from source

For contributing or local development:

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link              # exposes `ocn` and `ocn-mcp` on PATH
```

To uninstall the global links: `cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`.

If you prefer not to `npm link`, run the CLI in-place via `node /path/to/O-CodingNavigation/dist/cli/index.js …`.

### 5. First 5 minutes

#### 5.1 The minimal happy path

```bash
mkdir ocn-demo && cd ocn-demo

ocn init                        # creates .ocoding/ and docs/
ocn status                      # state_discovery / step_project_brief

ocn doc create project-brief    # creates docs/00-project-brief.md (template)
# Now edit docs/00-project-brief.md and fill in the 4 required sections:
#   Problem · Goal · Users · Success Criteria

ocn gate                        # read-only — confirms the gate now passes
ocn advance                     # gate + state mutation + audit trail
ocn status                      # state_discovery / step_scope (advanced)

ocn brief                       # session brief for an AI coding agent
```

#### 5.2 What each command produces

- `init` writes `.ocoding/state.json`, `.ocoding/sop.yaml`, the dual-track audit files, and a `docs/` skeleton.
- `status` reports `currentStateId: state_discovery` / `currentStepId: step_project_brief`.
- `doc create` writes `docs/00-project-brief.md` with bilingual section headings already in place.
- `gate` returns `OK` (exit 0) once the 4 required sections are filled in, or `ERR_GATE_FAILED` (exit 1) with a bilingual list of missing sections.
- `advance` writes a `correlationId`-tagged chain of audit events: `advance_started → artifact_gate_run → artifact_gate_passed → state_transitioned → state_write_succeeded → advance_succeeded`.
- `brief` prints the current-step required sections + AI governance reminders so a coding agent can resume without re-reading docs.

A more detailed walkthrough lives in [`docs/quickstart.md`](./docs/quickstart.md), including the expected file tree and common errors.

#### 5.3 Try the executable example

For an end-to-end example that walks all 10 v1.0 SOP steps against a hermetic temp project, see [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) and run:

```bash
npm run build
bash examples/discovery-to-plan/scripts/smoke.sh
```

The smoke prints the final state and exits with `Discovery-to-plan smoke completed.` It does not modify your environment.

#### 5.4 Full walkthrough: how it looks inside Claude Code

OCN is MCP-first by design. Inside Claude Code (or any other MCP host wired to `ocn-mcp` — Claude Desktop is the validated path per §7.1), **you almost never need to remember an OCN command**. You speak natural language; the AI calls the right OCN MCP tool; the flow runs itself. **The one and only step that must be typed by you in a terminal is the state-advance step** — that is OCN's design guardrail, not a bug.

> Prerequisite: `ocn-mcp` wired into your MCP host as in §7.1. The validated host is Claude Desktop on Windows + WSL2 ([DEC-017](./docs/20-decision-log.md)); other MCP hosts behave the same but are not yet validated ([DEC-019](./docs/20-decision-log.md)).

Below is the full flow in 8 steps. For each step you get three things: **what you say → what the AI does behind the scenes → what you see back**.

---

##### Phase 1: one-time setup (do once per project)

**Step 1. Initialise OCN**

- **You say**: *"Initialise OCN in the current directory."*
- **AI does**: shells out via Bash to run `ocn init` (init is not an MCP tool — it must be a shell call).
- **You see**: `.ocoding/` and `docs/` created; project initialised at `state_discovery / step_project_brief`.

**Step 2. Confirm location**

- **You say**: *"Which step is OCN on?"*
- **AI does**: calls MCP tool `navigator.where_am_i`.
- **You see**: current state, current step, artifact path, suggested next action.

---

##### Phase 2: the per-step loop (repeat for every step)

> Assume you're sitting on `step_project_brief`. Steps 3–8 close out one step; the next step uses the same loop.

**Step 3. Pull this step's brief**

- **You say**: *"Tell me what to do for the current step."*
- **AI does**: calls MCP tool `navigator.brief`.
- **You see**: required sections, governance reminders, uncertainty policy. These enter the AI's context so it follows the rules when writing the artifact.

**Step 4. Create the artifact template**

- **You say**: *"Create the template for the current step's artifact."*
- **AI does**: calls MCP tool `navigator.create_artifact` with type `project-brief`.
- **You see**: `docs/00-project-brief.md` written from the bundled template, with bilingual section headings in place.

**Step 5. Fill out the artifact**

- **You say**: *"Fill out the artifact according to the brief. Our project is [your description]."*
- **AI does**: based on the brief's required sections + your description, edits `docs/00-project-brief.md` directly via its Edit tool to fill Problem / Goal / Users / Success Criteria.
- **You see**: a filled-in markdown. Iterate until you're satisfied.

**Step 6. Verify the artifact**

- **You say**: *"Check whether the current artifact passes the gate."*
- **AI does**: calls MCP tool `navigator.run_gate`.
- **You see**: pass → AI says "gate passed"; fail → AI lists the missing sections and offers to fix them. On fail, return to Step 5.

**Step 7. You type `ocn advance` yourself**

> ⚠️ This is **the one step in the entire flow that you must do yourself**. The AI cannot do it for you.

After Step 6 passes, a disciplined AI will tell you:

> *"Gate passed. To advance, please run `ocn advance` in your terminal."*

Why won't the AI just run it? Two reasons, both load-bearing:

1. **MCP does not expose advance.** `navigator.advance_phase` is one of the four tools in §7.3 that is **never** registered. From the MCP path, the AI literally has no advance tool.
2. **OCN's AI governance rules reserve advance for humans.** State advancement = project milestone = the sentence *"we are now in the next phase"* must be spoken by a human. Letting the AI say it would degrade OCN into one more autonomous scaffolder — exactly the failure mode OCN exists to prevent.

So open a terminal and run:

```bash
ocn advance
```

`advance` re-runs the gate internally, and on pass writes `state.json` under a lock with rolling backup and emits the full `correlationId`-tagged audit chain.

> If you don't want to switch to a terminal, you can **explicitly** ask the AI to run it for you:
> *"Run `ocn advance` for me."*
> That still counts as **your** decision — the AI is just pressing the button on your behalf. The crucial difference: the AI **cannot** auto-run advance the moment Step 6 passes. It must wait until you say so.

**Step 8. Loop back to Step 3**

- **You say**: *"Where is OCN now?"*
- **AI does**: calls `navigator.where_am_i`.
- **You see**: the new step (e.g., `step_scope`).

Then return to **Step 3** for the new step: pull its brief, create its artifact, write, verify, advance. Every step uses this same loop until OCN reports the project has run out of steps.

---

##### Cheat sheet: what you say → which tool runs

| What you say | What the AI uses | Mutates `state.json`? |
|---|---|---|
| "Where is OCN?" | `navigator.where_am_i` (MCP, read-only) | No |
| "Pull the current step's brief" | `navigator.brief` (MCP, read-only) | No |
| "Create the artifact template" | `navigator.create_artifact` (MCP) | No (writes `docs/`) |
| "Fill out the artifact" | AI's own Edit tool on `docs/` | No |
| "Verify the artifact" | `navigator.run_gate` (MCP, read-only) | No |
| **"I'll run `ocn advance` myself"** | **`ocn advance` CLI (Bash, you trigger)** | **✅ Yes** |

---

##### Two hard rules

**(1) `navigator.run_gate` passing ≠ state advancement.**
`run_gate` is read-only; a pass result does not move OCN to the next step. Only `ocn advance` (CLI) advances. If an AI runs `run_gate` and then claims *"we're in the next step"*, it is lying — `state.json` is unchanged.

**(2) The AI never advances on its own initiative.**
By design. After Step 6 passes, a disciplined Claude Code will say only *"Gate passed; please run `ocn advance`"*. If it goes ahead and runs `ocn advance` without you asking, it has bypassed OCN's discipline guardrail — exactly the *drift* failure mode OCN exists to prevent.

This is the discipline OCN sells.

#### 5.5 Adopting OCN mid-project

> Scenario: your project is already running — half the code is written, the PRD lives on Notion, ACs are scattered across Slack threads, decisions exist only in your memory. You want to retrofit OCN's discipline now.

---

##### The fact you have to accept first: OCN does not start from "where you actually are"

OCN's state machine **always** starts at `state_discovery / step_project_brief`. The current release does **not** ship `--skip-to`, `--start-at`, or an `--override` flag on advance.

This is by design, not a limitation. OCN's value is forcing you to explicitly answer *"what are we building?"* and *"what counts as done?"*. Skipping to BUILD makes brief, gate, and audit groundless — you might as well not install it.

So the only right path for mid-project adoption is **backfill**. The good news: you already have the content. You're just routing it into OCN's structure.

---

##### `ocn init` and existing files: hard guarantees

The most common worry when adopting OCN mid-project: *"will `ocn init` overwrite my existing code or docs?"*

Answer: **no**. Two source-level guarantees (verified against `src/core/init.ts` and `src/core/artifact/template-writer.ts`):

1. **`ocn init` only writes OCN's own state files under `.ocoding/`** (`state.json`, `sop.yaml`, `gates.yaml`, `artifacts.yaml`, `config.yaml`) and `mkdir`s `docs/`. It does **not** write any `docs/XX-*.md` artifact templates, and it does not touch `src/`, `README.md`, or any other path.
2. **If the project is already initialised** (`.ocoding/state.json` exists), `ocn init` **refuses to run** and returns exit 4 (`ERR_IO_OR_CONFIG`) with the message *"OCN is already initialized in this directory. / 当前目录已经初始化过 OCN。"* — never overwrites your existing OCN state.

Similarly, **`ocn doc create <type>`** refuses to overwrite by default: on a name collision it returns exit 4 with *"`<type>` already exists at `<path>`. Use `--overwrite` to replace it."* You must explicitly pass `--overwrite` to replace.

So you can safely run them in an existing project root. Worst case: you already have a `docs/00-project-brief.md` — `ocn doc create project-brief` will refuse to write. Two options:
- **Manually merge** your existing content into the OCN template (preserve OCN's bilingual section headings `Title｜标题` — they are the gate's match anchors).
- **Rename your file as backup** (e.g. `docs/00-project-brief.legacy.md`), let `ocn doc create project-brief` write the fresh template, then paste your content back into the OCN-shaped sections.

---

##### Recommended path: backfill early steps using material you already have

**Step 1. Initialise in your project root**

- **You say**: *"Initialise OCN in this directory."*
- **AI does**: runs `ocn init` via Bash.
- **You see**: `.ocoding/` created (`docs/` is `mkdir`-ed); state at `state_discovery / step_project_brief`. Your existing code and docs are untouched.

**Step 2. Feed the AI your project context in one shot**

- **You say**: *"Here's the project context. The PRD is at [Notion URL / file path]. ACs pasted below. Code is in `src/`; [X module] is done, [Y] still pending. Architecture: [brief]. I want to backfill this into OCN's early steps."*
- **AI does**: ingests the context for use across all subsequent steps.
- **You see**: the AI restates the situation to confirm it has the picture.

**Step 3. Backfill the steps one at a time**

Each step uses the §5.4 Steps 3–8 loop (pull brief → create template → AI fills using your material → `run_gate` → **you** type `ocn advance`). The difference from a greenfield project: because the content already exists, the AI mostly reorganises and aligns formats rather than inventing.

SOP 0.5.0 ships `doc create` templates for all 20 steps. The table below maps every step to its artifact path and **where to mine the content from your existing project**:

**DISCOVERY phase**

| Step | Artifact | Where to mine it from your existing project |
|---|---|---|
| `step_project_brief` | `docs/00-project-brief.md` | Original project pitch, Notion landing page, the one-pager you sent investors / leadership |
| `step_scope` | `docs/01-scope.md` | Roadmap, Linear / Jira epic list, internal "what v1 / v2 will not do" doc |

**SPEC phase**

| Step | Artifact | Where to mine it from your existing project |
|---|---|---|
| `step_prd` | `docs/02-prd.md` | The PRD on Notion / Lark / Confluence — reorganise it into OCN's section structure |
| `step_acceptance_criteria` | `docs/03-acceptance-criteria.md` | Slack AC threads, "should…" lines in bug tickets, QA test-case descriptions — convert to Given/When/Then |

**DESIGN phase**

| Step | Artifact | Where to mine it from your existing project |
|---|---|---|
| `step_technical_architecture` | `docs/04-technical-architecture.md` | `package.json` / `requirements.txt` / `go.mod`, deployment diagrams, tech-selection notes |
| `step_information_architecture` | `docs/05-information-architecture.md` | Existing sitemap, URL routing tables, menu hierarchy, product screenshots |
| `step_data_model` | `docs/06-data-model.md` | `schema.sql`, Prisma schema, ORM models, ER diagrams, DB migration files |
| `step_api_contract` | `docs/07-api-contract.md` | OpenAPI / Swagger spec, Postman collections, router code, `@RestController` annotations |
| `step_test_strategy` | `docs/08-test-strategy.md` | `tests/` directory layout, CI config (`.github/workflows/`), coverage targets, E2E framework choice |
| `step_logic_backbone` | `docs/07-logic-backbone.md` | Existing scoring/decision/rules logic, formula definitions, signal→action mappings |

**PLAN phase**

| Step | Artifact | Where to mine it from your existing project |
|---|---|---|
| `step_mvp_plan` | `docs/09-mvp-plan.md` | Existing roadmap, kanban, Linear/Jira epics, Phase 0/1/2 split |
| `step_build_plan` | `docs/10-build-plan.md` | Current sprint plan, todo list, near-term PR plan |

**BUILD phase (typically retroactive backfill)**

| Step | Artifact | Where to mine it from your existing project |
|---|---|---|
| `step_implementation_log` | `docs/11-implementation-log.md` | `git log`, merged PR titles and summaries |
| `step_change_evidence` | `docs/12-change-evidence.md` | Deployed changes, `CHANGELOG.md`, draft release notes |
| `step_integration_notes` | `docs/13-integration-notes.md` | Third-party integration notes, SDK call samples, integration test results |

**VERIFY phase**

| Step | Artifact | Where to mine it from your existing project |
|---|---|---|
| `step_verification_report` | `docs/14-verification-report.md` | Past QA reports, performance test results, user acceptance records |
| `step_acceptance_mapping` | `docs/15-acceptance-mapping.md` | AC-to-code/test mapping table (often needs fresh assembly) |
| `step_failure_fix_log` | `docs/16-failure-fix-log.md` | Bug fix records, incident reports, postmortems |
| `step_regression_evidence` | `docs/17-regression-evidence.md` | Regression test results, CI green-history records |
| `step_final_build_verdict` | `docs/18-final-build-verdict.md` | Final release verdict (typically newly written) |

**Step 4. Once you reach the step you're "actually" on, snap to it**

When backfill catches up to your real position (say you've written half the code and you're at `step_implementation_log`), you don't start from a blank — your already-written code and merged PRs are the source material for that step. From here on, **new** work goes through OCN's discipline: every new feature gets a step, an artifact, then code.

The pre-OCN "anarchy period" is preserved as a faithful historical snapshot inside the backfilled artifacts.

---

##### Three common "can I…" questions

**Q: Can I skip the early steps and start at BUILD?**
A: The current release does not expose a skip mechanism. Two options:
- **Honest backfill** (recommended) — fill the early steps from material you already have.
- **Thin placeholder** (not recommended) — write minimal content that just satisfies the required sections so the gate passes. This makes the gate rubber-stamp anything, which defeats the point of installing OCN.

**Q: Will my existing `docs/` numbering collide with OCN's?**
A: OCN reserves `00-project-brief.md` through `18-final-build-verdict.md`. On a name collision, `ocn doc create` **refuses to write and returns exit 4** — your existing content is never overwritten. Recommended fix: rename your existing file as backup (e.g. `docs/02-prd.legacy.md`), run `ocn doc create prd`, then merge your content into the OCN template. The bilingual section headings (`Title｜标题`) in the OCN template are the gate's match anchors and must be preserved.

**Q: Can I have the AI run all the early steps in one go?**
A: Technically yes. You can say:

> *"Backfill `step_project_brief` through `step_technical_architecture` from the material I provided. After each gate passes, tell me; I'll type `ocn advance` myself."*

The AI will loop through `doc create → fill → run_gate`. After each step's `run_gate` passes, it **stops and waits for you to type `ocn advance`** (or to explicitly tell it to). Every advance remains your decision — by design, bulk backfill cannot replace the human *"we are now in the next phase"* call.

---

##### A minimal backfill example

Suppose you have:
- A 3-month-old React + Node.js project with code in `src/`
- A half-page Notion project pitch
- Scattered AC discussions in Slack

Bringing this into OCN looks like (real conversation will be denser; this shows the skeleton):

> **You**: "Initialise OCN in this directory."
> **AI**: runs `ocn init`. State: `state_discovery / step_project_brief`. `src/` and your existing files are untouched.
>
> **You**: "Project context: [paste the Notion pitch]. Fill `docs/00-project-brief.md` per the brief."
> **AI**: calls `navigator.brief` → gets required sections (Problem / Goal / Users / Success Criteria) → edits `docs/00-project-brief.md`.
>
> **You**: "Verify."
> **AI**: calls `navigator.run_gate` → pass.
> **AI** (disciplined): "Gate passed. Please run `ocn advance`."
>
> **You** (terminal): `ocn advance`.
>
> **You**: "Scope: v1 has shipped [X/Y/Z], [A] is in progress, explicitly out of scope: [B/C]. Fill `docs/01-scope.md`."
> **AI**: loop…
>
> **You**: "Reorganise the Notion PRD into `docs/02-prd.md`: [link]."
> **AI**: loop…
>
> **You**: "ACs from these Slack excerpts: [paste], converted to Given/When/Then."
> **AI**: loop…
>
> *(DESIGN phase: data-model from `prisma/schema.prisma`, api-contract from router code, technical-architecture from `package.json` + deployment diagram.)*
>
> *(BUILD phase: implementation-log assembled from `git log`, change-evidence from merged PRs.)*

Once the backfill catches up, **all new work** comes in through OCN's next step — every new feature has a brief, a gate, and an audit trail.

#### 5.6 Post-plan execution flow

After your planning artifacts (00–10) pass their gates and the project enters implementation, the Execution Navigator commands take over. They are read-only summarisers — they help you and the agent see what is actually true in the repo, the PR, the acceptance evidence, and the verification signals.

1. Build the planning artifacts (steps above) — your `state_plan` artifacts (00–10) gate the implementation.
2. Start implementation in your normal repo workflow (your IDE, agents, etc.).
3. During implementation, use the Execution Navigator commands (§6.2) to read evidence:
   ```bash
   ocn exec status                              # local git + OCN state snapshot
   ocn github analyze-pr <n>                    # GitHub PR analysis (when a PR exists)
   ocn evidence map --pr <n>                    # acceptance criteria coverage
   ocn next-prompt --agent claude               # next agent brief
   ocn verify status --mode combined --pr <n>   # verification readiness
   ocn verdict draft --mode combined --pr <n>   # evidence-derived verdict
   ```
4. Review the evidence and verdict draft before merge — the verdict is conservative; `ready-to-merge` requires every signal aligned (verification ready, PR clean, acceptance covered, no failed checks, no changes-requested).

### 6. Core CLI commands

All commands accept `--json` to emit a machine-readable `CommandResult` envelope. Exit codes are stable:

| Exit code | Meaning |
|---|---|
| `0` | OK |
| `1` | gate failed |
| `2` | artifact missing or invalid |
| `3` | state machine error |
| `4` | config / lock / IO error |
| `5` | SOP version incompatibility |

#### 6.1 Planning Gatekeeper commands

| Command | Purpose | Reads / writes | Audit emission |
|---|---|---|---|
| `ocn init [--tier minimal] [--json]` | Initialise an OCN project in the current directory. | Writes `.ocoding/`, `docs/`, the dual-track audit files. | `project_initialized` + state-write events |
| `ocn status [--json]` | Show current state, current step, the relative path of the current step's artifact, and the next-action hint. | Read-only. | None (avoids log spam — pull-mode) |
| `ocn brief [--json]` | Print the current-step brief for an AI coding session: required sections, governance reminders, uncertainty policy. | Read-only. | None (pull-mode) |
| `ocn doc create <type> [--overwrite] [--json]` | Create one of the 20 supported artifacts from its bundled template (refuses to overwrite an existing file unless `--overwrite` is passed). | Writes the artifact under `docs/`. | `artifact_created` |
| `ocn check [--json]` | Check the current step's artifact against its required sections. | Read-only. | `artifact_gate_run` + `artifact_gate_passed` / `artifact_gate_blocked` |
| `ocn gate [--json]` | Read-only artifact gate aggregation for the current step. Same emission as `check`; never mutates state. | Read-only. | `artifact_gate_*` (no `correlationId`) |
| `ocn advance [--json]` | Run gate, then advance to the next step on pass. Lock-protected; never partial. | Writes `state.json` (atomic). | Full advance chain with shared `correlationId` |
| `ocn sop upgrade [--target <version>] [--plan] [--json]` | Move the project's pinned SOP profile forward to a newer bundled version (forward-only; `config.yaml` preserved). `--plan` is a read-only dry-run. | Apply rewrites `.ocoding/` snapshots + `state.json` (atomic, lock-protected); `--plan` writes nothing. | `sop_upgraded` (apply) / `sop_version_diff_detected` (plan) |
| `ocn rewind --to <stepId> --reason <text> [--json]` | Move the cursor back to a strictly-earlier step in this round (DEC-033 / AM-008). `--reason` is mandatory; docs/ artifacts are untouched; no gate exemption — every advance after a rewind re-runs the full gate stack. **Milestone loop** (phased projects, e.g. P0→P4 with per-phase go/no-go): after each milestone's verdict, rewind to `step_build_plan`, APPEND the next phase's Task Specs (keep finished specs verbatim — verify-command text unchanged ⇒ hash unchanged ⇒ done preserved), re-gate — the ledger becomes the project's cumulative progress account. Human-only — never exposed over MCP. | Writes `state.json` (atomic, lock-protected; `latestGateResult` cleared). | `cursor_rewind` (success and failed) |
| `ocn cycle new --yes [--json]` | Archive this round's runtime state to `.ocoding/cycles/<n>-<ts>/` and restart at the first step (DEC-033 / AM-008). docs/ are kept so next-round gates fast-forward; the pin and user-owned `config.yaml` stay; the audit JSONL is never archived — one continuous log spans all rounds. `--yes` is mandatory. Use it when the round's completion boundary (01-scope) is reached — per-milestone iteration inside one round is `ocn rewind`'s job. Human-only — never exposed over MCP. | Moves `.ocoding` runtime files into the archive; rewrites snapshots + `state.json`. | `cycle_started` (success and failed) |
| `ocn readiness list [--json]` | Evaluate all readiness checks for the current state/tier and print the verdict table (PASS/WAIVED/FAIL/UNKNOWN/NA counts + blocking items). | Read-only. | None (pull-mode — avoids audit spam) |
| `ocn readiness waive <checkId> --reason <r> --probe <cmd> [--json]` | Grant a conditional waiver ("waive-with-probe"): the probe must pass at grant time, is re-verified on every gate run, and the waiver expires when the project leaves the current state. Human-only — never exposed over MCP. | Writes the waiver into `.ocoding/readiness.json`. | `readiness_waived` |
| `ocn task list [--json]` | Show the build-plan task ledger: per-task status (pending/done), the frozen verify command, and dependency/phase info. | Read-only. | None (pull-mode) |
| `ocn task check [<id>] [--json]` | Run the task's frozen verify command — exit 0 marks the task done; a verify command that drifted from its frozen hash is refused. Human/agent CLI only — never exposed over MCP. | Writes `.ocoding/task-ledger.json`. | `task_completed` |
| `ocn agent setup [--force] [--json]` | One-command Claude Code wiring (AM-006): Stop/PostToolUse hooks in `.claude/settings.json` (merge-only, `command -v ocn` guarded), `.claude/ocn.md` governance contract, `CLAUDE.md` import (append-once), `/ocn-next` slash command. Idempotent; human-only. | Writes/merges the four `.claude` surfaces; never overwrites user entries. | `agent_setup_completed` |
| `ocn hook stop` / `ocn hook post-edit` | Machine-facing Claude Code hook handlers (called by the agent host, not humans): `stop` re-runs the gate when the agent ends a turn and blocks with fix hints; `post-edit` runs `commands.lint`/`commands.typecheck` for fast feedback. Fail-open by design. | Raw hook-contract IO (stdin JSON in; block JSON / exit 2 + stderr out). | gate-run events via the reused check engine |

`<type>` for `doc create` (SOP 0.5.0 ships templates for all 20 steps):
`project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`,
`information-architecture`, `data-model`, `api-contract`, `test-strategy`, `logic-backbone`,
`mvp-plan`, `build-plan`, `implementation-log`, `change-evidence`, `integration-notes`,
`verification-report`, `acceptance-mapping`, `failure-fix-log`, `regression-evidence`,
`final-build-verdict`.

`--tier` for `init` accepts `minimal`, `production`, `full` — only `minimal` is enforced today (production / full are accepted but their artifact sets are not yet differentiated).

#### 6.2 Execution Navigator commands

Beyond the planning gate, OCN now reads execution-time evidence (git, GitHub PR, acceptance criteria, package scripts) and produces deterministic summaries — no LLM calls, no mutation, no `npm run` from inside the implementation. These commands are useful during implementation and review, after `state_plan` is closed. Authoritative reframe: [DEC-024](./docs/20-decision-log.md). Series closure: [`docs/reports/2026-05-04-execution-navigator-verdict-draft.md`](./docs/reports/2026-05-04-execution-navigator-verdict-draft.md).

| Command | Purpose | Typical use |
|---|---|---|
| `ocn exec status [--json]` | Read local git evidence and OCN project state. | Snapshot of branch, head, dirty/clean, changed files, recent commits, current state/step. |
| `ocn github analyze-pr <n> [--json]` | Read-only GitHub PR evidence analysis via `gh` CLI. | PR metadata, files changed, commits, checks, reviews — no mutation. |
| `ocn evidence map [--json] [--pr <n>]` | Map acceptance criteria to available evidence. | Per-criterion status: `evidence-found` / `evidence-candidate` / `missing-evidence` / `needs-human-review`. |
| `ocn next-prompt [--json] [--agent ...] [--mode ...] [--pr <n>] [--issue ...]` | Generate the next deterministic agent task brief. | 9 fixed sections — objective, evidence, allowed work, forbidden actions, verification commands, stop conditions. |
| `ocn verify status [--json] [--mode ...] [--pr <n>]` | Summarise verification readiness and missing signals. | Status `ready` / `partial` / `blocked` / `pending` / `no-verification-data` plus required commands and risk flags. |
| `ocn verdict draft [--json] [--mode ...] [--pr <n>]` | Draft an evidence-derived final judgment. | Category `continue-work` / `request-changes` / `ready-for-review` / `ready-to-merge` / `hold-for-manual-review`, with sorted supports / blocks / warnings. |

All six commands are read-only by design: no writes to `.ocoding/`, `docs/`, or any project file; no git mutation; no gh mutation (only `pr view` / `auth status`); no LLM call. `--mode` accepts `local | pr | combined` where applicable; `--pr <n>` enables GitHub evidence in `pr` and `combined` modes. Per-MVP implementation reports live under [`docs/reports/2026-05-02-execution-navigator-*.md`](./docs/reports/) and the closure report linked above.

#### 6.3 Claude Code integration — one command (AM-006 / DEC-031)

```bash
ocn agent setup      # idempotent; commit .claude/ + CLAUDE.md to share with the team
```

Wires the whole phase-2 runbook mechanically: a **Stop hook** re-runs `ocn check` whenever the agent tries to end its turn (blocked → fix hints are fed back and the agent keeps working; loop-protected, fail-open), a **PostToolUse hook** runs your configured `commands.lint`/`commands.typecheck` (from `.ocoding/config.yaml`) after every Edit/Write, the **`.claude/ocn.md` governance contract** loads into every session via a CLAUDE.md import, and **`/ocn-next`** pulls `ocn brief` + `ocn next-prompt` and starts the task. Hook commands are guarded with `command -v ocn`, so teammates without ocn installed are unaffected. After setup, the human workflow per task is two actions: `/ocn-next` in Claude Code → review + `ocn advance` in the terminal.

### 7. MCP tools

OCN's MCP server (`ocn-mcp`) exposes 7 tools over stdio transport. **Wire it into Claude Desktop on Windows with WSL2** — that is the validated Host (per [DEC-017](./docs/20-decision-log.md) and [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)). Cursor and Cline are MCP-aware but are **not yet verified** for OCN — see [DEC-019](./docs/20-decision-log.md) for the support boundary; do not treat them as supported until each has its own validation report.

#### 7.1 Wire into Claude Desktop on Windows + WSL2

Add the OCN entry to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ocn": {
      "command": "wsl.exe",
      "args": ["-e", "ocn-mcp"]
    }
  }
}
```

If `ocn-mcp` is not on the WSL2 `PATH`, replace `"ocn-mcp"` with the absolute path printed by `which ocn-mcp` inside WSL2 (typically the npm global bin, e.g. `/home/<user>/.npm-global/bin/ocn-mcp`). Save the config, fully quit Claude Desktop (system tray included), and reopen — the seven `navigator.*` tools should appear in the tools panel.

Full wiring guidance + per-tool envelopes: [`docs/mcp-usage.md`](./docs/mcp-usage.md). The validation transcript that proved this exact path works lives in [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md).

#### 7.2 Allowed (7)

| Tool | Purpose | Mutates? |
|---|---|---|
| `navigator.where_am_i` | State snapshot. | No |
| `navigator.brief` | Current-step brief. | No |
| `navigator.run_gate` | Read-only gate aggregation. | No |
| `navigator.create_artifact` | Create from the full template registry (20 types: 00–19, logic-backbone at 07). | Filesystem only |
| `navigator.capture_log` | Append to `docs/19-dev-log.md` (`type=dev`) or `docs/18-research-log.md` (`type=research`). **`type=decision` is hard-rejected.** | Filesystem only |
| `navigator.detect_sop_version` | Drift between locked profile and bundled OCN SOP. | No |
| `navigator.generate_next_prompt` | Required sections + governance reminder + uncertainty policy + self-check rule. | No |

#### 7.3 Forbidden (4) — NEVER exposed

| Tool | Why kept off MCP |
|---|---|
| `navigator.advance_phase` | State advancement is human-only via the CLI. |
| `navigator.capture_decision` | Decisions reflect human intent. The exposed `capture_log` rejects `type=decision`. |
| `navigator.reset_project` | Destructive; twice-confirm flow is human-only. |
| `navigator.force_release_lock` | Bypasses state-safety invariants; operator-only. |

Enforced by `tests/unit/mcp-tool-registry.test.ts` (`ALLOWED ∩ FORBIDDEN = ∅`).

> An MCP agent connected to OCN can read project state, render the next-step brief, prepare artifacts, run the read-only gate, create from the template registry, and capture `dev` / `research` logs. It **cannot** advance state, capture decisions, reset the project, or force-release the lock.

Full surface + wiring instructions: [`docs/mcp-usage.md`](./docs/mcp-usage.md).

---

## Reference

### 8. Documentation map

OCN ships its own design baseline under `docs/`. Two governance points worth knowing before reading:

- **Canonical decision log**: [`docs/20-decision-log.md`](./docs/20-decision-log.md). Some historical references say `docs/19-decision-log.md` — those refer to the same file before the path move recorded in [AM-002](./docs/amendments/2026-04-28-decision-log-path-amendment.md).
- **Amendment index**: [`docs/amendments/README.md`](./docs/amendments/README.md). Active divergences from the frozen `docs/00-08` design baseline are recorded as amendments rather than inline edits ([DEC-004](./docs/20-decision-log.md#dec-004frozen-design-docs-amendment-policy)).
- **Frozen design baseline**: `docs/00-project-brief.md` through `docs/08-mvp-plan.md` are Phase-2 design contracts, treated as historical artifacts. New projects initialised via `ocn init` get the SOP v1.1 step layout from the bundled default profile; the OCN repository itself runs against a project-level override per [DEC-003](./docs/20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion).
- **Reports**: [`docs/reports/`](./docs/reports/) — Phase 2 closure, post-alpha P1 fix train (4 reports), Claude Desktop MCP Host validation, alpha.0 / alpha.1 / alpha.2 / beta.0 publish reports, examples F2/F3, beta release marker, bilingual install flow, doc audits, final Codex full-repo audit, post-Codex P1/P2 fix report. Phase 2 baseline lives in [`docs/reports/2026-04-28-phase2-completion-report.md`](./docs/reports/2026-04-28-phase2-completion-report.md).
- **Plans**: [`docs/plans/`](./docs/plans/) holds the planning artifacts for each PR. The active GA Prep plan is [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md).
- **MCP usage**: [`docs/mcp-usage.md`](./docs/mcp-usage.md).

### 9. Development

```bash
npm install
npm run lint           # ESLint (TypeScript-eslint)
npm run typecheck      # tsc --noEmit
npm run test           # vitest run — 459 tests, ~24 s
npm run test:coverage  # adds coverage report
npm run build          # tsc + chmod +x on bin entries
```

The pre-commit hook (Husky 9) runs `lint + typecheck + test` on every commit. CI runs the same checks plus `build` and reports coverage. Hard limits per `CLAUDE.md`: file ≤ 300 lines, function ≤ 50 lines, params ≤ 4, nesting ≤ 3, no raw `any` in exported APIs.

### 10. Roadmap

The GA Prep phase was a documentation, packaging, and operational-readiness audit that ran from Phase 2 closure through the beta candidate preparation track. Most GA Prep PRs are now complete; their evidence lives in [`docs/reports/`](./docs/reports/) and [`docs/20-decision-log.md`](./docs/20-decision-log.md). Original plan: [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md).

**GA Prep PRs (status)**

- **PR A** — Docs numbering reconciliation + amendments index. Complete.
- **PR B** — README first-5-minutes + CLI help copy audit. Iterated through multiple passes; latest bilingual install-flow refresh: [`docs/reports/2026-05-02-readme-install-flow-completion.md`](./docs/reports/2026-05-02-readme-install-flow-completion.md).
- **PR C** — MCP `projectRoot` path-traversal audit + threat-model doc. [`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md) is in the repo; `projectRoot` validator hardened by [P1-001](./docs/reports/2026-04-30-post-alpha-codex-audit.md) (`validateInitializedProjectRoot`).
- **PR D** — External MCP Host validation. Claude Desktop on Windows with WSL2 validated (see [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md) and [DEC-017](./docs/20-decision-log.md)). Cursor and Cline remain unverified in separate future work.
- **PR E** — npm publish gating plan + CI stability audit. Publish discipline: [DEC-008](./docs/20-decision-log.md) / [DEC-012](./docs/20-decision-log.md) / [DEC-015](./docs/20-decision-log.md) / [DEC-016](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md) / [DEC-022](./docs/20-decision-log.md). CI matrix expanded to Node 20 + Node 22 ([report](./docs/reports/2026-05-01-ci-node-22-matrix-expansion.md)). Lock-observability flake hardened ([report](./docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md)).
- **PR F** — `examples/` directory plan. F1 + F2 + F3 complete: [`examples/discovery-to-plan/`](./examples/discovery-to-plan/) is an executable smoke that walks all 10 v1.0 SOP steps ([report](./docs/reports/2026-05-01-examples-discovery-to-plan.md)). F4 (top-level "Try the example" link) is the example reference under §5.
- **Post-Codex audit fix train** — final full-repo Codex audit ([report](./docs/reports/2026-05-02-final-codex-full-repo-audit.md)) and P1/P2 closure ([report](./docs/reports/2026-05-02-post-codex-p1-p2-fix-report.md)). Two P3 polish items remain.

**Execution Navigator MVP series (post-DEC-024)**

- **MVP 1–6 complete** — the six Execution Navigator commands (§6.2) shipped in PRs #63–#68 and merged to main. Cross-cutting review fixes landed in PR #69 ([report](./docs/reports/2026-05-04-execution-navigator-review-fixes-pr-a.md)). Series closure: [`docs/reports/2026-05-04-execution-navigator-verdict-draft.md`](./docs/reports/2026-05-04-execution-navigator-verdict-draft.md).
- Current external package: `0.5.0-beta.2` — Planning Gatekeeper (§6.1) + Execution Evidence Navigator (§6.2) + the Logic Backbone DESIGN gate + the Readiness Backbone cross-cutting gate + the Task Backbone BUILD task ledger.
- **Task Backbone shipped in `0.5.0-beta.0`** — SOP 0.5.0 ([AM-007](./docs/amendments/2026-06-12-task-backbone-amendment.md) / DEC-032): build plans carry machine-parseable Task Spec blocks (`## Task Specs｜任务规格`: goal/traces/touches/verify/dod + optional depends/phase/timeout). The build-plan gate validates six hard defects (duplicate/invalid id, missing field, dangling `traces` → AC ids, dangling `touches` → logic-graph nodes, dangling/cyclic `depends`, zero tasks) and freezes each task's verify-command hash into `.ocoding/task-ledger.json`. Completion is decided only by `ocn task check` rerunning the frozen command (exit 0 → done + `task_completed` audit; drift → refused); `/ocn-next` dispatches the first pending task in `state_build`; `ocn advance` out of BUILD is blocked while tasks are pending. Closes the fourth false-completion class — receipt-only completion (honest-but-empty BUILD receipts that pass every gate; discovered via the Lattice dogfood). Runtime default cut over to 0.5.0 per DEC-032; `ocn sop upgrade` migrates existing projects.
- **Claude Code integration shipped in `0.4.0-beta.2`** — [AM-006](./docs/amendments/2026-06-12-claude-code-agent-integration-amendment.md) / DEC-031: `ocn agent setup` wires hooks + governance contract + `/ocn-next` in one idempotent command; `ocn hook stop|post-edit` carry the enforcement logic inside OCN (fail-open, loop-protected).
- **Readiness Backbone shipped in `0.4.0-beta.1`** — SOP 0.4.0 ([AM-004](./docs/amendments/2026-06-11-readiness-backbone-amendment.md) / DEC-028) adds a role-based cross-cutting readiness gate: 55 falsifiable checks derived from 54 curated IT roles run inside `ocn check` / `ocn gate` / `ocn advance` after the section + logic gates. Open-world semantics (`FAIL` **and `UNKNOWN`** block); verdict ledger persisted to `.ocoding/readiness.json`; `ocn readiness list` / `ocn readiness waive` (waive-with-probe) commands; `ocn sop upgrade` migrates existing projects; runtime default cut over to 0.4.0 per DEC-030.
- **Logic Backbone shipped in `0.3.0-beta.1`** — SOP 0.3.0 adds the DESIGN-phase `docs/07-logic-backbone.md` artifact; `ocn check` machine-validates its computation/decision graph (blocks on missing role, duplicate node id, dangling reference, dependency cycle, orphan node, unbound trigger) and on pass writes `.ocoding/logic-graph.json`, which `ocn brief` summarises as execution order + trigger bindings.
- Still beta, not GA. Validated with Claude Desktop on Windows with WSL2; Cursor and Cline remain unverified.
- Next gate: real external-repo dogfood pass before any further release sync; GA promotion remains gated on its own DEC.

**Beyond GA Prep — not in any current plan; each requires its own DEC entry first**

- `ocn doctor`, `ocn reset`, `ocn baseline`
- SOP versioning / upgrade tooling
- Production / full tier artifact-set enforcement
- Mini-CRM dogfood (Tier 2 GA success criterion)
- HTTP / SSE MCP transport, MCP auth, MCP session management
- Cursor / Cline real-Host validation (each Host needs its own DEC-017-style report)
- GA promotion DEC (final gate tying together Host scope, multi-OS / Node 24+ CI, dogfood evidence)

### 11. License

[Apache-2.0](./LICENSE)

---

# Part 2 · 中文版

OCN（O'CodingNavigator）是一套**本地优先、MCP 优先、状态机驱动**的 AI 编程工作流操作系统。它把 AI 编程从"持续聊天式发挥"重塑成可导航、有门禁、可审计、可复盘的系统工程过程。它是一个 *navigator*，不是 IDE，不是 SaaS，不是项目管理工具。

CLI：`ocn`；MCP server：`ocn-mcp`；许可：Apache-2.0。

### 中文目录

**理解 OCN**
- §A. [OCN 是什么](#a-ocn-是什么)
- §B. [OCN 解决什么问题](#b-ocn-解决什么问题)
- §C. [当前状态](#c-当前状态sop-050任务主干-主干)
   - §C.1 [两阶段产品模型](#c1-两阶段产品模型)

**使用 OCN**
- §D. [安装](#d-安装)
- §E. [5 分钟上手](#e-5-分钟上手)
   - §E.4 [完整操作流程：在 Claude Code 里走完一遍](#e4-完整操作流程在-claude-code-里走完一遍)
   - §E.5 [把 OCN 加入一个进行中的项目](#e5-把-ocn-加入一个进行中的项目)
   - §E.6 [实现阶段：执行证据流](#e6-实现阶段执行证据流)
- §F. [核心 CLI 命令](#f-核心-cli-命令)
   - §F.1 [Planning Gatekeeper 命令](#f1-planning-gatekeeper-命令)
   - §F.2 [Execution Navigator 命令](#f2-execution-navigator-命令)
- §G. [MCP 工具](#g-mcp-工具)

**参考资料**
- §H. [文档地图](#h-文档地图)
- §I. [开发](#i-开发)
- §J. [路线图](#j-路线图)
- §K. [许可](#k-许可)

---

## 理解 OCN

### A. OCN 是什么

OCN 是 AI 编程的本地纪律层。所有数据都跑在你自己的机器上，落到纯文本（Markdown + JSON + JSONL + YAML）。它对人提供一个小型 CLI，对 agent 提供一个小型 MCP server，**没有任何云端组件**。

OCN 把"纪律"产品化：

- **状态机**：DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT，单向推进，不可回退；
- **步骤产物门禁（Step Artifact Gate）**：当前 step 的必填章节缺失时，状态推进被阻断；
- **双轨审计链**：`.ocoding/audit/audit-events.jsonl`（机器源）+ `docs/22-audit-trail.md`（人类可读）；
- **逻辑主干（Logic Backbone，SOP 0.3.0）**：一个 DESIGN 阶段产物，其计算/决策图由机器校验；`ocn check` 会在出现孤儿分值、悬空引用、循环依赖、未绑定触发器时阻断，让系统逻辑在 BUILD 之前就连通；
- **就绪主干（Readiness Backbone，SOP 0.4.0）**：基于角色的横切就绪门禁——从 54 个精选 IT 角色（开发、QA、DevOps、CISO、服务台……）提炼出 55 条可证伪检查，在每个 step 的 `ocn check` / `ocn gate` / `ocn advance` 中运行；采用开放世界语义，`FAIL` 和 `UNKNOWN` 都会阻断（沉默不算通过），在 SHIP 之前拦住"角色盲区式完成"；
- **任务主干（Task Backbone，SOP 0.5.0 新增）**：build plan 携带机器可解析的任务规格块（goal / traces / touches / verify / DoD）；build-plan 门禁校验六类硬缺陷，并把每个任务的验收命令哈希冻结进 `.ocoding/task-ledger.json`；任务只有在 `ocn task check` 重跑冻结命令且退出码为 0 时才算完成，台账未清时 `ocn advance` 不准离开 BUILD——封堵第四类假完成："只有回执的完成"（receipt-only completion）；
- **安全的 MCP 工具面**：agent 可读、可准备、可创建产物，但**不能**推进状态、记录决策、重置项目、强制释放锁。

OCN **不是**：代码生成器、IDE、SaaS、项目管理工具、笔记应用，也不是只会铺脚手架的"文档工厂"。

### B. OCN 解决什么问题

任何稍微复杂的任务，AI 编程 agent 都倾向于踩四类坑：

| 失效模式 | 表现 |
|---|---|
| **迷路（lost）** | 没人——人或 AI——清楚项目当前在哪一步。 |
| **失控（drift）** | Agent 一直在产出，但每一段都离最初需求更远。 |
| **失忆（amnesia）** | 一开新对话，agent 又把上一个对话已经决定的东西重新推一遍。 |
| **假完成（false-completion）** | 文档存在，但缺关键章节；agent 还是宣布"完成"。 |

OCN 把这四个问题视为同一个问题：*AI 编程闭环缺乏严肃的"我们在哪"和"什么算完成"*。OCN 用代码而不是嘴上嘱咐去回答这两个问题。

### C. 当前状态（SOP 0.5.0（任务主干）主干）

| 项目 | 状态 |
|---|---|
| 阶段 | **SOP 0.5.0（任务主干）主干**——Plan → Build → Verify，含机器校验的 DESIGN 逻辑主干门禁、覆盖每个 step 的基于角色的横切就绪门禁（55 条检查），以及把守 BUILD 出口的冻结验收任务台账；plan-to-verify smoke 覆盖全部 20 步 |
| 测试 | 完整 vitest 套件在 Node 20 + Node 22 全部通过 |
| 覆盖率 | 满足发布门 |
| npm | `latest` → `0.5.0-beta.2`；`beta` → `0.5.0-beta.2`；`alpha` → `0.1.0-alpha.2`（历史保留） |
| 成熟度 | **pre-GA beta**——非稳定、非 GA、仅 beta（用于受控测试 / dogfood） |
| 已验证 Host | 已在 Claude Desktop on Windows + WSL2 验证。Cursor 与 Cline 暂未验证。 |
| MCP 传输 | 仅 stdio（HTTP/SSE 尚未启动） |

> **2026-05-04 republish 说明**：以 `0.2.0-beta.2` 重新发布，目的是把 `0.2.0-beta.1` 打包之后才合入的 Execution Navigator 命令（`exec status`、`github analyze-pr`、`evidence map`、`next-prompt`、`verify status`、`verdict draft`）真正包进 npm artifact。README 文档与已发布的 CLI 现在保持一致。

#### C.1 两阶段产品模型

OCN 现在分为两个衔接阶段：

1. **Planning Gatekeeper**：在实现前锁定范围、架构、验收与 build plan。驱动 `state_discovery` → `state_plan`，把守 artifact 完整度，对应 §F.1 的命令面。
2. **Execution Evidence Navigator**：在实现过程中读取 git、GitHub PR、验收证据与验证信号。新加 6 条只读命令（§F.2）汇总这些证据，并产出下一条 agent prompt、验证就绪信号与最终 verdict 草稿。这些命令永不写状态、永不调 LLM、永不跑 mutating 的 `npm` / `gh` 命令。

两个阶段是衔接的：planning 阶段的 artifact（00–10）必须先过门禁，execution 阶段的 `evidence map`、`verify status`、`verdict draft` 才能读到有意义的输入。权威 reframe：[DEC-024](./docs/20-decision-log.md)。系列收口报告：[`docs/reports/2026-05-04-execution-navigator-verdict-draft.md`](./docs/reports/2026-05-04-execution-navigator-verdict-draft.md)。

**已实现**

- **CLI**：`init`、`status`、`brief`、`doc create`、`check`、`gate`、`advance`（完整列表见 §F）。
- **状态机**：8 个状态，单向推进；DISCOVERY → PLAN 已挂上稳定 ID 的 step，BUILD/VERIFY/SHIP/REFLECT 仅有 state ID。
- **步骤产物门禁**：基于 NFKC 标准化的双语 `Title｜标题` 标题匹配。
- **状态安全**：`.ocoding/.lock`（5 秒超时 + 陈旧锁回收）、`state.json.bak` 滚动备份、临时文件 + atomic rename 写入；并发 `advance` 竞态已在 post-Codex P1 修复中关闭。
- **审计**：双轨持久化、16 种事件类型、`correlationId` 串联整条 `ocn advance` 事件链。
- **MCP 安全工具**：stdio 上 7 个只读/准备/创建/日志类工具，4 个禁用工具不会被注册（详见 §G）；`projectRoot` 校验器 + 威胁模型（[`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md)）。
- **真实 Host 验证**：Claude Desktop on Windows + WSL2 已完成端到端验证（[DEC-017](./docs/20-decision-log.md)、[报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)）。
- **可执行示例**：[`examples/discovery-to-plan/`](./examples/discovery-to-plan/)，`scripts/smoke.sh` 跑完 v1.0 SOP 全部 10 个 step；fixture 直接来源于 `src/core/templates/*.ts`，避免漂移。
- **npm 发布纪律**：SOP 0.5.0 主干以 `o-coding-navigation@0.5.0-beta.2` 形式发布，遵循严格的预发布清单与 `prepublishOnly` 门，`files` allowlist 收敛到 `dist/` + LICENSE + README + `docs/quickstart.md` + `docs/mcp-usage.md`；`latest` 与 `beta` 都指向 `0.5.0-beta.2`，`alpha` 仍保留在 `0.1.0-alpha.2`；`v0.5.0-beta.2` 为带注释的 git tag + GitHub pre-release。

**尚未实现（刻意延后，详见 §J）**

`ocn doctor`、`ocn reset`、`ocn baseline`、SOP 版本/升级工具、`production`/`full` tier、mini-CRM dogfood、Cursor/Cline 真实 Host 验证（[DEC-019](./docs/20-decision-log.md)）、远程 MCP 传输、MCP 鉴权。

---

## 使用 OCN

### D. 安装

#### D.1 推荐：从 npm 安装

```bash
npm install -g o-coding-navigation
```

从 v0.5.0-beta.2 开始，npm latest 与 beta 均指向 SOP 0.5.0（任务主干）版本。

安装后验证：

```bash
ocn --version       # 0.5.0-beta.2
ocn --help
ocn-mcp             # 启动 MCP stdio server；按 Ctrl+C 退出
```

如果希望明确固定在 beta 预发布通道，可以使用 @beta：

```bash
npm install -g o-coding-navigation@beta
```

卸载：`npm uninstall -g o-coding-navigation`。

#### D.2 当前已发布的渠道

| 渠道 | 版本 | npm tag | 说明 |
|---|---|---|---|
| `latest`（推荐） | `0.5.0-beta.2` | `latest` | SOP 0.5.0（任务主干）主干。 |
| Beta（显式预发布通道） | `0.5.0-beta.2` | `beta` | 与 `latest` 同一份产物；想明确固定在预发布通道时使用 `@beta`。 |
| Alpha（仍可用） | `0.1.0-alpha.2` | `alpha` | 之前的 pre-GA 通道；仅作历史保留。 |

包主页：https://www.npmjs.com/package/o-coding-navigation

**前置依赖**：Node.js ≥ 20（参见 `package.json` 的 `engines`）。

> **pre-GA 警告**：当前是 **pre-GA beta**——仅 beta，用于受控测试 / dogfood，非 GA。已在 Claude Desktop on Windows + WSL2 验证。Cursor 与 Cline 暂未验证。

#### D.3 备选：从源码本地开发

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link              # 把 `ocn` 和 `ocn-mcp` 暴露到 PATH
```

卸载本地链接：`cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`。

不想用 `npm link` 也可以直接 `node /path/to/O-CodingNavigation/dist/cli/index.js …`。

### E. 5 分钟上手

#### E.1 最小可行流程

```bash
mkdir ocn-demo && cd ocn-demo

ocn init                        # 创建 .ocoding/ 与 docs/
ocn status                      # state_discovery / step_project_brief

ocn doc create project-brief    # 写出 docs/00-project-brief.md（模板）
# 然后编辑该文件，把 4 个必填章节填好：
#   Problem · Goal · Users · Success Criteria

ocn gate                        # 只读校验，确认门禁通过
ocn advance                     # 跑门禁 + 改状态 + 写审计链
ocn status                      # 已推进到 state_discovery / step_scope

ocn brief                       # 给接管的 AI agent 输出当前 step brief
```

#### E.2 每条命令的预期产出

- `init` 写入 `.ocoding/state.json`、`.ocoding/sop.yaml`、双轨审计文件，以及 `docs/` 骨架。
- `status` 报告 `currentStateId: state_discovery` / `currentStepId: step_project_brief`。
- `doc create` 写出 `docs/00-project-brief.md`，包含双语章节标题。
- `gate` 在 4 个必填章节齐备后返回 `OK`（exit 0），否则返回 `ERR_GATE_FAILED`（exit 1）并列出缺的章节。
- `advance` 会写一整条带 `correlationId` 的审计事件链：`advance_started → artifact_gate_run → artifact_gate_passed → state_transitioned → state_write_succeeded → advance_succeeded`。
- `brief` 输出当前 step 的必填章节 + AI 治理提醒，让接管的 agent 不必重读全部文档。

更详细的 walkthrough 见 [`docs/quickstart.md`](./docs/quickstart.md)，含期望文件树和常见报错。

#### E.3 跑可执行示例

仓库自带一个端到端可执行示例 [`examples/discovery-to-plan/`](./examples/discovery-to-plan/)：

```bash
npm run build
bash examples/discovery-to-plan/scripts/smoke.sh
```

该 smoke 在临时目录里走完 v1.0 SOP 全部 10 个 step，最后打印 `Discovery-to-plan smoke completed.`，不会污染你的环境。

#### E.4 完整操作流程：在 Claude Code 里走完一遍

OCN 是 MCP-first 设计。在 Claude Code（或其它接好 `ocn-mcp` 的 MCP host，如 Claude Desktop）里，你**几乎不需要记命令**——你说自然语言，AI 调对应的 OCN MCP 工具，流程自动跑通。**整个流程里唯一必须你亲自敲终端的是状态推进那一步**——这是 OCN 设计上的护栏，不是 bug。

> 前提：已按 §G.1 把 `ocn-mcp` 接入。当前经过端到端验证的 host 路径是 Claude Desktop on Windows + WSL2（[DEC-017](./docs/20-decision-log.md)）；其它 MCP host 流程相同但暂未独立验证（[DEC-019](./docs/20-decision-log.md)）。

下面把整个流程拆成 8 步。每一步给你三件事：**你说什么 → AI 背后做什么 → 你看到什么**。

---

##### 阶段一：一次性初始化（每个项目做一次）

**第 1 步：初始化 OCN**

- **你说**：「帮我在当前目录初始化 OCN 项目。」
- **AI 做**：用 Bash 工具跑 `ocn init`（init 不是 MCP 工具，必须 shell out）。
- **你看到**：`.ocoding/` 与 `docs/` 已创建；项目初始化在 `state_discovery / step_project_brief`。

**第 2 步：确认位置**

- **你说**：「OCN 现在在哪一步？」
- **AI 做**：调 MCP 工具 `navigator.where_am_i`。
- **你看到**：当前 state、当前 step、产物路径、下一步建议动作。

---

##### 阶段二：单 step 循环（每个 step 重复一遍）

> 假设当前停在 `step_project_brief`。第 3–8 步走完才进入下一个 step；下一 step 也是同一套循环。

**第 3 步：拿这一步的 brief**

- **你说**：「告诉我现在这一步该做什么。」
- **AI 做**：调 MCP 工具 `navigator.brief`。
- **你看到**：当前 step 的必填章节、AI 治理提醒、不确定性策略——这些会进入 AI 的上下文，后面它写产物时会自觉遵守。

**第 4 步：建产物模板**

- **你说**：「帮我建当前 step 的产物模板。」
- **AI 做**：调 MCP 工具 `navigator.create_artifact`，type=`project-brief`。
- **你看到**：`docs/00-project-brief.md` 已写出，含双语章节占位。

**第 5 步：把产物写完**

- **你说**：「按 brief 要求，把这一步的产物写好。我们项目是 [简单介绍]。」
- **AI 做**：根据 brief 的必填章节 + 你的描述，直接用 Edit 工具改 `docs/00-project-brief.md`，把 Problem / Goal / Users / Success Criteria 四个章节填满。
- **你看到**：填好的 markdown。让它继续改，直到你满意。

**第 6 步：验产物合不合格**

- **你说**：「验证一下这一步的产物。」
- **AI 做**：调 MCP 工具 `navigator.run_gate`。
- **你看到**：通过 → AI 告诉你「门禁通过」；不通过 → AI 列出缺哪些章节，问你要不要它补。不通过就回第 5 步，直到通过。

**第 7 步：你亲自敲 `ocn advance`**

> ⚠️ 这是整套流程里 **唯一必须你自己做** 的事，AI 帮不了你。

第 6 步通过后，一个守纪律的 AI 会告诉你：

> 「门禁通过。要推进，请你在终端运行：`ocn advance`」

为什么 AI 不直接帮你跑？两条原因，缺一不可：

1. **MCP 不暴露 advance。** `navigator.advance_phase` 是 §G.3 列出的 4 个**永不暴露**的工具之一。从 MCP 这条路，AI 没有这个工具。
2. **OCN 的 AI 治理规则把 advance 锁成人类专属。** 状态推进 = 项目里程碑 = 「我们正式进入下一阶段」——这种话只能由人来说。让 AI 自己说，OCN 就退化成另一个会幻觉的脚手架。

所以你打开终端，打：

```bash
ocn advance
```

`advance` 内部会再跑一次门禁、通过则带锁 + 备份 + 原子写更新 `state.json`、写入完整带 `correlationId` 的审计事件链。

> 如果你不想切到终端，**显式**让 AI 替你按按钮也可以：
> 「替我跑 `ocn advance`。」
> 这仍然是 **你的决策**，AI 只是替你执行 Bash。**关键差异**：AI 不能在第 6 步通过后**自己接着跑**——它必须等你明确开口。

**第 8 步：回到第 3 步**

- **你说**：「OCN 现在在哪一步？」
- **AI 做**：调 `navigator.where_am_i`。
- **你看到**：新 step（如 `step_scope`）。

然后从 **第 3 步** 重复：拿新 step 的 brief、建产物、写、验、advance。每个 step 都是这一套，直到 OCN 报告项目走完。

---

##### 速查表：你说的话对应哪个工具

| 你说什么 | AI 背后用 | 是否改 state.json |
|---|---|---|
| "OCN 在哪一步？" | `navigator.where_am_i`（MCP，只读） | 否 |
| "拿一下当前 step 的 brief" | `navigator.brief`（MCP，只读） | 否 |
| "建产物模板" | `navigator.create_artifact`（MCP） | 否（只写 `docs/`） |
| "把这一步的产物写好" | AI 自己的 Edit 工具改 `docs/` | 否 |
| "验证一下产物" | `navigator.run_gate`（MCP，只读） | 否 |
| **"我自己跑 `ocn advance`"** | **`ocn advance` CLI（Bash，你触发）** | **✅ 是** |

---

##### 两条硬规则

**(1) `navigator.run_gate` pass ≠ 状态推进。**
`run_gate` 只读，跑出 pass 不会让 OCN 自动进入下一 step。推进只能靠你敲 `ocn advance`。如果 AI 跑完 `run_gate` 就宣称「我们进入下一步了」——它在骗你，`state.json` 根本没动。

**(2) AI 永远不会主动 advance。**
这是设计。一个守纪律的 Claude Code 在第 6 步通过后只会说：「门禁通过了，请你跑 `ocn advance`。」如果它没说就自己跑了——它绕过了 OCN 的纪律护栏。这种「自己往前冲」的行为，恰好就是 OCN 想消灭的「失控（drift）」失效模式。

这就是 OCN 卖的东西——**纪律**。

#### E.5 把 OCN 加入一个进行中的项目

> 适用场景：项目已经在跑——代码写了一半、PRD 在 Notion 上、AC 散在 Slack 里、决策记录靠回忆。现在你想把 OCN 的纪律层补上。

---

##### 一个必须先承认的事实：OCN 不从你"现在的真实进度"开始

OCN 的状态机起点**永远**是 `state_discovery / step_project_brief`。当前版本**没有** `--skip-to` 或 `--start-at` 选项，也不暴露 advance 时的 `--override`。

这是设计，不是限制。OCN 的价值在于强迫你显式回答「我们到底要做什么」「什么算完成」——如果让你直接跳到 BUILD，那 OCN 的 brief、门禁、审计就全是无源之水，跟没装一样。

所以加入中途的项目，**唯一正路是回填**。好消息是：内容你都有，只是搬到 OCN 的结构里。

---

##### `ocn init` 与已有文件：硬保证

加入中途项目最容易担心的一件事：**`ocn init` 会不会覆盖我现有的代码或文档？**

答：**不会**。源码层面的两条硬保证（已对照 `src/core/init.ts` 与 `src/core/artifact/template-writer.ts` 验证）：

1. **`ocn init` 只在 `.ocoding/` 下写 OCN 自己的状态文件**（`state.json`、`sop.yaml`、`gates.yaml`、`artifacts.yaml`、`config.yaml`），并 `mkdir docs/`。它**不写**任何 `docs/XX-*.md` 产物文件，也不动你的 `src/`、`README.md`、其它任何路径。
2. **如果项目已经初始化过**（`.ocoding/state.json` 已存在），`ocn init` 会**拒绝执行**并返回 exit 4（`ERR_IO_OR_CONFIG`），消息：「OCN is already initialized in this directory. / 当前目录已经初始化过 OCN。」——绝不覆盖你已有的 OCN 状态。

类似地，**`ocn doc create <type>`** 也默认拒绝覆盖：撞名时返回 exit 4，消息：「`<type>` already exists at `<path>`. Use `--overwrite` to replace it.」要替换必须显式加 `--overwrite`。

所以你可以放心在已有项目根目录直接跑。最坏情况是你已经有 `docs/00-project-brief.md`——这时 `ocn doc create project-brief` 会拒绝写，你有两个选择：
- 把已有内容**手动合并**进 OCN 模板（保留 OCN 模板的双语章节标题 `Title｜标题`——它们是门禁的匹配锚点）。
- 给已有文件改名备份（如 `docs/00-project-brief.legacy.md`），再跑 `ocn doc create project-brief` 让 OCN 写新模板，然后把原内容粘回 OCN 模板章节里。

---

##### 推荐路径：把已有材料"灌入" OCN 的早期 step

**第 1 步：在项目根目录初始化**

- **你说**：「在当前目录初始化 OCN。」
- **AI 做**：用 Bash 跑 `ocn init`。
- **你看到**：`.ocoding/` 创建（`docs/` 也被 mkdir）；状态在 `state_discovery / step_project_brief`。你现有的代码和文档原封不动。

**第 2 步：把项目上下文一次性喂给 AI**

- **你说**：「这是我们项目现状。PRD 在 [Notion 链接 / 文件路径]。AC 我贴在下面。当前代码在 `src/`，已经做完 [X 模块] 还要做 [Y]。架构是 [简述]。我现在要把这些灌进 OCN 的早期 step。」
- **AI 做**：吸收上下文，准备后面每个 step 直接复用。
- **你看到**：AI 复述项目状况，确认它理解到位。

**第 3 步：逐 step 回填**

每个 step 都走 §E.4 第 3–8 步循环（拿 brief → 建模板 → AI 据已有材料填 → `run_gate` → **你**敲 `ocn advance`）。区别是：因为内容已存在，AI 主要做"重组"和"格式对齐"，不是"创造"。

SOP 0.5.0 的 20 个 step 全有 `doc create` 模板。下表把每个 step 对应的产物路径，以及**在你已有项目里去哪找这部分内容**列出来：

**DISCOVERY 阶段**

| step | 产物 | 在你已有项目里去哪找 |
|---|---|---|
| `step_project_brief` | `docs/00-project-brief.md` | 项目立项 PRD、Notion 项目主页、给投资人 / 老板的一页纸介绍 |
| `step_scope` | `docs/01-scope.md` | 路线图、Linear / Jira 的 epic 列表、"v1 / v2 不做什么"的内部对齐文档 |

**SPEC 阶段**

| step | 产物 | 在你已有项目里去哪找 |
|---|---|---|
| `step_prd` | `docs/02-prd.md` | Notion / 飞书 / Confluence 上的 PRD，重新组织进 OCN 章节结构 |
| `step_acceptance_criteria` | `docs/03-acceptance-criteria.md` | Slack 上的 AC 讨论、bug ticket 里的"应该…"、QA 测试用例描述，整理成 Given/When/Then |

**DESIGN 阶段**

| step | 产物 | 在你已有项目里去哪找 |
|---|---|---|
| `step_technical_architecture` | `docs/04-technical-architecture.md` | `package.json` / `requirements.txt` / `go.mod`、部署架构图、技术选型记录 |
| `step_information_architecture` | `docs/05-information-architecture.md` | 已有 sitemap、URL 路由表、菜单层级、产品截图 |
| `step_data_model` | `docs/06-data-model.md` | `schema.sql`、Prisma schema、ORM models、ER 图、数据库迁移文件 |
| `step_api_contract` | `docs/07-api-contract.md` | OpenAPI / Swagger spec、Postman collection、router 代码、`@RestController` 注解 |
| `step_test_strategy` | `docs/08-test-strategy.md` | `tests/` 目录结构、CI 配置（`.github/workflows/`）、覆盖率目标、E2E 框架选择 |
| `step_logic_backbone` | `docs/07-logic-backbone.md` | 已有的打分/决策/规则逻辑、公式定义、信号→动作映射 |

**PLAN 阶段**

| step | 产物 | 在你已有项目里去哪找 |
|---|---|---|
| `step_mvp_plan` | `docs/09-mvp-plan.md` | 已有路线图、kanban、Linear/Jira epic、Phase 0/1/2 划分 |
| `step_build_plan` | `docs/10-build-plan.md` | 当前 sprint 计划、待办列表、近期 PR 计划 |

**BUILD 阶段（通常是回顾性回填）**

| step | 产物 | 在你已有项目里去哪找 |
|---|---|---|
| `step_implementation_log` | `docs/11-implementation-log.md` | `git log`、已合并的 PR 标题与摘要 |
| `step_change_evidence` | `docs/12-change-evidence.md` | 已部署的变更、CHANGELOG.md、release notes 草稿 |
| `step_integration_notes` | `docs/13-integration-notes.md` | 第三方 API 接入笔记、SDK 调用样例、集成测试结果 |

**VERIFY 阶段**

| step | 产物 | 在你已有项目里去哪找 |
|---|---|---|
| `step_verification_report` | `docs/14-verification-report.md` | 已跑过的 QA 报告、性能测试结果、用户验收记录 |
| `step_acceptance_mapping` | `docs/15-acceptance-mapping.md` | AC 与代码 / 测试的对应表（往往要新整理） |
| `step_failure_fix_log` | `docs/16-failure-fix-log.md` | bug 修复记录、incident 报告、postmortem |
| `step_regression_evidence` | `docs/17-regression-evidence.md` | 回归测试结果、CI 历史绿灯记录 |
| `step_final_build_verdict` | `docs/18-final-build-verdict.md` | 最终发布判定（一般要新写） |

**第 4 步：到了你"真实的"当前位置**

回填到你"真正在做"的 step 时（比如你已经写了一半代码，正在 `step_implementation_log`），你不是从空白开始——已写的代码、已合并的 PR 就是这一步的产物来源。从这里开始，**新**的工作全部走 OCN 的纪律：每个新功能先有 step、再有产物、再写代码。

之前的"无政府期"作为历史快照，被忠实地保留在回填的 artifact 里。

---

##### 三个常见的「我能不能…」

**Q：能不能跳过早期 step，直接从 BUILD 开始？**
A：当前版本不暴露这种跳跃。两个选择：
- **诚实回填**（推荐）——把前面 step 用已有材料填好。
- **薄占位**（不推荐）——写仅满足必填章节的最小占位让门禁过。这等于让 OCN 闭眼放行，等于你白装。

**Q：我已有的 docs/ 编号会不会跟 OCN 撞？**
A：OCN 占用 `00-project-brief.md` 到 `18-final-build-verdict.md` 这一段编号。撞名时 `ocn doc create` 会**拒绝写并返回 exit 4**，不会覆盖你已有内容。处理方式：把已有文件改名备份（如 `docs/02-prd.legacy.md`），再 `ocn doc create prd`，把原内容合并进 OCN 模板。OCN 模板里的双语章节标题（`Title｜标题`）必须保留——它们是门禁的匹配锚点。

**Q：能不能让 AI 一次性把全部早期 step 跑完？**
A：技术上可以。你说一句：

> 「按我提供的材料，把 `step_project_brief` 到 `step_technical_architecture` 全部 artifact 填好并验证。每个 step 验证通过后告诉我，我自己敲 advance。」

AI 会循环走 `doc create → 编辑 → run_gate`，每个 step 跑完 `run_gate` pass 后**停下来等你敲 `ocn advance`**。每一次 advance 仍是你的决策——这是设计，批量回填不能让 AI 替代人的"我们进入下一阶段"决策。

---

##### 一个最小回填例子

假设你已有：
- 一个跑了 3 个月的 React + Node.js 项目，代码在 `src/`
- 半页 Notion 立项文档
- Slack 里散落的 AC 讨论

灌入 OCN 大概这样跑（实际对话节奏会更密，下面只展示骨架）：

> **你**：「把当前目录初始化为 OCN 项目。」
> **AI**：跑 `ocn init`。状态：`state_discovery / step_project_brief`。`src/` 和已有文件没动。
>
> **你**：「项目背景：[贴 Notion 立项文档]。请按 brief 填 `docs/00-project-brief.md`。」
> **AI**：调 `navigator.brief` → 拿必填章节（Problem / Goal / Users / Success Criteria）→ 用 Edit 改 `docs/00-project-brief.md`。
>
> **你**：「验证。」
> **AI**：调 `navigator.run_gate` → pass。
> **AI**（守纪律）：「门禁通过。请你跑 `ocn advance`。」
>
> **你**（终端）：`ocn advance`。
>
> **你**：「scope 这步：v1 已经做完 [X/Y/Z]，还在做 [A]，明确不做 [B/C]。填 `docs/01-scope.md`。」
> **AI**：循环……
>
> **你**：「prd 用 Notion 那份重组进来：[贴链接]。」
> **AI**：循环……
>
> **你**：「ac 用这些 Slack 摘录：[贴]。Given/When/Then 化。」
> **AI**：循环……
>
> *（DESIGN 阶段：data-model 用 `prisma/schema.prisma`、api-contract 用 router 代码、technical-architecture 用 `package.json` + 部署图。）*
>
> *（BUILD 阶段：implementation-log 让 AI 从 `git log` 摘。change-evidence 从 PR 摘。）*

走完后，新的工作全部从 OCN 的下一 step 开始——**每个新功能都有 brief、有门禁、有审计**。

#### E.6 实现阶段：执行证据流

planning 阶段的 artifact（00–10）跑过门禁、项目进入实现阶段后，Execution Navigator 命令接力。它们都是只读的"汇总器"——帮你和 agent 看清 repo、PR、验收证据、验证信号到底是什么状态。

1. 先把 planning 阶段的 artifact 写完（上一节流程）——`state_plan` 的 artifact（00–10）是实现的门禁。
2. 在你日常的 repo 流程里推进实现（你的 IDE、agent 等）。
3. 实现过程中，用 §F.2 的 Execution Navigator 命令读证据：
   ```bash
   ocn exec status                              # 本地 git + OCN 状态快照
   ocn github analyze-pr <n>                    # GitHub PR 分析（已开 PR 时）
   ocn evidence map --pr <n>                    # AC 覆盖度
   ocn next-prompt --agent claude               # 下一条 agent brief
   ocn verify status --mode combined --pr <n>   # 验证就绪度
   ocn verdict draft --mode combined --pr <n>   # 证据驱动的 verdict 草稿
   ```
4. 合入前看一眼证据和 verdict 草稿——verdict 是保守的：`ready-to-merge` 要求所有信号一致（验证 ready、PR 干净、AC 覆盖、无失败 check、无 changes-requested）。

### F. 核心 CLI 命令

所有命令都接受 `--json`，输出机器可读的 `CommandResult`。退出码是稳定契约：

| 退出码 | 含义 |
|---|---|
| `0` | OK |
| `1` | 门禁未通过 |
| `2` | 产物缺失或非法 |
| `3` | 状态机错误 |
| `4` | 配置/锁/IO 错误 |
| `5` | SOP 版本不兼容 |

#### F.1 Planning Gatekeeper 命令

| 命令 | 用途 | 读/写 | 审计输出 |
|---|---|---|---|
| `ocn init [--tier minimal] [--json]` | 在当前目录初始化 OCN 项目。 | 写 `.ocoding/`、`docs/` 与双轨审计文件。 | `project_initialized` + state-write 事件 |
| `ocn status [--json]` | 显示当前 state、当前 step、当前 step 产物的相对路径，以及下一步动作提示。 | 只读。 | 无（避免 pull 模式刷日志） |
| `ocn brief [--json]` | 输出当前 step 的 brief：必填章节、治理提醒、不确定性策略。 | 只读。 | 无（pull 模式） |
| `ocn doc create <type> [--overwrite] [--json]` | 用内置模板生成 20 类产物之一（撞名时拒绝写入，需显式 `--overwrite` 才覆盖）。 | 在 `docs/` 写产物。 | `artifact_created` |
| `ocn check [--json]` | 检查当前 step 的产物是否满足必填章节。 | 只读。 | `artifact_gate_run` + `artifact_gate_passed` / `artifact_gate_blocked` |
| `ocn gate [--json]` | 当前 step 的只读门禁聚合。和 `check` 输出相同；不改状态。 | 只读。 | `artifact_gate_*`（无 `correlationId`） |
| `ocn advance [--json]` | 跑门禁，通过后推进到下一 step。带锁保护，永不部分写入。 | 原子写 `state.json`。 | 完整 advance 事件链，共享 `correlationId` |
| `ocn sop upgrade [--target <version>] [--plan] [--json]` | 把项目锁定的 SOP profile 向前迁移到更新的内置版本（只能向前；保留 `config.yaml`）。`--plan` 为只读 dry-run。 | apply 重写 `.ocoding/` 快照 + `state.json`（原子、带锁保护）；`--plan` 不写任何文件。 | `sop_upgraded`（apply）/ `sop_version_diff_detected`（plan） |
| `ocn rewind --to <stepId> --reason <text> [--json]` | 把游标拨回本轮中严格更早的一步（DEC-033 / AM-008）。`--reason` 必填；docs/ 产物一律不动；回拨零豁免——之后每次 advance 重过完整门禁。**里程碑循环**（分阶段项目，如 P0→P4 各配 go/no-go）：每个里程碑裁定后回拨到 `step_build_plan`，**追加**下一阶段 Task Specs（已完成任务规格原文保留——verify 命令一字不动 ⇒ 哈希不变 ⇒ done 保留），重过门禁——台账即成为项目级累积进度账。人类专属——不暴露 MCP。 | 写 `state.json`（原子、带锁；`latestGateResult` 置空）。 | `cursor_rewind`（成功与失败） |
| `ocn cycle new --yes [--json]` | 把本轮运行时状态归档至 `.ocoding/cycles/<n>-<ts>/` 并从首步重开新一轮（DEC-033 / AM-008）。docs/ 保留供下一轮门禁快进；pin 与用户所有的 `config.yaml` 不变；审计 JSONL 不随轮归档——单链贯穿所有轮次。`--yes` 强制。在本轮完成边界（01 范围）达成时使用——轮内的逐里程碑迭代属于 `ocn rewind` 的职权。人类专属——不暴露 MCP。 | 运行时文件移入归档；重写快照 + `state.json`。 | `cycle_started`（成功与失败） |
| `ocn readiness list [--json]` | 按当前 state/tier 评估全部就绪检查，输出判定表（PASS/WAIVED/FAIL/UNKNOWN/NA 计数 + 阻断项）。 | 只读。 | 无（pull 模式——避免刷审计日志） |
| `ocn readiness waive <checkId> --reason <r> --probe <cmd> [--json]` | 授予条件豁免（"带探针豁免"）：探针在授予时必须通过，每次跑门禁都会重新验证，项目离开当前 state 时豁免失效。仅限人工操作——永不通过 MCP 暴露。 | 把豁免写入 `.ocoding/readiness.json`。 | `readiness_waived` |
| `ocn task list [--json]` | 列出 build plan 任务台账：每个任务的状态（pending/done）、冻结的验收命令、依赖/阶段信息。 | 只读。 | 无（pull 模式） |
| `ocn task check [<id>] [--json]` | 跑该任务冻结的验收命令——退出码 0 才标记完成；验收命令与冻结哈希不一致时拒绝执行。仅限人/agent 经 CLI 调用——永不通过 MCP 暴露。 | 写 `.ocoding/task-ledger.json`。 | `task_completed` |
| `ocn agent setup [--force] [--json]` | 一条命令完成 Claude Code 接线（AM-006）：`.claude/settings.json` 写入 Stop/PostToolUse 钩子（仅合并、带 `command -v ocn` 守卫）、`.claude/ocn.md` 治理契约、`CLAUDE.md` 追加导入（仅一次）、`/ocn-next` 斜杠命令。幂等；仅限人工。 | 写入/合并四个 `.claude` 文件面；永不覆盖用户已有条目。 | `agent_setup_completed` |
| `ocn hook stop` / `ocn hook post-edit` | 机器侧 Claude Code 钩子处理器（由 agent 宿主调用，非人工）：`stop` 在 agent 想结束回合时重跑门禁、不过则带 fix hints 顶回；`post-edit` 跑 `commands.lint`/`typecheck` 给即时反馈。设计为 fail-open。 | 原始钩子契约 IO（stdin JSON 入；block JSON / exit 2 + stderr 出）。 | 经复用的 check 引擎产生门禁审计事件 |

`doc create` 的 `<type>`（SOP 0.5.0 为全部 20 个 step 都提供了模板）：
`project-brief`、`scope`、`prd`、`acceptance-criteria`、`technical-architecture`、
`information-architecture`、`data-model`、`api-contract`、`test-strategy`、`logic-backbone`、
`mvp-plan`、`build-plan`、`implementation-log`、`change-evidence`、`integration-notes`、
`verification-report`、`acceptance-mapping`、`failure-fix-log`、`regression-evidence`、
`final-build-verdict`。

`init` 的 `--tier`：`minimal`、`production`、`full`，目前只对 `minimal` 强制约束（`production` / `full` 接受参数但产物集合尚未差异化）。

#### F.2 Execution Navigator 命令

planning 门禁之外，OCN 现在还能读"实现期证据"（git、GitHub PR、AC、package scripts），并产出确定性汇总——不调 LLM、不写状态、实现内部不跑 `npm run`。这些命令在实现与评审阶段（`state_plan` 关闭之后）有用。权威 reframe：[DEC-024](./docs/20-decision-log.md)。系列收口：[`docs/reports/2026-05-04-execution-navigator-verdict-draft.md`](./docs/reports/2026-05-04-execution-navigator-verdict-draft.md)。

| 命令 | 用途 | 典型用法 |
|---|---|---|
| `ocn exec status [--json]` | 读取本地 git 证据 + OCN 项目状态。 | branch、head、dirty/clean、变更文件、近期 commit、当前 state/step 的快照。 |
| `ocn github analyze-pr <n> [--json]` | 通过 `gh` CLI 做只读 GitHub PR 证据分析。 | PR metadata、变更文件、commit、checks、reviews——不写。 |
| `ocn evidence map [--json] [--pr <n>]` | 把 AC 映射到可用证据。 | 每条 AC 状态：`evidence-found` / `evidence-candidate` / `missing-evidence` / `needs-human-review`。 |
| `ocn next-prompt [--json] [--agent ...] [--mode ...] [--pr <n>] [--issue ...]` | 生成下一条确定性 agent 任务 brief。 | 9 个固定段：objective、evidence、allowed work、forbidden actions、verification commands、stop conditions。 |
| `ocn verify status [--json] [--mode ...] [--pr <n>]` | 汇总验证就绪度与缺失信号。 | 状态 `ready` / `partial` / `blocked` / `pending` / `no-verification-data`，含必跑命令与风险旗标。 |
| `ocn verdict draft [--json] [--mode ...] [--pr <n>]` | 输出基于证据的最终判定草稿。 | 类别 `continue-work` / `request-changes` / `ready-for-review` / `ready-to-merge` / `hold-for-manual-review`，含按字典序排序的 supports / blocks / warnings。 |

6 条命令按设计都是只读的：不写 `.ocoding/`、`docs/`、任何项目文件；不做 git 写操作；gh 仅 `pr view` / `auth status`；不调 LLM。`--mode` 可选 `local | pr | combined`；`--pr <n>` 在 `pr` / `combined` 模式下启用 GitHub 证据。各 MVP 实现报告见 [`docs/reports/2026-05-02-execution-navigator-*.md`](./docs/reports/) 与上面的收口报告。

#### F.3 Claude Code 集成——一条命令（AM-006 / DEC-031）

```bash
ocn agent setup      # 幂等；提交 .claude/ 与 CLAUDE.md 即可全队共享
```

把整套第二阶段 runbook 机械化接线：**Stop 钩子**在 agent 想结束回合时重跑 `ocn check`（不过则把 fix hints 顶回去继续修；带防环旗标、fail-open），**PostToolUse 钩子**在每次 Edit/Write 后跑你在 `.ocoding/config.yaml` 配置的 `commands.lint`/`commands.typecheck`，**`.claude/ocn.md` 治理契约**经 CLAUDE.md 导入随每个会话加载，**`/ocn-next`** 自动注入 `ocn brief` + `ocn next-prompt` 并开始任务。钩子命令带 `command -v ocn` 守卫，没装 ocn 的队友完全不受影响。接线后每个任务人只剩两个动作：Claude Code 里 `/ocn-next` → 终端里 review + `ocn advance`。

### G. MCP 工具

OCN 的 MCP server（`ocn-mcp`）通过 stdio 暴露 7 个工具。**唯一已验证的 Host 路径是 Windows + WSL2 + Claude Desktop**（[DEC-017](./docs/20-decision-log.md)、[报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)）。Cursor 与 Cline 都支持 MCP，但暂未对 OCN 完成验证（[DEC-019](./docs/20-decision-log.md)）；在它们各自的验证报告落地之前，**不要把它们当作正式支持路径**。

#### G.1 接入 Windows + WSL2 中的 Claude Desktop

在 Windows 中编辑 `%APPDATA%\Claude\claude_desktop_config.json`，并入：

```json
{
  "mcpServers": {
    "ocn": {
      "command": "wsl.exe",
      "args": ["-e", "ocn-mcp"]
    }
  }
}
```

如果 WSL2 里 `ocn-mcp` 不在 `PATH` 上，把 `"ocn-mcp"` 替换成 `which ocn-mcp` 输出的绝对路径（通常是 npm 全局 bin，如 `/home/<user>/.npm-global/bin/ocn-mcp`）。保存后**完全退出**（含系统托盘）再重启 Claude Desktop，工具面板里应当看到 7 个 `navigator.*` 工具。

完整接入说明与每个工具的输入/输出 envelope：[`docs/mcp-usage.md`](./docs/mcp-usage.md)。验证当时的实际记录见 [`docs/reports/2026-04-30-mcp-external-host-validation-report.md`](./docs/reports/2026-04-30-mcp-external-host-validation-report.md)。

#### G.2 暴露的 7 个工具

| 工具 | 用途 | 是否写入 |
|---|---|---|
| `navigator.where_am_i` | 状态快照。 | 否 |
| `navigator.brief` | 当前 step 的 brief。 | 否 |
| `navigator.run_gate` | 只读门禁聚合。 | 否 |
| `navigator.create_artifact` | 用完整模板库创建产物（20 类：00–19，logic-backbone 在 07）。 | 仅文件系统 |
| `navigator.capture_log` | 追加到 `docs/19-dev-log.md`（`type=dev`）或 `docs/18-research-log.md`（`type=research`）；**`type=decision` 强拒**。 | 仅文件系统 |
| `navigator.detect_sop_version` | 比较已落盘 SOP profile 与内置 OCN SOP，输出漂移状态。 | 否 |
| `navigator.generate_next_prompt` | 当前 step 的必填章节 + 治理提醒 + 不确定性策略 + 自检规则。 | 否 |

#### G.3 4 个被禁工具——永远不会暴露

| 工具 | 原因 |
|---|---|
| `navigator.advance_phase` | 状态推进只能由人通过 CLI 触发。 |
| `navigator.capture_decision` | 决策必须反映人的意图；MCP 上的 `capture_log` 已硬拒 `type=decision`。 |
| `navigator.reset_project` | 破坏性操作，必须由人二次确认。 |
| `navigator.force_release_lock` | 会绕过状态安全不变量，仅运维使用。 |

由 `tests/unit/mcp-tool-registry.test.ts` 强制（`ALLOWED ∩ FORBIDDEN = ∅`）。

> 接入 OCN 的 MCP agent 可以读项目状态、渲染下一步 brief、准备产物、跑只读门禁、用模板创建产物、捕获 `dev` / `research` 日志。**不可以**推进状态、记录决策、重置项目、强制释放锁。

完整工具面 + 接入说明：[`docs/mcp-usage.md`](./docs/mcp-usage.md)。

---

## 参考资料

### H. 文档地图

OCN 把自己的设计基线放在 `docs/` 下。开始阅读前两个治理点：

- **决策日志（唯一权威）**：[`docs/20-decision-log.md`](./docs/20-decision-log.md)。早期文档里出现的 `docs/19-decision-log.md` 是同一份文件的旧路径，迁移记录见 [AM-002](./docs/amendments/2026-04-28-decision-log-path-amendment.md)。
- **修订（amendment）索引**：[`docs/amendments/README.md`](./docs/amendments/README.md)。冻结的 `docs/00-08` 设计基线之上的所有有效偏离都以 amendment 形式记录，不就地改动 ([DEC-004](./docs/20-decision-log.md#dec-004frozen-design-docs-amendment-policy))。
- **冻结的设计基线**：`docs/00-project-brief.md` 至 `docs/08-mvp-plan.md` 是 Phase 2 设计契约，作为历史档案对待。新项目通过 `ocn init` 拿到的是内置 SOP v1.1 的 step 布局；OCN 仓库自身按 [DEC-003](./docs/20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion) 跑项目级 override。
- **报告**：[`docs/reports/`](./docs/reports/) ——Phase 2 收口、post-alpha P1 修复（4 篇）、Claude Desktop MCP Host 验证、alpha.0 / alpha.1 / alpha.2 / beta.0 发布报告、examples F2/F3、beta release marker、双语安装流程、文档审计、最终 Codex 全 repo 审计、post-Codex P1/P2 修复报告。Phase 2 基线见 [`docs/reports/2026-04-28-phase2-completion-report.md`](./docs/reports/2026-04-28-phase2-completion-report.md)。
- **计划**：[`docs/plans/`](./docs/plans/)。当前活动的 GA Prep 计划是 [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md)。
- **MCP 用法**：[`docs/mcp-usage.md`](./docs/mcp-usage.md)。

### I. 开发

```bash
npm install
npm run lint           # ESLint（TypeScript-eslint）
npm run typecheck      # tsc --noEmit
npm run test           # vitest run —— 459 个用例，约 24 秒
npm run test:coverage  # 加上覆盖率报告
npm run build          # tsc + 给 bin 入口加 chmod +x
```

pre-commit 钩子（Husky 9）会在每次 commit 前跑 `lint + typecheck + test`。CI 跑同样的检查再加 `build` 与覆盖率上传。`CLAUDE.md` 里的硬约束：单文件 ≤ 300 行、单函数 ≤ 50 行、参数 ≤ 4、嵌套 ≤ 3、对外 API 不许 raw `any`。

### J. 路线图

GA Prep 阶段是从 Phase 2 收口走到 beta candidate 准备的一段文档/打包/运营就绪审计。大部分 GA Prep PR 已完成，证据全在 [`docs/reports/`](./docs/reports/) 与 [`docs/20-decision-log.md`](./docs/20-decision-log.md)。原始计划见 [`docs/plans/2026-04-28-ga-prep-gap-review-plan.md`](./docs/plans/2026-04-28-ga-prep-gap-review-plan.md)。

**GA Prep 各 PR 状态**

- **PR A**——文档编号修复 + amendments 索引。已完成。
- **PR B**——README first-5-minutes 与 CLI help 文案审计；最近一次双语安装流程刷新见 [`docs/reports/2026-05-02-readme-install-flow-completion.md`](./docs/reports/2026-05-02-readme-install-flow-completion.md)。
- **PR C**——MCP `projectRoot` 路径穿越审计 + 威胁模型。[`docs/security/mcp-threat-model.md`](./docs/security/mcp-threat-model.md) 已合入；`projectRoot` 校验器在 [P1-001](./docs/reports/2026-04-30-post-alpha-codex-audit.md) 中由 `validateInitializedProjectRoot` 加固。
- **PR D**——外部 MCP Host 验证。Claude Desktop on Windows + WSL2 已端到端验证（见 [报告](./docs/reports/2026-04-30-mcp-external-host-validation-report.md) 与 [DEC-017](./docs/20-decision-log.md)）；Cursor 与 Cline 留给后续工作。
- **PR E**——npm 发布门禁计划 + CI 稳定性审计。发布纪律：[DEC-008](./docs/20-decision-log.md) / [DEC-012](./docs/20-decision-log.md) / [DEC-015](./docs/20-decision-log.md) / [DEC-016](./docs/20-decision-log.md) / [DEC-021](./docs/20-decision-log.md) / [DEC-022](./docs/20-decision-log.md)。CI 矩阵已扩展到 Node 20 + Node 22（[报告](./docs/reports/2026-05-01-ci-node-22-matrix-expansion.md)）。锁观察 flake 已加固（[报告](./docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md)）。
- **PR F**——`examples/` 计划。F1 + F2 + F3 完成：[`examples/discovery-to-plan/`](./examples/discovery-to-plan/) 是端到端可执行 smoke，覆盖 v1.0 SOP 全部 10 个 step（[报告](./docs/reports/2026-05-01-examples-discovery-to-plan.md)）。F4（README 顶层 "Try the example" 链接）即 §E 中的示例引用。
- **post-Codex 审计修复 train**——最终 Codex 全 repo 审计（[报告](./docs/reports/2026-05-02-final-codex-full-repo-audit.md)）与 P1/P2 修复（[报告](./docs/reports/2026-05-02-post-codex-p1-p2-fix-report.md)）；剩两个 P3 polish 项。

**Execution Navigator MVP 系列（DEC-024 之后）**

- **MVP 1–6 已完成**——§F.2 的 6 条 Execution Navigator 命令在 PR #63–#68 中陆续 ship 并合入 main；横切 review 修复在 PR #69 落地（[报告](./docs/reports/2026-05-04-execution-navigator-review-fixes-pr-a.md)）。系列收口：[`docs/reports/2026-05-04-execution-navigator-verdict-draft.md`](./docs/reports/2026-05-04-execution-navigator-verdict-draft.md)。
- 当前外部包：`0.5.0-beta.2`——Planning Gatekeeper（§F.1）+ Execution Evidence Navigator（§F.2）+ Logic Backbone DESIGN 门禁 + Readiness Backbone 横切门禁 + Task Backbone BUILD 任务台账。
- **Task Backbone 在 `0.5.0-beta.0` ship**——SOP 0.5.0（[AM-007](./docs/amendments/2026-06-12-task-backbone-amendment.md) / DEC-032）：build plan 携带机器可解析的任务规格块（`## Task Specs｜任务规格`：goal/traces/touches/verify/dod + 可选 depends/phase/timeout）。build-plan 门禁校验六类硬缺陷（id 重复/非法、字段缺失、`traces` 悬空指向 AC、`touches` 悬空指向逻辑图节点、`depends` 悬空或成环、零任务），并把每个任务的验收命令哈希冻结进 `.ocoding/task-ledger.json`。完成与否只由 `ocn task check` 重跑冻结命令裁决（退出码 0 → done + `task_completed` 审计；命令漂移 → 拒绝执行）；`/ocn-next` 在 `state_build` 中派发第一个待办任务；台账未清时 `ocn advance` 不准离开 BUILD。封堵第四类假完成——"只有回执的完成"（receipt-only completion：BUILD 回执诚实但空洞，却能通过每道门禁；在 Lattice dogfood 中发现）。运行时默认 profile 按 DEC-032 切到 0.5.0；旧项目用 `ocn sop upgrade` 迁移。
- **Claude Code 集成在 `0.4.0-beta.2` ship**——[AM-006](./docs/amendments/2026-06-12-claude-code-agent-integration-amendment.md) / DEC-031：`ocn agent setup` 一条幂等命令接线钩子 + 治理契约 + `/ocn-next`；执行逻辑以 `ocn hook stop|post-edit` 内置在 OCN 中（fail-open、防环）。
- **Readiness Backbone 在 `0.4.0-beta.1` ship**——SOP 0.4.0（[AM-004](./docs/amendments/2026-06-11-readiness-backbone-amendment.md) / DEC-028）新增基于角色的横切就绪门禁：从 54 个精选 IT 角色提炼出 55 条可证伪检查，在 section + logic 门禁之后于 `ocn check` / `ocn gate` / `ocn advance` 中运行。开放世界语义（`FAIL` **和 `UNKNOWN`** 都阻断）；判定账本持久化到 `.ocoding/readiness.json`；新增 `ocn readiness list` / `ocn readiness waive`（带探针豁免）命令；旧项目用 `ocn sop upgrade` 迁移；运行时默认 profile 按 DEC-030 切到 0.4.0。
- **Logic Backbone 在 `0.3.0-beta.1` ship**——SOP 0.3.0 新增 DESIGN 阶段产物 `docs/07-logic-backbone.md`；`ocn check` 机器校验其计算/决策图（在缺角色、节点 id 重复、悬空引用、依赖循环、孤儿节点、未绑定触发器时阻断），通过则写出 `.ocoding/logic-graph.json`，`ocn brief` 把它汇总成执行顺序 + 触发器绑定。
- 仍是 beta，非 GA。已在 Claude Desktop on Windows + WSL2 验证；Cursor 与 Cline 仍未验证。
- 下一道门：在真实外部 repo 完成一次 dogfood，再考虑后续 release sync；GA promotion 仍由独立 DEC 把守。

**GA Prep 之外——目前不在任何活动计划里，落地前必须先开 DEC**

- `ocn doctor`、`ocn reset`、`ocn baseline`
- SOP 版本/升级工具
- production / full tier 的产物集合差异化
- mini-CRM dogfood（Tier 2 GA 成功条件）
- HTTP / SSE MCP 传输、MCP 鉴权、MCP 会话管理
- Cursor / Cline 真实 Host 验证（每个 Host 都需要 DEC-017 模式的独立验证报告）
- GA promotion DEC（最终把 Host 范围、多 OS / Node 24+ CI 矩阵、dogfood 证据捆在一起的门）

### K. 许可

[Apache-2.0](./LICENSE)
