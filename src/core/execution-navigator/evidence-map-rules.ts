// PR-B / M5 — strong / candidate rules for per-criterion mapping.
//
// Pure functions over already-parsed AC criteria + already-collected git /
// GitHub evidence. No I/O. Each rule mutates the supplied collector
// (appending matched evidence) and returns whether it fired.

import {
  pathMatchesKeywords,
  textContainsAnyKeyword,
} from "./evidence-map-keywords.js";
import type {
  EvidenceMapEvidence,
  GitHubPrAnalyzeData,
} from "./types.js";

export interface EvidenceCollector {
  readonly evidence: EvidenceMapEvidence[];
  readonly seen: Set<string>;
  hasFoundSignal: boolean;
}

export interface CriterionContext {
  readonly criterion: { readonly id: string; readonly text: string };
  readonly keywords: readonly string[];
  readonly mentionsTest: boolean;
  readonly mentionsCli: boolean;
  readonly mentionsDocs: boolean;
  readonly mentionsBuild: boolean;
  readonly mentionsManual: boolean;
  readonly mentionsRisk: boolean;
}

export function pushEvidence(
  collector: EvidenceCollector,
  source: EvidenceMapEvidence["source"],
  ref: string,
  reason: string,
): void {
  const key = `${source} ${ref} ${reason}`;
  if (collector.seen.has(key)) return;
  collector.seen.add(key);
  collector.evidence.push({ source, ref, reason });
}

export function ruleStrongFile(
  ctx: CriterionContext,
  changedFiles: readonly string[],
  source: EvidenceMapEvidence["source"],
  collector: EvidenceCollector,
  prefix: string,
  label: string,
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  let matched = false;
  for (const path of changedFiles) {
    if (!path.startsWith(prefix)) continue;
    const hits = pathMatchesKeywords(path, ctx.keywords);
    if (hits.length === 0) continue;
    pushEvidence(
      collector,
      source,
      path,
      `Changed ${label} file path matches criterion keyword '${hits[0]}'.`,
    );
    matched = true;
  }
  if (matched) collector.hasFoundSignal = true;
  return matched;
}

export function ruleStrongBuildChecks(
  ctx: CriterionContext,
  github: GitHubPrAnalyzeData | null,
  collector: EvidenceCollector,
): boolean {
  if (!ctx.mentionsBuild) return false;
  if (github === null) return false;
  if (github.checks === null) return false;
  if (github.checks.summary !== "success") return false;
  pushEvidence(
    collector,
    "github-checks",
    "pr-checks",
    "GitHub PR checks rollup is success.",
  );
  collector.hasFoundSignal = true;
  return true;
}

export function ruleCandidatePath(
  ctx: CriterionContext,
  changedFiles: readonly string[],
  source: EvidenceMapEvidence["source"],
  collector: EvidenceCollector,
): void {
  for (const path of changedFiles) {
    const hits = textContainsAnyKeyword(path, ctx.keywords);
    if (hits.length === 0) continue;
    pushEvidence(
      collector,
      source,
      path,
      `Changed file path mentions criterion keyword '${hits[0]}'.`,
    );
  }
}

export function ruleCandidateCommits(
  ctx: CriterionContext,
  commits: readonly { readonly subject: string; readonly ref: string }[],
  source: EvidenceMapEvidence["source"],
  collector: EvidenceCollector,
): void {
  for (const c of commits) {
    const hits = textContainsAnyKeyword(c.subject, ctx.keywords);
    if (hits.length === 0) continue;
    pushEvidence(
      collector,
      source,
      c.ref,
      `Commit subject mentions criterion keyword '${hits[0]}'.`,
    );
  }
}

export function ruleCandidatePrTextMentionsId(
  ctx: CriterionContext,
  github: GitHubPrAnalyzeData | null,
  collector: EvidenceCollector,
): boolean {
  if (github === null || github.pr === null) return false;
  const id = ctx.criterion.id;
  let matched = false;
  if (github.pr.title.includes(id)) {
    pushEvidence(collector, "github-pr-title", id, "PR title mentions criterion ID.");
    matched = true;
  }
  if (github.pr.body.includes(id)) {
    pushEvidence(collector, "github-pr-body", id, "PR body mentions criterion ID.");
    matched = true;
  }
  return matched;
}
