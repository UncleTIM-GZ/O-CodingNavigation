import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FixtureFiles } from "../helpers/fixtures.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// End-to-end demo path from user §XVIII / plan §6.5 / §7 Phase 1.5.
// Empty dir → init → status → brief → doc create prd
//          → cp prd-missing-scenarios.md → check (blocked, exit 2)
//          → cp prd-with-scenarios.md → check (ok, exit 0)
//          → brief (final state)
describe("Skeleton Spike demo path (full e2e)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-spike-demo-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("walks the verbatim 8-command demo and meets every acceptance criterion", async () => {
    // 1. ocn init --tier minimal
    const initResult = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(initResult.exitCode).toBe(0);

    // 2. ocn status
    const statusResult = await spawnOcn(["status", "--json"], { cwd: project.cwd });
    expect(statusResult.exitCode).toBe(0);
    const status = JSON.parse(statusResult.stdout);
    expect(status.data.currentStateId).toBe("state_spec");
    expect(status.data.currentStepId).toBe("step_prd");

    // 3. ocn brief
    const briefBefore = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    expect(briefBefore.exitCode).toBe(0);
    const briefBeforeData = JSON.parse(briefBefore.stdout).data;
    expect(briefBeforeData.currentArtifactStatus).toBe("missing");

    // 4. ocn doc create prd
    const docResult = await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    expect(docResult.exitCode).toBe(0);

    // 5. cp prd-missing-scenarios.md docs/02-prd.md
    await fs.copyFile(
      FixtureFiles.prdMissingScenarios(),
      join(project.cwd, "docs", "02-prd.md"),
    );

    // 6. ocn check --json (must be blocked, exit 2, missing only section_scenarios)
    const checkBlocked = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(checkBlocked.exitCode).toBe(2);
    const blockedJson = JSON.parse(checkBlocked.stdout);
    expect(blockedJson).toMatchObject({
      ok: false,
      code: "ERR_ARTIFACT_INVALID",
      message: {
        en: "PRD is missing required section: Scenarios.",
        zh: "PRD 缺少必填章节：Scenarios｜使用场景。",
      },
    });
    expect(blockedJson.data.status).toBe("blocked");
    expect(blockedJson.data.missingRequiredSectionIds).toEqual(["section_scenarios"]);
    expect(blockedJson.data.artifactPath.endsWith("docs/02-prd.md")).toBe(true);

    // 7. cp prd-with-scenarios.md docs/02-prd.md
    await fs.copyFile(
      FixtureFiles.prdWithScenarios(),
      join(project.cwd, "docs", "02-prd.md"),
    );

    // 8. ocn check --json (must be OK, exit 0)
    const checkOk = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(checkOk.exitCode).toBe(0);
    const okJson = JSON.parse(checkOk.stdout);
    expect(okJson).toMatchObject({
      ok: true,
      code: "OK",
      message: {
        en: "PRD passed Skeleton Spike artifact check.",
        zh: "PRD 已通过 Skeleton Spike 产物检查。",
      },
    });
    expect(okJson.data.status).toBe("pass");

    // 9. ocn brief (final state — verifies governance + uncertainty + state recovery)
    const briefAfter = await spawnOcn(["brief", "--json"], { cwd: project.cwd });
    expect(briefAfter.exitCode).toBe(0);
    const briefAfterData = JSON.parse(briefAfter.stdout).data;
    expect(briefAfterData.currentStateId).toBe("state_spec");
    expect(briefAfterData.currentStepId).toBe("step_prd");
    expect(briefAfterData.currentArtifactStatus).toBe("pass");
    expect(briefAfterData.currentBlockers).toEqual([]);
    expect(briefAfterData.aiGovernanceReminder).toMatch(/blocked artifact|advance/i);
    expect(briefAfterData.uncertaintyPolicy).toMatch(/数据不足|insufficient/i);
  }, 90_000);
});
