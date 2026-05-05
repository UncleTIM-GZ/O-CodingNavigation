// PR-B / M1 — single source of truth for acceptance-criteria loading.
//
// Replaces three duplicated implementations that previously lived in
// `evidence-map-runner`, `verify-status`, and `next-prompt`. Adopts the
// superior error semantics from `evidence-map-runner`: ENOENT degrades to a
// clean "file missing" result; permission errors / symlink loops degrade to
// "file missing" but record a synthetic warning so callers can surface the
// underlying cause to humans instead of pretending the file simply isn't
// there.
//
// Pure I/O — no parsing logic lives here; that stays in
// `acceptance-parser.ts`. We just read, attach the relative path, and
// dispatch into `parseAcceptanceCriteria`. Returns
// `{ result: AcceptanceParseResult; warnings: string[] }` so callers can
// aggregate warnings into their own envelopes deterministically.

import { promises as fs } from "node:fs";
import { join, relative } from "node:path";
import {
  emptyAcceptanceParseResult,
  parseAcceptanceCriteria,
} from "./acceptance-parser.js";
import type { AcceptanceParseResult } from "./types.js";

export const ACCEPTANCE_RELATIVE_PATH = "docs/03-acceptance-criteria.md";

export interface AcceptanceLoadResult {
  readonly result: AcceptanceParseResult;
  readonly warnings: readonly string[];
}

// Load + parse `docs/03-acceptance-criteria.md` from the given cwd.
//
// - File missing (ENOENT) → empty result, no warning.
// - Read error of any other kind → empty result, single warning describing
//   the OS error code (e.g. `EACCES`, `ELOOP`, `EISDIR`).
// - File present → parsed result with whatever warnings the parser emitted.
//
// Never throws.
export async function loadAcceptanceFromProject(
  cwd: string,
): Promise<AcceptanceLoadResult> {
  const absPath = join(cwd, ACCEPTANCE_RELATIVE_PATH);
  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      return {
        result: emptyAcceptanceParseResult(ACCEPTANCE_RELATIVE_PATH),
        warnings: [],
      };
    }
    return {
      result: emptyAcceptanceParseResult(ACCEPTANCE_RELATIVE_PATH),
      warnings: [`acceptance file unreadable: ${e.code ?? "unknown"}`],
    };
  }
  const path = relative(cwd, absPath) || ACCEPTANCE_RELATIVE_PATH;
  const result = parseAcceptanceCriteria(raw, { path });
  return { result, warnings: [] };
}
