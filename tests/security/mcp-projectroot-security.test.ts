import { promises as fs } from "node:fs";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProject } from "../../src/core/init.js";
import {
  resetAuditFallbackLogger,
  setAuditFallbackLogger,
  silentAuditFallbackLogger,
} from "../../src/core/audit/audit-logger.js";
import { ALLOWED_TOOLS } from "../../src/mcp/tools/index.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// PR C — security tests. Every MCP tool must reject malformed projectRoot
// inputs at the boundary, never throw, and never write outside the project
// after validation succeeds.

describe("MCP projectRoot security", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
    setAuditFallbackLogger(silentAuditFallbackLogger);
  });

  afterEach(async () => {
    resetAuditFallbackLogger();
    await project.cleanup();
  });

  for (const tool of [
    "navigator.where_am_i",
    "navigator.brief",
    "navigator.run_gate",
    "navigator.create_artifact",
    "navigator.capture_log",
    "navigator.detect_sop_version",
    "navigator.generate_next_prompt",
  ]) {
    describe(tool, () => {
      const handler = ALLOWED_TOOLS.find((t) => t.name === tool)!.handler;
      const baseArgs = (projectRoot: unknown): Record<string, unknown> => {
        if (tool === "navigator.create_artifact") {
          return { projectRoot, artifactType: "project-brief" };
        }
        if (tool === "navigator.capture_log") {
          return { projectRoot, type: "dev", message: "test" };
        }
        return { projectRoot };
      };

      it("rejects a relative projectRoot", async () => {
        const r = await handler(baseArgs("./relative/path"));
        expect(r.ok).toBe(false);
        if (!r.ok) {
          expect(r.code).toBe("ERR_IO_OR_CONFIG");
          expect(r.message.en).toMatch(/absolute/i);
          expect(r.message.zh).toMatch(/绝对/);
        }
      });

      it("rejects an empty projectRoot", async () => {
        const r = await handler(baseArgs(""));
        expect(r.ok).toBe(false);
      });

      it("rejects a non-string projectRoot", async () => {
        const r = await handler(baseArgs(42));
        expect(r.ok).toBe(false);
      });

      it("rejects a non-existent projectRoot", async () => {
        const r = await handler(baseArgs("/nonexistent/ocn/project/path"));
        expect(r.ok).toBe(false);
        if (!r.ok) {
          expect(r.code).toBe("ERR_IO_OR_CONFIG");
        }
      });

      it("rejects a projectRoot pointing to a regular file", async () => {
        const filePath = join(project.cwd, "a-file.txt");
        await writeFile(filePath, "hello");
        const r = await handler(baseArgs(filePath));
        expect(r.ok).toBe(false);
      });

      it("rejects null-byte injection", async () => {
        const r = await handler(baseArgs(`${project.cwd}\0evil`));
        expect(r.ok).toBe(false);
      });

      it("never throws across the MCP boundary on malformed input", async () => {
        // Any of the malformed inputs above should already produce a structured
        // envelope. Confirm a few additional shapes cause the same.
        const badInputs: unknown[] = [
          null,
          undefined,
          {},
          { projectRoot: null },
          { projectRoot: ["array"] },
          { projectRoot: { nested: true } },
        ];
        for (const bad of badInputs) {
          const r = await handler(bad);
          expect(typeof r.ok).toBe("boolean");
          expect(typeof r.code).toBe("string");
          expect(typeof r.message.en).toBe("string");
          expect(typeof r.message.zh).toBe("string");
        }
      });
    });
  }
});

