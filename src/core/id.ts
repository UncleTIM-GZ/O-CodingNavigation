import { StateId, type StateId as StateIdType } from "../types/state.js";

export const STATE_PREFIX = "state_";
export const STEP_PREFIX = "step_";
export const SECTION_PREFIX = "section_";

export const isStateId = (s: string): s is StateIdType => StateId.safeParse(s).success;
export const isStepId = (s: string): boolean => s.startsWith(STEP_PREFIX);
export const isSectionId = (s: string): boolean => s.startsWith(SECTION_PREFIX);
