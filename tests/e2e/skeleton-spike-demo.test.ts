import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. The historical "Skeleton
// Spike" demo path was rewritten for 0.2.0. The Scenarios-only PRD blocked
// invariant no longer applies (0.2.0 PRD requires Product Form / User
// Roles / etc, not Scenarios). The semantic invariants — "blocked artifact
// keeps state pinned, full template passes, brief reflects current step" —
// are preserved end-to-end.
//
// Path:
//   init → status (state_discovery / step_project_brief)
//        → doc create project-brief → advance → state_spec / step_scope
//        → doc create scope         → advance → state_spec / step_prd
//   then: write empty PRD body  → check blocked (exit 2) with 0.2.0 blockers
//         doc create prd         → check pass    (exit 0)
//         brief (final, governance + uncertainty + step_prd)
describe("0.2.0 demo path (full e2e, walks DISCOVERY→SPEC via advance)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-demo-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("walks the demo and preserves the 0.2.0 PRD blocked/pass invariants", async () => {
    const cwd = project.cwd;

    // 1. ocn init --tier minimal — lands at state_discovery / step_project_brief
    const initResult = await spawnOcn(["init", "--tier", "minimal"], { cwd });
    expect(initResult.exitCode).toBe(0);

    // 2. ocn status — confirms new starting position + 0.2.0 profile.
    const statusResult = await spawnOcn(["status", "--json"], { cwd });
    expect(statusResult.exitCode).toBe(0);
    const status = JSON.parse(statusResult.stdout);
    expect(status.data.currentStateId).toBe("state_discovery");
    expect(status.data.currentStepId).toBe("step_project_brief");
    expect(status.data.project.sopProfileVersion).toBe("0.2.0");

    // 3. Walk: step_project_brief → step_scope → step_prd
    await spawnOcn(["doc", "create", "project-brief"], { cwd });
    const advance1 = await spawnOcn(["advance", "--json"], { cwd });
    expect(advance1.exitCode).toBe(0);

    await spawnOcn(["doc", "create", "scope"], { cwd });
    const advance2 = await spawnOcn(["advance", "--json"], { cwd });
    expect(advance2.exitCode).toBe(0);

    // Now at state_spec / step_prd.
    const statusAtPrd = await spawnOcn(["status", "--json"], { cwd });
    const prdStatus = JSON.parse(statusAtPrd.stdout);
    expect(prdStatus.data.currentStateId).toBe("state_spec");
    expect(prdStatus.data.currentStepId).toBe("step_prd");

    // 4. Write a minimal PRD body that fails the 0.2.0 PRD gate.
    await fs.writeFile(join(cwd, "docs", "02-prd.md"), "# PRD\n", "utf8");

    // 5. ocn check --json — blocked path from 0.2.0 PRD gate.
    const checkBlocked = await spawnOcn(["check", "--json"], { cwd });
    expect(checkBlocked.exitCode).toBe(2);
    const blockedJson = JSON.parse(checkBlocked.stdout);
    expect(blockedJson).toMatchObject({
      ok: false,
      code: "ERR_ARTIFACT_INVALID",
    });
    expect(blockedJson.data.status).toBe("blocked");
    expect(blockedJson.data.missingRequiredSectionIds).toEqual([
      "section_product_form",
      "section_user_roles",
      "section_user_flow",
      "section_core_features",
      "section_non_functional_requirements",
      "section_acceptance_preconditions",
      "section_non_goals",
    ]);
    expect(blockedJson.data.artifactPath.endsWith("docs/02-prd.md")).toBe(true);

    // 6. Replace with the bundled PRD template (covers all 0.2.0 sections).
    await spawnOcn(["doc", "create", "prd", "--overwrite"], { cwd });

    // 7. ocn check --json — pass path.
    const checkOk = await spawnOcn(["check", "--json"], { cwd });
    expect(checkOk.exitCode).toBe(0);
    const okJson = JSON.parse(checkOk.stdout);
    expect(okJson).toMatchObject({ ok: true, code: "OK" });
    expect(okJson.data.status).toBe("pass");

    // 8. ocn brief (final) — context resumption + governance + step_prd.
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
