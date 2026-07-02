import {
  FENCE_RE,
  HEADING_RE,
  normaliseAcId,
  stripHtmlComments,
} from "../execution-navigator/acceptance-parser-helpers.js";
import { ACCEPTANCE_ID_RE } from "../../types/acceptance-spec.js";

// SOP 0.8.0 (AM-015 / DEC-041) — Acceptance Spec Block parser. PURE: markdown
// in, structured specs + structural defects out; never throws, no IO. Mirrors
// the task-spec parser discipline: the machine-parsed region lives inside the
// acceptance-criteria artifact's `## Acceptance Specs｜验收规格` section; HTML
// comments and fenced code blocks inside it are stripped so examples never
// register as specs.

export type AcceptanceDefectCode = "no_specs" | "duplicate_id" | "invalid_id" | "missing_field";

export interface AcceptanceDefect {
  readonly code: AcceptanceDefectCode;
  /** The offending acceptance id, when the defect is spec-scoped. */
  readonly specId?: string;
  /** The missing/offending field name (missing_field). */
  readonly field?: string;
}

export interface ParsedAcceptance {
  readonly id: string;
  readonly desc: string;
  readonly given?: string;
  readonly when?: string;
  readonly then?: string;
  readonly priority?: string;
  readonly trace: readonly string[];
}

export interface AcceptanceSpecParseResult {
  /** True when the `## Acceptance Specs` section heading was found. */
  readonly found: boolean;
  /** Raw section text (heading line through the line before the next `## `). */
  readonly sectionText: string | null;
  readonly specs: readonly ParsedAcceptance[];
  readonly defects: readonly AcceptanceDefect[];
  /** Non-blocking notes (unknown keys, …). */
  readonly warnings: readonly string[];
}

const SECTION_TITLE_PREFIX = "Acceptance Specs";
const KNOWN_KEYS: ReadonlySet<string> = new Set([
  "desc",
  "given",
  "when",
  "then",
  "priority",
  "trace",
]);
const BULLET_FIELD_RE = /^\s*[-*]\s+([A-Za-z_]+)\s*[:：]\s*(.*)$/;

// Lists split on ASCII or CJK comma; entries trimmed, empties dropped.
function splitList(value: string): readonly string[] {
  return value
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Extract the raw `## Acceptance Specs…` section, fence-aware (a `## ` line
 *  inside a fenced block never opens or closes the section). */
function extractSection(markdown: string): string | null {
  const lines = markdown.split("\n");
  let inFence = false;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = (lines[i] ?? "").replace(/\r$/, "");
    if (FENCE_RE.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = HEADING_RE.exec(raw);
    if (m === null || (m[1] ?? "").length !== 2) continue;
    const title = (m[2] ?? "").trim();
    if (start === -1) {
      if (title.startsWith(SECTION_TITLE_PREFIX)) start = i;
    } else {
      return lines.slice(start, i).join("\n");
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n");
}

interface MutableSpec {
  id: string;
  fields: Map<string, string>;
}

function collectBlocks(sectionText: string, warnings: string[]): MutableSpec[] {
  const sanitized = stripHtmlComments(sectionText);
  const blocks: MutableSpec[] = [];
  let current: MutableSpec | null = null;
  let inFence = false;
  for (const rawLine of sanitized.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = HEADING_RE.exec(line);
    if (heading !== null && (heading[1] ?? "").length === 3) {
      current = { id: (heading[2] ?? "").trim(), fields: new Map() };
      blocks.push(current);
      continue;
    }
    if (heading !== null) {
      current = null; // any other heading level ends the block
      continue;
    }
    if (current === null) continue;
    const field = BULLET_FIELD_RE.exec(line);
    if (field === null) continue;
    const key = (field[1] ?? "").toLowerCase();
    const value = (field[2] ?? "").trim();
    if (!KNOWN_KEYS.has(key)) {
      warnings.push(`acceptance ${current.id}: unknown key "${key}" ignored`);
      continue;
    }
    current.fields.set(key, value);
  }
  return blocks;
}

function toParsedAcceptance(block: MutableSpec, defects: AcceptanceDefect[]): ParsedAcceptance {
  const get = (key: string): string => block.fields.get(key) ?? "";
  const displayId = ACCEPTANCE_ID_RE.test(block.id) ? normaliseAcId(block.id) : block.id;
  if (get("desc").length === 0) {
    defects.push({ code: "missing_field", specId: displayId, field: "desc" });
  }
  const given = get("given");
  const when = get("when");
  const then = get("then");
  const priority = get("priority");
  return {
    id: displayId,
    desc: get("desc"),
    trace: splitList(get("trace")),
    ...(given.length > 0 ? { given } : {}),
    ...(when.length > 0 ? { when } : {}),
    ...(then.length > 0 ? { then } : {}),
    ...(priority.length > 0 ? { priority } : {}),
  };
}

export function parseAcceptanceSpecs(markdown: string): AcceptanceSpecParseResult {
  const sectionText = extractSection(markdown);
  if (sectionText === null) {
    return {
      found: false,
      sectionText: null,
      specs: [],
      defects: [{ code: "no_specs" }],
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const defects: AcceptanceDefect[] = [];
  const blocks = collectBlocks(sectionText, warnings);

  if (blocks.length === 0) {
    return { found: true, sectionText, specs: [], defects: [{ code: "no_specs" }], warnings };
  }

  const seen = new Set<string>();
  const duplicated = new Set<string>();
  const specs: ParsedAcceptance[] = [];
  for (const block of blocks) {
    const valid = ACCEPTANCE_ID_RE.test(block.id);
    const canonical = valid ? normaliseAcId(block.id) : block.id;
    if (!valid) {
      defects.push({ code: "invalid_id", specId: block.id });
    }
    if (seen.has(canonical)) {
      if (!duplicated.has(canonical)) {
        defects.push({ code: "duplicate_id", specId: canonical });
        duplicated.add(canonical);
      }
      continue; // keep the first block; later duplicates are ignored
    }
    seen.add(canonical);
    specs.push(toParsedAcceptance(block, defects));
  }

  return { found: true, sectionText, specs, defects, warnings };
}
