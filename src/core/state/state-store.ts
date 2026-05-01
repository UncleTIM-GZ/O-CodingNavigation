import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { Paths } from "../paths.js";
import { ProjectState } from "../../types/state.js";
import { withLock, type LockLifecycleHook } from "./lock.js";

// PR #2 — State Safety Foundation. Resolves implementation-notes.md L1 + L10.
// All `state.json` mutations now flow through `writeStateAtomic`:
//   1. acquire `.ocoding/.lock`
//   2. backup `state.json` → `state.json.bak` (if state.json exists)
//   3. write `state.json.<pid>.<ts>.tmp`
//   4. atomic rename tmp → state.json
//   5. release lock (in finally)
//
// `writeStateUnlocked` is exposed for callers that already hold the outer lock
// (e.g. `init.ts` which wraps several writes in a single critical section).

export class StateNotFoundError extends Error {
  constructor(public readonly file: string) {
    super(`state.json not found at ${file}`);
    this.name = "StateNotFoundError";
  }
}

export class StateInvalidError extends Error {
  constructor(
    public readonly file: string,
    public readonly issues: unknown,
  ) {
    super(`state.json invalid at ${file}`);
    this.name = "StateInvalidError";
  }
}

export async function readState(root: string): Promise<ProjectState> {
  const file = Paths.stateFile(root);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new StateNotFoundError(file);
    }
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new StateInvalidError(file, (err as Error).message);
  }
  const result = ProjectState.safeParse(parsed);
  if (!result.success) {
    throw new StateInvalidError(file, result.error.issues);
  }
  return result.data;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

/**
 * Backup-then-temp-then-rename. Does NOT acquire the lock — callers must
 * already hold `.ocoding/.lock`. Used by `writeStateAtomic` and by `init.ts`'s
 * larger critical section.
 *
 * Failure semantics (plan §2.3):
 *   - failure BEFORE rename → state.json untouched (we wrote to a temp file)
 *   - failure AFTER rename  → state committed; audit will record in PR #3
 */
export async function writeStateUnlocked(root: string, state: ProjectState): Promise<void> {
  const file = Paths.stateFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  if (await pathExists(file)) {
    await fs.copyFile(file, `${file}.bak`);
  }
  const tmpFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(state, null, 2) + "\n";
  try {
    await fs.writeFile(tmpFile, payload, "utf8");
    await fs.rename(tmpFile, file);
  } catch (err) {
    await fs.unlink(tmpFile).catch(() => undefined);
    throw err;
  }
}

export interface WriteStateOptions {
  readonly command?: string;
  readonly retryIntervalMs?: number;
  readonly timeoutMs?: number;
  readonly staleThresholdMs?: number;
  /** Optional lock lifecycle hook. Symmetric with `acquireLock` / `withLock`
   *  and the way `init.ts` / `advance-state.ts` already thread `lifecycle`
   *  through their outer locks. Lets callers (and tests) observe acquire /
   *  release / timeout / stale-recovery deterministically instead of polling
   *  the lock file on disk. Hook errors are swallowed by `runHook` inside
   *  `lock.ts`, so the lock contract is preserved. */
  readonly lifecycle?: LockLifecycleHook;
}

/**
 * Lock + backup + atomic write of `state.json`. The single safe path for any
 * `state.json` mutation in OCN when the caller is NOT already inside another
 * `.ocoding/.lock` critical section.
 */
export async function writeStateAtomic(
  root: string,
  state: ProjectState,
  opts: WriteStateOptions = {},
): Promise<void> {
  const lockFile = join(Paths.ocodingDir(root), ".lock");
  await fs.mkdir(Paths.ocodingDir(root), { recursive: true });
  await withLock(
    {
      lockFile,
      command: opts.command ?? "writeState",
      projectRoot: root,
      ...(opts.retryIntervalMs !== undefined ? { retryIntervalMs: opts.retryIntervalMs } : {}),
      ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
      ...(opts.staleThresholdMs !== undefined ? { staleThresholdMs: opts.staleThresholdMs } : {}),
      ...(opts.lifecycle !== undefined ? { lifecycle: opts.lifecycle } : {}),
    },
    async () => {
      await writeStateUnlocked(root, state);
    },
  );
}

/**
 * Backwards-compatible alias retained during PR #2 to keep existing call sites
 * (currently `init.ts` after this PR) working without churn. Phase 2 PR #4 may
 * inline `writeStateAtomic` and remove this alias.
 */
export async function writeState(root: string, state: ProjectState): Promise<void> {
  await writeStateAtomic(root, state);
}
