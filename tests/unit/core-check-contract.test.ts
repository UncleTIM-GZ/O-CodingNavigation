import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkCurrentArtifact } from "../../src/core/check.js";
import { initProject } from "../../src/core/init.js";
import { getTemplate } from "../../src/core/templates/index.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-012 — `ocn check` must run the Contract Backbone drift gate with the same
// parity it already gives the readiness gate: check / gate / advance all enforce
// it. These tests pin 0.3.0 (no readiness rulebook to interfere) and seed a
// state_build step whose section gate passes, then prove the contract gate fires
// from `checkCurrentArtifact` exactly as it does from `runGate`.

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
  const block = [
    "",
    "contract:",
    "  enabled: true",
    "  declaration: docs/06-api-contract.md",
    "  frontendRoot: src",
    "",
  ].join("\n");
  await fs.writeFile(configPath, existing + block, "utf8");
}

describe("core/check — contract drift gate parity (AM-012)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.3.0" });
    // state_build / step_implementation_log: a build step with a real artifact,
    // so the section gate runs (and passes) before the contract gate.
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_implementation_log",
    });
    // Section gate passes via the bundled template at the 0.3.0 artifact path.
    await fs.writeFile(
      join(project.cwd, "docs", "12-implementation-log.md"),
      getTemplate("implementation-log").template,
      "utf8",
    );
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
    await fs.writeFile(join(project.cwd, "docs", "06-api-contract.md"), DECLARATION, "utf8");
    await fs.mkdir(join(project.cwd, "src"), { recursive: true });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks check (exit 1) on a certain undeclared call — contract drift", async () => {
    await enableContract(project.cwd);
    await fs.writeFile(join(project.cwd, "src", "app.ts"), `fetch('/api/invoices');`, "utf8");
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      expect(result.message.en.toLowerCase()).toContain("contract drift");
    }
  });

  it("blocks check (exit 2) when opted in but the declaration block is missing", async () => {
    await enableContract(project.cwd);
    await fs.writeFile(
      join(project.cwd, "docs", "06-api-contract.md"),
      "# API Contract\n\nno block\n",
      "utf8",
    );
    await fs.writeFile(join(project.cwd, "src", "app.ts"), `fetch('/api/users');`, "utf8");
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ERR_ARTIFACT_INVALID");
  });

  it("passes check and persists the projection when the frontend matches the contract", async () => {
    await enableContract(project.cwd);
    await fs.writeFile(join(project.cwd, "src", "app.ts"), `fetch('/api/users');`, "utf8");
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    const graph = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "contract-graph.json"), "utf8"),
    );
    expect(graph.endpoints).toHaveLength(1);
    expect(graph.calls).toHaveLength(1);
  });

  it("does not run the contract gate when the project has not opted in", async () => {
    // No enableContract() — config stays disabled; an undeclared call is ignored.
    await fs.writeFile(join(project.cwd, "src", "app.ts"), `fetch('/api/invoices');`, "utf8");
    const result = await checkCurrentArtifact({ cwd: project.cwd });
    expect(result.ok).toBe(true);
  });
});
