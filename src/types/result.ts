import { z } from "zod";
import type { BilingualMessage } from "./i18n.js";

export const ErrorCode = z.enum([
  "OK",
  "ERR_GATE_FAILED",
  "ERR_ARTIFACT_INVALID",
  "ERR_STATE_MACHINE",
  "ERR_IO_OR_CONFIG",
  "ERR_SOP_VERSION",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export type FailureCode = Exclude<ErrorCode, "OK">;

export interface CommandResultErrorEnvelope {
  code: FailureCode;
  message: BilingualMessage;
  details?: unknown;
}

// Discriminated union — the blocked branch carries diagnostic data of any shape,
// while the ok branch carries the typed success payload T. With
// `exactOptionalPropertyTypes: true`, this prevents accidental cross-talk
// between success/failure data.
export type CommandResult<T = unknown> =
  | {
      ok: true;
      code: "OK";
      message: BilingualMessage;
      data?: T;
    }
  | {
      ok: false;
      code: FailureCode;
      message: BilingualMessage;
      data?: unknown;
      error: CommandResultErrorEnvelope;
    };

export const ExitCodeFor: Readonly<Record<ErrorCode, 0 | 1 | 2 | 3 | 4 | 5>> = Object.freeze({
  OK: 0,
  ERR_GATE_FAILED: 1,
  ERR_ARTIFACT_INVALID: 2,
  ERR_STATE_MACHINE: 3,
  ERR_IO_OR_CONFIG: 4,
  ERR_SOP_VERSION: 5,
});
