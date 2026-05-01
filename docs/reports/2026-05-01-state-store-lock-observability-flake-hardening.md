# State Store Lock Observability Flake Hardening

> Date: 2026-05-01
> Branch: `test/harden-state-store-lock-observability`
> Caveat: External MCP Host Validation pending for Cursor / Cline (DEC-017 closed for Claude Desktop only). This PR does not change Host validation status.

---

## 1. Summary

Hardens the lock-observability assertion in `tests/unit/state-store-atomic.test.ts` so it no longer races a 1ms `setInterval` polling loop against the `writeStateAtomic` critical section. The test now uses the existing `LockLifecycleHook` surface — exposed by `acquireLock` / `withLock` since PR #2 and already consumed by `init.ts` and `advance-state.ts` — to observe lock acquire / release deterministically.

The previous polling pattern flaked on PR #33 attempt 1 (post-PR-D Claude Desktop host validation merge), where the entire critical section completed inside a single 1ms tick and the polling loop never observed the lock file. The rerun of that CI job passed; `main` was never red. This PR removes the underlying race so that future runs (and the upcoming Node 22 CI matrix expansion required by DEC-018 prerequisites) cannot trip the same flake.

| Field | Value |
| --- | --- |
| Production code change | One additive optional field on `WriteStateOptions` (`lifecycle?: LockLifecycleHook`); pass-through to inner `withLock`. |
| Test change | Single test rewritten from polling to lifecycle-hook observation. Other 8 tests in the file untouched. |
| Local single run | 9 / 9 ✅ |
| Local 100-run targeted loop | 100 / 100 ✅ (pre-fix loop also passed locally; the fix is for the CI race window) |
| Local full suite | 449 / 449 ✅ |
| Local coverage | 83.47% overall (≥ 80% gate); `state-store.ts` 92.13% |
| `npm run build` | ✅ |
| Caveat impact | None. Claude Desktop validation status (DEC-017) unchanged; Cursor / Cline still unverified. |
| npm | No publish, no version bump, no dist-tag movement. |

## 2. Flake observed

The flake fired on PR #33 (the Claude Desktop MCP Host Validation PR) attempt 1, GitHub Actions run [`25209795903`](https://github.com/UncleTIM-GZ/O-CodingNavigation/actions/runs/25209795903) at 2026-05-01T09:36:00Z:

```
FAIL tests/unit/state-store-atomic.test.ts > writeStateAtomic — lock + backup + temp + rename
     > acquires and releases the lock around writeStateAtomic via the public API

  AssertionError: expected false to be true // Object.is equality

  - Expected
  + Received

  - true
  + false

  ❯ tests/unit/state-store-atomic.test.ts:128:21
    expect(sawLock).toBe(true);
```

CI rerun (`run_attempt: 2`) at 2026-05-01T09:37:54Z passed. PR #33 merged green at `27d580a`. `main` was never red, but the underlying race remained as a known flake pending this hardening PR.

## 3. Root cause

The pre-fix test (lines 105-129) tried to observe whether the `.ocoding/.lock` file existed on disk *during* a `writeStateAtomic` call:

```ts
let sawLock = false;
const watcher = setInterval(() => {
  void (async () => {
    try {
      await fs.stat(lockFile);
      sawLock = true;
    } catch { /* ignore */ }
  })();
}, 1);

try {
  await writeStateAtomic(project.cwd, buildState());
} finally {
  clearInterval(watcher);
}

expect(sawLock).toBe(true);
```

The race window is the entire `writeStateAtomic` critical section: `mkdir` → `tryWriteLock` → `writeStateUnlocked` (`copyFile` if existing → `writeFile` tmp → `rename`) → `unlink` (release). On a fast Linux runner with warm filesystem cache, that whole window compresses below 1 ms. The `setInterval(..., 1)` tick is also subject to Node's minimum delay clamp and to event-loop latency from the awaited operations themselves.

Three independent failure modes exist for the polling approach:

1. **Sub-millisecond critical section.** The whole acquire-write-release happens before the first `setInterval` callback fires.
2. **Coalesced ticks.** `setInterval(..., 1)` is rounded up to ≥ 1 ms by Node, but in a busy event loop the interval can be missed entirely while awaited fs ops monopolise the loop.
3. **Async stat lag.** Even when a tick fires inside the critical section, `fs.stat` is itself async; by the time the stat resolves, `unlink` may already have run, and the test's "sawLock" never flips.

Any of those three is sufficient. On my WSL2 box the failure rate is 0 / 100; on GitHub's Ubuntu runner it was reproducible on PR #33 attempt 1. The test was a flake-by-construction.

## 4. Fix

### 4.1 Production code (additive, ~5 lines)

`src/core/state/state-store.ts` — add `lifecycle?: LockLifecycleHook` to `WriteStateOptions` and thread it into the inner `withLock` call:

```ts
import { withLock, type LockLifecycleHook } from "./lock.js";

export interface WriteStateOptions {
  // ...existing fields...
  readonly lifecycle?: LockLifecycleHook;
}

export async function writeStateAtomic(
  root: string,
  state: ProjectState,
  opts: WriteStateOptions = {},
): Promise<void> {
  // ...
  await withLock(
    {
      // ...existing fields...
      ...(opts.lifecycle !== undefined ? { lifecycle: opts.lifecycle } : {}),
    },
    async () => { await writeStateUnlocked(root, state); },
  );
}
```

