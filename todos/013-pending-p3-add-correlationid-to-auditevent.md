---
status: pending
priority: p3
issue_id: 013
tags: [code-review, audit, correlation, advance-prep]
dependencies: []
---

# Add `correlationId` to `AuditEvent` for cross-event correlation

## Problem Statement

In the current JSONL, `lock_acquired`, `state_write_succeeded`, `lock_released`, and `project_initialized` for one `ocn init` invocation are interleaved with anything else in the file. Downstream tooling has to correlate via `currentStateId` + timestamp ranges — fragile.

PR #4 (advance) makes this worse: `lock_acquired → state_transition → lock_released` sequence becomes the canonical pattern for every state transition. Without an explicit correlation handle, reconstruction is heuristic.

## Findings

- `src/types/audit.ts` — `AuditEvent` has no correlation field.
- Source: architecture-strategist review, R5 (MEDIUM, advance-prep).

## Proposed Solutions

### Option A — Optional `correlationId: string` field

```ts
export const AuditEvent = z.object({
  // existing fields…
  correlationId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/).optional(),
}).strict();
```

- The first event of an operation generates a fresh ULID; subsequent events in the same operation reuse it.
- For PR #4: `init` creates one correlationId at the top, threads it through `lock_acquired`, `state_write_succeeded`, `lock_released`, `project_initialized`.

- Pros: explicit, easy to query, ULID format matches eventId.
- Cons: every emission site must pass it through.

### Option B — Reuse the entry event's `eventId` as correlationId

Establish a convention: the FIRST event of an operation has `correlationId === eventId`. Subsequent events in the same op set `correlationId` to the entry event's id.

- Pros: no new ULID generation needed.
- Cons: subtle — convention rather than schema-enforced.

**Recommended: Option A**, generated at the command boundary by a helper.

## Acceptance Criteria

- [ ] `AuditEvent` schema has optional `correlationId` field.
- [ ] `ocn init` threads one correlationId through all four emitted events.
- [ ] PR #4 advance reuses the same pattern.
- [ ] Test asserts the four init events share a correlationId.

## Resources

- PR #4 — Audit + Event Foundation
- Architecture review finding R5
