// MVP 2 — deterministic analysis layer for `ocn github analyze-pr` (DEC-024 PR 3).
//
// All rules are pure functions over already-parsed PR fields. No LLM, no
// network, no IO. The output (`status`, `riskFlags`, `nextSuggestedAction`)
// is fully reproducible from the same input.

import type {
  GitHubPrAnalysis,
  GitHubPrAnalysisStatus,
  GitHubPrRiskFlag,
  PrChangedFile,
  PrChangesData,
  PrChecksData,
  PrChecksSummary,
  PrMetadata,
  PrReviewsData,
} from "./types.js";

// File-classification constants. Named so call sites stay grep-friendly.
const PATH_PREFIX_SOURCE = "src/";
const PATH_PREFIX_TESTS = "tests/";
const PATH_PREFIX_DOCS = "docs/";
const PATH_PREFIX_EXAMPLES = "examples/";
const PATH_PREFIX_WORKFLOW = ".github/";
const PATH_FILE_README = "README.md";
const PATH_FILE_PACKAGE_JSON = "package.json";
const PATH_FILE_PACKAGE_LOCK = "package-lock.json";

const LARGE_DIFF_THRESHOLD = 1000;
const MANY_FILES_THRESHOLD = 20;

const UNCLEAN_MERGE_STATES = new Set(["DIRTY", "BLOCKED", "BEHIND"]);

type FileKind = "source" | "tests" | "docs" | "workflow" | "package" | "other";

function classifyPath(path: string): FileKind {
  if (path === PATH_FILE_PACKAGE_JSON || path === PATH_FILE_PACKAGE_LOCK) return "package";
  if (path === PATH_FILE_README) return "docs";
  if (path.startsWith(PATH_PREFIX_WORKFLOW)) return "workflow";
  if (path.startsWith(PATH_PREFIX_TESTS)) return "tests";
  if (path.startsWith(PATH_PREFIX_SOURCE)) return "source";
  if (path.startsWith(PATH_PREFIX_DOCS) || path.startsWith(PATH_PREFIX_EXAMPLES)) return "docs";
  return "other";
}

interface FileBuckets {
  readonly hasSource: boolean;
  readonly hasTests: boolean;
  readonly hasWorkflow: boolean;
  readonly hasPackage: boolean;
  readonly hasNonDocs: boolean;
  readonly allDocs: boolean;
}

function bucketFiles(files: readonly PrChangedFile[]): FileBuckets {
  let hasSource = false;
  let hasTests = false;
  let hasWorkflow = false;
  let hasPackage = false;
  let hasDocs = false;
  let hasOther = false;
  for (const f of files) {
    const kind = classifyPath(f.path);
    switch (kind) {
      case "source":
        hasSource = true;
        break;
      case "tests":
        hasTests = true;
        break;
      case "workflow":
        hasWorkflow = true;
        break;
      case "package":
        hasPackage = true;
        break;
      case "docs":
        hasDocs = true;
        break;
      case "other":
        hasOther = true;
        break;
    }
  }
  const hasNonDocs = hasSource || hasTests || hasWorkflow || hasPackage || hasOther;
  const allDocs = files.length > 0 && hasDocs && !hasNonDocs;
  return { hasSource, hasTests, hasWorkflow, hasPackage, hasNonDocs, allDocs };
}

// Stable next-suggested-action sentences keyed by analysis status. These are
// short English imperative sentences, not bilingual; the bilingual headline
// is the top-level `message` field.
const NEXT_ACTION_BY_STATUS: Readonly<Record<GitHubPrAnalysisStatus, string>> = Object.freeze({
  merged: "PR already merged — run `ocn exec status` on the merged branch.",
  closed: "PR is closed without merge — review history if context is needed.",
  draft: "Mark PR ready for review when implementation is complete.",
  blocked: "Resolve blockers (failing CI, requested changes, or merge conflicts) before review.",
  "pending-ci": "Wait for CI to complete, then re-run analysis.",
  "ready-to-review": "Review changed files against acceptance criteria before merge.",
  "needs-human-review": "Ask a human reviewer to inspect the PR — automated signals are inconclusive.",
});

