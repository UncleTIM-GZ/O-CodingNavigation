import type { Command } from "commander";
import { initProject } from "../../core/init.js";
import { msg } from "../../core/i18n.js";
import { blocked } from "../../core/result.js";
import type { SopProfileVersion } from "../../core/sop/loader.js";
import { outputResult } from "../output.js";
import type { Tier } from "../../types/state.js";

const KNOWN_SOP_VERSIONS: readonly SopProfileVersion[] = [
  "0.1.0",
  "0.2.0",
  "0.3.0",
  "0.4.0",
  "0.5.0",
];

function isKnownSopVersion(v: string): v is SopProfileVersion {
  return (KNOWN_SOP_VERSIONS as readonly string[]).includes(v);
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize an OCN project in the current directory")
    .option(
      "-t, --tier <tier>",
      "Project tier: minimal | production | full (only 'minimal' is enforced today; production/full are accepted but not yet differentiated)",
      "minimal",
    )
    .option(
      "--sop-version <version>",
      `Pin an explicit SOP profile version (${KNOWN_SOP_VERSIONS.join(" | ")}); defaults to the runtime default`,
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { tier: string; sopVersion?: string; json: boolean }) => {
      const tier = rawOpts.tier as Tier;
      if (rawOpts.sopVersion !== undefined && !isKnownSopVersion(rawOpts.sopVersion)) {
        outputResult(
          blocked(
            "ERR_SOP_VERSION",
            msg(
              `Unknown SOP profile version "${rawOpts.sopVersion}". Known: ${KNOWN_SOP_VERSIONS.join(", ")}.`,
              `未知的 SOP profile 版本 "${rawOpts.sopVersion}"。可用：${KNOWN_SOP_VERSIONS.join("、")}。`,
            ),
          ),
          { json: rawOpts.json },
        );
        return;
      }
      const result = await initProject({
        cwd: process.cwd(),
        tier,
        ...(rawOpts.sopVersion !== undefined && isKnownSopVersion(rawOpts.sopVersion)
          ? { sopVersion: rawOpts.sopVersion }
          : {}),
      });
      outputResult(result, { json: rawOpts.json });
    });
}
