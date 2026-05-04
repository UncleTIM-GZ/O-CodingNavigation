// MVP 3 — acceptance criteria parser for `ocn evidence map` (DEC-024 PR 4).
//
// Pure function: takes raw markdown text + optional source path, returns a
// structured AcceptanceParseResult. Defensive on malformed markdown — never
// throws. Supported formats are documented inline below and in the report.

import type { AcceptanceCriterion, AcceptanceParseResult } from "./types.js";

// Stable size threshold above which we still parse but emit a warning.
const SOFT_SIZE_LIMIT_BYTES = 256 * 1024;

// Captures: AC-<DOMAIN-?><digits> with various separators after the id.
// We accept `AC-` or `AC` prefix, optional dot, and one or more domain-like
// uppercase tokens, then a numeric tail. Examples we need to accept:
//   AC-001    AC-1    AC1    AC-INIT-001    AC-DOMAIN-001    AC.001
const AC_ID_RE = /^AC[-.]?(?:[A-Z][A-Z0-9]*[-.]?)*\d+/;

// Trailing separator characters allowed after the ID. Includes ASCII `:`,
// `—` (em dash), `–` (en dash), `-`, the full-width `｜`, and whitespace.
const SEPARATOR_AFTER_ID_RE = /^\s*(?:[:：｜\-—–]|\s)+/;

// English / Chinese acceptance heading detectors.
const ACCEPTANCE_HEADING_RE = /(acceptance\s*(criteria|criterion|items|list)?|验收|验收标准)/i;

// Extract the heading text from a `#`-style markdown heading line.
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;

// Bullet/numbered list detectors. We only need to know that the line starts
// with a list marker so we can extract its body.
const BULLET_RE = /^(\s*)([-*+])\s+(.*)$/;
const NUMBERED_RE = /^(\s*)\d+[.)]\s+(.*)$/;

