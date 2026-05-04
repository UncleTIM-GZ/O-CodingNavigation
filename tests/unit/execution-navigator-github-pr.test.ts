import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parsePrChecks,
  parsePrCommits,
  parsePrFiles,
  parsePrMetadata,
  parsePrReviews,
} from "../../src/core/execution-navigator/github-pr-parse.js";
import { analyzeGithubPr } from "../../src/core/execution-navigator/github-pr.js";
import type {
  GhInvocation,
  GhRunner,
} from "../../src/core/execution-navigator/github-pr-runner.js";

// Build a fake gh runner that records every invocation and returns canned
// responses keyed by argv match. Tests assert both the response shape and
// that the runner was called with only read-only argv.
function makeRunner(
  responses: ReadonlyArray<{
    match: readonly string[];
    response: GhInvocation;
  }>,
): GhRunner & { calls: string[][] } {
  const calls: string[][] = [];
  const runner = {
    calls,
    async run(args: readonly string[]): Promise<GhInvocation> {
      calls.push([...args]);
      const found = responses.find(
        (r) => r.match.length === args.length && r.match.every((a, i) => a === args[i]),
      );
      if (found === undefined) {
        return {
          ok: false,
          code: "OTHER",
          message: `no fixture for ${args.join(" ")}`,
        };
      }
      return found.response;
    },
  };
  return runner;
}

const AUTH_OK: GhInvocation = { ok: true, stdout: "", stderr: "Logged in to github.com" };
const AUTH_ARGS: readonly string[] = ["auth", "status"];

function prViewArgs(prNumber: number): readonly string[] {
  return [
    "pr",
    "view",
    String(prNumber),
    "--json",
    [
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
    ].join(","),
  ];
}

function prFixture(overrides: Record<string, unknown> = {}): string {
  const base = {
    number: 123,
    title: "feat: example",
    body: "body text",
    state: "OPEN",
    author: { login: "alice" },
    headRefName: "feature/example",
    baseRefName: "main",
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    isDraft: false,
    url: "https://github.com/x/y/pull/123",
    commits: [{ oid: "abc1234", messageHeadline: "feat: example" }],
    files: [
      { path: "src/foo.ts", additions: 10, deletions: 2, changeType: "modified" },
      { path: "tests/foo.test.ts", additions: 20, deletions: 0, changeType: "added" },
    ],
    reviews: [],
    statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
  };
  return JSON.stringify({ ...base, ...overrides });
}

describe("github-pr-parse pure parsers", () => {
  it("parsePrMetadata flattens author.login and surfaces null fields safely", () => {
    const w: string[] = [];
    const meta = parsePrMetadata(
      {
        number: 7,
        title: "t",
        body: "b",
        state: "OPEN",
        author: { login: "bob" },
        headRefName: "a",
        baseRefName: "main",
        mergeable: "MERGEABLE",
        mergeStateStatus: "CLEAN",
        isDraft: false,
        url: "u",
      },
      w,
    );
    expect(meta.author).toBe("bob");
    expect(meta.number).toBe(7);
    expect(meta.isDraft).toBe(false);
    expect(w).toEqual([]);
  });

  it("parsePrFiles aggregates additions/deletions and normalises changeType", () => {
    const w: string[] = [];
    const r = parsePrFiles(
      [
        { path: "a", additions: 1, deletions: 2, changeType: "added" },
        { path: "b", additions: 3, deletions: 4, changeType: "MODIFIED" },
      ],
      w,
    );
    expect(r.changedFiles).toBe(2);
    expect(r.additions).toBe(4);
    expect(r.deletions).toBe(6);
    expect(r.files[0]?.changeType).toBe("added");
    expect(r.files[1]?.changeType).toBe("modified");
  });

  it("parsePrFiles warns and degrades when files field is missing-shaped", () => {
    const w: string[] = [];
    const r = parsePrFiles({ unexpected: true }, w);
    expect(r.changedFiles).toBe(0);
    expect(w).toContain("files-field-unavailable");
  });

  it("parsePrCommits skips entries without oid", () => {
    const w: string[] = [];
    const r = parsePrCommits(
      [{ oid: "x", messageHeadline: "m" }, { messageHeadline: "no-oid" }],
      w,
    );
    expect(r.length).toBe(1);
    expect(r[0]?.oid).toBe("x");
  });

  it("parsePrChecks summarises a successful rollup as 'success'", () => {
    const w: string[] = [];
    const r = parsePrChecks(
      [
        { name: "build", status: "COMPLETED", conclusion: "SUCCESS" },
        { name: "lint", status: "COMPLETED", conclusion: "SUCCESS" },
      ],
      w,
    );
    expect(r.summary).toBe("success");
    expect(r.passed).toBe(2);
    expect(r.failed).toBe(0);
    expect(r.pending).toBe(0);
  });

  it("parsePrChecks summarises any FAILURE as 'failure'", () => {
    const w: string[] = [];
    const r = parsePrChecks(
      [
        { name: "build", status: "COMPLETED", conclusion: "SUCCESS" },
        { name: "lint", status: "COMPLETED", conclusion: "FAILURE" },
      ],
      w,
    );
    expect(r.summary).toBe("failure");
    expect(r.failed).toBe(1);
  });

  it("parsePrChecks summarises IN_PROGRESS as 'pending'", () => {
    const w: string[] = [];
    const r = parsePrChecks([{ name: "build", status: "IN_PROGRESS", conclusion: null }], w);
    expect(r.summary).toBe("pending");
    expect(r.pending).toBe(1);
  });

  it("parsePrChecks summarises empty rollup as 'none'", () => {
    const w: string[] = [];
    const r = parsePrChecks([], w);
    expect(r.summary).toBe("none");
    expect(r.total).toBe(0);
  });

  it("parsePrReviews aggregates approved / changes-requested / commented", () => {
    const w: string[] = [];
    const r = parsePrReviews(
      [
        { state: "APPROVED" },
        { state: "CHANGES_REQUESTED" },
        { state: "COMMENTED" },
        { state: "DISMISSED" },
      ],
      w,
    );
    expect(r.total).toBe(4);
    expect(r.approved).toBe(1);
    expect(r.changesRequested).toBe(1);
    expect(r.commented).toBe(1);
  });
});

