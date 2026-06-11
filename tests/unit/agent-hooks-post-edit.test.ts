import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runPostEditHook } from "../../src/core/agent-hooks/post-edit-hook.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-006 / DEC-031 — PostToolUse-hook engine: configured commands.lint /
// commands.typecheck give fast feedback; unconfigured → silent no-op.

async function writeCommands(cwd: string, yaml: string): Promise<void> {
  await fs.writeFile(join(cwd, ".ocoding", "config.yaml"), yaml, "utf8");
}

function payloadFor(filePath: string): Record<string, unknown> {
  return { tool_name: "Edit", tool_input: { file_path: filePath } };
}

describe("runPostEditHook (AM-006)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("is a silent no-op in an uninitialized directory", async () => {
    const outcome = await runPostEditHook({ cwd: project.cwd, payload: payloadFor("a.ts") });
    expect(outcome.ok).toBe(true);
  });

  it("is a silent no-op when no commands are configured", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const outcome = await runPostEditHook({ cwd: project.cwd, payload: payloadFor("a.ts") });
    expect(outcome.ok).toBe(true);
  });

  it("is a silent no-op when the payload has no file_path", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    await writeCommands(project.cwd, "commands:\n  lint: exit 1\n");
    const outcome = await runPostEditHook({ cwd: project.cwd, payload: { tool_name: "Edit" } });
    expect(outcome.ok).toBe(true);
  });

  it("returns failure feedback with the command output tail when lint fails", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    await writeCommands(project.cwd, 'commands:\n  lint: "echo lint-error-detail >&2; exit 1"\n');
    const outcome = await runPostEditHook({ cwd: project.cwd, payload: payloadFor("README.md") });
    expect(outcome.ok).toBe(false);
    expect(outcome.feedback).toContain("lint-error-detail");
    expect(outcome.feedback).toContain("failed｜命令失败");
  });

  it("runs typecheck only for TypeScript files", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const marker = join(project.cwd, "typecheck-ran");
    await writeCommands(project.cwd, `commands:\n  typecheck: "touch ${marker}; exit 1"\n`);

    const mdOutcome = await runPostEditHook({ cwd: project.cwd, payload: payloadFor("note.md") });
    expect(mdOutcome.ok).toBe(true);
    await expect(fs.stat(marker)).rejects.toThrow();

    const tsOutcome = await runPostEditHook({ cwd: project.cwd, payload: payloadFor("src/a.ts") });
    expect(tsOutcome.ok).toBe(false);
    await expect(fs.stat(marker)).resolves.toBeDefined();
  });

  it("lint runs before typecheck and short-circuits on failure", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    const marker = join(project.cwd, "typecheck-ran");
    await writeCommands(
      project.cwd,
      `commands:\n  lint: "exit 1"\n  typecheck: "touch ${marker}"\n`,
    );
    const outcome = await runPostEditHook({ cwd: project.cwd, payload: payloadFor("src/a.ts") });
    expect(outcome.ok).toBe(false);
    await expect(fs.stat(marker)).rejects.toThrow();
  });

  it("clips long output to ~2000 chars keeping the tail", async () => {
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    await writeCommands(
      project.cwd,
      'commands:\n  lint: "for i in $(seq 1 500); do echo filler-line-$i; done; echo FINAL-SUMMARY >&2; exit 1"\n',
    );
    const outcome = await runPostEditHook({ cwd: project.cwd, payload: payloadFor("a.js") });
    expect(outcome.ok).toBe(false);
    expect((outcome.feedback ?? "").length).toBeLessThanOrEqual(2100);
    expect(outcome.feedback).toContain("FINAL-SUMMARY");
  });
});
