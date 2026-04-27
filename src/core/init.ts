import { promises as fs } from "node:fs";
import type { CommandResult } from "../types/result.js";
import type { ProjectState, Tier } from "../types/state.js";
import { Paths } from "./paths.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { writeState } from "./state/state-store.js";
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

export async function initProject(opts: InitOptions): Promise<CommandResult<InitData>> {
  const ocodingDir = Paths.ocodingDir(opts.cwd);

  if (await pathExists(ocodingDir)) {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        "OCN is already initialized in this directory.",
        "当前目录已经初始化过 OCN。",
      ),
      { ocodingDir },
    );
  }

  const tier: Tier = opts.tier ?? "minimal";

  // Skeleton Spike simplification (plan §3.2): jump straight to state_spec / step_prd
  // so the spike can validate PRD detection without implementing full state machine.
  const state: ProjectState = {
    schemaVersion: "1.0",
    project: {
      projectId: opts.projectId ?? "local-project",
      name: opts.projectName ?? "Local OCN Project",
      tier,
      sopProfileId: "default-ai-coding-sop",
      sopProfileVersion: "0.1.0",
    },
    currentStateId: "state_spec",
    currentStepId: "step_prd",
    artifacts: {},
    latestGateResult: null,
  };

  const profile = loadSopProfile();

  await fs.mkdir(ocodingDir, { recursive: true });
  await fs.mkdir(Paths.docsDir(opts.cwd), { recursive: true });
  await fs.writeFile(Paths.sopFile(opts.cwd), profile.sopYaml, "utf8");
  await fs.writeFile(Paths.gatesFile(opts.cwd), profile.gatesYaml, "utf8");
  await fs.writeFile(Paths.configFile(opts.cwd), profile.defaultConfigYaml, "utf8");
  await writeState(opts.cwd, state);

  return ok(
    msg(
      `OCN initialized at ${opts.cwd} (tier=${tier}).`,
      `已在 ${opts.cwd} 初始化 OCN（tier=${tier}）。`,
    ),
    {
      stateFile: Paths.stateFile(opts.cwd),
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
