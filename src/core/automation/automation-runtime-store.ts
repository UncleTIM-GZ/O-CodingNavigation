import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { AutomationRuntime } from "../../types/automation.js";
import { Paths } from "../paths.js";

// AM-009 / DEC-034 — `.ocoding/automation-runtime.json` store. Same atomic
// temp+rename protocol as task-ledger-store.ts (§4.5); reads are defensive
// and resolve to the not-suspended default (absence simply means "no
// circuit-breaker history yet"). Archived + reset by `ocn cycle new`.

export const DEFAULT_AUTOMATION_RUNTIME: AutomationRuntime = {
  schemaVersion: "1.0",
  suspended: false,
  suspendedAt: null,
  suspendedReason: null,
  failureCounter: null,
};

export async function readAutomationRuntime(root: string): Promise<AutomationRuntime> {
  let text: string;
  try {
    text = await fs.readFile(Paths.automationRuntimeFile(root), "utf8");
  } catch {
    return DEFAULT_AUTOMATION_RUNTIME;
  }
  try {
    const parsed = AutomationRuntime.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : DEFAULT_AUTOMATION_RUNTIME;
  } catch {
    return DEFAULT_AUTOMATION_RUNTIME;
  }
}

export async function writeAutomationRuntime(
  root: string,
  runtime: AutomationRuntime,
): Promise<void> {
  const validated = AutomationRuntime.parse(runtime);
  const file = Paths.automationRuntimeFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(validated, null, 2) + "\n";
  try {
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}
