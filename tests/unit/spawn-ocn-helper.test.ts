import { describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject } from "../helpers/temp-project.js";

describe("spawnOcn helper", () => {
  it("runs `ocn --help` successfully and returns stdout/stderr/exitCode", async () => {
    const project = await createTempProject();
    try {
      const result = await spawnOcn(["--help"], { cwd: project.cwd });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
      expect(result.stdout).toMatch(/Usage|usage|ocn/i);
    } finally {
      await project.cleanup();
    }
  }, 30_000);

  it("runs `ocn --version` and prints a semver-ish string", async () => {
    const project = await createTempProject();
    try {
      const result = await spawnOcn(["--version"], { cwd: project.cwd });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    } finally {
      await project.cleanup();
    }
  }, 30_000);
});