const NEXT_ACTION_CI_FAILING =
  "Investigate failing CI checks before requesting review.";
const NEXT_ACTION_CHANGES_REQUESTED =
  "Address review feedback (changes requested) before merging.";

interface AnalysisInputs {
  readonly pr: PrMetadata;
  readonly changes: PrChangesData;
  readonly checks: PrChecksData;
  readonly reviews: PrReviewsData;
}

export function resolveAnalysisStatus(inputs: AnalysisInputs): GitHubPrAnalysisStatus {
  const { pr, checks, reviews } = inputs;
  if (pr.state === "MERGED") return "merged";
  if (pr.state === "CLOSED") return "closed";
  if (pr.isDraft) return "draft";
  if (checks.summary === "failure") return "blocked";
  if (
    pr.mergeStateStatus !== null &&
    UNCLEAN_MERGE_STATES.has(pr.mergeStateStatus)
  ) {
    return "blocked";
  }
  if (checks.summary === "pending") return "pending-ci";
  if (reviews.changesRequested > 0) return "blocked";
  if (checks.summary === "success") return "ready-to-review";
  if (checks.summary === "none") return "needs-human-review";
  return "needs-human-review";
}

function collectRiskFlags(inputs: AnalysisInputs): GitHubPrRiskFlag[] {
  const { pr, changes, checks, reviews } = inputs;
  const flags: GitHubPrRiskFlag[] = [];
  if (pr.isDraft) flags.push("draft-pr");
  if (pr.state === "CLOSED") flags.push("closed-pr");
  if (pr.mergeStateStatus !== null && UNCLEAN_MERGE_STATES.has(pr.mergeStateStatus)) {
    flags.push("merge-conflict-or-unclean");
  }
  if (checks.summary === "failure") flags.push("ci-failing");
  if (checks.summary === "pending") flags.push("ci-pending");
  if (checks.summary === "none") flags.push("no-checks-found");
  if (reviews.changesRequested > 0) flags.push("changes-requested");
  if (reviews.total === 0 && pr.state === "OPEN" && !pr.isDraft) flags.push("no-review-yet");
  if (changes.additions + changes.deletions > LARGE_DIFF_THRESHOLD) flags.push("large-diff");
  if (changes.changedFiles > MANY_FILES_THRESHOLD) flags.push("many-files-changed");

  const buckets = bucketFiles(changes.files);
  if (buckets.hasSource && !buckets.hasTests) flags.push("source-change-without-test-change");
  if (buckets.hasTests && !buckets.hasSource) flags.push("test-change-without-source-change");
  if (buckets.allDocs) flags.push("docs-only-change");
  if (buckets.hasWorkflow) flags.push("workflow-changed");
  if (buckets.hasPackage) flags.push("package-metadata-changed");
  return flags;
}

function pickNextAction(
  status: GitHubPrAnalysisStatus,
  riskFlags: readonly GitHubPrRiskFlag[],
): string {
  if (status === "blocked" && riskFlags.includes("ci-failing")) return NEXT_ACTION_CI_FAILING;
  if (status === "blocked" && riskFlags.includes("changes-requested")) {
    return NEXT_ACTION_CHANGES_REQUESTED;
  }
  return NEXT_ACTION_BY_STATUS[status];
}

export function buildPrAnalysis(inputs: AnalysisInputs): GitHubPrAnalysis {
  const status = resolveAnalysisStatus(inputs);
  const riskFlags = collectRiskFlags(inputs);
  const nextSuggestedAction = pickNextAction(status, riskFlags);
  return { status, riskFlags, nextSuggestedAction };
}

// Re-exported for tests that want to assert the summary directly.
export type { PrChecksSummary };
