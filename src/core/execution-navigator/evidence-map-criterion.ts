// PR-B / M5 — per-criterion mapping orchestrator for evidence-map.
//
// Pure aggregator over already-parsed AC criteria + already-collected git /
// GitHub evidence. No LLM, no IO, no mutation. Keyword extraction lives in
// `evidence-map-keywords.ts`; per-rule logic in `evidence-map-rules.ts`.

import {
  extractKeywords,
  MENTIONS_BUILD_RE,
  MENTIONS_CLI_RE,
  MENTIONS_DOCS_RE,
  MENTIONS_MANUAL_RE,
  MENTIONS_RISK_RE,
  MENTIONS_TEST_RE,
  PATH_PREFIX_DOCS,
  PATH_PREFIX_SOURCE_CLI,
  PATH_PREFIX_TESTS,
} from "./evidence-map-keywords.js";
import {
  type CriterionContext,
  type EvidenceCollector,
  ruleCandidateCommits,
  ruleCandidatePath,
  ruleCandidatePrTextMentionsId,
  ruleStrongBuildChecks,
  ruleStrongFile,
} from "./evidence-map-rules.js";
import type {
  AcceptanceCriterion,
  EvidenceMapConfidence,
  EvidenceMapEvidence,
  EvidenceMapItem,
  EvidenceMapStatus,
  ExecStatusGitData,
  GitCommitRecord,
  GitHubPrAnalyzeData,
  PrChangedFile,
  PrCommitRecord,
} from "./types.js";

// Re-export so external callers / tests that previously imported
// `extractKeywords` from `evidence-map-criterion` continue to work.
export { extractKeywords } from "./evidence-map-keywords.js";

// Confidence escalation ladder.
const CONFIDENCE_ORDER: readonly EvidenceMapConfidence[] = ["low", "medium", "high"];

function escalate(c: EvidenceMapConfidence): EvidenceMapConfidence {
  const idx = CONFIDENCE_ORDER.indexOf(c);
  if (idx === -1 || idx === CONFIDENCE_ORDER.length - 1) return c;
  return CONFIDENCE_ORDER[idx + 1] as EvidenceMapConfidence;
}

function buildContext(criterion: AcceptanceCriterion): CriterionContext {
  return {
    criterion,
    keywords: extractKeywords(criterion.text),
    mentionsTest: MENTIONS_TEST_RE.test(criterion.text),
    mentionsCli: MENTIONS_CLI_RE.test(criterion.text),
    mentionsDocs: MENTIONS_DOCS_RE.test(criterion.text),
    mentionsBuild: MENTIONS_BUILD_RE.test(criterion.text),
    mentionsManual: MENTIONS_MANUAL_RE.test(criterion.text),
    mentionsRisk: MENTIONS_RISK_RE.test(criterion.text),
  };
}

function compareEvidenceItems(a: EvidenceMapEvidence, b: EvidenceMapEvidence): number {
  if (a.source !== b.source) return a.source < b.source ? -1 : 1;
  if (a.ref !== b.ref) return a.ref < b.ref ? -1 : 1;
  if (a.reason !== b.reason) return a.reason < b.reason ? -1 : 1;
  return 0;
}

function distinctSources(evidence: readonly EvidenceMapEvidence[]): number {
  return new Set(evidence.map((e) => e.source)).size;
}

interface MapOneResult {
  readonly status: EvidenceMapStatus;
  readonly confidence: EvidenceMapConfidence;
}

function deriveStatusAndConfidence(
  ctx: CriterionContext,
  collector: EvidenceCollector,
  hadStrongHit: boolean,
  hadPrIdMention: boolean,
): MapOneResult {
  if (ctx.mentionsManual || ctx.mentionsRisk) {
    return { status: "needs-human-review", confidence: "low" };
  }
  if (hadStrongHit) {
    let confidence: EvidenceMapConfidence = collector.evidence.some(
      (e) => e.source === "github-checks",
    )
      ? "high"
      : "medium";
    if (distinctSources(collector.evidence) >= 2) {
      confidence = escalate(confidence);
    }
    return { status: "evidence-found", confidence };
  }
  if (collector.evidence.length > 0) {
    const confidence: EvidenceMapConfidence = hadPrIdMention ? "medium" : "low";
    return { status: "evidence-candidate", confidence };
  }
  return { status: "missing-evidence", confidence: "low" };
}

