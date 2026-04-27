---
status: pending
priority: p3
issue_id: 010
tags: [code-review, dead-code, yagni]
dependencies: []
---

# Decide the fate of `src/core/id.ts` — wire it up or delete

## Problem Statement

`src/core/id.ts` exports `STATE_PREFIX`, `STEP_PREFIX`, `SECTION_PREFIX`, `isStateId`, `isStepId`, `isSectionId` — but no production code consumes them. Their only consumer is `tests/unit/id.test.ts`. The `StepId` zod regex in `src/types/state.ts` already enforces the invariant for production data flow.

Two reasonable paths: wire the helpers into validation hot paths, or delete to honor YAGNI.

## Findings

- `grep -r "core/id" src/` → only `src/core/id.ts` itself.
- Test file exercises it but production never imports it.
- Source: code-simplicity-reviewer #1.

## Proposed Solutions

### Option A — Delete `src/core/id.ts` + `tests/unit/id.test.ts`

- Pros: ~10 LOC + a test file gone; honors YAGNI; reintroduce when actually consumed.
- Cons: lose a small abstraction barrier.

### Option B — Wire `isStateId`/`isStepId` into Phase 2 places that need string-id validation

E.g., when `ocn advance` accepts a state ID from the user, validate via `isStateId(s)` instead of inline regex.

- Pros: helpers earn their keep.
- Cons: speculative — no current consumer.

### Option C — Keep, mark deprecated until consumed

- Pros: zero change.
- Cons: dead code rot.

**Recommended: Option A** for the spike; reintroduce in Phase 2 if `ocn advance` or similar adds genuine consumers.

## Technical Details

- Affected files: `src/core/id.ts` (delete), `tests/unit/id.test.ts` (delete).

## Acceptance Criteria

- [ ] `src/core/id.ts` removed (or wired to ≥ 1 production caller).
- [ ] `tests/unit/id.test.ts` removed (or rewired to whatever production caller ends up with).
- [ ] All other tests still pass.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- code-simplicity-reviewer #1
- `.claude/anti-patterns.md` — YAGNI implications
