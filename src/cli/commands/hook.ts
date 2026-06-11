import type { Command } from "commander";
import { runPostEditHook } from "../../core/agent-hooks/post-edit-hook.js";
import { runStopHook } from "../../core/agent-hooks/stop-hook.js";
import { parseHookPayload, readHookStdin } from "../lib/hook-stdin.js";

// AM-006 / DEC-031 — machine-facing Claude Code hook handlers. These
// deliberately BYPASS the CommandResult envelope / outputResult: Claude Code
// consumes raw contract output —
//   Stop block      : stdout `{"decision":"block","reason":…}` + exit 0
//   PostToolUse fail: stderr feedback + exit 2
//   everything else : exit 0, no output
// Wired by `ocn agent setup` into .claude/settings.json; never exposed over
// MCP (the agent's host process calls them, not the model).

export function registerHookCommand(program: Command): void {
  const hook = program
    .command("hook")
    .description("Machine-facing Claude Code hook handlers (read stdin JSON; not for interactive use)");

  hook
    .command("stop")
    .description("Claude Code Stop hook — gate the end of a turn on `ocn check`")
    .action(async () => {
      const payload = parseHookPayload(await readHookStdin());
      const outcome = await runStopHook({ cwd: process.cwd(), payload });
      if (outcome.warning !== undefined) {
        process.stderr.write(outcome.warning + "\n");
      }
      if (outcome.action === "block") {
        process.stdout.write(JSON.stringify({ decision: "block", reason: outcome.reason }) + "\n");
      }
      process.exit(0);
    });

  hook
    .command("post-edit")
    .description("Claude Code PostToolUse hook — fast lint/typecheck feedback after Edit/Write")
    .action(async () => {
      const payload = parseHookPayload(await readHookStdin());
      const outcome = await runPostEditHook({ cwd: process.cwd(), payload });
      if (!outcome.ok) {
        process.stderr.write((outcome.feedback ?? "") + "\n");
        process.exit(2);
      }
      process.exit(0);
    });
}
