import { describe, expect, it } from "vitest";
import type { LogicGraph, LogicNode } from "../../src/types/logic-backbone.js";
import {
  validateLogicBackbone,
  type LogicIssueCode,
} from "../../src/core/gate/logic-backbone-validator.js";

// A well-wired backbone exercising every role and edge kind.
function baseGraph(): LogicGraph {
  return {
    nodes: [
      { id: "input_raw", kind: "input", role: "input", label: "raw input" },
      { id: "formula_norm", kind: "formula", role: "intermediate", label: "normalize" },
      { id: "score_risk", kind: "score", role: "intermediate", label: "risk score" },
      { id: "judgment_block", kind: "judgment", role: "terminal_explanatory", label: "block?" },
      { id: "signal_alert", kind: "signal", role: "trigger", label: "alert" },
      { id: "score_debug", kind: "score", role: "hint", label: "debug only" },
    ],
    edges: [
      { from: "input_raw", to: "formula_norm", kind: "feeds" },
      { from: "formula_norm", to: "score_risk", kind: "feeds" },
      { from: "formula_norm", to: "judgment_block", kind: "serves" },
      { from: "score_risk", to: "signal_alert", kind: "feeds" },
      { from: "signal_alert", to: "judgment_block", kind: "triggers" },
      { from: "score_debug", to: "judgment_block", kind: "explains" },
    ],
  };
}

function codes(graph: LogicGraph): LogicIssueCode[] {
  return validateLogicBackbone(graph).issues.map((i) => i.code);
}

describe("validateLogicBackbone", () => {
  it("passes a well-wired backbone with no issues", () => {
    const result = validateLogicBackbone(baseGraph());
    expect(result.status).toBe("pass");
    expect(result.issues).toHaveLength(0);
  });

  it("flags an orphan input/intermediate node with no downstream consumer", () => {
    const g = baseGraph();
    const withOrphan: LogicGraph = {
      ...g,
      nodes: [...g.nodes, { id: "input_unused", kind: "input", role: "input", label: "unused" }],
    };
    const result = validateLogicBackbone(withOrphan);
    expect(result.status).toBe("blocked");
    expect(result.issues).toContainEqual({ code: "orphan_node", nodeId: "input_unused" });
  });

  it("allows terminal_explanatory and hint nodes to be dead ends", () => {
    // judgment_block (terminal_explanatory) and score_debug (hint) have no
    // outgoing driving edges in the base graph and must NOT be orphans.
    expect(codes(baseGraph())).not.toContain("orphan_node");
  });

  it("flags a dangling reference to an undefined node", () => {
    const g = baseGraph();
    const withDangling: LogicGraph = {
      ...g,
      edges: [...g.edges, { from: "formula_norm", to: "score_missing", kind: "feeds" }],
    };
    const result = validateLogicBackbone(withDangling);
    expect(result.status).toBe("blocked");
    expect(result.issues.some((i) => i.code === "dangling_reference")).toBe(true);
  });

  it("detects a dependency cycle in the driving subgraph", () => {
    const g = baseGraph();
    const withCycle: LogicGraph = {
      ...g,
      edges: [...g.edges, { from: "score_risk", to: "formula_norm", kind: "feeds" }],
    };
    const result = validateLogicBackbone(withCycle);
    expect(result.status).toBe("blocked");
    const cycle = result.issues.find((i) => i.code === "cycle_detected");
    expect(cycle).toBeDefined();
    expect(cycle?.refs).toContain("formula_norm");
    expect(cycle?.refs).toContain("score_risk");
  });

  it("flags a trigger node that binds no triggers edge", () => {
    const g = baseGraph();
    const withUnbound: LogicGraph = {
      ...g,
      nodes: [...g.nodes, { id: "signal_quiet", kind: "signal", role: "trigger", label: "quiet" }],
    };
    const result = validateLogicBackbone(withUnbound);
    expect(result.status).toBe("blocked");
    expect(result.issues).toContainEqual({ code: "unbound_trigger", nodeId: "signal_quiet" });
  });

  it("flags a node missing a valid role (defensive against unparsed input)", () => {
    const g = baseGraph();
    const badNode = { id: "score_x", kind: "score", label: "no role" } as unknown as LogicNode;
    const withMissingRole: LogicGraph = { ...g, nodes: [...g.nodes, badNode] };
    const result = validateLogicBackbone(withMissingRole);
    expect(result.status).toBe("blocked");
    expect(result.issues).toContainEqual({ code: "missing_role", nodeId: "score_x" });
  });
});