describe("analyzeGithubPr (orchestrator) — happy-path & analysis status", () => {
  let dir: string;

  it("happy path → status='ready-to-review', no review yet flagged", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(123),
          response: { ok: true, stdout: prFixture(), stderr: "" },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 123, cwd: dir, runner });
      expect(result.ok).toBe(true);
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.command).toBe("github.analyze_pr");
      expect(result.data.implemented).toBe(true);
      expect(result.data.noMutation).toBe(true);
      expect(result.data.pr?.author).toBe("alice");
      expect(result.data.changes?.changedFiles).toBe(2);
      expect(result.data.checks?.summary).toBe("success");
      expect(result.data.analysis?.status).toBe("ready-to-review");
      expect(result.data.analysis?.riskFlags).toContain("no-review-yet");
      // no source-without-test flag because tests/foo.test.ts is in the diff
      expect(result.data.analysis?.riskFlags).not.toContain("source-change-without-test-change");
      expect(runner.calls.length).toBe(2);
      // All calls were read-only
      for (const c of runner.calls) {
        expect(c.slice(0, 2)).toMatchObject(c[0] === "auth" ? ["auth", "status"] : ["pr", "view"]);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("failed checks → status='blocked', riskFlags include 'ci-failing'", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(11),
          response: {
            ok: true,
            stdout: prFixture({
              statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "FAILURE" }],
            }),
            stderr: "",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 11, cwd: dir, runner });
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.analysis?.status).toBe("blocked");
      expect(result.data.analysis?.riskFlags).toContain("ci-failing");
      expect(result.data.analysis?.nextSuggestedAction).toMatch(/failing CI/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("pending checks → status='pending-ci', riskFlags include 'ci-pending'", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(12),
          response: {
            ok: true,
            stdout: prFixture({
              statusCheckRollup: [{ name: "build", status: "IN_PROGRESS", conclusion: null }],
            }),
            stderr: "",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 12, cwd: dir, runner });
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.analysis?.status).toBe("pending-ci");
      expect(result.data.analysis?.riskFlags).toContain("ci-pending");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("draft PR → status='draft', riskFlags include 'draft-pr'", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(13),
          response: {
            ok: true,
            stdout: prFixture({ isDraft: true }),
            stderr: "",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 13, cwd: dir, runner });
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.analysis?.status).toBe("draft");
      expect(result.data.analysis?.riskFlags).toContain("draft-pr");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("many files / large diff → both flags raised", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const manyFiles = Array.from({ length: 25 }, (_, i) => ({
        path: `src/file-${i}.ts`,
        additions: 50,
        deletions: 10,
        changeType: "modified",
      }));
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(14),
          response: {
            ok: true,
            stdout: prFixture({ files: manyFiles }),
            stderr: "",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 14, cwd: dir, runner });
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.analysis?.riskFlags).toContain("many-files-changed");
      expect(result.data.analysis?.riskFlags).toContain("large-diff");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("source change without test change → flag raised", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(15),
          response: {
            ok: true,
            stdout: prFixture({
              files: [{ path: "src/foo.ts", additions: 5, deletions: 1, changeType: "modified" }],
            }),
            stderr: "",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 15, cwd: dir, runner });
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.analysis?.riskFlags).toContain("source-change-without-test-change");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("docs-only change → flag raised, no source flag", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(16),
          response: {
            ok: true,
            stdout: prFixture({
              files: [
                { path: "docs/x.md", additions: 5, deletions: 0, changeType: "modified" },
                { path: "README.md", additions: 1, deletions: 0, changeType: "modified" },
              ],
            }),
            stderr: "",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 16, cwd: dir, runner });
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.analysis?.riskFlags).toContain("docs-only-change");
      expect(result.data.analysis?.riskFlags).not.toContain("source-change-without-test-change");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("changes-requested review → status='blocked' with 'changes-requested' flag", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(17),
          response: {
            ok: true,
            stdout: prFixture({
              reviews: [{ state: "CHANGES_REQUESTED" }],
            }),
            stderr: "",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 17, cwd: dir, runner });
      if (!result.ok || !result.data) throw new Error("expected ok");
      expect(result.data.analysis?.status).toBe("blocked");
      expect(result.data.analysis?.riskFlags).toContain("changes-requested");
      expect(result.data.analysis?.nextSuggestedAction).toMatch(/review feedback/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("analyzeGithubPr (orchestrator) — error envelopes", () => {
  let dir: string;

  it("gh not found → reason='gh-not-found', ok=false, code=ERR_IO_OR_CONFIG", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        {
          match: AUTH_ARGS,
          response: {
            ok: false,
            code: "ENOENT",
            message: "gh binary not found",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 1, cwd: dir, runner });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("ERR_IO_OR_CONFIG");
      const data = result.data as { reason?: string; prNumber?: number };
      expect(data.reason).toBe("gh-not-found");
      expect(data.prNumber).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("gh auth required → reason='gh-auth-required'", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        {
          match: AUTH_ARGS,
          response: {
            ok: false,
            code: "EXIT_NONZERO",
            stderr: "You are not authenticated. Run gh auth login.",
            message: "gh auth status failed",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 2, cwd: dir, runner });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("ERR_IO_OR_CONFIG");
      const data = result.data as { reason?: string; prNumber?: number };
      expect(data.reason).toBe("gh-auth-required");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("PR not found → reason='pr-not-found', prNumber set", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(9999),
          response: {
            ok: false,
            code: "EXIT_NONZERO",
            stderr: "GraphQL: Could not resolve to a PullRequest with the number of 9999.",
            message: "gh pr view failed",
          },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 9999, cwd: dir, runner });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const data = result.data as { reason?: string; prNumber?: number };
      expect(data.reason).toBe("pr-not-found");
      expect(data.prNumber).toBe(9999);
      expect(result.message.en).toContain("PR #9999");
      expect(result.message.zh).toContain("9999");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("malformed gh JSON → reason='gh-query-failed' with warning", async () => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-"));
    try {
      const runner = makeRunner([
        { match: AUTH_ARGS, response: AUTH_OK },
        {
          match: prViewArgs(3),
          response: { ok: true, stdout: "{not json", stderr: "" },
        },
      ]);
      const result = await analyzeGithubPr({ prNumber: 3, cwd: dir, runner });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const data = result.data as { reason?: string; warnings?: string[] };
      expect(data.reason).toBe("gh-query-failed");
      expect(data.warnings).toContain("gh-output-not-json");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("source code static check — no forbidden gh / git mutation references", () => {
  it("github-pr.ts and github-pr-runner.ts contain no forbidden gh write subcommands", async () => {
    const { readFileSync } = await import("node:fs");
    const fileURLToPath = (await import("node:url")).fileURLToPath;
    const here = fileURLToPath(import.meta.url);
    const repoRoot = join(here, "..", "..", "..");
    const files = [
      join(repoRoot, "src", "core", "execution-navigator", "github-pr.ts"),
      join(repoRoot, "src", "core", "execution-navigator", "github-pr-runner.ts"),
      join(repoRoot, "src", "core", "execution-navigator", "github-pr-parse.ts"),
      join(repoRoot, "src", "core", "execution-navigator", "github-pr-analysis.ts"),
      join(repoRoot, "src", "cli", "commands", "github.ts"),
    ];
    const FORBIDDEN_LITERALS = [
      // forbidden gh write subcommands
      `"merge"`,
      `"edit"`,
      `"comment"`,
      `"review"`,
      `"close"`,
      `"reopen"`,
      // forbidden git mutation calls — none should appear in this PR's code
      `git push`,
      `git pull`,
      `git fetch`,
      `git commit`,
      `git checkout`,
      `git add`,
      // forbidden gh api write methods
      `--method POST`,
      `--method PATCH`,
      `--method PUT`,
      `--method DELETE`,
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const lit of FORBIDDEN_LITERALS) {
        // We allow `"changed"` substring etc. — the literals checked here
        // are write-action verbs that should never appear adjacent to gh
        // argv arrays in the PR's code. The github-pr-runner allowlist
        // contains only ["pr", "view"] and ["auth", "status"].
        expect(src.includes(lit), `${f} must not contain ${lit}`).toBe(false);
      }
    }
  });
});
