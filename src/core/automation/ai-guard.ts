import type { AutomationConfig, AutomationRuntime } from "../../types/automation.js";
import { readAutomationConfig } from "./automation-config.js";
import { readAutomationRuntime } from "./automation-runtime-store.js";

// AM-009 — one-shot load of the automation surface (human grant + machine
// state) for the enforcement points (advance / task check / rewind).

export interface AutomationSurface {
  readonly config: AutomationConfig;
  readonly runtime: AutomationRuntime;
}

export async function loadAutomation(cwd: string): Promise<AutomationSurface> {
  const config = await readAutomationConfig(cwd);
  const runtime = await readAutomationRuntime(cwd);
  return { config, runtime };
}
