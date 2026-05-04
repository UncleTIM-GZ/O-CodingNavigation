// Shared CLI helper: runWithCommonFlags (PR-B / H5).
//
// Orchestrates the standard flag-handling pipeline used by every Execution
// Navigator CLI command:
//   1. Parse rawOpts → validated typed opts via the spec.validate function.
//   2. Inject the GhRunner via pickGhRunnerFromEnv() — the same gating /
//      defence-in-depth applies uniformly to every command.
//   3. Call the action with validated opts and runner.
//   4. Render the result via outputResult().
//
// The intent is to drop each CLI command from a 150-line imperative
// boilerplate to a ~30-line declarative shape: a validator + an action.

import type { CommandResult } from "../../types/result.js";
import type { GhRunner } from "../../core/execution-navigator/github-pr-runner.js";
import { outputResult } from "../output.js";
import { pickGhRunnerFromEnv } from "./gh-runner-from-env.js";
import type { ValidationResult } from "./validate-cli-flags.js";

// Validators receive the raw rawOpts blob from commander and return
// `{ ok: true, value }` or `{ ok: false, failure: CommandResult }`. The
// `value` is whatever shape the action consumes.
export interface CliFlagSpec<TOpts> {
  readonly validate: (raw: unknown) => ValidationResult<TOpts>;
}

// Common shape every Execution Navigator CLI command shares: a `--json`
// flag determines stdout serialisation. We extract it from rawOpts so the
// renderer always knows whether to emit JSON.
function extractJsonFlag(rawOpts: unknown): boolean {
  if (typeof rawOpts !== "object" || rawOpts === null) return false;
  const v = (rawOpts as { json?: unknown }).json;
  return v === true;
}

// Compose the validation + injection + action + render pipeline. Returns
// `Promise<void>` because outputResult terminates the process via
// process.exit; in tests the spawned process exit code carries the result.
export async function runWithCommonFlags<TOpts>(
  spec: CliFlagSpec<TOpts>,
  rawOpts: unknown,
  action: (opts: TOpts, runner: GhRunner) => Promise<CommandResult<unknown>>,
): Promise<void> {
  const json = extractJsonFlag(rawOpts);
  const validation = spec.validate(rawOpts);
  if (!validation.ok) {
    outputResult(validation.failure, { json });
    return;
  }
  const runner = pickGhRunnerFromEnv();
  const result = await action(validation.value, runner);
  outputResult(result, { json });
}
