import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AuditActor } from "../../types/audit.js";
import type { CommandResult } from "../../types/result.js";
import type { ProjectState } from "../../types/state.js";
import type { LedgerTask, TaskLedger } from "../../types/task.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { loadAutomation } from "../automation/ai-guard.js";
import { authorizeAiTaskCheck } from "../automation/authorization.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { nowIsoUtc } from "../time.js";
import { readTaskLedger, verifyHashOf, writeTaskLedger } from "./task-ledger-store.js";
import { parseTaskSpecs } from "./task-spec-parser.js";
import { executeVerify } from "./task-verify-exec.js";

// SOP 0.5.0 (AM-007 / DEC-032) — `ocn task check [<id>]` core. Completion is
// decided ONLY by the FROZEN verify command exiting 0 — no manual-done
// channel. Drift guard: before running, the current build-plan command is
// re-hashed against the frozen verifyHash; a mismatch (or a vanished task)
// refuses with "re-run the build-plan gate". HUMAN-ONLY surface: never
// exposed over MCP (§4.8 — runs arbitrary commands and writes state).

const MAX_IDS_IN_MESSAGE = 6;

export interface TaskCheckOptions {
  readonly cwd: string;
  readonly taskId?: string;
  /** AM-009 — caller identity for the audit trail. Defaults to "user". */
  readonly actor?: AuditActor;
  /** AM-009 — mandatory for ai_agent callers (decision trace). */
  readonly rationale?: string;
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
async function hasDrifted(cwd: string, state: ProjectState, target: LedgerTask): Promise<boolean> {
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

interface DoneTrace {
  readonly actor: AuditActor;
  readonly rationale?: string;
  readonly durationMs: number;
}

async function recordDone(
  cwd: string,
  state: ProjectState,
  ledger: TaskLedger,
  target: LedgerTask,
  trace: DoneTrace,
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
      actor: trace.actor,
      source: "cli",
      projectRoot: cwd,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      command: "task check",
      message: msg(
        `Task ${target.id} verified (exit 0) and marked done.`,
        `任务 ${target.id} 验收通过（exit 0），已勾销。`,
      ),
      // AM-009 decision trace: the frozen command + duration are
      // engine-recorded machine context; rationale is the AI's self-report.
      data: {
        taskId: target.id,
        exitCode: 0,
        frozenCommand: target.verifyCommand,
        durationMs: trace.durationMs,
        ...(trace.rationale !== undefined ? { rationale: trace.rationale } : {}),
      },
    }),
  );
}

export async function runTaskCheck(opts: TaskCheckOptions): Promise<CommandResult<TaskCheckData>> {
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

  // AM-009 — ai_agent callers need the phase-2 grant, BUILD/VERIFY position,
  // an un-tripped breaker, and a rationale. Completion judgement itself is
  // unchanged: only the frozen command's exit 0 marks a task done.
  const actor = opts.actor ?? "user";
  if (actor === "ai_agent") {
    const automation = await loadAutomation(opts.cwd);
    const refusal = authorizeAiTaskCheck(
      { ...automation, ...(opts.rationale !== undefined ? { rationale: opts.rationale } : {}) },
      state.currentStateId,
    );
    if (refusal !== null) {
      return blocked("ERR_IO_OR_CONFIG", refusal.message, {
        command: "task.check",
        taskId: opts.taskId ?? null,
        reason: refusal.reason,
        // Decision trace stays complete even on refusal (parity with advance).
        rationale: opts.rationale ?? null,
      });
    }
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

  await recordDone(opts.cwd, state, ledger, target, {
    actor,
    durationMs: outcome.durationMs,
    ...(opts.rationale !== undefined ? { rationale: opts.rationale } : {}),
  });
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
