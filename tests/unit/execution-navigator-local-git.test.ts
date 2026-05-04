import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  parsePorcelainV1,
  parseRecentCommits,
  readLocalGit,
} from "../../src/core/execution-navigator/local-git.js";
import { readOcnProjectState } from "../../src/core/execution-navigator/ocn-state-reader.js";
import { getExecStatus } from "../../src/core/execution-navigator/exec-status.js";

const execFileP = promisify(execFile);

// Minimal env for `git commit` to succeed under CI without a global gitconfig.
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

async function initRepoNoCommits(cwd: string): Promise<void> {
  await runGit(["init", "-q", "-b", "main"], cwd);
  // Avoid signing requirements that may exist in user gitconfig.
  await runGit(["config", "commit.gpgsign", "false"], cwd);
  await runGit(["config", "tag.gpgsign", "false"], cwd);
  await runGit(["config", "user.email", "test@example.com"], cwd);
  await runGit(["config", "user.name", "Test Author"], cwd);
}

async function initRepoWithCommit(cwd: string, fileName = "README.md"): Promise<void> {
  await initRepoNoCommits(cwd);
  writeFileSync(join(cwd, fileName), "hello\n", "utf8");
  await runGit(["add", fileName], cwd);
  await runGit(["commit", "-q", "-m", "initial"], cwd);
}

describe("parsePorcelainV1 (pure parser)", () => {
  it("returns empty arrays for empty input", () => {
    const r = parsePorcelainV1("");
    expect(r.stagedFiles).toEqual([]);
    expect(r.unstagedFiles).toEqual([]);
    expect(r.untrackedFiles).toEqual([]);
  });

  it("classifies untracked entries", () => {
    const r = parsePorcelainV1("?? new.md\0?? other.md\0");
    expect(r.untrackedFiles).toEqual(["new.md", "other.md"]);
    expect(r.stagedFiles).toEqual([]);
    expect(r.unstagedFiles).toEqual([]);
  });

  it("classifies staged-only entries (X != ' ', Y == ' ')", () => {
    const r = parsePorcelainV1("M  src/foo.ts\0");
    expect(r.stagedFiles).toEqual(["src/foo.ts"]);
    expect(r.unstagedFiles).toEqual([]);
    expect(r.untrackedFiles).toEqual([]);
  });

  it("classifies unstaged-only entries (X == ' ', Y != ' ')", () => {
    const r = parsePorcelainV1(" M src/foo.ts\0");
    expect(r.unstagedFiles).toEqual(["src/foo.ts"]);
    expect(r.stagedFiles).toEqual([]);
  });

  it("classifies entries staged AND unstaged (XY both set)", () => {
    const r = parsePorcelainV1("MM src/foo.ts\0");
    expect(r.stagedFiles).toEqual(["src/foo.ts"]);
    expect(r.unstagedFiles).toEqual(["src/foo.ts"]);
  });

  it("preserves filenames containing spaces", () => {
    const r = parsePorcelainV1("?? file with spaces.md\0");
    expect(r.untrackedFiles).toEqual(["file with spaces.md"]);
  });

  it("emits both old and new path for a staged rename", () => {
    // Porcelain emits: "R  newpath\0oldpath\0" for renames.
    const r = parsePorcelainV1("R  new/path.ts\0old/path.ts\0");
    expect(r.stagedFiles).toContain("new/path.ts");
    expect(r.stagedFiles).toContain("old/path.ts");
  });
});

describe("parseRecentCommits (pure parser)", () => {
  it("returns empty array for empty input", () => {
    expect(parseRecentCommits("")).toEqual([]);
  });

  it("parses sha\\tsubject lines", () => {
    const out = parseRecentCommits("abc1234\tfeat: thing\nfffffff\tfix: other\n");
    expect(out).toEqual([
      { sha: "abc1234", subject: "feat: thing" },
      { sha: "fffffff", subject: "fix: other" },
    ]);
  });

  it("preserves additional tabs inside the subject", () => {
    const out = parseRecentCommits("abc1234\tfeat: with\textra tab\n");
    expect(out).toEqual([{ sha: "abc1234", subject: "feat: with\textra tab" }]);
  });

  it("skips malformed lines without a tab", () => {
    const out = parseRecentCommits("malformed-without-tab\nabc1234\tok\n");
    expect(out).toEqual([{ sha: "abc1234", subject: "ok" }]);
  });
});

