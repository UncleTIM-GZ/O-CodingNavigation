import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../types/result.js";
import type { ProjectState, Tier } from "../types/state.js";
import { Paths } from "./paths.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { LockTimeoutError, withLock } from "./state/lock.js";
import { writeStateUnlocked } from "./state/state-store.js";
import { loadSopProfile } from "./sop/loader.js";

export interface InitOptions {
  readonly cwd: string;
  readonly tier?: Tier;
  readonly projectName?: string;
  readonly projectId?: string;
}

export interface InitData {
  readonly stateFile: string;
  readonly sopFile: string;
  readonly gatesFile: string;
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
  const profile = loadSopProfile();

  const state: ProjectState = {
    schemaVersion: "1.0",
    project: {
      projectId: opts.projectId ?? "local-project",
      name: opts.projectName ?? "Local OCN Project",
      tier,
      sopProfileId: "default-ai-coding-sop",
      sopProfileVersion: "0.1.0",
    },
    // Skeleton Spike simplification (plan §3.2): jump straight to state_spec / step_prd.
    // Phase 2 PR #4 will introduce the full DISCOVERY → SPEC progression.
    currentStateId: "state_spec",
    currentStepId: "step_prd",
    artifacts: {},
    latestGateResult: null,
  };

  let alreadyInitialized = false;
  try {
    await withLock(
      {
        lockFile,
        command: "init",
        projectRoot: opts.cwd,
      },
      async () => {
        if (await pathExists(stateFile)) {
          alreadyInitialized = true;
          return;
        }
        await fs.mkdir(Paths.docsDir(opts.cwd), { recursive: true });
        await fs.writeFile(Paths.sopFile(opts.cwd), profile.sopYaml, "utf8");
        await fs.writeFile(Paths.gatesFile(opts.cwd), profile.gatesYaml, "utf8");
        await fs.writeFile(Paths.configFile(opts.cwd), profile.defaultConfigYaml, "utf8");
        // We already hold the outer lock; use the unlocked variant to avoid
        // a self-acquire deadlock.
        await writeStateUnlocked(opts.cwd, state);
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
      msg(
        "OCN is already initialized in this directory.",
        "当前目录已经初始化过 OCN。",
      ),
      { ocodingDir, stateFile },
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
      configFile: Paths.configFile(opts.cwd),
      docsDir: Paths.docsDir(opts.cwd),
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      tier,
    },
  );
}
