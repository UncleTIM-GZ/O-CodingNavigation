import { DRIVING_EDGE_KINDS, type LogicGraph } from "../../types/logic-backbone.js";

// Compact, BUILD-facing summary of a validated logic backbone. Surfaced in
// `ocn brief` so an AI coding session always sees the execution order and the
// trigger bindings — the two things that silently drift during implementation.

export interface LogicBackboneSummary {
  /** Node ids in dependency (topological) order — what computes first. */
  readonly executionOrder: readonly string[];
  /** Actionable bindings rendered as "signal → target". */
  readonly triggers: readonly string[];
}

// Kahn topological sort over driving edges. The graph is acyclic here (the gate
// rejected cycles), but we fall back to declaration order if anything is off so
// the brief never throws.
function topoOrder(graph: LogicGraph): readonly string[] {
  const ids = graph.nodes.map((n) => n.id);
  const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of graph.edges) {
    if (!DRIVING_EDGE_KINDS.includes(edge.kind)) continue;
    if (!indeg.has(edge.from) || !indeg.has(edge.to)) continue;
    adj.get(edge.from)?.push(edge.to);
    indeg.set(edge.to, (indeg.get(edge.to) ?? 0) + 1);
  }
  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1;
      indeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order.length === ids.length ? order : ids;
}

export function summarizeLogicGraph(graph: LogicGraph): LogicBackboneSummary {
  const triggers = graph.edges
    .filter((e) => e.kind === "triggers")
    .map((e) => `${e.from} → ${e.to}`);
  return { executionOrder: topoOrder(graph), triggers };
}
