import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("core/doc.createArtifact", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates docs/02-prd.md with all required headings", async () => {
    const result = await createArtifact({ cwd: project.cwd, type: "prd" });
    expect(result.ok).toBe(true);
    const prd = await fs.readFile(join(project.cwd, "docs", "02-prd.md"), "utf8");
    for (const heading of [
      "## Problem｜问题",
      "## Goals｜目标",
      "## Users｜用户",
      "## Scenarios｜使用场景",
      "## Requirements｜需求",
      "## Step Artifact Gate Self-check｜步骤产物门禁自检",
    ]) {
      expect(prd).toContain(heading);
    }
  });

  it("rejects non-prd doc types with ERR_ARTIFACT_INVALID", async () => {
    const result = await createArtifact({ cwd: project.cwd, type: "design" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_ARTIFACT_INVALID");
  });

  it("blocks with ERR_IO_OR_CONFIG when PRD already exists", async () => {
    await createArtifact({ cwd: project.cwd, type: "prd" });
    const second = await createArtifact({ cwd: project.cwd, type: "prd" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("ERR_IO_OR_CONFIG");
  });

  it("overwrites when overwrite=true", async () => {
    await createArtifact({ cwd: project.cwd, type: "prd" });
    const second = await createArtifact({
      cwd: project.cwd,
      type: "prd",
      overwrite: true,
    });
    expect(second.ok).toBe(true);
  });
});
