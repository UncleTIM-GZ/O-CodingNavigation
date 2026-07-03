import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AcceptanceSpecV2 } from "../../types/acceptance-spec.js";
import type { SopProfile } from "../../types/sop.js";
import { parseAcceptanceSpecs } from "../acceptance/acceptance-spec-parser.js";
import { parsedAcceptanceToSpec } from "../acceptance/acceptance-source.js";

// SOP 0.9.0 (AM-016) P4b — the INDEPENDENT outcome-contract source for the SHIP
// and REFLECT gates. This subsystem's threat model is file tampering, so
// "were outcomes expected this round?" must NOT be answered solely by the
// editable, cycle-archived `.ocoding` projection/ledger (a review finding: both
// can be deleted to reopen the sixth false-completion class). docs/03 is the
// canonical, human-authored contract — it lives OUTSIDE `.ocoding`, is kept
// across `cycle new`, and is exactly what the acceptance gate freezes from. A
// SHIP/REFLECT gate that corroborates against docs/03 cannot be bypassed by
// deleting the derived `.ocoding` files. Re-parses on the same pure parser the
// acceptance gate uses (no IO in the parser; malformed docs → assert nothing,
// the acceptance gate already blocks those upstream).

/** The round's outcome AC contracts as declared in docs/03. Empty when the file
 *  is absent/malformed or declares no outcome AC. */
export async function docsOutcomeSpecs(
  cwd: string,
  profile: SopProfile,
): Promise<readonly AcceptanceSpecV2[]> {
  const rel = profile.artifactPathForStep("step_acceptance_criteria");
  if (rel === null) return [];
  let content: string;
  try {
    content = await fs.readFile(join(cwd, rel), "utf8");
  } catch {
    return [];
  }
  const parsed = parseAcceptanceSpecs(content);
  if (parsed.defects.length > 0) return []; // malformed → can't assert; upstream gate owns it
  return parsed.specs.map(parsedAcceptanceToSpec).filter((s) => s.kind === "outcome");
}
