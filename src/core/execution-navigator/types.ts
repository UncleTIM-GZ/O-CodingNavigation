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
// `local-git` is the explicit name MVP 3 uses when surfacing local git as an
// evidence source distinct from the abstract eventual `git` universe.
export type EvidenceSourceUsed = EvidenceSource | "ocn-state" | "local-git" | "acceptance-map";

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

// MVP 2 (DEC-024 follow-up step 3) — `ocn github analyze-pr <number>` payload.
//
// Read-only. All evidence comes from `gh pr view --json ...` plus
// `.ocoding/state.json`. The reader never invokes a `gh` write command and
// never mutates the project, the working tree, or `.ocoding/`.

// Reasons a GitHub PR read could not return structured PR fields. The
// envelope still emits the rest of the payload (with `pr === null`) so
// callers can still see `command`, `prNumber`, and `warnings`.
export type GitHubPrReadReason =
  | "gh-not-found"
  | "gh-auth-required"
  | "pr-not-found"
  | "gh-query-failed";

// Single changed file in a PR. `changeType` is mirrored from gh's enum-ish
// string values (`added` / `modified` / `removed` / `renamed` / `copied`),
// downcased. We default to `"modified"` if gh ever omits the field.
export type PrFileChangeType = "added" | "modified" | "removed" | "renamed" | "copied" | "changed";

export interface PrChangedFile {
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
  readonly changeType: PrFileChangeType;
}

// Single commit on the PR. We only keep `oid` and `messageHeadline`; longer
// commit bodies are discarded to keep the envelope small.
export interface PrCommitRecord {
  readonly oid: string;
  readonly messageHeadline: string;
}

// Single check run row on the PR. `status` and `conclusion` are surfaced
// verbatim from gh (`COMPLETED` / `IN_PROGRESS` / `QUEUED` / `WAITING` /
// `PENDING` for status; `SUCCESS` / `FAILURE` / `CANCELLED` / `TIMED_OUT` /
// `ACTION_REQUIRED` / `STARTUP_FAILURE` / `SKIPPED` / `NEUTRAL` for
// conclusion) so downstream consumers can re-aggregate.
export interface PrCheckRecord {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
}

// Roll-up of `statusCheckRollup`. `summary` collapses the rollup into a
// single enum the analysis layer branches on. `none` means "no checks
// were configured for this PR"; `mixed` is a defensive catch-all.
export type PrChecksSummary = "success" | "failure" | "pending" | "none" | "mixed";

export interface PrChecksData {
  readonly summary: PrChecksSummary;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly pending: number;
  readonly items: readonly PrCheckRecord[];
}

// Roll-up of PR review state. We do not emit individual review records —
// only counts — so the envelope stays small even on PRs with many reviews.
export interface PrReviewsData {
  readonly total: number;
  readonly approved: number;
  readonly changesRequested: number;
  readonly commented: number;
}

// Aggregated change-volume metadata per PR.
export interface PrChangesData {
  readonly changedFiles: number;
  readonly additions: number;
  readonly deletions: number;
  readonly files: readonly PrChangedFile[];
}

// Top-level PR metadata. Author is flattened to the `login` string.
export interface PrMetadata {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly state: string;
  readonly url: string;
  readonly author: string | null;
  readonly headRefName: string | null;
  readonly baseRefName: string | null;
  readonly isDraft: boolean;
  readonly mergeable: string | null;
  readonly mergeStateStatus: string | null;
}

// Resolved navigator status for the analysis layer. Order matches the
// priority list in `github-pr.ts:resolveAnalysisStatus`.
export type GitHubPrAnalysisStatus =
  | "merged"
  | "closed"
  | "draft"
  | "blocked"
  | "pending-ci"
  | "ready-to-review"
  | "needs-human-review";

export type GitHubPrRiskFlag =
  | "draft-pr"
  | "closed-pr"
  | "merge-conflict-or-unclean"
  | "ci-failing"
  | "ci-pending"
  | "no-checks-found"
  | "changes-requested"
  | "no-review-yet"
  | "large-diff"
  | "many-files-changed"
  | "source-change-without-test-change"
  | "test-change-without-source-change"
  | "docs-only-change"
  | "workflow-changed"
  | "package-metadata-changed";

export interface GitHubPrAnalysis {
  readonly status: GitHubPrAnalysisStatus;
  readonly riskFlags: readonly GitHubPrRiskFlag[];
  readonly nextSuggestedAction: string;
}

export interface GitHubPrAnalyzeData {
  readonly command: "github.analyze_pr";
  readonly implemented: true;
  readonly noMutation: true;
  readonly evidenceSourcesUsed: readonly EvidenceSourceUsed[];
  readonly prNumber: number;
  readonly reason?: GitHubPrReadReason;
  readonly pr: PrMetadata | null;
  readonly changes: PrChangesData | null;
  readonly commits: readonly PrCommitRecord[];
  readonly checks: PrChecksData | null;
  readonly reviews: PrReviewsData | null;
  readonly ocn: ExecStatusOcnData;
  readonly analysis: GitHubPrAnalysis | null;
  readonly warnings: readonly string[];
}

// MVP 3 (DEC-024 follow-up step 4) — `ocn evidence map` payload.
//
// Read-only. Reads acceptance criteria from `docs/03-acceptance-criteria.md`,
// local git evidence (always), OCN state (always), and optional GitHub PR
// evidence when `--pr <n>` is provided. Maps each criterion deterministically
// to candidate evidence. No LLM, no mutation, no file writes.

