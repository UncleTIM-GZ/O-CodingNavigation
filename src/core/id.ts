import { StateId, type StateId as StateIdType } from "../types/state.js";

export const STATE_PREFIX = "state_";
export const STEP_PREFIX = "step_";
export const SECTION_PREFIX = "section_";

export const isStateId = (s: string): s is StateIdType => StateId.safeParse(s).success;
export const isStepId = (s: string): boolean => s.startsWith(STEP_PREFIX);
export const isSectionId = (s: string): boolean => s.startsWith(SECTION_PREFIX);

// Logic-backbone node id prefixes (one per LogicNodeKind). Edges are identified
// structurally by (from, to, kind) and carry no id of their own.
export const INPUT_PREFIX = "input_";
export const FORMULA_PREFIX = "formula_";
export const SCORE_PREFIX = "score_";
export const JUDGMENT_PREFIX = "judgment_";
export const SIGNAL_PREFIX = "signal_";

export const LOGIC_NODE_PREFIXES = [
  INPUT_PREFIX,
  FORMULA_PREFIX,
  SCORE_PREFIX,
  JUDGMENT_PREFIX,
  SIGNAL_PREFIX,
] as const;

export const isLogicNodeId = (s: string): boolean =>
  LOGIC_NODE_PREFIXES.some((p) => s.startsWith(p));
