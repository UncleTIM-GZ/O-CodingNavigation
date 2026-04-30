import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateInitializedProjectRoot } from "../../src/core/security/project-root.js";
import { initProject } from "../../src/core/init.js";
import {
  resetAuditFallbackLogger,
  setAuditFallbackLogger,
  silentAuditFallbackLogger,
} from "../../src/core/audit/audit-logger.js";

// P1-001 — initialized-project boundary check.
//
// validateProjectRoot only enforces "absolute existing directory". This
// validator additionally requires <projectRoot>/.ocoding/state.json to exist
// and validate against the ProjectState schema. Mutating MCP tools rely on
// it to refuse writes into arbitrary directories such as /, $HOME, or any
// unrelated repo.
//
// We never write to / or $HOME from these tests; the rejection path only
// reads state.json (or its absence) and never produces side effects.

describe("validateInitializedProjectRoot", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ocn-init-prv-"));
    setAuditFallbackLogger(silentAuditFallbackLogger);
  });

  afterEach(async () => {
    resetAuditFallbackLogger();
    await rm(dir, { recursive: true, force: true });
  });

  // -- shape: forwards every base validateProjectRoot rejection ---------------

  it("rejects non-string input", async () => {
    const r = await validateInitializedProjectRoot(42 as unknown);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.reason).toBe("invalid-project-root");
    }
  });

  it("rejects empty string", async () => {
    const r = await validateInitializedProjectRoot("");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.reason).toBe("invalid-project-root");
    }
  });

  it("rejects null-byte injection", async () => {
    const r = await validateInitializedProjectRoot(`${dir}\0evil`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("invalid-project-root");
  });

  it("rejects relative paths", async () => {
    const r = await validateInitializedProjectRoot("./relative/path");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.message.en).toMatch(/absolute/i);
      expect(r.error.message.zh).toMatch(/绝对/);
      expect(r.error.reason).toBe("invalid-project-root");
    }
  });

  it("rejects a non-existent absolute path", async () => {
    const r = await validateInitializedProjectRoot("/nonexistent/ocn/project/path");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("invalid-project-root");
  });

  it("rejects a regular file as projectRoot", async () => {
    const file = join(dir, "a-file.txt");
    await writeFile(file, "hello");
    const r = await validateInitializedProjectRoot(file);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("invalid-project-root");
  });

  // -- the new contract: not initialized when state.json is missing -----------

  it("rejects an absolute existing directory that is not OCN-initialized", async () => {
    // dir was just created by mkdtemp, no .ocoding/ inside.
    const r = await validateInitializedProjectRoot(dir);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.reason).toBe("state-json-missing");
      expect(r.error.message.en).toContain("not an initialized OCN project");
      expect(r.error.message.zh).toContain("OCN 项目");
      expect(r.error.message.en).toMatch(/ocn init/);
      expect(r.error.message.zh).toMatch(/ocn init/);
    }
  });

  it("rejects a directory whose .ocoding/ exists but state.json is missing", async () => {
    await mkdir(join(dir, ".ocoding"), { recursive: true });
    const r = await validateInitializedProjectRoot(dir);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.reason).toBe("state-json-missing");
    }
  });

  it("rejects a directory whose state.json is malformed JSON", async () => {
    await mkdir(join(dir, ".ocoding"), { recursive: true });
    await writeFile(join(dir, ".ocoding", "state.json"), "not-json {");
    const r = await validateInitializedProjectRoot(dir);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.reason).toBe("state-json-malformed");
    }
  });

  it("rejects a directory whose state.json fails schema validation", async () => {
    await mkdir(join(dir, ".ocoding"), { recursive: true });
    await writeFile(
      join(dir, ".ocoding", "state.json"),
      JSON.stringify({ schemaVersion: "1.0", missing: "everything" }),
    );
    const r = await validateInitializedProjectRoot(dir);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.reason).toBe("state-json-schema-invalid");
    }
  });

  // -- happy path -------------------------------------------------------------

  it("accepts a freshly `ocn init`-ed temp project and returns its realpath", async () => {
    await initProject({ cwd: dir, tier: "minimal" });
    const r = await validateInitializedProjectRoot(dir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Realpath is identical or canonical (e.g. /private/tmp on macOS).
      expect(r.projectRoot.endsWith(dir.replace(/^\/private/, ""))).toBe(true);
    }
  });

  it("resolves a symlink to an initialized project to the canonical realpath", async () => {
    await initProject({ cwd: dir, tier: "minimal" });
    const linkParent = await mkdtemp(join(tmpdir(), "ocn-init-link-"));
    try {
      const link = join(linkParent, "ocn-symlink");
      await symlink(dir, link);
      const r = await validateInitializedProjectRoot(link);
      expect(r.ok).toBe(true);
      // The symlink itself is in linkParent, but the canonical realpath
      // should resolve back into the original dir tree.
      if (r.ok) expect(r.projectRoot).not.toContain("ocn-symlink");
    } finally {
      await rm(linkParent, { recursive: true, force: true });
    }
  });
});
