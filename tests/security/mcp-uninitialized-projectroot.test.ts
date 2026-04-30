import { promises as fs } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ALLOWED_TOOLS } from "../../src/mcp/tools/index.js";
import {
  resetAuditFallbackLogger,
  setAuditFallbackLogger,
  silentAuditFallbackLogger,
} from "../../src/core/audit/audit-logger.js";

// P1-001 — every MCP tool must reject an uninitialized projectRoot with a
// structured envelope, and mutating tools must produce no side effects when
// the directory is not an initialized OCN project. We never write to / or
// $HOME from these tests; we use a fresh tmp dir and assert that nothing
// underneath it changes after the rejected call.

interface ToolFixtureArgs {
  readonly projectRoot: string;
  readonly artifactType?: string;
  readonly type?: string;
  readonly message?: string;
}

const argsFor = (toolName: string, projectRoot: string): ToolFixtureArgs => {
  if (toolName === "navigator.create_artifact") {
    return { projectRoot, artifactType: "project-brief" };
  }
  if (toolName === "navigator.capture_log") {
    return { projectRoot, type: "dev", message: "should never be written" };
  }
  return { projectRoot };
};

async function listAllPaths(root: string): Promise<readonly string[]> {
  const out: string[] = [];
  async function walk(p: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(p, e.name);
      out.push(full);
      if (e.isDirectory() && !e.isSymbolicLink()) await walk(full);
    }
  }
  await walk(root);
  out.sort();
  return out;
}

describe("MCP — uninitialized projectRoot is rejected by all 7 tools", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ocn-uninit-"));
    setAuditFallbackLogger(silentAuditFallbackLogger);
  });

  afterEach(async () => {
    resetAuditFallbackLogger();
    await rm(dir, { recursive: true, force: true });
  });

  for (const tool of ALLOWED_TOOLS) {
    it(`${tool.name} rejects an uninitialized directory with ERR_IO_OR_CONFIG + reason=state-json-missing`, async () => {
      const r = await tool.handler(argsFor(tool.name, dir));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("ERR_IO_OR_CONFIG");
        expect(r.message.en).toContain("not an initialized OCN project");
        expect(r.message.zh).toContain("OCN 项目");
        expect(r.message.zh).toMatch(/ocn init/);
        expect((r.data as { reason?: string } | undefined)?.reason).toBe("state-json-missing");
      }
    });
  }

  it("create_artifact does NOT create docs/ when projectRoot is uninitialized", async () => {
    const before = await listAllPaths(dir);
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.create_artifact")!;
    const r = await tool.handler(argsFor(tool.name, dir));
    expect(r.ok).toBe(false);
    const after = await listAllPaths(dir);
    expect(after).toEqual(before);
    // Defensive: the docs/ directory must not have been created.
    await expect(fs.access(join(dir, "docs"))).rejects.toThrow();
  });

  it("capture_log does NOT create docs/ or .ocoding/ when projectRoot is uninitialized", async () => {
    const before = await listAllPaths(dir);
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.capture_log")!;
    const r = await tool.handler(argsFor(tool.name, dir));
    expect(r.ok).toBe(false);
    const after = await listAllPaths(dir);
    expect(after).toEqual(before);
    await expect(fs.access(join(dir, "docs"))).rejects.toThrow();
    await expect(fs.access(join(dir, ".ocoding"))).rejects.toThrow();
  });

  it("create_artifact rejects when state.json is malformed and writes nothing", async () => {
    await mkdir(join(dir, ".ocoding"), { recursive: true });
    await writeFile(join(dir, ".ocoding", "state.json"), "not-json {");
    const before = await listAllPaths(dir);
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.create_artifact")!;
    const r = await tool.handler(argsFor(tool.name, dir));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("ERR_IO_OR_CONFIG");
      expect((r.data as { reason?: string } | undefined)?.reason).toBe("state-json-malformed");
    }
    const after = await listAllPaths(dir);
    expect(after).toEqual(before);
    await expect(fs.access(join(dir, "docs"))).rejects.toThrow();
  });

  it("never throws across the MCP boundary on uninitialized roots", async () => {
    for (const tool of ALLOWED_TOOLS) {
      const r = await tool.handler(argsFor(tool.name, dir));
      expect(typeof r.ok).toBe("boolean");
      expect(typeof r.code).toBe("string");
      expect(typeof r.message.en).toBe("string");
      expect(typeof r.message.zh).toBe("string");
    }
  });
});
