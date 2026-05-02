import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";
import {
  REQUIRED_SECTIONS_BY_STEP,
  STEPS_BY_STATE,
} from "../../src/sops/default-ai-coding-sop/0.2.0/data.js";
import { parseHeadings } from "../../src/core/artifact/markdown-parser.js";
import { matchSection } from "../../src/core/artifact/required-section-matcher.js";

// SOP 0.2.0 PR 2 (DEC-023) — `ocn doc create <id>` MUST recognise the 9 new
// strong-gated build/verify artifact ids and write them with every required
// section heading the 0.2.0 gates expect. Runtime default profile remains
// 0.1.0; this test verifies template content matches the 0.2.0 contract so
// PR 3 can flip the gate runner without rewriting any template.

interface NewArtifact {
  readonly type: string;
  readonly stepId: string;
  readonly file: string;
}

const NEW_ARTIFACTS: readonly NewArtifact[] = [
  { type: "build-plan", stepId: "step_build_plan", file: "docs/10-build-plan.md" },
  {
    type: "implementation-log",
    stepId: "step_implementation_log",
    file: "docs/11-implementation-log.md",
  },
  {
    type: "change-evidence",
    stepId: "step_change_evidence",
    file: "docs/12-change-evidence.md",
  },
  {
    type: "integration-notes",
    stepId: "step_integration_notes",
    file: "docs/13-integration-notes.md",
  },
  {
    type: "verification-report",
    stepId: "step_verification_report",
    file: "docs/14-verification-report.md",
  },
  {
    type: "acceptance-mapping",
    stepId: "step_acceptance_mapping",
    file: "docs/15-acceptance-mapping.md",
  },
  {
    type: "failure-fix-log",
    stepId: "step_failure_fix_log",
    file: "docs/16-failure-fix-log.md",
  },
  {
    type: "regression-evidence",
    stepId: "step_regression_evidence",
    file: "docs/17-regression-evidence.md",
  },
  {
    type: "final-build-verdict",
    stepId: "step_final_build_verdict",
    file: "docs/18-final-build-verdict.md",
  },
];

describe("ocn doc create — SOP 0.2.0 strong-gated build/verify artifacts", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    // Default init keeps the runtime on SOP 0.1.0; doc create still writes
    // the 0.2.0 templates because the registry is profile-agnostic.
    await spawnOcn(["init", "--tier", "minimal"], { cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  for (const artifact of NEW_ARTIFACTS) {
    it(`creates ${artifact.file} for type '${artifact.type}' with every 0.2.0 required heading`, async () => {
      const result = await spawnOcn(["doc", "create", artifact.type], {
        cwd: project.cwd,
      });
      expect(result.exitCode).toBe(0);
      const target = join(project.cwd, artifact.file);
      const content = await fs.readFile(target, "utf8");
      const headings = parseHeadings(content);
      const required = REQUIRED_SECTIONS_BY_STEP[artifact.stepId] ?? [];
      expect(required.length).toBeGreaterThan(0);
      const missing = required
        .filter((s) => !matchSection(headings, s))
        .map((s) => s.id);
      expect(missing).toEqual([]);
    }, 30_000);
  }

  it("blocks overwrite on a 0.2.0 artifact without --overwrite (parity with 0.1.0)", async () => {
    await spawnOcn(["doc", "create", "verification-report"], {
      cwd: project.cwd,
    });
    const second = await spawnOcn(
      ["doc", "create", "verification-report", "--json"],
      {
        cwd: project.cwd,
      },
    );
    expect(second.exitCode).toBe(4);
    const parsed = JSON.parse(second.stdout);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("overwrites a 0.2.0 artifact when --overwrite is passed (parity with 0.1.0)", async () => {
    await spawnOcn(["doc", "create", "verification-report"], {
      cwd: project.cwd,
    });
    const second = await spawnOcn(
      ["doc", "create", "verification-report", "--overwrite"],
      {
        cwd: project.cwd,
      },
    );
    expect(second.exitCode).toBe(0);
  }, 30_000);

  it("still rejects truly unknown doc types with ERR_ARTIFACT_INVALID (exit 2)", async () => {
    const result = await spawnOcn(
      ["doc", "create", "totally-not-a-type", "--json"],
      {
        cwd: project.cwd,
      },
    );
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("ERR_ARTIFACT_INVALID");
  }, 30_000);

  it("matches the 0.2.0 STEPS_BY_STATE shape (sanity)", () => {
    // 19 wired steps total across all states; 9 of them belong to BUILD/VERIFY.
    const buildSteps = STEPS_BY_STATE.state_build.length;
    const verifySteps = STEPS_BY_STATE.state_verify.length;
    expect(buildSteps + verifySteps).toBe(8);
    // build_plan lives in PLAN under 0.2.0, so the new "10-18" set spans
    // PLAN(1) + BUILD(3) + VERIFY(5) = 9.
    expect(NEW_ARTIFACTS).toHaveLength(9);
  });
});
