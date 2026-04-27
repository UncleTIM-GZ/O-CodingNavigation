export type FsErrorCode = "ENOSPC" | "EACCES" | "EBUSY";

export interface InjectedFsError extends Error {
  code: FsErrorCode;
  syscall?: string;
}

// Returns a synthetic NodeJS.ErrnoException for unit tests that simulate filesystem
// failures via dependency injection. Phase 0 ships only the helper API; Phase 2 wires
// it into the real state-store.
export function injectFsFailure(code: FsErrorCode, syscall = "fs"): InjectedFsError {
  const err = new Error(`Injected ${code} for ${syscall}`) as InjectedFsError;
  err.code = code;
  err.syscall = syscall;
  return err;
}
