import type { Command } from "commander";
import { upgradeSopProfile } from "../../core/sop/upgrade.js";
import { outputResult } from "../output.js";

// DEC-029 / AM-005 — `ocn sop upgrade [--target <version>] [--plan]`.
// Forward-only re-pin of an initialized project to a newer bundled SOP
// profile. HUMAN-ONLY by construction: CLI command, never exposed over MCP
// (§4.8 — same class as advance). `sop version` / `sop diff` remain backlog
// (OCN-2-SOP-VERSION).

export function registerSopCommand(program: Command): void {
  const sop = program.command("sop").description("SOP profile versioning");

  sop
    .command("upgrade")
    .description(
      "Upgrade the project's pinned SOP profile to a newer bundled version (forward-only; config.yaml preserved)",
    )
    .option("--target <version>", "Target SOP profile version (default: bundled runtime default)")
    .option("--plan", "Dry-run: validate and show the upgrade plan without writing", false)
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { target?: string; plan: boolean; json: boolean }) => {
      const result = await upgradeSopProfile({
        cwd: process.cwd(),
        ...(rawOpts.target !== undefined ? { targetVersion: rawOpts.target } : {}),
        plan: rawOpts.plan,
      });
      outputResult(result, { json: rawOpts.json });
    });
}
