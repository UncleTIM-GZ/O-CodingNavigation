import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";
import { seedToStepPrd } from "../helpers/seed-state.js";
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

describe("ocn check — audit trail", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-audit-check-test-");
    // Pinned 0.3.0 — section-gate audit mechanics, no readiness gate.
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
    // PR #4: PRD-specific assertions require the project to be at step_prd.
    await seedToStepPrd(project.cwd);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("emits artifact_gate_run + artifact_gate_blocked when PRD body is empty (in order)", async () => {
    // SOP 0.2.0 PR 4 (DEC-023) — PRD requires the 0.2.0 section set; an
    // empty body fails with all 0.2.0 PRD required sections.
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), "# PRD\n", "utf8");
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(2);

    const events = await readEvents(project);
    const types = events.map((e) => e.eventType);
    const runIdx = types.lastIndexOf("artifact_gate_run");
    const blockedIdx = types.lastIndexOf("artifact_gate_blocked");
    expect(runIdx).toBeGreaterThanOrEqual(0);
    expect(blockedIdx).toBeGreaterThan(runIdx);

    const blocked = events[blockedIdx];
    expect(blocked?.result).toBe("blocked");
    const data = blocked?.data as Record<string, unknown>;
    expect(data["status"]).toBe("blocked");
    expect(data["missingRequiredSectionIds"]).toEqual([
      "section_product_form",
      "section_user_roles",
      "section_user_flow",
      "section_core_features",
      "section_non_functional_requirements",
      "section_acceptance_preconditions",
      "section_non_goals",
    ]);
  }, 30_000);

  it("emits artifact_gate_run + artifact_gate_passed when PRD has all 0.2.0 required sections (in order)", async () => {
    await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    const result = await spawnOcn(["check", "--json"], { cwd: project.cwd });
    expect(result.exitCode).toBe(0);

    const events = await readEvents(project);
    const types = events.map((e) => e.eventType);
    const runIdx = types.lastIndexOf("artifact_gate_run");
    const passedIdx = types.lastIndexOf("artifact_gate_passed");
    expect(runIdx).toBeGreaterThanOrEqual(0);
    expect(passedIdx).toBeGreaterThan(runIdx);

    const passed = events[passedIdx];
    expect(passed?.result).toBe("pass");
    expect(passed?.currentStepId).toBe("step_prd");
  }, 30_000);

  it("two consecutive checks emit two gate_run events (no caching/squashing)", async () => {
    await spawnOcn(["doc", "create", "prd"], { cwd: project.cwd });
    await spawnOcn(["check"], { cwd: project.cwd });
    await spawnOcn(["check"], { cwd: project.cwd });
    const events = await readEvents(project);
    const runs = events.filter((e) => e.eventType === "artifact_gate_run");
    expect(runs.length).toBeGreaterThanOrEqual(2);
  }, 60_000);
});
