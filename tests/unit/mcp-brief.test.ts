import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { brief } from "../../src/mcp/tools/brief.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("navigator.brief", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns ok with governance + uncertainty", async () => {
    const result = await brief.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.aiGovernanceReminder).toMatch(/blocked artifact|advance/i);
      expect(result.data?.uncertaintyPolicy).toMatch(/数据不足|insufficient/i);
      expect(result.data?.currentStateId).toBe("state_discovery");
    }
  });
});
