import type { BilingualMessage } from "../../types/i18n.js";
import { normaliseAcId } from "../execution-navigator/acceptance-parser.js";
import { msg } from "../i18n.js";
import type { ParsedTask, TaskDefect } from "./task-spec-parser.js";

// SOP 0.5.0 (AM-007 / DEC-032) — referential validation of parsed task specs.
// PURE — mirrors logic-backbone-validator.ts. Cross-references:
//   traces  → acceptance-criteria ids (canonical normaliseAcId form)
//   touches → logic-graph node ids   (.ocoding/logic-graph.json projection)
//   depends → task ids defined in the same Task Specs section (acyclic)
// Open-world degradation: when a reference universe is unavailable (null),
// the corresponding check degrades to a WARNING, never a silent pass-as-fact.

export interface TaskValidationContext {
  /** Canonical AC ids, or null when docs/03 is absent/unreadable. */
  readonly acIds: ReadonlySet<string> | null;
  /** Logic-graph node ids, or null when no validated projection exists. */
  readonly logicNodeIds: ReadonlySet<string> | null;
}

export interface TaskValidationResult {
  readonly defects: readonly TaskDefect[];
  readonly warnings: readonly string[];
}

function checkTraces(
  tasks: readonly ParsedTask[],
  acIds: ReadonlySet<string> | null,
  defects: TaskDefect[],
  warnings: string[],
): void {
  if (acIds === null) {
    warnings.push("acceptance-criteria file unavailable — traces unchecked｜验收标准文件不可用，traces 未校验");
    return;
  }
  for (const task of tasks) {
    for (const trace of task.traces) {
      if (!acIds.has(normaliseAcId(trace))) {
        defects.push({ code: "dangling_trace", taskId: task.id, ref: trace });
      }
    }
  }
}

function checkTouches(
  tasks: readonly ParsedTask[],
  logicNodeIds: ReadonlySet<string> | null,
  defects: TaskDefect[],
  warnings: string[],
): void {
  if (logicNodeIds === null) {
    warnings.push("logic-graph projection unavailable — touches unchecked｜逻辑图投影不可用，touches 未校验");
    return;
  }
  for (const task of tasks) {
    for (const touch of task.touches) {
      if (!logicNodeIds.has(touch)) {
        defects.push({ code: "dangling_touch", taskId: task.id, ref: touch });
      }
    }
  }
}

function checkDepends(tasks: readonly ParsedTask[], defects: TaskDefect[]): void {
  const ids = new Set(tasks.map((t) => t.id));
  for (const task of tasks) {
    for (const dep of task.depends) {
      if (!ids.has(dep)) {
        defects.push({ code: "dangling_depends", taskId: task.id, ref: dep });
      }
    }
  }
  const cycle = findDependsCycle(tasks, ids);
  if (cycle !== null) defects.push({ code: "depends_cycle", refs: cycle });
}

// First cycle found among depends edges whose endpoints exist, or null.
// Same DFS colouring as logic-backbone-validator.findCycle.
function findDependsCycle(
  tasks: readonly ParsedTask[],
  ids: ReadonlySet<string>,
): readonly string[] | null {
  const adj = new Map<string, readonly string[]>(
    tasks.map((t) => [t.id, t.depends.filter((d) => ids.has(d))]),
  );
  const state = new Map<string, 0 | 1 | 2>(); // 0=unseen 1=on-stack 2=done
  const stack: string[] = [];
  const dfs = (node: string): readonly string[] | null => {
    state.set(node, 1);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) return [...stack.slice(stack.indexOf(next)), next];
      if (s === 0) {
        const found = dfs(next);
        if (found !== null) return found;
      }
    }
    stack.pop();
    state.set(node, 2);
    return null;
  };
  for (const id of ids) {
    if ((state.get(id) ?? 0) === 0) {
      const cycle = dfs(id);
      if (cycle !== null) return cycle;
    }
  }
  return null;
}

export function validateTaskSpecs(
  tasks: readonly ParsedTask[],
  ctx: TaskValidationContext,
): TaskValidationResult {
  const defects: TaskDefect[] = [];
  const warnings: string[] = [];
  checkTraces(tasks, ctx.acIds, defects, warnings);
  checkTouches(tasks, ctx.logicNodeIds, defects, warnings);
  checkDepends(tasks, defects);
  return { defects, warnings };
}

// Bilingual, human-readable rendering of one defect — used by the gate message
// composition (mirrors logic-backbone-validator.describeIssue).
export function describeTaskDefect(defect: TaskDefect): BilingualMessage {
  const id = defect.taskId ?? "";
  const ref = defect.ref ?? "";
  switch (defect.code) {
    case "no_tasks":
      return msg(
        "Task Specs section has no task blocks — the implementation was never split into tasks",
        "Task Specs 章节没有任务块——实施从未被拆分成任务",
      );
    case "duplicate_task_id":
      return msg(`duplicate task id: ${id}`, `任务 id 重复：${id}`);
    case "invalid_task_id":
      return msg(
        `invalid task id "${id}" (must match task_[a-z0-9_]+)`,
        `任务 id 非法："${id}"（必须匹配 task_[a-z0-9_]+）`,
      );
    case "missing_field":
      return msg(
        `task ${id} is missing required field: ${defect.field ?? ""}`,
        `任务 ${id} 缺少必填字段：${defect.field ?? ""}`,
      );
    case "dangling_trace":
      return msg(
        `task ${id} traces unknown acceptance criterion: ${ref}`,
        `任务 ${id} 的 traces 指向不存在的验收标准：${ref}`,
      );
    case "dangling_touch":
      return msg(
        `task ${id} touches unknown logic-graph node: ${ref}`,
        `任务 ${id} 的 touches 指向不存在的逻辑图节点：${ref}`,
      );
    case "dangling_depends":
      return msg(
        `task ${id} depends on undefined task: ${ref}`,
        `任务 ${id} 依赖未定义的任务：${ref}`,
      );
    case "depends_cycle":
      return msg(
        `task depends cycle detected: ${(defect.refs ?? []).join(" → ")}`,
        `检测到任务依赖环：${(defect.refs ?? []).join(" → ")}`,
      );
  }
}
