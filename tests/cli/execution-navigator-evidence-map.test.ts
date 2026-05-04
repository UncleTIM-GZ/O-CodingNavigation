import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";

const execFileP = promisify(execFile);

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

const GIT_TEST_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test Author",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test Author",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

async function runGit(args: readonly string[], cwd: string): Promise<void> {
  await execFileP("git", [...args], { cwd, env: GIT_TEST_ENV });
}

async function initRepoWithCommit(cwd: string): Promise<void> {
  await runGit(["init", "-q", "-b", "main"], cwd);
  await runGit(["config", "commit.gpgsign", "false"], cwd);
  await runGit(["config", "tag.gpgsign", "false"], cwd);
  await runGit(["config", "user.email", "test@example.com"], cwd);
  await runGit(["config", "user.name", "Test Author"], cwd);
  writeFileSync(join(cwd, "README.md"), "hello\n", "utf8");
  await runGit(["add", "README.md"], cwd);
  await runGit(["commit", "-q", "-m", "initial"], cwd);
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

function snapshotTree(root: string): readonly string[] {
  const out: string[] = [];
  function walk(p: string): void {
    if (!existsSync(p)) return;
    const stat = statSync(p);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(p)) {
        walk(join(p, entry));
      }
    } else {
      out.push(p);
    }
  }
  walk(root);
  return out.sort();
}

function writeAcceptanceFile(dir: string, body: string): void {
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "03-acceptance-criteria.md"), body, "utf8");
}

describe("ocn evidence map — acceptance evidence mapping (DEC-024 MVP 3)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-evidence-map-cli-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("happy path: --json against a small AC file returns evidence-found mapping", async () => {
    await initRepoWithCommit(dir);
    writeAcceptanceFile(
      dir,
      "## Acceptance Criteria\n\n- AC-001 user can run ocn init from the CLI\n",
    );
    // Touch a file the criterion's keywords match — but commit it so working
    // tree stays clean (avoids triggering working-tree-dirty risk flag).
    mkdirSync(join(dir, "src", "cli", "commands"), { recursive: true });
    writeFileSync(join(dir, "src", "cli", "commands", "init.ts"), "// init\n", "utf8");
    await runGit(["add", "src/cli/commands/init.ts"], dir);
    await runGit(["commit", "-q", "-m", "feat: add init command"], dir);

    const result = await spawnOcn(["evidence", "map", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.command).toBe("evidence.map");
    expect(parsed.data.implemented).toBe(true);
    expect(parsed.data.noMutation).toBe(true);
    expect(parsed.data.acceptance.found).toBe(true);
    expect(parsed.data.acceptance.criteriaCount).toBe(1);
    expect(parsed.data.evidenceSourcesUsed).toContain("local-git");
    expect(parsed.data.evidenceSourcesUsed).toContain("ocn-state");
    expect(parsed.data.evidenceSourcesUsed).not.toContain("github");
  }, 30_000);

  it("text mode prints coverage line and at least one mapping item", async () => {
    writeAcceptanceFile(
      dir,
      "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n",
    );
    const result = await spawnOcn(["evidence", "map"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Acceptance criteria:\s+1/);
    expect(result.stdout).toMatch(/Coverage:\s+/);
    expect(result.stdout).toMatch(/\[.+\]\s+AC-001/);
    expect(result.stdout).toMatch(/Next:\s+/);
  }, 30_000);

  it("--pr 64 --json passes through the gh fixture runner and includes github evidence", async () => {
    await initRepoWithCommit(dir);
    writeAcceptanceFile(
      dir,
      "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n",
    );
    const prJson = JSON.stringify({
      number: 64,
      title: "feat: example",
      body: "PR body",
      state: "OPEN",
      author: { login: "alice" },
      headRefName: "feat/x",
      baseRefName: "main",
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      isDraft: false,
      url: "https://github.com/x/y/pull/64",
      commits: [{ oid: "abc1234", messageHeadline: "feat: init" }],
      files: [{ path: "src/cli/commands/init.ts", additions: 10, deletions: 0, changeType: "modified" }],
      reviews: [],
      statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
    });
    const fixturePath = writeFixture(dir, [
      { args: ["auth", "status"], ok: true, stdout: "", stderr: "Logged in" },
      { args: ["pr", "view", "64", "--json", PR_VIEW_FIELDS], ok: true, stdout: prJson, stderr: "" },
    ]);
    const result = await spawnOcn(["evidence", "map", "--pr", "64", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.evidenceSourcesUsed).toContain("github");
  }, 30_000);

  it("invalid --pr abc returns ERR_ARTIFACT_INVALID and runner is not invoked", async () => {
    writeAcceptanceFile(
      dir,
      "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n",
    );
    const fixturePath = writeFixture(dir, [
      { args: ["unreachable"], ok: false, code: "OTHER", message: "runner-was-called" },
    ]);
    const result = await spawnOcn(["evidence", "map", "--pr", "abc", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(result.stdout).not.toMatch(/runner-was-called/);
  }, 30_000);

  it("missing AC file → coverageStatus=no-acceptance-criteria, ok=true, exit 0", async () => {
    const result = await spawnOcn(["evidence", "map", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.acceptance.found).toBe(false);
    expect(parsed.data.mapping.coverageStatus).toBe("no-acceptance-criteria");
  }, 30_000);

  it("does not mutate the project tree (snapshot before/after, no .ocoding/execution)", async () => {
    writeAcceptanceFile(
      dir,
      "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n",
    );
    const before = snapshotTree(dir);
    await spawnOcn(["evidence", "map", "--json"], { cwd: dir });
    const after = snapshotTree(dir);
    expect(after).toEqual(before);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
  }, 30_000);
});
