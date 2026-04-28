import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FixtureFiles } from "../helpers/fixtures.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// End-to-end demo path from user §XVIII / plan §6.5 / §7 Phase 1.5.
//
// PR #4 update: init now lands at state_discovery / step_project_brief
// (the true beginning of the state machine). The Skeleton Spike SEMANTIC
// invariant — PRD missing Scenarios → exit 2 + verbatim bilingual message,
// PRD with Scenarios → exit 0 + verbatim bilingual message — is preserved
// AFTER walking through the state machine to step_prd via `ocn advance`.
//
// Path:
//   init → status (state_discovery / step_project_brief)
//        → doc create project-brief → advance → step_scope
//        → doc create scope         → advance → step_prd
//   then: copy prd-missing-scenarios → check blocked (exit 2)
//         copy prd-with-scenarios    → check pass    (exit 0)
//         brief (final, governance + uncertainty + step_prd)
describe("Skeleton Spike demo path (full e2e, walks DISCOVERY→SPEC via advance)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-spike-demo-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("walks the demo and preserves verbatim PRD blocked/pass invariants", async () => {
    const cwd = project.cwd;

    // 1. ocn init --tier minimal — lands at state_discovery / step_project_brief
    const initResult = await spawnOcn(["init", "--tier", "minimal"], { cwd });
    expect(initResult.exitCode).toBe(0);

    // 2. ocn status — confirms new starting position
    const statusResult = await spawnOcn(["status", "--json"], { cwd });
    expect(statusResult.exitCode).toBe(0);
    const status = JSON.parse(statusResult.stdout);
    expect(status.data.currentStateId).toBe("state_discovery");
    expect(status.data.currentStepId).toBe("step_project_brief");

    // 3. Walk: step_project_brief → step_scope → step_prd
    //    Each step requires creating its artifact + advancing past the gate.
    //    The bundled templates contain all required sections by default, so
    //    advance passes immediately after `doc create`.
    await spawnOcn(["doc", "create", "project-brief"], { cwd });
    const advance1 = await spawnOcn(["advance", "--json"], { cwd });
    expect(advance1.exitCode).toBe(0);

    await spawnOcn(["doc", "create", "scope"], { cwd });
    const advance2 = await spawnOcn(["advance", "--json"], { cwd });
    expect(advance2.exitCode).toBe(0);

    // Now at state_spec / step_prd. Verify before continuing.
    const statusAtPrd = await spawnOcn(["status", "--json"], { cwd });
    const prdStatus = JSON.parse(statusAtPrd.stdout);
    expect(prdStatus.data.currentStateId).toBe("state_spec");
    expect(prdStatus.data.currentStepId).toBe("step_prd");

    // 4. ocn doc create prd (creates the template)
    await spawnOcn(["doc", "create", "prd"], { cwd });

    // 5. cp prd-missing-scenarios.md docs/02-prd.md
    await fs.copyFile(
      FixtureFiles.prdMissingScenarios(),
      join(cwd, "docs", "02-prd.md"),
    );

    // 6. ocn check --json — VERBATIM blocked path from Skeleton Spike acceptance
    const checkBlocked = await spawnOcn(["check", "--json"], { cwd });
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
      join(cwd, "docs", "02-prd.md"),
    );

    // 8. ocn check --json — VERBATIM pass path from Skeleton Spike acceptance
    const checkOk = await spawnOcn(["check", "--json"], { cwd });
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

    // 9. ocn brief (final) — context resumption + governance + step_prd
    const briefAfter = await spawnOcn(["brief", "--json"], { cwd });
    expect(briefAfter.exitCode).toBe(0);
    const briefAfterData = JSON.parse(briefAfter.stdout).data;
    expect(briefAfterData.currentStateId).toBe("state_spec");
    expect(briefAfterData.currentStepId).toBe("step_prd");
    expect(briefAfterData.currentArtifactStatus).toBe("pass");
    expect(briefAfterData.currentBlockers).toEqual([]);
    expect(briefAfterData.aiGovernanceReminder).toMatch(/blocked artifact|advance/i);
    expect(briefAfterData.uncertaintyPolicy).toMatch(/数据不足|insufficient/i);
  }, 120_000);
});
