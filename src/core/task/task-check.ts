import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { CommandResult } from "../../types/result.js";
import type { ProjectState } from "../../types/state.js";
import type { LedgerTask, TaskLedger } from "../../types/task.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { nowIsoUtc } from "../time.js";
import { readTaskLedger, verifyHashOf, writeTaskLedger } from "./task-ledger-store.js";
import { parseTaskSpecs } from "./task-spec-parser.js";

// SOP 0.5.0 (AM-007 / DEC-032) — `ocn task check [<id>]` core. Completion is
// decided ONLY by the FROZEN verify command exiting 0 — no manual-done
// channel. Drift guard: before running, the current build-plan command is
// re-hashed against the frozen verifyHash; a mismatch (or a vanished task)
// refuses with "re-run the build-plan gate". HUMAN-ONLY surface: never
// exposed over MCP (§4.8 — runs arbitrary commands and writes state).

const execFileP = promisify(execFile);
const DEFAULT_TIMEOUT_SECONDS = 120;
const MAX_OUTPUT_TAIL = 2000;
const MAX_BUFFER_BYTES = 1024 * 1024;
const MAX_IDS_IN_MESSAGE = 6;

export interface TaskCheckOptions {
  readonly cwd: string;
  readonly taskId?: string;
}

export interface TaskCheckData {
  readonly command: "task.check";
  readonly taskId: string | null;
  readonly status?: "pending" | "done";
  readonly exitCode?: number | null;
  readonly outputTail?: string;
  /** Default-resolution failure: each pending task's unmet depends. */
  readonly blockedBy?: readonly string[];
}

const DRIFT_MESSAGE = msg(
  "task spec drifted; re-run the build-plan gate (`ocn check`)",
  "任务规格已漂移，请重过 build plan 门禁（`ocn check`）",
);

type Resolution =
  | { readonly kind: "task"; readonly task: LedgerTask }
  | { readonly kind: "result"; readonly result: CommandResult<TaskCheckData> };

function resolveTarget(ledger: TaskLedger, taskId: string | undefined): Resolution {
  if (taskId !== undefined) {
    const task = ledger.tasks.find((t) => t.id === taskId);
    if (task === undefined) {
      return {
        kind: "result",
        result: blocked(
          "ERR_ARTIFACT_INVALID",
          msg(`Unknown task id: ${taskId}.`, `未知任务 id：${taskId}。`),
          { command: "task.check", taskId } satisfies TaskCheckData,
        ),
      };
    }
    // DEC-032 — rerunning a done task is allowed: it re-executes the frozen
    // command and refreshes the evidence (the referee can always re-judge).
    return { kind: "task", task };
  }
  const done = new Set(ledger.tasks.filter((t) => t.status === "done").map((t) => t.id));
  const pending = ledger.tasks.filter((t) => t.status === "pending");
  if (pending.length === 0) {
    return {
      kind: "result",
      result: ok(
        msg("All tasks are done — the ledger is clear.", "全部任务已勾销——任务台账已清。"),
        { command: "task.check", taskId: null } satisfies TaskCheckData,
      ),
    };
  }
  const ready = pending.find((t) => t.depends.every((d) => done.has(d)));
  if (ready !== undefined) return { kind: "task", task: ready };
  const blockedLines = pending
    .slice(0, MAX_IDS_IN_MESSAGE)
    .map((t) => `${t.id} ← ${t.depends.filter((d) => !done.has(d)).join(", ")}`);
  return {
    kind: "result",
    result: blocked(
      "ERR_GATE_FAILED",
      msg(
        `Every pending task is blocked by unmet depends: ${blockedLines.join("; ")}.`,
        `所有待办任务都被未满足的依赖阻塞：${blockedLines.join("；")}。`,
      ),
      { command: "task.check", taskId: null, blockedBy: blockedLines } satisfies TaskCheckData,
    ),
  };
}

/** Re-read the build plan and compare the CURRENT verify command hash against
 *  the frozen ledger hash. Returns true when the spec has drifted. */
