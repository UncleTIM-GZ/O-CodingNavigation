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
export type EvidenceSourceUsed =
  | EvidenceSource
  | "ocn-state"
  | "local-git"
  | "acceptance-map"
  | "verify-status";

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
  /** `ocn stop` — true once the project is terminated (state.json `stoppedAt`
   *  is set). The prompt assembler emits a quiet stopped banner instead of the
   *  workflow objective + automation loop. */
  readonly stopped?: boolean;
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

// MVP 5 (DEC-024 follow-up step 6) — `ocn verify status` payload.
//
// Read-only. Reads `package.json` scripts, local git evidence, OCN state, the
// acceptance evidence map, and (optionally) GitHub PR checks. Summarises
// verification readiness deterministically. No LLM, no mutation, no command
// execution — humans / agents run the listed verification commands.

export type VerifyStatusMode = "local" | "pr" | "combined";

export type VerifyStatusOverall =
  | "ready"
  | "partial"
  | "blocked"
  | "pending"
  | "no-verification-data";

export type VerifyStatusMissingSignal =
  | "no-lint-script"
  | "no-typecheck-script"
  | "no-test-script"
  | "no-build-script"
  | "no-coverage-script"
  | "no-acceptance-criteria"
  | "acceptance-evidence-missing"
  | "pr-checks-unavailable"
  | "pr-not-provided"
  | "local-working-tree-dirty"
  | "checks-pending"
  | "checks-failing";

// Risk flags surfaced in the verification verdict. Combines local-git, evidence-map,
// and github-pr risk-flag universes. Lexicographically sorted at the boundary.
export type VerifyStatusRiskFlag =
  | "working-tree-dirty"
  | "not-a-git-repository"
  | "no-commits"
  | "detached-head"
  | "git-not-found"
  | "acceptance-file-missing"
  | "no-acceptance-criteria"
  | "coverage-partial"
  | "coverage-missing"
  | "human-review-required"
  | "github-evidence-unavailable"
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

// Detected presence of well-known npm scripts that drive verification.
export interface VerifyStatusScriptsPresent {
  readonly lint: boolean;
  readonly typecheck: boolean;
  readonly test: boolean;
  readonly build: boolean;
  readonly coverage: boolean;
  readonly smoke: boolean;
}

export interface VerifyStatusLocalGit {
  readonly branch: string | null;
  readonly head: string | null;
  readonly isDirty: boolean;
  readonly changedFilesCount: number;
  // True when the local cwd is inside a git work tree. Mirrors
  // `LocalGitData.isGitRepo` so downstream consumers can distinguish
  // "no git repo" from "empty repo with no commits" without re-reading git.
  readonly isGitRepo: boolean;
  // Diagnostic reason from the local-git reader (`"git-not-found"`,
  // `"not-a-git-repository"`, `"no-commits"`) or null when the repo is
  // healthy and a HEAD SHA was found.
  readonly gitReason: GitReadReason | null;
}

export interface VerifyStatusLocalEvidence {
  readonly scripts: VerifyStatusScriptsPresent;
  readonly scriptCommands: Readonly<Record<string, string>>;
  readonly git: VerifyStatusLocalGit;
  readonly ocn: ExecStatusOcnData;
}

// Subset of GitHub PR data used by the verifier — kept narrow so the envelope
// stays small and stable.
export interface VerifyStatusPrCheckRecord {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
}

export interface VerifyStatusPr {
  readonly number: number;
  readonly state: string;
  readonly isDraft: boolean;
  readonly mergeable: string | null;
  readonly mergeStateStatus: string | null;
  readonly checksSummary: string;
  readonly passed: number;
  readonly failed: number;
  readonly pending: number;
  readonly items: readonly VerifyStatusPrCheckRecord[];
  readonly reviews: {
    readonly total: number;
    readonly approved: number;
    readonly changesRequested: number;
    readonly commented: number;
  };
}

