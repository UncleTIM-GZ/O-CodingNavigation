// MVP 1 — orchestrator for `ocn exec status` (DEC-024 PR 2).
//
// Produces the full `CommandResult<ExecStatusData>` envelope. Read-only.
// Never mutates project files, the git index, the OCN state file, or any
// `.ocoding/execution` directory.

import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import { readLocalGit } from "./local-git.js";
import { readOcnProjectState } from "./ocn-state-reader.js";
import type {
  EvidenceSourceUsed,
  ExecStatusAnalysis,
  ExecStatusData,
  ExecStatusGitData,
  ExecStatusOcnData,
  ExecStatusOverall,
  ExecStatusRiskFlag,
} from "./types.js";

export interface ExecStatusOptions {
  readonly cwd: string;
}

const HEADLINE = msg("Local execution evidence status collected.", "已收集本地执行证据状态。");

// `ocn-state` is not part of the v1.0 `EvidenceSource` union (which only
// models the eventual external git / github / ci evidence). It is surfaced
// here via the broader `EvidenceSourceUsed` union so the response advertises
// every source this command actually touched at runtime.
const EVIDENCE_SOURCES: readonly EvidenceSourceUsed[] = ["git", "ocn-state"];

function buildAnalysis(git: ExecStatusGitData, ocn: ExecStatusOcnData): ExecStatusAnalysis {
  const riskFlags: ExecStatusRiskFlag[] = [];

  let status: ExecStatusOverall;
  if (!git.isGitRepo) {
    status = "no-git";
    if (git.reason === "git-not-found") {
      riskFlags.push("git-not-found");
    } else {
      riskFlags.push("not-a-git-repository");
    }
  } else if (git.reason === "no-commits") {
    status = "empty-repo";
    riskFlags.push("no-commits");
  } else if (git.isDirty === true) {
    status = "dirty";
    riskFlags.push("working-tree-dirty");
  } else {
    status = "clean";
  }

  if (git.isGitRepo && git.branch === null && git.reason !== "no-commits") {
    riskFlags.push("detached-head");
  }

  if (ocn.isOcnProject && ocn.reason === "state-unreadable") {
    riskFlags.push("ocn-state-unreadable");
  }

  const nextSuggestedAction = pickNextAction(status, riskFlags, ocn);

  return { status, riskFlags, nextSuggestedAction };
}

function pickNextAction(
  status: ExecStatusOverall,
  riskFlags: readonly ExecStatusRiskFlag[],
  ocn: ExecStatusOcnData,
): string {
  if (riskFlags.includes("git-not-found")) {
    return "Install git or run this command in an environment that has git on PATH.";
  }
  if (status === "no-git") {
    return "Initialize a git repository to enable execution evidence.";
  }
  if (status === "empty-repo") {
    return "Make an initial commit so execution evidence has a HEAD anchor.";
  }
  if (status === "dirty") {
    return "Review changed files and run verification before drafting a verdict.";
  }
  if (riskFlags.includes("ocn-state-unreadable")) {
    return "Inspect .ocoding/state.json — it exists but did not parse as a valid project state.";
  }
  if (!ocn.isOcnProject) {
    return "Working tree is clean. Run `ocn init` if you want OCN to track this repo.";
  }
  return "Working tree is clean — proceed with the next planned step.";
}

export async function getExecStatus(
  opts: ExecStatusOptions,
): Promise<CommandResult<ExecStatusData>> {
  const git = await readLocalGit(opts.cwd);
  const ocn = await readOcnProjectState(opts.cwd);
  const analysis = buildAnalysis(git, ocn);

  const data: ExecStatusData = {
    command: "exec.status",
    implemented: true,
    noMutation: true,
    evidenceSourcesUsed: EVIDENCE_SOURCES,
    git,
    ocn,
    analysis,
  };

  return ok(HEADLINE, data);
}
