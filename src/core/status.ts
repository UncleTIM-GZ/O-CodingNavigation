import type { CommandResult } from "../types/result.js";
import type { ProjectState } from "../types/state.js";
import { Paths } from "./paths.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
} from "./state/state-store.js";

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

  const currentArtifactPath = Paths.prdFile(opts.cwd);
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
      nextAction:
        "Edit docs/02-prd.md, then run `ocn check`.",
    },
  );
}
