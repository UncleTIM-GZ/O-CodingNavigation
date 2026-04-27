import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FileExistsError,
  writeArtifact,
} from "../../src/core/artifact/template-writer.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("artifact/template-writer.writeArtifact", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates parent directories and writes the file", async () => {
    const target = join(project.cwd, "deep", "nested", "file.md");
    await writeArtifact(target, "hello");
    const content = await fs.readFile(target, "utf8");
    expect(content).toBe("hello");
  });

  it("throws FileExistsError when target exists and overwrite=false", async () => {
    const target = join(project.cwd, "exists.md");
    await writeArtifact(target, "first");
    await expect(writeArtifact(target, "second")).rejects.toBeInstanceOf(FileExistsError);
    const content = await fs.readFile(target, "utf8");
    expect(content).toBe("first");
  });

  it("overwrites when overwrite=true", async () => {
    const target = join(project.cwd, "overwrite.md");
    await writeArtifact(target, "first");
    await writeArtifact(target, "second", true);
    const content = await fs.readFile(target, "utf8");
    expect(content).toBe("second");
  });
});
