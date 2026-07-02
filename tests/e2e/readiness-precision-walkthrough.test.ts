import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-014 / DEC-040 — the first from-scratch, DEFAULT-version (0.8.0, readiness
// ON), minimal-tier walkthrough that actually advances. Every other e2e pins
// 0.3.0 (readiness OFF), so the readiness gate's per-step timing was never
// dogfooded. This test pins the precise-activation invariant end to end:
//   不提前 — DISCOVERY advances with the downstream checks DEFERRED;
//   不缺失 — the SPEC-due checks re-arm and block at the SPEC boundary.

async function readLedger(project: TempProject) {
  const raw = await fs.readFile(join(project.cwd, ".ocoding", "readiness.json"), "utf8");
  return JSON.parse(raw) as { checks: Array<{ id: string; verdict: string; severity: string }> };
}
const verdictOf = (
  l: { checks: Array<{ id: string; verdict: string }> },
  id: string,
): string | undefined => l.checks.find((c) => c.id === id)?.verdict;

describe("readiness precise activation — fresh 0.8.0 walkthrough (AM-014)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-readiness-precision-");
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("不提前: DISCOVERY advances to SPEC with the 8 downstream checks DEFERRED", async () => {
    const init = await spawnOcn(["init", "--tier", "minimal", "--no-agent"], { cwd: project.cwd });
    expect(init.exitCode).toBe(0);
    // Default profile must be the readiness-ON 0.8.0 (no --sop-version pin).
    const state0 = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(state0.project.sopProfileVersion).toBe("0.8.0");

    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const check = await spawnOcn(["check"], { cwd: project.cwd });
    expect(check.exitCode).toBe(0); // section gate + (deferred) readiness both pass

    const ledger = await readLedger(project);
    for (const id of [
      "rdy_cio_cto",
      "rdy_ciso",
      "rdy_ba",
      "rdy_it_pm",
      "rdy_developer",
      "rdy_devops_engineer",
      "rdy_qa_engineer",
      "rdy_service_desk_analyst",
    ]) {
      expect(verdictOf(ledger, id)).toBe("DEFERRED");
    }

    const advance = await spawnOcn(["advance"], { cwd: project.cwd });
    expect(advance.exitCode).toBe(0);
    const state1 = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"),
    );
    expect(state1.currentStateId).toBe("state_spec");
    expect(state1.currentStepId).toBe("step_scope");
  }, 60_000);

  it("不缺失 + step-level: at step_scope only the scope-due check re-arms; PRD/plan/build stay DEFERRED", async () => {
    await spawnOcn(["init", "--tier", "minimal", "--no-agent"], { cwd: project.cwd });
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    const advance = await spawnOcn(["advance"], { cwd: project.cwd });
    expect(advance.exitCode).toBe(0); // now at state_spec / step_scope

    // Re-evaluate readiness at step_scope (read-only).
    await spawnOcn(["readiness", "list"], { cwd: project.cwd });
    const ledger = await readLedger(project);
    // scope-due → re-armed (cio_cto wants scope.stop_conditions, due NOW).
    expect(verdictOf(ledger, "rdy_cio_cto")).not.toBe("DEFERRED");
    expect(["UNKNOWN", "FAIL"]).toContain(verdictOf(ledger, "rdy_cio_cto"));
    // PRD-due (step_prd, a LATER step of the SAME state) → STILL DEFERRED.
    // This is the step-level fix: they must NOT demand PRD content at step_scope.
    expect(verdictOf(ledger, "rdy_ciso")).toBe("DEFERRED");
    expect(verdictOf(ledger, "rdy_ba")).toBe("DEFERRED");
    // PLAN/BUILD-due → still deferred.
    for (const id of ["rdy_it_pm", "rdy_developer", "rdy_devops_engineer"]) {
      expect(verdictOf(ledger, id)).toBe("DEFERRED");
    }

    // The gate must still block the next advance (不缺失 — cio_cto unmet),
    // and the cursor must not move.
    const blocked = await spawnOcn(["advance"], { cwd: project.cwd });
    expect(blocked.exitCode).toBe(1); // ERR_GATE_FAILED
    expect(blocked.stderr).toMatch(/blocked|门禁未通过/i);
    const held = JSON.parse(await fs.readFile(join(project.cwd, ".ocoding", "state.json"), "utf8"));
    expect(held.currentStepId).toBe("step_scope");
  }, 60_000);
});
