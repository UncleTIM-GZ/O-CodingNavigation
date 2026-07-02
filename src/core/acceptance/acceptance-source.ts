import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AcceptanceProjection, AcceptanceSpecV2 } from "../../types/acceptance-spec.js";
import { parseAcceptanceSpecs, type ParsedAcceptance } from "./acceptance-spec-parser.js";
import { readAcceptanceSpecs, sha256Hex } from "./acceptance-spec-store.js";

/** Read a frozen projection's items as v2 (a v1 projection's items are build). */
function projectionItemsAsV2(projection: AcceptanceProjection): readonly AcceptanceSpecV2[] {
  if (projection.version === 2) return projection.items;
  return projection.items.map((s) => ({ kind: "build" as const, ...s }));
}

// SOP 0.8.0 (AM-015, review follow-up) — the single, staleness-safe source of
// acceptance specs for every read path (build-plan traces + evidence-map).
//
// Projection-first BUT staleness-guarded: the frozen `.ocoding/acceptance-specs.json`
// is the gate-validated snapshot, used only while docs/03's Acceptance Specs
// section is byte-unchanged since the gate (specsHash match). Once docs/03 is
// edited after the gate (an AC added or removed), the projection is stale, so
// the CURRENT structured parse wins — closing the false-block (trace to a
// freshly-added AC) and, more importantly, the false-green (a task still tracing
// a deleted AC). Returns null only when docs/03 has no structured Acceptance
// Specs section (pre-0.8.0 docs) so the caller can use the legacy markdown parse.

export const ACCEPTANCE_ARTIFACT_PATH = "docs/03-acceptance-criteria.md";

/** ParsedAcceptance → AcceptanceSpecV2 (shared by the gate freeze + live reads).
 *  Carries kind + measure through so a frozen outcome AC keeps its contract; a
 *  kind:"outcome" without a well-formed measure (only reachable on the live parse
 *  path — the gate blocks it) degrades to build rather than constructing an
 *  invalid discriminated member. */
export function parsedAcceptanceToSpec(p: ParsedAcceptance): AcceptanceSpecV2 {
  const base = {
    id: p.id,
    desc: p.desc,
    trace: [...p.trace],
    ...(p.given !== undefined ? { given: p.given } : {}),
    ...(p.when !== undefined ? { when: p.when } : {}),
    ...(p.then !== undefined ? { then: p.then } : {}),
    ...(p.priority !== undefined ? { priority: p.priority } : {}),
  };
  if (p.kind === "outcome" && p.measure !== undefined) {
    return { kind: "outcome", measure: p.measure, ...base };
  }
  return { kind: "build", ...base };
}

export async function resolveAcceptanceSpecs(
  cwd: string,
  artifactPath: string = ACCEPTANCE_ARTIFACT_PATH,
): Promise<readonly AcceptanceSpecV2[] | null> {
  let content: string;
  try {
    content = await fs.readFile(join(cwd, artifactPath), "utf8");
  } catch {
    // docs/03 unreadable — best effort: whatever the projection froze, if any.
    const projection = await readAcceptanceSpecs(cwd);
    return projection !== null ? projectionItemsAsV2(projection) : null;
  }

  const parsed = parseAcceptanceSpecs(content);
  if (!parsed.found) return null; // no structured section → legacy markdown fallback

  const projection = await readAcceptanceSpecs(cwd);
  if (projection !== null && sha256Hex(parsed.sectionText ?? "") === projection.specsHash) {
    return projectionItemsAsV2(projection); // unchanged since the gate → the validated snapshot
  }
  return parsed.specs.map(parsedAcceptanceToSpec); // changed / never frozen → current
}
