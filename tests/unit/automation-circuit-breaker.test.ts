import { describe, expect, it } from "vitest";
import { DEFAULT_AUTOMATION_RUNTIME } from "../../src/core/automation/automation-runtime-store.js";
import {
  clearFailureCounter,
  recordAiGateFailure,
} from "../../src/core/automation/circuit-breaker.js";

// AM-009 / DEC-034 — circuit breaker: N consecutive gate failures on the SAME
// step (default 5) suspend auto mode. Pure state-transition functions; the
// caller persists the returned runtime and emits the suspend audit event.

describe("recordAiGateFailure", () => {
  it("starts a counter at 1 on the first failure", () => {
    const { runtime, tripped } = recordAiGateFailure(DEFAULT_AUTOMATION_RUNTIME, "step_prd", 5);
    expect(tripped).toBe(false);
    expect(runtime.failureCounter).toEqual({ stepId: "step_prd", count: 1 });
    expect(runtime.suspended).toBe(false);
  });

  it("increments on the same step, resets to 1 when the step changes", () => {
    let state = recordAiGateFailure(DEFAULT_AUTOMATION_RUNTIME, "step_prd", 5).runtime;
    state = recordAiGateFailure(state, "step_prd", 5).runtime;
    expect(state.failureCounter?.count).toBe(2);
    state = recordAiGateFailure(state, "step_scope", 5).runtime;
    expect(state.failureCounter).toEqual({ stepId: "step_scope", count: 1 });
  });

  it("trips at the threshold: suspended=true with reason and UTC-Z timestamp", () => {
    let state = DEFAULT_AUTOMATION_RUNTIME;
    let tripped = false;
    for (let i = 0; i < 3; i += 1) {
      ({ runtime: state, tripped } = recordAiGateFailure(state, "step_prd", 3));
    }
    expect(tripped).toBe(true);
    expect(state.suspended).toBe(true);
    expect(state.suspendedReason).toBe("circuit_breaker_tripped");
    expect(state.suspendedAt?.endsWith("Z")).toBe(true);
    expect(state.failureCounter).toEqual({ stepId: "step_prd", count: 3 });
  });

  it("does not double-trip once suspended", () => {
    const first = recordAiGateFailure(DEFAULT_AUTOMATION_RUNTIME, "step_prd", 1);
    expect(first.tripped).toBe(true);
    const second = recordAiGateFailure(first.runtime, "step_prd", 1);
    expect(second.tripped).toBe(false);
    expect(second.runtime).toEqual(first.runtime);
  });

  it("never mutates its input (immutability)", () => {
    const before = { ...DEFAULT_AUTOMATION_RUNTIME };
    recordAiGateFailure(DEFAULT_AUTOMATION_RUNTIME, "step_prd", 5);
    expect(DEFAULT_AUTOMATION_RUNTIME).toEqual(before);
  });
});

describe("clearFailureCounter", () => {
  it("clears the counter but never un-suspends (resume is human-only)", () => {
    const counting = recordAiGateFailure(DEFAULT_AUTOMATION_RUNTIME, "step_prd", 5).runtime;
    expect(clearFailureCounter(counting).failureCounter).toBeNull();

    const tripped = recordAiGateFailure(DEFAULT_AUTOMATION_RUNTIME, "step_prd", 1).runtime;
    const cleared = clearFailureCounter(tripped);
    expect(cleared.failureCounter).toBeNull();
    expect(cleared.suspended).toBe(true);
  });

  it("is identity on an already-clear runtime", () => {
    expect(clearFailureCounter(DEFAULT_AUTOMATION_RUNTIME)).toEqual(DEFAULT_AUTOMATION_RUNTIME);
  });
});
