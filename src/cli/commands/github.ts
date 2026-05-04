import type { Command } from "commander";
import { skeletonResult } from "../../core/execution-navigator/skeleton.js";
import { blocked } from "../../core/result.js";
import { msg } from "../../core/i18n.js";
import { outputResult } from "../output.js";

// Validates that the argument is a positive-integer PR number. Skeleton-only:
// even on success we never call `gh` or the GitHub API.
function isValidPrNumber(raw: string): boolean {
  if (!/^[1-9][0-9]*$/.test(raw)) return false;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0;
}

// `ocn github analyze-pr <number>` — Execution Navigator skeleton (DEC-024 PR 1).
// Validates input shape; otherwise returns the planned/not-implemented envelope.
// Does NOT call `gh`, the GitHub API, or any network resource.
export function registerGithubCommand(program: Command): void {
  const github = program
    .command("github")
    .description("Execution Navigator GitHub surface (DEC-024) — read-only (skeleton)");

  github
    .command("analyze-pr")
    .description(
      "Analyze a GitHub PR (skeleton — read-only GitHub PR analysis not yet implemented)",
    )
    .argument("<number>", "Pull request number (positive integer)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action((rawNumber: string, rawOpts: { json: boolean }) => {
      if (!isValidPrNumber(rawNumber)) {
        const failure = blocked(
          "ERR_ARTIFACT_INVALID",
          msg(
            `Invalid PR number "${rawNumber}". Expected a positive integer (e.g. 42).`,
            `PR 编号 "${rawNumber}" 无效，必须是正整数（例如 42）。`,
          ),
          { argument: "number", received: rawNumber },
        );
        outputResult(failure, { json: rawOpts.json });
        return;
      }
      const result = skeletonResult("github.analyze_pr");
      outputResult(result, { json: rawOpts.json });
    });
}