describe("MCP path-traversal containment", () => {
  let project: TempProject;
  let outside: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    outside = await createTempProject("ocn-outside-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
    setAuditFallbackLogger(silentAuditFallbackLogger);
  });

  afterEach(async () => {
    resetAuditFallbackLogger();
    await project.cleanup();
    await outside.cleanup();
  });

  it("create_artifact does NOT write outside docs/ inside the project", async () => {
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.create_artifact")!;
    const before = await fs.readdir(outside.cwd);
    const r = await tool.handler({
      projectRoot: project.cwd,
      artifactType: "project-brief",
    });
    expect(r.ok).toBe(true);
    // The success wrote docs/00-project-brief.md inside project.cwd, NOT inside outside.cwd.
    await fs.access(join(project.cwd, "docs", "00-project-brief.md"));
    const after = await fs.readdir(outside.cwd);
    expect(after).toEqual(before);
  });

  it("capture_log does NOT write outside docs/ inside the project", async () => {
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.capture_log")!;
    const before = await fs.readdir(outside.cwd);
    const r = await tool.handler({
      projectRoot: project.cwd,
      type: "dev",
      message: "test capture",
    });
    expect(r.ok).toBe(true);
    await fs.access(join(project.cwd, "docs", "19-dev-log.md"));
    const after = await fs.readdir(outside.cwd);
    expect(after).toEqual(before);
  });

  it("run_gate does NOT mutate state.json", async () => {
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.run_gate")!;
    const stateFile = join(project.cwd, ".ocoding", "state.json");
    const before = await fs.readFile(stateFile, "utf8");
    await tool.handler({ projectRoot: project.cwd });
    const after = await fs.readFile(stateFile, "utf8");
    expect(after).toBe(before);
  });

  it("a projectRoot symlink resolves to its target before file writes", async () => {
    const linkPath = join(outside.cwd, "ocn-via-symlink");
    await symlink(project.cwd, linkPath);
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.create_artifact")!;
    const r = await tool.handler({
      projectRoot: linkPath,
      artifactType: "project-brief",
    });
    expect(r.ok).toBe(true);
    // The artifact was written to the resolved canonical path (project.cwd),
    // never to a path that derives from the symlink alias literally.
    await fs.access(join(project.cwd, "docs", "00-project-brief.md"));
  });

  it("a projectRoot symlink whose target is a regular file is rejected", async () => {
    const filePath = join(outside.cwd, "not-a-dir.txt");
    await writeFile(filePath, "not a directory");
    const linkPath = join(outside.cwd, "link-to-file");
    await symlink(filePath, linkPath);
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.where_am_i")!;
    const r = await tool.handler({ projectRoot: linkPath });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ERR_IO_OR_CONFIG");
  });

  it("forbidden tools remain absent from ALLOWED_TOOLS", () => {
    const allowedNames = ALLOWED_TOOLS.map((t) => t.name);
    expect(allowedNames).not.toContain("navigator.advance_phase");
    expect(allowedNames).not.toContain("navigator.capture_decision");
    expect(allowedNames).not.toContain("navigator.reset_project");
    expect(allowedNames).not.toContain("navigator.force_release_lock");
  });
});

describe("MCP normalised projectRoot returns the canonical path", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
    setAuditFallbackLogger(silentAuditFallbackLogger);
  });

  afterEach(async () => {
    resetAuditFallbackLogger();
    await project.cleanup();
  });

  it("a path that contains `..` but normalises into the same dir is accepted", async () => {
    const trickyButLegal = `${project.cwd}/.ocoding/..`;
    const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.where_am_i")!;
    const r = await tool.handler({ projectRoot: trickyButLegal });
    // ${cwd}/.ocoding/.. normalises to ${cwd}, which IS a valid directory.
    expect(r.ok).toBe(true);
  });

  it("symlink directory is allowed and operations target the realpath", async () => {
    const outside = await mkdir(join(project.cwd, "..", "ocn-link-target-host"), {
      recursive: true,
    }).then(() => join(project.cwd, "..", "ocn-link-target-host"));
    try {
      const link = join(outside, "link-to-project");
      await symlink(project.cwd, link);
      const tool = ALLOWED_TOOLS.find((t) => t.name === "navigator.where_am_i")!;
      const r = await tool.handler({ projectRoot: link });
      expect(r.ok).toBe(true);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
