import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { TaskLedger, type TaskSpec } from "../../types/task.js";
import { Paths } from "../paths.js";
import { nowIsoUtc } from "../time.js";

// SOP 0.5.0 (AM-007 / DEC-032) — `.ocoding/task-ledger.json` projection store.
// Same atomic temp+rename protocol as logic-graph-store.ts (§4.5); reads are
// defensive and return null on any failure (absence simply means "the
// build-plan gate has not yet passed under SOP 0.5.0+").

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** R4 freeze — verifyHash is the sha256 of the TRIMMED command text. */
export function verifyHashOf(command: string): string {
  return sha256Hex(command.trim());
}

export async function writeTaskLedger(root: string, ledger: TaskLedger): Promise<void> {
  const file = Paths.taskLedgerFile(root);
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

export async function readTaskLedger(root: string): Promise<TaskLedger | null> {
  let text: string;
  try {
    text = await fs.readFile(Paths.taskLedgerFile(root), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = TaskLedger.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Regenerate the ledger from freshly-gated specs, carrying `done` status +
 * evidence from the previous ledger ONLY when the task id is unchanged AND
 * its verifyHash still matches — editing a done task's verify command resets
 * it to pending (the referee changed, the old evidence no longer applies).
 */
export function buildLedger(
  specs: readonly TaskSpec[],
  prev: TaskLedger | null,
  buildPlanHash: string,
): TaskLedger {
  const prevById = new Map((prev?.tasks ?? []).map((t) => [t.id, t]));
  return {
    version: 1,
    generatedAt: nowIsoUtc(),
    buildPlanHash,
    tasks: specs.map((spec) => {
      const carried = prevById.get(spec.id);
      if (carried !== undefined && carried.status === "done" && carried.verifyHash === spec.verifyHash) {
        return { ...spec, status: "done", evidence: carried.evidence };
      }
      return { ...spec, status: "pending", evidence: null };
    }),
  };
}
