// SOP 0.9.0 (AM-016) P3 — structured DEC-id extraction from docs/20. The
// SPEC/SHIP gates re-verify a waiver's `--dec` still exists on EVERY run
// (readiness waive-with-probe precedent): delete the DEC and the waiver goes
// void. We parse DECLARED ids (heading / list / table-cell at line start), NOT
// a prose substring — an agent can't smuggle a bare "DEC-999" mid-sentence.

const HEADING_RE = /^#{1,6}\s+.*?\bDEC-(\d+)\b/;
const LIST_OR_TABLE_RE = /^\s*[-*|]\s*\**DEC-(\d+)\b/;
const LABEL_RE = /^\s*\**DEC-(\d+)\b/;

/** Normalise a DEC id to `DEC-<n>` with leading zeros stripped (DEC-042 ≡ DEC-42). */
export function normaliseDecId(id: string): string | null {
  const m = /\bDEC-0*(\d+)\b/i.exec(id.trim());
  return m ? `DEC-${m[1]}` : null;
}

/** The set of DEC ids DECLARED in docs/20 (normalised). */
export function declaredDecIds(docContent: string): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const line of docContent.split("\n")) {
    const m = HEADING_RE.exec(line) ?? LIST_OR_TABLE_RE.exec(line) ?? LABEL_RE.exec(line);
    if (m) ids.add(`DEC-${Number.parseInt(m[1]!, 10)}`);
  }
  return ids;
}

/** True iff `decId` is a declared decision in `docContent`. */
export function decExists(docContent: string, decId: string): boolean {
  const norm = normaliseDecId(decId);
  if (norm === null) return false;
  return declaredDecIds(docContent).has(norm);
}
