import { promises as fs } from "node:fs";
import { join } from "node:path";
import { Paths } from "../paths.js";

// SOP 0.4.0 — resolves rulebook `artifact_<slug>` references to actual files
// under docs/ via the rulebook's filename globs (calibration ①: number-
// agnostic — a project that renumbers its docs still resolves, because the
// match is on the name stem, never on 00/01/02 prefixes).
//
// Glob dialect is deliberately tiny: `*` matches any run of characters
// within the filename; everything else is literal (case-insensitive).

export function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

/** slug → project-relative doc path (first listed glob wins), or null. */
export async function resolveArtifactPaths(
  root: string,
  aliases: Readonly<Record<string, readonly string[]>>,
): Promise<ReadonlyMap<string, string | null>> {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(Paths.docsDir(root), { withFileTypes: true }))
      .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".md"))
      .map((d) => d.name)
      .sort();
  } catch {
    entries = [];
  }
  const resolved = new Map<string, string | null>();
  for (const [slug, globs] of Object.entries(aliases)) {
    let hit: string | null = null;
    for (const glob of globs) {
      const re = globToRegExp(glob);
      const match = entries.find((name) => re.test(name));
      if (match !== undefined) {
        hit = join("docs", match);
        break;
      }
    }
    resolved.set(slug, hit);
  }
  return resolved;
}
