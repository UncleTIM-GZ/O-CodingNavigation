import { describe, expect, it } from "vitest";
import {
  automationLoopLines,
  governanceReminder,
  MANUAL_STATUS,
} from "../../src/core/automation/governance-text.js";

// AM-009 — dynamic governance text. The manual-mode output is pinned
// byte-for-byte to the pre-AM-009 constant: turning the feature OFF must be
// indistinguishable from the feature never existing.

const LEGACY_REMINDER =
  "AI must NOT mark a blocked artifact as complete. AI must NOT advance project state. " +
  "AI must NOT mutate .ocoding/state.json directly. AI must NOT modify SOP profile content " +
  "without an explicit Decision Log entry.";

describe("governanceReminder", () => {
  it("manual mode is byte-identical to the legacy constant", () => {
    expect(governanceReminder(MANUAL_STATUS)).toBe(LEGACY_REMINDER);
    expect(governanceReminder({ phase1: false, phase2: false, suspended: true })).toBe(
      LEGACY_REMINDER,
    );
  });

  it("phase1 grant: delegation text replaces the advance ban, hard zones restated", () => {
    const text = governanceReminder({ phase1: true, phase2: false, suspended: false });
    expect(text).not.toContain("AI must NOT advance project state");
    expect(text).toContain("AUTO MODE (AM-009)");
    expect(text).toContain("phase 1 (DISCOVERY→PLAN)");
    expect(text).toContain("OCN_ACTOR=ai_agent ocn advance --rationale");
    expect(text).not.toContain("task check --rationale");
    expect(text).toContain("readiness waive, cycle new, sop upgrade");
  });

  it("phase2 grant: adds task check + milestone rewind to the delegation", () => {
    const text = governanceReminder({ phase1: false, phase2: true, suspended: false });
    expect(text).toContain("phase 2 (BUILD→VERIFY)");
    expect(text).toContain("ocn task check --rationale");
    expect(text).toContain("ocn rewind --to step_build_plan");
  });

  it("full auto names both phases", () => {
    const text = governanceReminder({ phase1: true, phase2: true, suspended: false });
    expect(text).toContain("phase 1 (DISCOVERY→PLAN) and phase 2 (BUILD→VERIFY)");
  });

  it("suspended: delegation paused with the resume signpost", () => {
    const text = governanceReminder({ phase1: true, phase2: true, suspended: true });
    expect(text).toContain("CURRENTLY SUSPENDED");
    expect(text).toContain("ocn auto resume");
  });
});

describe("automationLoopLines", () => {
  it("is empty in manual mode and while suspended", () => {
    expect(automationLoopLines(MANUAL_STATUS)).toEqual([]);
    expect(automationLoopLines({ phase1: true, phase2: true, suspended: true })).toEqual([]);
  });

  it("phase2 loop includes task check, advance, the milestone rewind, and machine stop conditions", () => {
    const lines = automationLoopLines({ phase1: false, phase2: true, suspended: false }).join("\n");
    expect(lines).toContain("ocn task check --rationale");
    expect(lines).toContain("OCN_ACTOR=ai_agent ocn advance --rationale");
    expect(lines).toContain("ocn rewind --to step_build_plan");
    expect(lines).toContain("STOP and hand back to the human");
    expect(lines).toContain("circuit breaker");
  });

  it("phase1-only loop has advance but no task check / rewind", () => {
    const lines = automationLoopLines({ phase1: true, phase2: false, suspended: false }).join("\n");
    expect(lines).toContain("ocn advance --rationale");
    expect(lines).not.toContain("task check");
    expect(lines).not.toContain("rewind");
  });
});