function buildMissingEvidenceNotes(
  collector: EvidenceCollector,
  status: EvidenceMapStatus,
  hasGithub: boolean,
): readonly string[] {
  if (status !== "missing-evidence") return [];
  const notes: string[] = [];
  if (collector.evidence.length === 0) {
    notes.push("no changed file matches criterion keywords");
    notes.push("no commit subject mentions criterion");
    if (hasGithub) {
      notes.push("no GitHub checks observed");
    }
  }
  notes.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return notes;
}

function gitCommitsAsRefs(
  commits: readonly GitCommitRecord[],
): readonly { readonly subject: string; readonly ref: string }[] {
  return commits.map((c) => ({ subject: c.subject, ref: c.sha }));
}

function prCommitsAsRefs(
  commits: readonly PrCommitRecord[],
): readonly { readonly subject: string; readonly ref: string }[] {
  return commits.map((c) => ({ subject: c.messageHeadline, ref: c.oid }));
}

function prFilePaths(files: readonly PrChangedFile[]): readonly string[] {
  return files.map((f) => f.path);
}

export interface MapOneInputs {
  readonly git: ExecStatusGitData;
  readonly github: GitHubPrAnalyzeData | null;
}

export function mapOneCriterion(
  criterion: AcceptanceCriterion,
  inputs: MapOneInputs,
): EvidenceMapItem {
  const ctx = buildContext(criterion);
  const collector: EvidenceCollector = {
    evidence: [],
    seen: new Set<string>(),
    hasFoundSignal: false,
  };

  const localChanged = inputs.git.isGitRepo === true ? inputs.git.changedFiles ?? [] : [];
  const localCommits = inputs.git.isGitRepo === true ? inputs.git.recentCommits ?? [] : [];
  const github = inputs.github;
  const githubChanged =
    github !== null && github.changes !== null ? prFilePaths(github.changes.files) : [];
  const githubCommits = github !== null ? github.commits : [];

  const ruleHits = [
    ruleStrongFile(ctx, localChanged, "local-git-file", collector, PATH_PREFIX_SOURCE_CLI, "CLI", ctx.mentionsCli),
    ruleStrongFile(ctx, githubChanged, "github-pr-file", collector, PATH_PREFIX_SOURCE_CLI, "CLI", ctx.mentionsCli),
    ruleStrongFile(ctx, localChanged, "local-git-file", collector, PATH_PREFIX_TESTS, "test", ctx.mentionsTest),
    ruleStrongFile(ctx, githubChanged, "github-pr-file", collector, PATH_PREFIX_TESTS, "test", ctx.mentionsTest),
    ruleStrongFile(ctx, localChanged, "local-git-file", collector, PATH_PREFIX_DOCS, "docs", ctx.mentionsDocs),
    ruleStrongFile(ctx, githubChanged, "github-pr-file", collector, PATH_PREFIX_DOCS, "docs", ctx.mentionsDocs),
    ruleStrongBuildChecks(ctx, github, collector),
  ];
  const hadStrongHit = ruleHits.some((r) => r);

  ruleCandidatePath(ctx, localChanged, "local-git-file", collector);
  ruleCandidatePath(ctx, githubChanged, "github-pr-file", collector);
  ruleCandidateCommits(ctx, gitCommitsAsRefs(localCommits), "local-git-commit", collector);
  ruleCandidateCommits(ctx, prCommitsAsRefs(githubCommits), "github-pr-commit", collector);
  const hadPrIdMention = ruleCandidatePrTextMentionsId(ctx, github, collector);

  const { status, confidence } = deriveStatusAndConfidence(
    ctx,
    collector,
    hadStrongHit,
    hadPrIdMention,
  );

  const evidence = [...collector.evidence].sort(compareEvidenceItems);
  const missingEvidence = buildMissingEvidenceNotes(collector, status, github !== null);

  const humanReviewRequired =
    status === "needs-human-review" ||
    (status === "evidence-candidate" && confidence === "low");

  return {
    criterionId: ctx.criterion.id,
    criterionText: ctx.criterion.text,
    status,
    confidence,
    humanReviewRequired,
    evidence,
    missingEvidence,
  };
}
