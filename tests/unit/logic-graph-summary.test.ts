import { describe, expect, it } from "vitest";
import type { LogicGraph } from "../../src/types/logic-backbone.js";
import { summarizeLogicGraph } from "../../src/core/logic/logic-graph-summary.js";

const GRAPH: LogicGraph = {
  nodes: [
    { id: "input_a", kind: "input", role: "input", label: "a" },
    { id: "formula_b", kind: "formula", role: "intermediate", label: "b" },
    { id: "signal_c", kind: "signal", role: "trigger", label: "c" },
    { id: "judgment_d", kind: "judgment", role: "terminal_explanatory", label: "d" },
  ],
  edges: [
    { from: "input_a", to: "formula_b", kind: "feeds" },
    { from: "formula_b", to: "signal_c", kind: "feeds" },
    { from: "signal_c", to: "judgment_d", kind: "triggers" },
  ],
};

describe("summarizeLogicGraph", () => {
  it("returns a topological execution order (upstream before downstream)", () => {
    const { executionOrder } = summarizeLogicGraph(GRAPH);
    expect(executionOrder.indexOf("input_a")).toBeLessThan(executionOrder.indexOf("formula_b"));
    expect(executionOrder.indexOf("formula_b")).toBeLessThan(executionOrder.indexOf("signal_c"));
    expect(executionOrder).toHaveLength(4);
  });

  it("lists trigger bindings as 'signal → target'", () => {
    expect(summarizeLogicGraph(GRAPH).triggers).toEqual(["signal_c → judgment_d"]);
  });
});
