import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import type { ProjectState } from "../../types/state.js";
import type { SopProfile } from "../../types/sop.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { LockTimeoutError, withLock } from "../state/lock.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { writeStateUnlocked } from "../state/state-store.js";
import {
  DEFAULT_SOP_PROFILE_VERSION,
  KNOWN_SOP_PROFILE_VERSIONS,
  isKnownSopProfileVersion,
  loadSopProfileByVersion,
} from "./loader.js";
import { profileOwnedSnapshotPaths, writeProfileSnapshots } from "./snapshot.js";

// DEC-029 / AM-005 — `ocn sop upgrade`: move an initialized project's pinned
// SOP profile forward to a newer bundled version. Forward-only, CLI-only
// (never exposed over MCP — §4.8, same class as advance). The stable string
// IDs (§4.1) are what make this safe: progress is positional
// (currentStateId/currentStepId + artifacts), so an upgrade only has to keep
// the cursor valid and re-render the profile-owned snapshots. config.yaml is
// user-owned after init and is preserved.

export interface UpgradeSopOptions {
  readonly cwd: string;
  /** Defaults to the runtime default profile version. */
  readonly targetVersion?: string;
  /** Dry-run: validate and report, write nothing. */
  readonly plan?: boolean;
}

export interface SopUpgradeData {
  readonly command: "sop.upgrade";
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly planOnly: boolean;
  readonly applied: boolean;
  /** Snapshot files rewritten (apply) or that would be rewritten (plan). */
  readonly snapshotFiles: readonly string[];
  readonly currentStateId: string;
  readonly currentStepId: string;
}

type Validation =
  | { readonly kind: "blocked" | "noop"; readonly result: CommandResult<SopUpgradeData> }
  | { readonly kind: "proceed"; readonly profile: SopProfile };

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function upgradeData(
  state: ProjectState,
  toVersion: string,
  flags: { planOnly: boolean; applied: boolean; snapshotFiles: readonly string[] },
): SopUpgradeData {
  return {
    command: "sop.upgrade",
    fromVersion: state.project.sopProfileVersion,
    toVersion,
    planOnly: flags.planOnly,
    applied: flags.applied,
    snapshotFiles: flags.snapshotFiles,
    currentStateId: state.currentStateId,
    currentStepId: state.currentStepId,
  };
}

/** Positional-cursor compatibility (DEC-029): the current state/step ids must
 *  exist in the target profile. Steps added after the cursor become pending;
 *  steps added before it are treated as already passed. */
function missingCursorId(profile: SopProfile, state: ProjectState): string | null {
  if (!profile.stateOrder.includes(state.currentStateId)) return state.currentStateId;
  if (!profile.stepsForState(state.currentStateId).includes(state.currentStepId)) {
    return state.currentStepId;
  }
  return null;
}

function validateUpgrade(state: ProjectState, targetVersion: string): Validation {
  const pinned = state.project.sopProfileVersion;
  if (!isKnownSopProfileVersion(targetVersion)) {
    return {
      kind: "blocked",
      result: blocked(
        "ERR_SOP_VERSION",
        msg(
          `Unknown SOP profile version "${targetVersion}". Known versions: ${KNOWN_SOP_PROFILE_VERSIONS.join(", ")}.`,
          `未知 SOP profile 版本 "${targetVersion}"。可用版本：${KNOWN_SOP_PROFILE_VERSIONS.join(", ")}。`,
        ),
      ),
    };
  }
  if (targetVersion === pinned) {
    return {
      kind: "noop",
      result: ok(
        msg(
          `Project is already pinned to SOP ${pinned}; nothing to upgrade.`,
          `项目已锁定 SOP ${pinned}，无需升级。`,
        ),
        upgradeData(state, targetVersion, { planOnly: false, applied: false, snapshotFiles: [] }),
      ),
    };
  }
  if (compareSemver(targetVersion, pinned) < 0) {
    return {
      kind: "blocked",
      result: blocked(
        "ERR_SOP_VERSION",
        msg(
          `Downgrade ${pinned} → ${targetVersion} is not supported (forward-only). Initialize a fresh directory with \`ocn init --sop-version ${targetVersion}\` instead.`,
          `不支持降级 ${pinned} → ${targetVersion}（仅支持向前升级）。如需旧版本，请在新目录运行 \`ocn init --sop-version ${targetVersion}\`。`,
        ),
      ),
    };
  }
  const profile = loadSopProfileByVersion(targetVersion);
  const missingId = missingCursorId(profile, state);
  if (missingId !== null) {
    return {
      kind: "blocked",
      result: blocked(
        "ERR_SOP_VERSION",
        msg(
          `Cannot upgrade: current position "${missingId}" does not exist in SOP ${targetVersion}.`,
          `无法升级：当前位置 "${missingId}" 在 SOP ${targetVersion} 中不存在。`,
        ),
      ),
    };
  }
  return { kind: "proceed", profile };
}

