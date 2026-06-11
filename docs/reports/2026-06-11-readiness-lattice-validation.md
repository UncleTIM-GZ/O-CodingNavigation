# Validation Report — readiness engine on the Lattice project

> Date: 2026-06-11 · Branch: `feat/readiness-engine` · Status: **passed (read-only)**
> Purpose: validate the SOP 0.4.0 readiness engine against a real, external project
> (not OCN's own dogfood) — exercising alias resolution, repo probes, AC→test trace,
> and README extraction on foreign content.

## Target

`/home/timou/repos/Lattice` — a Python AI-orchestration project, **independent of OCN**:
- pinned to **SOP 0.3.0**, at `state_plan / step_build_plan`, tier `minimal` (→ readiness tier `solo`)
- 38 docs, **renumbered differently from OCN** (`04-technical-architecture`,
  `05-information-architecture`, `06-data-model`, `08-api-contract`, `10-mvp-plan`,
  `13-team-and-ownership`…)
- real repo facts: `.git/`, `.github/workflows/`, `tests/` (2 smoke tests), `requirements.lock`
- real test runner: `.venv/bin/python -m pytest`

## Method (non-invasive)

The readiness engine is 0.4.0-only; Lattice is pinned to 0.3.0, so the CLI would return
`ERR_SOP_VERSION`. To validate against Lattice's real content **without mutating its
`.ocoding/` state**, `evaluateReadiness()` was called directly against the Lattice root
with the shipped 0.4.0 rulebook, tier `minimal`, and `commands.test_list` /
`commands.test` pointing at Lattice's own venv pytest. `evaluateReadiness` persists
nothing (only `runReadinessGate` writes the ledger), so the run is fully read-only.

**Confirmed afterwards:** `git status` clean, no `readiness*.{json,yaml}` written into
Lattice — the project's progress was untouched.

## Result (tier=solo: PASS 1 / FAIL 1 / UNKNOWN 7 / NA 46)

| check | verdict | evidence |
|---|---|---|
| `rdy_devops_engineer` | **PASS** | matched real `.github/workflows/*.yml` |
| `rdy_developer` | UNKNOWN | git ✓; `build` command not configured → honest UNKNOWN |
| `rdy_qa_engineer` | UNKNOWN | `tests/` ✓ + **engine ran Lattice's real pytest (exited 0)**; AC scenarios not declared in a block → UNKNOWN |
| `rdy_service_desk_analyst` | **FAIL** | README has no email and no issues/discussions URL — **independently reproduces the original manual review finding** |
| `rdy_cio_cto` / `rdy_ciso` / `rdy_ba` / `rdy_it_pm` | UNKNOWN | Lattice's 0.3.0 docs carry **no `ocn-readiness` block** → open-world UNKNOWN (silence ≠ pass) |
| 46 others | NA | platform/team-tier, not applicable at solo |

## What this validated (on a foreign project)

1. **Number-agnostic alias resolution** — checks resolved to Lattice's actual files
   (`docs/00`, `01`, `02`, `10`, `03-*`) despite the different numbering (calibration ①).
2. **Repo probes on a real project** — git / CI / test_dir all evaluated correctly;
   unconfigured `build` correctly stayed UNKNOWN rather than passing.
3. **R2 — the engine ran the project's own pytest**, not a self-reported flag.
4. **README content extractor caught a real gap** — `support_channel` FAIL, matching the
   first dogfood's manual finding.
5. **Open-world default holds** — un-backfilled docs are UNKNOWN, never silently PASS.
6. **Read-only safety** — zero writes into the target's `.ocoding/`.

## Finding: existing-project block migration (→ TODO)

A throwaway-copy experiment (copy Lattice docs + tests + CI into a temp dir, `ocn init
--sop-version 0.4.0`, attempt to backfill) surfaced that **Lattice's real docs have no
`fields: {}` stub to fill** — the P2 stubs ship only in the 0.4.0 *templates*, so
pre-0.4.0 documents have nothing to backfill into.

**Implication:** adopting readiness on an existing project needs a migration step that
**appends** an `ocn-readiness` block to each carrier doc lacking one (proposed
`ocn readiness init-blocks`). Recorded in AM-004 "Remaining open points".

## Verdict

The readiness engine works end-to-end on an external, differently-numbered real project:
alias resolution, repo probes, real pytest execution, and README extraction all function,
and the run is non-destructive. The one genuine actionable finding on Lattice
(`support_channel` FAIL) is correct. The only adoption gap is block migration for
pre-0.4.0 documents.
