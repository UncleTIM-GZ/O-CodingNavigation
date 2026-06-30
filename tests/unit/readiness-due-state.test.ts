import { describe, expect, it } from "vitest";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import {
  computeEnforcedFromMap,
  dueStepForRule,
  globalStepOrder,
} from "../../src/core/readiness/due-state.js";

// AM-014 — the deadline resolver at STEP granularity: a block rule's
// enforced-from step = the LATEST step (in the global SOP step order) among
// its inputs (artifact dep → producing step; repo-probe dep → first step of a
// policy state). Step (not state) granularity is what keeps a PRD-keyed check
// deferred at step_scope. Proves 不提前且不缺失 is pinned precisely per gate.

const profile070 = loadSopProfileByVersion("0.7.0");
const rulebook070 = parseReadinessRulebook(profile070.readinessYaml ?? "").rulebook!;
const profile050 = loadSopProfileByVersion("0.5.0");
const rulebook050 = parseReadinessRulebook(profile050.readinessYaml ?? "").rulebook!;

describe("readiness due-step resolver (AM-014)", () => {
  it("derives the precise enforced-from STEP for the 8 solo-tier block rules", () => {
    const map = computeEnforcedFromMap(rulebook070, profile070);
    // cio_cto: brief(step_project_brief) + scope(step_scope) → max = step_scope.
    expect(map.get("rdy_cio_cto")).toBe("step_scope");
    // ciso / ba: PRD → step_prd (a LATER step of the SAME state as step_scope).
    expect(map.get("rdy_ciso")).toBe("step_prd");
    expect(map.get("rdy_ba")).toBe("step_prd");
    // it_pm: mvp-plan → step_mvp_plan.
    expect(map.get("rdy_it_pm")).toBe("step_mvp_plan");
    // repo-fact rules → first step of state_build (step_implementation_log).
    expect(map.get("rdy_developer")).toBe("step_implementation_log");
    expect(map.get("rdy_devops_engineer")).toBe("step_implementation_log");
    expect(map.get("rdy_qa_engineer")).toBe("step_implementation_log"); // acceptance(SPEC)+test(BUILD) → max=BUILD
    expect(map.get("rdy_service_desk_analyst")).toBe("step_implementation_log");
  });

  it("ciso/ba are due strictly AFTER step_scope (the step-level fix)", () => {
    const order = globalStepOrder(profile070);
    const map = computeEnforcedFromMap(rulebook070, profile070);
    const scopeIdx = order.indexOf("step_scope");
    expect(order.indexOf(map.get("rdy_ciso")!)).toBeGreaterThan(scopeIdx);
    expect(order.indexOf(map.get("rdy_ba")!)).toBeGreaterThan(scopeIdx);
    // cio_cto is due AT step_scope (not after).
    expect(order.indexOf(map.get("rdy_cio_cto")!)).toBe(scopeIdx);
  });

  it("only maps block rules; warn rules are never deferred", () => {
    const map = computeEnforcedFromMap(rulebook070, profile070);
    expect(map.has("rdy_pmo_proportionality")).toBe(false);
    for (const rule of rulebook070.checks) {
      if (map.has(rule.id)) expect(rule.severity).toBe("block");
    }
  });

  it("every mapped deadline is a real wired step", () => {
    const order = globalStepOrder(profile070);
    const map = computeEnforcedFromMap(rulebook070, profile070);
    for (const step of map.values()) expect(order).toContain(step);
  });

  it("no deferral without the precise_activation flag (0.5.0 unchanged)", () => {
    expect(rulebook050.precise_activation).toBeUndefined();
    expect(computeEnforcedFromMap(rulebook050, profile050).size).toBe(0);
  });

  it("dueStepForRule returns null for a requires-less rule", () => {
    const noDep = rulebook070.checks.find((c) => c.requires.length === 0);
    if (noDep !== undefined) {
      expect(dueStepForRule(noDep, rulebook070, profile070)).toBeNull();
    }
  });
});
