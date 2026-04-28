---
status: pending
priority: p2
issue_id: 012
tags: [code-review, audit, lock, reliability]
dependencies: []
---

# `onReleased` hook must fire even when `releaseLock` throws

## Problem Statement

`src/core/state/lock.ts:215-221` (`withLock` finally block):

```ts
} finally {
  await releaseLock(handle);          // can throw LockReleaseError
  await runHook(opts.lifecycle?.onReleased, handle);   // never reached if above throws
}
```

If `releaseLock` throws (e.g., disk error, file ownership change), the `onReleased` hook is never called. **Audit gaps land exactly where they hurt most** — when something abnormal happened during release.

PR #4 (advance) will rely on `lock_acquired → state_transition → lock_released` correlation. A missing `lock_released` for an error path makes that correlation lossy.

## Findings

- `src/core/state/lock.ts:215-221` — current finally pattern propagates `releaseLock` error before reaching hook.
- Source: architecture-strategist review, R1 (MEDIUM).

## Proposed Solutions

### Option A — Wrap `releaseLock` in its own try; always invoke `onReleased`

```ts
} finally {
  let released = true;
  try {
    await releaseLock(handle);
  } catch (err) {
    released = false;
    // re-throw after hook fires? or swallow? See option discussion.
  }
  await runHook(opts.lifecycle?.onReleased, { ...handle, released });
}
```

- Pros: `onReleased` always fires.
- Cons: adds a `released: boolean` field to the hook payload, slight type change.

### Option B — Always invoke hook, then re-throw

```ts
} finally {
  let releaseError: unknown;
  try { await releaseLock(handle); } catch (e) { releaseError = e; }
  await runHook(opts.lifecycle?.onReleased, handle);
  if (releaseError) throw releaseError;
}
```

- Pros: hook fires first, error still propagates.
- Cons: hook receives the same handle even though release failed — caller may be misled.

### Option C — Add a separate `onReleaseFailed` hook

- Pros: clean signal for the unhappy path.
- Cons: 5th hook member; YAGNI today.

**Recommended: Option B** — minimal change, audit gap closed, error semantics preserved.

## Acceptance Criteria

- [ ] When `releaseLock` throws, `onReleased` is still called exactly once.
- [ ] The original `LockReleaseError` still propagates to the caller.
- [ ] Test added: a hook fixture asserts `onReleased` fires when `releaseLock` is forced to throw (mock fs.unlink).

## Resources

- PR #4 — Audit + Event Foundation
- Architecture review finding R1
