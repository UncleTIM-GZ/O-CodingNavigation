import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import yaml from "js-yaml";
import { ReadinessWaiverFile, type ReadinessWaiver } from "../../types/readiness.js";
import { Paths } from "../paths.js";

// P4 — `.ocoding/readiness-waivers.yaml` store. Defensive reads: a missing,
// unparsable, or schema-invalid file yields [] — a broken waiver is NO
// waiver, never a pass (open world). Writes use the same temp+rename
// protocol as readiness-store.ts; no .lock (that critical section is for
// state.json — a CLI-granted waiver is a single-writer, low-concurrency
// file).

export async function readWaivers(root: string): Promise<readonly ReadinessWaiver[]> {
  let text: string;
  try {
    text = await fs.readFile(Paths.readinessWaiversFile(root), "utf8");
  } catch {
    return [];
  }
  let raw: unknown;
  try {
    raw = yaml.load(text);
  } catch {
    return [];
  }
  const parsed = ReadinessWaiverFile.safeParse(raw);
  return parsed.success ? parsed.data.waivers : [];
}

export async function writeWaivers(
  root: string,
  waivers: readonly ReadinessWaiver[],
): Promise<void> {
  const file = Paths.readinessWaiversFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = yaml.dump({ waivers }, { lineWidth: 120 });
  try {
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}
