import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-006 / DEC-031 — CLI integration for the machine-facing hook handlers.
// These bypass the CommandResult envelope: raw Claude Code contract output.

describe("ocn hook (AM-006)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("hook stop on a blocked project emits a decision:block JSON and exits 0", async () => {
    const result = await spawnOcn(["hook", "stop"], {
      cwd: project.cwd,
      stdin: '{"session_id":"s","stop_hook_active":false}',
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as { decision: string; reason: string };
    expect(parsed.decision).toBe("block");
    expect(parsed.reason).toContain("OCN 门禁未通过");
  }, 30_000);

  it("hook stop with stop_hook_active=true allows silently (loop protection)", async () => {
    const result = await spawnOcn(["hook", "stop"], {
      cwd: project.cwd,
      stdin: '{"stop_hook_active":true}',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("");
  }, 30_000);

  it("hook stop without stdin does not hang and exits 0 (uninitialized dir)", async () => {
    const empty = await createTempProject();
    try {
      const result = await spawnOcn(["hook", "stop"], { cwd: empty.cwd, timeoutMs: 15_000 });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("");
    } finally {
      await empty.cleanup();
    }
  }, 30_000);

  it("hook post-edit with a failing configured lint exits 2 with stderr feedback", async () => {
    await fs.writeFile(
      join(project.cwd, ".ocoding", "config.yaml"),
      'commands:\n  lint: "echo broken >&2; exit 1"\n',
      "utf8",
    );
    const result = await spawnOcn(["hook", "post-edit"], {
      cwd: project.cwd,
      stdin: '{"tool_name":"Edit","tool_input":{"file_path":"a.ts"}}',
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("broken");
  }, 30_000);

  it("hook post-edit with nothing configured exits 0 silently", async () => {
    const result = await spawnOcn(["hook", "post-edit"], {
      cwd: project.cwd,
      stdin: '{"tool_name":"Write","tool_input":{"file_path":"b.md"}}',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr.trim()).toBe("");
  }, 30_000);
});
