// MVP 3 — acceptance criteria parser for `ocn evidence map` (DEC-024 PR 4).
//
// Pure function: takes raw markdown text + optional source path, returns a
// structured AcceptanceParseResult. Defensive on malformed markdown — never
// throws. Helpers (regexes, fence-state tracker, HTML-comment stripper,
// table-row detector, AC-ID normaliser) live in
// `acceptance-parser-helpers.ts`.

import {
  ACCEPTANCE_HEADING_RE,
  emitCriterion,
  FENCE_RE,
  HEADING_RE,
  isTopLevelListLine,
  type ParserState,
  stripBoldWrap,
  stripHtmlComments,
  TABLE_ROW_RE,
  tryMatchAcId,
  tryParseChecklist,
} from "./acceptance-parser-helpers.js";
import type { AcceptanceParseResult } from "./types.js";

// Re-export normaliseAcId so external callers / tests that previously
// imported it from `acceptance-parser` continue to work.
export { normaliseAcId } from "./acceptance-parser-helpers.js";

// Stable size threshold above which we still parse but emit a warning.
const SOFT_SIZE_LIMIT_BYTES = 256 * 1024;

// Process a markdown heading line. Updates the in-acceptance-section flag.
function processHeading(line: string, state: ParserState, sourceLine: number): boolean {
  const m = HEADING_RE.exec(line);
  if (m === null) return false;
  const headingText = (m[2] ?? "").trim();
  const stripped = stripBoldWrap(headingText);

  // First check: heading itself is `## AC-001 ...` — explicit heading-form criterion.
  const acMatch = tryMatchAcId(stripped);
  if (acMatch !== null) {
    emitCriterion(state, {
      text: acMatch.remainder,
      sourceLine,
      originalId: acMatch.originalId,
    });
    return true;
  }

  // Otherwise: does this heading open an acceptance section?
  state.inAcceptanceSection = ACCEPTANCE_HEADING_RE.test(stripped);
  return true;
}

// Process a non-heading line.
function processBodyLine(line: string, state: ParserState, sourceLine: number): void {
  // First check: an explicit AC ID in a bullet / numbered / plain line.
  const list = isTopLevelListLine(line);
  let body: string;
  let checked: boolean | undefined;
  if (list !== null) {
    body = list.body;
    const checklist = tryParseChecklist(body);
    if (checklist !== null) {
      body = checklist.body;
      checked = checklist.checked;
    }
  } else {
    body = line.trim();
  }

  body = stripBoldWrap(body);

  const acMatch = tryMatchAcId(body);
  if (acMatch !== null) {
    emitCriterion(state, {
      text: acMatch.remainder,
      sourceLine,
      originalId: acMatch.originalId,
      ...(checked !== undefined ? { checked } : {}),
    });
    return;
  }

  // Not an explicit AC id. Generate one only if we are inside an acceptance
  // section AND the line is a bullet / numbered list item with non-empty body.
  if (state.inAcceptanceSection && list !== null && body.length > 0) {
    emitCriterion(state, {
      text: body,
      sourceLine,
      originalId: null,
      ...(checked !== undefined ? { checked } : {}),
    });
  }
}

export interface ParseAcceptanceOptions {
  // Path to surface back to the caller — display-only.
  readonly path: string;
}

// Parses the markdown content. Pure: no IO.
export function parseAcceptanceCriteria(
  markdown: string,
  opts: ParseAcceptanceOptions,
): AcceptanceParseResult {
  const state: ParserState = {
    criteria: [],
    seenIds: new Set<string>(),
    warnings: [],
    generatedCounter: 0,
    inAcceptanceSection: false,
  };

  if (markdown.length > SOFT_SIZE_LIMIT_BYTES) {
    state.warnings.push(
      `acceptance criteria file exceeds soft size limit of ${SOFT_SIZE_LIMIT_BYTES} bytes`,
    );
  }

  // Strip HTML comments (single- or multi-line) before line splitting so AC
  // IDs that appear inside `<!-- ... -->` are never registered. We preserve
  // newlines so source-line numbers remain stable for content after comments.
  const sanitized = stripHtmlComments(markdown);

  const lines = sanitized.split("\n");
  // Track fenced-code-block state across lines: while inside ``` or ~~~ we
  // skip every line so AC IDs inside code samples don't register.
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    // Strip a trailing CR so CRLF-terminated files parse the same as LF.
    const raw = (lines[i] ?? "").replace(/\r$/, "");
    const sourceLine = i + 1;

    // Fenced-code toggle: a line starting with ``` (or ~~~) flips the state.
    // The fence-delimiter line itself is also skipped.
    if (FENCE_RE.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (raw.trim().length === 0) continue;

    // Markdown table rows (leading `|`) — including header / separator / data
    // rows — never register as AC bullets.
    if (TABLE_ROW_RE.test(raw)) continue;

    if (processHeading(raw, state, sourceLine)) continue;
    processBodyLine(raw, state, sourceLine);
  }

  return {
    path: opts.path,
    found: true,
    criteriaCount: state.criteria.length,
    criteria: state.criteria,
    warnings: state.warnings,
  };
}

// Helper used by the orchestrator when the AC file is absent.
export function emptyAcceptanceParseResult(path: string): AcceptanceParseResult {
  return {
    path,
    found: false,
    criteriaCount: 0,
    criteria: [],
    warnings: [],
  };
}
