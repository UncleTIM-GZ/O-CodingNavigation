import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { getTemplate } from "../../src/core/templates/index.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const PROFILE_030 = loadSopProfileByVersion("0.3.0");
const ARTIFACT = "docs/19-logic-backbone.md";

// A doc carrying all five required sections; the graph body is parameterized.
function makeDoc(graphYaml: string): string {
  return [
    "# Logic Backbone｜逻辑主干",
    "",
    "## Nodes｜节点",
    "## Dependencies｜依赖",
    "## Decision Bindings｜判断绑定",
    "## Signals｜信号",
    "## Graph｜逻辑图",
    "",
    "```ocn-logic-graph",
    graphYaml,
    "```",
    "",
  ].join("\n");
}

const WELL_WIRED = `nodes:
  - id: input_a
    kind: input
    role: input
    label: a
  - id: formula_b
    kind: formula
    role: terminal_explanatory
    label: b
edges:
  - from: input_a
    to: formula_b
    kind: feeds
`;

async function writeArtifact(cwd: string, content: string): Promise<void> {
  await fs.writeFile(join(cwd, ARTIFACT), content, "utf8");
}

describe("runGate — step_logic_backbone (SOP 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
    await seedState(project.cwd, {
      currentStateId: "state_design",
      currentStepId: "step_logic_backbone",
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("passes a well-wired backbone and persists the projection", async () => {
    await writeArtifact(project.cwd, makeDoc(WELL_WIRED));
    const result = await runGate({ cwd: project.cwd, command: "gate", profile: PROFILE_030 });
    expect(result.ok).toBe(true);
    const projection = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "logic-graph.json"), "utf8"),
    );
    expect(projection.nodes).toHaveLength(2);
  });

  it("passes the bundled template as-is", async () => {
    await writeArtifact(project.cwd, getTemplate("logic-backbone").template);
    const result = await runGate({ cwd: project.cwd, command: "gate", profile: PROFILE_030 });
    expect(result.ok).toBe(true);
  });

  it("blocks (exit 2) when the graph has an orphan node", async () => {
    // input_orphan is declared but nothing consumes it downstream.
    const graph = `nodes:
  - id: input_a
    kind: input
    role: input
    label: a
  - id: formula_b
    kind: formula
    role: terminal_explanatory
    label: b
  - id: input_orphan
    kind: input
    role: input
    label: orphan
edges:
  - from: input_a
    to: formula_b
    kind: feeds
`;
    await writeArtifact(project.cwd, makeDoc(graph));
    const result = await runGate({ cwd: project.cwd, command: "gate", profile: PROFILE_030 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      const data = result.data as { blockingReasons?: readonly string[] };
      expect(data.blockingReasons).toContain("logic_backbone_unwired");
    }
  });

  it("blocks when the graph block is missing entirely", async () => {
    const noBlock = [
      "# Logic Backbone｜逻辑主干",
      "## Nodes｜节点",
      "## Dependencies｜依赖",
      "## Decision Bindings｜判断绑定",
      "## Signals｜信号",
      "## Graph｜逻辑图",
      "",
      "no graph here",
      "",
    ].join("\n");
    await writeArtifact(project.cwd, noBlock);
    const result = await runGate({ cwd: project.cwd, command: "gate", profile: PROFILE_030 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_ARTIFACT_INVALID");
      const data = result.data as { blockingReasons?: readonly string[] };
      expect(data.blockingReasons).toContain("logic_backbone_graph_missing");
    }
  });

  it("blocks on missing required sections before reaching graph validation", async () => {
    // Only a graph block, no section headings.
    await writeArtifact(
      project.cwd,
      "# Logic Backbone\n\n```ocn-logic-graph\n" + WELL_WIRED + "```\n",
    );
    const result = await runGate({ cwd: project.cwd, command: "gate", profile: PROFILE_030 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const data = result.data as { blockingReasons?: readonly string[] };
      expect(data.blockingReasons).toContain("missing_required_sections");
    }
  });
});
