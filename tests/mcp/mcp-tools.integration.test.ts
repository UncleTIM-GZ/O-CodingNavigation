import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initProject } from "../../src/core/init.js";
import {
  resetAuditFallbackLogger,
  setAuditFallbackLogger,
  silentAuditFallbackLogger,
} from "../../src/core/audit/audit-logger.js";
import { ALLOWED_TOOLS } from "../../src/mcp/tools/index.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("MCP tools — integration (handler-level)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
    // Simulate MCP runtime: silence audit fallback so stderr stays clean.
    setAuditFallbackLogger(silentAuditFallbackLogger);
  });

  afterEach(async () => {
    resetAuditFallbackLogger();
    await project.cleanup();
    vi.restoreAllMocks();
  });

  it("every tool returns a parseable MCPToolResult envelope", async () => {
    for (const tool of ALLOWED_TOOLS) {
      const args =
        tool.name === "navigator.create_artifact"
          ? { projectRoot: project.cwd, artifactType: "project-brief" }
          : tool.name === "navigator.capture_log"
            ? { projectRoot: project.cwd, type: "dev", message: "test" }
            : { projectRoot: project.cwd };
      const result = await tool.handler(args);
      // Every result must have ok+code+message, regardless of pass/fail.
      expect(typeof result.ok).toBe("boolean");
      expect(typeof result.code).toBe("string");
      expect(typeof result.message.en).toBe("string");
      expect(typeof result.message.zh).toBe("string");
      expect(result.message.en.length).toBeGreaterThan(0);
      expect(result.message.zh.length).toBeGreaterThan(0);
    }
  });

  it("invalid input returns a stable error envelope (no raw exception)", async () => {
    for (const tool of ALLOWED_TOOLS) {
      const result = await tool.handler({ projectRoot: 42 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeDefined();
        expect(result.message.en.length).toBeGreaterThan(0);
      }
    }
  });

  it("MCP success path produces zero stderr writes", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const result = await ALLOWED_TOOLS.find(
        (t) => t.name === "navigator.where_am_i",
      )!.handler({ projectRoot: project.cwd });
      expect(result.ok).toBe(true);
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it("create_artifact through MCP produces an artifact_created audit event", async () => {
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.create_artifact")!;
    await tool.handler({
      projectRoot: project.cwd,
      artifactType: "project-brief",
    });
    const raw = await fs.readFile(
      join(project.cwd, ".ocoding", "audit", "audit-events.jsonl"),
      "utf8",
    );
    const events = raw
      .trimEnd()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line));
    const types = events.map((e) => e.eventType);
    expect(types).toContain("artifact_created");
  });

  it("run_gate through MCP does NOT mutate state.json", async () => {
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.run_gate")!;
    const stateFile = join(project.cwd, ".ocoding", "state.json");
    const before = await fs.readFile(stateFile, "utf8");
    await tool.handler({ projectRoot: project.cwd });
    const after = await fs.readFile(stateFile, "utf8");
    expect(after).toBe(before);
  });

  it("capture_log type=decision is rejected", async () => {
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.capture_log")!;
    const result = await tool.handler({
      projectRoot: project.cwd,
      type: "decision",
      message: "rejected",
    });
    expect(result.ok).toBe(false);
  });
});
