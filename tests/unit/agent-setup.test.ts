import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import { setupAgentIntegration } from "../../src/core/agent-setup/setup.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-006 / DEC-031 — `ocn agent setup` core: four surfaces, idempotent,
// merge-not-overwrite, all-or-nothing on malformed settings.

describe("setupAgentIntegration (AM-006)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  const settingsPath = (): string => join(project.cwd, ".claude", "settings.json");

  it("blocks with ERR_IO_OR_CONFIG when the project is not initialized", async () => {
    const result = await setupAgentIntegration({ cwd: project.cwd, force: false });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_IO_OR_CONFIG");
    expect(result.message.zh).toContain("ocn init");
  });

  it("creates all four surfaces on a fresh project and audits the run", async () => {
    await initProject({ cwd: project.cwd });
    const result = await setupAgentIntegration({ cwd: project.cwd, force: false });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) throw new Error("expected data");
    expect(result.data.files.filter((f) => f.action === "created")).toHaveLength(4);

    const settings = JSON.parse(await fs.readFile(settingsPath(), "utf8"));
    expect(JSON.stringify(settings.hooks.Stop)).toContain("ocn hook stop");
    const ocnMd = await fs.readFile(join(project.cwd, ".claude", "ocn.md"), "utf8");
    expect(ocnMd).toContain("OCN 治理契约");
    const slash = await fs.readFile(
      join(project.cwd, ".claude", "commands", "ocn-next.md"),
      "utf8",
    );
    expect(slash).toContain("ocn next-prompt --agent claude-code");
    const claudeMd = await fs.readFile(join(project.cwd, "CLAUDE.md"), "utf8");
    expect(claudeMd).toContain("@.claude/ocn.md");

    const jsonl = await fs.readFile(AuditPaths.jsonlFile(project.cwd), "utf8");
    expect(jsonl).toContain("agent_setup_completed");
  });

  it("is idempotent: rerun reports all skipped and settings mtime is unchanged", async () => {
    await initProject({ cwd: project.cwd });
    await setupAgentIntegration({ cwd: project.cwd, force: false });
    const before = await fs.stat(settingsPath());
    await new Promise((r) => setTimeout(r, 20));
    const rerun = await setupAgentIntegration({ cwd: project.cwd, force: false });
    expect(rerun.ok).toBe(true);
    if (!rerun.ok || rerun.data === undefined) throw new Error("expected data");
    expect(rerun.data.files.every((f) => f.action === "skipped")).toBe(true);
    const after = await fs.stat(settingsPath());
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it("malformed settings without --force blocks and writes NOTHING", async () => {
    await initProject({ cwd: project.cwd });
    await fs.mkdir(join(project.cwd, ".claude"), { recursive: true });
    await fs.writeFile(settingsPath(), "{ broken json", "utf8");
    const result = await setupAgentIntegration({ cwd: project.cwd, force: false });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_IO_OR_CONFIG");
    await expect(fs.stat(join(project.cwd, ".claude", "ocn.md"))).rejects.toThrow();
    await expect(fs.stat(join(project.cwd, "CLAUDE.md"))).rejects.toThrow();
  });

  it("malformed settings with --force backs up original bytes and rewrites", async () => {
    await initProject({ cwd: project.cwd });
    await fs.mkdir(join(project.cwd, ".claude"), { recursive: true });
    await fs.writeFile(settingsPath(), "{ broken json", "utf8");
    const result = await setupAgentIntegration({ cwd: project.cwd, force: true });
    expect(result.ok).toBe(true);
    expect(await fs.readFile(`${settingsPath()}.bak`, "utf8")).toBe("{ broken json");
    const settings = JSON.parse(await fs.readFile(settingsPath(), "utf8"));
    expect(settings.hooks.PostToolUse).toHaveLength(1);
  });

  it("appends the import once to an existing CLAUDE.md and preserves content", async () => {
    await initProject({ cwd: project.cwd });
    const original = "# My project\n\nMy own rules.\n";
    await fs.writeFile(join(project.cwd, "CLAUDE.md"), original, "utf8");
    await setupAgentIntegration({ cwd: project.cwd, force: false });
    const once = await fs.readFile(join(project.cwd, "CLAUDE.md"), "utf8");
    expect(once.startsWith(original)).toBe(true);
    await setupAgentIntegration({ cwd: project.cwd, force: false });
    const twice = await fs.readFile(join(project.cwd, "CLAUDE.md"), "utf8");
    expect(twice).toBe(once);
    expect(twice.match(/@\.claude\/ocn\.md/g)).toHaveLength(1);
  });

  it("restores a hand-edited ocn.md to the canonical template on rerun", async () => {
    await initProject({ cwd: project.cwd });
    await setupAgentIntegration({ cwd: project.cwd, force: false });
    const ocnMdPath = join(project.cwd, ".claude", "ocn.md");
    await fs.writeFile(ocnMdPath, "# tampered\n", "utf8");
    const rerun = await setupAgentIntegration({ cwd: project.cwd, force: false });
    expect(rerun.ok).toBe(true);
    if (!rerun.ok || rerun.data === undefined) throw new Error("expected data");
    const entry = rerun.data.files.find((f) => f.path === ocnMdPath);
    expect(entry?.action).toBe("updated");
    expect(await fs.readFile(ocnMdPath, "utf8")).toContain("OCN 治理契约");
  });
});
