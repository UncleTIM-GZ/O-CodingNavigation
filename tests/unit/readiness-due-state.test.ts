import { describe, expect, it } from "vitest";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { computeEnforcedFromMap, dueStateForRule } from "../../src/core/readiness/due-state.js";

// AM-014 — the deadline resolver: a block rule's enforced-from state = the
// LATEST SOP state among its inputs (artifact dep → producing step's state;
// repo-probe dep → policy state). Proves 不提前且不缺失 is pinned precisely.

const profile070 = loadSopProfileByVersion("0.7.0");
const rulebook070 = parseReadinessRulebook(profile070.readinessYaml ?? "").rulebook!;
const profile050 = loadSopProfileByVersion("0.5.0");
const rulebook050 = parseReadinessRulebook(profile050.readinessYaml ?? "").rulebook!;

describe("readiness due-state resolver (AM-014)", () => {
  it("derives the precise enforced-from state for the 8 solo-tier block rules", () => {
    const map = computeEnforcedFromMap(rulebook070, profile070);
    // SPEC-due (scope / prd are produced in SPEC).
    expect(map.get("rdy_cio_cto")).toBe("state_spec"); // brief(DISC)+scope(SPEC) → max=SPEC
    expect(map.get("rdy_ciso")).toBe("state_spec");
    expect(map.get("rdy_ba")).toBe("state_spec");
    // PLAN-due (mvp-plan).
    expect(map.get("rdy_it_pm")).toBe("state_plan");
    // BUILD-due (repo facts: git/build/ci/tests/readme).
    expect(map.get("rdy_developer")).toBe("state_build");
    expect(map.get("rdy_devops_engineer")).toBe("state_build");
    expect(map.get("rdy_qa_engineer")).toBe("state_build"); // acceptance(SPEC)+test(BUILD) → max=BUILD
    expect(map.get("rdy_service_desk_analyst")).toBe("state_build");
  });

  it("only maps block rules; warn rules are never deferred", () => {
    const map = computeEnforcedFromMap(rulebook070, profile070);
    // rdy_pmo_proportionality is warn severity → absent from the map.
    expect(map.has("rdy_pmo_proportionality")).toBe(false);
    for (const rule of rulebook070.checks) {
      if (map.has(rule.id)) expect(rule.severity).toBe("block");
    }
  });

  it("an unresolvable deadline (no step/probe anchor) is NOT deferred", () => {
    // Every mapped rule resolved to a real state; rules whose deps don't
    // anchor to a step/probe are simply omitted (enforced from gate 1).
    const map = computeEnforcedFromMap(rulebook070, profile070);
    for (const state of map.values()) {
      expect(profile070.stateOrder).toContain(state);
    }
  });

  it("no deferral without the precise_activation flag (0.5.0 unchanged)", () => {
    expect(rulebook050.precise_activation).toBeUndefined();
    expect(computeEnforcedFromMap(rulebook050, profile050).size).toBe(0);
  });

  it("dueStateForRule returns null for a requires-less rule", () => {
    const noDep = rulebook070.checks.find((c) => c.requires.length === 0);
    if (noDep !== undefined) {
      expect(dueStateForRule(noDep, rulebook070, profile070)).toBeNull();
    }
  });
});
