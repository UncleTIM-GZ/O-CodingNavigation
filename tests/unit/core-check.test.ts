import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkCurrentArtifact } from "../../src/core/check.js";
import { initProject } from "../../src/core/init.js";
import { FixtureFiles } from "../helpers/fixtures.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("core/check.checkCurrentArtifact", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  // @ac AC-SAG-001 — blocks PRD missing Scenarios
  it("returns blocked + section_scenarios when PRD missing Scenarios", async () => {
    await fs.copyFile(
      FixtureFiles.prdMissingScenarios(),
      join(project.cwd, "docs", "02-prd.md"),
    );
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      expect(result.message.en).toBe("PRD is missing required section: Scenarios.");
      expect(result.message.zh).toBe("PRD 缺少必填章节：Scenarios｜使用场景。");
      const data = result.data as { missingRequiredSectionIds: readonly string[] };
      expect(data.missingRequiredSectionIds).toEqual(["section_scenarios"]);
    }
  });

  // @ac AC-SAG-004 — passes PRD with Scenarios
  it("returns pass + OK when PRD has Scenarios", async () => {
    await fs.copyFile(
      FixtureFiles.prdWithScenarios(),
      join(project.cwd, "docs", "02-prd.md"),
    );
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.en).toBe("PRD passed Skeleton Spike artifact check.");
      expect(result.message.zh).toBe("PRD 已通过 Skeleton Spike 产物检查。");
      expect(result.data?.status).toBe("pass");
    }
  });

  it("blocks when PRD file does not exist", async () => {
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      const data = result.data as { missingRequiredSectionIds: readonly string[] };
      expect(data.missingRequiredSectionIds).toContain("section_scenarios");
    }
  });
});
