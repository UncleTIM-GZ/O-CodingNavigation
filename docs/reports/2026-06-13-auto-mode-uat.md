# UAT Report — Auto Mode (AM-009 / DEC-034)

**Date**: 2026-06-13
**Branch**: `feat/auto-mode`
**Build under test**: `dist/` from commit `refactor(automation): extract advance auto-mode helpers …`
**Method**: black-box acceptance — the **built** `dist/cli/index.js` driven against fresh temp projects exactly as a user/agent would, asserting observable outcomes (exit codes, JSON payloads, audit JSONL, on-disk runtime files). Reproduce with [`2026-06-13-auto-mode-uat.sh`](./2026-06-13-auto-mode-uat.sh).

## Result

```
UAT RESULT:  51 passed / 0 failed
```

All eight acceptance scenarios pass against the real binary. (The script also independently re-derives behavior covered by the 1208 vitest cases; this report is the user-facing acceptance pass.)

## Scenario coverage

| # | Scenario | Acceptance proven | Assertions |
|---|---|---|---|
| UAT-1 | **Manual mode is the default** | Fresh project: human advance runs the gate (exit 1 on fail); AI advance refused (exit 4, `automation_not_enabled`); brief keeps the legacy "AI must NOT advance" reminder with no `automation` field; `auto status` shows both phases off and writes no audit. | 8 |
| UAT-2 | **The switch is human-only** | `OCN_ACTOR=ai_agent ocn auto on` refused (exit 4, `automation_switch_human_only`); config untouched. | 3 |
| UAT-3 | **Phase-1 auto, unattended planning** | Human enables phase 1; brief flips to the AUTO MODE delegation text; the AI agent auto-advances **all 11 planning steps** DISCOVERY→PLAN with no human; cursor lands at `state_plan/step_build_plan`; the PLAN→BUILD boundary advance is refused (exit 4 — it targets phase 2); all 11 advances audited as `actor=ai_agent`. | 8 |
| UAT-4 | **Decision trace & replay** | `ocn auto trace` replays all 11 AI advances; every entry carries a non-empty rationale; engine-recorded machine context (`gatePassed`) present independent of the AI's self-report. | 3 |
| UAT-5 | **Phase-2 auto + milestone loop (multi-P)** | AI `task check` refused without phase 2, then without rationale; with both, P0's frozen command runs and marks it done (audited `ai_agent`); AI rewind to a non-milestone target refused; AI milestone rewind to `step_build_plan` succeeds; after appending P1 and re-gating, **P0 stays done (hash-carry) and P1 is pending**; AI checks P1 done — the multi-P loop closes end-to-end without a human. | 12 |
| UAT-6 | **Circuit breaker + resume** | 1st AI gate failure does not suspend; 2nd (threshold 2) trips the breaker → `suspended=true`, suspend event audited `actor=system`; further AI advance refused (exit 4, `automation_suspended`); **the human is never blocked** (their advance still runs the gate, exit 1); `ocn auto resume` re-arms. | 7 |
| UAT-7 | **Hard human-only zones** | Under full auto, AI is still refused (exit 4) for `cycle new`, `readiness waive`, and `sop upgrade`. | 3 |
| UAT-8 | **MCP unchanged / governance / restore** | MCP exposes exactly 7 tools with no `auto/advance/task/rewind/cycle` name; full-auto brief names both phases; `next-prompt` carries the `## Automation loop` with machine stop conditions; after `auto off` the brief restores the legacy reminder and AI advance is refused again. | 7 |

## Acceptance verdict

**ACCEPTED.** Every requirement from the original request is demonstrably satisfied by the shipping binary:

- Manual mode remains the default; nothing changes for users who never opt in.
- Phase 1 and phase 2 can be enabled independently or together; the AI completes the whole build per the SOP without per-step human confirmation once authorized.
- The trigger is delegated but the **judgement is not** — every advance still runs the full gate stack, task completion is still decided only by the frozen verify command, and the human-only switch / circuit breaker / hard zones bound the machine.
- The milestone loop (Owner addition): multi-P build plans complete by AI-driven rewind→append→re-gate, with finished milestones preserved.
- Every AI decision is logged with its rationale and independent machine context for later replay (`ocn auto trace`).

## Notes

- During the first UAT run, 4 assertions failed purely due to **test-script JSON-path typos** (`aiGovernanceReminder` lives under `data.`, not top-level) — not product defects; corrected and re-run clean. The product behavior was correct throughout (corroborated by the vitest `auto-governance` suite).
- No security findings (independent review pass: authorization, MCP surface, audit actor attribution, config fail-safe direction all sound).
