import { describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject } from "../helpers/temp-project.js";

describe("ocn --help", () => {
  it("lists the 5 Skeleton Spike commands", async () => {
    const project = await createTempProject();
    try {
      const result = await spawnOcn(["--help"], { cwd: project.cwd });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/init/);
      expect(result.stdout).toMatch(/status/);
      expect(result.stdout).toMatch(/brief/);
      expect(result.stdout).toMatch(/doc/);
      expect(result.stdout).toMatch(/check/);
    } finally {
      await project.cleanup();
    }
  }, 30_000);
});
