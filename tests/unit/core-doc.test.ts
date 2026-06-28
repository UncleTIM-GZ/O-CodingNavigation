import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { apiContractTemplate } from "../../src/core/templates/api-contract.js";
import { parseApiContract } from "../../src/core/artifact/api-contract-parser.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

async function enableContract(cwd: string): Promise<void> {
  const configPath = join(cwd, ".ocoding", "config.yaml");
  const existing = await fs.readFile(configPath, "utf8");
  await fs.writeFile(
    configPath,
    existing + ["", "contract:", "  enabled: true", ""].join("\n"),
    "utf8",
  );
}

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

// AM-012 — the api-contract template renders the optional `ocn-api-contract`
// block ONLY when the project has opted in (contract.enabled). Everyone else
// gets byte-identical output, so opting in is the only thing that introduces
// the block (and thus the obligation to declare endpoints).
describe("core/doc.createArtifact — api-contract opt-in block (AM-012)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-doc-contract-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("stays byte-identical to the base template when NOT opted in", async () => {
    const result = await createArtifact({ cwd: project.cwd, type: "api-contract" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const written = await fs.readFile(result.data!.artifactPath, "utf8");
    expect(written).toBe(apiContractTemplate);
    expect(written).not.toContain("```ocn-api-contract");
  });

  it("renders a parseable ocn-api-contract block when opted in", async () => {
    await enableContract(project.cwd);
    const result = await createArtifact({ cwd: project.cwd, type: "api-contract" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const written = await fs.readFile(result.data!.artifactPath, "utf8");
    expect(written).toContain("```ocn-api-contract");
    // The scaffold must be a structurally valid (if empty) declaration, so the
    // DESIGN step's block-validity gate passes until the human fills it in.
    const parsed = parseApiContract(written);
    expect(parsed.found).toBe(true);
    expect(parsed.errors).toEqual([]);
    expect(parsed.contract).not.toBeNull();
    expect(parsed.contract?.endpoints).toEqual([]);
    // The base sections survive — the block is additive.
    expect(written).toContain("## Endpoints｜接口");
  });
});
