import { describe, expect, it } from "vitest";
import { resolveRewindTarget } from "../../src/core/rewind/rewind-target.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import type { StepLocation } from "../../src/types/state-machine.js";

// DEC-033 P0 — pure target-resolution rules for `ocn rewind`:
//   1. the cursor itself must exist in the pinned profile;
//   2. the target step must exist in the pinned profile;
//   3. the target must be STRICTLY earlier than the cursor in profile
//      declaration order (same step and later steps are both rejected —
//      forward movement is advance's job and must pass gates).
// Position comparison is derived transiently from declaration order; no
// numeric pointer is ever persisted (CLAUDE.md §4.1).

const profile = loadSopProfileByVersion("0.3.0");

const at = (stateId: string, stepId: string): StepLocation =>
  ({ stateId, stepId }) as StepLocation;

describe("resolveRewindTarget", () => {
  it("resolves a strictly-earlier target across states", () => {
    const result = resolveRewindTarget(
      profile,
      at("state_spec", "step_prd"),
      "step_project_brief",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.to).toEqual({
        stateId: "state_discovery",
        stepId: "step_project_brief",
      });
    }
  });

  it("resolves a strictly-earlier target within the same state", () => {
    const result = resolveRewindTarget(profile, at("state_spec", "step_prd"), "step_scope");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.to).toEqual({ stateId: "state_spec", stepId: "step_scope" });
    }
  });

  it("rejects the current step (no-op disguised as an operation)", () => {
    const result = resolveRewindTarget(profile, at("state_spec", "step_prd"), "step_prd");
    expect(result).toEqual({ ok: false, failure: "target_not_earlier" });
  });

  it("rejects a later target (forward movement is advance's job)", () => {
    const result = resolveRewindTarget(
      profile,
      at("state_discovery", "step_project_brief"),
      "step_prd",
    );
    expect(result).toEqual({ ok: false, failure: "target_not_earlier" });
  });

  it("rejects a target step that does not exist in the profile", () => {
    const result = resolveRewindTarget(profile, at("state_spec", "step_prd"), "step_nonexistent");
    expect(result).toEqual({ ok: false, failure: "target_not_in_profile" });
  });

  it("rejects when the cursor itself is not in the profile", () => {
    const result = resolveRewindTarget(
      profile,
      at("state_spec", "step_not_a_real_step"),
      "step_project_brief",
    );
    expect(result).toEqual({ ok: false, failure: "cursor_not_in_profile" });
  });

  it("rejects rewind from the very first step (nothing is earlier)", () => {
    const result = resolveRewindTarget(
      profile,
      at("state_discovery", "step_project_brief"),
      "step_project_brief",
    );
    expect(result).toEqual({ ok: false, failure: "target_not_earlier" });
  });
});
