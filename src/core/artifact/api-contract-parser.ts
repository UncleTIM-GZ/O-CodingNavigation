import * as yaml from "js-yaml";
import { ApiContract } from "../../types/api-contract.js";

// Extracts the declared API contract from the DESIGN api-contract artifact and
// parses it into a typed ApiContract. Pure function — never throws; malformed
// input is reported as structured errors. Mirrors the defensive style of
// src/core/artifact/logic-backbone-parser.ts.
//
// The contract lives in a fenced code block tagged exactly `ocn-api-contract`.
// The body is YAML (JSON is a YAML subset, so both load). Untagged ```yaml /
// ```json blocks are intentionally NOT picked up — that risks silently
// capturing an unrelated block as the contract (a false pass OCN prevents).

export interface ApiContractParseResult {
  /** Whether a contract code block was present at all. */
  readonly found: boolean;
  /** The parsed contract, or null when absent / invalid. */
  readonly contract: ApiContract | null;
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
const CONTRACT_FENCE_TAG = "ocn-api-contract";

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

function pickContractBlock(blocks: readonly FencedBlock[]): FencedBlock | null {
  return blocks.find((b) => b.info === CONTRACT_FENCE_TAG) ?? null;
}

export function parseApiContract(markdown: string): ApiContractParseResult {
  const block = pickContractBlock(extractFencedBlocks(markdown));
  if (block === null) {
    return { found: false, contract: null, warnings: [], errors: [] };
  }

  let raw: unknown;
  try {
    // js-yaml v4 `load` uses DEFAULT_SCHEMA (safe — no code-executing tags); the
    // result is further constrained by ApiContract.safeParse.
    raw = yaml.load(block.content);
  } catch (err) {
    return {
      found: true,
      contract: null,
      warnings: [],
      errors: [`api-contract block is not valid YAML/JSON: ${(err as Error).message}`],
    };
  }

  const parsed = ApiContract.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (iss) => `${iss.path.join(".") || "<root>"}: ${iss.message}`,
    );
    return { found: true, contract: null, warnings: [], errors };
  }

  return { found: true, contract: parsed.data, warnings: [], errors: [] };
}
