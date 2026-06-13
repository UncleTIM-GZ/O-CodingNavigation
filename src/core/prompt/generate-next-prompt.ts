import type { CommandResult } from "../../types/result.js";
import type { StateId } from "../../types/state.js";
import { phaseOfState } from "../automation/authorization.js";
import {
  type AutomationStatusView,
  governanceReminder,
  loadAutomationStatus,
} from "../automation/governance-text.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { loadSopProfile } from "../sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";

export interface GenerateNextPromptOptions {
  readonly cwd: string;
}

export interface NextPromptData {
  readonly targetStateId: StateId;
  readonly targetStepId: string;
  readonly targetArtifactPath?: string;
  readonly requiredSections: readonly string[];
  readonly instruction: string;
}

const UNCERTAINTY_POLICY =
  'If data is insufficient, AI must explicitly state "数据不足" or "需要人工确认" ' +
  "rather than guess. Never fabricate facts about state, artifacts, or gate results.";

const SELF_CHECK_RULE =
  "Step Artifact Gate Self-check: confirm every required section above is present " +
  "with non-trivial content. Do NOT mark a blocked artifact as complete.";

function buildInstruction(args: {
  readonly stepId: string;
  readonly artifactPath: string | null;
  readonly requiredCanonical: readonly string[];
  readonly automation: AutomationStatusView;
  /** True when the human delegated the advance out of this step (AM-009). */
  readonly autoAdvanceDelegated: boolean;
}): string {
  const lines: string[] = [];
  lines.push(`# Next-step prompt for ${args.stepId}`);
  lines.push("");
  if (args.artifactPath !== null) {
    lines.push(`Current artifact: ${args.artifactPath}`);
  } else {
    lines.push("This step has no required artifact in the current SOP profile.");
  }
  lines.push("");
  if (args.requiredCanonical.length > 0) {
    lines.push("Required sections (each must appear as an H2 or H3 with non-empty body):");
    for (const s of args.requiredCanonical) lines.push(`- ${s}`);
  } else {
    lines.push("No required sections for this step.");
  }
  lines.push("");
  lines.push(`Self-check rule: ${SELF_CHECK_RULE}`);
  lines.push("");
  lines.push(`AI Governance Reminder: ${governanceReminder(args.automation)}`);
  lines.push("");
  lines.push(`Uncertainty Policy: ${UNCERTAINTY_POLICY}`);
  lines.push("");
  lines.push("Next actions:");
  const advanceLine = args.autoAdvanceDelegated
    ? 'Auto mode is ON — once the gate passes, run `OCN_ACTOR=ai_agent ocn advance --rationale "<背景/依据/操作>"` yourself (CLI), then regenerate the next prompt and continue. Circuit breaker and human-only zones still apply.'
    : "Run `ocn advance` once the gate passes (CLI-only — MCP cannot advance).";
  if (args.artifactPath !== null) {
    lines.push(
      `1. If the file does not exist, create it via \`ocn doc create <type>\` or \`navigator.create_artifact\`.`,
    );
    lines.push(`2. Edit ${args.artifactPath} to fill every required section above.`);
    lines.push(`3. Run \`ocn gate\` (or \`navigator.run_gate\`) to verify.`);
    lines.push(`4. ${advanceLine}`);
  } else if (args.autoAdvanceDelegated) {
    lines.push(`1. ${advanceLine}`);
  } else {
    lines.push("1. Run `ocn advance` to leave this step (CLI-only — MCP cannot advance).");
  }
  return lines.join("\n");
}

export async function generateNextPrompt(
  opts: GenerateNextPromptOptions,
): Promise<CommandResult<NextPromptData>> {
  try {
    const state = await readState(opts.cwd);
    const profile = loadSopProfile();
    const required = profile.requiredSectionsForStep(state.currentStepId);
    const artifactPath = profile.artifactPathForStep(state.currentStepId);
    const requiredCanonical = required.map((r) => r.canonical);

    // AM-009 — delegation follows the advance TARGET's phase.
    const automation = await loadAutomationStatus(opts.cwd);
    const next = profile.nextStep(state.currentStateId, state.currentStepId);
    const targetPhase = next === null ? null : phaseOfState(next.stateId);
    const autoAdvanceDelegated =
      !automation.suspended &&
      targetPhase !== null &&
      (targetPhase === "phase1" ? automation.phase1 : automation.phase2);

    const data: NextPromptData = {
      targetStateId: state.currentStateId,
      targetStepId: state.currentStepId,
      ...(artifactPath !== null ? { targetArtifactPath: artifactPath } : {}),
      requiredSections: requiredCanonical,
      instruction: buildInstruction({
        stepId: state.currentStepId,
        artifactPath,
        requiredCanonical,
        automation,
        autoAdvanceDelegated,
      }),
    };

    return ok(
      msg(
        `Generated next-step prompt for ${state.currentStateId} / ${state.currentStepId}.`,
        `已为 ${state.currentStateId} / ${state.currentStepId} 生成下一步提示。`,
      ),
      data,
    );
  } catch (err) {
    if (err instanceof StateNotFoundError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          "OCN is not initialized in this directory. Run `ocn init` first.",
          "当前目录未初始化 OCN，请先执行 `ocn init`。",
        ),
      );
    }
    if (err instanceof StateInvalidError) {
      return blocked(
        "ERR_STATE_MACHINE",
        msg("state.json is invalid.", "state.json 内容不合法。"),
        undefined,
        err.issues,
      );
    }
    throw err;
  }
}
