import { describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject } from "../helpers/temp-project.js";

describe("ocn --help", () => {
  it("lists every implemented top-level command (Phase 2)", async () => {
    const project = await createTempProject();
    try {
      const result = await spawnOcn(["--help"], { cwd: project.cwd });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/init/);
      expect(result.stdout).toMatch(/status/);
      expect(result.stdout).toMatch(/brief/);
      expect(result.stdout).toMatch(/doc/);
      expect(result.stdout).toMatch(/check/);
      expect(result.stdout).toMatch(/gate/);
      expect(result.stdout).toMatch(/advance/);
    } finally {
      await project.cleanup();
    }
  }, 30_000);

  it("does NOT advertise unimplemented commands", async () => {
    const project = await createTempProject();
    try {
      const result = await spawnOcn(["--help"], { cwd: project.cwd });
      expect(result.exitCode).toBe(0);
      // Per docs/reports/2026-04-28-phase2-completion-report.md §6, these
      // commands are deliberately deferred. They must not appear in --help.
      expect(result.stdout).not.toMatch(/\bdoctor\b/);
      expect(result.stdout).not.toMatch(/\breset\b/);
      expect(result.stdout).not.toMatch(/\bbaseline\b/);
      expect(result.stdout).not.toMatch(/\bsop upgrade\b/i);
    } finally {
      await project.cleanup();
    }
  }, 30_000);

  it("doc create help reflects the 5 supported artifact types", async () => {
    const project = await createTempProject();
    try {
      const result = await spawnOcn(["doc", "create", "--help"], { cwd: project.cwd });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/project-brief/);
      expect(result.stdout).toMatch(/scope/);
      expect(result.stdout).toMatch(/prd/);
      expect(result.stdout).toMatch(/acceptance-criteria/);
      expect(result.stdout).toMatch(/technical-architecture/);
    } finally {
      await project.cleanup();
    }
  }, 30_000);
});
