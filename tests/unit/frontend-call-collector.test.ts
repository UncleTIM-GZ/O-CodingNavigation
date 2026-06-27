import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectFrontendCalls } from "../../src/core/contract/frontend-call-collector.js";

// IO walker over a frontend root (AM-012 D3/D7): dynamically loads typescript,
// walks .ts/.tsx with built-in exclusions and project-root containment, and
// extracts call sites. typescript is an optional peer dep — available here as a
// devDependency, so the happy path exercises the real loader.

describe("collectFrontendCalls", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), "ocn-fe-"));
    await fs.mkdir(join(root, "src", "nested"), { recursive: true });
    await fs.mkdir(join(root, "node_modules", "lib"), { recursive: true });
    await fs.writeFile(join(root, "src", "app.ts"), `fetch('/api/users');`);
    await fs.writeFile(join(root, "src", "nested", "x.tsx"), `axios.post('/api/orders', {});`);
    await fs.writeFile(join(root, "node_modules", "lib", "y.ts"), `fetch('/api/SKIP');`);
    await fs.writeFile(join(root, "README.md"), `fetch('/api/not-code')`);
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("extracts calls from .ts/.tsx and skips node_modules and non-code files", async () => {
    const result = await collectFrontendCalls(root);
    expect(result.tsAvailable).toBe(true);
    const paths = result.calls.map((c) => c.path).sort();
    expect(paths).toEqual(["/api/orders", "/api/users"]);
    expect(result.calls.some((c) => c.path === "/api/SKIP")).toBe(false);
  });

  it("records file paths relative to the root with forward slashes", async () => {
    const result = await collectFrontendCalls(root);
    const files = result.calls.map((c) => c.file).sort();
    expect(files).toEqual(["src/app.ts", "src/nested/x.tsx"]);
  });

  it("rejects a frontend root outside the project root (containment)", async () => {
    const outside = await fs.mkdtemp(join(tmpdir(), "ocn-outside-"));
    try {
      await expect(collectFrontendCalls(outside, { projectRoot: root })).rejects.toThrow();
    } finally {
      await fs.rm(outside, { recursive: true, force: true });
    }
  });
});
