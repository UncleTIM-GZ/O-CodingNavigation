import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProject } from "../../src/core/init.js";
import { getStatus } from "../../src/core/status.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("core/status.getStatus", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns ok with currentStateId / currentStepId after init", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    const result = await getStatus({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.currentStateId).toBe("state_discovery");
    expect(result.data?.currentStepId).toBe("step_project_brief");
    expect(result.data?.currentArtifactPath).toMatch(/00-project-brief\.md$/);
    expect(typeof result.data?.nextAction).toBe("string");
  });

  it("blocks ERR_IO_OR_CONFIG when project not initialized", async () => {
    const result = await getStatus({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });
});
