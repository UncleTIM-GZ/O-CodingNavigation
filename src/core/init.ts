import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../types/result.js";
import type { ProjectState, Tier } from "../types/state.js";
import { Paths } from "./paths.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { LockTimeoutError, withLock } from "./state/lock.js";
import { writeStateUnlocked } from "./state/state-store.js";
import { loadSopProfile, loadSopProfileByVersion, type SopProfileVersion } from "./sop/loader.js";
import { writeProfileSnapshots } from "./sop/snapshot.js";
import { createAuditEvent, makeLockAuditHook, safeAudit } from "./audit/index.js";

export interface InitOptions {
  readonly cwd: string;
  readonly tier?: Tier;
  readonly projectName?: string;
  readonly projectId?: string;
  /** AM-004 — explicit profile pin (e.g. "0.4.0" for readiness dogfood);
   *  defaults to the runtime default profile. */
  readonly sopVersion?: SopProfileVersion;
}

export interface InitData {
  readonly stateFile: string;
  readonly sopFile: string;
  readonly gatesFile: string;
  /** P1-003 — added so callers can surface the persisted artifacts manifest. */
  readonly artifactsFile: string;
  readonly configFile: string;
  readonly docsDir: string;
  readonly currentStateId: string;
  readonly currentStepId: string;
  readonly tier: Tier;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

// PR #2 — TOCTOU fix per state-safety plan §3:
//   1. mkdir .ocoding/ (idempotent — no race even concurrent)
//   2. acquire lock at .ocoding/.lock
//   3. inside lock: check if state.json exists → blocked if yes
//      (state.json existence is the true "initialized" signal; .ocoding/
//       existence is too coarse and would misclassify partial init as done)
//   4. write yamls + state.json (state.json via the atomic protocol)
export async function initProject(opts: InitOptions): Promise<CommandResult<InitData>> {
  const ocodingDir = Paths.ocodingDir(opts.cwd);
  const stateFile = Paths.stateFile(opts.cwd);
  const lockFile = join(ocodingDir, ".lock");

  await fs.mkdir(ocodingDir, { recursive: true });

  const tier: Tier = opts.tier ?? "minimal";
  const profile =
    opts.sopVersion !== undefined ? loadSopProfileByVersion(opts.sopVersion) : loadSopProfile();

  const state: ProjectState = {
    schemaVersion: "1.0",
    project: {
      projectId: opts.projectId ?? "local-project",
      name: opts.projectName ?? "Local OCN Project",
      tier,
      // SOP 0.2.0 PR 4 (DEC-023) — fresh init pins to whatever the runtime
      // default profile is. Flipping the loader (loader.ts) is the single
      // source of truth; init never hardcodes a version literal.
      sopProfileId: profile.id,
      sopProfileVersion: profile.version,
    },
    // PR #4: init starts at the true beginning of the state machine.
    // Replaces the Skeleton Spike simplification of jumping to state_spec / step_prd.
    currentStateId: "state_discovery",
    currentStepId: "step_project_brief",
    artifacts: {},
    latestGateResult: null,
  };

  let alreadyInitialized = false;
  let stateWritten = false;
  const lockHook = makeLockAuditHook({
    projectRoot: opts.cwd,
    command: "init",
    currentStateId: state.currentStateId,
    currentStepId: state.currentStepId,
  });

  try {
    await withLock(
      {
        lockFile,
        command: "init",
        projectRoot: opts.cwd,
        lifecycle: lockHook,
      },
      async () => {
        if (await pathExists(stateFile)) {
          alreadyInitialized = true;
          return;
        }
        await fs.mkdir(Paths.docsDir(opts.cwd), { recursive: true });
        // P1-003 / AM-004 / DEC-029 — the full snapshot surface (sop, gates,
        // artifacts, config, readiness-rules) is rendered by the shared
        // snapshot writer so init and `sop upgrade` cannot drift apart.
        await writeProfileSnapshots(opts.cwd, profile, { configMode: "write" });
        // We already hold the outer lock; use the unlocked variant to avoid
        // a self-acquire deadlock.
        await writeStateUnlocked(opts.cwd, state);
        stateWritten = true;
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

  if (alreadyInitialized) {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg("OCN is already initialized in this directory.", "当前目录已经初始化过 OCN。"),
      { ocodingDir, stateFile },
    );
  }

  // Audit emission AFTER lock release (plan §3.2): never inside the critical
  // section. Best-effort — never affects command success (CLAUDE.md §10).
  if (stateWritten) {
    const createdPaths = [
      stateFile,
      Paths.sopFile(opts.cwd),
      Paths.gatesFile(opts.cwd),
      Paths.artifactsFile(opts.cwd),
      Paths.configFile(opts.cwd),
    ];
    await safeAudit(
      opts.cwd,
      createAuditEvent({
        eventType: "state_write_succeeded",
        result: "success",
        actor: "system",
        source: "core",
        projectRoot: opts.cwd,
        currentStateId: state.currentStateId,
        currentStepId: state.currentStepId,
        command: "init.write-state",
        message: msg(`state.json written at ${stateFile}.`, `已写入 state.json：${stateFile}。`),
        relatedPaths: [stateFile],
      }),
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent({
        eventType: "project_initialized",
        result: "success",
        actor: "user",
        source: "cli",
        projectRoot: opts.cwd,
        currentStateId: state.currentStateId,
        currentStepId: state.currentStepId,
        command: "init",
        message: msg("OCN project initialized.", "OCN 项目已初始化。"),
        relatedPaths: createdPaths,
        data: {
          tier,
          sopProfileId: state.project.sopProfileId,
          sopProfileVersion: state.project.sopProfileVersion,
        },
      }),
    );
  }

  return ok(
    msg(
      `OCN initialized at ${opts.cwd} (tier=${tier}).`,
      `已在 ${opts.cwd} 初始化 OCN（tier=${tier}）。`,
    ),
    {
      stateFile,
      sopFile: Paths.sopFile(opts.cwd),
      gatesFile: Paths.gatesFile(opts.cwd),
      artifactsFile: Paths.artifactsFile(opts.cwd),
      configFile: Paths.configFile(opts.cwd),
      docsDir: Paths.docsDir(opts.cwd),
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      tier,
    },
  );
}
