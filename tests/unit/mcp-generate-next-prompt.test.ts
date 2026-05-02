import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateNextPromptTool } from "../../src/mcp/tools/generate-next-prompt.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("navigator.generate_next_prompt", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns a prompt for the current step with all required components", async () => {
    const result = await generateNextPromptTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.targetStateId).toBe("state_discovery");
      expect(result.data?.targetStepId).toBe("step_project_brief");
      expect(result.data?.targetArtifactPath).toBe("docs/00-project-brief.md");
      // SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. project_brief now
      // requires 7 sections.
      expect(result.data?.requiredSections).toEqual([
        "Problem",
        "Goal",
        "Users",
        "Success Criteria",
        "Constraints",
        "Risks",
        "Non-goals",
      ]);
      // The instruction must include all 3 mandated rules:
      const instruction = result.data?.instruction ?? "";
      expect(instruction).toMatch(/Self-check rule/);
      expect(instruction).toMatch(/AI Governance Reminder/);
      expect(instruction).toMatch(/Uncertainty Policy/);
      expect(instruction).toMatch(/blocked artifact/);
    }
  });

  it("returns ERR_IO_OR_CONFIG when project not initialized", async () => {
    const fresh = await createTempProject();
    try {
      const result = await generateNextPromptTool.handler({ projectRoot: fresh.cwd });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("ERR_IO_OR_CONFIG");
    } finally {
      await fresh.cleanup();
    }
  });
});
