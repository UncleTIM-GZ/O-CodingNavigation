import { loadAutomation } from "./ai-guard.js";

// AM-009 / DEC-034 — the dynamic governance text. Single source of truth for
// brief + both next-prompt generators. Contract: with automation fully off
// the output is BYTE-IDENTICAL to the pre-AM-009 constant (manual mode must
// not drift); with a phase delegated, the "AI must NOT advance" clause is
// replaced by the delegation grant + its standing limits.

export interface AutomationStatusView {
  readonly phase1: boolean;
  readonly phase2: boolean;
  readonly suspended: boolean;
}

export const MANUAL_STATUS: AutomationStatusView = {
  phase1: false,
  phase2: false,
  suspended: false,
};

export async function loadAutomationStatus(cwd: string): Promise<AutomationStatusView> {
  const { config, runtime } = await loadAutomation(cwd);
  return { phase1: config.phase1, phase2: config.phase2, suspended: runtime.suspended };
}

/** Pre-AM-009 text, verbatim — returned untouched in manual mode. */
const MANUAL_REMINDER =
  "AI must NOT mark a blocked artifact as complete. AI must NOT advance project state. " +
  "AI must NOT mutate .ocoding/state.json directly. AI must NOT modify SOP profile content " +
  "without an explicit Decision Log entry.";

function delegationLabel(s: AutomationStatusView): string {
  if (s.phase1 && s.phase2) return "phase 1 (DISCOVERY→PLAN) and phase 2 (BUILD→VERIFY)";
  return s.phase1 ? "phase 1 (DISCOVERY→PLAN)" : "phase 2 (BUILD→VERIFY)";
}

export function governanceReminder(s: AutomationStatusView): string {
  if (!s.phase1 && !s.phase2) return MANUAL_REMINDER;
  const grant =
    `AUTO MODE (AM-009) — the human has delegated ${delegationLabel(s)}: ` +
    "after the FULL gate stack passes, AI MAY run " +
    '`OCN_ACTOR=ai_agent ocn advance --rationale "<背景/依据/操作>"`' +
    (s.phase2
      ? ", `ocn task check --rationale ...` inside BUILD/VERIFY, and the milestone-loop rewind " +
        "`ocn rewind --to step_build_plan --reason ...` (multi-P build plans)"
      : "") +
    ". Judgement is never delegated: gates and frozen verify commands decide, the AI only triggers. " +
    "Still human-only in every mode: readiness waive, cycle new, sop upgrade, advance override, any other rewind, and `ocn auto` itself.";
  const suspension = s.suspended
    ? " CURRENTLY SUSPENDED (circuit breaker tripped) — delegation is paused; ai_agent calls are refused until a human runs `ocn auto resume`."
    : "";
  return (
    "AI must NOT mark a blocked artifact as complete. " +
    "AI must NOT mutate .ocoding/state.json directly. AI must NOT modify SOP profile content " +
    "without an explicit Decision Log entry. " +
    grant +
    suspension
  );
}

/** The self-driving loop block for next-prompt surfaces (active auto mode
 *  only). Machine stop conditions are part of the contract — the AI must
 *  stop on each of them rather than improvise. */
export function automationLoopLines(s: AutomationStatusView): readonly string[] {
  if ((!s.phase1 && !s.phase2) || s.suspended) return [];
  const lines: string[] = [
    "Auto mode is ON — after finishing this step, continue WITHOUT waiting for a human:",
    '1. Run `ocn check`; fix until the gate passes (rationale = background / evidence / action).',
  ];
  if (s.phase2) {
    lines.push(
      "2. In BUILD: `OCN_ACTOR=ai_agent ocn task check --rationale ...` until the ledger is clear.",
      '3. `OCN_ACTOR=ai_agent ocn advance --rationale ...`, then regenerate the next prompt and continue.',
      "4. Milestone loop: when this milestone (P) is verified and the build plan declares more milestones, " +
        "run `OCN_ACTOR=ai_agent ocn rewind --to step_build_plan --reason ...`, append the next P's Task Specs, re-gate, continue.",
    );
  } else {
    lines.push(
      '2. `OCN_ACTOR=ai_agent ocn advance --rationale ...`, then regenerate the next prompt and continue.',
    );
  }
  lines.push(
    "STOP and hand back to the human when: a command is refused (automation_* reason); the circuit breaker suspends; " +
      "the advance target falls outside the delegated phases; the terminal step is reached with no remaining milestones.",
  );
  return lines;
}
