import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";
import { AuditEvent } from "../../src/types/audit.js";

const jsonl = (project: TempProject) =>
  join(project.cwd, ".ocoding", "audit", "audit-events.jsonl");

async function readEvents(project: TempProject) {
  const raw = await fs.readFile(jsonl(project), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => AuditEvent.parse(JSON.parse(line)));
}

describe("ocn doc create prd — audit trail", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-audit-doc-test-");
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("emits artifact_created with relatedPaths pointing at docs/02-prd.md", async () => {
    const result = await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const events = await readEvents(project);
    const created = events.find((e) => e.eventType === "artifact_created");
    expect(created).toBeDefined();
    expect(created?.result).toBe("success");
    expect(created?.relatedPaths?.[0]).toMatch(/docs\/02-prd\.md$/);
    expect(created?.relatedArtifactIds).toContain("artifact_prd");
  }, 30_000);

  it("does NOT emit artifact_created when doc type is rejected", async () => {
    const before = (await readEvents(project)).length;
    const result = await spawnOcn(["doc", "create", "design"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);
    const after = await readEvents(project);
    const createdAfter = after.filter((e) => e.eventType === "artifact_created");
    expect(createdAfter).toHaveLength(0);
    expect(after.length).toBe(before);
  }, 30_000);
});