export interface VerifyStatusAcceptance {
  readonly found: boolean;
  readonly coverageStatus: EvidenceMapCoverageStatus;
  readonly criteriaCount: number;
  readonly covered: number;
  readonly candidate: number;
  readonly missing: number;
  readonly needsHumanReview: number;
}

export interface VerifyStatusVerification {
  readonly status: VerifyStatusOverall;
  readonly readyForReview: boolean;
  readonly requiredCommands: readonly string[];
  readonly missingSignals: readonly VerifyStatusMissingSignal[];
  readonly riskFlags: readonly VerifyStatusRiskFlag[];
  readonly nextSuggestedAction: string;
}

export interface VerifyStatusData {
  readonly command: "verify.status";
  readonly implemented: true;
  readonly noMutation: true;
  readonly mode: VerifyStatusMode;
  readonly evidenceSourcesUsed: readonly EvidenceSourceUsed[];
  readonly local: VerifyStatusLocalEvidence;
  readonly pr: VerifyStatusPr | null;
  readonly acceptance: VerifyStatusAcceptance;
  readonly verification: VerifyStatusVerification;
  readonly warnings: readonly string[];
}

// MVP 6 (DEC-024 follow-up step 7) — `ocn verdict draft` payload.
//
// Read-only orchestrator. Composes existing readers (local git, OCN state,
// acceptance evidence map, verification status, optional GitHub PR) into a
// deterministic evidence-derived verdict draft. No LLM, no mutation, no file
// writes, no command execution — humans decide; the navigator only drafts.

export type VerdictDraftMode = "local" | "pr" | "combined";

export type VerdictDraftCategory =
  | "continue-work"
  | "request-changes"
  | "ready-for-review"
  | "ready-to-merge"
  | "hold-for-manual-review";

export type VerdictDraftConfidence = "low" | "medium" | "high";

// Risk flag universe for the verdict draft. Combines local-git, evidence-map,
// github-pr, and verify-status risk-flag universes. Lexicographically sorted
// at the boundary.
export type VerdictDraftRiskFlag =
  | "working-tree-dirty"
  | "not-a-git-repository"
  | "no-commits"
  | "detached-head"
  | "git-not-found"
  | "ocn-state-unreadable"
  | "acceptance-file-missing"
  | "no-acceptance-criteria"
  | "coverage-partial"
  | "coverage-missing"
  | "human-review-required"
  | "github-evidence-unavailable"
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
  | "package-metadata-changed"
  | "verification-blocked"
  | "verification-partial";

export type VerdictDraftWarning =
  | "github-evidence-unavailable"
  | "pr-checks-unavailable"
  | "no-acceptance-criteria"
  | "no-local-scripts-detected";

// Bilingual summary sentence — one of a small set of deterministic templates.
export interface VerdictDraftSummary {
  readonly en: string;
  readonly zh: string;
}

export interface VerdictDraftInputs {
  readonly currentStateId: string | null;
  readonly currentStepId: string | null;
  readonly verificationStatus: VerifyStatusOverall;
  readonly acceptanceCoverageStatus: EvidenceMapCoverageStatus;
  readonly gitStatus: "clean" | "dirty" | "no-git" | "empty-repo";
  readonly branch: string | null;
  readonly head: string | null;
  readonly prState: string | null;
  readonly prChecksSummary: string | null;
}

export interface VerdictDraftVerdict {
  readonly category: VerdictDraftCategory;
  readonly confidence: VerdictDraftConfidence;
  readonly summary: VerdictDraftSummary;
  readonly supports: readonly string[];
  readonly blocks: readonly string[];
  readonly humanReviewRequired: boolean;
  readonly nextSuggestedAction: string;
}

export interface VerdictDraftData {
  readonly command: "verdict.draft";
  readonly implemented: true;
  readonly noMutation: true;
  readonly mode: VerdictDraftMode;
  readonly evidenceSourcesUsed: readonly EvidenceSourceUsed[];
  readonly verdict: VerdictDraftVerdict;
  readonly inputs: VerdictDraftInputs;
  readonly riskFlags: readonly VerdictDraftRiskFlag[];
  readonly warnings: readonly VerdictDraftWarning[];
}
