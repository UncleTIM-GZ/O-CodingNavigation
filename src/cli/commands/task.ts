import type { Command } from "commander";
import { runTaskCheck } from "../../core/task/task-check.js";
import { listTasks } from "../../core/task/task-list.js";
import { outputResult } from "../output.js";

// AM-007 / DEC-032 — Task Backbone CLI surface (SOP 0.5.0+).
//   ocn task list          — pull-mode ledger overview (no audit spam, §4.7)
//   ocn task check [<id>]  — run the FROZEN verify command; exit 0 is the only
//                            way a task becomes done (no manual-done channel)
// HUMAN-ONLY by construction: `task check` runs arbitrary commands and writes
// the ledger, so it is never exposed over MCP (§4.8 — same class as advance).

export function registerTaskCommand(program: Command): void {
  const task = program
    .command("task")
    .description("Task backbone — build-plan task ledger (SOP 0.5.0+)");

  task
    .command("list")
    .description("Show the task ledger (id / phase / status / frozen verify command)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (rawOpts: { json: boolean }) => {
      const result = await listTasks({ cwd: process.cwd() });
      outputResult(result, { json: rawOpts.json });
    });

  task
    .command("check")
    .description(
      "Run a task's frozen verify command (default: first pending task with cleared depends); exit 0 marks it done",
    )
    .argument("[taskId]", "Task id (e.g. task_phase0_runtime_skeleton)")
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (taskId: string | undefined, rawOpts: { json: boolean }) => {
      const result = await runTaskCheck({
        cwd: process.cwd(),
        ...(taskId !== undefined ? { taskId } : {}),
      });
      outputResult(result, { json: rawOpts.json });
    });
}
