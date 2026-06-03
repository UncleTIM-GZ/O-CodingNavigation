import type { BilingualMessage } from "../../types/i18n.js";
import { DRIVING_EDGE_KINDS, LogicNodeRole, type LogicGraph } from "../../types/logic-backbone.js";
import { msg } from "../i18n.js";

// Validates a parsed logic backbone for the five drift defects. Pure function —
// mirrors the contract of computeArtifactGateStatus (src/core/artifact/
// gate-status.ts). Defensive: callers may pass a structurally-imperfect graph
// (e.g. a node missing its role) and still get a precise, blocking issue.

export type LogicIssueCode =
  | "missing_role"
  | "duplicate_node_id"
  | "dangling_reference"
  | "cycle_detected"
  | "orphan_node"
  | "unbound_trigger";

export interface LogicBackboneIssue {
  readonly code: LogicIssueCode;
  /** The offending node id, when the defect is node-scoped. */
  readonly nodeId?: string;
  /** Supporting references — a cycle path, a dangling endpoint, etc. */
  readonly refs?: readonly string[];
}

export interface LogicBackboneValidation {
  readonly status: "pass" | "blocked";
  readonly issues: readonly LogicBackboneIssue[];
}

const VALID_ROLES: ReadonlySet<string> = new Set(LogicNodeRole.options);
// Roles whose nodes MUST be consumed by at least one downstream driving edge.
const MUST_BE_CONSUMED: ReadonlySet<string> = new Set(["input", "intermediate"]);

function checkRoles(graph: LogicGraph): LogicBackboneIssue[] {
  const issues: LogicBackboneIssue[] = [];
  for (const node of graph.nodes) {
    const role = (node as { role?: string }).role;
    if (role === undefined || !VALID_ROLES.has(role)) {
      issues.push({ code: "missing_role", nodeId: node.id });
    }
  }
  return issues;
}

// Duplicate ids would silently collapse during reachability analysis, masking
// real defects — reject them up front.
function checkDuplicateIds(graph: LogicGraph): LogicBackboneIssue[] {
  const seen = new Set<string>();
  const reported = new Set<string>();
  const issues: LogicBackboneIssue[] = [];
  for (const node of graph.nodes) {
    if (seen.has(node.id) && !reported.has(node.id)) {
      issues.push({ code: "duplicate_node_id", nodeId: node.id });
      reported.add(node.id);
    }
    seen.add(node.id);
  }
  return issues;
}

function checkDanglingRefs(graph: LogicGraph, ids: ReadonlySet<string>): LogicBackboneIssue[] {
  const issues: LogicBackboneIssue[] = [];
  for (const edge of graph.edges) {
    if (!ids.has(edge.from)) {
      issues.push({ code: "dangling_reference", refs: [edge.from, `${edge.kind}→${edge.to}`] });
    }
    if (!ids.has(edge.to)) {
      issues.push({ code: "dangling_reference", refs: [edge.to, `${edge.from}→${edge.kind}`] });
    }
  }
  return issues;
}

// Returns the first cycle path found among driving edges whose endpoints both
// exist, or null when the driving subgraph is acyclic.
function findCycle(graph: LogicGraph, ids: ReadonlySet<string>): readonly string[] | null {
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const edge of graph.edges) {
    if (!DRIVING_EDGE_KINDS.includes(edge.kind)) continue;
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    adj.get(edge.from)?.push(edge.to);
  }
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

function checkConsumptionAndTriggers(
  graph: LogicGraph,
  validIds: ReadonlySet<string>,
): LogicBackboneIssue[] {
  const issues: LogicBackboneIssue[] = [];
  const drivesFrom = new Set<string>();
  const triggersFrom = new Set<string>();
  // An edge only counts as real consumption when its target actually exists —
  // a node whose only outgoing edge dangles is still an orphan / unbound.
  for (const edge of graph.edges) {
    if (!validIds.has(edge.to)) continue;
    if (DRIVING_EDGE_KINDS.includes(edge.kind)) drivesFrom.add(edge.from);
    if (edge.kind === "triggers") triggersFrom.add(edge.from);
  }
  for (const node of graph.nodes) {
    const role = (node as { role?: string }).role;
    if (role === undefined || !validIds.has(node.id)) continue;
    if (MUST_BE_CONSUMED.has(role) && !drivesFrom.has(node.id)) {
      issues.push({ code: "orphan_node", nodeId: node.id });
    }
    if (role === "trigger" && !triggersFrom.has(node.id)) {
      issues.push({ code: "unbound_trigger", nodeId: node.id });
    }
  }
  return issues;
}

export function validateLogicBackbone(graph: LogicGraph): LogicBackboneValidation {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const issues: LogicBackboneIssue[] = [
    ...checkRoles(graph),
    ...checkDuplicateIds(graph),
    ...checkDanglingRefs(graph, ids),
  ];
  const cycle = findCycle(graph, ids);
  if (cycle !== null) issues.push({ code: "cycle_detected", refs: cycle });
  issues.push(...checkConsumptionAndTriggers(graph, ids));
  return { status: issues.length > 0 ? "blocked" : "pass", issues };
}

// Bilingual, human-readable rendering of a single issue — kept here so the gate
// runner stays a thin orchestrator (machine source of truth = the issue itself).
export function describeIssue(issue: LogicBackboneIssue): BilingualMessage {
  const id = issue.nodeId ?? "";
  const refs = (issue.refs ?? []).join(" → ");
  switch (issue.code) {
    case "missing_role":
      return msg(`node ${id} is missing a valid role`, `节点 ${id} 缺少有效的角色(role)`);
    case "duplicate_node_id":
      return msg(`duplicate node id: ${id}`, `节点 id 重复：${id}`);
    case "dangling_reference":
      return msg(`edge references undefined node: ${refs}`, `边引用了未定义的节点：${refs}`);
    case "cycle_detected":
      return msg(`dependency cycle detected: ${refs}`, `检测到依赖环：${refs}`);
    case "orphan_node":
      return msg(
        `node ${id} is an orphan — defined but never consumed downstream`,
        `节点 ${id} 是孤儿——已定义但没有任何下游消费它`,
      );
    case "unbound_trigger":
      return msg(
        `node ${id} has role trigger but binds no triggers edge to a target`,
        `节点 ${id} 角色为 trigger 但没有 triggers 边指向任何目标`,
      );
  }
}
