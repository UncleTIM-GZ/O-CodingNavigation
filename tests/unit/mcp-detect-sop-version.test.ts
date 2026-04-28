import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectSopVersionTool } from "../../src/mcp/tools/detect-sop-version.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("navigator.detect_sop_version", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns matching versions when project just initialized", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    const result = await detectSopVersionTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.lockedSopProfileId).toBe("default-ai-coding-sop");
      expect(result.data?.lockedSopProfileVersion).toBe("0.1.0");
      expect(result.data?.currentOcnSopProfileVersion).toBe("0.1.0");
      expect(result.data?.diffDetected).toBe(false);
    }
  });

  it("returns ERR_IO_OR_CONFIG when project not initialized", async () => {
    const result = await detectSopVersionTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });
});
