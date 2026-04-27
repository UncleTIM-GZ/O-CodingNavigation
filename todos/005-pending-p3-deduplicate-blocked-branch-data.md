---
status: pending
priority: p3
issue_id: 005
tags: [code-review, api-contract, drift-risk]
dependencies: []
---

# Pick one home for blocked-branch diagnostics (`data` vs `error.details`)

## Problem Statement

`blocked()` (`src/core/result.ts:14-28`) populates BOTH `result.data` and `result.error.details` with diagnostic info. Renderers (`text.ts`) read from `result.data`; JSON consumers may read either. Two places to update = silent drift waiting to happen.

## Findings

- `src/core/result.ts:14-28` — `blocked()` accepts both `data` and `details` and stuffs them in different fields.
- `src/core/check.ts:106-112` and similar — call sites pass the same diagnostic shape to both slots in some cases.
- Source: architecture-strategist review, P1-2.

## Proposed Solutions

### Option A — Failure-shaped diagnostics live ONLY in `error.details`

```ts
// blocked() takes only `details`; `data` is undefined on the failure branch
return blocked("ERR_ARTIFACT_INVALID", msg(...), { artifactPath, status, missingRequiredSectionIds });
// renderer reads result.error.details when !result.ok
```

- Pros: one place, clear separation (success carries `data`, failure carries `error.details`).
- Cons: API Contract amendment needed (touches docs/06-api-contract.md indirectly).

### Option B — Keep `data` on failure, drop `error.details` (or vice versa)

- Pros: smaller change.
- Cons: doesn't match the discriminated-union spirit.

**Recommended: Option A** — coordinate with API Contract review at Phase 2 boundary.

## Technical Details

- Affected files: `src/core/result.ts`, `src/types/result.ts`, `src/cli/render/text.ts`, every `blocked(...)` call site.
- Tests need updates wherever they read `result.data` after `ok=false`.

## Acceptance Criteria

- [ ] `blocked()` populates exactly one of `data` or `error.details`.
- [ ] Renderer + JSON consumers read from the chosen field consistently.
- [ ] Test assertions updated.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- Architecture review finding P1-2
- `implementation-notes.md` §1 L12