// One acceptance criterion parsed from the AC document.
export interface AcceptanceCriterion {
  // Normalised stable ID, e.g. "AC-001" or "AC-INIT-001". Always uppercase.
  readonly id: string;
  // Original ID as it appeared in the source markdown, before normalisation.
  // Useful for debugging when an `AC-1` was zero-padded to `AC-001`.
  readonly originalId: string | null;
  // The text of the criterion (first matched line, prefix stripped).
  readonly text: string;
  // 1-indexed line number where the criterion was first matched.
  readonly sourceLine: number;
  // True when this ID was auto-generated (no explicit ID in source).
  readonly generatedId: boolean;
  // Optional checked state when the criterion was a checklist item.
  readonly checked?: boolean;
}

// Result of parsing the AC markdown file. `path` is the relative path
// reported back to the caller; `found=false` means the file is missing.
export interface AcceptanceParseResult {
  readonly path: string;
  readonly found: boolean;
  readonly criteriaCount: number;
  readonly criteria: readonly AcceptanceCriterion[];
  readonly warnings: readonly string[];
}

// Evidence map mapping statuses. Order matches the rule priority order in
// `evidence-map.ts`.
export type EvidenceMapStatus =
  | "evidence-found"
  | "evidence-candidate"
  | "missing-evidence"
  | "needs-human-review";

export type EvidenceMapConfidence = "low" | "medium" | "high";

// Evidence sources used to flag a candidate / found row. Stable strings —
// downstream tools may branch on these.
export type EvidenceMapSource =
  | "local-git-file"
  | "local-git-commit"
  | "github-pr-file"
  | "github-pr-commit"
  | "github-pr-title"
  | "github-pr-body"
  | "github-checks";

export interface EvidenceMapEvidence {
  readonly source: EvidenceMapSource;
  readonly ref: string;
  readonly reason: string;
}

export interface EvidenceMapItem {
  readonly criterionId: string;
  readonly criterionText: string;
  readonly status: EvidenceMapStatus;
  readonly confidence: EvidenceMapConfidence;
  readonly humanReviewRequired: boolean;
  readonly evidence: readonly EvidenceMapEvidence[];
  readonly missingEvidence: readonly string[];
}

export type EvidenceMapCoverageStatus =
  | "complete"
  | "partial"
  | "missing"
  | "needs-human-review"
  | "no-acceptance-criteria";

export interface EvidenceMapMappingData {
  readonly coverageStatus: EvidenceMapCoverageStatus;
  readonly covered: number;
  readonly candidate: number;
  readonly missing: number;
  readonly needsHumanReview: number;
  readonly items: readonly EvidenceMapItem[];
}

export type EvidenceMapRiskFlag =
  | "acceptance-file-missing"
  | "no-acceptance-criteria"
  | "coverage-partial"
  | "coverage-missing"
  | "github-evidence-unavailable"
  | "human-review-required"
  | "working-tree-dirty";

export interface EvidenceMapAnalysis {
  readonly riskFlags: readonly EvidenceMapRiskFlag[];
  readonly nextSuggestedAction: string;
}

export interface EvidenceMapData {
  readonly command: "evidence.map";
  readonly implemented: true;
  readonly noMutation: true;
  readonly evidenceSourcesUsed: readonly EvidenceSourceUsed[];
  readonly acceptance: AcceptanceParseResult;
  readonly mapping: EvidenceMapMappingData;
  readonly ocn: ExecStatusOcnData;
  readonly analysis: EvidenceMapAnalysis;
  readonly warnings: readonly string[];
}

// MVP 4 (DEC-024 follow-up step 5) — `ocn next-prompt` payload.
//
// Read-only. Composes existing readers (local git, OCN state, acceptance map,
// optional GitHub PR) into a deterministic agent prompt body. No LLM, no
// network call, no mutation, no file writes.

export type NextPromptAgent = "generic" | "claude-code" | "codex" | "lfg";

export type NextPromptMode = "continue" | "fix" | "verify" | "review";

export type NextPromptRiskFlag =
  | "acceptance-file-missing"
  | "no-acceptance-criteria"
  | "coverage-partial"
  | "coverage-missing"
  | "github-evidence-unavailable"
  | "human-review-required"
  | "working-tree-dirty"
  | "not-a-git-repository"
  | "no-commits"
  | "detached-head"
  | "git-not-found"
  | "ocn-state-unreadable"
  | "ci-failing"
  | "ci-pending"
  | "draft-pr"
  | "merge-conflict-or-unclean";

export interface NextPromptSummary {
  readonly currentStateId: string | null;
  readonly currentStepId: string | null;
  readonly gitStatus: "clean" | "dirty" | "no-git" | "empty-repo";
  readonly branch: string | null;
  readonly head: string | null;
  readonly changedFilesCount: number;
  readonly acceptanceCoverageStatus: EvidenceMapCoverageStatus;
  readonly covered: number;
  readonly candidate: number;
  readonly missing: number;
  readonly needsHumanReview: number;
  readonly riskFlags: readonly NextPromptRiskFlag[];
}

export interface NextPromptData {
  readonly command: "next_prompt";
  readonly implemented: true;
  readonly noMutation: true;
  readonly agent: NextPromptAgent;
  readonly mode: NextPromptMode;
  readonly evidenceSourcesUsed: readonly EvidenceSourceUsed[];
  readonly summary: NextPromptSummary;
  readonly prompt: string;
  readonly warnings: readonly string[];
}
