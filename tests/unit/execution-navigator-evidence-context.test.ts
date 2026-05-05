// PR-B / M2 — unit tests for buildEvidenceContext.
//
// Verifies:
//   1. Aggregator returns the expected shape with mocked readers.
//   2. mode === "local" → github === null and runner is NOT invoked.
//   3. mode === "pr" → runner invoked exactly once.
//   4. mode === "combined" with PR present → runner invoked exactly once.
//   5. Aggregated warnings are sorted lexicographically.
//   6. Returned context is frozen / immutable.
//
// And separately the headline win:
//   7. verdict-draft → verify-status path fetches the PR EXACTLY ONCE for a
//      given PR number, not twice (the latent double-fetch closed by M2).

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildEvidenceContext } from "../../src/core/execution-navigator/evidence-context.js";
import { generateVerdictDraft } from "../../src/core/execution-navigator/verdict-draft.js";
import type { GhInvocation, GhRunner } from "../../src/core/execution-navigator/github-pr-runner.js";

const PR_VIEW_FIELDS = [
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

interface CallCounter {
  readonly count: { value: number };
  readonly runner: GhRunner;
}

function buildCountingRunner(
  responses: Map<string, GhInvocation>,
): CallCounter {
  const count = { value: 0 };
  const runner: GhRunner = {
    async run(args) {
      count.value += 1;
      const key = args.join(" ");
      const r = responses.get(key);
      if (r === undefined) {
        return {
          ok: false,
          code: "OTHER",
          message: `unexpected runner call: ${key}`,
        };
      }
      return r;
    },
  };
  return { count, runner };
}

function makePrJson(prNumber: number): string {
  return JSON.stringify({
    number: prNumber,
    title: "feat: x",
    body: "",
    state: "OPEN",
    author: { login: "alice" },
    headRefName: "feat/x",
    baseRefName: "main",
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    isDraft: false,
    url: "https://github.com/x/y/pull/" + prNumber,
    commits: [{ oid: "abc1234", messageHeadline: "feat: x" }],
    files: [
      { path: "src/cli/commands/init.ts", additions: 1, deletions: 0, changeType: "modified" },
    ],
    reviews: [],
    statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
  });
}

function buildSuccessResponses(prNumber: number): Map<string, GhInvocation> {
  const m = new Map<string, GhInvocation>();
  m.set("auth status", { ok: true, stdout: "", stderr: "Logged in" });
  m.set(`pr view ${prNumber} --json ${PR_VIEW_FIELDS}`, {
    ok: true,
    stdout: makePrJson(prNumber),
    stderr: "",
  });
  return m;
}

function writePackageJson(dir: string): void {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "fixture",
      version: "0.0.0",
      scripts: {
        lint: "eslint .",
        typecheck: "tsc --noEmit",
        test: "vitest run",
        build: "tsup",
        "test:coverage": "vitest run --coverage",
      },
    }),
    "utf8",
  );
}

function writeAcceptance(dir: string, body: string): void {
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "03-acceptance-criteria.md"), body, "utf8");
}

describe("buildEvidenceContext", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-evidence-context-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns the expected shape with mocked readers", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const { runner } = buildCountingRunner(new Map());
    const ctx = await buildEvidenceContext({
      cwd: dir,
      mode: "local",
      prNumber: null,
      ghRunner: runner,
    });
    expect(ctx.cwd).toBe(dir);
    expect(ctx.mode).toBe("local");
    expect(ctx.prNumber).toBeNull();
    expect(ctx.acceptance.found).toBe(true);
    expect(ctx.github).toBeNull();
    expect(ctx.githubRequested).toBe(false);
    expect(ctx.githubUnavailable).toBe(false);
    expect(Array.isArray(ctx.warnings)).toBe(true);
  });

  it("mode === 'local' → github is null and runner is NOT invoked", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const { count, runner } = buildCountingRunner(new Map());
    const ctx = await buildEvidenceContext({
      cwd: dir,
      mode: "local",
      prNumber: 42,
      ghRunner: runner,
    });
    expect(ctx.github).toBeNull();
    expect(count.value).toBe(0);
  });

  it("mode === 'pr' with PR number → runner invoked exactly once for the PR view", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const { count, runner } = buildCountingRunner(buildSuccessResponses(67));
    const ctx = await buildEvidenceContext({
      cwd: dir,
      mode: "pr",
      prNumber: 67,
      ghRunner: runner,
    });
    expect(ctx.github).not.toBeNull();
    // analyzeGithubPr calls `auth status` then `pr view ...` — that's 2 gh
    // invocations, but only one PR fetch. The de-dup test below asserts that
    // verdict-draft → verify-status doesn't double THIS pair.
    expect(count.value).toBe(2);
  });

  it("mode === 'combined' with PR present → runner invoked exactly once for the PR fetch", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const { count, runner } = buildCountingRunner(buildSuccessResponses(99));
    const ctx = await buildEvidenceContext({
      cwd: dir,
      mode: "combined",
      prNumber: 99,
      ghRunner: runner,
    });
    expect(ctx.github).not.toBeNull();
    expect(count.value).toBe(2);
  });

  it("warnings array is sorted lexicographically", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const responses = new Map<string, GhInvocation>();
    // gh auth fails → analyzeGithubPr emits a github-evidence-unavailable warning.
    responses.set("auth status", {
      ok: false,
      code: "EXIT_NONZERO",
      message: "not authenticated",
    });
    const { runner } = buildCountingRunner(responses);
    const ctx = await buildEvidenceContext({
      cwd: dir,
      mode: "combined",
      prNumber: 1,
      ghRunner: runner,
    });
    const sorted = [...ctx.warnings].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(ctx.warnings).toEqual(sorted);
  });

  it("returned context is frozen / immutable", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const { runner } = buildCountingRunner(new Map());
    const ctx = await buildEvidenceContext({
      cwd: dir,
      mode: "local",
      prNumber: null,
      ghRunner: runner,
    });
    expect(Object.isFrozen(ctx)).toBe(true);
  });
});

describe("verdict-draft → verify-status de-duplication (PR-B / M2)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-evidence-context-dedup-"));
    writePackageJson(dir);
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("verdict-draft fetches the PR exactly once, not twice", async () => {
    const { count, runner } = buildCountingRunner(buildSuccessResponses(123));
    const result = await generateVerdictDraft({
      cwd: dir,
      mode: "combined",
      prNumber: 123,
      runner,
    });
    expect(result.ok).toBe(true);
    // Before PR-B: verdict-draft called summarizeVerifyStatus, which itself
    // built a context that fetched the PR — and verdict-draft also built its
    // own context — leading to two `auth status` + two `pr view` invocations
    // (4 total). After PR-B: a single shared EvidenceContext is threaded
    // through, so we expect exactly 2 gh invocations (auth + pr view, ONCE).
    expect(count.value).toBe(2);
  });
});
