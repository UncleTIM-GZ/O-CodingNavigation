import { promises as fs } from "node:fs";
import type { CommandResult } from "../../types/result.js";
// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover means the canonical snapshot
// signals must come from the 0.2.0 renderer; otherwise drift detection
// would still measure against the 0.1.0 snapshot shape.
import { canonicalSopSnapshotSignals } from "../../sops/default-ai-coding-sop/0.2.0/render.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { loadSopProfile } from "./loader.js";

export interface DetectSopVersionOptions {
  readonly cwd: string;
}

export type SopSnapshotDriftReason =
  | "snapshot_in_sync"
  | "snapshot_missing"
  | "snapshot_unreadable"
  | "snapshot_legacy";

export interface DetectSopVersionData {
  readonly lockedSopProfileId: string;
  readonly lockedSopProfileVersion: string;
  readonly currentOcnSopProfileVersion: string;
  /** True iff the locked semver version differs from the bundled profile. */
  readonly diffDetected: boolean;
  /** P1-003 — true iff `.ocoding/sop.yaml` is missing canonical signals
   *  (legacy/skeleton snapshot or unreadable). The semver-version match can
   *  return `true` while content has drifted; this surface lets callers
   *  detect that case explicitly. */
  readonly snapshotDriftDetected: boolean;
  readonly snapshotDriftReason: SopSnapshotDriftReason;
}

async function readSnapshotOrNull(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw err;
  }
}

/**
 * P1-003 — assess whether `.ocoding/sop.yaml` matches the canonical rendering
 * for the bundled profile. We don't parse the YAML (the rest of the loader
 * doesn't either today); instead we check that every canonical state id and
 * step id appears in the file. A missing signal indicates a legacy/skeleton
 * snapshot from before P1-003.
 */
async function assessSnapshotDrift(
  cwd: string,
): Promise<{ detected: boolean; reason: SopSnapshotDriftReason }> {
  let raw: string | null;
  try {
    raw = await readSnapshotOrNull(Paths.sopFile(cwd));
  } catch {
    return { detected: true, reason: "snapshot_unreadable" };
  }
  if (raw === null) {
    return { detected: true, reason: "snapshot_missing" };
  }
  const signals = canonicalSopSnapshotSignals();
  for (const signal of signals) {
    if (!raw.includes(signal)) {
      return { detected: true, reason: "snapshot_legacy" };
    }
  }
  return { detected: false, reason: "snapshot_in_sync" };
}

// PR #5 — `navigator.detect_sop_version` MCP tool. Read-only, no audit
// emission (read tool — see plan §10).
// P1-003 extension — also reports whether the persisted .ocoding/sop.yaml
// snapshot is in sync with the canonical rendering.
export async function detectSopVersion(
  opts: DetectSopVersionOptions,
): Promise<CommandResult<DetectSopVersionData>> {
  try {
    const state = await readState(opts.cwd);
    const current = loadSopProfile();
    const lockedVersion = state.project.sopProfileVersion;
    const currentVersion = current.version;
    const drift = await assessSnapshotDrift(opts.cwd);
    const data: DetectSopVersionData = {
      lockedSopProfileId: state.project.sopProfileId,
      lockedSopProfileVersion: lockedVersion,
      currentOcnSopProfileVersion: currentVersion,
      diffDetected: lockedVersion !== currentVersion,
      snapshotDriftDetected: drift.detected,
      snapshotDriftReason: drift.reason,
    };

    let message;
    if (data.diffDetected) {
      message = msg(
        `SOP version diff detected: locked ${lockedVersion}, current ${currentVersion}.`,
        `检测到 SOP 版本差异：锁定版本 ${lockedVersion}，当前内置版本 ${currentVersion}。`,
      );
    } else if (data.snapshotDriftDetected) {
      message = msg(
        `Locked SOP version (${lockedVersion}) matches, but persisted snapshot drift detected (${drift.reason}). Re-run \`ocn init\` in a fresh directory to refresh the snapshot.`,
        `锁定 SOP 版本（${lockedVersion}）一致，但检测到持久化 snapshot 偏差（${drift.reason}）。可在新目录运行 \`ocn init\` 以刷新 snapshot。`,
      );
    } else {
      message = msg(
        `Locked SOP version (${lockedVersion}) matches current.`,
        `锁定 SOP 版本（${lockedVersion}）与当前内置版本一致。`,
      );
    }

    return ok(message, data);
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
