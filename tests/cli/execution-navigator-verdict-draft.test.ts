import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";

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

describe("ocn verdict draft — evidence-derived verdict draft (DEC-024 MVP 6)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-cli-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("text mode prints 'Verdict:' line", async () => {
    writePackageJson(dir);
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const result = await spawnOcn(["verdict", "draft"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Verdict:/);
    expect(result.stdout).toMatch(/Confidence:/);
    expect(result.stdout).toMatch(/Why:/);
    expect(result.stdout).toMatch(/Blocks:/);
  }, 30_000);

  it("--json returns envelope with implemented:true and verdict.category set", async () => {
    writePackageJson(dir);
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const result = await spawnOcn(["verdict", "draft", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("verdict.draft");
    expect(parsed.data.implemented).toBe(true);
    expect(parsed.data.noMutation).toBe(true);
    expect(typeof parsed.data.verdict.category).toBe("string");
  }, 30_000);

  it("--mode local --json excludes github from sources", async () => {
    writePackageJson(dir);
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const result = await spawnOcn(["verdict", "draft", "--mode", "local", "--json"], {
      cwd: dir,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.mode).toBe("local");
    expect(parsed.data.evidenceSourcesUsed).not.toContain("github");
  }, 30_000);

  it("--mode combined --pr 67 --json with mocked gh runner asserts evidenceSourcesUsed includes github", async () => {
    writePackageJson(dir);
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const prJson = JSON.stringify({
      number: 67,
      title: "feat: example",
      body: "PR body",
      state: "OPEN",
      author: { login: "alice" },
      headRefName: "feat/x",
      baseRefName: "main",
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      isDraft: false,
      url: "https://github.com/x/y/pull/67",
      commits: [{ oid: "abc1234", messageHeadline: "feat: init" }],
      files: [
        { path: "src/cli/commands/init.ts", additions: 10, deletions: 0, changeType: "modified" },
      ],
      reviews: [],
      statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
    });
    const fixturePath = writeFixture(dir, [
      { args: ["auth", "status"], ok: true, stdout: "", stderr: "Logged in" },
      { args: ["pr", "view", "67", "--json", PR_VIEW_FIELDS], ok: true, stdout: prJson, stderr: "" },
    ]);
    const result = await spawnOcn(
      ["verdict", "draft", "--mode", "combined", "--pr", "67", "--json"],
      { cwd: dir, env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath } },
    );
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.evidenceSourcesUsed).toContain("github");
  }, 30_000);

  it("invalid --mode foo returns ERR_ARTIFACT_INVALID exit 2", async () => {
    const result = await spawnOcn(["verdict", "draft", "--mode", "foo", "--json"], {
      cwd: dir,
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.message.en).toMatch(/Invalid --mode/);
  }, 30_000);

  it("invalid --pr abc returns ERR_ARTIFACT_INVALID and runner mock not called", async () => {
    const fixturePath = writeFixture(dir, [
      { args: ["unreachable"], ok: false, code: "OTHER", message: "runner-was-called" },
    ]);
    const result = await spawnOcn(["verdict", "draft", "--pr", "abc", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(result.stdout).not.toMatch(/runner-was-called/);
  }, 30_000);

  it("--mode pr without --pr returns ERR_ARTIFACT_INVALID exit 2", async () => {
    const result = await spawnOcn(["verdict", "draft", "--mode", "pr", "--json"], {
      cwd: dir,
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.message.en).toMatch(/mode `pr` requires `--pr/);
  }, 30_000);

  it("does not create .ocoding/execution", async () => {
    await spawnOcn(["verdict", "draft", "--json"], { cwd: dir });
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
  }, 30_000);
});
