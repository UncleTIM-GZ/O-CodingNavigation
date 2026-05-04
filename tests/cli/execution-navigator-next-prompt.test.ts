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

function writeAcceptance(dir: string, body: string): void {
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "03-acceptance-criteria.md"), body, "utf8");
}

describe("ocn next-prompt — agent prompt generator (DEC-024 MVP 4)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-next-prompt-cli-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("text mode prints header line + # Agent Task Brief", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const result = await spawnOcn(["next-prompt"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Agent:\s+generic\s+\|\s+Mode:\s+continue/);
    expect(result.stdout).toContain("# Agent Task Brief");
  }, 30_000);

  it("--json returns envelope with implemented:true and non-empty prompt", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const result = await spawnOcn(["next-prompt", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("next_prompt");
    expect(parsed.data.implemented).toBe(true);
    expect(parsed.data.noMutation).toBe(true);
    expect(typeof parsed.data.prompt).toBe("string");
    expect(parsed.data.prompt.length).toBeGreaterThan(0);
  }, 30_000);

  it("--agent claude-code --mode fix overlay present", async () => {
    const result = await spawnOcn(
      ["next-prompt", "--agent", "claude-code", "--mode", "fix", "--json"],
      { cwd: dir },
    );
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.agent).toBe("claude-code");
    expect(parsed.data.mode).toBe("fix");
    expect(parsed.data.prompt).toContain("Target: Claude Code");
  }, 30_000);

  it("--pr 65 --json includes github evidence via fixture runner", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const prJson = JSON.stringify({
      number: 65,
      title: "feat: example",
      body: "PR body",
      state: "OPEN",
      author: { login: "alice" },
      headRefName: "feat/x",
      baseRefName: "main",
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      isDraft: false,
      url: "https://github.com/x/y/pull/65",
      commits: [{ oid: "abc1234", messageHeadline: "feat: init" }],
      files: [
        { path: "src/cli/commands/init.ts", additions: 10, deletions: 0, changeType: "modified" },
      ],
      reviews: [],
      statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
    });
    const fixturePath = writeFixture(dir, [
      { args: ["auth", "status"], ok: true, stdout: "", stderr: "Logged in" },
      { args: ["pr", "view", "65", "--json", PR_VIEW_FIELDS], ok: true, stdout: prJson, stderr: "" },
    ]);
    const result = await spawnOcn(["next-prompt", "--pr", "65", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.evidenceSourcesUsed).toContain("github");
    expect(parsed.data.prompt).toContain("pr: #65");
  }, 30_000);

  it("invalid --agent foo returns ERR_ARTIFACT_INVALID exit 2", async () => {
    const result = await spawnOcn(["next-prompt", "--agent", "foo", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.message.en).toMatch(/Invalid --agent/);
  }, 30_000);

  it("invalid --mode bar returns ERR_ARTIFACT_INVALID exit 2", async () => {
    const result = await spawnOcn(["next-prompt", "--mode", "bar", "--json"], { cwd: dir });
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
    const result = await spawnOcn(["next-prompt", "--pr", "abc", "--json"], {
      cwd: dir,
      env: { OCN_TEST_GH_RUNNER_FIXTURES: fixturePath },
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(result.stdout).not.toMatch(/runner-was-called/);
  }, 30_000);

  it("does not create .ocoding/execution", async () => {
    await spawnOcn(["next-prompt", "--json"], { cwd: dir });
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
  }, 30_000);
});
