# Execution Navigator Redesign — Summary｜执行证据导航器重定位摘要

> Generated: 2026-05-02
> Branch: `docs/execution-evidence-navigator-redesign`
> Scope: doc-only product-direction summary
> Companion DEC: [DEC-024](../20-decision-log.md#dec-024reframe-build--verify-as-execution-evidence-navigator).
> Companion plan: [`docs/plans/2026-05-02-execution-evidence-navigator-plan.md`](../plans/2026-05-02-execution-evidence-navigator-plan.md).
> Builds on: [DEC-023](../20-decision-log.md#dec-023sop-020-strong-gated-build-and-verify-scope) and the SOP 0.2.0 closed loop.

---

## 1. Summary

- One real dogfood pass against the SOP 0.2.0 closed loop showed that `00–10` (DISCOVERY through PLAN, including `step_real_data_wiring`) is genuinely useful as a strong-gated planning chain.
- The same dogfood showed that linear `ocn advance` over `docs/11`–`docs/18` is **not** the right primary interaction model once development actually starts. The work after step 10 is no longer "produce a planning section"; it is "implement, get the PR through CI, fix what reviewers / CI / issues surfaced, prove the AC was met". A linear doc-advance does not help that loop.
- DEC-024 reframes OCN's role from step 10 onward as **Execution Evidence Navigator**: read git / GitHub / CI / review / issue evidence, judge state against the 00–10 plan and `docs/03` ACs, and emit the next-Agent prompt for Claude Code / Codex / LFG.
- `docs/11–18` artifacts and the SOP 0.2.0 profile remain. They become evidence-derived reports rather than the main developer interaction loop.
- This PR makes **no runtime changes**. No source, tests, package, npm publish, `latest` movement, git tag, GitHub Release, GA, or Cursor / Cline validation claim. It records the decision and the implementation plan only.

中文要点：dogfood 后看清楚：`0–10` 强门禁有效，`11–18` 线性推进不再合适；DEC-024 把 10 之后的角色重定位为基于 git / GitHub / CI 证据的执行导航器；`11–18` 文档保留但改为证据驱动生成；本 PR 仅记录方向，不改运行时。

---

## 2. User feedback (dogfood signal)

- Steps `1–10` were smooth. The strong-gated planning chain produced usable scope and acceptance criteria, and `ocn advance` between steps was the right cadence.
- Once development started, the workflow got stuck. Forcing a Markdown advance per implementation step pulled the developer out of the real loop (PR / CI / review / issue) instead of helping it.
- LFG / coding-agent automation stalled at exactly the moments it most needed direction (failed CI, unresolved review, blocked AC). What was missing was the next-prompt — not another doc gate.
- GitHub PR evidence felt more natural to consult than `docs/11`–`docs/18`. Re-typing PR / CI / review state into `.md` was duplication of what GitHub already authoritatively held.
- The user articulated the desired role explicitly: OCN should be the **Agent compass** — telling the developer (and the agent) what to do next based on the evidence chain, not asking them to fill in another section header.

中文要点：1–10 顺；进入开发后卡住；LFG 卡在 CI / review / 阻塞 AC，需要的不是新的文档门禁，而是下一轮提示词；GitHub PR 证据天然就在那里，不应再写一份；用户明确希望 OCN 当 Agent 指南针。

---

## 3. Decision result

- Keep the strong-gated `0–10` planning chain as-is. SOP 0.2.0 profile, gate runner, required-section enforcement, `ocn check` / `ocn gate` / `ocn advance` semantics for `00–10` remain unchanged.
- Reframe `10+` as Execution Evidence Navigation. OCN's primary surface after step 10 becomes read-only navigation over git / GitHub / CI / review / issue evidence, with an Agent Guidance layer producing the next-prompt for Claude Code / Codex / LFG.
- Use GitHub / git / CI as the source of truth for execution. OCN does not duplicate that evidence chain; it interprets it against the `00–10` plan and the `docs/03` acceptance criteria.
- Next step: follow the implementation sequence in [`docs/plans/2026-05-02-execution-evidence-navigator-plan.md`](../plans/2026-05-02-execution-evidence-navigator-plan.md), starting with the local-git evidence MVP (`ocn exec status`). Each implementation PR is a separate DEC-bound action.

---

## 4. Non-goals

- No source change in this PR.
- No `npm publish`.
- No `latest` dist-tag movement.
- No git tag, no GitHub Release.
- No GA promotion. The version remains pre-GA.
- No Cursor / Cline validation claim — the DEC-019 boundary stands.
- No removal or rollback of the SOP 0.2.0 code.
- No deprecation of the `0–10` strong gates.
