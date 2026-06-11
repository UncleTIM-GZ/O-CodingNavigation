import {
  FENCE_RE,
  HEADING_RE,
  stripHtmlComments,
} from "../execution-navigator/acceptance-parser-helpers.js";
import { TASK_ID_RE } from "../../types/task.js";

// SOP 0.5.0 (AM-007 / DEC-032) — Task Spec Block parser. PURE: markdown in,
// structured tasks + structural defects out; never throws, no IO. Mirrors the
// logic-backbone parser discipline: the machine-parsed region lives inside the
// build plan's `## Task Specs｜任务规格` section; HTML comments and fenced code
// blocks inside it are stripped so examples never register as tasks.

export type TaskDefectCode =
  | "no_tasks"
  | "duplicate_task_id"
  | "invalid_task_id"
  | "missing_field"
  | "dangling_trace"
  | "dangling_touch"
  | "dangling_depends"
  | "depends_cycle";

export interface TaskDefect {
  readonly code: TaskDefectCode;
  /** The offending task id, when the defect is task-scoped. */
  readonly taskId?: string;
  /** The missing/offending field name (missing_field). */
  readonly field?: string;
  /** The dangling reference (trace / touch / depends id). */
  readonly ref?: string;
  /** Supporting references — a depends cycle path. */
  readonly refs?: readonly string[];
}

export interface ParsedTask {
  readonly id: string;
  readonly goal: string;
  readonly traces: readonly string[];
  readonly touches: readonly string[];
  readonly verify: string;
  readonly dod: string;
  readonly depends: readonly string[];
  readonly phase?: string;
  readonly timeoutSeconds?: number;
}

export interface TaskSpecParseResult {
  /** True when the `## Task Specs` section heading was found. */
  readonly found: boolean;
  /** Raw section text (heading line through the line before the next `## `). */
  readonly sectionText: string | null;
  readonly tasks: readonly ParsedTask[];
  readonly defects: readonly TaskDefect[];
  /** Non-blocking notes (unknown keys, unparsable timeout, …). */
  readonly warnings: readonly string[];
}

const SECTION_TITLE_PREFIX = "Task Specs";
const KNOWN_KEYS: ReadonlySet<string> = new Set([
  "goal",
  "traces",
  "touches",
  "verify",
  "dod",
  "depends",
  "phase",
  "timeout",
]);
const BULLET_FIELD_RE = /^\s*[-*]\s+([A-Za-z_]+)\s*[:：]\s*(.*)$/;
const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 600;

// Lists split on ASCII or CJK comma; entries trimmed, empties dropped.
export function splitList(value: string): readonly string[] {
  return value
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Extract the raw `## Task Specs…` section, fence-aware (a `## ` line inside
 *  a fenced block never opens or closes the section). */
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

interface MutableTask {
  id: string;
  fields: Map<string, string>;
}

function collectBlocks(sectionText: string, warnings: string[]): MutableTask[] {
  const sanitized = stripHtmlComments(sectionText);
  const blocks: MutableTask[] = [];
  let current: MutableTask | null = null;
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
      warnings.push(`task ${current.id}: unknown key "${key}" ignored`);
      continue;
    }
    current.fields.set(key, value);
  }
  return blocks;
}

function parseTimeout(raw: string | undefined, id: string, warnings: string[]): number | undefined {
  if (raw === undefined || raw.length === 0) return undefined;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < TIMEOUT_MIN || n > TIMEOUT_MAX) {
    warnings.push(`task ${id}: timeout "${raw}" is not an integer in ${TIMEOUT_MIN}..${TIMEOUT_MAX} — ignored`);
    return undefined;
  }
  return n;
}

function toParsedTask(block: MutableTask, defects: TaskDefect[], warnings: string[]): ParsedTask {
  const get = (key: string): string => block.fields.get(key) ?? "";
  const traces = splitList(get("traces"));
  const requiredMissing: readonly [string, boolean][] = [
    ["goal", get("goal").length === 0],
    ["traces", traces.length === 0],
    ["verify", get("verify").length === 0],
    ["dod", get("dod").length === 0],
  ];
  for (const [field, missing] of requiredMissing) {
    if (missing) defects.push({ code: "missing_field", taskId: block.id, field });
  }
  const phase = get("phase");
  const timeoutSeconds = parseTimeout(block.fields.get("timeout"), block.id, warnings);
  return {
    id: block.id,
    goal: get("goal"),
    traces,
    touches: splitList(get("touches")),
    verify: get("verify"),
    dod: get("dod"),
    depends: splitList(get("depends")),
    ...(phase.length > 0 ? { phase } : {}),
    ...(timeoutSeconds !== undefined ? { timeoutSeconds } : {}),
  };
}

export function parseTaskSpecs(markdown: string): TaskSpecParseResult {
  const sectionText = extractSection(markdown);
  if (sectionText === null) {
    return {
      found: false,
      sectionText: null,
      tasks: [],
      defects: [{ code: "no_tasks" }],
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const defects: TaskDefect[] = [];
  const blocks = collectBlocks(sectionText, warnings);

  if (blocks.length === 0) {
    return { found: true, sectionText, tasks: [], defects: [{ code: "no_tasks" }], warnings };
  }

  const seen = new Set<string>();
  const duplicated = new Set<string>();
  const tasks: ParsedTask[] = [];
  for (const block of blocks) {
    if (!TASK_ID_RE.test(block.id)) {
      defects.push({ code: "invalid_task_id", taskId: block.id });
    }
    if (seen.has(block.id)) {
      if (!duplicated.has(block.id)) {
        defects.push({ code: "duplicate_task_id", taskId: block.id });
        duplicated.add(block.id);
      }
      continue; // keep the first block; later duplicates are ignored
    }
    seen.add(block.id);
    tasks.push(toParsedTask(block, defects, warnings));
  }

  return { found: true, sectionText, tasks, defects, warnings };
}
