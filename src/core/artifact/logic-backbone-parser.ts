import * as yaml from "js-yaml";
import { LogicGraph } from "../../types/logic-backbone.js";

// Extracts the authored logic graph from a Markdown artifact and parses it into
// a typed LogicGraph. Pure function — never throws; malformed input is reported
// as structured errors. Mirrors the defensive style of the execution-navigator
// acceptance parser (src/core/execution-navigator/acceptance-parser.ts).
//
// The graph lives in a fenced code block tagged `ocn-logic-graph` (preferred),
// or the first ```yaml / ```json block when no tagged block is present. The
// block body is YAML (JSON is a YAML subset, so both load).

export interface LogicBackboneParseResult {
  /** Whether a graph code block was present at all. */
  readonly found: boolean;
  /** The parsed graph, or null when absent / invalid. */
  readonly graph: LogicGraph | null;
  /** Non-fatal notes. */
  readonly warnings: readonly string[];
  /** Fatal problems — block present but not loadable / schema-invalid. */
  readonly errors: readonly string[];
}

interface FencedBlock {
  readonly info: string;
  readonly content: string;
}

const OPEN_FENCE_RE = /^\s*```(.*)$/;
const CLOSE_FENCE_RE = /^\s*```\s*$/;
const GRAPH_FENCE_TAG = "ocn-logic-graph";

function extractFencedBlocks(md: string): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const open = OPEN_FENCE_RE.exec(lines[i] ?? "");
    if (open === null) {
      i += 1;
      continue;
    }
    const info = (open[1] ?? "").trim();
    const body: string[] = [];
    i += 1;
    while (i < lines.length && !CLOSE_FENCE_RE.test(lines[i] ?? "")) {
      body.push(lines[i] ?? "");
      i += 1;
    }
    i += 1; // step past the closing fence (or EOF)
    blocks.push({ info, content: body.join("\n") });
  }
  return blocks;
}

function pickGraphBlock(blocks: readonly FencedBlock[]): FencedBlock | null {
  const tagged = blocks.find((b) => b.info === GRAPH_FENCE_TAG);
  if (tagged !== undefined) return tagged;
  return blocks.find((b) => b.info === "yaml" || b.info === "json") ?? null;
}

export function parseLogicBackbone(markdown: string): LogicBackboneParseResult {
  const block = pickGraphBlock(extractFencedBlocks(markdown));
  if (block === null) {
    return { found: false, graph: null, warnings: [], errors: [] };
  }

  let raw: unknown;
  try {
    // js-yaml v4 `load` uses DEFAULT_SCHEMA (safe — no code-executing tags like
    // !!js/function); the result is further constrained by LogicGraph.strict().
    raw = yaml.load(block.content);
  } catch (err) {
    return {
      found: true,
      graph: null,
      warnings: [],
      errors: [`graph block is not valid YAML/JSON: ${(err as Error).message}`],
    };
  }

  const parsed = LogicGraph.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (iss) => `${iss.path.join(".") || "<root>"}: ${iss.message}`,
    );
    return { found: true, graph: null, warnings: [], errors };
  }

  return { found: true, graph: parsed.data, warnings: [], errors: [] };
}