function stateReadBlocked(err: unknown): CommandResult<SopUpgradeData> {
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

async function planUpgrade(
  cwd: string,
  state: ProjectState,
  profile: SopProfile,
): Promise<CommandResult<SopUpgradeData>> {
  const paths = profileOwnedSnapshotPaths(cwd, profile);
  // Contract §23.5 — plan mode audits only when a diff is detected (which is
  // always true here: same-version requests no-op before this point).
  await safeAudit(
    cwd,
    createAuditEvent({
      eventType: "sop_version_diff_detected",
      result: "detected",
      actor: "user",
      source: "cli",
      projectRoot: cwd,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      command: "sop.upgrade --plan",
      message: msg(
        `Upgrade plan: SOP ${state.project.sopProfileVersion} → ${profile.version}.`,
        `升级计划：SOP ${state.project.sopProfileVersion} → ${profile.version}。`,
      ),
      data: { fromVersion: state.project.sopProfileVersion, toVersion: profile.version },
    }),
  );
  return ok(
    msg(
      `Upgrade plan: SOP ${state.project.sopProfileVersion} → ${profile.version}. ${paths.length} snapshot file(s) would be rewritten (config.yaml preserved); state pin would move to ${profile.version}. Re-run without --plan to apply.`,
      `升级计划：SOP ${state.project.sopProfileVersion} → ${profile.version}。将重写 ${paths.length} 个快照文件（保留 config.yaml），state 锁定版本将更新为 ${profile.version}。去掉 --plan 重新运行即可执行。`,
    ),
    upgradeData(state, profile.version, { planOnly: true, applied: false, snapshotFiles: paths }),
  );
}

async function applyUpgrade(
  cwd: string,
  preState: ProjectState,
  targetVersion: string,
): Promise<CommandResult<SopUpgradeData>> {
  const lockFile = join(Paths.ocodingDir(cwd), ".lock");
  const lockHook = makeLockAuditHook({
    projectRoot: cwd,
    command: "sop.upgrade",
    currentStateId: preState.currentStateId,
    currentStepId: preState.currentStepId,
  });
  let outcome: CommandResult<SopUpgradeData> | null = null;
  try {
    await withLock(
      { lockFile, command: "sop.upgrade", projectRoot: cwd, lifecycle: lockHook },
      async () => {
        outcome = await applyUpgradeLocked(cwd, targetVersion);
      },
    );
  } catch (err) {
    if (err instanceof LockTimeoutError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          "Could not acquire OCN lock. Another OCN process may be running in this directory.",
          "无法获取 OCN 锁，可能有其他 OCN 进程正在使用此目录。",
        ),
        { lockFile: err.lockFile, waitedMs: err.waitedMs },
      );
    }
    throw err;
  }
  // TS cannot see the closure assignment above — re-widen explicitly.
  const result = outcome as CommandResult<SopUpgradeData> | null;
  if (result === null) {
    throw new Error("sop.upgrade critical section completed without a result");
  }
  // Audit emission AFTER lock release — never inside the critical section.
  if (result.ok && result.data !== undefined && result.data.applied) {
    await auditUpgraded(cwd, result.data);
  }
  return result;
}

/** Critical section: re-read + re-validate under the lock (TOCTOU guard),
 *  then rewrite snapshots and move the pin atomically. */
async function applyUpgradeLocked(
  cwd: string,
  targetVersion: string,
): Promise<CommandResult<SopUpgradeData>> {
  let state: ProjectState;
  try {
    state = await readState(cwd);
  } catch (err) {
    return stateReadBlocked(err);
  }
  const validation = validateUpgrade(state, targetVersion);
  if (validation.kind !== "proceed") return validation.result;
  const profile = validation.profile;
  const written = await writeProfileSnapshots(cwd, profile, { configMode: "preserve" });
  const nextState: ProjectState = {
    ...state,
    project: {
      ...state.project,
      sopProfileId: profile.id,
      sopProfileVersion: profile.version,
    },
  };
  await writeStateUnlocked(cwd, nextState);
  return ok(
    msg(
      `SOP upgraded ${state.project.sopProfileVersion} → ${profile.version}: snapshots refreshed, state pin updated (config.yaml preserved).`,
      `SOP 已从 ${state.project.sopProfileVersion} 升级到 ${profile.version}：快照已刷新，state 锁定版本已更新（保留 config.yaml）。`,
    ),
    upgradeData(state, profile.version, { planOnly: false, applied: true, snapshotFiles: written }),
  );
}

async function auditUpgraded(cwd: string, data: SopUpgradeData): Promise<void> {
  await safeAudit(
    cwd,
    createAuditEvent({
      eventType: "sop_upgraded",
      result: "success",
      actor: "user",
      source: "cli",
      projectRoot: cwd,
      currentStateId: data.currentStateId,
      currentStepId: data.currentStepId,
      command: "sop.upgrade",
      message: msg(
        `SOP profile upgraded ${data.fromVersion} → ${data.toVersion}.`,
        `SOP profile 已从 ${data.fromVersion} 升级到 ${data.toVersion}。`,
      ),
      relatedPaths: [Paths.stateFile(cwd), ...data.snapshotFiles],
      data: { fromVersion: data.fromVersion, toVersion: data.toVersion },
    }),
  );
}

export async function upgradeSopProfile(
  opts: UpgradeSopOptions,
): Promise<CommandResult<SopUpgradeData>> {
  const targetVersion = opts.targetVersion ?? DEFAULT_SOP_PROFILE_VERSION;
  let state: ProjectState;
  try {
    state = await readState(opts.cwd);
  } catch (err) {
    return stateReadBlocked(err);
  }
  const validation = validateUpgrade(state, targetVersion);
  if (validation.kind !== "proceed") return validation.result;
  if (opts.plan === true) return planUpgrade(opts.cwd, state, validation.profile);
  return applyUpgrade(opts.cwd, state, targetVersion);
}
