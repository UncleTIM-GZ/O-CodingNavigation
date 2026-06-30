import type { AutomationConfig, AutomationRuntime } from "../../types/automation.js";
import type { BilingualMessage } from "../../types/i18n.js";
import { msg } from "../i18n.js";

// AM-009 / DEC-034 — what may an ai_agent caller do, given the human's
// automation grant? Pure decision functions: null = authorized, AiRefusal =
// refuse with a stable machine reason (rendered as exit 4 at the CLI).
//
// Phase ownership follows the advance TARGET state, so the PLAN→BUILD
// boundary advance belongs to phase 2 with zero special-casing. ship/reflect
// are never delegable. Rewind is delegable in exactly ONE shape — the
// milestone-loop rewind (Owner ruling 2026-06-13): multi-P build plans need
// the cursor pulled back to step_build_plan between milestones, from
// BUILD/VERIFY only. Every other rewind target stays human-only.

export type AutomationPhase = "phase1" | "phase2";

const PHASE1_STATES: ReadonlySet<string> = new Set([
  "state_discovery",
  "state_spec",
  "state_design",
  "state_plan",
]);
const PHASE2_STATES: ReadonlySet<string> = new Set(["state_build", "state_verify"]);

export const MILESTONE_REWIND_TARGET = "step_build_plan";

export function phaseOfState(stateId: string): AutomationPhase | null {
  if (PHASE1_STATES.has(stateId)) return "phase1";
  if (PHASE2_STATES.has(stateId)) return "phase2";
  return null;
}

export interface AiRefusal {
  readonly reason:
    | "automation_not_enabled"
    | "automation_suspended"
    | "automation_rationale_required"
    | "automation_rewind_target_restricted";
  readonly message: BilingualMessage;
}

export interface AiAuthContext {
  readonly config: AutomationConfig;
  readonly runtime: AutomationRuntime;
  /** The AI's decision trace: background / evidence / action. Mandatory. */
  readonly rationale?: string;
}

function commonRefusal(ctx: AiAuthContext): AiRefusal | null {
  if (ctx.runtime.suspended) {
    return {
      reason: "automation_suspended",
      message: msg(
        "Auto mode is suspended (circuit breaker). A human must run `ocn auto resume`.",
        "自动模式已熔断暂停，需人工执行 `ocn auto resume` 恢复。",
      ),
    };
  }
  if (ctx.rationale === undefined || ctx.rationale.trim().length === 0) {
    return {
      reason: "automation_rationale_required",
      message: msg(
        "Auto mode requires --rationale: state the background, the evidence (gates/verify results), and the action.",
        "自动模式必须提供 --rationale：写明背景、依据（门禁/验收结果）与将执行的操作。",
      ),
    };
  }
  return null;
}

function notEnabled(detail: BilingualMessage): AiRefusal {
  return { reason: "automation_not_enabled", message: detail };
}

function phaseEnabled(config: AutomationConfig, phase: AutomationPhase): boolean {
  return phase === "phase1" ? config.phase1 : config.phase2;
}

/** targetStateId is the advance TARGET (null at the terminal step — let the
 *  state machine's own terminal refusal do the signposting). Enablement is
 *  checked BEFORE suspension/rationale so a manual-mode agent gets the
 *  accurate "not delegated" answer. */
export function authorizeAiAdvance(
  ctx: AiAuthContext,
  targetStateId: string | null,
): AiRefusal | null {
  if (targetStateId !== null) {
    const phase = phaseOfState(targetStateId);
    if (phase === null || !phaseEnabled(ctx.config, phase)) {
      return notEnabled(
        msg(
          `Advance into ${targetStateId} is not delegated to the AI agent — a human must run \`ocn advance --human\` (or \`ocn advance\` in a plain terminal; or delegate with \`ocn auto on --phase 1|2|all\`).`,
          `推进到 ${targetStateId} 未委托给 AI——请人工执行 \`ocn advance --human\`（或在普通终端跑 \`ocn advance\`；或用 \`ocn auto on --phase 1|2|all\` 开启委托）。`,
        ),
      );
    }
  }
  return commonRefusal(ctx);
}

export function authorizeAiTaskCheck(ctx: AiAuthContext, currentStateId: string): AiRefusal | null {
  if (!ctx.config.phase2 || phaseOfState(currentStateId) !== "phase2") {
    return notEnabled(
      msg(
        "`ocn task check` is delegated to the AI agent only with phase-2 auto mode ON and inside BUILD/VERIFY.",
        "`ocn task check` 仅在第二阶段自动模式开启且处于 BUILD/VERIFY 时委托给 AI。",
      ),
    );
  }
  return commonRefusal(ctx);
}

export interface AiRewindRequest {
  readonly fromStateId: string;
  readonly targetStepId: string;
}

export function authorizeAiRewind(ctx: AiAuthContext, req: AiRewindRequest): AiRefusal | null {
  if (!ctx.config.phase2) {
    return notEnabled(
      msg(
        "AI rewind requires phase-2 auto mode — a human must run `ocn rewind`.",
        "AI 回拨需要第二阶段自动模式——否则需人工执行 `ocn rewind`。",
      ),
    );
  }
  if (req.targetStepId !== MILESTONE_REWIND_TARGET || phaseOfState(req.fromStateId) !== "phase2") {
    return {
      reason: "automation_rewind_target_restricted",
      message: msg(
        `AI rewind is restricted to the milestone loop: --to ${MILESTONE_REWIND_TARGET}, launched from BUILD/VERIFY. Any other rewind is human-only.`,
        `AI 回拨仅限里程碑循环：--to ${MILESTONE_REWIND_TARGET}，且只能从 BUILD/VERIFY 发起。其余回拨均为人工专属。`,
      ),
    };
  }
  return commonRefusal(ctx);
}
