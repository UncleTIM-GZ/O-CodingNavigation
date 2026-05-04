// Execution Navigator command surface (DEC-024).
//
// PR 1 ships a typed command skeleton only — no GitHub API, no git read,
// no CI ingestion, no file creation, no project-state mutation. Each command
// returns a structured "planned / not-implemented-yet" envelope so AI agents
// and humans can discover the navigator surface without it pretending to do
// real evidence work.

// Stable string command IDs. These are part of the public Execution
// Navigator contract (DEC-024) and must not be renamed without a Decision Log
// entry — see CLAUDE.md §4.2.
export type ExecutionNavigatorCommand =
  | "exec.status"
  | "github.analyze_pr"
  | "evidence.map"
  | "next_prompt"
  | "verify.status"
  | "verdict.draft";

// Evidence sources the navigator will eventually read from. v1.0 deliberately
// keeps the universe small and observable.
export type EvidenceSource = "git" | "github" | "ci";

// Evidence sources actually consulted at command-execution time. The MVP 1
// `exec.status` reader also touches `.ocoding/state.json`; that source is
// modelled here (rather than in `EvidenceSource`) because the broader
// "future external evidence" universe stays git/github/ci, while
// `ocn-state` is a local-state probe and not an external evidence stream.
export type EvidenceSourceUsed = EvidenceSource | "ocn-state";

// Skeleton response payload. The shape is stable across all six commands so
// downstream callers (CLI text renderer, MCP server, agents) can branch on a
// single discriminator (`command`) plus a single boolean (`implemented`).
export interface ExecutionNavigatorSkeletonData {
  readonly command: ExecutionNavigatorCommand;
  readonly status: "planned";
  readonly implemented: false;
  readonly evidenceSourcesPlanned: readonly EvidenceSource[];
  readonly nextImplementation: string;
  readonly noMutation: true;
}

// MVP 1 (DEC-024 follow-up step 2) — `ocn exec status` payload.
//
// The shape is a discriminated extension of the skeleton: callers branch on
// `command === "exec.status"` and `implemented === true`. All evidence is
// read-only — see `local-git.ts` and `ocn-state-reader.ts`.

// Reasons a git read returned no evidence. `null` means "not applicable" (the
// repo is healthy and a head SHA was found).
export type GitReadReason = "not-a-git-repository" | "git-not-found" | "no-commits";

// Single recent commit row, parsed defensively from `git log --pretty`.
export interface GitCommitRecord {
  readonly sha: string;
  readonly subject: string;
}

// Local git evidence collected for `ocn exec status`. When `isGitRepo` is
// false, the only other meaningful field is `reason`. When `isGitRepo` is
// true but the repo has no commits, `head` is null and `reason` is
// `"no-commits"`.
export interface ExecStatusGitData {
  readonly isGitRepo: boolean;
  readonly reason?: GitReadReason;
  readonly repoRoot?: string;
  readonly branch?: string | null;
  readonly head?: string | null;
  readonly isDirty?: boolean;
  readonly stagedFiles?: readonly string[];
  readonly unstagedFiles?: readonly string[];
  readonly untrackedFiles?: readonly string[];
  readonly changedFiles?: readonly string[];
  readonly recentCommits?: readonly GitCommitRecord[];
}

// Why an OCN-state read could not produce structured fields.
export type OcnStateReadReason = "state-missing" | "state-unreadable";

// OCN project-state evidence. When `isOcnProject` is false the other fields
// are absent. When `isOcnProject` is true but state.json is malformed the
// reason is `"state-unreadable"` and the structured fields are null.
export interface ExecStatusOcnData {
  readonly isOcnProject: boolean;
  readonly reason?: OcnStateReadReason;
  readonly sopProfileId?: string | null;
  readonly sopProfileVersion?: string | null;
  readonly currentStateId?: string | null;
  readonly currentStepId?: string | null;
}

export type ExecStatusOverall = "clean" | "dirty" | "no-git" | "empty-repo";

export type ExecStatusRiskFlag =
  | "working-tree-dirty"
  | "not-a-git-repository"
  | "no-commits"
  | "detached-head"
  | "git-not-found"
  | "ocn-state-unreadable";

export interface ExecStatusAnalysis {
  readonly status: ExecStatusOverall;
  readonly riskFlags: readonly ExecStatusRiskFlag[];
  readonly nextSuggestedAction: string;
}

export interface ExecStatusData {
  readonly command: "exec.status";
  readonly implemented: true;
  readonly noMutation: true;
  readonly evidenceSourcesUsed: readonly EvidenceSourceUsed[];
  readonly git: ExecStatusGitData;
  readonly ocn: ExecStatusOcnData;
  readonly analysis: ExecStatusAnalysis;
}
