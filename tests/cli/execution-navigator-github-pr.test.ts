import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";

// Test injection: when OCN_TEST_GH_RUNNER_FIXTURES is set, the CLI loads a
// fake `gh` runner that returns canned stdout/stderr per matching argv.
// This keeps end-to-end tests deterministic without real network / auth.
//
// Each fixture file is a JSON object: { entries: [{ args, ok, stdout, stderr, ... }] }.

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

function prViewArgs(prNumber: number): string[] {
  return ["pr", "view", String(prNumber), "--json", PR_VIEW_FIELDS];
}

function prFixtureJson(overrides: Record<string, unknown> = {}): string {
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

interface FixtureEntry {
  args: string[];
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  code?: "ENOENT" | "EXIT_NONZERO" | "OTHER";
  exitCode?: number;
  message?: string;
}

function writeFixture(dir: string, entries: FixtureEntry[]): string {
  const path = join(dir, "gh-fixture.json");
  writeFileSync(path, JSON.stringify({ entries }), "utf8");
  return path;
}

describe("ocn github analyze-pr — read-only GitHub PR analysis (DEC-024 MVP 2)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-ghpr-cli-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("validation failure: ocn github analyze-pr abc --json (ERR_ARTIFACT_INVALID, exit 2) — runner not invoked", async () => {
    // Provide a fixture but make it impossible to match — if the runner ran,
    // the test would still observe behaviour from a non-matching fixture
    // (returns OTHER error). The validation pre-check happens BEFORE the
    // runner is ever constructed, so we assert exit code 2 + no fixture
    // load attempted.
    const fixturePath = writeFixture(dir, [
      { args: ["unreachable"], ok: false, code: "OTHER", message: "runner-was-called" },
    ]);
    const result = await spawnOcn(["github", "analyze-pr", "abc", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    // Runner-was-called message must NOT appear; validation failed before runner.
    expect(result.stdout).not.toMatch(/runner-was-called/);
  }, 30_000);

  it("validation failure: zero is blocked (positive integer required)", async () => {
    const r1 = await spawnOcn(["github", "analyze-pr", "0", "--json"], { cwd: dir });
    expect(r1.exitCode).toBe(2);
    const parsed = JSON.parse(r1.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
  }, 30_000);

  it("happy path: --json returns implemented=true with structured PR data", async () => {
    const fixturePath = writeFixture(dir, [
      { args: ["auth", "status"], ok: true, stdout: "", stderr: "Logged in" },
      { args: prViewArgs(123), ok: true, stdout: prFixtureJson(), stderr: "" },
    ]);
    const result = await spawnOcn(["github", "analyze-pr", "123", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.command).toBe("github.analyze_pr");
    expect(parsed.data.implemented).toBe(true);
    expect(parsed.data.noMutation).toBe(true);
    expect(parsed.data.evidenceSourcesUsed).toContain("github");
    expect(parsed.data.evidenceSourcesUsed).toContain("ocn-state");
    expect(parsed.data.pr.number).toBe(123);
    expect(parsed.data.pr.author).toBe("alice");
    expect(parsed.data.changes.changedFiles).toBe(2);
    expect(parsed.data.checks.summary).toBe("success");
    expect(parsed.data.analysis.status).toBe("ready-to-review");
  }, 30_000);

  it("text mode: prints PR header, branch, mergeable, checks summary, Next: line", async () => {
    const fixturePath = writeFixture(dir, [
      { args: ["auth", "status"], ok: true, stdout: "", stderr: "Logged in" },
      { args: prViewArgs(123), ok: true, stdout: prFixtureJson(), stderr: "" },
    ]);
    const result = await spawnOcn(["github", "analyze-pr", "123"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/PR:\s+#123/);
    expect(result.stdout).toMatch(/State:\s+OPEN/);
    expect(result.stdout).toMatch(/Branch:\s+feature\/example -> main/);
    expect(result.stdout).toMatch(/Mergeable:\s+MERGEABLE/);
    expect(result.stdout).toMatch(/Checks:\s+success/);
    expect(result.stdout).toMatch(/Next:\s+/);
  }, 30_000);

  it("gh-not-found: env runner reports ENOENT → reason=gh-not-found, exit 4", async () => {
    const fixturePath = writeFixture(dir, [
      {
        args: ["auth", "status"],
        ok: false,
        code: "ENOENT",
        message: "gh binary not found",
      },
    ]);
    const result = await spawnOcn(["github", "analyze-pr", "123", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
    expect(parsed.data.reason).toBe("gh-not-found");
    expect(parsed.data.prNumber).toBe(123);
  }, 30_000);

  it("gh-auth-required: stderr contains 'gh auth login' → reason=gh-auth-required", async () => {
    const fixturePath = writeFixture(dir, [
      {
        args: ["auth", "status"],
        ok: false,
        code: "EXIT_NONZERO",
        stderr: "You are not authenticated. Run gh auth login.",
        message: "gh auth status failed",
      },
    ]);
    const result = await spawnOcn(["github", "analyze-pr", "123", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
    expect(parsed.data.reason).toBe("gh-auth-required");
  }, 30_000);

  it("pr-not-found: stderr contains GraphQL not-found → reason=pr-not-found", async () => {
    const fixturePath = writeFixture(dir, [
      { args: ["auth", "status"], ok: true, stdout: "", stderr: "Logged in" },
      {
        args: prViewArgs(9999),
        ok: false,
        code: "EXIT_NONZERO",
        stderr: "GraphQL: Could not resolve to a PullRequest with the number of 9999.",
        message: "gh pr view failed",
      },
    ]);
    const result = await spawnOcn(["github", "analyze-pr", "9999", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
    expect(parsed.data.reason).toBe("pr-not-found");
    expect(parsed.data.prNumber).toBe(9999);
    expect(parsed.message.en).toContain("PR #9999");
  }, 30_000);

  it("rejects non-absolute --project-root with ERR_IO_OR_CONFIG (exit 4) before invoking runner", async () => {
    const fixturePath = writeFixture(dir, [
      {
        args: ["unreachable"],
        ok: false,
        code: "OTHER",
        message: "runner-was-called",
      },
    ]);
    const result = await spawnOcn(
      ["github", "analyze-pr", "123", "--project-root", "relative/path", "--json"],
      {
        cwd: dir,
        env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
      },
    );
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
    expect(result.stdout).not.toMatch(/runner-was-called/);
  }, 30_000);

  it("does not create .ocoding/execution and does not mutate the working tree", async () => {
    const fixturePath = writeFixture(dir, [
      { args: ["auth", "status"], ok: true, stdout: "", stderr: "Logged in" },
      { args: prViewArgs(123), ok: true, stdout: prFixtureJson(), stderr: "" },
    ]);
    await spawnOcn(["github", "analyze-pr", "123", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
  }, 30_000);
});
