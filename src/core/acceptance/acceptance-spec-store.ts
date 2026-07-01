import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { AcceptanceProjection, type AcceptanceSpec } from "../../types/acceptance-spec.js";
import { Paths } from "../paths.js";
import { nowIsoUtc } from "../time.js";

// SOP 0.8.0 (AM-015 / DEC-041) — `.ocoding/acceptance-specs.json` projection
// store. Same atomic temp+rename protocol as task-ledger-store.ts (§4.5);
// reads are defensive and return null on any failure (absence simply means
// "the acceptance gate has not yet passed under SOP 0.8.0+"). Unlike the task
// ledger there is no per-item status/evidence — acceptance specs are
// definitions, so the projection is a straight freeze of the validated specs.

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function buildAcceptanceProjection(
  specs: readonly AcceptanceSpec[],
  specsHash: string,
): AcceptanceProjection {
  return {
    version: 1,
    generatedAt: nowIsoUtc(),
    specsHash,
    items: [...specs],
  };
}

export async function writeAcceptanceSpecs(
  root: string,
  projection: AcceptanceProjection,
): Promise<void> {
  const file = Paths.acceptanceSpecsFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(projection, null, 2) + "\n";
  try {
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

export async function readAcceptanceSpecs(root: string): Promise<AcceptanceProjection | null> {
  let text: string;
  try {
    text = await fs.readFile(Paths.acceptanceSpecsFile(root), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = AcceptanceProjection.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
