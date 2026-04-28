import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureLogTool } from "../../src/mcp/tools/capture-log.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("navigator.capture_log", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("appends a dev log entry to docs/19-dev-log.md", async () => {
    const result = await captureLogTool.handler({
      projectRoot: project.cwd,
      type: "dev",
      message: "Implemented MCP capture_log handler",
    });
    expect(result.ok).toBe(true);
    const log = await fs.readFile(join(project.cwd, "docs", "19-dev-log.md"), "utf8");
    expect(log).toContain("# Dev Log｜开发日志");
    expect(log).toContain("Implemented MCP capture_log handler");
  });

  it("appends a research log entry to docs/18-research-log.md", async () => {
    const result = await captureLogTool.handler({
      projectRoot: project.cwd,
      type: "research",
      message: "Investigated MCP SDK version 1.29 stdio transport behavior",
    });
    expect(result.ok).toBe(true);
    const log = await fs.readFile(
      join(project.cwd, "docs", "18-research-log.md"),
      "utf8",
    );
    expect(log).toContain("# Research Log｜研究日志");
    expect(log).toContain("MCP SDK version 1.29");
  });

  // CRITICAL — MCP must NEVER capture decisions.
  it("REJECTS type='decision' with bilingual error", async () => {
    const result = await captureLogTool.handler({
      projectRoot: project.cwd,
      type: "decision",
      message: "We pick Option A",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      expect(result.message.en).toMatch(/cannot capture decision/i);
      expect(result.message.zh).toContain("MCP");
      expect(result.message.zh).toContain("决策");
    }
  });

  it("rejects empty message", async () => {
    const result = await captureLogTool.handler({
      projectRoot: project.cwd,
      type: "dev",
      message: "",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown type", async () => {
    const result = await captureLogTool.handler({
      projectRoot: project.cwd,
      type: "garbage",
      message: "x",
    });
    expect(result.ok).toBe(false);
  });
});
