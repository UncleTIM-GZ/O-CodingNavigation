import type { BilingualMessage } from "../../types/i18n.js";
import type { LogicGraph } from "../../types/logic-backbone.js";
import { parseLogicBackbone } from "../artifact/logic-backbone-parser.js";
import { msg } from "../i18n.js";
import {
  describeIssue,
  validateLogicBackbone,
  type LogicBackboneIssue,
} from "./logic-backbone-validator.js";

// Pure orchestration over the logic-backbone parser + validator. Given the
// artifact markdown, returns whether the embedded graph is present, parseable,
// and well-wired — plus a bilingual, per-defect message and the validated
// graph (for projection). No IO; the gate runner handles persistence + audit.

export interface LogicBackboneGateOutcome {
  readonly ok: boolean;
  readonly message: BilingualMessage;
  readonly blockingReasons?: readonly string[];
  readonly issues?: readonly LogicBackboneIssue[];
  readonly graph?: LogicGraph;
}

export function evaluateLogicBackbone(content: string): LogicBackboneGateOutcome {
  const parsed = parseLogicBackbone(content);

  if (!parsed.found) {
    return {
      ok: false,
      blockingReasons: ["logic_backbone_graph_missing"],
      message: msg(
        "Logic backbone has no graph block (expected a fenced `ocn-logic-graph` block).",
        "逻辑主干缺少图代码块（需要一个 ` ```ocn-logic-graph ` 围栏块）。",
      ),
    };
  }

  if (parsed.errors.length > 0 || parsed.graph === null) {
    const detail = parsed.errors.join("; ");
    return {
      ok: false,
      blockingReasons: ["logic_backbone_graph_invalid"],
      message: msg(
        `Logic backbone graph is invalid: ${detail}`,
        `逻辑主干图不合法：${detail}`,
      ),
    };
  }

  const validation = validateLogicBackbone(parsed.graph);
  if (validation.status === "blocked") {
    const en = validation.issues.map((i) => describeIssue(i).en).join("; ");
    const zh = validation.issues.map((i) => describeIssue(i).zh).join("；");
    return {
      ok: false,
      blockingReasons: ["logic_backbone_unwired"],
      issues: validation.issues,
      message: msg(`Logic backbone is not fully wired: ${en}`, `逻辑主干接线不完整：${zh}`),
    };
  }

  return {
    ok: true,
    graph: parsed.graph,
    message: msg("Logic backbone validated.", "逻辑主干校验通过。"),
  };
}
