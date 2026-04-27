import { promises as fs } from "node:fs";
import type { CommandResult } from "../types/result.js";
import type { ProjectState } from "../types/state.js";
import { Paths } from "./paths.js";
import { computeArtifactGateStatus } from "./artifact/gate-status.js";
import { parseHeadings } from "./artifact/markdown-parser.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { loadSopProfile } from "./sop/loader.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
} from "./state/state-store.js";

export interface BriefOptions {
  readonly cwd: string;
}

export interface BriefData {
  readonly project: ProjectState["project"];
  readonly currentStateId: string;
  readonly currentStepId: string;
  readonly currentArtifactPath: string;
  readonly currentArtifactStatus: "pass" | "warning" | "blocked" | "missing";
  readonly currentObjective: string;
  readonly currentBlockers: readonly string[];
  readonly nextActions: readonly string[];
  readonly aiGovernanceReminder: string;
  readonly uncertaintyPolicy: string;
}

const AI_GOVERNANCE_REMINDER =
  "AI must NOT mark a blocked artifact as complete. AI must NOT advance project state. " +
  "AI must NOT mutate .ocoding/state.json directly. AI must NOT modify SOP profile content " +
  "without an explicit Decision Log entry.";

const UNCERTAINTY_POLICY =
  "If data is insufficient, AI must explicitly state \"数据不足\" or \"需要人工确认\" " +
  "rather than guess. Never fabricate facts about state, artifacts, or gate results.";

export async function generateBrief(opts: BriefOptions): Promise<CommandResult<BriefData>> {
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

  const artifactPath = Paths.prdFile(opts.cwd);
  const profile = loadSopProfile();
  const required = profile.requiredSectionsForStep(state.currentStepId);

  let artifactStatus: BriefData["currentArtifactStatus"] = "missing";
  let blockers: readonly string[] = required.map((r) => r.id);
  try {
    const content = await fs.readFile(artifactPath, "utf8");
    const headings = parseHeadings(content);
    const gate = computeArtifactGateStatus({ artifactPath, headings, required });
    artifactStatus = gate.status;
    blockers = gate.missingRequiredSectionIds;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // file missing → already initialized as "missing" + all required sections as blockers
  }

  return ok(
    msg(
      `Brief for ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
      `项目简报 ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
    ),
    {
      project: state.project,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      currentArtifactPath: artifactPath,
      currentArtifactStatus: artifactStatus,
      currentObjective:
        "Produce a PRD that passes the Step Artifact Gate (required sections present).",
      currentBlockers: blockers,
      nextActions: [
        "Edit docs/02-prd.md to fill all required sections.",
        "Run `ocn check` to verify the artifact gate.",
        "Re-run `ocn brief` to confirm context resumption for the next AI session.",
      ],
      aiGovernanceReminder: AI_GOVERNANCE_REMINDER,
      uncertaintyPolicy: UNCERTAINTY_POLICY,
    },
  );
}
