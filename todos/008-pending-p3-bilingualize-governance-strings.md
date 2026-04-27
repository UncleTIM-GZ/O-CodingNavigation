---
status: pending
priority: p3
issue_id: 008
tags: [code-review, simplicity, i18n]
dependencies: []
---

# Bilingualize `AI_GOVERNANCE_REMINDER` and `UNCERTAINTY_POLICY` (or make them inline)

## Problem Statement

`src/core/brief.ts:33-40` defines `AI_GOVERNANCE_REMINDER` and `UNCERTAINTY_POLICY` as English-only string constants in a product whose contract is BilingualMessage everywhere. They're hoisted to module scope "for reuse" that doesn't exist (single call site at `src/core/brief.ts:103-104`).

Either inline them at the call site, or make them BilingualMessage like every other user-facing text.

## Findings

- `src/core/brief.ts:33` — `AI_GOVERNANCE_REMINDER` is a plain string.
- `src/core/brief.ts:38` — `UNCERTAINTY_POLICY` is a plain string.
- Both end up in `BriefData` as plain strings, not `BilingualMessage`.
- Source: code-simplicity-reviewer #3 + #8.

## Proposed Solutions

### Option A — Make both `BilingualMessage`

```ts
const AI_GOVERNANCE_REMINDER = msg(
  "AI must NOT mark a blocked artifact as complete. ...",
  "AI 不得把 blocked artifact 标记为 complete。AI 不得推进项目状态。...",
);
```

Update `BriefData.aiGovernanceReminder` type to `BilingualMessage`.

- Pros: matches contract; both en/zh users get accurate guidance.
- Cons: small content-writing effort.

### Option B — Inline at the single call site, leave as English

- Pros: smallest change.
- Cons: still violates the bilingual contract.

**Recommended: Option A.**

## Technical Details

- Affected files: `src/core/brief.ts`, possibly `src/types/state.ts`.
- Tests: `tests/unit/core-brief.test.ts`, `tests/cli/brief.test.ts` need to assert both en + zh fields.

## Acceptance Criteria

- [ ] Both fields are `BilingualMessage`.
- [ ] Tests verify both `en` and `zh` are non-empty and non-trivially different.
- [ ] Render layer prints both in the appropriate locale order.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- code-simplicity-reviewer findings #3 + #8
- CLAUDE.md §4.4 — BilingualMessage requirement
