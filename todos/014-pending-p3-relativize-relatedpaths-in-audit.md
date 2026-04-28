---
status: pending
priority: p3
issue_id: 014
tags: [code-review, audit, portability]
dependencies: []
---

# Relativize `relatedPaths` to `projectRoot` in audit events

## Problem Statement

`src/core/init.ts:122-127` and similar sites pass absolute paths into `relatedPaths`. The audit JSONL contains lines like:

```
"/home/alice/projects/foo/.ocoding/state.json"
```

This is non-portable: when an audit log is shared across machines (or even users on the same host), the absolute paths leak the original layout and may not exist on the receiver.

Every event already carries `projectRoot`. Storing paths as relative-to-`projectRoot` keeps the receiver able to reconstruct absolutes via `path.join(projectRoot, relatedPath)` while gaining portability.

## Findings

- `src/core/init.ts:122-127`, `src/core/check.ts:88-99`, `src/core/doc.ts:62-66` — pass absolute paths.
- Source: architecture-strategist review, R3 (LOW).

## Proposed Solutions

### Option A — Relativize at the factory layer

`createAuditEvent` accepts both `projectRoot` and `relatedPaths`. Add a normalization step:

```ts
// In createAuditEvent factory
relatedPaths: input.relatedPaths?.map((p) =>
  path.isAbsolute(p) ? path.relative(input.projectRoot, p) : p
),
```

- Pros: caller code unchanged; one normalization point.
- Cons: silent transformation may surprise some readers.

### Option B — Require relative paths at the boundary

Update each command's audit emission to compute relative paths explicitly. Document the convention.

- Pros: explicit.
- Cons: more code at every call site.

**Recommended: Option A**, with a short JSDoc note on `createAuditEvent`.

## Acceptance Criteria

- [ ] `relatedPaths` in `audit-events.jsonl` are all relative to `projectRoot`.
- [ ] Existing tests updated to assert on relative paths (or stripped of absolute-path expectations).
- [ ] Backwards compatibility: a downstream tool can still reconstruct absolutes via `path.join(projectRoot, p)`.

## Resources

- PR #4 — Audit + Event Foundation
- Architecture review finding R3