This is purely additive and symmetric with the lock surface already used by `init.ts` (line 90) and `advance-state.ts` (line 175). No existing caller needs to change. The optional field is forwarded only when set, preserving the `exactOptionalPropertyTypes` discipline used elsewhere in the code base.

The change is **scoped to closing a public-API observability gap** — `writeStateAtomic` was the only `withLock` consumer that didn't expose `lifecycle` to callers — not to fixing a runtime bug. The pre-existing `init.ts` / `advance-state.ts` lifecycle wiring is unaffected.

### 4.2 Test change (single test, hook-based)

`tests/unit/state-store-atomic.test.ts` — the lock-observability test now observes via the hook synchronously inside the lock-held window:

```ts
await writeStateAtomic(project.cwd, buildState(), {
  lifecycle: {
    onAcquired: async (handle) => {
      acquiredCount += 1;
      acquiredHandleSlot.push(handle);
      // Lock file MUST exist on disk while we are inside onAcquired —
      // this is the strong invariant the polling test was approximating.
      await fs.access(lockFile);
      lockFilePresentDuringAcquire = true;
    },
    onReleased: () => { releasedCount += 1; },
  },
});

expect(acquiredCount).toBe(1);
expect(releasedCount).toBe(1);
expect(lockFilePresentDuringAcquire).toBe(true);
expect(acquiredHandleSlot).toHaveLength(1);
const acquiredHandle = acquiredHandleSlot[0];
expect(acquiredHandle?.lockFile).toBe(lockFile);
expect(acquiredHandle?.lockState.pid).toBe(process.pid);

await expect(fs.stat(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
```

`onAcquired` fires synchronously inside `acquireLock` (`src/core/state/lock.ts:161`) immediately after `tryWriteLock` writes the lock file — so by contract the file is on disk when the callback runs. There is no timing window. The post-call disk assertion (`fs.stat(lockFile)` rejects with `ENOENT`) is preserved.

The semantic strengthening is that the hardened test now asserts strictly *more* than the polling test:

| Assertion | Old (polling) | New (hook) |
| --- | --- | --- |
| Lock observed at all | ≈ best-effort (could miss) | Exactly once |
| Lock observed at the right moment | "any time during the call" | "while inside onAcquired" |
| Acquire/release count | not checked | exactly 1 acquire, exactly 1 release |
| Lock handle pid matches | not checked | matches `process.pid` |
| Lock file gone after release | ✅ | ✅ |

No assertion was removed.

## 5. Validation

| Check | Result |
| --- | --- |
| `npm run lint` | ✅ |
| `npm run typecheck` | ✅ |
| `npm run test` (full suite) | **449 / 449** ✅ |
| `npm run test:coverage` (overall) | **83.47%** (≥ 80% gate) |
| `npm run test:coverage` (`src/core/state/state-store.ts`) | **92.13%** |
| `npm run build` | ✅ |
| Single targeted run | 9 / 9 ✅ |
| 100-run targeted stress loop on the hardened test | **100 / 100** ✅ |
| Other 8 tests in `state-store-atomic.test.ts` | unchanged, all pass |
| Other lock-related test files (`lock.test.ts`, `lock-audit-hook.test.ts`, `lock-correlation.test.ts`, `concurrent-writes.test.ts`) | unchanged, all pass |

The 100-run loop was also clean against `main` *before* the fix on my local WSL2 box (the flake's reproducibility is environment-specific — it requires the faster GitHub Actions Ubuntu runner). The hardening is for the CI race window, not for a local repro. The deterministic-hook design eliminates the timing-window failure mode regardless of runner speed, so the flake cannot recur on any future runner.

## 6. Non-goals

- **No `package.json` change.** Version stays `0.1.0-alpha.2`; no `npm publish`, no `dist-tag` movement, no `latest` promotion.
- **No `package-lock.json` change.**
- **No README / quickstart / mcp-usage edit.** The Claude Desktop Host validation status (DEC-017) is unchanged. Cursor and Cline remain unverified.
- **No `.github/workflows/*` change.** This PR does **not** expand the CI matrix to Node 22 — that is a separate DEC-018 prerequisite PR, intentionally sequenced *after* this hardening.
- **No `it.skip`, no quarantine, no test deletion.** The test stays in the default suite with strictly stronger assertions.
- **No new MCP tool.** No change to the MCP allowed-tools whitelist.
- **No git tag, no GitHub release.**

## 7. Follow-up

- After this PR merges, the **CI Node 22 matrix expansion** PR (DEC-018 prerequisite item 2) becomes safe to open. Adding a faster Node version was the obvious lurking trigger for the polling-based flake; deterministic-hook observation makes it a non-event.
- The remaining DEC-018 beta candidate prerequisites are independent and can be scheduled in any order: Host support boundary DEC, examples F2/F3, `npm install -g` smoke evidence, `latest`-tag strategy DEC, doc audit, beta promotion DEC.
- No other tests in the suite use the `setInterval(..., 1)` polling pattern (verified via `grep`); this hardening is a one-shot fix, not a sweep.
- Future authors of state/lock-related tests should prefer the `LockLifecycleHook` surface over disk polling for any "did the lock exist at moment X" assertion. This is now the established pattern in `state-store-atomic.test.ts` to copy from.