describe("readLocalGit (filesystem-backed)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-localgit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns isGitRepo=false with reason 'not-a-git-repository' for a non-git directory", async () => {
    const r = await readLocalGit(dir);
    expect(r.isGitRepo).toBe(false);
    expect(r.reason).toBe("not-a-git-repository");
  });

  it("handles an empty git repo (no commits)", async () => {
    await initRepoNoCommits(dir);
    const r = await readLocalGit(dir);
    expect(r.isGitRepo).toBe(true);
    expect(r.head).toBeNull();
    expect(r.reason).toBe("no-commits");
    expect(r.recentCommits).toEqual([]);
  });

  it("returns clean state for a fresh single-commit repo", async () => {
    await initRepoWithCommit(dir);
    const r = await readLocalGit(dir);
    expect(r.isGitRepo).toBe(true);
    expect(typeof r.head).toBe("string");
    expect(r.head).not.toBeNull();
    expect(r.isDirty).toBe(false);
    expect(r.changedFiles).toEqual([]);
    expect(r.recentCommits?.length).toBe(1);
    expect(r.recentCommits?.[0]?.subject).toBe("initial");
  });

  it("flags an unstaged modification under unstagedFiles", async () => {
    await initRepoWithCommit(dir);
    writeFileSync(join(dir, "README.md"), "hello\nmodified\n", "utf8");
    const r = await readLocalGit(dir);
    expect(r.isDirty).toBe(true);
    expect(r.unstagedFiles).toContain("README.md");
    expect(r.stagedFiles).toEqual([]);
  });

  it("flags a staged file under stagedFiles", async () => {
    await initRepoWithCommit(dir);
    writeFileSync(join(dir, "added.ts"), "export const x = 1;\n", "utf8");
    await runGit(["add", "added.ts"], dir);
    const r = await readLocalGit(dir);
    expect(r.isDirty).toBe(true);
    expect(r.stagedFiles).toContain("added.ts");
    expect(r.unstagedFiles).toEqual([]);
  });

  it("flags an untracked file under untrackedFiles", async () => {
    await initRepoWithCommit(dir);
    writeFileSync(join(dir, "notes.md"), "todo\n", "utf8");
    const r = await readLocalGit(dir);
    expect(r.untrackedFiles).toContain("notes.md");
  });

  it("returns the commit subject for the last commit", async () => {
    await initRepoWithCommit(dir);
    const r = await readLocalGit(dir);
    expect(r.recentCommits?.[0]?.subject).toBe("initial");
  });

  it("preserves filenames containing spaces", async () => {
    await initRepoWithCommit(dir);
    writeFileSync(join(dir, "file with spaces.md"), "hi\n", "utf8");
    const r = await readLocalGit(dir);
    expect(r.untrackedFiles).toContain("file with spaces.md");
  });

  it("never creates a .ocoding/execution directory", async () => {
    await initRepoWithCommit(dir);
    await readLocalGit(dir);
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
  });
});

describe("readOcnProjectState (read-only state.json inspector)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-state-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns isOcnProject=false when state.json is absent", async () => {
    const r = await readOcnProjectState(dir);
    expect(r.isOcnProject).toBe(false);
    expect(r.reason).toBe("state-missing");
  });

  it("returns structured fields when state.json is valid", async () => {
    mkdirSync(join(dir, ".ocoding"));
    const state = {
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
    };
    writeFileSync(
      join(dir, ".ocoding", "state.json"),
      JSON.stringify(state, null, 2),
      "utf8",
    );
    const r = await readOcnProjectState(dir);
    expect(r.isOcnProject).toBe(true);
    expect(r.sopProfileId).toBe("default-ai-coding-sop");
    expect(r.sopProfileVersion).toBe("0.2.0");
    expect(r.currentStateId).toBe("state_build");
    expect(r.currentStepId).toBe("step_implementation_log");
  });

  it("returns reason=state-unreadable when state.json is malformed JSON", async () => {
    mkdirSync(join(dir, ".ocoding"));
    writeFileSync(join(dir, ".ocoding", "state.json"), "{not json", "utf8");
    const r = await readOcnProjectState(dir);
    expect(r.isOcnProject).toBe(true);
    expect(r.reason).toBe("state-unreadable");
    expect(r.currentStateId).toBeNull();
  });

  it("does NOT create .ocoding/.lock or state.json.bak", async () => {
    mkdirSync(join(dir, ".ocoding"));
    writeFileSync(join(dir, ".ocoding", "state.json"), "{not json", "utf8");
    await readOcnProjectState(dir);
    expect(existsSync(join(dir, ".ocoding", ".lock"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding", "state.json.bak"))).toBe(false);
    // The original malformed file is untouched.
    expect(readFileSync(join(dir, ".ocoding", "state.json"), "utf8")).toBe("{not json");
  });
});

describe("getExecStatus (orchestrator)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-execstatus-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("classifies a non-git directory as status='no-git'", async () => {
    const result = await getExecStatus({ cwd: dir });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) throw new Error("expected ok with data");
    expect(result.data.command).toBe("exec.status");
    expect(result.data.implemented).toBe(true);
    expect(result.data.noMutation).toBe(true);
    expect(result.data.git.isGitRepo).toBe(false);
    expect(result.data.analysis.status).toBe("no-git");
    expect(result.data.analysis.riskFlags).toContain("not-a-git-repository");
    expect(result.data.evidenceSourcesUsed).toContain("git");
    expect(result.data.evidenceSourcesUsed).toContain("ocn-state");
  });

  it("classifies an empty git repo as status='empty-repo'", async () => {
    await initRepoNoCommits(dir);
    const result = await getExecStatus({ cwd: dir });
    if (!result.ok || !result.data) throw new Error("expected ok with data");
    expect(result.data.analysis.status).toBe("empty-repo");
    expect(result.data.analysis.riskFlags).toContain("no-commits");
  });

  it("classifies a clean repo as status='clean'", async () => {
    await initRepoWithCommit(dir);
    const result = await getExecStatus({ cwd: dir });
    if (!result.ok || !result.data) throw new Error("expected ok with data");
    expect(result.data.analysis.status).toBe("clean");
    expect(result.data.analysis.riskFlags).toEqual([]);
  });

  it("classifies a dirty repo as status='dirty' with working-tree-dirty risk flag", async () => {
    await initRepoWithCommit(dir);
    writeFileSync(join(dir, "notes.md"), "todo\n", "utf8");
    const result = await getExecStatus({ cwd: dir });
    if (!result.ok || !result.data) throw new Error("expected ok with data");
    expect(result.data.analysis.status).toBe("dirty");
    expect(result.data.analysis.riskFlags).toContain("working-tree-dirty");
  });

  it("does NOT create .ocoding/execution when the command runs", async () => {
    await initRepoWithCommit(dir);
    await getExecStatus({ cwd: dir });
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
  });
});
