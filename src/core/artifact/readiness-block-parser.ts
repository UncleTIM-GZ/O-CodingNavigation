import yaml from "js-yaml";
import { z } from "zod";

// SOP 0.4.0 (AM-004, R1) — extracts the `ocn-readiness` fenced block from a
// document. The block is the machine source for that document's readiness
// field values; prose carries zero gate weight (same contract as
// `ocn-logic-graph`, and the industry-converged shape: frontmatter / dbt
// schema.yml / Sphinx-Needs).
//
// R1 is enforced at the schema layer: field values may be strings, numbers,
// or string lists — NEVER booleans. After the v0.4.0 rulebook revision every
// boolean (`true`) predicate is engine-derived, so a block structurally
// cannot express a conclusion ("tested: true" is a schema error).

const ReadinessFieldValue = z.union([z.string(), z.number(), z.array(z.string())]);

export const ReadinessBlock = z
  .object({
    artifact: z.string().regex(/^artifact_[a-z0-9_]+$/),
    fields: z.record(z.string().regex(/^[a-z0-9_]+$/), ReadinessFieldValue),
  })
  .strict();
export type ReadinessBlock = z.infer<typeof ReadinessBlock>;

export interface ReadinessBlockParseResult {
  readonly found: boolean;
  readonly block: ReadinessBlock | null;
  /** Fatal: block present but YAML/schema invalid (incl. boolean values). */
  readonly errors: readonly string[];
}

const FENCE_RE = /^```ocn-readiness[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/m;

export function parseReadinessBlock(markdown: string): ReadinessBlockParseResult {
  // Normalize CRLF so a Windows-authored closing fence / trailing \r cannot
  // leak into the last YAML value (which then fails the strict key regex).
  const match = FENCE_RE.exec(markdown.replace(/\r\n/g, "\n"));
  if (match === null) {
    return { found: false, block: null, errors: [] };
  }
  let raw: unknown;
  try {
    raw = yaml.load(match[1] ?? "");
  } catch (err) {
    return {
      found: true,
      block: null,
      errors: [`ocn-readiness block YAML is unparsable: ${(err as Error).message}`],
    };
  }
  const parsed = ReadinessBlock.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
    return { found: true, block: null, errors: details };
  }
  return { found: true, block: parsed.data, errors: [] };
}
