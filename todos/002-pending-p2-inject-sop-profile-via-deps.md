---
status: pending
priority: p2
issue_id: 002
tags: [code-review, architecture, dependency-injection, phase-2]
dependencies: []
---

# Inject `SopProfile` via Deps — keep composition root single

## Problem Statement

`loadSopProfile()` is called directly inside three core functions: `init.ts:71`, `check.ts:54`, `brief.ts:68`. Each call re-imports the bundled YAML strings. This violates the "single composition root" rule (`.claude/patterns.md` §10): the SOP source should be wired ONCE in `src/cli/index.ts` and threaded down via the options object — same pattern as `cwd`.

In Phase 2, when SOP profiles become user-loadable from `.ocoding/sop.yaml`, every core function that calls `loadSopProfile()` will need refactoring. Fixing it now sets the seam.

## Findings

- `src/core/init.ts:71` — `const profile = loadSopProfile();`
- `src/core/check.ts:54` — same
- `src/core/brief.ts:68` — same
- Source: architecture-strategist review, P0-2.

## Proposed Solutions

### Option A — Add `profile` to each `*Options` type

```ts
export interface CheckOptions {
  readonly cwd: string;
  readonly profile: SopProfile;  // NEW
}
```

CLI wiring:
```ts
// src/cli/index.ts (composition root)
const profile = loadSopProfile();
// pass to each command's action handler
```

- Pros: explicit dependency, easy to fake in tests, no global state.
- Cons: every core fn signature grows by one param.
- Effort: Small

### Option B — Add a single `Deps` object

```ts
export interface Deps {
  readonly profile: SopProfile;
  readonly clock: Clock;       // see todo 003
  readonly fs: FileSystem;     // future
}
export interface CheckOptions {
  readonly cwd: string;
  readonly deps: Deps;
}
```

- Pros: one parameter for all injected deps; future-proof for clock + fs.
- Cons: indirection; tests need to construct `Deps` (helper alleviates).
- Effort: Small

### Option C — Defer to Phase 2

Keep loadSopProfile() as global-ish until Phase 2 forces refactoring.

- Pros: no churn now.
- Cons: refactor cost grows with every new core fn.

**Recommended: Option B** — sets up Clock + FS injection (todos 003 + 004) at the same time.

## Technical Details

- Affected files: `src/cli/index.ts`, `src/cli/commands/*.ts`, `src/core/{init,check,brief,status,doc}.ts`, `src/types/index.ts` (add `Deps`).
- No public CLI surface change.

## Acceptance Criteria

- [ ] `loadSopProfile()` called exactly once, in `src/cli/index.ts`.
- [ ] Core fns receive profile via `opts.deps.profile`.
- [ ] Tests construct a fake `Deps` via a `tests/helpers/deps.ts` builder.
- [ ] `npm run lint && npm run typecheck && npm run test:coverage` pass.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- Architecture review finding P0-2
- `.claude/patterns.md` §5, §10
