import type { Command } from "commander";
import { initProject, type InitData } from "../../core/init.js";
import { setupAgentIntegration } from "../../core/agent-setup/setup.js";
import { msg } from "../../core/i18n.js";
import { blocked, ok } from "../../core/result.js";
import {
  KNOWN_SOP_PROFILE_VERSIONS,
  isKnownSopProfileVersion,
  type SopProfileVersion,
} from "../../core/sop/loader.js";
import type { CommandResult } from "../../types/result.js";
import { outputResult } from "../output.js";
import type { Tier } from "../../types/state.js";

// Single source of truth — the loader's registry (never a hand-maintained copy,
// which drifts: it stalled at 0.7.0 through the 0.8.0/0.9.0 releases).
const KNOWN_SOP_VERSIONS: readonly SopProfileVersion[] = KNOWN_SOP_PROFILE_VERSIONS;

function isKnownSopVersion(v: string): v is SopProfileVersion {
  return isKnownSopProfileVersion(v);
}

// AM-013 / DEC-038 — after a successful `ocn init`, wire the project for Claude
// Code by default (the DEC-031 follow-up). Fail-open (DEC-031 §1): init already
// succeeded, so a wiring hiccup never fails init — it downgrades to a hint to
// run `ocn agent setup --force` manually. `--no-agent` opts out entirely.
async function withAgentWiring(
  initResult: CommandResult<InitData>,
  cwd: string,
): Promise<CommandResult<unknown>> {
  if (!initResult.ok) return initResult;
  const setup = await setupAgentIntegration({ cwd, force: false });
  const baseData = (initResult.data ?? {}) as Record<string, unknown>;
  if (setup.ok) {
    return ok(
      {
        en: `${initResult.message.en}\nClaude Code integration configured — /ocn-next is ready (reload your Claude Code session). Use \`ocn init --no-agent\` to skip.`,
        zh: `${initResult.message.zh}\nClaude Code 集成已配置——/ocn-next 可用（请重载 Claude Code 会话）。如需跳过：\`ocn init --no-agent\`。`,
      },
      { ...baseData, agentSetup: { ok: true, files: setup.data?.files ?? [] } },
    );
  }
  return ok(
    {
      en: `${initResult.message.en}\nClaude Code wiring skipped: ${setup.message.en} Run \`ocn agent setup --force\` to finish it.`,
      zh: `${initResult.message.zh}\nClaude Code 接线已跳过：${setup.message.zh} 可执行 \`ocn agent setup --force\` 补全。`,
    },
    { ...baseData, agentSetup: { ok: false, code: setup.code } },
  );
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
    .option(
      "--no-agent",
      "Skip Claude Code wiring (.claude/ + CLAUDE.md import); only write .ocoding/",
    )
    .action(
      async (rawOpts: { tier: string; sopVersion?: string; json: boolean; agent: boolean }) => {
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
        const final =
          rawOpts.agent === false ? result : await withAgentWiring(result, process.cwd());
        outputResult(final, { json: rawOpts.json });
      },
    );
}
