import { describe, expect, it } from "vitest";
import {
  authorizeAiAdvance,
  authorizeAiRewind,
  authorizeAiTaskCheck,
  phaseOfState,
} from "../../src/core/automation/authorization.js";
import { DEFAULT_AUTOMATION_CONFIG } from "../../src/core/automation/automation-config.js";
import { DEFAULT_AUTOMATION_RUNTIME } from "../../src/core/automation/automation-runtime-store.js";
import type { AutomationConfig, AutomationRuntime } from "../../src/types/automation.js";

// AM-009 / DEC-034 — AI authorization rules. Phase ownership is decided by
// the advance TARGET state (so PLAN→BUILD belongs to phase 2 with zero
// special-casing); ship/reflect are never delegable. Rewind is delegable in
// ONE shape only: the milestone-loop rewind to step_build_plan from
// BUILD/VERIFY (Owner ruling 2026-06-13 — multi-P build plans must complete
// without a human between milestones).

const MANUAL = DEFAULT_AUTOMATION_CONFIG;
const P1: AutomationConfig = { ...MANUAL, phase1: true };
const P2: AutomationConfig = { ...MANUAL, phase2: true };
const ALL: AutomationConfig = { ...MANUAL, phase1: true, phase2: true };
const IDLE = DEFAULT_AUTOMATION_RUNTIME;
const SUSPENDED: AutomationRuntime = {
  schemaVersion: "1.0",
  suspended: true,
  suspendedAt: "2026-06-13T00:00:00.000Z",
  suspendedReason: "circuit_breaker_tripped",
  failureCounter: null,
};

const ctx = (config: AutomationConfig, runtime: AutomationRuntime = IDLE, rationale = "ok") => ({
  config,
  runtime,
  rationale,
});

describe("phaseOfState", () => {
  it("maps discovery/spec/design/plan to phase1", () => {
    for (const s of ["state_discovery", "state_spec", "state_design", "state_plan"]) {
      expect(phaseOfState(s)).toBe("phase1");
    }
  });

  it("maps build/verify to phase2", () => {
    expect(phaseOfState("state_build")).toBe("phase2");
    expect(phaseOfState("state_verify")).toBe("phase2");
  });

  it("maps ship/reflect/unknown to null (never delegable)", () => {
    expect(phaseOfState("state_ship")).toBeNull();
    expect(phaseOfState("state_reflect")).toBeNull();
    expect(phaseOfState("state_weird")).toBeNull();
  });
});

describe("authorizeAiAdvance", () => {
  it("refuses when the target phase is not enabled (manual default)", () => {
    const refusal = authorizeAiAdvance(ctx(MANUAL), "state_spec");
    expect(refusal?.reason).toBe("automation_not_enabled");
  });

  it("allows an in-phase1 advance when phase1 is on", () => {
    expect(authorizeAiAdvance(ctx(P1), "state_spec")).toBeNull();
  });

  it("PLAN→BUILD belongs to phase2: refused under phase1-only, allowed under phase2", () => {
    expect(authorizeAiAdvance(ctx(P1), "state_build")?.reason).toBe("automation_not_enabled");
    expect(authorizeAiAdvance(ctx(P2), "state_build")).toBeNull();
    expect(authorizeAiAdvance(ctx(ALL), "state_build")).toBeNull();
  });

  it("refuses a ship/reflect target even under full auto", () => {
    expect(authorizeAiAdvance(ctx(ALL), "state_ship")?.reason).toBe("automation_not_enabled");
  });

  it("a terminal advance (null target) passes authorization — the state machine's own terminal refusal handles it", () => {
    expect(authorizeAiAdvance(ctx(P2), null)).toBeNull();
  });

  it("refuses when suspended, regardless of config", () => {
    expect(authorizeAiAdvance(ctx(ALL, SUSPENDED), "state_spec")?.reason).toBe(
      "automation_suspended",
    );
  });

  it("requires a non-empty rationale (decision trace)", () => {
    expect(authorizeAiAdvance(ctx(P1, IDLE, ""), "state_spec")?.reason).toBe(
      "automation_rationale_required",
    );
    expect(authorizeAiAdvance({ config: P1, runtime: IDLE }, "state_spec")?.reason).toBe(
      "automation_rationale_required",
    );
  });
});

describe("authorizeAiTaskCheck", () => {
  it("requires phase2 to be on", () => {
    expect(authorizeAiTaskCheck(ctx(P1), "state_build")?.reason).toBe("automation_not_enabled");
    expect(authorizeAiTaskCheck(ctx(P2), "state_build")).toBeNull();
  });

  it("only inside BUILD/VERIFY", () => {
    expect(authorizeAiTaskCheck(ctx(P2), "state_plan")?.reason).toBe("automation_not_enabled");
    expect(authorizeAiTaskCheck(ctx(P2), "state_verify")).toBeNull();
  });

  it("refuses when suspended and requires rationale", () => {
    expect(authorizeAiTaskCheck(ctx(P2, SUSPENDED), "state_build")?.reason).toBe(
      "automation_suspended",
    );
    expect(authorizeAiTaskCheck(ctx(P2, IDLE, " "), "state_build")?.reason).toBe(
      "automation_rationale_required",
    );
  });
});

describe("authorizeAiRewind (milestone loop only)", () => {
  it("allows the milestone rewind: phase2 on, from BUILD/VERIFY, target step_build_plan", () => {
    expect(
      authorizeAiRewind(ctx(P2), { fromStateId: "state_verify", targetStepId: "step_build_plan" }),
    ).toBeNull();
    expect(
      authorizeAiRewind(ctx(P2), { fromStateId: "state_build", targetStepId: "step_build_plan" }),
    ).toBeNull();
  });

  it("refuses any other target step (arbitrary rewind stays human-only)", () => {
    const refusal = authorizeAiRewind(ctx(ALL), {
      fromStateId: "state_verify",
      targetStepId: "step_prd",
    });
    expect(refusal?.reason).toBe("automation_rewind_target_restricted");
  });

  it("refuses when launched outside BUILD/VERIFY", () => {
    expect(
      authorizeAiRewind(ctx(P2), { fromStateId: "state_plan", targetStepId: "step_build_plan" })
        ?.reason,
    ).toBe("automation_rewind_target_restricted");
  });

  it("requires phase2, not suspended, with rationale", () => {
    expect(
      authorizeAiRewind(ctx(P1), { fromStateId: "state_verify", targetStepId: "step_build_plan" })
        ?.reason,
    ).toBe("automation_not_enabled");
    expect(
      authorizeAiRewind(ctx(P2, SUSPENDED), {
        fromStateId: "state_verify",
        targetStepId: "step_build_plan",
      })?.reason,
    ).toBe("automation_suspended");
    expect(
      authorizeAiRewind(ctx(P2, IDLE, ""), {
        fromStateId: "state_verify",
        targetStepId: "step_build_plan",
      })?.reason,
    ).toBe("automation_rationale_required");
  });
});
