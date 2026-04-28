---
status: pending
priority: p3
issue_id: 015
tags: [code-review, simplicity, api-cleanup]
dependencies: []
---

# Drop the always-true `jsonlOk` field from `WriteAuditEventResult`

## Problem Statement

`src/core/audit/audit-writer.ts:5-9` declares:

```ts
export interface WriteAuditEventResult {
  readonly jsonlOk: boolean;
  readonly markdownOk: boolean;
  readonly warning?: string;
}
```

`writeAuditEvent` only returns when `appendAuditJsonl` succeeded (otherwise it throws). Therefore `jsonlOk` is always `true` on a returned result. The field is dead/misleading.

## Findings

- `src/core/audit/audit-writer.ts:5-9, 23, 28-32` — `jsonlOk` always `true` in returned values.
- Source: code-simplicity-reviewer #5.

## Proposed Solutions

### Option A — Drop `jsonlOk`

```ts
export interface WriteAuditEventResult {
  readonly markdownOk: boolean;
  readonly warning?: string;
}
```

Caller convention: a returned result implies JSONL succeeded; thrown error means JSONL failed.

- Pros: removes a misleading field; signature clearer.
- Cons: small breaking change for any external consumer (none today).

## Acceptance Criteria

- [ ] `WriteAuditEventResult` no longer has `jsonlOk`.
- [ ] Tests in `tests/unit/audit-writer-failure.test.ts` updated to assert `markdownOk` only.

## Resources

- PR #4 — Audit + Event Foundation
- Simplicity review #5
