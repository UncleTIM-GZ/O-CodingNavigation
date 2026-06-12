import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { rewindState } from "../../src/core/rewind/rewind-state.js";
import { readState } from "../../src/core/state/state-store.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-033 P0 — `rewindState` engine behavior:
//   - validation failures (uninitialized / empty reason / bad target) block
//     with the stable exit-code mapping and leave state.json untouched;
//   - success moves the cursor backwards under the lock, clears
//     latestGateResult, leaves docs/ artifacts alone, and emits a
//     `cursor_rewind` push audit event carrying from/to/reason.

interface AuditEventLike {
  readonly eventType: string;
  readonly result: string;
  readonly actor: string;
  readonly command?: string;
  readonly correlationId?: string;
  readonly data?: {
    reason?: string;
    failureReason?: string;
    from?: { stateId: string; stepId: string };
    to?: { stateId: string; stepId: string };
  };
}

async function readEvents(cwd: string): Promise<AuditEventLike[]> {
  const file = join(cwd, ".ocoding", "audit", "audit-events.jsonl");
  const raw = await fs.readFile(file, "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line) as AuditEventLike);
}

describe("rewindState", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-rewind-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks with ERR_IO_OR_CONFIG when the project is not initialized", async () => {
    const result = await rewindState({
      cwd: project.cwd,
      targetStepId: "step_project_brief",
      reason: "any",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });

  describe("on an initialized project advanced one step", () => {
    beforeEach(async () => {
      // Pinned to 0.3.0 — rewind itself never runs gates, but the advance
      // used to set up the "one step in" position must pass the 0.3.0
      // section gate (0.4.0+ readiness would block the setup path).
      await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.3.0" });
      await createArtifact({ cwd: project.cwd, type: "project-brief" });
      const advanced = await advanceState({ cwd: project.cwd });
      expect(advanced.ok).toBe(true);
      const state = await readState(project.cwd);
      expect(state.currentStepId).toBe("step_scope");
    });

    it("blocks with ERR_IO_OR_CONFIG on an empty reason and does not move the cursor", async () => {
      const result = await rewindState({
        cwd: project.cwd,
        targetStepId: "step_project_brief",
        reason: "   ",
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("ERR_IO_OR_CONFIG");
      const state = await readState(project.cwd);
      expect(state.currentStepId).toBe("step_scope");
    });

    it("blocks with ERR_STATE_MACHINE when the target is not in the profile", async () => {
      const result = await rewindState({
        cwd: project.cwd,
        targetStepId: "step_nonexistent",
        reason: "bad target",
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("ERR_STATE_MACHINE");
      const state = await readState(project.cwd);
      expect(state.currentStepId).toBe("step_scope");
    });

    it("blocks with ERR_STATE_MACHINE when the target equals the current step", async () => {
      const result = await rewindState({
        cwd: project.cwd,
        targetStepId: "step_scope",
        reason: "no-op rewind",
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("ERR_STATE_MACHINE");
    });

    it("blocks with ERR_STATE_MACHINE when the target is later than the cursor", async () => {
      const result = await rewindState({
        cwd: project.cwd,
        targetStepId: "step_prd",
        reason: "forward is advance's job",
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("ERR_STATE_MACHINE");
      const state = await readState(project.cwd);
      expect(state.currentStepId).toBe("step_scope");
    });

    it("emits a failed cursor_rewind audit event on an invalid target", async () => {
      await rewindState({
        cwd: project.cwd,
        targetStepId: "step_prd",
        reason: "forward attempt",
      });
      const events = await readEvents(project.cwd);
      const failed = events.filter((e) => e.eventType === "cursor_rewind" && e.result === "failed");
      expect(failed).toHaveLength(1);
      expect(failed[0]?.data?.failureReason).toBe("target_not_earlier");
      expect(failed[0]?.command).toBe("rewind");
    });

    it("rewinds the cursor across states, clears latestGateResult, keeps artifacts", async () => {
      const result = await rewindState({
        cwd: project.cwd,
        targetStepId: "step_project_brief",
        reason: "sop upgrade crossed the ledger generation point",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok result");
      expect(result.data?.from).toEqual({ stateId: "state_spec", stepId: "step_scope" });
      expect(result.data?.to).toEqual({
        stateId: "state_discovery",
        stepId: "step_project_brief",
      });
      expect(result.data?.correlationId).toBeTruthy();

      const state = await readState(project.cwd);
      expect(state.currentStateId).toBe("state_discovery");
      expect(state.currentStepId).toBe("step_project_brief");
      expect(state.latestGateResult).toBeNull();

      // docs/ artifacts are evidence, not state — rewind never touches them.
      const brief = await fs.readFile(join(project.cwd, "docs", "00-project-brief.md"), "utf8");
      expect(brief.length).toBeGreaterThan(0);
    });

    it("emits a success cursor_rewind push audit event with from/to/reason", async () => {
      const reason = "upgrade crossed the ledger generation point";
      const result = await rewindState({
        cwd: project.cwd,
        targetStepId: "step_project_brief",
        reason,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok result");

      const events = await readEvents(project.cwd);
      const rewinds = events.filter(
        (e) => e.eventType === "cursor_rewind" && e.result === "success",
      );
      expect(rewinds).toHaveLength(1);
      const event = rewinds[0];
      expect(event?.actor).toBe("user");
      expect(event?.command).toBe("rewind");
      expect(event?.correlationId).toBe(result.data?.correlationId);
      expect(event?.data?.from).toEqual({ stateId: "state_spec", stepId: "step_scope" });
      expect(event?.data?.to).toEqual({
        stateId: "state_discovery",
        stepId: "step_project_brief",
      });
      expect(event?.data?.reason).toBe(reason);
    });

    it("after rewind, advance walks forward again through the gate", async () => {
      const rewound = await rewindState({
        cwd: project.cwd,
        targetStepId: "step_project_brief",
        reason: "walk back then re-gate",
      });
      expect(rewound.ok).toBe(true);

      // The brief artifact still exists, so the gate passes and advance
      // returns the cursor to step_scope — rewind grants no exemption.
      const advanced = await advanceState({ cwd: project.cwd });
      expect(advanced.ok).toBe(true);
      const state = await readState(project.cwd);
      expect(state.currentStepId).toBe("step_scope");
    });
  });
});
