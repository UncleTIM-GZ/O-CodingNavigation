import { promises as fs } from "node:fs";
import { join } from "node:path";
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
      // SOP 0.4.0 default (DEC-030) — fresh init pins 0.4.0; current bundled is 0.4.0.
      expect(result.data?.lockedSopProfileVersion).toBe("0.4.0");
      expect(result.data?.currentOcnSopProfileVersion).toBe("0.4.0");
      expect(result.data?.diffDetected).toBe(false);
    }
  });

  it("returns ERR_IO_OR_CONFIG when project not initialized", async () => {
    const result = await detectSopVersionTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });

  // P1-003 — fresh `ocn init` projects must report `snapshot_in_sync`.
  it("reports snapshot_in_sync after a fresh init", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    const result = await detectSopVersionTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.snapshotDriftDetected).toBe(false);
      expect(result.data?.snapshotDriftReason).toBe("snapshot_in_sync");
    }
  });

  // P1-003 — legacy/skeleton snapshots must be reported as drift, not OK.
  it("reports snapshot_legacy when .ocoding/sop.yaml is the pre-P1-003 skeleton", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    // Overwrite the canonical snapshot with the historical Skeleton Spike form.
    const legacy = `profile: default-ai-coding-sop
version: 0.1.0
schemaVersion: "1.0"
states:
  - id: state_spec
    name: SPEC
    purpose: Form structured PRD and acceptance criteria
    steps:
      - step_prd
`;
    await fs.writeFile(join(project.cwd, ".ocoding", "sop.yaml"), legacy, "utf8");
    const result = await detectSopVersionTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.diffDetected).toBe(false);
      expect(result.data?.snapshotDriftDetected).toBe(true);
      expect(result.data?.snapshotDriftReason).toBe("snapshot_legacy");
      expect(result.message.en).toContain("snapshot drift detected");
    }
  });

  it("reports snapshot_missing when .ocoding/sop.yaml is gone but state.json remains", async () => {
    await initProject({ cwd: project.cwd, tier: "minimal" });
    await fs.unlink(join(project.cwd, ".ocoding", "sop.yaml"));
    const result = await detectSopVersionTool.handler({ projectRoot: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.snapshotDriftDetected).toBe(true);
      expect(result.data?.snapshotDriftReason).toBe("snapshot_missing");
    }
  });
});
