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

  it("auto grant requires an independent expert review before any trigger", () => {
    const text = governanceReminder({ phase1: true, phase2: false, suspended: false });
    expect(text).toContain("independent fresh-context expert review");
    expect(text).toContain("the gate, not the review, is the arbiter");
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

  it("inserts an independent expert-review step before triggers (auto only)", () => {
    const phase2 = automationLoopLines({ phase1: false, phase2: true, suspended: false }).join(
      "\n",
    );
    expect(phase2).toContain("INDEPENDENT EXPERT REVIEW");
    expect(phase2).toContain("fresh-context subagent");
    expect(phase2).toContain("at most 3 fix attempts");
    expect(phase2).toContain("the gate, not the review, is the arbiter");

    const phase1 = automationLoopLines({ phase1: true, phase2: false, suspended: false }).join(
      "\n",
    );
    expect(phase1).toContain("INDEPENDENT EXPERT REVIEW");

    // manual/suspended carry no review text
    expect(automationLoopLines(MANUAL_STATUS).join("\n")).not.toContain("EXPERT REVIEW");
  });

  it("review carve-out names BOTH the forbidden action and the stop condition (no self-deadlock)", () => {
    const lines = automationLoopLines({ phase1: false, phase2: true, suspended: false }).join("\n");
    expect(lines).toContain("Do not call any LLM API or external network service");
    expect(lines).toContain("LLM or external API call becomes necessary");
    expect(lines).toContain("not your in-harness review");
  });

  it("triggers stay correctly numbered after inserting the review step", () => {
    const phase1Lines = automationLoopLines({ phase1: true, phase2: false, suspended: false });
    expect(phase1Lines.find((l) => l.includes("ocn advance --rationale"))?.startsWith("3.")).toBe(
      true,
    );
    expect(phase1Lines.join("\n")).not.toContain("4.");

    const phase2Lines = automationLoopLines({ phase1: false, phase2: true, suspended: false });
    expect(phase2Lines.find((l) => l.includes("ocn task check"))?.startsWith("3.")).toBe(true);
    expect(phase2Lines.find((l) => l.includes("ocn advance --rationale"))?.startsWith("4.")).toBe(
      true,
    );
    expect(phase2Lines.find((l) => l.includes("Milestone loop"))?.startsWith("5.")).toBe(true);
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
