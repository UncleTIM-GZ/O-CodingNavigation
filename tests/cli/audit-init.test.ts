import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";
import { AuditEvent } from "../../src/types/audit.js";

const jsonl = (project: TempProject) =>
  join(project.cwd, ".ocoding", "audit", "audit-events.jsonl");
const md = (project: TempProject) => join(project.cwd, "docs", "22-audit-trail.md");

async function readEvents(project: TempProject) {
  const raw = await fs.readFile(jsonl(project), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => AuditEvent.parse(JSON.parse(line)));
}

describe("ocn init — audit trail", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-audit-init-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("writes JSONL with project_initialized + state_write_succeeded + lock_acquired/released", async () => {
    const result = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);
    const events = await readEvents(project);
    const types = events.map((e) => e.eventType);
    expect(types).toContain("project_initialized");
    expect(types).toContain("state_write_succeeded");
    expect(types).toContain("lock_acquired");
    expect(types).toContain("lock_released");
  }, 30_000);

  it("creates docs/22-audit-trail.md with the bilingual header", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const raw = await fs.readFile(md(project), "utf8");
    expect(raw).toContain("# Audit Trail｜审计链");
    expect(raw).toContain("project_initialized");
  }, 30_000);

  it("project_initialized event carries currentStateId / currentStepId / tier metadata", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const events = await readEvents(project);
    const projectInit = events.find((e) => e.eventType === "project_initialized");
    expect(projectInit).toBeDefined();
    expect(projectInit?.currentStateId).toBe("state_discovery");
    expect(projectInit?.currentStepId).toBe("step_project_brief");
    const data = projectInit?.data as Record<string, unknown> | undefined;
    expect(data?.["tier"]).toBe("minimal");
    expect(data?.["sopProfileId"]).toBe("default-ai-coding-sop");
    expect(data?.["sopProfileVersion"]).toBe("0.2.0");
  }, 30_000);

  it("a second `ocn init` (already-initialized) does NOT emit project_initialized again", async () => {
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    const eventsBefore = await readEvents(project);
    const initCountBefore = eventsBefore.filter(
      (e) => e.eventType === "project_initialized",
    ).length;
    expect(initCountBefore).toBe(1);

    const second = await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
    expect(second.exitCode).toBe(4);
    const eventsAfter = await readEvents(project);
    const initCountAfter = eventsAfter.filter((e) => e.eventType === "project_initialized").length;
    expect(initCountAfter).toBe(1); // unchanged
  }, 30_000);
});
