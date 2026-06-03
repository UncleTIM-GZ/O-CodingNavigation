import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { brief } from "../../src/mcp/tools/brief.js";
import {
  createArtifactTool,
  createArtifactInputShape,
} from "../../src/mcp/tools/create-artifact.js";
import { detectSopVersionTool } from "../../src/mcp/tools/detect-sop-version.js";
import { runGateTool } from "../../src/mcp/tools/run-gate.js";
import { whereAmI } from "../../src/mcp/tools/where-am-i.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. MCP tools must reflect 0.2.0
// by default because every runtime path now goes through the 0.2.0 profile.
// External schemas (tool names, parameter shapes, response shapes) remain
// unchanged; only `create_artifact.artifactType` enum was widened to cover
// all 19 0.2.0 ids.

describe("MCP runtime under 0.2.0 cutover", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-mcp-sop020-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("navigator.where_am_i reports sopProfileVersion 0.3.0 for a fresh project", async () => {
    const result = await whereAmI.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.project.sopProfileVersion).toBe("0.3.0");
      expect(result.data?.currentStateId).toBe("state_discovery");
      expect(result.data?.currentStepId).toBe("step_project_brief");
      expect(result.data?.currentArtifactPath).toMatch(/00-project-brief\.md$/);
    }
  });

  it("navigator.brief reflects the 0.3.0 current step + artifact", async () => {
    const result = await brief.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.project.sopProfileVersion).toBe("0.3.0");
      expect(result.data?.currentStepId).toBe("step_project_brief");
      // 0.2.0 project_brief requires 7 sections; missing artifact reports them.
      expect(result.data?.currentArtifactStatus).toBe("missing");
      expect(result.data?.currentBlockers.length).toBeGreaterThanOrEqual(7);
    }
  });

  it("navigator.detect_sop_version reports 0.3.0 / 0.3.0 with no diff", async () => {
    const result = await detectSopVersionTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.lockedSopProfileVersion).toBe("0.3.0");
      expect(result.data?.currentOcnSopProfileVersion).toBe("0.3.0");
      expect(result.data?.diffDetected).toBe(false);
      expect(result.data?.snapshotDriftDetected).toBe(false);
      expect(result.data?.snapshotDriftReason).toBe("snapshot_in_sync");
    }
  });

  it("navigator.run_gate validates against 0.2.0 required sections (project_brief)", async () => {
    // No artifact yet — gate must report all 7 0.2.0 project_brief sections.
    const result = await runGateTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      const data = result.data as { missingRequiredSectionIds: readonly string[] };
      expect(data.missingRequiredSectionIds).toEqual([
        "section_problem",
        "section_goal",
        "section_users",
        "section_success_criteria",
        "section_constraints",
        "section_risks",
        "section_non_goals",
      ]);
    }
  });

  it("navigator.run_gate passes for project_brief once the bundled template is created", async () => {
    await createArtifactTool.handler({
      projectRoot: project.cwd,
      artifactType: "project-brief",
    });
    const result = await runGateTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.status).toBe("pass");
      expect(result.data?.currentStepId).toBe("step_project_brief");
    }
  });

  it("navigator.create_artifact accepts every 0.2.0 doc id (00-18) — enum widened in PR 4", async () => {
    // Quick spot-check on 4 of the new 0.2.0 ids that 0.1.0 never knew
    // about. Project initialised once; create them in independent docs/
    // paths so we don't trip the FileExists gate.
    const newIds: ReadonlyArray<{ type: string; file: string }> = [
      { type: "build-plan", file: "docs/11-build-plan.md" },
      { type: "verification-report", file: "docs/15-verification-report.md" },
      { type: "regression-evidence", file: "docs/18-regression-evidence.md" },
      { type: "final-build-verdict", file: "docs/19-final-build-verdict.md" },
    ];
    for (const a of newIds) {
      const result = await createArtifactTool.handler({
        projectRoot: project.cwd,
        artifactType: a.type,
      });
      expect(result.ok, `create_artifact ${a.type}`).toBe(true);
      const stat = await fs.stat(join(project.cwd, a.file));
      expect(stat.isFile()).toBe(true);
    }
  });

  it("navigator.create_artifact still rejects unknown ids (schema validation)", async () => {
    const result = await createArtifactTool.handler({
      projectRoot: project.cwd,
      artifactType: "totally-not-a-type",
    });
    expect(result.ok).toBe(false);
  });

  it("create_artifact input shape exposes all 0.2.0 ids plus the 0.3.0 logic-backbone in its enum", () => {
    // Pin the enum widening so it never silently shrinks again.
    const enumValues = createArtifactInputShape.artifactType.options;
    const expected = [
      "project-brief",
      "scope",
      "prd",
      "acceptance-criteria",
      "technical-architecture",
      "information-architecture",
      "data-model",
      "api-contract",
      "test-strategy",
      "mvp-plan",
      "build-plan",
      "implementation-log",
      "change-evidence",
      "integration-notes",
      "verification-report",
      "acceptance-mapping",
      "failure-fix-log",
      "regression-evidence",
      "final-build-verdict",
      // SOP 0.3.0 — machine-verifiable logic backbone (DESIGN phase).
      "logic-backbone",
    ];
    expect(new Set(enumValues)).toEqual(new Set(expected));
    expect(enumValues).toHaveLength(20);
  });
});
