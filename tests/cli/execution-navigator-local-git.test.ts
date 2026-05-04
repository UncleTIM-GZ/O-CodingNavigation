import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";

const execFileP = promisify(execFile);

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

async function captureGitState(cwd: string): Promise<string> {
  const { stdout } = await execFileP("git", ["status", "--porcelain=v1", "-z"], { cwd });
  const log = await execFileP("git", ["log", "--oneline", "-n", "10"], { cwd }).catch(
    () => ({ stdout: "" }),
  );
  return `${stdout}|||${log.stdout}`;
}

describe("ocn exec status — local git evidence (DEC-024 MVP 1)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-exec-cli-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns implemented=true with structured git data in --json mode", async () => {
    await initRepoWithCommit(dir);
    const result = await spawnOcn(["exec", "status", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.command).toBe("exec.status");
    expect(parsed.data.implemented).toBe(true);
    expect(parsed.data.noMutation).toBe(true);
    expect(parsed.data.evidenceSourcesUsed).toContain("git");
    expect(parsed.data.evidenceSourcesUsed).toContain("ocn-state");
    expect(parsed.data.git.isGitRepo).toBe(true);
    expect(typeof parsed.data.git.head).toBe("string");
    expect(parsed.data.git.isDirty).toBe(false);
    expect(typeof parsed.message.en).toBe("string");
    expect(typeof parsed.message.zh).toBe("string");
  }, 30_000);

  it("reports isGitRepo=false in a non-git directory and exits 0", async () => {
    const result = await spawnOcn(["exec", "status", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.git.isGitRepo).toBe(false);
    expect(parsed.data.analysis.status).toBe("no-git");
    expect(parsed.data.ocn.isOcnProject).toBe(false);
  }, 30_000);

  it("text output contains branch, dirty/clean state, and HEAD short SHA", async () => {
    await initRepoWithCommit(dir);
    const result = await spawnOcn(["exec", "status"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Branch:\s+main/);
    expect(result.stdout).toMatch(/HEAD:\s+[0-9a-f]{4,}/);
    expect(result.stdout).toMatch(/Working tree:\s+clean/);
  }, 30_000);

  it("--project-root <abs> works with an absolute path", async () => {
    await initRepoWithCommit(dir);
    // Run from a different cwd; pass the project via --project-root.
    const otherCwd = mkdtempSync(join(tmpdir(), "ocn-exec-cli-cwd-"));
    try {
      const result = await spawnOcn(
        ["exec", "status", "--project-root", dir, "--json"],
        { cwd: otherCwd },
      );
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.data.git.isGitRepo).toBe(true);
    } finally {
      await rm(otherCwd, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects a non-absolute --project-root with ERR_IO_OR_CONFIG (exit 4)", async () => {
    const result = await spawnOcn(
      ["exec", "status", "--project-root", "relative/path", "--json"],
      { cwd: dir },
    );
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
    expect(parsed.message.en).toMatch(/absolute/);
    expect(parsed.message.zh).toMatch(/绝对路径/);
  }, 30_000);

  it("does not mutate the working tree (git state identical before and after)", async () => {
    await initRepoWithCommit(dir);
    writeFileSync(join(dir, "uncommitted.md"), "scratch\n", "utf8");
    const before = await captureGitState(dir);
    await spawnOcn(["exec", "status"], { cwd: dir });
    await spawnOcn(["exec", "status", "--json"], { cwd: dir });
    const after = await captureGitState(dir);
    expect(after).toBe(before);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
  }, 30_000);

  it("reports OCN project state when .ocoding/state.json is present", async () => {
    await initRepoWithCommit(dir);
    const ocoding = join(dir, ".ocoding");
    // Use Node fs directly instead of running `ocn init` (which writes
    // additional files); we just need a valid state.json fixture.
    const { mkdirSync } = await import("node:fs");
    mkdirSync(ocoding);
    writeFileSync(
      join(ocoding, "state.json"),
      JSON.stringify(
        {
          schemaVersion: "1.0",
          project: {
            projectId: "p1",
            name: "Test Project",
            tier: "minimal",
            sopProfileId: "default-ai-coding-sop",
            sopProfileVersion: "0.2.0",
          },
          currentStateId: "state_build",
          currentStepId: "step_implementation_log",
          artifacts: {},
          latestGateResult: null,
        },
        null,
        2,
      ),
      "utf8",
    );
    // Stage this fixture so the working tree is no longer "dirty" — the test
    // is about OCN-state surfacing, not about git classification.
    await runGit(["add", ".ocoding/state.json"], dir);
    await runGit(["commit", "-q", "-m", "add ocn state fixture"], dir);

    const result = await spawnOcn(["exec", "status", "--json"], { cwd: dir });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.ocn.isOcnProject).toBe(true);
    expect(parsed.data.ocn.sopProfileId).toBe("default-ai-coding-sop");
    expect(parsed.data.ocn.sopProfileVersion).toBe("0.2.0");
    expect(parsed.data.ocn.currentStateId).toBe("state_build");
    expect(parsed.data.ocn.currentStepId).toBe("step_implementation_log");
  }, 30_000);
});
