import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-033 P3 — e2e dogfood of the rewind/cycle discipline through the real
// CLI (pinned 0.3.0 mechanics; the 0.5.0 ledger-regeneration variant of this
// chain is covered at the unit layer by the task-gate suite):
//
//   walk forward → rewind to an earlier step (audited, no exemption)
//   → re-advance through the same gates → terminal advance points to
//   `ocn cycle new` → cycle new archives round 1 → existing docs make the
//   round-2 gates fast-forward.

async function readState(cwd: string) {
  return JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
}

describe("rewind + cycle roundtrip (e2e, pinned 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-e2e-roundtrip-");
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("rewinds mid-flow, re-gates forward, then cycles into a fast-forward round 2", async () => {
    // Forward: brief → scope → prd (two advances).
    await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
    expect((await spawnOcn(["advance", "--json"], { cwd: project.cwd })).exitCode).toBe(0);
    await spawnOcn(["doc", "create", "scope"], { cwd: project.cwd });
    expect((await spawnOcn(["advance", "--json"], { cwd: project.cwd })).exitCode).toBe(0);
    expect((await readState(project.cwd)).currentStepId).toBe("step_prd");

    // Rewind one step back (audited; docs untouched).
    const rewound = await spawnOcn(
      ["rewind", "--to", "step_scope", "--reason", "e2e roundtrip rework", "--json"],
      { cwd: project.cwd },
    );
    expect(rewound.exitCode).toBe(0);
    expect((await readState(project.cwd)).currentStepId).toBe("step_scope");

    // No exemption: advance re-runs the gate — the scope doc still exists,
    // so the cursor returns to step_prd through the normal gate.
    const reAdvanced = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
    expect(reAdvanced.exitCode).toBe(0);
    expect((await readState(project.cwd)).currentStepId).toBe("step_prd");

    // Cycle: archive round 1, restart at the first step.
    const cycled = await spawnOcn(["cycle", "new", "--yes", "--json"], {
      cwd: project.cwd,
    });
    expect(cycled.exitCode).toBe(0);
    const cycleData = JSON.parse(cycled.stdout).data;
    expect(cycleData.round).toBe(1);
    expect((await readState(project.cwd)).currentStepId).toBe("step_project_brief");

    // Round 2 fast-forward: docs survived the cycle, so the first two gates
    // pass without recreating anything.
    expect((await spawnOcn(["advance", "--json"], { cwd: project.cwd })).exitCode).toBe(0);
    expect((await spawnOcn(["advance", "--json"], { cwd: project.cwd })).exitCode).toBe(0);
    expect((await readState(project.cwd)).currentStepId).toBe("step_prd");

    // Audit continuity: one JSONL holds round-1 transitions, the rewind, the
    // cycle stitch, and round-2 transitions.
    const raw = await fs.readFile(
      join(project.cwd, ".ocoding", "audit", "audit-events.jsonl"),
      "utf8",
    );
    const types = raw
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line).eventType);
    expect(types).toContain("cursor_rewind");
    expect(types).toContain("cycle_started");
    expect(types.filter((t) => t === "state_transitioned").length).toBeGreaterThanOrEqual(4);
  }, 120_000);
});
