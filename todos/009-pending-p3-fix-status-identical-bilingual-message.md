---
status: pending
priority: p3
issue_id: 009
tags: [code-review, simplicity, i18n]
dependencies: []
---

# `getStatus` and `generateBrief` emit identical `en`/`zh` messages — distinguish or accept

## Problem Statement

In `src/core/status.ts:51-53` (and similarly in `src/core/brief.ts:97`), the BilingualMessage uses identical `en` and `zh` text. The result is a renderer that prints the same line twice ("OCN Local OCN Project — state_spec / step_prd" appears twice in `ocn status` output).

Either localize the `zh` half, or use a `msg(s, s)` helper once explicitly.

## Findings

- `src/core/status.ts:51-53` — `msg(\`OCN ...\`, \`OCN ...\`)` — same string both sides.
- `src/core/brief.ts:97` — same pattern.
- Visible in manual demo transcript (dogfood-report-skeleton-spike.md §3 step 2): "OCN Local OCN Project — state_spec / step_prd" repeats.
- Source: code-simplicity-reviewer #6.

## Proposed Solutions

### Option A — Truly bilingualize

```ts
msg(`Status: ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
    `状态：${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`)
```

### Option B — Remove the duplicate render

Have the renderer detect `en === zh` and print once. This is a renderer-level fix that benefits any caller.

```ts
const lines = en === zh ? [zh] : [zh, en];
```

- Pros: no message rewrite needed.
- Cons: papers over the lazy bilingual.

**Recommended: Option A** for messages that benefit from translation; Option B as an additional render-layer safety net.

## Technical Details

- Affected files: `src/core/status.ts`, `src/core/brief.ts`, `src/cli/render/text.ts`.
- Tests need updates if asserting on duplicate-line output.

## Acceptance Criteria

- [ ] No status/brief output line is printed twice in `ocn status` or `ocn brief`.
- [ ] `en` and `zh` carry meaningfully different content where appropriate.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- code-simplicity-reviewer #6
- dogfood-report-skeleton-spike.md §3 step 2
