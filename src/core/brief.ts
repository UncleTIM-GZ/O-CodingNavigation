import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../types/result.js";
import type { ProjectState } from "../types/state.js";
import { computeArtifactGateStatus } from "./artifact/gate-status.js";
import { parseHeadings } from "./artifact/markdown-parser.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { loadSopProfile } from "./sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "./state/state-store.js";

export interface BriefOptions {
  readonly cwd: string;
}

export interface BriefData {
  readonly project: ProjectState["project"];
  readonly currentStateId: string;
  readonly currentStepId: string;
  /** Absolute path to the current step's artifact, OR empty when the step has
   *  no required artifact (BUILD/VERIFY/SHIP/REFLECT step stubs in PR #4). */
  readonly currentArtifactPath: string;
  readonly currentArtifactStatus:
    | "pass"
    | "warning"
    | "blocked"
    | "missing"
    | "not_applicable";
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
  'If data is insufficient, AI must explicitly state "数据不足" or "需要人工确认" ' +
  "rather than guess. Never fabricate facts about state, artifacts, or gate results.";

// PR #4 — brief uses the SOP profile to find the current step's artifact +
// required sections, replacing the PR #1 hardcoded PRD path.
export async function generateBrief(
  opts: BriefOptions,
): Promise<CommandResult<BriefData>> {
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

  const profile = loadSopProfile();
  const required = profile.requiredSectionsForStep(state.currentStepId);
  const relativeArtifactPath = profile.artifactPathForStep(state.currentStepId);

  let artifactStatus: BriefData["currentArtifactStatus"];
  let blockers: readonly string[];
  let absoluteArtifactPath = "";

  if (relativeArtifactPath === null) {
    artifactStatus = "not_applicable";
    blockers = [];
  } else {
    absoluteArtifactPath = join(opts.cwd, relativeArtifactPath);
    artifactStatus = "missing";
    blockers = required.map((r) => r.id);
    try {
      const content = await fs.readFile(absoluteArtifactPath, "utf8");
      const headings = parseHeadings(content);
      const gate = computeArtifactGateStatus({
        artifactPath: relativeArtifactPath,
        headings,
        required,
      });
      artifactStatus = gate.status;
      blockers = gate.missingRequiredSectionIds;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // file missing → already initialized to "missing" + all required sections.
    }
  }

  // Derive a CLI hint from the artifact filename (docs/02-prd.md → "prd").
  const docCommand =
    relativeArtifactPath === null
      ? null
      : (() => {
          const match = /\/(?:\d{2}-)?([a-z0-9-]+)\.md$/.exec(relativeArtifactPath);
          return match?.[1] ?? null;
        })();

  const nextActions: readonly string[] =
    relativeArtifactPath === null
      ? [
          "This step has no required artifact in the current SOP profile.",
          "Run `ocn advance` to move to the next step.",
        ]
      : [
          docCommand
            ? `Edit ${relativeArtifactPath} to fill all required sections (run \`ocn doc create ${docCommand}\` for a template).`
            : `Edit ${relativeArtifactPath} to fill all required sections.`,
          "Run `ocn gate` to verify the artifact gate.",
          "Run `ocn advance` once the gate passes.",
        ];

  const objective =
    relativeArtifactPath === null
      ? `Run \`ocn advance\` to leave step ${state.currentStepId}.`
      : `Produce ${relativeArtifactPath} that passes the Step Artifact Gate (required sections present).`;

  return ok(
    msg(
      `Brief for ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
      `项目简报 ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
    ),
    {
      project: state.project,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      currentArtifactPath: absoluteArtifactPath,
      currentArtifactStatus: artifactStatus,
      currentObjective: objective,
      currentBlockers: blockers,
      nextActions,
      aiGovernanceReminder: AI_GOVERNANCE_REMINDER,
      uncertaintyPolicy: UNCERTAINTY_POLICY,
    },
  );
}
