import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const cases = [
  {
    type: "project-brief",
    file: "docs/00-project-brief.md",
    headings: [
      "## Problem｜问题",
      "## Goal｜目标",
      "## Users｜用户",
      "## Success Criteria｜成功标准",
    ],
  },
  {
    type: "scope",
    file: "docs/01-scope.md",
    headings: [
      "## In Scope｜范围内",
      "## Out of Scope｜范围外",
      "## Technical Constraints｜技术约束",
      "## Completion Boundary｜完成边界",
    ],
  },
  {
    type: "prd",
    file: "docs/02-prd.md",
    headings: [
      "## Problem｜问题",
      "## Goals｜目标",
      "## Users｜用户",
      "## Scenarios｜使用场景",
      "## Requirements｜需求",
    ],
  },
  {
    type: "acceptance-criteria",
    file: "docs/03-acceptance-criteria.md",
    headings: [
      "## Acceptance Rules｜验收规则",
      "## Given When Then｜给定条件 执行动作 预期结果",
      "## Failure Conditions｜失败条件",
    ],
  },
  {
    type: "technical-architecture",
    file: "docs/04-technical-architecture.md",
    headings: [
      "## Product Form｜产品形态",
      "## Runtime｜运行时",
      "## Language｜开发语言",
      "## Storage｜存储方案",
      "## Final Decision｜最终决策",
    ],
  },
] as const;

describe("ocn doc create — 5 supported types", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  for (const c of cases) {
    it(`creates ${c.file} for type '${c.type}' with all required bilingual headings`, async () => {
      const result = await spawnOcn(["doc", "create", c.type], { cwd: project.cwd });
      expect(result.exitCode).toBe(0);
      const content = await fs.readFile(join(project.cwd, c.file), "utf8");
      for (const h of c.headings) {
        expect(content).toContain(h);
      }
    }, 30_000);
  }

  it("rejects unknown doc types with ERR_ARTIFACT_INVALID (exit 2)", async () => {
    const result = await spawnOcn(["doc", "create", "unknown-type", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
    // SOP 0.2.0 PR 2 (DEC-023) added templates for every artifact id 00-18
    // of the SOP 0.2.0 profile alongside the original 5. The exact ordering
    // is locked here so consumers can rely on a stable CommandResult
    // `supportedTypes` payload — the order matches the registry insertion
    // order in src/core/templates/index.ts.
    expect(parsed.data.supportedTypes).toEqual([
      "project-brief",
      "scope",
      "prd",
      "acceptance-criteria",
      "technical-architecture",
      "information-architecture",
      "data-model",
      "api-contract",
      "test-strategy",
      "mvp-plan",
      "build-plan",
      "implementation-log",
      "change-evidence",
      "integration-notes",
      "verification-report",
      "acceptance-mapping",
      "failure-fix-log",
      "regression-evidence",
      "final-build-verdict",
      "logic-backbone",
    ]);
  }, 30_000);

  it("emits artifact_created audit with correct relatedArtifactIds", async () => {
    await spawnOcn(["doc", "create", "scope"], { cwd: project.cwd });
    const raw = await fs.readFile(
      join(project.cwd, ".ocoding", "audit", "audit-events.jsonl"),
      "utf8",
    );
    const events = raw
      .trimEnd()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line));
    const created = events.find((e) => e.eventType === "artifact_created");
    expect(created).toBeDefined();
    expect(created?.relatedArtifactIds).toContain("artifact_scope");
    expect(created?.relatedPaths?.[0]).toMatch(/01-scope\.md$/);
  }, 30_000);
});
