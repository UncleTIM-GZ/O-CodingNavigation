// Shared CLI helper: pure flag validators (PR-B / H5).
//
// Each helper takes raw user input and returns either `{ ok: true, value }`
// or `{ ok: false, failure: CommandResult }`. Pure: no I/O, no side effects.
//
// `error.details.received` is intentionally a sentinel keyword (not the raw
// path) for `--project-root` validation per the L4 fix in PR-A. The bilingual
// `message` continues to include the path because it is already user-visible.

import { isAbsolute } from "node:path";
import type { CommandResult } from "../../types/result.js";
import { blocked } from "../../core/result.js";
import { msg } from "../../core/i18n.js";

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: CommandResult<unknown> };

// PR number — must be a positive integer. The `argument` payload is
// caller-supplied so error envelopes match the call site exactly (e.g.
// `"--pr"` vs `"number"` for the `github analyze-pr` positional argument).
export function validatePrNumber(
  raw: unknown,
  argument: string,
): ValidationResult<number> {
  if (typeof raw !== "string" || !/^[1-9][0-9]*$/.test(raw)) {
    return {
      ok: false,
      failure: blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `Invalid PR number "${String(raw)}". Expected a positive integer (e.g. 42).`,
          `PR 编号 "${String(raw)}" 无效，必须是正整数（例如 42）。`,
        ),
        { argument, received: String(raw) },
      ),
    };
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return {
      ok: false,
      failure: blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `Invalid PR number "${raw}". Expected a positive integer (e.g. 42).`,
          `PR 编号 "${raw}" 无效，必须是正整数（例如 42）。`,
        ),
        { argument, received: raw },
      ),
    };
  }
  return { ok: true, value };
}

export interface ValidateProjectRootOptions {
  readonly fallbackToCwd?: boolean;
}

// Project-root — undefined → defaults to cwd (when fallbackToCwd, default
// true). Non-absolute → ERR_IO_OR_CONFIG / exit 4. The bilingual message
// includes the path; details.received is the sentinel "non-absolute-path".
export function validateProjectRoot(
  raw: unknown,
  opts: ValidateProjectRootOptions = {},
): ValidationResult<string> {
  const fallbackToCwd = opts.fallbackToCwd !== false;
  if (raw === undefined) {
    if (fallbackToCwd) return { ok: true, value: process.cwd() };
    return {
      ok: false,
      failure: blocked(
        "ERR_IO_OR_CONFIG",
        msg("--project-root is required.", "必须提供 --project-root。"),
        { argument: "--project-root", received: "missing" },
      ),
    };
  }
  if (typeof raw !== "string" || !isAbsolute(raw)) {
    return {
      ok: false,
      failure: blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          `--project-root must be an absolute path (got: ${String(raw)}).`,
          `--project-root 必须是绝对路径（当前值：${String(raw)}）。`,
        ),
        { argument: "--project-root", received: "non-absolute-path" },
      ),
    };
  }
  return { ok: true, value: raw };
}

// Mode — must be a member of the `supported` tuple.
export function validateMode<T extends string>(
  raw: unknown,
  supported: readonly T[],
  argument: string = "--mode",
): ValidationResult<T> {
  if (typeof raw !== "string" || !(supported as readonly string[]).includes(raw)) {
    return {
      ok: false,
      failure: blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `Invalid ${argument} "${String(raw)}". Expected one of: ${supported.join(", ")}.`,
          `${argument} "${String(raw)}" 无效，必须是以下之一：${supported.join(", ")}。`,
        ),
        { argument, received: String(raw) },
      ),
    };
  }
  return { ok: true, value: raw as T };
}

// Mode requires --pr. Used by verify/verdict where `--mode pr` requires `--pr`.
export function validateModeRequiresPr(
  mode: string,
  prNumber: number | null,
  expectedMode: string = "pr",
): ValidationResult<true> {
  if (mode === expectedMode && prNumber === null) {
    return {
      ok: false,
      failure: blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `mode \`${expectedMode}\` requires \`--pr <number>\`.`,
          `--mode \`${expectedMode}\` 必须搭配 \`--pr <number>\` 使用。`,
        ),
        { argument: "--mode", received: expectedMode },
      ),
    };
  }
  return { ok: true, value: true };
}
