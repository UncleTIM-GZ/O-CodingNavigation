import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-009 / DEC-034 — phase-1 auto mode end-to-end: the ai_agent actor walks
// the whole planning pipeline (DISCOVERY→SPEC→DESIGN→PLAN) without a human
// touching `ocn advance`, then STOPS at the PLAN→BUILD boundary because that
// advance belongs to phase 2. Pinned 0.3.0 so the bundled templates satisfy
// every gate (auto mode is an engine feature — pin-independent).

const AI = { OCN_ACTOR: "ai_agent" };

/** docType per phase-1 step in 0.3.0 declaration order. */
const PHASE1_DOC_TYPES: readonly string[] = [
  "project-brief",
  "scope",
  "prd",
  "acceptance-criteria",
  "technical-architecture",
  "information-architecture",
  "data-model",
  "logic-backbone",
  "api-contract",
  "test-strategy",
  "mvp-plan",
  "build-plan",
];

describe("auto mode phase 1 — full planning pipeline (e2e, pinned 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-e2e-auto-p1-");
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
    await spawnOcn(["auto", "on", "--phase", "1", "--json"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("ai_agent advances DISCOVERY→PLAN unattended, then is stopped at the PLAN→BUILD boundary", async () => {
    // Walk every phase-1 step: create the artifact, then self-advance.
    for (let i = 0; i < PHASE1_DOC_TYPES.length - 1; i += 1) {
      const docType = PHASE1_DOC_TYPES[i] as string;
      const doc = await spawnOcn(["doc", "create", docType], { cwd: project.cwd });
      expect(doc.exitCode, `doc create ${docType}`).toBe(0);
      const advance = await spawnOcn(
        ["advance", "--rationale", `背景:${docType} 完成; 依据:gate 全绿; 操作:advance`, "--json"],
        { cwd: project.cwd, env: AI },
      );
      expect(advance.exitCode, `advance after ${docType}`).toBe(0);
    }

    // Now at state_plan / step_build_plan — the last phase-1 step.
    const state = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(state.currentStateId).toBe("state_plan");
    expect(state.currentStepId).toBe("step_build_plan");

    // The advance OUT of PLAN targets state_build → phase 2 → refused for the
    // ai_agent under a phase1-only grant; the human is signposted.
    await spawnOcn(["doc", "create", "build-plan"], { cwd: project.cwd });
    const boundary = await spawnOcn(["advance", "--rationale", "尝试跨入 BUILD", "--json"], {
      cwd: project.cwd,
      env: AI,
    });
    expect(boundary.exitCode).toBe(4);
    expect(JSON.parse(boundary.stdout).data.reason).toBe("automation_not_enabled");

    // Every ai advance is on the audit trail with rationale; the trace view
    // replays the storyline.
    const trace = await spawnOcn(["auto", "trace", "--limit", "200", "--json"], {
      cwd: project.cwd,
    });
    const parsed = JSON.parse(trace.stdout);
    const succeeded = (
      parsed.data.entries as Array<{ eventType: string; actor: string; rationale: string | null }>
    ).filter((e) => e.eventType === "advance_succeeded");
    expect(succeeded.length).toBe(PHASE1_DOC_TYPES.length - 1);
    expect(succeeded.every((e) => e.actor === "ai_agent")).toBe(true);
    expect(succeeded.every((e) => typeof e.rationale === "string" && e.rationale.length > 0)).toBe(
      true,
    );
  }, 120_000);
});
