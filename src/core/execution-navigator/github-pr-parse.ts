// MVP 2 — pure parsers for `gh pr view --json` output (DEC-024 PR 3).
//
// Defensive: never throws on malformed input. Missing or unexpected fields
// degrade gracefully and append a string warning to the supplied list. The
// exported parsers are unit-tested against fixture JSON so the reader does
// not have to spawn `gh` to exercise the parse path.

import type {
  PrChangedFile,
  PrChangesData,
  PrCheckRecord,
  PrChecksData,
  PrChecksSummary,
  PrCommitRecord,
  PrFileChangeType,
  PrMetadata,
  PrReviewsData,
} from "./types.js";

const CHECK_STATUS_PENDING = new Set(["QUEUED", "IN_PROGRESS", "WAITING", "PENDING"]);
const CHECK_CONCLUSION_FAILURE = new Set([
  "FAILURE",
  "CANCELLED",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE",
]);
const CHECK_CONCLUSION_SUCCESS = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

// Normalise gh's `changeType` into one of our enum members. gh historically
// emits values like `"added"` / `"modified"` / `"removed"` / `"renamed"` /
// `"copied"` (lowercase). We accept `"changed"` as a defensive fallback.
function normaliseChangeType(raw: unknown): PrFileChangeType {
  if (typeof raw !== "string") return "modified";
  const v = raw.toLowerCase();
  switch (v) {
    case "added":
    case "modified":
    case "removed":
    case "renamed":
    case "copied":
    case "changed":
      return v;
    default:
      return "modified";
  }
}

export function parsePrMetadata(raw: Record<string, unknown>, warnings: string[]): PrMetadata {
  const number = asNumber(raw["number"], 0);
  if (number <= 0) {
    warnings.push("pr-number-missing");
  }
  let author: string | null = null;
  if (isRecord(raw["author"])) {
    const login = raw["author"]["login"];
    if (typeof login === "string") author = login;
  } else if (raw["author"] === null) {
    author = null;
  }
  return {
    number,
    title: asString(raw["title"]),
    body: asString(raw["body"]),
    state: asString(raw["state"], "UNKNOWN"),
    url: asString(raw["url"]),
    author,
    headRefName: typeof raw["headRefName"] === "string" ? raw["headRefName"] : null,
    baseRefName: typeof raw["baseRefName"] === "string" ? raw["baseRefName"] : null,
    isDraft: asBool(raw["isDraft"]),
    mergeable: typeof raw["mergeable"] === "string" ? raw["mergeable"] : null,
    mergeStateStatus: typeof raw["mergeStateStatus"] === "string" ? raw["mergeStateStatus"] : null,
  };
}

export function parsePrFiles(raw: unknown, warnings: string[]): PrChangesData {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) warnings.push("files-field-unavailable");
    return { changedFiles: 0, additions: 0, deletions: 0, files: [] };
  }
  const files: PrChangedFile[] = [];
  let additions = 0;
  let deletions = 0;
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const path = asString(entry["path"]);
    if (path.length === 0) continue;
    const fileAdditions = asNumber(entry["additions"]);
    const fileDeletions = asNumber(entry["deletions"]);
    files.push({
      path,
      additions: fileAdditions,
      deletions: fileDeletions,
      changeType: normaliseChangeType(entry["changeType"]),
    });
    additions += fileAdditions;
    deletions += fileDeletions;
  }
  // Sort by path lex-asc so the parsed output is deterministic regardless of
  // whatever order `gh pr view --json files` happens to return.
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { changedFiles: files.length, additions, deletions, files };
}

export function parsePrCommits(raw: unknown, warnings: string[]): readonly PrCommitRecord[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) warnings.push("commits-field-unavailable");
    return [];
  }
  const out: PrCommitRecord[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const oid = asString(entry["oid"]);
    if (oid.length === 0) continue;
    out.push({
      oid,
      messageHeadline: asString(entry["messageHeadline"]),
    });
  }
  // Sort by oid lex-asc so the parsed output is deterministic regardless of
  // whatever order `gh pr view --json commits` happens to return.
  out.sort((a, b) => (a.oid < b.oid ? -1 : a.oid > b.oid ? 1 : 0));
  return out;
}

function classifyCheck(status: string, conclusion: string | null): "passed" | "failed" | "pending" {
  if (CHECK_STATUS_PENDING.has(status)) return "pending";
  if (status !== "COMPLETED") {
    // Unknown / non-completed non-pending status; treat as pending.
    return "pending";
  }
  if (conclusion !== null && CHECK_CONCLUSION_FAILURE.has(conclusion)) return "failed";
  if (conclusion !== null && CHECK_CONCLUSION_SUCCESS.has(conclusion)) return "passed";
  // Unknown conclusion on a completed check — treat as pending so it is not
  // silently counted as success.
  return "pending";
}

function summariseChecks(
  passed: number,
  failed: number,
  pending: number,
  total: number,
): PrChecksSummary {
  if (total === 0) return "none";
  if (failed > 0) return "failure";
  if (pending > 0) return "pending";
  if (passed === total) return "success";
  return "mixed";
}

export function parsePrChecks(raw: unknown, warnings: string[]): PrChecksData {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) warnings.push("checks-field-unavailable");
    return { summary: "none", total: 0, passed: 0, failed: 0, pending: 0, items: [] };
  }
  const items: PrCheckRecord[] = [];
  let passed = 0;
  let failed = 0;
  let pending = 0;
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const name = asString(entry["name"]);
    if (name.length === 0) continue;
    const status = asString(entry["status"], "UNKNOWN");
    const conclusion = typeof entry["conclusion"] === "string" ? entry["conclusion"] : null;
    items.push({ name, status, conclusion });
    const verdict = classifyCheck(status, conclusion);
    if (verdict === "passed") passed += 1;
    else if (verdict === "failed") failed += 1;
    else pending += 1;
  }
  const total = items.length;
  // Sort by name lex-asc so the parsed output is deterministic regardless of
  // whatever order `gh pr view --json statusCheckRollup` happens to return.
  items.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return {
    summary: summariseChecks(passed, failed, pending, total),
    total,
    passed,
    failed,
    pending,
    items,
  };
}

export function parsePrReviews(raw: unknown, warnings: string[]): PrReviewsData {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) warnings.push("reviews-field-unavailable");
    return { total: 0, approved: 0, changesRequested: 0, commented: 0 };
  }
  let approved = 0;
  let changesRequested = 0;
  let commented = 0;
  let total = 0;
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    total += 1;
    const state = asString(entry["state"]).toUpperCase();
    if (state === "APPROVED") approved += 1;
    else if (state === "CHANGES_REQUESTED") changesRequested += 1;
    else if (state === "COMMENTED") commented += 1;
    // DISMISSED / PENDING / other states are counted in `total` only.
  }
  return { total, approved, changesRequested, commented };
}
