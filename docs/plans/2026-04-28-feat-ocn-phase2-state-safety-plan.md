---
title: "feat(phase2): State Safety Foundation — lock + atomic write + stale recovery"
type: feat
status: active
date: 2026-04-28
---

# feat(phase2): State Safety Foundation

> **Origin**: [DEC-001](../19-decision-log.md#dec-001skeleton-spike-passed-and-phase-2-entry-approved) — Phase 2 entry approved with explicit constraint that **state safety must land before any workflow expansion** (no `advance`, no audit, no MCP until this is done).
>
> This is **PR #2** of the approved Phase 2 PR order from DEC-001 §"Approved Next PR Order".
>
> Resolves `implementation-notes.md` simplifications **L1** (no lock + backup + atomic temp/rename) and **L10** (no concurrency lock).

---

## 1. Overview

`writeState()` currently does plain `fs.writeFile` (`src/core/state/state-store.ts:54`). PR #2 wraps every `state.json` mutation with:

1. **Lock acquisition** at `.ocoding/.lock` (exclusive create, retry, stale-recovery)
2. **Backup** of existing `state.json` to `state.json.bak`
3. **Atomic write** via temp file + `fs.rename`
4. **Lock release** in `finally`

Plus Layer 6 concurrency tests (per `docs/07-test-strategy.md` §1631-1664).

**Strict scope**: state.json safety only. NO audit, NO advance, NO MCP, NO doctor, NO reset, NO baseline.

---

## 2. Contract

### 2.1 LockState (zod schema)

```ts
const LockState = z.object({
  pid: z.number().int().positive(),
  createdAt: z.string().regex(/Z$/),       // ISO 8601 UTC ending Z
  command: z.string().min(1),               // "init" | "writeState" | "advance" (Phase 2+)
  client: z.literal("cli"),                 // "mcp" reserved for Phase 2 PR #5
  projectRoot: z.string().min(1),           // absolute path
}).strict();
```

### 2.2 Lock semantics

| Constant | Value | Source |
|---|---|---|
| Retry interval | **200 ms** | user spec §1 |
| Timeout | **5,000 ms** | user spec §1 + CLAUDE.md §4.5 |
| Stale threshold | **30,000 ms** | user spec §1 |

- Write operations MUST acquire the lock. Read operations (`readState`, `getStatus`, `check`) do NOT need the lock.
- Stale lock = lock file age > 30s AND owner pid no longer alive (`process.kill(pid, 0)` → ESRCH).
- Stale lock is automatically reclaimed (unlink + retry).
- Reclaim event is captured today as a returned `lockReclaimed: true` field on the lock handle (audit hook lands in PR #3).

### 2.3 Atomic write protocol

```
┌─────────────────────────────────────────────────────────────┐
│  writeStateAtomic(root, state, command)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. acquireLock(.ocoding/.lock, command)               │ │
│  │  2. try {                                              │ │
│  │       if (exists state.json) cp state.json → .bak     │ │
│  │       write state.json.<pid>.<ts>.tmp                  │ │
│  │       rename tmp → state.json                          │ │
│  │     } finally {                                        │ │
│  │       releaseLock(.ocoding/.lock)                      │ │
│  │     }                                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- Failure **before** rename → state.json untouched, .bak untouched (or already in place from previous successful write — cleanup not needed for spike).
- Failure **after** rename → state committed, follow-up audit will record (Phase 2 PR #3).
- `releaseLock` failure → CommandResult-blocked `ERR_IO_OR_CONFIG` is returned by the wrapping command.

### 2.4 Backup

- Each successful pre-write step copies `state.json` → `state.json.bak` (overwrites previous bak).
- If `state.json` does not exist (first init), no `.bak` is generated.
- Only the most recent backup is retained (single-version, per user spec §3).

---

## 3. Init flow change (TOCTOU fix)

Currently `init.ts` checks `.ocoding/` existence BEFORE any lock. Two simultaneous `ocn init` could both pass the check and both proceed.

**Change**:

1. `mkdir -p .ocoding/` (idempotent — no race even concurrent).
2. `acquireLock(.ocoding/.lock, command="init")`.
3. Inside lock: check if `state.json` exists → blocked `ERR_IO_OR_CONFIG` "already initialized" (semantically more accurate — `state.json` IS the initialized signal).
4. Write yamls + state.json (state.json via the atomic protocol).
5. Release lock.

The existing CLI test "blocks when .ocoding/ already exists" continues to pass — after first init, `state.json` exists, so the second init blocks with the same exit code 4 and bilingual message. **No user-visible behavior change.**

---

## 4. File-by-file plan

### 4.1 `[NEW] src/types/lock.ts`

```ts
import { z } from "zod";
export const LockState = z.object({...}).strict();
export type LockState = z.infer<typeof LockState>;
```

### 4.2 `[NEW] src/core/state/lock.ts`

```ts
export interface AcquireLockOptions { ... }
export interface LockHandle { path: string; lockState: LockState; reclaimed: boolean; }
export class LockTimeoutError extends Error {}
export class LockReleaseError extends Error {}

export async function acquireLock(opts): Promise<LockHandle>
export async function releaseLock(handle: LockHandle): Promise<void>
export function isStaleLockState(state: LockState, now: Date, threshold: number): boolean   // pure
export async function isProcessAlive(pid: number): Promise<boolean>                          // node:process.kill(pid, 0)
```

### 4.3 `[EDIT] src/core/state/state-store.ts`

- Add `writeStateAtomic(root, state, command)` — the new safe writer. Lock + backup + temp+rename.
- Keep existing `writeState(root, state)` as a thin alias that calls `writeStateAtomic(root, state, "writeState")` for backwards compatibility within this PR.
- Phase 2 PR #4 may rename or remove the alias.

### 4.4 `[EDIT] src/core/init.ts`

- Replace `pathExists(ocodingDir)` check with: mkdir + lock + check `state.json` existence.
- Wrap yamls + state.json write inside the lock.

### 4.5 `[EDIT] src/types/index.ts`

- Re-export `LockState`.

### 4.6 `[NEW] tests/unit/lock-state-schema.test.ts`

- Valid LockState parses
- Invalid LockState (missing pid, bad timestamp) rejected
- LockState `client` only accepts "cli"

### 4.7 `[NEW] tests/unit/lock.test.ts`

- `acquireLock` creates `.ocoding/.lock` with valid LockState content
- `releaseLock` removes `.ocoding/.lock`
- `isStaleLockState`: fresh lock → not stale
- `isStaleLockState`: 60s old + dead pid → stale
- `isStaleLockState`: 60s old + alive pid (use `process.pid`) → not stale
- `acquireLock` reclaims a stale lock (returns `reclaimed: true`)
- `acquireLock` times out when lock is held and not stale (use a recent fake lock with current pid)
- `acquireLock` throws `LockTimeoutError` after timeoutMs

### 4.8 `[NEW] tests/unit/state-store-atomic.test.ts`

- `writeStateAtomic` creates `state.json` on first write (no .bak)
- `writeStateAtomic` creates `state.json.bak` on second write
- `writeStateAtomic` removes the lock file after success
- `writeStateAtomic` removes the lock file after failure (lock leak prevention)
- A simulated rename failure leaves `state.json` intact (use a write target whose dir is read-only or a `fs.rename` mock)

### 4.9 `[NEW] tests/lock/concurrent-writes.test.ts`  (Layer 6)

- 5 concurrent `writeStateAtomic` calls → exactly one `state.json` exists with valid JSON, no partial content
- Concurrent `init` + `writeStateAtomic` → init wins or blocks coherently; never corrupts state
- Stale lock + concurrent acquirers → exactly one wins, others retry/timeout

### 4.10 `[EDIT] implementation-notes.md`

- L1 → status: **resolved by PR #2**
- L10 → status: **resolved by PR #2**
- Add new Phase-2-followup capture: "audit hook for `lock_released` and `lock_stale_recovered` events lands in PR #3"

---

## 5. Acceptance Criteria

### 5.1 Functional

- [ ] `.ocoding/.lock` is created during `writeStateAtomic` and removed after success and after failure.
- [ ] Lock content parses against `LockState` schema.
- [ ] `writeStateAtomic` produces `state.json.bak` on second-and-subsequent writes.
- [ ] First write does NOT produce `state.json.bak`.
- [ ] Concurrent writes do not corrupt `state.json` (always parses against `ProjectState` schema after the dust settles).
- [ ] Stale lock is reclaimed; the new lock indicates `reclaimed: true`.
- [ ] Lock timeout returns/throws `LockTimeoutError` mapped to `ERR_IO_OR_CONFIG` exit code 4.

### 5.2 Non-functional

- [ ] All 117 Phase 1 tests still pass.
- [ ] Coverage for `src/core/state/{lock,state-store}.ts` ≥ 85% lines.
- [ ] Total project coverage ≥ 70% (current threshold).
- [ ] No file > 300 lines in target tree.
- [ ] Pre-commit hook (lint + typecheck + test) green.

### 5.3 Quality Gates

- [ ] `npm run lint && npm run typecheck && npm run build && npm run test:coverage` green.
- [ ] CI workflow green.
- [ ] G2 demo (verbatim 8-command spec from user §XVIII of original LFG prompt) still passes.

---

## 6. Out of Scope (defer to subsequent PRs)

| Item | Where it lives |
|---|---|
| `lock_released` / `lock_stale_recovered` audit events | PR #3 — Audit + Event Foundation |
| `ocn doctor --release-lock` | Phase 2 (post-PR #5) per DEC-001 §"Not Approved Yet" |
| MCP-side lock cooperation (`client: "mcp"`) | PR #5 — MCP Safe Tools |
| `ocn advance` and full state-machine | PR #4 |

---

## 7. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | `process.kill(pid, 0)` cross-platform behavior differs | Test on Linux (CI). Document Windows EPERM = alive interpretation in lock.ts. |
| R2 | Concurrent test flakiness on slow CI | Use sufficient retry interval; concurrent test asserts on POST-RACE state validity, not on which writer wins. |
| R3 | Lock file orphaned by SIGKILL during a test → blocks subsequent tests | Each test uses a fresh tmp project; teardown removes the entire tmp dir. |
| R4 | Phase 2 PR #3 audit-hook expectation drifts (we promise "lock_released" but PR #3 might use a different name) | Plan §4.10 captures the exact event names; PR #3 references this plan. |

---

## 8. Verification Checklist (for `/workflows:work`)

- [x] Plan written (this file)
- [ ] `LockState` zod schema in `src/types/lock.ts`
- [ ] `acquireLock` / `releaseLock` / `isStaleLockState` / `isProcessAlive` in `src/core/state/lock.ts`
- [ ] `writeStateAtomic` in `src/core/state/state-store.ts`
- [ ] `init.ts` lock-then-check pattern
- [ ] All Phase 1 tests still pass
- [ ] New tests for lock + atomic write + concurrency pass
- [ ] G2 demo (8-command verbatim) still passes
- [ ] `implementation-notes.md` L1 + L10 marked resolved

---

**END OF PLAN**
