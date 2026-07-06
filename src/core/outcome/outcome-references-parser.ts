// SOP 0.9.0 (AM-017) P4b §D.1 — pure, TOTAL parser for the REFLECT artifact's
// `### Outcome References` section. Each reference line is:
//   - <ac-id>: value=<n> @ <measurementId>
// The REFLECT gate mechanically cross-checks each parsed reference against the
// frozen outcome ledger's CURRENT-round history (keyed on measurementId, the
// ULID that pairs with the outcome_measured audit event — DI-M5). This parser
// NEVER throws: a malformed line becomes a `malformed` record so the gate's
// coverage rule fails closed (an unparseable line == an unregistered reference
// == the AC it was meant to cover stays unreferenced == blocked).

export interface OutcomeReference {
  readonly acId: string;
  readonly value: number;
  readonly measurementId: string;
}

export interface OutcomeReferencesParse {
  readonly references: readonly OutcomeReference[];
  /** Raw text of every non-blank bullet line that did not parse. */
  readonly malformed: readonly string[];
}

// `- AC-CORE-003: value=42 @ 01J...` — value must be a finite number; the id and
// measurementId are opaque non-space tokens (validated against the ledger, not
// by shape here).
const REFERENCE_RE = /^-\s*(\S+):\s*value=(\S+)\s*@\s*(\S+)\s*$/;

/** Extract the body lines under an `## | ### Outcome References` heading, up to
 *  the next heading of any level. Case-insensitive on the canonical/zh alias. */
function outcomeReferencesSection(markdown: string): readonly string[] {
  const lines = markdown.split(/\r?\n/);
  const headingRe = /^(#{1,6})\s+(.*\S)\s*$/;
  const isReferencesHeading = (title: string): boolean => {
    const t = title.trim().toLowerCase();
    return (
      t === "outcome references" ||
      t.startsWith("outcome references｜") ||
      t === "结果引用"
    );
  };
  const body: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const heading = headingRe.exec(line);
    if (heading) {
      if (inSection) break; // next heading ends the section
      if (isReferencesHeading(heading[2] ?? "")) inSection = true;
      continue;
    }
    if (inSection) body.push(line);
  }
  return body;
}

export function parseOutcomeReferences(markdown: string): OutcomeReferencesParse {
  const references: OutcomeReference[] = [];
  const malformed: string[] = [];
  for (const raw of outcomeReferencesSection(markdown)) {
    const line = raw.trim();
    if (line.length === 0) continue;
    if (!line.startsWith("-")) continue; // prose/notes under the heading are ignored
    const m = REFERENCE_RE.exec(line);
    if (m === null) {
      malformed.push(line);
      continue;
    }
    const value = Number(m[2]);
    if (!Number.isFinite(value)) {
      malformed.push(line);
      continue;
    }
    references.push({ acId: m[1] ?? "", value, measurementId: m[3] ?? "" });
  }
  return { references, malformed };
}
