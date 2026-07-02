import {
  FENCE_RE,
  HEADING_RE,
  normaliseAcId,
  stripHtmlComments,
} from "../execution-navigator/acceptance-parser-helpers.js";
import { ACCEPTANCE_ID_RE } from "../../types/acceptance-spec.js";
import type { AcceptanceKind, MeasureContract } from "../../types/outcome.js";
import { parseThreshold } from "../outcome/threshold.js";

// SOP 0.8.0 (AM-015 / DEC-041) — Acceptance Spec Block parser. PURE: markdown
// in, structured specs + structural defects out; never throws, no IO. Mirrors
// the task-spec parser discipline: the machine-parsed region lives inside the
// acceptance-criteria artifact's `## Acceptance Specs｜验收规格` section; HTML
// comments and fenced code blocks inside it are stripped so examples never
// register as specs.

export type AcceptanceDefectCode =
  | "no_specs"
  | "duplicate_id"
  | "invalid_id"
  | "missing_field"
  // SOP 0.9.0 (AM-016) — outcome measurement contract defects.
  | "invalid_kind"
  | "missing_measure_field"
  | "invalid_threshold"
  | "invalid_due";

export interface AcceptanceDefect {
  readonly code: AcceptanceDefectCode;
  /** The offending acceptance id, when the defect is spec-scoped. */
  readonly specId?: string;
  /** The missing/offending field name or value (missing_field / measure defects). */
  readonly field?: string;
}

export interface ParsedAcceptance {
  readonly id: string;
  readonly desc: string;
  /** SOP 0.9.0 — build (default) vs outcome. */
  readonly kind: AcceptanceKind;
  /** SOP 0.9.0 — present iff kind === "outcome" and the contract is well-formed. */
  readonly measure?: MeasureContract;
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
  // SOP 0.9.0 (AM-016) — outcome kind + measurement contract keys.
  "kind",
  "measure.command",
  "measure.threshold",
  "measure.source",
  "measure.due",
  "measure.timeout",
]);
// Keys may contain dots (measure.command) and digits; the value is everything
// after the first `:`/`：`.
const BULLET_FIELD_RE = /^\s*[-*]\s+([A-Za-z_][A-Za-z0-9_.]*)\s*[:：]\s*(.*)$/;
const STATE_ID_RE = /^state_[a-z0-9_]+$/;
const MEASURE_REQUIRED: readonly string[] = [
  "measure.command",
  "measure.threshold",
  "measure.source",
];

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

function hasAnyMeasureField(block: MutableSpec): boolean {
  for (const key of block.fields.keys()) {
    if (key.startsWith("measure.")) return true;
  }
  return false;
}

// `kind` defaults to build; an unrecognised value is a blocking defect (guarding
// the discriminant) rather than a silent downgrade that would drop the contract.
function resolveKind(
  block: MutableSpec,
  displayId: string,
  defects: AcceptanceDefect[],
): AcceptanceKind {
  const raw = (block.fields.get("kind") ?? "").trim().toLowerCase();
  if (raw.length === 0 || raw === "build") return "build";
  if (raw === "outcome") return "outcome";
  defects.push({ code: "invalid_kind", specId: displayId, field: raw });
  return "build";
}

// Builds the measurement contract for an outcome AC, emitting one defect per
// structural problem. Returns undefined when any measure defect fired (the gate
// blocks on any defect, so a partial contract is never surfaced downstream).
function buildMeasure(
  block: MutableSpec,
  displayId: string,
  defects: AcceptanceDefect[],
): MeasureContract | undefined {
  const get = (key: string): string => (block.fields.get(key) ?? "").trim();
  const before = defects.length;

  for (const field of MEASURE_REQUIRED) {
    if (get(field).length === 0) {
      defects.push({ code: "missing_measure_field", specId: displayId, field });
    }
  }

  const thresholdRaw = get("measure.threshold");
  const parsedThreshold = thresholdRaw.length > 0 ? parseThreshold(thresholdRaw) : undefined;
  if (parsedThreshold !== undefined && !parsedThreshold.ok) {
    defects.push({
      code: "invalid_threshold",
      specId: displayId,
      field: parsedThreshold.reason ?? "invalid threshold",
    });
  }

  const due = get("measure.due");
  if (due.length > 0 && !STATE_ID_RE.test(due)) {
    defects.push({ code: "invalid_due", specId: displayId, field: due });
  }

  const timeoutRaw = get("measure.timeout");
  const timeoutValue = timeoutRaw.length > 0 ? Number(timeoutRaw) : undefined;
  if (
    timeoutValue !== undefined &&
    (!Number.isInteger(timeoutValue) || timeoutValue <= 0 || timeoutValue > 600)
  ) {
    defects.push({
      code: "invalid_due",
      specId: displayId,
      field: `measure.timeout=${timeoutRaw}`,
    });
  }

  if (defects.length !== before || parsedThreshold === undefined || !parsedThreshold.ok) {
    return undefined;
  }
  return {
    command: get("measure.command"),
    threshold: parsedThreshold.threshold!,
    source: get("measure.source"),
    due: due.length > 0 ? due : "state_ship",
    timeoutSeconds: timeoutValue ?? 60,
  };
}

function toParsedAcceptance(
  block: MutableSpec,
  defects: AcceptanceDefect[],
  warnings: string[],
): ParsedAcceptance {
  const get = (key: string): string => block.fields.get(key) ?? "";
  const displayId = ACCEPTANCE_ID_RE.test(block.id) ? normaliseAcId(block.id) : block.id;
  if (get("desc").length === 0) {
    defects.push({ code: "missing_field", specId: displayId, field: "desc" });
  }
  const kind = resolveKind(block, displayId, defects);
  if (kind === "build" && hasAnyMeasureField(block)) {
    warnings.push(
      `acceptance ${displayId}: measure.* fields ignored on a build spec (missing kind: outcome?)`,
    );
  }
  const measure = kind === "outcome" ? buildMeasure(block, displayId, defects) : undefined;
  const given = get("given");
  const when = get("when");
  const then = get("then");
  const priority = get("priority");
  return {
    id: displayId,
    desc: get("desc"),
    kind,
    trace: splitList(get("trace")),
    ...(measure !== undefined ? { measure } : {}),
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
    specs.push(toParsedAcceptance(block, defects, warnings));
  }

  return { found: true, sectionText, specs, defects, warnings };
}
