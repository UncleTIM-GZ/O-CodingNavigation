import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import {
  AcceptanceProjection,
  type AcceptanceSpec,
  type AcceptanceSpecV2,
} from "../../types/acceptance-spec.js";
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

// Strip an AcceptanceSpecV2 down to the frozen v1 shape (drops kind/measure),
// preserving the exact key order the pre-0.9.0 projection emitted so a build-only
// projection is byte-identical.
function toV1Spec(spec: AcceptanceSpecV2): AcceptanceSpec {
  return {
    id: spec.id,
    desc: spec.desc,
    trace: [...spec.trace],
    ...(spec.given !== undefined ? { given: spec.given } : {}),
    ...(spec.when !== undefined ? { when: spec.when } : {}),
    ...(spec.then !== undefined ? { then: spec.then } : {}),
    ...(spec.priority !== undefined ? { priority: spec.priority } : {}),
  };
}

export function buildAcceptanceProjection(
  specs: readonly AcceptanceSpecV2[],
  specsHash: string,
): AcceptanceProjection {
  const generatedAt = nowIsoUtc();
  const hasOutcome = specs.some((s) => s.kind === "outcome");
  if (!hasOutcome) {
    // Byte-identical with pre-0.9.0: v1 shape, no kind/measure keys.
    return { version: 1, generatedAt, specsHash, items: specs.map(toV1Spec) };
  }
  return { version: 2, generatedAt, specsHash, items: [...specs] };
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
