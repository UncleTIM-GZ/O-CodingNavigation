import { promises as fs } from "node:fs";
import { join } from "node:path";

// Test helper: directly mutate `.ocoding/state.json` to a target step.
// Used by tests that want to exercise step-specific behavior (e.g. PRD gate
// checks for step_prd) without paying the cost of multiple `ocn advance`
// invocations. The actual advance flow is covered separately by
// tests/cli/advance.test.ts and tests/e2e/skeleton-spike-demo.test.ts.

export interface SeededLocation {
  readonly currentStateId: string;
  readonly currentStepId: string;
}

export async function seedState(
  cwd: string,
  loc: SeededLocation,
): Promise<void> {
  const stateFile = join(cwd, ".ocoding", "state.json");
  const raw = await fs.readFile(stateFile, "utf8");
  const state = JSON.parse(raw);
  state.currentStateId = loc.currentStateId;
  state.currentStepId = loc.currentStepId;
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export const seedToStepPrd = (cwd: string): Promise<void> =>
  seedState(cwd, { currentStateId: "state_spec", currentStepId: "step_prd" });
