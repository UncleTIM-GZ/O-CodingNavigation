// PR-B / M5 — keyword extraction + regex constants for evidence-map.
//
// Pure helpers. No I/O. Shared between `evidence-map-criterion.ts` and any
// future caller that wants to introspect criterion keywords without rerunning
// the heuristic itself.

// Minimum keyword length. Tokens shorter than this produce too many false
// positives in path-based heuristics and are dropped.
const MIN_KEYWORD_LENGTH = 3;
// Threshold above which weaker keyword-overlap heuristics fire.
export const CANDIDATE_KEYWORD_LENGTH = 4;

const STOPWORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "for",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "this",
  "to",
  "will",
  "with",
]);

export const MENTIONS_TEST_RE = /\b(test|tests|testing|spec|specs|coverage)\b/i;
export const MENTIONS_CLI_RE = /\b(ocn\s+\w[\w-]*|cli|command)\b/i;
export const MENTIONS_DOCS_RE = /\b(docs?|readme|guide|tutorial|documentation)\b/i;
export const MENTIONS_BUILD_RE = /\b(build|compile|typecheck|lint|ci|workflow|pipeline)\b/i;
export const MENTIONS_MANUAL_RE =
  /\b(manual|human|review|judge|judgement|qualitative|ux|design|usability|aesthetic|tone|wording|copy)\b/i;
export const MENTIONS_RISK_RE =
  /\b(performance|latency|throughput|security|privacy|risk|compliance|audit|regulatory|legal)\b/i;

export const PATH_PREFIX_SOURCE_CLI = "src/cli";
export const PATH_PREFIX_TESTS = "tests/";
export const PATH_PREFIX_DOCS = "docs/";

// Lower-cased keyword tokens after stopword removal. Exported for testing.
export function extractKeywords(text: string): readonly string[] {
  const lowered = text.toLowerCase();
  const tokens = lowered.split(/[^a-z0-9]+/).filter((t) => t.length >= MIN_KEYWORD_LENGTH);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

// True when `text` contains any keyword as a substring (lowercased).
export function textContainsAnyKeyword(
  text: string,
  keywords: readonly string[],
): readonly string[] {
  const lowered = text.toLowerCase();
  const hits: string[] = [];
  for (const kw of keywords) {
    if (kw.length < CANDIDATE_KEYWORD_LENGTH) continue;
    if (lowered.includes(kw)) hits.push(kw);
  }
  return hits;
}

// Returns the keywords that the given path matches.
export function pathMatchesKeywords(
  path: string,
  keywords: readonly string[],
): readonly string[] {
  const lowered = path.toLowerCase();
  const hits: string[] = [];
  for (const kw of keywords) {
    if (lowered.includes(kw)) hits.push(kw);
  }
  return hits;
}
