import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject } from "../helpers/temp-project.js";

// P1-004 — CLI surface regression. Asserts that `ocn --version` prints the
// real package.json version. spawn-ocn prefers dist/ when built, falling
// back to tsx — both paths must agree with the package manifest.

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..");
const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8")) as {
  readonly version: string;
};

describe("ocn --version", () => {
  it(
    "prints the package.json version",
    async () => {
      const project = await createTempProject();
      try {
        const result = await spawnOcn(["--version"], { cwd: project.cwd });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(pkg.version);
        expect(result.stdout.trim()).not.toBe("0.0.1-alpha.0");
      } finally {
        await project.cleanup();
      }
    },
    30_000,
  );
});
