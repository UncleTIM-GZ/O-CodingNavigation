---
status: pending
priority: p2
issue_id: 001
tags: [code-review, architecture, refactor, phase-2]
dependencies: []
---

# Extract WorkspaceStore — single owner of `.ocoding/*` writes

## Problem Statement

`src/core/init.ts` directly writes 3 sibling files (`sop.yaml`, `gates.yaml`, `config.yaml`) via raw `fs.writeFile` calls (lines 75-77), bypassing `state-store.ts`. The architectural rule in CLAUDE.md §4 is "single owner of `.ocoding/` writes," but currently only `state.json` has that owner.

In Phase 2, `ocn advance` will mutate state, audit will append to `.ocoding/audit/*.jsonl`, baseline will write `.ocoding/baselines/<ulid>.json`. Each will be tempted to import `node:fs` directly, repeating `init.ts`'s anti-pattern. Cheap to fix now (one extra module + tests), expensive to fix once 4+ commands are doing it.

## Findings

- `src/core/init.ts:75-77` writes `sop.yaml`, `gates.yaml`, `config.yaml` with raw `fs.writeFile`.
- `src/core/state/state-store.ts` only owns `state.json`.
- Source: architecture-strategist review, P0-1.

## Proposed Solutions

### Option A — Extend `state-store.ts` to `WorkspaceStore`

```ts
// src/core/workspace/store.ts (renamed from state/state-store.ts)
export class WorkspaceStore {
  static async writeProfile(root: string, profile: SopProfile): Promise<void> { ... }
  static async writeState(root: string, state: ProjectState): Promise<void> { ... }
  static async readState(root: string): Promise<ProjectState> { ... }
  // Phase 2: writeAudit, writeBaseline
}
```

- Pros: single import, single concern (everything `.ocoding/*` lives here).
- Cons: class-style API in a project that prefers free functions.
- Effort: Medium

### Option B — Free-function module per concern

```ts
// src/core/state/state-store.ts → readState/writeState
// src/core/profile/profile-store.ts → writeProfile (NEW)
// src/core/audit/audit-store.ts → writeAuditEvent (Phase 2)
```

- Pros: matches existing free-function style; small, single-purpose modules.
- Cons: more files; coordination if file naming changes.
- Effort: Small

### Option C — Defer to Phase 2

Document the simplification clearly in `implementation-notes.md` (already partially noted as L1) and revisit when audit/baseline land.

- Pros: zero code change now.
- Cons: anti-pattern proliferates if not fixed before more commands land.
- Effort: None

**Recommended: Option B** — fits existing style, smallest blast radius, sets up Phase 2.

## Technical Details

- Affected files: `src/core/init.ts`, new `src/core/profile/profile-store.ts`.
- No public API change.
- Tests: add `tests/unit/profile-store.test.ts`.

## Acceptance Criteria

- [ ] No `fs.writeFile` calls in `src/core/init.ts` for the three yaml files.
- [ ] All `.ocoding/*` writes go through `state-store.ts` or `profile-store.ts`.
- [ ] `npm run lint && npm run typecheck && npm run test:coverage` pass.
- [ ] Coverage for `profile-store.ts` ≥ 90%.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- Architecture review finding P0-1
- CLAUDE.md §4.5 — state file safety
- `.claude/anti-patterns.md` §7 — "Skipping the lock for just a quick read-modify-write"