async function hasDrifted(
  cwd: string,
  state: ProjectState,
  target: LedgerTask,
): Promise<boolean> {
  const profile = resolveProfileForProject(state.project.sopProfileVersion);
  const rel = profile.artifactPathForStep("step_build_plan");
  if (rel === null) return true;
  let content: string;
  try {
    content = await fs.readFile(join(cwd, rel), "utf8");
  } catch {
    return true;
  }
  const parsed = parseTaskSpecs(content);
  const current = parsed.tasks.find((t) => t.id === target.id);
  if (current === undefined) return true;
  return verifyHashOf(current.verify) !== target.verifyHash;
}

interface ExecOutcome {
  readonly exitCode: number | null;
  readonly outputTail: string;
}

async function executeVerify(cwd: string, task: LedgerTask): Promise<ExecOutcome> {
  const timeoutMs = (task.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1000;
  try {
    const { stdout, stderr } = await execFileP("/bin/sh", ["-c", task.verifyCommand], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER_BYTES,
    });
    return { exitCode: 0, outputTail: `${stdout}${stderr}`.slice(-MAX_OUTPUT_TAIL) };
  } catch (err) {
    // A timeout/kill has a non-numeric (or null) code — report it honestly
    // rather than as a fake exit code (mirrors repo-prober.ts).
    const e = err as { code?: number | string | null; stdout?: string; stderr?: string };
    const exitCode = typeof e.code === "number" ? e.code : null;
    return {
      exitCode,
      outputTail: `${e.stdout ?? ""}${e.stderr ?? ""}`.slice(-MAX_OUTPUT_TAIL),
    };
  }
}

async function recordDone(
  cwd: string,
  state: ProjectState,
  ledger: TaskLedger,
  target: LedgerTask,
): Promise<void> {
  const updated: TaskLedger = {
    ...ledger,
    tasks: ledger.tasks.map((t) =>
      t.id === target.id
        ? {
            ...t,
            status: "done" as const,
            evidence: { ranAt: nowIsoUtc(), exitCode: 0, commandHash: target.verifyHash },
          }
        : t,
    ),
  };
  await writeTaskLedger(cwd, updated);
  await safeAudit(
    cwd,
    createAuditEvent({
      eventType: "task_completed",
      result: "success",
      actor: "user",
      source: "cli",
      projectRoot: cwd,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      command: "task check",
      message: msg(
        `Task ${target.id} verified (exit 0) and marked done.`,
        `任务 ${target.id} 验收通过（exit 0），已勾销。`,
      ),
      data: { taskId: target.id, exitCode: 0 },
    }),
  );
}

export async function runTaskCheck(
  opts: TaskCheckOptions,
): Promise<CommandResult<TaskCheckData>> {
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

  const ledger = await readTaskLedger(opts.cwd);
  if (ledger === null) {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        "No task ledger — pass the build-plan gate (SOP 0.5.0+) first to generate it.",
        "尚无任务台账——请先通过 build plan 门禁（SOP 0.5.0+）生成任务台账。",
      ),
    );
  }

  const resolution = resolveTarget(ledger, opts.taskId);
  if (resolution.kind === "result") return resolution.result;
  const target = resolution.task;

  if (await hasDrifted(opts.cwd, state, target)) {
    return blocked("ERR_GATE_FAILED", DRIFT_MESSAGE, {
      command: "task.check",
      taskId: target.id,
    } satisfies TaskCheckData);
  }

  const outcome = await executeVerify(opts.cwd, target);
  if (outcome.exitCode !== 0) {
    const codeLabel = outcome.exitCode === null ? "timeout/killed" : String(outcome.exitCode);
    return blocked(
      "ERR_GATE_FAILED",
      msg(
        `Task ${target.id} verify command failed (${codeLabel}): \`${target.verifyCommand}\`.`,
        `任务 ${target.id} 验收命令未通过（${codeLabel}）：\`${target.verifyCommand}\`。`,
      ),
      {
        command: "task.check",
        taskId: target.id,
        status: "pending",
        exitCode: outcome.exitCode,
        outputTail: outcome.outputTail,
      } satisfies TaskCheckData,
    );
  }

  await recordDone(opts.cwd, state, ledger, target);
  return ok(
    msg(
      `Task ${target.id} verified (exit 0) and marked done.`,
      `任务 ${target.id} 验收通过（exit 0），已勾销。`,
    ),
    {
      command: "task.check",
      taskId: target.id,
      status: "done",
      exitCode: 0,
    } satisfies TaskCheckData,
  );
}
