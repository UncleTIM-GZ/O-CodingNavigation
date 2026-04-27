---
status: pending
priority: p3
issue_id: 003
tags: [code-review, architecture, dependency-injection, phase-2]
dependencies: [002]
---

# Introduce `Clock` interface — prep for Phase 2 audit timestamps

## Problem Statement

`src/core/time.ts` exposes `nowIsoUtc()` but is unused by production code so far. Phase 2 audit writes ISO timestamps for every push event. Without a `Clock` injection seam, `Date.now()` / `new Date()` will get scattered across core (same disease as `loadSopProfile()` — see todo 002).

The fix is cheap NOW (define interface + wire defaults in CLI), painful later.

## Findings

- `src/core/time.ts` exists, used only in `tests/unit/time.test.ts`.
- No core code currently calls it (verified via `grep -r "nowIsoUtc\|core/time" src/`).
- Source: architecture-strategist review, P0-3.

## Proposed Solutions

### Option A — Add `Clock` to `Deps` (see todo 002)

```ts
export interface Clock { now(): Date; }
export const RealClock: Clock = { now: () => new Date() };
```

Then `interface Deps { profile: SopProfile; clock: Clock; }` — todo 002 already brings this seam.

- Pros: zero overhead today, large payoff in Phase 2 audit.
- Cons: ceremony before need.

### Option B — Wait until Phase 2 audit lands

- Pros: avoid speculative abstraction.
- Cons: refactor every core fn that already touches time later.

**Recommended: Option A** — bundle with todo 002.

## Technical Details

- Affected files: `src/types/clock.ts` (NEW), `src/cli/index.ts`, `src/core/time.ts` (consider removing nowIsoUtc and putting it on Clock).

## Acceptance Criteria

- [ ] `Clock` interface defined and exported from `src/types/`.
- [ ] `RealClock` default wired in `src/cli/index.ts`.
- [ ] Tests can substitute via `{ now: () => new Date("2026-04-28T12:00:00Z") }`.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- Architecture review finding P0-3
- CLAUDE.md §4.3 — ISO 8601 UTC with Z
