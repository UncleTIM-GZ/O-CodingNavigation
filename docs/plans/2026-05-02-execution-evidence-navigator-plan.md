# Execution Evidence Navigator — Plan｜执行证据导航器规划

> Doc-only planning artifact. No source / tests / package / workflow / npm / runtime change is performed by this PR.
> Companion DEC: [DEC-024](../20-decision-log.md#dec-024reframe-build--verify-as-execution-evidence-navigator).
> Companion summary: [`docs/reports/2026-05-02-execution-navigator-redesign-summary.md`](../reports/2026-05-02-execution-navigator-redesign-summary.md).
> Builds on: [DEC-023](../20-decision-log.md#dec-023sop-020-strong-gated-build-and-verify-scope) and the SOP 0.2.0 closed loop (`docs/plans/2026-05-02-sop-0.2-strong-gated-build-verify-plan.md`, `docs/reports/2026-05-02-sop-0.2-runtime-cutover-full-flow.md`, `docs/reports/2026-05-02-sop-0.2-plan-to-verify-example.md`, `examples/plan-to-verify/scripts/smoke.sh`, `src/sops/default-ai-coding-sop/0.2.0/data.ts`).

---

## 1. Goal｜目标

**Turn OCN after Build Plan into an Execution Evidence Navigator rather than a linear document-advance workflow.**

中文要点：将 OCN 在 Build Plan 之后的角色，从线性文档推进，调整为执行证据导航和 Agent 指南针。

`0–10` (DISCOVERY → PLAN through `step_real_data_wiring`) continues to be a strong-gated planning chain. From step 10 onward, OCN's primary surface stops being "advance to the next Markdown artifact" and becomes "read git / GitHub / CI / issue / review evidence, judge state against the 00–10 plan and 03 ACs, and emit the next-Agent prompt". `ocn advance` remains available for formal closure but is no longer the daily-development driver after planning closes.

---

## 2. Current dogfood finding｜本轮 dogfood 结论

- `0–10` works well. Producing project brief, scope, PRD, ACs, technical architecture, IA, data model, API contract, test strategy, MVP plan, and real-data wiring through strong gates is genuinely useful and converts into actionable scope.
- The development phase gets stuck on the linear-doc model. Once code is being written, advancing one Markdown artifact at a time (`docs/11` … `docs/18`) does not match the real loop the developer is in (PR open → CI red → fix → review comment → fix → CI green → AC verified → merge).
- LFG / coding agents need next-action guidance, not more documents. The friction point dogfood surfaced is "what should the agent do next, given the current PR / CI / review / issue state", not "which Markdown section is missing a header".
- GitHub and CI already contain the real evidence. PR title / body / commits / files-changed / checks / review comments / linked issues are the canonical execution chain. Re-encoding any of that into `docs/11–18` is duplication, not signal.
- `ocn advance` becomes less useful after implementation starts. It stays valid for planning gates and for formal closure, but it is not the primary surface during active execution.

中文要点：dogfood 表明 `0–10` 是真有用的；进入开发后，线性推进文档不解决"PR / CI / review / issue 卡住"这种真问题；agent 真正需要的是基于证据的下一步指令；GitHub 已经存了全部证据，OCN 不应再造一份。

---

## 3. New architecture｜新架构（五层）

```
┌─────────────────────────────────────────────────────────┐
│ 5. Report Generation Layer                              │
│    Generates / updates docs/11–18 from Evidence Links   │
│    (implementation log, change evidence, validation,    │
│    debug, acceptance mapping, final verdict).           │
├─────────────────────────────────────────────────────────┤
│ 4. Agent Guidance Layer                                 │
│    Emits next-prompts for Claude Code / Codex / LFG,    │
│    issue-specific repair prompts, verify-failure        │
│    prompts.                                             │
├─────────────────────────────────────────────────────────┤
│ 3. Analysis Layer                                       │
│    Compares evidence against docs/03 ACs, docs/08       │
│    test strategy, docs/10 build plan. Flags scope       │
│    drift, missing tests, failed checks, unresolved      │
│    issues, evidence gaps, blocked work items.           │
├─────────────────────────────────────────────────────────┤
│ 2. Execution Evidence Layer                             │
│    Reads git status / git diff / git log,               │
│    GitHub PR (title / body / commits / files / checks), │
│    failed CI logs, review comments, linked issues.      │
│    Read-only.                                           │
├─────────────────────────────────────────────────────────┤
│ 1. Planning Gate Layer (unchanged)                      │
│    Continues to strong-gate `00–10` exactly as SOP      │
│    0.2.0 already does. Required sections, gate runner,  │
│    `ocn check` / `ocn gate` / `ocn advance` semantics   │
│    stay as-is for `00–10`.                              │
└─────────────────────────────────────────────────────────┘
```

The Planning Gate Layer (1) is the existing 0.2.0 engine. Layers 2–5 are net-new and read-only against external systems (git, GitHub, CI). Layer 5 only writes to `docs/11–18` artifacts already declared by SOP 0.2.0; it does not invent new artifact paths.

---

## 4. Data model sketch｜数据模型草稿

JSONL plus Markdown is preferred — machine-readable evidence index lives under `.ocoding/execution/`, while `docs/11–18` stay human-readable reports rendered from that index.

```
.ocoding/execution/work-items.json
.ocoding/execution/runs.jsonl
.ocoding/execution/issues.jsonl
.ocoding/execution/verification-runs.jsonl
.ocoding/execution/evidence-links.jsonl
```

Notes:

- `work-items.json` — current Work Items (PR / branch / linked issue scope), keyed by stable id.
- `runs.jsonl` — append-only Agent Runs (prompt, agent name, outcome).
- `issues.jsonl` — append-only Issue records (CI failure, review comment, blocked AC, etc.) with a status field, not a separate file per issue.
- `verification-runs.jsonl` — append-only Verification Runs against ACs / test strategy.
- `evidence-links.jsonl` — append-only Evidence Links: `{ kind, ref, fetchedAt, sha, ... }` pointing at git commit / PR / check / review / issue. The navigator never copies the underlying body — only references and minimal cached fields.
- `docs/11–18` remain the human-readable surface; the navigator generates / updates them from the JSONL index. OCN does not duplicate GitHub — it builds references.
- Naming, field shape, and stable-id rules will be defined in a future data-model amendment (consistent with `CLAUDE.md` §4.1–§4.3).

---

## 5. MVP 1 — local git evidence｜本地 git 证据

Command: `ocn exec status`

Reads:

- `git status` (porcelain).
- `git diff --name-status` against the inferred base branch.
- `git log --oneline` for the last N commits on the current branch.
- The current SOP step from `.ocoding/state.json` (already maintained by 0.2.0 runtime).

Outputs:

- Current branch.
- Uncommitted files (untracked / staged / unstaged).
- Changed files vs base.
- Recent commits on the current branch.
- Files changed that fall outside the expected build-plan files (cross-checked against `docs/10-real-data-wiring.md` and the active step's artifact path).
- Working-tree dirty / clean flag.

No GitHub token needed. This MVP is fully local; it works for repos with no remote.

---

## 6. MVP 2 — GitHub PR analysis｜GitHub PR 分析

Command: `ocn github analyze-pr <number>`

Reads (read-only):

- PR title / body.
- PR commits.
- PR files changed.
- GitHub Actions check runs and conclusions.
- PR mergeability state.
- PR review comments and review state.

Outputs:

- Summary (one-paragraph PR description, evidence-anchored).
- Changed-file classification (source / tests / docs / config / out-of-scope).
- CI status (per check, per job).
- Risk flags (failed checks, missing tests for changed source files, scope drift vs `docs/10`, unresolved review comments).
- Acceptance-evidence candidates (which ACs in `docs/03` this PR could be evidence for, pending verification).
- Next action (one human-readable line, plus a structured next-prompt link).

Implementation can route through `gh` CLI (already common in the developer environment) or the GitHub API directly; tests will mock the network surface. No mutation. No comment-posting. No merge.

---

## 7. MVP 3 — acceptance evidence map｜验收证据映射

Command: `ocn evidence map`

Compares:

- `docs/03-acceptance-criteria.md` (canonical AC list).
- PR changed files (Layer 2 evidence).
- Test files referenced in `docs/08-test-strategy.md`.
- CI check status.
- Smoke / example run status (where the project ships smokes, e.g. `examples/plan-to-verify/scripts/smoke.sh`).

Outputs:

- AC covered — has at least one Evidence Link of the right kind (test, CI run, code change, review approval).
- AC missing — no Evidence Link.
- AC needs human review — Evidence Link exists but kind / quality is uncertain (e.g. test exists but not green; code change exists but no test).
- Evidence Link list per AC.

This is what `docs/16-validation-report.md` should ultimately be derived from rather than hand-typed.

---

## 8. MVP 4 — next prompt｜下一轮 Agent 提示词

Command: `ocn next-prompt`, with variants:

- `ocn next-prompt` — base prompt for the current Work Item.
- `ocn next-prompt --issue ISSUE-001` — repair prompt scoped to a specific Issue.
- `ocn next-prompt --pr 123` — prompt scoped to a specific PR's current state.
- `ocn next-prompt --verify-failure` — prompt scoped to the most recent failed Verification Run.

Output structure (stable, machine-readable):

```
- Context              (project, branch, PR, current step)
- Current objective    (one line)
- Evidence observed    (git / PR / CI / review / issue)
- Blocking issue       (if any, with Evidence Link)
- Allowed files        (scoped to the current Work Item)
- Forbidden changes    (out-of-scope file globs, locked files)
- Required commands    (lint / typecheck / test / smoke per package.json)
- Acceptance target    (which ACs from docs/03 this round must move)
- Stop condition       (when the agent must hand back)
```

This is the file that gets pasted into Claude Code / Codex / LFG. Ten of these well-formed prompts is worth more than ten green doc gates.

---

## 9. MVP 5 — evidence-derived final verdict｜证据驱动的最终验收

Command: `ocn verdict draft`

Generates a draft of `docs/18-final-build-verdict.md` from the JSONL index plus the latest PR / CI evidence:

- Final build verdict — pass / fail / partial / blocked.
- Unresolved risks — list, anchored to Evidence Links.
- Evidence summary — covered ACs, missing ACs, CI green / red, smoke pass / fail.
- Merge recommendation — merge / do-not-merge / merge-after-conditions, each with Evidence Link justification.

The output is a draft, not a final write. The human still has to accept it, the same way `ocn advance` requires human action today.

---

## 10. Relationship to `11–18`｜与 11–18 的关系

- `11–18` remain useful as report artifacts. SOP 0.2.0 already declares them with required sections, templates, and gate runner support.
- They become **generated / updated from evidence** where possible, not the main human workflow:
  - `docs/14-dev-log.md` ← derived from commits / Agent Runs / issue resolution timeline.
  - `docs/15-research-log.md` ← derived from referenced links / Agent Runs flagged as research.
  - `docs/16-validation-report.md` ← derived from Acceptance Mapping (MVP 3).
  - `docs/17-debug-report.md` ← derived from Issues with status `resolved` and their fix commits / PRs.
  - `docs/18-final-build-verdict.md` ← derived from `ocn verdict draft` (MVP 5).
- Developers interact primarily with `ocn exec status`, `ocn github analyze-pr`, `ocn evidence map`, `ocn next-prompt`, and `ocn verdict draft`. They interact with `ocn advance` only at planning closure and at formal delivery closure.

---

## 11. Implementation PR sequence｜实施 PR 序列

Each PR is a separate DEC-bound action. None of them are authorised by this DEC.

1. **PR 1 — docs + command skeleton**: register the new command group (`ocn exec`, `ocn github`, `ocn evidence`, `ocn next-prompt`, `ocn verify`, `ocn verdict`), help text only, no GitHub API yet, output a "not implemented in this PR" report so users can see the surface. No GitHub network calls.
2. **PR 2 — local git evidence**: implement `ocn exec status` against local `git`. Tests use a temp git repo (no network). Update unit + CLI test layers per `CLAUDE.md` §9.
3. **PR 3 — GitHub PR read-only analysis**: implement `ocn github analyze-pr <number>` via `gh` CLI or GitHub API, read-only, no mutation. Tests mock the network surface.
4. **PR 4 — acceptance evidence mapping**: implement `ocn evidence map`. Parse ACs from `docs/03`, parse PR changed files, parse CI status, emit mapping. Tests against fixture ACs and fixture PR payloads.
5. **PR 5 — next-prompt generator**: implement `ocn next-prompt` with all four variants. Tests against fixture Work Items, Issues, Verification Runs, and PR snapshots; assert prompt structure stability.
6. **PR 6 — evidence-derived reports**: implement `ocn verdict draft` and the auto-update path for `docs/14`–`docs/17` from the JSONL index. Each generated artifact still has to satisfy the existing 0.2.0 required-section gates so existing tests remain valid.

---

## 12. Risks｜风险

- GitHub API auth friction. `gh` CLI lowers this but does not eliminate it (corporate networks, missing tokens). Local-git MVP must work without any GitHub access.
- Over-trusting AI interpretation. Layer 3 (Analysis) and Layer 4 (Agent Guidance) produce judgement, not facts. Outputs must clearly mark what is observed evidence vs what is interpretation, and never rewrite history.
- Noisy PR data. Long PRs, large diffs, many checks. Layer 2 must summarise without dropping the fact that evidence exists.
- Local git vs GitHub divergence. Working tree may be ahead of / behind / off the branch the PR points at. The navigator must report this divergence rather than paper over it.
- Long CI logs. Layer 2 must surface failure tails without ingesting hundreds of MB of logs. Caching strategy is part of the data-model amendment.
- Evidence mapping false positives. A test file existing is not the same as a test passing. Layer 3 must distinguish "evidence present" from "evidence verifies AC".
- Next-prompt could overstep scope. The `Allowed files` and `Forbidden changes` blocks in MVP 4 exist precisely to constrain agent action; they must be derived from the current step / Work Item, not invented.
- Non-GitHub repo compatibility. The local-git MVP must continue to work for repos hosted off GitHub. The GitHub-specific MVPs degrade to "not available on this remote" rather than failing the navigator.

---

## 13. Recommendation｜建议

**Do not expand more linear BUILD / VERIFY document gates now. Build the Execution Evidence Navigator first.**

中文要点：现在不要继续扩展线性的 BUILD / VERIFY 文档门禁。应先实现 Execution Evidence Navigator，让 OCN 在开发阶段读取证据、判断状态、生成下一轮 Agent 指南。

Sequencing rationale: SOP 0.2.0 already proved that strong-gating can close `00–18`; dogfood proved that gating alone is not the right post-10 surface. The next product investment should harvest the evidence chain that already exists (git / GitHub / CI / review / issue) rather than thicken the doc chain. Layers 2–5 of §3 are the critical path; further `11–18` doc-section tightening is not.
