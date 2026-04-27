import type { BilingualMessage } from "../types/i18n.js";
import type { CommandResult, ErrorCode, FailureCode } from "../types/result.js";
import { ExitCodeFor } from "../types/result.js";

export function ok<T>(message: BilingualMessage, data?: T): CommandResult<T> {
  if (data !== undefined) {
    return { ok: true, code: "OK", message, data };
  }
  return { ok: true, code: "OK", message };
}

// Blocked result is independent of T — diagnostic data may be any shape.
// Returns a CommandResult<T> for any T because the failure branch's `data` is `unknown`.
export function blocked<T = never>(
  code: FailureCode,
  message: BilingualMessage,
  data?: unknown,
  details?: unknown,
): CommandResult<T> {
  const envelope: CommandResult<T> & { ok: false } = {
    ok: false,
    code,
    message,
    error: details !== undefined ? { code, message, details } : { code, message },
  };
  if (data !== undefined) envelope.data = data;
  return envelope;
}

export const exitCodeFor = (code: ErrorCode): 0 | 1 | 2 | 3 | 4 | 5 => ExitCodeFor[code];
