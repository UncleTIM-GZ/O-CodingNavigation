// PR-B / M2 — shared EvidenceContext aggregator.
//
// Composes the existing readers (local-git, ocn-state, acceptance-loader,
// optional GitHub PR) into a single immutable bundle that the four
// orchestrators (evidence-map, verify-status, next-prompt, verdict-draft)
// can accept directly. The headline win: when an orchestrator chains into
// another orchestrator (verdict-draft → verify-status), the upstream context
// is reused — preventing the latent double `gh pr view` round-trip.
//
// Pure aggregator: no logic of its own beyond delegating to the existing
// readers. No filesystem mutation, no GitHub mutation, no cache. Same inputs
// produce the same context byte-for-byte.

import { readLocalGit } from "./local-git.js";
import { readOcnProjectState } from "./ocn-state-reader.js";
import { analyzeGithubPr } from "./github-pr.js";
import { loadAcceptanceFromProject } from "./acceptance-loader.js";
import type { GhRunner } from "./github-pr-runner.js";
import type {
  AcceptanceParseResult,
  ExecStatusGitData,
  ExecStatusOcnData,
  GitHubPrAnalyzeData,
} from "./types.js";

export type EvidenceMode = "local" | "pr" | "combined";

export interface EvidenceContext {
  readonly cwd: string;
  readonly mode: EvidenceMode;
  readonly prNumber: number | null;
  readonly git: ExecStatusGitData;
  readonly ocn: ExecStatusOcnData;
  readonly acceptance: AcceptanceParseResult;
  readonly github: GitHubPrAnalyzeData | null;
  readonly githubRequested: boolean;
  readonly githubUnavailable: boolean;
  readonly warnings: readonly string[];
}

export interface BuildEvidenceContextOptions {
  readonly cwd: string;
  readonly mode: EvidenceMode;
  readonly prNumber: number | null;
  readonly ghRunner: GhRunner;
}

// Sort + dedupe lexicographically to keep aggregated warning order stable.
function sortLex(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

interface GhFetchOutcome {
  readonly github: GitHubPrAnalyzeData | null;
  readonly unavailable: boolean;
  readonly warning: string | null;
}

// PR fetch is the only conditional reader. Skipped entirely when:
//   - mode === "local"
//   - or prNumber === null
async function fetchGithub(
  opts: BuildEvidenceContextOptions,
): Promise<GhFetchOutcome> {
  if (opts.mode === "local" || opts.prNumber === null) {
    return { github: null, unavailable: false, warning: null };
  }
  const result = await analyzeGithubPr({
    prNumber: opts.prNumber,
    cwd: opts.cwd,
    runner: opts.ghRunner,
  });
  if (result.ok === true && result.data !== undefined && result.data.pr !== null) {
    return { github: result.data, unavailable: false, warning: null };
  }
  const data = result.data as GitHubPrAnalyzeData | undefined;
  const reason = data?.reason ?? "unknown";
  return {
    github: null,
    unavailable: true,
    warning: `github-evidence-unavailable: ${reason}`,
  };
}

// Build the EvidenceContext bundle. Composes the four readers in parallel
// (Promise.all). Aggregates warnings from each reader into a single sorted
// array. The returned object is frozen so downstream code cannot mutate it.
export async function buildEvidenceContext(
  opts: BuildEvidenceContextOptions,
): Promise<EvidenceContext> {
  const [git, ocn, acceptance, gh] = await Promise.all([
    readLocalGit(opts.cwd),
    readOcnProjectState(opts.cwd),
    loadAcceptanceFromProject(opts.cwd),
    fetchGithub(opts),
  ]);

  const warnings: string[] = [];
  for (const w of acceptance.warnings) warnings.push(w);
  if (gh.warning !== null) warnings.push(gh.warning);

  const githubRequested = opts.prNumber !== null && opts.mode !== "local";

  return Object.freeze({
    cwd: opts.cwd,
    mode: opts.mode,
    prNumber: opts.prNumber,
    git,
    ocn,
    acceptance: acceptance.result,
    github: gh.github,
    githubRequested,
    githubUnavailable: gh.unavailable,
    warnings: sortLex(warnings),
  });
}
