import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// Execution Navigator command skeleton (DEC-024).
//
// MVP 1 (PR 2) graduated `exec status` to a real local-git evidence reader
// — its CLI tests live in `tests/cli/execution-navigator-local-git.test.ts`.
// MVP 2 (PR 3) graduated `github analyze-pr` to a read-only GitHub PR
// analysis reader — its CLI tests live in
// `tests/cli/execution-navigator-github-pr.test.ts`. MVP 3 (PR 4) graduated
// `evidence map` to a deterministic acceptance evidence mapper — its CLI
// tests live in `tests/cli/execution-navigator-evidence-map.test.ts`. The
// three remaining commands below remain skeleton.
//
// These tests assert the skeleton boundary:
//   - structured JSON envelope per remaining skeleton command
//   - implemented:false on every remaining skeleton command
//   - validation failure path on `github analyze-pr <not-an-int>` is still
//     enforced before any gh invocation (graduated command keeps the same
//     ERR_ARTIFACT_INVALID validation pre-check)
//   - no `.ocoding/execution` directory is created
//   - no GitHub auth env var is required to run any of these commands
describe("ocn execution-navigator commands (skeleton — three remaining commands)", () => {
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

  it("ocn evidence map --json against an empty temp project returns implemented=true with no-acceptance-criteria coverage", async () => {
    // MVP 3: `evidence.map` is now implemented. In a temp project that has
    // no `docs/03-acceptance-criteria.md`, the command degrades gracefully
    // to `coverageStatus: "no-acceptance-criteria"` and stays ok.
    const result = await spawnOcn(["evidence", "map", "--json"], {
      cwd: project.cwd,
      env: stripGhEnv(),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.command).toBe("evidence.map");
    expect(parsed.data.implemented).toBe(true);
    expect(parsed.data.acceptance.found).toBe(false);
    expect(parsed.data.mapping.coverageStatus).toBe("no-acceptance-criteria");
    expect(parsed.data.evidenceSourcesUsed).toContain("local-git");
    expect(parsed.data.evidenceSourcesUsed).toContain("ocn-state");
    expect(parsed.data.evidenceSourcesUsed).not.toContain("github");
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

  it("none of the implemented or skeleton execution-navigator commands create .ocoding/execution", async () => {
    const env = stripGhEnv();
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
