import type { CommandResult } from "../../types/result.js";
import type { StateId } from "../../types/state.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { loadSopProfile } from "../sop/loader.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
} from "../state/state-store.js";

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

const AI_GOVERNANCE_REMINDER =
  "AI must NOT mark a blocked artifact as complete. AI must NOT advance project state. " +
  "AI must NOT mutate .ocoding/state.json directly. AI must NOT modify SOP profile content " +
  "without an explicit Decision Log entry.";

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
  lines.push(`AI Governance Reminder: ${AI_GOVERNANCE_REMINDER}`);
  lines.push("");
  lines.push(`Uncertainty Policy: ${UNCERTAINTY_POLICY}`);
  lines.push("");
  lines.push("Next actions:");
  if (args.artifactPath !== null) {
    lines.push(
      `1. If the file does not exist, create it via \`ocn doc create <type>\` or \`navigator.create_artifact\`.`,
    );
    lines.push(`2. Edit ${args.artifactPath} to fill every required section above.`);
    lines.push(`3. Run \`ocn gate\` (or \`navigator.run_gate\`) to verify.`);
    lines.push(`4. Run \`ocn advance\` once the gate passes (CLI-only — MCP cannot advance).`);
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

    const data: NextPromptData = {
      targetStateId: state.currentStateId,
      targetStepId: state.currentStepId,
      ...(artifactPath !== null ? { targetArtifactPath: artifactPath } : {}),
      requiredSections: requiredCanonical,
      instruction: buildInstruction({
        stepId: state.currentStepId,
        artifactPath,
        requiredCanonical,
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
