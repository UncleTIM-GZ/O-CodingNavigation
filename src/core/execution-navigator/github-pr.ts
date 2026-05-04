// MVP 2 — orchestrator for `ocn github analyze-pr <number>` (DEC-024 PR 3).
//
// Read-only:
//   - Spawns `gh auth status` and `gh pr view --json ...` only.
//   - Never mutates GitHub. Never mutates the working tree. Never creates
//     `.ocoding/execution`.
//   - The runner is injectable so tests can supply fixture stdout/stderr
//     without spawning a real `gh` process.

import type { CommandResult } from "../../types/result.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import {
  parsePrChecks,
  parsePrCommits,
  parsePrFiles,
  parsePrMetadata,
  parsePrReviews,
} from "./github-pr-parse.js";
import { buildPrAnalysis } from "./github-pr-analysis.js";
import { defaultGhRunner, type GhRunner, type GhInvocation } from "./github-pr-runner.js";
import { readOcnProjectState } from "./ocn-state-reader.js";
import type {
  EvidenceSourceUsed,
  GitHubPrAnalyzeData,
  GitHubPrReadReason,
  PrChangesData,
  PrChecksData,
  PrCommitRecord,
  PrMetadata,
  PrReviewsData,
} from "./types.js";

const HEADLINE_OK = msg(
  "GitHub PR evidence collected.",
  "已收集 GitHub PR 证据。",
);

const HEADLINE_GH_NOT_FOUND = msg(
  "GitHub CLI (gh) is required for PR analysis but was not found.",
  "PR 分析需要 GitHub CLI（gh），但当前环境未找到。",
);

const HEADLINE_GH_AUTH_REQUIRED = msg(
  "GitHub CLI is not authenticated. Run `gh auth login` and retry.",
  "GitHub CLI 未认证。请运行 `gh auth login` 后重试。",
);

const HEADLINE_GH_QUERY_FAILED = msg(
  "GitHub PR query failed; see warnings for details.",
  "GitHub PR 查询失败，请查看 warnings。",
);

function headlinePrNotFound(prNumber: number) {
  return msg(
    `PR #${prNumber} was not found in this repository.`,
    `在当前仓库中未找到 PR #${prNumber}。`,
  );
}

const PR_VIEW_JSON_FIELDS = [
  "number",
  "title",
  "body",
  "state",
  "author",
  "headRefName",
  "baseRefName",
  "mergeable",
  "mergeStateStatus",
  "isDraft",
  "commits",
  "files",
  "reviews",
  "statusCheckRollup",
  "url",
].join(",");

const EVIDENCE_SOURCES: readonly EvidenceSourceUsed[] = ["github", "ocn-state"];

export interface AnalyzePrOptions {
  readonly prNumber: number;
  readonly cwd: string;
  readonly runner?: GhRunner;
}

interface PrViewJson {
  readonly raw: Record<string, unknown>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseGhPrViewJson(stdout: string, warnings: string[]): PrViewJson | null {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (!isRecord(parsed)) {
      warnings.push("gh-output-not-object");
      return null;
    }
    return { raw: parsed };
  } catch {
    warnings.push("gh-output-not-json");
    return null;
  }
}

// Detect "PR not found" patterns in gh stderr. gh reports this as exit 1
// with stderr containing either "could not resolve to a PullRequest" or a
// 404 hint.
function isPrNotFoundError(stderr: string | undefined): boolean {
  if (typeof stderr !== "string" || stderr.length === 0) return false;
  if (stderr.includes("Could not resolve to a PullRequest")) return true;
  if (stderr.includes("could not resolve to a PullRequest")) return true;
  if (stderr.includes("HTTP 404") || stderr.includes("status: 404")) return true;
  if (stderr.includes("no pull requests found")) return true;
  return false;
}

// Detect auth-required patterns in gh stderr / message. We do NOT rely
// purely on `gh auth status` because some CI containers ship a `gh` that
// reports auth via env var instead — but a missing auth surfaces here too.
function isGhAuthError(invocation: GhInvocation): boolean {
  if (invocation.ok) return false;
  const stderr = invocation.stderr ?? "";
  const msg = invocation.message ?? "";
  if (stderr.includes("authentication required")) return true;
  if (stderr.includes("not authenticated")) return true;
  if (stderr.includes("gh auth login")) return true;
  if (stderr.includes("HTTP 401")) return true;
  if (msg.includes("not authenticated")) return true;
  return false;
}

