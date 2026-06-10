import yaml from "js-yaml";
import { ReadinessRulebook } from "../../types/readiness.js";

// SOP 0.4.0 — parses the bundled readiness rulebook YAML into the validated
// ReadinessRulebook structure. Mirrors logic-backbone-parser.ts defensiveness:
// never throws; YAML / schema failures come back as structured errors so the
// caller (gate, lint, tests) decides how to surface them.

export interface RulebookParseResult {
  readonly rulebook: ReadinessRulebook | null;
  /** Fatal: YAML unparsable or schema-invalid. */
  readonly errors: readonly string[];
}

export function parseReadinessRulebook(yamlText: string): RulebookParseResult {
  let raw: unknown;
  try {
    raw = yaml.load(yamlText);
  } catch (err) {
    return { rulebook: null, errors: [`rulebook YAML is unparsable: ${(err as Error).message}`] };
  }
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return { rulebook: null, errors: ["rulebook YAML is empty or not a mapping"] };
  }
  const parsed = ReadinessRulebook.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .slice(0, 10)
      .map((i) => `${i.path.join(".")}: ${i.message}`);
    return { rulebook: null, errors: details };
  }
  return { rulebook: parsed.data, errors: [] };
}
