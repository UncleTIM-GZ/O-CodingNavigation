import { describe, expect, it } from "vitest";
import { parseLogicBackbone } from "../../src/core/artifact/logic-backbone-parser.js";

const VALID_GRAPH_YAML = `nodes:
  - id: input_raw
    kind: input
    role: input
    label: raw input
  - id: formula_norm
    kind: formula
    role: intermediate
    label: normalize
edges:
  - from: input_raw
    to: formula_norm
    kind: feeds
`;

function doc(fenceInfo: string, body: string): string {
  return ["# Logic Backbone", "", "## Graph", "", "```" + fenceInfo, body, "```", ""].join("\n");
}

describe("parseLogicBackbone", () => {
  it("returns found=false when no graph block is present", () => {
    const result = parseLogicBackbone("# Logic Backbone\n\nNo graph here.\n");
    expect(result.found).toBe(false);
    expect(result.graph).toBeNull();
  });

  it("parses a graph from an ocn-logic-graph fenced block", () => {
    const result = parseLogicBackbone(doc("ocn-logic-graph", VALID_GRAPH_YAML));
    expect(result.found).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.graph?.nodes).toHaveLength(2);
    expect(result.graph?.edges[0]?.kind).toBe("feeds");
  });

  it("does NOT pick up an untagged ```yaml block (strict ocn-logic-graph only)", () => {
    const result = parseLogicBackbone(doc("yaml", VALID_GRAPH_YAML));
    expect(result.found).toBe(false);
    expect(result.graph).toBeNull();
  });

  it("reports an error when the block is not valid YAML/JSON", () => {
    const result = parseLogicBackbone(doc("ocn-logic-graph", "nodes: [unclosed\n:::"));
    expect(result.found).toBe(true);
    expect(result.graph).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports schema errors with field paths when the graph is malformed", () => {
    const badYaml = `nodes:
  - id: bad-id-no-prefix
    kind: input
    role: input
    label: x
edges: []
`;
    const result = parseLogicBackbone(doc("ocn-logic-graph", badYaml));
    expect(result.found).toBe(true);
    expect(result.graph).toBeNull();
    expect(result.errors.some((e) => e.includes("nodes.0.id"))).toBe(true);
  });
});
