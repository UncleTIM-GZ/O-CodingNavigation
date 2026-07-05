import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupAgentIntegration } from "../../src/core/agent-setup/setup.js";
import { teardownAgentIntegration } from "../../src/core/agent-setup/teardown.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// `ocn stop` teardown — the inverse of setupAgentIntegration. Surgical removal
// of the four injected surfaces; user content is never touched; idempotent;
// malformed settings.json is left alone (fail-safe).

describe("teardownAgentIntegration (ocn stop)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  const p = (...seg: string[]): string => join(project.cwd, ...seg);

  it("removes the OCN-owned files, strips settings + CLAUDE.md import", async () => {
    await initProject({ cwd: project.cwd });
    await setupAgentIntegration({ cwd: project.cwd, force: false });

    const result = await teardownAgentIntegration({ cwd: project.cwd });

    // OCN-owned files deleted.
    await expect(fs.stat(p(".claude", "ocn.md"))).rejects.toThrow();
    await expect(fs.stat(p(".claude", "commands", "ocn-next.md"))).rejects.toThrow();

    // settings.json no longer carries the OCN hooks or OCN_ACTOR env.
    const settings = JSON.parse(await fs.readFile(p(".claude", "settings.json"), "utf8"));
    expect(JSON.stringify(settings)).not.toContain("ocn hook");
    expect(settings.env?.OCN_ACTOR).toBeUndefined();

    // CLAUDE.md no longer imports the contract.
    const claudeMd = await fs.readFile(p("CLAUDE.md"), "utf8");
    expect(claudeMd).not.toContain("@.claude/ocn.md");

    const actions = Object.fromEntries(result.files.map((f) => [f.path, f.action]));
    expect(actions[p(".claude", "ocn.md")]).toBe("removed");
    expect(actions[p(".claude", "settings.json")]).toBe("updated");
  });

  it("preserves the user's own settings keys and custom hooks", async () => {
    await initProject({ cwd: project.cwd });
    await fs.mkdir(p(".claude"), { recursive: true });
    // A settings file that mixes OCN's hooks with the user's own.
    await fs.writeFile(
      p(".claude", "settings.json"),
      JSON.stringify(
        {
          env: { OCN_ACTOR: "ai_agent", MY_FLAG: "1" },
          model: "opus",
          hooks: {
            Stop: [
              { hooks: [{ type: "command", command: "if command -v ocn; then ocn hook stop; fi" }] },
              { hooks: [{ type: "command", command: "echo mine" }] },
            ],
            PreToolUse: [{ hooks: [{ type: "command", command: "echo pre" }] }],
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await teardownAgentIntegration({ cwd: project.cwd });

    const settings = JSON.parse(await fs.readFile(p(".claude", "settings.json"), "utf8"));
    // OCN bits gone…
    expect(settings.env.OCN_ACTOR).toBeUndefined();
    expect(JSON.stringify(settings.hooks.Stop)).not.toContain("ocn hook");
    // …user bits intact.
    expect(settings.env.MY_FLAG).toBe("1");
    expect(settings.model).toBe("opus");
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(JSON.stringify(settings.hooks.Stop)).toContain("echo mine");
    expect(settings.hooks.PreToolUse).toHaveLength(1);
  });

  it("preserves user content in CLAUDE.md, dropping only the import lines", async () => {
    await initProject({ cwd: project.cwd });
    const userContent = "# My project\n\nMy own rules.\n";
    await fs.writeFile(p("CLAUDE.md"), userContent, "utf8");
    await setupAgentIntegration({ cwd: project.cwd, force: false });

    await teardownAgentIntegration({ cwd: project.cwd });

    const claudeMd = await fs.readFile(p("CLAUDE.md"), "utf8");
    expect(claudeMd).toContain("My own rules.");
    expect(claudeMd).not.toContain("@.claude/ocn.md");
    expect(claudeMd).not.toContain("OCN agent integration");
  });

  it("is idempotent — a second teardown reports all skipped", async () => {
    await initProject({ cwd: project.cwd });
    await setupAgentIntegration({ cwd: project.cwd, force: false });
    await teardownAgentIntegration({ cwd: project.cwd });
    const again = await teardownAgentIntegration({ cwd: project.cwd });
    expect(again.files.every((f) => f.action === "skipped")).toBe(true);
  });

  it("leaves a malformed settings.json untouched (fail-safe)", async () => {
    await initProject({ cwd: project.cwd });
    await fs.mkdir(p(".claude"), { recursive: true });
    await fs.writeFile(p(".claude", "settings.json"), "{ broken json", "utf8");
    await teardownAgentIntegration({ cwd: project.cwd });
    expect(await fs.readFile(p(".claude", "settings.json"), "utf8")).toBe("{ broken json");
  });
});
