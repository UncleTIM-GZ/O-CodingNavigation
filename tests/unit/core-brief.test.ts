import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateBrief } from "../../src/core/brief.js";
import { initProject } from "../../src/core/init.js";
import { seedToStepPrd } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("core/brief.generateBrief", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("includes state, step, AI Governance reminder and Uncertainty Policy", async () => {
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.currentStateId).toBe("state_discovery");
    expect(result.data?.currentStepId).toBe("step_project_brief");
    expect(result.data?.aiGovernanceReminder).toMatch(/blocked artifact|advance/i);
    expect(result.data?.uncertaintyPolicy).toMatch(/数据不足|insufficient/i);
  });

  it("reports artifact status 'missing' before the project-brief is created", async () => {
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.currentArtifactStatus).toBe("missing");
      expect(result.data?.currentBlockers.length).toBeGreaterThan(0);
    }
  });

  it("reports artifact status 'blocked' when PRD body is empty (after seeding to step_prd)", async () => {
    // SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. PRD requires the 0.2.0
    // section set, not Scenarios. An empty PRD body must report all 7
    // 0.2.0 PRD required sections as blockers.
    await seedToStepPrd(project.cwd);
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), "# PRD\n", "utf8");
    const result = await generateBrief({ cwd: project.cwd });
    if (result.ok) {
      expect(result.data?.currentArtifactStatus).toBe("blocked");
      expect(result.data?.currentBlockers).toEqual([
        "section_product_form",
        "section_user_roles",
        "section_user_flow",
        "section_core_features",
        "section_non_functional_requirements",
        "section_acceptance_preconditions",
        "section_non_goals",
      ]);
    }
  });

  it("reports artifact status 'pass' when PRD has all 0.2.0 required sections (after seeding to step_prd)", async () => {
    await seedToStepPrd(project.cwd);
    const { getTemplate } = await import("../../src/core/templates/index.js");
    const entry = getTemplate("prd");
    await fs.writeFile(join(project.cwd, "docs", "02-prd.md"), entry.template, "utf8");
    const result = await generateBrief({ cwd: project.cwd });
    if (result.ok) {
      expect(result.data?.currentArtifactStatus).toBe("pass");
      expect(result.data?.currentBlockers).toEqual([]);
    }
  });

  // AM-012 — the contract backbone summary is additive: absent until the gate
  // has persisted a projection, then folded into the brief from that file.
  const enableContract = async (cwd: string): Promise<void> => {
    const configPath = join(cwd, ".ocoding", "config.yaml");
    const existing = await fs.readFile(configPath, "utf8");
    await fs.writeFile(configPath, existing + "\ncontract:\n  enabled: true\n", "utf8");
  };

  const writeProjection = async (cwd: string): Promise<void> => {
    const { buildContractGraph, writeContractGraph } =
      await import("../../src/core/contract/contract-graph-store.js");
    const graph = buildContractGraph(
      [{ id: "endpoint_list_users", method: "GET", path: "/api/users" }],
      [
        { file: "src/app.ts", method: "GET", path: "/api/users", confidence: "certain" },
        { file: "src/app.ts", method: "GET", path: "/api/invoices", confidence: "certain" },
      ],
      [{ kind: "undeclared_call", method: "GET", path: "/api/invoices", file: "src/app.ts" }],
    );
    await writeContractGraph(cwd, graph);
  };

  it("omits the contract backbone summary until a projection exists", async () => {
    await enableContract(project.cwd);
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.contractBackbone).toBeUndefined();
  });

  it("summarizes the contract backbone (endpoints / calls / violation counts) from the projection", async () => {
    await enableContract(project.cwd);
    await writeProjection(project.cwd);

    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.contractBackbone).toEqual({
        endpoints: 1,
        calls: 2,
        undeclared: 1,
        methodMismatch: 0,
        unverified: 0,
      });
    }
  });

  it("does NOT surface a stale projection once contract is disabled (AM-012 review #3)", async () => {
    await writeProjection(project.cwd); // projection on disk, but config stays disabled
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.contractBackbone).toBeUndefined();
  });
});
