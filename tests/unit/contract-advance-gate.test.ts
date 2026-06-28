import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { initProject } from "../../src/core/init.js";
import { readState } from "../../src/core/state/state-store.js";
import { getTemplate } from "../../src/core/templates/index.js";
import type { GateResult } from "../../src/types/state-machine.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-012 — end-to-end through the advance flow: a Contract Backbone drift must
// block `ocn advance` the same way the section / readiness gates do, because
// advanceState runs runGate first. Pinned to 0.3.0 so the section gate is the
// only artifact gate ahead of the contract gate (the 0.4.0+ readiness gate
// would block a sparse temp project before the contract gate is reached); the
// contract gate runs immediately after readiness in the very same runGate, so
// 0.3.0 isolates it cleanly. No task ledger exists, so the BUILD task-first
// guard is a no-op here.

const DECLARATION = [
  "# API Contract",
  "",
  "```ocn-api-contract",
  "endpoints:",
  "  - id: endpoint_list_users",
  "    method: GET",
  "    path: /api/users",
  "```",
  "",
].join("\n");

async function enableContract(cwd: string): Promise<void> {
  const configPath = join(cwd, ".ocoding", "config.yaml");
  const existing = await fs.readFile(configPath, "utf8");
  await fs.writeFile(
    configPath,
    existing +
      ["", "contract:", "  enabled: true", "  declaration: docs/06-api-contract.md", "  frontendRoot: src", ""].join(
        "\n",
      ),
    "utf8",
  );
}

describe("advance — contract drift gate (AM-012)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-contract-advance-");
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.3.0" });
    // A mid-BUILD step (not the terminal): its section gate passes with the
    // bundled template, leaving the contract gate as the deciding factor.
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_implementation_log",
    });
    await fs.writeFile(
      join(project.cwd, "docs", "12-implementation-log.md"),
      getTemplate("implementation-log").template,
      "utf8",
    );
    await fs.writeFile(join(project.cwd, "docs", "06-api-contract.md"), DECLARATION, "utf8");
    await fs.mkdir(join(project.cwd, "src"), { recursive: true });
    await enableContract(project.cwd);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks advance (ERR_GATE_FAILED) on a certain undeclared call and leaves the cursor untouched", async () => {
    await fs.writeFile(join(project.cwd, "src", "app.ts"), `fetch('/api/invoices');`, "utf8");

    const result = await advanceState({ cwd: project.cwd });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      const gate = (result.data as { gate?: GateResult }).gate;
      expect(gate?.blockingReasons).toContain("contract_drift");
    }
    // Cursor did not move — advance was refused before any state mutation.
    const state = await readState(project.cwd);
    expect(state.currentStepId).toBe("step_implementation_log");
  });

  it("allows advance when the frontend matches the declared contract", async () => {
    await fs.writeFile(join(project.cwd, "src", "app.ts"), `fetch('/api/users');`, "utf8");

    const result = await advanceState({ cwd: project.cwd });

    expect(result.ok).toBe(true);
    const state = await readState(project.cwd);
    expect(state.currentStepId).not.toBe("step_implementation_log");
    // The passing gate persisted the contract projection.
    const graph = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "contract-graph.json"), "utf8"),
    );
    expect(graph.calls).toHaveLength(1);
  });
});
