import { join } from "node:path";
import type { CommandResult } from "../types/result.js";
import type { ProjectState } from "../types/state.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { resolveProfileForProject } from "./sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "./state/state-store.js";

export interface StatusOptions {
  readonly cwd: string;
}

export interface StatusData {
  readonly project: ProjectState["project"];
  readonly currentStateId: string;
  readonly currentStepId: string;
  readonly currentArtifactPath: string;
  readonly nextAction: string;
}

// PR #4 — status uses SOP map for artifact path + next action, replacing the
// PR #1 PRD hardcode.
export async function getStatus(opts: StatusOptions): Promise<CommandResult<StatusData>> {
  let state: ProjectState;
  try {
    state = await readState(opts.cwd);
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

  // Pin-resolved (H-3) — a 0.8.0-pinned project must keep rendering 0.8.0
  // structure once the (still-pending, human-gated) default flip to 0.9.0 lands.
  const profile = resolveProfileForProject(state.project.sopProfileVersion);
  const relativeArtifactPath = profile.artifactPathForStep(state.currentStepId);
  const currentArtifactPath =
    relativeArtifactPath === null ? "" : join(opts.cwd, relativeArtifactPath);

  const nextAction =
    relativeArtifactPath === null
      ? `Step ${state.currentStepId} has no required artifact. Run \`ocn advance\` to proceed.`
      : `Edit ${relativeArtifactPath}, run \`ocn gate\` to verify, then \`ocn advance\` once it passes.`;

  return ok(
    msg(
      `OCN ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
      `OCN ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
    ),
    {
      project: state.project,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      currentArtifactPath,
      nextAction,
    },
  );
}
