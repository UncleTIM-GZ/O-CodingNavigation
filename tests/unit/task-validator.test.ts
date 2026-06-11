import { describe, expect, it } from "vitest";
import type { ParsedTask } from "../../src/core/task/task-spec-parser.js";
import { describeTaskDefect, validateTaskSpecs } from "../../src/core/task/task-validator.js";

// SOP 0.5.0 (AM-007 / DEC-032) — referential validation: traces → AC ids,
// touches → logic-graph nodes, depends → defined tasks (acyclic). Null
// universes degrade to warnings (open world), never silent passes.

function task(partial: Partial<ParsedTask> & { id: string }): ParsedTask {
  return {
    goal: "g",
    traces: ["AC-001"],
    touches: [],
    verify: "true",
    dod: "d",
    depends: [],
    ...partial,
  };
}

const AC_IDS: ReadonlySet<string> = new Set(["AC-001", "AC-003", "AC-INIT-001"]);
const NODE_IDS: ReadonlySet<string> = new Set(["score_risk", "signal_alert"]);

describe("validateTaskSpecs — traces", () => {
  it("flags a trace that resolves to no AC id", () => {
    const { defects } = validateTaskSpecs([task({ id: "task_a", traces: ["AC-999"] })], {
      acIds: AC_IDS,
      logicNodeIds: null,
    });
    expect(defects).toContainEqual({ code: "dangling_trace", taskId: "task_a", ref: "AC-999" });
  });

  it("normalises trace ids before lookup (AC-3 ≅ AC-003, ac.init.1 ≅ AC-INIT-001)", () => {
    const { defects } = validateTaskSpecs(
      [task({ id: "task_a", traces: ["AC-3", "ac.init.1", "AC-1"] })],
      { acIds: AC_IDS, logicNodeIds: null },
    );
    expect(defects.filter((d) => d.code === "dangling_trace")).toEqual([]);
  });

  it("null acIds → warning, not defect", () => {
    const { defects, warnings } = validateTaskSpecs(
      [task({ id: "task_a", traces: ["AC-999"] })],
      { acIds: null, logicNodeIds: null },
    );
    expect(defects.filter((d) => d.code === "dangling_trace")).toEqual([]);
    expect(warnings.some((w) => w.includes("traces"))).toBe(true);
  });
});

describe("validateTaskSpecs — touches", () => {
  it("flags a touch that resolves to no logic-graph node", () => {
    const { defects } = validateTaskSpecs(
      [task({ id: "task_a", touches: ["score_risk", "ghost_node"] })],
      { acIds: AC_IDS, logicNodeIds: NODE_IDS },
    );
    expect(defects).toContainEqual({ code: "dangling_touch", taskId: "task_a", ref: "ghost_node" });
  });

  it("null logicNodeIds → warning, not defect (graph absent is legal)", () => {
    const { defects, warnings } = validateTaskSpecs(
      [task({ id: "task_a", touches: ["ghost_node"] })],
      { acIds: AC_IDS, logicNodeIds: null },
    );
    expect(defects.filter((d) => d.code === "dangling_touch")).toEqual([]);
    expect(warnings.some((w) => w.includes("touches"))).toBe(true);
  });
});

describe("validateTaskSpecs — depends", () => {
  it("flags depends on an undefined task id", () => {
    const { defects } = validateTaskSpecs(
      [task({ id: "task_a", depends: ["task_missing"] })],
      { acIds: AC_IDS, logicNodeIds: null },
    );
    expect(defects).toContainEqual({
      code: "dangling_depends",
      taskId: "task_a",
      ref: "task_missing",
    });
  });

  it("flags a depends cycle with its path", () => {
    const { defects } = validateTaskSpecs(
      [
        task({ id: "task_a", depends: ["task_b"] }),
        task({ id: "task_b", depends: ["task_c"] }),
        task({ id: "task_c", depends: ["task_a"] }),
      ],
      { acIds: AC_IDS, logicNodeIds: null },
    );
    const cycle = defects.find((d) => d.code === "depends_cycle");
    expect(cycle).toBeDefined();
    expect(cycle?.refs?.length).toBeGreaterThanOrEqual(4);
  });

  it("accepts an acyclic depends chain", () => {
    const { defects } = validateTaskSpecs(
      [task({ id: "task_a" }), task({ id: "task_b", depends: ["task_a"] })],
      { acIds: AC_IDS, logicNodeIds: NODE_IDS },
    );
    expect(defects).toEqual([]);
  });
});

describe("describeTaskDefect", () => {
  it("renders every defect code bilingually", () => {
    const samples = [
      { code: "no_tasks" as const },
      { code: "duplicate_task_id" as const, taskId: "task_a" },
      { code: "invalid_task_id" as const, taskId: "job_a" },
      { code: "missing_field" as const, taskId: "task_a", field: "goal" },
      { code: "dangling_trace" as const, taskId: "task_a", ref: "AC-9" },
      { code: "dangling_touch" as const, taskId: "task_a", ref: "x" },
      { code: "dangling_depends" as const, taskId: "task_a", ref: "task_x" },
      { code: "depends_cycle" as const, refs: ["task_a", "task_b", "task_a"] },
    ];
    for (const defect of samples) {
      const message = describeTaskDefect(defect);
      expect(message.en.length).toBeGreaterThan(0);
      expect(message.zh.length).toBeGreaterThan(0);
    }
  });
});
