import { promises as fs } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanupTempProject, createTempProject } from "../helpers/temp-project.js";

describe("createTempProject / cleanupTempProject", () => {
  it("creates a unique tmp dir and cleans it up", async () => {
    const project = await createTempProject();
    const stat = await fs.stat(project.cwd);
    expect(stat.isDirectory()).toBe(true);

    await fs.writeFile(`${project.cwd}/marker.txt`, "x", "utf8");
    await project.cleanup();

    let exists = true;
    try {
      await fs.stat(project.cwd);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") exists = false;
    }
    expect(exists).toBe(false);
  });

  it("supports manual cleanup via cleanupTempProject", async () => {
    const project = await createTempProject();
    await cleanupTempProject(project.cwd);
    let exists = true;
    try {
      await fs.stat(project.cwd);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") exists = false;
    }
    expect(exists).toBe(false);
  });

  it("creates two independent tmp dirs", async () => {
    const a = await createTempProject();
    const b = await createTempProject();
    expect(a.cwd).not.toBe(b.cwd);
    await a.cleanup();
    await b.cleanup();
  });
});
