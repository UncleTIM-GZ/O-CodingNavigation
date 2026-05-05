// PR-B / M5 — helpers extracted from acceptance-parser.ts.
//
// Pure parser primitives: HTML-comment stripper, fenced-code-block
// detector, table-row detector, AC-id matcher / normaliser, list-line
// detector, checklist parser. No I/O.

import type { AcceptanceCriterion } from "./types.js";

// Captures: AC-<DOMAIN-?><digits> with various separators after the id.
// We accept `AC-` or `AC` prefix, optional dot, and one or more domain-like
// uppercase tokens, then a numeric tail. Examples we need to accept:
//   AC-001    AC-1    AC1    AC-INIT-001    AC-DOMAIN-001    AC.001
export const AC_ID_RE = /^AC[-.]?(?:[A-Z][A-Z0-9]*[-.]?)*\d+/;

// Trailing separator characters allowed after the ID. Includes ASCII `:`,
// `—` (em dash), `–` (en dash), `-`, the full-width `｜`, and whitespace.
export const SEPARATOR_AFTER_ID_RE = /^\s*(?:[:：｜\-—–]|\s)+/;

// English / Chinese acceptance heading detectors.
export const ACCEPTANCE_HEADING_RE =
  /(acceptance\s*(criteria|criterion|items|list)?|验收|验收标准)/i;

// Extract the heading text from a `#`-style markdown heading line.
export const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;

// Bullet/numbered list detectors. We only need to know that the line starts
// with a list marker so we can extract its body.
export const BULLET_RE = /^(\s*)([-*+])\s+(.*)$/;
export const NUMBERED_RE = /^(\s*)\d+[.)]\s+(.*)$/;

// Fenced-code-block delimiter. Matches `` ``` `` or `~~~` with up to 3
// leading spaces (per CommonMark). We track entering/leaving fences across
// lines so any `AC-001` examples inside fenced blocks are skipped.
export const FENCE_RE = /^\s{0,3}(?:```|~~~)/;

// Markdown table row detector — a leading `|` (with up to 3 leading
// spaces). Table rows must not register as AC bullets even if they contain
// an AC ID.
export const TABLE_ROW_RE = /^\s{0,3}\|/;

// Checklist detector: `[ ]` / `[x]` / `[X]`.
export const CHECKLIST_RE = /^\[([ xX])\]\s*(.*)$/;

// Strip leading bold markers (`**...**`) that wrap the AC ID.
export function stripBoldWrap(s: string): string {
  // Match `**ID**` or `**ID-001**` at the very start, then the rest.
  const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(s);
  if (m === null) return s;
  return `${m[1]} ${m[2]}`.replace(/\s+$/, "");
}

// Strip HTML comments (`<!-- ... -->`) from raw markdown before line
// splitting. Comments may span multiple lines; we drop the entire `<!--…-->`
// span, preserving newlines outside the comment so source-line numbers
// remain stable for content following the comment.
export function stripHtmlComments(input: string): string {
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
      const dropped = input.slice(open);
      const newlineCount = (dropped.match(/\n/g) ?? []).length;
      out += "\n".repeat(newlineCount);
      break;
    }
    const span = input.slice(open, close + 3);
    const newlineCount = (span.match(/\n/g) ?? []).length;
    out += "\n".repeat(newlineCount);
    i = close + 3;
  }
  return out;
}

export interface AcMatch {
  readonly originalId: string;
  readonly remainder: string;
}

export function tryMatchAcId(line: string): AcMatch | null {
  const upper = line.toUpperCase();
  const m = AC_ID_RE.exec(upper);
  if (m === null) return null;
  const matchedLen = m[0].length;
  const originalId = line.slice(0, matchedLen);
  let remainder = line.slice(matchedLen);
  const sepMatch = SEPARATOR_AFTER_ID_RE.exec(remainder);
  if (sepMatch !== null) {
    remainder = remainder.slice(sepMatch[0].length);
  }
  return { originalId, remainder: remainder.trim() };
}

// Normalise an AC id to a stable canonical form. Domain segments stay as
// uppercase; the trailing numeric segment is zero-padded to 3 digits.
export function normaliseAcId(rawId: string): string {
  const s = rawId.toUpperCase().replace(/\./g, "-");
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
    segments = [headDigits, ...rest.split("-").filter((seg) => seg.length > 0)];
  }

  const last = segments[segments.length - 1];
  if (last !== undefined && /^\d+$/.test(last)) {
    segments[segments.length - 1] = last.padStart(3, "0");
  }

  return segments.length > 0 ? `AC-${segments.join("-")}` : "AC";
}

// True when the line is a top-level bullet, not a nested continuation.
export function isTopLevelListLine(
  line: string,
): { kind: "bullet" | "numbered"; body: string } | null {
  const bullet = BULLET_RE.exec(line);
  if (bullet !== null) {
    const indent = bullet[1] ?? "";
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

// Strip checklist marker; returns body and checked flag (or null if not a
// checklist).
export function tryParseChecklist(
  body: string,
): { checked: boolean; body: string } | null {
  const m = CHECKLIST_RE.exec(body);
  if (m === null) return null;
  const flag = m[1];
  return {
    checked: flag === "x" || flag === "X",
    body: (m[2] ?? "").trim(),
  };
}

// Parser state shared across line iterations.
export interface ParserState {
  readonly criteria: AcceptanceCriterion[];
  readonly seenIds: Set<string>;
  readonly warnings: string[];
  generatedCounter: number;
  inAcceptanceSection: boolean;
}

export interface AddCriterionInput {
  readonly text: string;
  readonly sourceLine: number;
  readonly originalId: string | null;
  readonly checked?: boolean;
}

export function emitCriterion(state: ParserState, input: AddCriterionInput): void {
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
