import type { Heading, RequiredSectionDef } from "../../types/artifact.js";

// NFKC folds U+FF5C FULLWIDTH-VERTICAL-LINE (｜) to U+007C ASCII pipe (|).
// Both heading text and alias list go through the same `norm()` so matches are
// independent of full-width vs ASCII pipe usage. See plan §16.4.
export function normalizeHeading(s: string): string {
  return s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchSection(
  headings: readonly Heading[],
  def: RequiredSectionDef,
): boolean {
  const targets = new Set(
    [def.canonical, ...def.aliases].map((s) => normalizeHeading(s)),
  );
  return headings.some(
    (h) => def.allowedLevels.includes(h.level) && targets.has(normalizeHeading(h.text)),
  );
}
