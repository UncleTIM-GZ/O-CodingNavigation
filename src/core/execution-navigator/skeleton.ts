// Execution Navigator skeleton response factory (DEC-024 PR 1).
//
// All six skeleton commands share an identical shape. Each helper here is a
// pure function: no IO, no git/GitHub/CI access, no project-state mutation,
// no `.ocoding/execution` creation. The functions exist to keep command IDs
// and "next implementation" labels in one place rather than duplicated across
// CLI command files.

import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import type {
  EvidenceSource,
  ExecutionNavigatorCommand,
  ExecutionNavigatorSkeletonData,
} from "./types.js";

// Stable, machine-readable label for the next implementation step per
// command. Kept as a frozen lookup so the message used by the CLI matches the
// message used in the report and the upcoming MVP plan.
export const NEXT_IMPLEMENTATION_LABEL: Readonly<
  Record<ExecutionNavigatorCommand, string>
> = Object.freeze({
  "exec.status": "local-git evidence ingestion",
  "github.analyze_pr": "read-only GitHub PR analysis",
  "evidence.map": "acceptance criteria evidence mapping",
  next_prompt: "agent prompt generator",
  "verify.status": "verification status summariser",
  "verdict.draft": "evidence-derived final verdict",
});

// Per-command planned evidence sources. The navigator's eventual read scope
// per command is encoded here so the skeleton does not lie about what each
// command will eventually consume.
export const EVIDENCE_SOURCES_PLANNED: Readonly<
  Record<ExecutionNavigatorCommand, readonly EvidenceSource[]>
> = Object.freeze({
  "exec.status": Object.freeze(["git"]) as readonly EvidenceSource[],
  "github.analyze_pr": Object.freeze(["github"]) as readonly EvidenceSource[],
  "evidence.map": Object.freeze(["git", "github", "ci"]) as readonly EvidenceSource[],
  next_prompt: Object.freeze(["git", "github", "ci"]) as readonly EvidenceSource[],
  "verify.status": Object.freeze(["github", "ci"]) as readonly EvidenceSource[],
  "verdict.draft": Object.freeze(["git", "github", "ci"]) as readonly EvidenceSource[],
});

// Bilingual headline shared by every skeleton response. The headline is
// intentionally identical regardless of command — the per-command meaning is
// carried by `data.command` and `data.nextImplementation`.
const SKELETON_HEADLINE = msg(
  "Execution Navigator command skeleton is available; evidence ingestion is not implemented yet.",
  "Execution Navigator 命令骨架已可用；证据读取尚未实现。",
);

export function buildSkeletonData(
  command: ExecutionNavigatorCommand,
): ExecutionNavigatorSkeletonData {
  return {
    command,
    status: "planned",
    implemented: false,
    evidenceSourcesPlanned: EVIDENCE_SOURCES_PLANNED[command],
    nextImplementation: NEXT_IMPLEMENTATION_LABEL[command],
    noMutation: true,
  };
}

export function skeletonResult(
  command: ExecutionNavigatorCommand,
): CommandResult<ExecutionNavigatorSkeletonData> {
  return ok(SKELETON_HEADLINE, buildSkeletonData(command));
}
