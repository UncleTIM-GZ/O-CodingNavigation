import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// Execution Navigator command skeleton (DEC-024 PR 1).
//
// These tests assert the skeleton boundary:
//   - structured JSON envelope per command
//   - implemented:false on every command
//   - validation failure path on `github analyze-pr <not-an-int>`
//   - no `.ocoding/execution` directory is created
//   - no GitHub auth env var is required to run any of these commands
describe("ocn execution-navigator commands (skeleton — DEC-024 PR 1)", () => {
  let project: TempProject;

  // Stripped env: explicitly remove any GitHub credentials so we prove these
  // commands do not require auth. We do not pass GH_TOKEN / GITHUB_TOKEN.
  const stripGhEnv = (): NodeJS.ProcessEnv => {
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env["GH_TOKEN"];
    delete env["GITHUB_TOKEN"];
    return env;
  };

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("ocn exec status --json returns ok and implemented=false", async () => {
    const result = await spawnOcn(["exec", "status", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data.command).toBe("exec.status");
    expect(parsed.data.implemented).toBe(false);
    expect(parsed.data.status).toBe("planned");
    expect(parsed.data.noMutation).toBe(true);
    expect(parsed.data.evidenceSourcesPlanned).toEqual(["git"]);
    expect(parsed.data.nextImplementation).toBe("local-git evidence ingestion");
    expect(typeof parsed.message.en).toBe("string");
    expect(typeof parsed.message.zh).toBe("string");
  }, 30_000);

  it("ocn github analyze-pr 123 --json returns ok and implemented=false", async () => {
    const result = await spawnOcn(["github", "analyze-pr", "123", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("github.analyze_pr");
    expect(parsed.data.implemented).toBe(false);
    expect(parsed.data.evidenceSourcesPlanned).toEqual(["github"]);
  }, 30_000);

  it("ocn github analyze-pr abc --json returns validation failure (ERR_ARTIFACT_INVALID, exit 2)", async () => {
    const result = await spawnOcn(["github", "analyze-pr", "abc", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    expect(parsed.message.en).toMatch(/Invalid PR number/);
    expect(parsed.message.zh).toMatch(/PR 编号/);
  }, 30_000);

  it("ocn evidence map --json returns ok skeleton", async () => {
    const result = await spawnOcn(["evidence", "map", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("evidence.map");
    expect(parsed.data.implemented).toBe(false);
    expect(parsed.data.evidenceSourcesPlanned).toEqual(["git", "github", "ci"]);
  }, 30_000);

  it("ocn next-prompt --json returns ok skeleton", async () => {
    const result = await spawnOcn(["next-prompt", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("next_prompt");
    expect(parsed.data.implemented).toBe(false);
    expect(parsed.data.evidenceSourcesPlanned).toEqual(["git", "github", "ci"]);
  }, 30_000);

  it("ocn verify status --json returns ok skeleton", async () => {
    const result = await spawnOcn(["verify", "status", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("verify.status");
    expect(parsed.data.implemented).toBe(false);
    expect(parsed.data.evidenceSourcesPlanned).toEqual(["github", "ci"]);
  }, 30_000);

  it("ocn verdict draft --json returns ok skeleton", async () => {
    const result = await spawnOcn(["verdict", "draft", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("verdict.draft");
    expect(parsed.data.implemented).toBe(false);
    expect(parsed.data.evidenceSourcesPlanned).toEqual(["git", "github", "ci"]);
  }, 30_000);

  it("none of the skeleton commands create .ocoding/execution", async () => {
    const env = stripGhEnv();
    await spawnOcn(["exec", "status", "--json"], { cwd: project.cwd, env });
    await spawnOcn(["github", "analyze-pr", "1", "--json"], { cwd: project.cwd, env });
    await spawnOcn(["evidence", "map", "--json"], { cwd: project.cwd, env });
    await spawnOcn(["next-prompt", "--json"], { cwd: project.cwd, env });
    await spawnOcn(["verify", "status", "--json"], { cwd: project.cwd, env });
    await spawnOcn(["verdict", "draft", "--json"], { cwd: project.cwd, env });
    expect(existsSync(join(project.cwd, ".ocoding", "execution"))).toBe(false);
    expect(existsSync(join(project.cwd, ".ocoding"))).toBe(false);
  }, 60_000);

  it("--help advertises the new Execution Navigator commands", async () => {
    const result = await spawnOcn(["--help"], { cwd: project.cwd, env: stripGhEnv() });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\bexec\b/);
    expect(result.stdout).toMatch(/\bgithub\b/);
    expect(result.stdout).toMatch(/\bevidence\b/);
    expect(result.stdout).toMatch(/\bnext-prompt\b/);
    expect(result.stdout).toMatch(/\bverify\b/);
    expect(result.stdout).toMatch(/\bverdict\b/);
  }, 30_000);
});
