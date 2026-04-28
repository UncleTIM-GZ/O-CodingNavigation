import type { CommandResult } from "../../types/result.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
} from "../state/state-store.js";
import { loadSopProfile } from "./loader.js";

export interface DetectSopVersionOptions {
  readonly cwd: string;
}

export interface DetectSopVersionData {
  readonly lockedSopProfileId: string;
  readonly lockedSopProfileVersion: string;
  readonly currentOcnSopProfileVersion: string;
  readonly diffDetected: boolean;
}

// PR #5 — `navigator.detect_sop_version` MCP tool. Read-only, no audit
// emission (read tool — see plan §10).
export async function detectSopVersion(
  opts: DetectSopVersionOptions,
): Promise<CommandResult<DetectSopVersionData>> {
  try {
    const state = await readState(opts.cwd);
    const current = loadSopProfile();
    const lockedVersion = state.project.sopProfileVersion;
    const currentVersion = current.version;
    const data: DetectSopVersionData = {
      lockedSopProfileId: state.project.sopProfileId,
      lockedSopProfileVersion: lockedVersion,
      currentOcnSopProfileVersion: currentVersion,
      diffDetected: lockedVersion !== currentVersion,
    };
    return ok(
      data.diffDetected
        ? msg(
            `SOP version diff detected: locked ${lockedVersion}, current ${currentVersion}.`,
            `检测到 SOP 版本差异：锁定版本 ${lockedVersion}，当前内置版本 ${currentVersion}。`,
          )
        : msg(
            `Locked SOP version (${lockedVersion}) matches current.`,
            `锁定 SOP 版本（${lockedVersion}）与当前内置版本一致。`,
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
