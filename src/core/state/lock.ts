import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { LockState } from "../../types/lock.js";

// PR #2 — State Safety Foundation
// Lock semantics per plan §2.2 + user spec §1.

export const DEFAULT_RETRY_INTERVAL_MS = 200;
export const DEFAULT_TIMEOUT_MS = 5_000;
export const DEFAULT_STALE_THRESHOLD_MS = 30_000;

export interface AcquireLockOptions {
  readonly lockFile: string;
  readonly command: string;
  readonly projectRoot: string;
  readonly retryIntervalMs?: number;
  readonly timeoutMs?: number;
  readonly staleThresholdMs?: number;
  readonly now?: () => Date;
}

export interface LockHandle {
  readonly lockFile: string;
  readonly lockState: LockState;
  readonly reclaimed: boolean;
}

export class LockTimeoutError extends Error {
  constructor(
    public readonly lockFile: string,
    public readonly waitedMs: number,
  ) {
    super(`Lock timeout after ${waitedMs}ms at ${lockFile}`);
    this.name = "LockTimeoutError";
  }
}

export class LockReleaseError extends Error {
  constructor(
    public readonly lockFile: string,
    public readonly causedBy: unknown,
  ) {
    super(`Failed to release lock at ${lockFile}`);
    this.name = "LockReleaseError";
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pure stale check. Lock is stale iff:
 *   1. age (now - createdAt) exceeds the threshold, AND
 *   2. the owner pid is no longer alive on this host.
 *
 * Both conditions matter: a fresh lock is never stale even if the pid is
 * unknown to us (cross-user); an old lock owned by a still-running process is
 * still active.
 */
export function isStaleLockState(args: {
  state: LockState;
  now: Date;
  staleThresholdMs: number;
  pidAlive: boolean;
}): boolean {
  const ageMs = args.now.getTime() - new Date(args.state.createdAt).getTime();
  return ageMs > args.staleThresholdMs && !args.pidAlive;
}

/**
 * Cross-platform "is this pid alive on the local host?". POSIX + Windows
 * support `process.kill(pid, 0)` as a no-op signal that throws ESRCH when the
 * pid is gone. EPERM (cross-user) means the process exists but we cannot
 * signal it — treat as alive to be safe.
 */
export async function isProcessAlive(pid: number): Promise<boolean> {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    return false;
  }
}

async function readLockFile(lockFile: string): Promise<LockState | null> {
  try {
    const raw = await fs.readFile(lockFile, "utf8");
    const parsed = LockState.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    return null; // corrupted file — treat as unparseable
  }
}

async function tryWriteLock(lockFile: string, state: LockState): Promise<boolean> {
  try {
    await fs.mkdir(dirname(lockFile), { recursive: true });
    const handle = await fs.open(lockFile, "wx");
    try {
      await handle.writeFile(JSON.stringify(state, null, 2) + "\n", "utf8");
    } finally {
      await handle.close();
    }
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}

export async function acquireLock(opts: AcquireLockOptions): Promise<LockHandle> {
  const retryIntervalMs = opts.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const staleThresholdMs = opts.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
  const now = opts.now ?? (() => new Date());
  const start = Date.now();
  let reclaimed = false;

  for (;;) {
    const lockState: LockState = {
      pid: process.pid,
      createdAt: now().toISOString(),
      command: opts.command,
      client: "cli",
      projectRoot: opts.projectRoot,
    };

    if (await tryWriteLock(opts.lockFile, lockState)) {
      return { lockFile: opts.lockFile, lockState, reclaimed };
    }

    const existing = await readLockFile(opts.lockFile);
    if (existing) {
      const alive = await isProcessAlive(existing.pid);
      if (
        isStaleLockState({
          state: existing,
          now: now(),
          staleThresholdMs,
          pidAlive: alive,
        })
      ) {
        // Best-effort reclaim; another reclaimer may unlink first — that's fine.
        await fs.unlink(opts.lockFile).catch(() => undefined);
        reclaimed = true;
        continue;
      }
    }

    if (Date.now() - start >= timeoutMs) {
      throw new LockTimeoutError(opts.lockFile, Date.now() - start);
    }
    await sleep(retryIntervalMs);
  }
}

export async function releaseLock(handle: LockHandle): Promise<void> {
  try {
    const existing = await readLockFile(handle.lockFile);
    if (existing && existing.pid !== handle.lockState.pid) {
      // Lock was reclaimed under us — do not unlink someone else's lock.
      return;
    }
    await fs.unlink(handle.lockFile);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return; // already gone — fine
    throw new LockReleaseError(handle.lockFile, err);
  }
}

/**
 * Convenience wrapper: acquire → run op → release in finally.
 */
export async function withLock<T>(
  opts: AcquireLockOptions,
  op: (handle: LockHandle) => Promise<T>,
): Promise<T> {
  const handle = await acquireLock(opts);
  try {
    return await op(handle);
  } finally {
    await releaseLock(handle);
  }
}