function emptyEnvelope(
  prNumber: number,
  reason: GitHubPrReadReason,
  warnings: readonly string[],
  ocn: GitHubPrAnalyzeData["ocn"],
): GitHubPrAnalyzeData {
  return {
    command: "github.analyze_pr",
    implemented: true,
    noMutation: true,
    evidenceSourcesUsed: EVIDENCE_SOURCES,
    prNumber,
    reason,
    pr: null,
    changes: null,
    commits: [],
    checks: null,
    reviews: null,
    ocn,
    analysis: null,
    warnings: [...warnings],
  };
}

async function probeAuth(runner: GhRunner): Promise<GhInvocation> {
  return runner.run(["auth", "status"]);
}

async function fetchPrView(
  runner: GhRunner,
  prNumber: number,
): Promise<GhInvocation> {
  return runner.run([
    "pr",
    "view",
    String(prNumber),
    "--json",
    PR_VIEW_JSON_FIELDS,
  ]);
}

// Top-level orchestrator. Always returns a CommandResult — never throws.
export async function analyzeGithubPr(
  opts: AnalyzePrOptions,
): Promise<CommandResult<GitHubPrAnalyzeData>> {
  const runner = opts.runner ?? defaultGhRunner();
  const ocn = await readOcnProjectState(opts.cwd);

  // Step 1 — auth probe. gh-not-found surfaces here as ENOENT.
  const auth = await probeAuth(runner);
  if (!auth.ok && auth.code === "ENOENT") {
    return blocked(
      "ERR_IO_OR_CONFIG",
      HEADLINE_GH_NOT_FOUND,
      emptyEnvelope(opts.prNumber, "gh-not-found", [], ocn),
    );
  }
  if (!auth.ok || isGhAuthError(auth)) {
    return blocked(
      "ERR_IO_OR_CONFIG",
      HEADLINE_GH_AUTH_REQUIRED,
      emptyEnvelope(opts.prNumber, "gh-auth-required", [], ocn),
    );
  }

  // Step 2 — fetch the PR.
  const prView = await fetchPrView(runner, opts.prNumber);
  if (!prView.ok) {
    if (prView.code === "ENOENT") {
      return blocked(
        "ERR_IO_OR_CONFIG",
        HEADLINE_GH_NOT_FOUND,
        emptyEnvelope(opts.prNumber, "gh-not-found", [], ocn),
      );
    }
    if (isPrNotFoundError(prView.stderr)) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        headlinePrNotFound(opts.prNumber),
        emptyEnvelope(opts.prNumber, "pr-not-found", [], ocn),
      );
    }
    if (isGhAuthError(prView)) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        HEADLINE_GH_AUTH_REQUIRED,
        emptyEnvelope(opts.prNumber, "gh-auth-required", [], ocn),
      );
    }
    const warning =
      typeof prView.stderr === "string" && prView.stderr.length > 0
        ? `gh-stderr:${prView.stderr.trim().split("\n")[0]?.slice(0, 200) ?? ""}`
        : `gh-error:${prView.message.slice(0, 200)}`;
    return blocked(
      "ERR_IO_OR_CONFIG",
      HEADLINE_GH_QUERY_FAILED,
      emptyEnvelope(opts.prNumber, "gh-query-failed", [warning], ocn),
    );
  }

  // Step 3 — parse & analyse.
  const warnings: string[] = [];
  const parsed = parseGhPrViewJson(prView.stdout, warnings);
  if (parsed === null) {
    return blocked(
      "ERR_IO_OR_CONFIG",
      HEADLINE_GH_QUERY_FAILED,
      emptyEnvelope(opts.prNumber, "gh-query-failed", warnings, ocn),
    );
  }

  const pr: PrMetadata = parsePrMetadata(parsed.raw, warnings);
  const changes: PrChangesData = parsePrFiles(parsed.raw["files"], warnings);
  const commits: readonly PrCommitRecord[] = parsePrCommits(
    parsed.raw["commits"],
    warnings,
  );
  const checks: PrChecksData = parsePrChecks(
    parsed.raw["statusCheckRollup"],
    warnings,
  );
  const reviews: PrReviewsData = parsePrReviews(parsed.raw["reviews"], warnings);

  const analysis = buildPrAnalysis({ pr, changes, checks, reviews });

  const data: GitHubPrAnalyzeData = {
    command: "github.analyze_pr",
    implemented: true,
    noMutation: true,
    evidenceSourcesUsed: EVIDENCE_SOURCES,
    prNumber: opts.prNumber,
    pr,
    changes,
    commits,
    checks,
    reviews,
    ocn,
    analysis,
    warnings,
  };

  return ok(HEADLINE_OK, data);
}
