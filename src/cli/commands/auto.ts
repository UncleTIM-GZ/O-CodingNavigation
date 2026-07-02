import type { Command } from "commander";
import { InvalidActorError, resolveActor } from "../../core/automation/actor.js";
import {
  type AutoPhaseArg,
  type AutoSwitchAction,
  autoStatus,
  autoSwitch,
} from "../../core/automation/auto-mode.js";
import { autoTrace } from "../../core/automation/auto-trace.js";
import { msg } from "../../core/i18n.js";
import { blocked } from "../../core/result.js";
import { outputResult } from "../output.js";

// AM-009 / DEC-034 — `ocn auto`: the human authorization switch for Auto
// Mode. Human-only (refuses ai_agent), CLI-only (never exposed over MCP).
// on/off/resume are push audit events; status is pull-mode (no audit, §4.7).

interface AutoCliOptions {
  readonly phase?: string;
  readonly actor?: string;
  readonly human?: boolean;
  readonly json: boolean;
}

const VALID_PHASES: readonly AutoPhaseArg[] = ["1", "2", "all"];

function parsePhase(raw: string | undefined): AutoPhaseArg | undefined | "invalid" {
  if (raw === undefined) return undefined;
  return (VALID_PHASES as readonly string[]).includes(raw) ? (raw as AutoPhaseArg) : "invalid";
}

async function runSwitch(action: AutoSwitchAction, rawOpts: AutoCliOptions): Promise<void> {
  const phase = parsePhase(rawOpts.phase);
  if (phase === "invalid") {
    outputResult(
      blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          "Invalid --phase value; expected 1, 2 or all.",
          "--phase 取值不合法；只接受 1、2 或 all。",
        ),
        { reason: "automation_phase_invalid" },
      ),
      { json: rawOpts.json },
    );
    return;
  }
  // --human is sugar for `--actor user`; an explicit --actor still wins. Lets a
  // human flip the switch from an agent session where OCN_ACTOR=ai_agent is set
  // (mirrors `ocn advance -H`). This is a governance signature, not a boundary
  // (see actor.ts) — the AI remains contractually barred from using it.
  const actorFlag = rawOpts.actor ?? (rawOpts.human === true ? "user" : undefined);
  let actor;
  try {
    actor = resolveActor(actorFlag);
  } catch (err) {
    if (err instanceof InvalidActorError) {
      outputResult(
        blocked("ERR_IO_OR_CONFIG", msg(err.message, err.message), { reason: err.reason }),
        { json: rawOpts.json },
      );
      return;
    }
    throw err;
  }
  const result = await autoSwitch({
    cwd: process.cwd(),
    action,
    actor,
    ...(phase !== undefined ? { phase } : {}),
  });
  outputResult(result, { json: rawOpts.json });
}

export function registerAutoCommand(program: Command): void {
  const auto = program
    .command("auto")
    .description("Auto Mode switch: delegate gate-green advances to the AI agent (AM-009)");

  auto
    .command("on")
    .description("Enable auto mode for a phase (human-only; --phase is mandatory)")
    .option("--phase <phase>", "1 = DISCOVERY→PLAN, 2 = BUILD→VERIFY, all = both")
    .option("--actor <actor>", "Caller identity override (user|ai_agent)")
    .option(
      "-H, --human",
      "Run as the human operator (shorthand for --actor user); overrides OCN_ACTOR=ai_agent in an agent session",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: AutoCliOptions) => runSwitch("on", rawOpts));

  auto
    .command("off")
    .description("Disable auto mode (default: both phases)")
    .option("--phase <phase>", "1, 2 or all (default all)")
    .option("--actor <actor>", "Caller identity override (user|ai_agent)")
    .option(
      "-H, --human",
      "Run as the human operator (shorthand for --actor user); overrides OCN_ACTOR=ai_agent in an agent session",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: AutoCliOptions) => runSwitch("off", rawOpts));

  auto
    .command("resume")
    .description("Clear a circuit-breaker suspension and resume auto mode (human-only)")
    .option("--actor <actor>", "Caller identity override (user|ai_agent)")
    .option(
      "-H, --human",
      "Run as the human operator (shorthand for --actor user); overrides OCN_ACTOR=ai_agent in an agent session",
    )
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: AutoCliOptions) => runSwitch("resume", rawOpts));

  auto
    .command("trace")
    .description("Replay the automation decision trace from the audit log (pull mode, no audit)")
    .option("--limit <n>", "Max events to show (default 50)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { limit?: string; json: boolean }) => {
      const limit = rawOpts.limit !== undefined ? Number.parseInt(rawOpts.limit, 10) : undefined;
      const result = await autoTrace(
        process.cwd(),
        Number.isFinite(limit) && limit !== undefined ? limit : undefined,
      );
      outputResult(result, { json: rawOpts.json });
    });

  auto
    .command("status")
    .description("Show auto-mode config + circuit-breaker state (pull mode, no audit)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: AutoCliOptions) => {
      const result = await autoStatus(process.cwd());
      outputResult(result, { json: rawOpts.json });
    });
}