// Fenced-code-block delimiter. Matches `` ``` `` or `~~~` with up to 3 leading
// spaces (per CommonMark). We track entering/leaving fences across lines so
// any `AC-001` examples inside fenced blocks are skipped.
const FENCE_RE = /^\s{0,3}(?:```|~~~)/;

// Markdown table row detector — a leading `|` (with up to 3 leading spaces).
// Table rows must not register as AC bullets even if they contain an AC ID.
const TABLE_ROW_RE = /^\s{0,3}\|/;

// Strip HTML comments (`<!-- ... -->`) from raw markdown before line splitting.
// Comments may span multiple lines; we drop the entire `<!--…-->` span,
// preserving newlines outside the comment so source-line numbers remain stable
// for content following the comment.
function stripHtmlComments(input: string): string {
  let out = "";
  let i = 0;
  const n = input.length;
  while (i < n) {
    const open = input.indexOf("<!--", i);
    if (open === -1) {
      out += input.slice(i);
      break;
    }
    out += input.slice(i, open);
    const close = input.indexOf("-->", open + 4);
    if (close === -1) {
      // Unterminated comment — drop the rest of the input but keep one newline
      // for each newline we are dropping so subsequent line numbers stay stable.
      const dropped = input.slice(open);
      const newlineCount = (dropped.match(/\n/g) ?? []).length;
      out += "\n".repeat(newlineCount);
      break;
    }
    // Replace the entire `<!--…-->` span with as many newlines as it contained,
    // so line numbers for everything after the comment are unaffected.
    const span = input.slice(open, close + 3);
    const newlineCount = (span.match(/\n/g) ?? []).length;
    out += "\n".repeat(newlineCount);
    i = close + 3;
  }
  return out;
}

// Checklist detector: `[ ]` / `[x]` / `[X]`.
const CHECKLIST_RE = /^\[([ xX])\]\s*(.*)$/;

// Strip leading bold markers (`**...**`) that wrap the AC ID.
function stripBoldWrap(s: string): string {
  // Match `**ID**` or `**ID-001**` at the very start, then the rest.
  const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(s);
  if (m === null) return s;
  return `${m[1]} ${m[2]}`.replace(/\s+$/, "");
}

interface AcMatch {
  readonly originalId: string;
  readonly remainder: string;
}

function tryMatchAcId(line: string): AcMatch | null {
  const upper = line.toUpperCase();
  const m = AC_ID_RE.exec(upper);
  if (m === null) return null;
  const matchedLen = m[0].length;
  const originalId = line.slice(0, matchedLen);
  let remainder = line.slice(matchedLen);
  // Strip the separator block (if any) between the ID and the text.
  const sepMatch = SEPARATOR_AFTER_ID_RE.exec(remainder);
  if (sepMatch !== null) {
    remainder = remainder.slice(sepMatch[0].length);
  }
  return { originalId, remainder: remainder.trim() };
}

// Normalise an AC id to a stable canonical form. Domain segments stay as
// uppercase; the trailing numeric segment is zero-padded to 3 digits.
//
// Examples:
//   AC-1           → AC-001
//   AC1            → AC-001
//   AC-001         → AC-001
//   AC-INIT-1      → AC-INIT-001
//   AC.INIT.001    → AC-INIT-001
//   AC-DOMAIN-100  → AC-DOMAIN-100
export function normaliseAcId(rawId: string): string {
  // Replace dot separators with hyphens, uppercase everything.
  const s = rawId.toUpperCase().replace(/\./g, "-");
  // Split into segments. The first must be `AC` (or `AC<digits>` like AC1).
  // Insert a separator between `AC` and a trailing-digit-only first segment.
  const m = /^AC(\d*)([-]?)(.*)$/.exec(s);
  if (m === null) {
    return s;
  }
  const headDigits = m[1] ?? "";
  const rest = m[3] ?? "";
  let segments: string[];
  if (rest.length === 0) {
    segments = [headDigits];
  } else if (headDigits.length === 0) {
    segments = rest.split("-").filter((seg) => seg.length > 0);
  } else {
    // Should not normally happen — `AC1-FOO` etc. We keep it conservative.
    segments = [headDigits, ...rest.split("-").filter((seg) => seg.length > 0)];
  }

  // Detect the trailing numeric segment and zero-pad it to >= 3 digits.
  const last = segments[segments.length - 1];
  if (last !== undefined && /^\d+$/.test(last)) {
    segments[segments.length - 1] = last.padStart(3, "0");
  }

  return segments.length > 0 ? `AC-${segments.join("-")}` : "AC";
}

// True when the line is a top-level bullet, not a nested continuation.
function isTopLevelListLine(line: string): { kind: "bullet" | "numbered"; body: string } | null {
  const bullet = BULLET_RE.exec(line);
  if (bullet !== null) {
    const indent = bullet[1] ?? "";
    // Only top-level: indent of two spaces or fewer.
    if (indent.length <= 2) {
      return { kind: "bullet", body: bullet[3] ?? "" };
    }
    return null;
  }
  const numbered = NUMBERED_RE.exec(line);
  if (numbered !== null) {
    const indent = numbered[1] ?? "";
    if (indent.length <= 2) {
      return { kind: "numbered", body: numbered[2] ?? "" };
    }
  }
  return null;
}

// Strip checklist marker; returns body and checked flag (or null if not a checklist).
function tryParseChecklist(body: string): { checked: boolean; body: string } | null {
  const m = CHECKLIST_RE.exec(body);
  if (m === null) return null;
  const flag = m[1];
  return {
    checked: flag === "x" || flag === "X",
    body: (m[2] ?? "").trim(),
  };
}

interface AddCriterionInput {
  readonly text: string;
  readonly sourceLine: number;
  readonly originalId: string | null;
  readonly checked?: boolean;
}

interface ParserState {
  readonly criteria: AcceptanceCriterion[];
  readonly seenIds: Set<string>;
  readonly warnings: string[];
  generatedCounter: number;
  inAcceptanceSection: boolean;
}

function emitCriterion(state: ParserState, input: AddCriterionInput): void {
  const trimmedText = input.text.trim();
  if (trimmedText.length === 0) {
    state.warnings.push(`line ${input.sourceLine}: empty criterion text after stripping ID`);
    return;
  }

  let id: string;
  let generatedId: boolean;
  if (input.originalId === null) {
    state.generatedCounter += 1;
    id = `AC-${String(state.generatedCounter).padStart(3, "0")}`;
    generatedId = true;
  } else {
    id = normaliseAcId(input.originalId);
    generatedId = false;
  }

  if (state.seenIds.has(id)) {
    state.warnings.push(
      `line ${input.sourceLine}: duplicate criterion id ${id} — keeping first occurrence`,
    );
    return;
  }
  state.seenIds.add(id);

  const criterion: AcceptanceCriterion = {
    id,
    originalId: input.originalId,
    text: trimmedText,
    sourceLine: input.sourceLine,
    generatedId,
    ...(input.checked !== undefined ? { checked: input.checked } : {}),
  };
  state.criteria.push(criterion);
}

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
