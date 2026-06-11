import type { CommandResult } from "../../types/result.js";
import type { ProjectState } from "../../types/state.js";
import type { TaskStatus } from "../../types/task.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { readTaskLedger } from "./task-ledger-store.js";

// SOP 0.5.0 (AM-007 / DEC-032) — `ocn task list` core. Pull-mode, read-only:
// no audit spam (§4.7). Surfaces the task ledger as a stable table.

export interface TaskListItem {
  readonly id: string;
  readonly phase: string | null;
  readonly status: TaskStatus;
  readonly traces: readonly string[];
  readonly verifyCommand: string;
}

export interface TaskListData {
  readonly command: "task.list";
  /** False when no ledger exists yet (build-plan gate not passed on 0.5.0+). */
  readonly ledger: boolean;
  readonly tasks: readonly TaskListItem[];
}

export async function listTasks(opts: {
  readonly cwd: string;
}): Promise<CommandResult<TaskListData>> {
  let state: ProjectState;
  try {
    state = await readState(opts.cwd);
  } catch (err) {
    if (err instanceof StateNotFoundError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          "OCN is not initialized in this directory. Run `ocn init` first.",
          "当前目录未初始化 OCN，请先执行 `ocn init`。",
        ),
      );
    }
    if (err instanceof StateInvalidError) {
      return blocked("ERR_STATE_MACHINE", msg("state.json is invalid.", "state.json 内容不合法。"));
    }
    throw err;
  }
  void state;

  const ledger = await readTaskLedger(opts.cwd);
  if (ledger === null) {
    return ok(
      msg(
        "No task ledger yet — it is generated when the build-plan gate (SOP 0.5.0+) passes.",
        "尚无任务台账——build plan 门禁（SOP 0.5.0+）通过后生成任务台账。",
      ),
      { command: "task.list", ledger: false, tasks: [] },
    );
  }

  const tasks: readonly TaskListItem[] = ledger.tasks.map((t) => ({
    id: t.id,
    phase: t.phase ?? null,
    status: t.status,
    traces: t.traces,
    verifyCommand: t.verifyCommand,
  }));
  const done = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.length - done;
  return ok(
    msg(
      `Task ledger: ${done} done / ${pending} pending (${tasks.length} total).`,
      `任务台账：已勾销 ${done} / 待办 ${pending}（共 ${tasks.length}）。`,
    ),
    { command: "task.list", ledger: true, tasks },
  );
}
