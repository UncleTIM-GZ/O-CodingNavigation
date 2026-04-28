import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactTool } from "../../src/mcp/tools/create-artifact.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("navigator.create_artifact", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates docs/00-project-brief.md for type project-brief", async () => {
    const result = await createArtifactTool.handler({
      projectRoot: project.cwd,
      artifactType: "project-brief",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.type).toBe("project-brief");
    await fs.access(join(project.cwd, "docs", "00-project-brief.md"));
  });

  it("rejects unknown artifactType via input schema", async () => {
    const result = await createArtifactTool.handler({
      projectRoot: project.cwd,
      artifactType: "garbage",
    });
    expect(result.ok).toBe(false);
  });

  it("emits artifact_created event with relatedArtifactIds", async () => {
    await createArtifactTool.handler({
      projectRoot: project.cwd,
      artifactType: "scope",
    });
    const raw = await fs.readFile(
      join(project.cwd, ".ocoding", "audit", "audit-events.jsonl"),
      "utf8",
    );
    const events = raw
      .trimEnd()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line));
    const created = events.find(
      (e) =>
        e.eventType === "artifact_created" &&
        e.relatedArtifactIds?.includes("artifact_scope"),
    );
    expect(created).toBeDefined();
  });
});
