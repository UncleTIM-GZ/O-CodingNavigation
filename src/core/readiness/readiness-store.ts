import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { ReadinessLedger } from "../../types/readiness.js";
import { Paths } from "../paths.js";

// SOP 0.4.0 — `.ocoding/readiness.json` projection store. Same atomic
// temp+rename protocol as logic-graph-store.ts (§4.5); reads are defensive
// and return null on any failure (absence simply means "not yet evaluated").

export async function writeReadinessLedger(root: string, ledger: ReadinessLedger): Promise<void> {
  const file = Paths.readinessFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(ledger, null, 2) + "\n";
  try {
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

export async function readReadinessLedger(root: string): Promise<ReadinessLedger | null> {
  let text: string;
  try {
    text = await fs.readFile(Paths.readinessFile(root), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = ReadinessLedger.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
