import { promises as fs } from "node:fs";
import { describe, expect, it } from "vitest";
import { ProjectState } from "../../src/types/state.js";
import { FixtureFiles } from "../helpers/fixtures.js";

async function readFixtureJson(path: string): Promise<unknown> {
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw);
}

describe("ProjectState schema", () => {
  // @ac AC-STATE-003 — currentStateId/currentStepId are source of truth
  it("parses the valid-state.json fixture", async () => {
    const data = await readFixtureJson(FixtureFiles.validState());
    const result = ProjectState.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects the invalid-state.json fixture", async () => {
    const data = await readFixtureJson(FixtureFiles.invalidState());
    const result = ProjectState.safeParse(data);
    expect(result.success).toBe(false);
  });

  // @ac AC-STATE-003 — numeric step pointers are forbidden
  it("rejects a state with a numeric currentStepId", () => {
    const result = ProjectState.safeParse({
      schemaVersion: "1.0",
      project: {
        projectId: "p",
        name: "n",
        tier: "minimal",
        sopProfileId: "default-ai-coding-sop",
        sopProfileVersion: "0.1.0",
      },
      currentStateId: "state_spec",
      currentStepId: 3,
      artifacts: {},
      latestGateResult: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a state with a step id that lacks the 'step_' prefix", () => {
    const result = ProjectState.safeParse({
      schemaVersion: "1.0",
      project: {
        projectId: "p",
        name: "n",
        tier: "minimal",
        sopProfileId: "default-ai-coding-sop",
        sopProfileVersion: "0.1.0",
      },
      currentStateId: "state_spec",
      currentStepId: "prd",
      artifacts: {},
      latestGateResult: null,
    });
    expect(result.success).toBe(false);
  });

  // `ocn stop` — back-compat: a state.json written before the stoppedAt field
  // existed must still parse, defaulting to null (OCN still driving).
  it("defaults stoppedAt to null when absent (back-compat)", () => {
    const result = ProjectState.safeParse({
      schemaVersion: "1.0",
      project: {
        projectId: "p",
        name: "n",
        tier: "minimal",
        sopProfileId: "default-ai-coding-sop",
        sopProfileVersion: "0.1.0",
      },
      currentStateId: "state_spec",
      currentStepId: "step_prd",
      artifacts: {},
      latestGateResult: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stoppedAt).toBeNull();
  });

  it("accepts an ISO timestamp for stoppedAt", () => {
    const result = ProjectState.safeParse({
      schemaVersion: "1.0",
      project: {
        projectId: "p",
        name: "n",
        tier: "minimal",
        sopProfileId: "default-ai-coding-sop",
        sopProfileVersion: "0.1.0",
      },
      currentStateId: "state_spec",
      currentStepId: "step_prd",
      artifacts: {},
      latestGateResult: null,
      stoppedAt: "2026-07-05T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-enum currentStateId", () => {
    const result = ProjectState.safeParse({
      schemaVersion: "1.0",
      project: {
        projectId: "p",
        name: "n",
        tier: "minimal",
        sopProfileId: "default-ai-coding-sop",
        sopProfileVersion: "0.1.0",
      },
      currentStateId: "state_unknown",
      currentStepId: "step_prd",
      artifacts: {},
      latestGateResult: null,
    });
    expect(result.success).toBe(false);
  });
});
