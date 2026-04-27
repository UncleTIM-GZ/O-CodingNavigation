import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("ocn doc create prd", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // @ac AC-DOC-001 — creates docs/02-prd.md with bilingual headings
  it("creates docs/02-prd.md from the bundled template", async () => {
    const result = await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const prd = await fs.readFile(join(project.cwd, "docs", "02-prd.md"), "utf8");
    expect(prd).toContain("# Product Requirements Document｜产品需求文档");
    expect(prd).toContain("## Problem｜问题");
    expect(prd).toContain("## Goals｜目标");
    expect(prd).toContain("## Users｜用户");
    expect(prd).toContain("## Scenarios｜使用场景");
    expect(prd).toContain("## Requirements｜需求");
  }, 30_000);

  // @ac AC-DOC-003 — Step Artifact Gate Self-check block with 6 unchecked boxes
  it("includes the Step Artifact Gate Self-check block with 6 unchecked boxes", async () => {
    await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    const prd = await fs.readFile(join(project.cwd, "docs", "02-prd.md"), "utf8");
    expect(prd).toContain("## Step Artifact Gate Self-check｜步骤产物门禁自检");
    expect(prd).toContain("- [ ] Problem｜问题");
    expect(prd).toContain("- [ ] Goals｜目标");
    expect(prd).toContain("- [ ] Non-goals｜非目标");
    expect(prd).toContain("- [ ] Users｜用户");
    expect(prd).toContain("- [ ] Scenarios｜使用场景");
    expect(prd).toContain("- [ ] Requirements｜需求");
  }, 30_000);

  it("rejects unknown doc types with ERR_ARTIFACT_INVALID (exit 2)", async () => {
    const result = await spawnOcn(["doc", "create", "design", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
  }, 30_000);

  it("blocks when PRD already exists (without --overwrite)", async () => {
    await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    const result = await spawnOcn(["doc", "create", "prd", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("overwrites when --overwrite is passed", async () => {
    await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    const result = await spawnOcn(["doc", "create", "prd", "--overwrite"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(0);
  }, 30_000);
});
