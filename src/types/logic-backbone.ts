import { z } from "zod";

// Logic Backbone｜逻辑主干 — the machine-verifiable computation/decision graph.
//
// Models a system's dynamic semantics as a typed directed graph (DAG + DMN):
//   - nodes carry a KIND (what they are) and a ROLE (how they participate)
//   - edges carry a KIND (the semantic relation, always upstream → downstream)
//
// This file is the single source of truth (zod schema + inferred types). The
// validator in src/core/gate/logic-backbone-validator.ts checks the graph for
// the five drift defects (missing role, dangling reference, cycle, orphan,
// unbound trigger). See docs/07-logic-backbone.md for the authored form.

// What a node IS (DMN/DAG vocabulary mapped to the user's terms).
export const LogicNodeKind = z.enum([
  "input", // 输入/指标 — externally provided datum
  "formula", // 公式 — a computation
  "score", // 分数 — a computed value that may propagate
  "judgment", // 判断/决策 — a decision derived from formulas/scores
  "signal", // 信号 — an emitted indicator (may drive or merely inform)
]);
export type LogicNodeKind = z.infer<typeof LogicNodeKind>;

// How a node PARTICIPATES — every node must declare exactly one role.
//   input                 — a source; must be consumed downstream
//   intermediate          — feeds further computation; must be consumed
//   terminal_explanatory  — a terminal value used only to explain (no consumer required)
//   trigger               — an actionable signal; must bind a triggers edge to a target
//   hint                  — an advisory signal; informs only, drives nothing
export const LogicNodeRole = z.enum([
  "input",
  "intermediate",
  "terminal_explanatory",
  "trigger",
  "hint",
]);
export type LogicNodeRole = z.infer<typeof LogicNodeRole>;

// Edge semantics — ALWAYS upstream `from` → downstream `to` (producer → consumer).
//   feeds     — from feeds into to (data/score dependency; defines exec order)
//   serves    — from (formula) serves to (judgment)                [DMN binding]
//   triggers  — from (signal) triggers to (a function/action target)
//   explains  — from (terminal/hint) annotates to (non-driving; excluded from DAG)
export const LogicEdgeKind = z.enum(["feeds", "serves", "triggers", "explains"]);
export type LogicEdgeKind = z.infer<typeof LogicEdgeKind>;

// Edge kinds that drive computation — these form the DAG checked for cycles and
// used for orphan/consumption analysis. `explains` is intentionally excluded.
export const DRIVING_EDGE_KINDS: readonly LogicEdgeKind[] = ["feeds", "serves", "triggers"];

// Node ids must carry a stable kind prefix (input_/formula_/score_/judgment_/signal_).
const NODE_ID_RE = /^(input|formula|score|judgment|signal)_[a-z0-9_]+$/;

export const LogicNode = z
  .object({
    id: z.string().regex(NODE_ID_RE, {
      message:
        "node id must use a stable prefix: input_/formula_/score_/judgment_/signal_",
    }),
    kind: LogicNodeKind,
    role: LogicNodeRole,
    label: z.string().min(1),
    expr: z.string().optional(),
  })
  .strict();
export type LogicNode = z.infer<typeof LogicNode>;

export const LogicEdge = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    kind: LogicEdgeKind,
  })
  .strict();
export type LogicEdge = z.infer<typeof LogicEdge>;

export const LogicGraph = z
  .object({
    nodes: z.array(LogicNode),
    edges: z.array(LogicEdge),
  })
  .strict();
export type LogicGraph = z.infer<typeof LogicGraph>;
