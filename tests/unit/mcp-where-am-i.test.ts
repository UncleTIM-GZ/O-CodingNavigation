import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { whereAmI } from "../../src/mcp/tools/where-am-i.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("navigator.where_am_i", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns ok with current state and step after init", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    const result = await whereAmI.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.currentStateId).toBe("state_discovery");
      expect(result.data?.currentStepId).toBe("step_project_brief");
    }
  });

  it("returns blocked ERR_IO_OR_CONFIG when project not initialized", async () => {
    const result = await whereAmI.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });

  it("rejects empty projectRoot", async () => {
    const result = await whereAmI.handler({ projectRoot: "" });
    expect(result.ok).toBe(false);
  });
});
