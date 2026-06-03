import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runGate } from "../../src/core/gate/gate-runner.js";
import { initProject } from "../../src/core/init.js";
import { loadSopProfile, loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import {
  REQUIRED_SECTIONS_BY_STEP,
  STATE_DEFS,
  STEPS_BY_STATE,
} from "../../src/sops/default-ai-coding-sop/0.2.0/data.js";
import { DOC_TYPES, getTemplate, type DocType } from "../../src/core/templates/index.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.2.0 PR 3 (DEC-023) — gate-runner profile-aware enforcement.
//
// Contract:
//   - `runGate({ profile })` validates against an explicit SOP profile.
//   - When called without `profile`, the runtime default (0.1.0) applies and
//     existing 0.1.0 tests remain green (covered by the regression block at
//     the bottom + the original gate-runner.test.ts).
//   - Every wired SOP 0.2.0 step (00-18) is enforceable: missing artifact
//     blocks; partial artifact blocks with `missingRequiredSectionIds`; full
//     template passes.
//   - 05-18 must NOT pass on file existence alone under SOP 0.2.0
//     (explicit regression: empty docs/05-information-architecture.md must
//     FAIL the 0.2.0 gate).
//   - The runtime default profile is unchanged in PR 3 — `loadSopProfile()`
//     still returns 0.1.0 and `ocn init` keeps writing 0.1.0 snapshots.

interface StepInfo {
  readonly stepId: string;
  readonly stateId: string;
  readonly artifactPath: string;
  readonly docType: DocType;
}

function deriveSteps(): readonly StepInfo[] {
  const out: StepInfo[] = [];
  for (const state of STATE_DEFS) {
    for (const step of STEPS_BY_STATE[state.id]) {
      if (step.artifactPath === null) continue;
      const docType = step.stepId.replace(/^step_/, "").replace(/_/g, "-") as DocType;
      out.push({
        stepId: step.stepId,
        stateId: state.id,
        artifactPath: step.artifactPath,
        docType,
      });
    }
  }
  return out;
}

const STEPS = deriveSteps();
const SOP_020 = loadSopProfileByVersion("0.2.0");

// Steps 05-09 + 10-18 (file-existence-only must NOT be allowed for these
// under SOP 0.2.0). Index 0..4 = 00..04, 5..9 = 05..09, 10..18 = 10..18.
const STEPS_05_09 = STEPS.slice(5, 10);
const STEPS_10_18 = STEPS.slice(10, 19);

describe("SOP 0.2.0 gate runner support — coverage shape", () => {
  it("derives 19 wired 0.2.0 steps with artifact paths", () => {
    expect(STEPS).toHaveLength(19);
  });

  it("every 0.2.0 step 00-18 has a gate entry (required sections list, possibly non-empty)", () => {
    const missing: string[] = [];
    for (const s of STEPS) {
      const required = SOP_020.requiredSectionsForStep(s.stepId);
      if (required === undefined) missing.push(s.stepId);
    }
    expect(missing).toEqual([]);
  });

  it("every 0.2.0 gate has at least one required section (no file-existence-only gates)", () => {
    const empty: string[] = [];
    for (const s of STEPS) {
      const required = REQUIRED_SECTIONS_BY_STEP[s.stepId] ?? [];
      if (required.length === 0) empty.push(s.stepId);
    }
    expect(empty).toEqual([]);
  });

  it("every 0.2.0 step has artifactPathForStep wired through the profile", () => {
    for (const s of STEPS) {
      expect(SOP_020.artifactPathForStep(s.stepId)).toBe(s.artifactPath);
    }
  });
});

describe("SOP 0.2.0 gate runner — missing artifact blocks every step", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-missing-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  for (const s of STEPS) {
    it(`blocks ${s.stepId} when ${s.artifactPath} is missing (artifact_missing)`, async () => {
      await seedState(project.cwd, {
        currentStateId: s.stateId,
        currentStepId: s.stepId,
      });
      const result = await runGate({
        cwd: project.cwd,
        profile: SOP_020,
        command: "gate",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("ERR_GATE_FAILED");
        const data = result.data as {
          status: string;
          missingRequiredSectionIds: readonly string[];
          artifactPath?: string;
          blockingReasons?: readonly string[];
        };
        expect(data.status).toBe("blocked");
        expect(data.artifactPath).toBe(s.artifactPath);
        expect(data.blockingReasons).toContain("artifact_missing");
        expect(data.missingRequiredSectionIds).toEqual(
          REQUIRED_SECTIONS_BY_STEP[s.stepId]?.map((r) => r.id),
        );
      }
    });
  }
});

describe("SOP 0.2.0 gate runner — empty artifact fails every step", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-empty-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  for (const s of STEPS) {
    it(`fails ${s.stepId} when ${s.artifactPath} is empty (no headings)`, async () => {
      await seedState(project.cwd, {
        currentStateId: s.stateId,
        currentStepId: s.stepId,
      });
      const target = join(project.cwd, s.artifactPath);
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, "", "utf8");
      const result = await runGate({
        cwd: project.cwd,
        profile: SOP_020,
        command: "gate",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("ERR_GATE_FAILED");
        const data = result.data as {
          status: string;
          missingRequiredSectionIds: readonly string[];
        };
        expect(data.status).toBe("blocked");
        expect(data.missingRequiredSectionIds.length).toBeGreaterThan(0);
        expect(data.missingRequiredSectionIds).toEqual(
          REQUIRED_SECTIONS_BY_STEP[s.stepId]?.map((r) => r.id),
        );
      }
    });
  }
});

describe("SOP 0.2.0 gate runner — partial artifact blocks with missingRequiredSectionIds", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-partial-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("step_build_plan with only first required section present fails with the rest as missingRequiredSectionIds", async () => {
    const stepId = "step_build_plan";
    const stateId = "state_plan";
    const required = REQUIRED_SECTIONS_BY_STEP[stepId] ?? [];
    expect(required.length).toBeGreaterThan(1);
    const first = required[0]!;
    // Use the canonical heading text only (no bilingual suffix) so the matcher
    // resolves it via canonical normalization.
    const partial = `# Build Plan\n\n## ${first.canonical}\n\nx\n`;
    await seedState(project.cwd, {
      currentStateId: stateId,
      currentStepId: stepId,
    });
    const target = join(project.cwd, "docs/10-build-plan.md");
    await fs.mkdir(join(target, ".."), { recursive: true });
    await fs.writeFile(target, partial, "utf8");
    const result = await runGate({
      cwd: project.cwd,
      profile: SOP_020,
      command: "gate",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ERR_GATE_FAILED");
      const data = result.data as {
        status: string;
        missingRequiredSectionIds: readonly string[];
        blockingReasons?: readonly string[];
      };
      expect(data.status).toBe("blocked");
      expect(data.blockingReasons).toContain("missing_required_sections");
      const expected = required.slice(1).map((r) => r.id);
      expect(data.missingRequiredSectionIds).toEqual(expected);
    }
  });
});

describe("SOP 0.2.0 gate runner — full bundled template passes every step", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-full-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  for (const s of STEPS) {
    it(`passes ${s.stepId} when ${s.artifactPath} is the bundled 0.2.0 template (canonical + bilingual headings)`, async () => {
      const entry = getTemplate(s.docType);
      expect(DOC_TYPES).toContain(s.docType);
      expect(entry.relativePath).toBe(s.artifactPath);
      await seedState(project.cwd, {
        currentStateId: s.stateId,
        currentStepId: s.stepId,
      });
      const target = join(project.cwd, s.artifactPath);
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, entry.template, "utf8");
      const result = await runGate({
        cwd: project.cwd,
        profile: SOP_020,
        command: "gate",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.data;
        expect(data?.status).toBe("pass");
        expect(data?.currentStepId).toBe(s.stepId);
        expect(data?.artifactPath).toBe(s.artifactPath);
        expect(data?.missingRequiredSectionIds).toEqual([]);
      }
    });
  }
});

describe("SOP 0.2.0 gate runner — bilingual heading variants satisfy required sections", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-bilingual-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("step_build_plan passes when every required heading uses the bilingual `English｜中文` form", async () => {
    const stepId = "step_build_plan";
    const required = REQUIRED_SECTIONS_BY_STEP[stepId] ?? [];
    expect(required.length).toBeGreaterThan(0);
    const headings = required
      .map((r) => `## ${r.canonical}｜${r.aliases[1] ?? ""}\n\n<!-- body -->\n`)
      .join("\n");
    const body = `# Build Plan｜构建计划\n\n${headings}`;
    await seedState(project.cwd, {
      currentStateId: "state_plan",
      currentStepId: stepId,
    });
    const target = join(project.cwd, "docs/10-build-plan.md");
    await fs.mkdir(join(target, ".."), { recursive: true });
    await fs.writeFile(target, body, "utf8");
    const result = await runGate({
      cwd: project.cwd,
      profile: SOP_020,
      command: "gate",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.status).toBe("pass");
    }
  });

  it("step_information_architecture passes when bilingual `English｜中文` headings are used (regression: doc 05 was file-existence-only under 0.1.0)", async () => {
    const stepId = "step_information_architecture";
    const required = REQUIRED_SECTIONS_BY_STEP[stepId] ?? [];
    expect(required.length).toBeGreaterThan(0);
    const headings = required
      .map((r) => `## ${r.canonical}｜${r.aliases[1] ?? ""}\n\n<!-- body -->\n`)
      .join("\n");
    const body = `# Information Architecture｜信息架构\n\n${headings}`;
    await seedState(project.cwd, {
      currentStateId: "state_design",
      currentStepId: stepId,
    });
    const target = join(project.cwd, "docs/05-information-architecture.md");
    await fs.mkdir(join(target, ".."), { recursive: true });
    await fs.writeFile(target, body, "utf8");
    const result = await runGate({
      cwd: project.cwd,
      profile: SOP_020,
      command: "gate",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.status).toBe("pass");
    }
  });
});

describe("SOP 0.2.0 gate runner — 05-09 do NOT pass on file existence alone", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-05-09-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  for (const s of STEPS_05_09) {
    it(`fails ${s.stepId} when ${s.artifactPath} contains only the H1 heading`, async () => {
      // Use a minimal "file exists" body — only the H1 title, no required
      // sections. This is the exact regression the plan calls out: under
      // SOP 0.1.0, docs 05-09 had no required sections so this body would
      // pass. Under SOP 0.2.0, every required section must be present.
      const titlePart = s.docType
        .split("-")
        .map((p) => p[0]?.toUpperCase() + p.slice(1))
        .join(" ");
      const body = `# ${titlePart}\n`;
      await seedState(project.cwd, {
        currentStateId: s.stateId,
        currentStepId: s.stepId,
      });
      const target = join(project.cwd, s.artifactPath);
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, body, "utf8");
      const result = await runGate({
        cwd: project.cwd,
        profile: SOP_020,
        command: "gate",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("ERR_GATE_FAILED");
        const data = result.data as {
          status: string;
          missingRequiredSectionIds: readonly string[];
        };
        expect(data.status).toBe("blocked");
        expect(data.missingRequiredSectionIds.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("SOP 0.2.0 gate runner — 10-18 do NOT pass on file existence alone", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-10-18-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  for (const s of STEPS_10_18) {
    it(`fails ${s.stepId} when ${s.artifactPath} contains only the H1 heading`, async () => {
      const titlePart = s.docType
        .split("-")
        .map((p) => p[0]?.toUpperCase() + p.slice(1))
        .join(" ");
      const body = `# ${titlePart}\n`;
      await seedState(project.cwd, {
        currentStateId: s.stateId,
        currentStepId: s.stepId,
      });
      const target = join(project.cwd, s.artifactPath);
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, body, "utf8");
      const result = await runGate({
        cwd: project.cwd,
        profile: SOP_020,
        command: "gate",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("ERR_GATE_FAILED");
        const data = result.data as {
          status: string;
          missingRequiredSectionIds: readonly string[];
        };
        expect(data.status).toBe("blocked");
        expect(data.missingRequiredSectionIds.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("SOP 0.2.0 gate runner — all 19 generated templates pass", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-sop020-gate-templates-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("each of the 19 bundled 0.2.0 templates self-passes its own gate", async () => {
    const failures: Array<{ stepId: string; reason: unknown }> = [];
    for (const s of STEPS) {
      const entry = getTemplate(s.docType);
      await seedState(project.cwd, {
        currentStateId: s.stateId,
        currentStepId: s.stepId,
      });
      const target = join(project.cwd, s.artifactPath);
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, entry.template, "utf8");
      const result = await runGate({
        cwd: project.cwd,
        profile: SOP_020,
        command: "gate",
      });
      if (!result.ok || result.data?.status !== "pass") {
        failures.push({
          stepId: s.stepId,
          reason: !result.ok ? result.message.en : result.data?.status,
        });
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("SOP gate runner — runtime default IS 0.3.0", () => {
  it("loadSopProfile() returns 0.3.0", () => {
    const def = loadSopProfile();
    expect(def.version).toBe("0.3.0");
    expect(def.id).toBe("default-ai-coding-sop");
  });

  it("default profile has 20 wired steps total", () => {
    const def = loadSopProfile();
    let total = 0;
    for (const stateId of def.stateOrder) {
      total += def.stepsForState(stateId).length;
    }
    // 0.3.0: 1 (discovery) + 3 (spec) + 6 (design, +logic_backbone) + 2 (plan)
    //        + 3 (build) + 5 (verify) + 0 (ship) + 0 (reflect) = 20
    expect(total).toBe(20);
  });

  it("loadSopProfileByVersion('0.1.0') is still importable and exposes the legacy 10-step shape", () => {
    const v010 = loadSopProfileByVersion("0.1.0");
    expect(v010.version).toBe("0.1.0");
    let total = 0;
    for (const stateId of v010.stateOrder) {
      total += v010.stepsForState(stateId).length;
    }
    // 0.1.0: 2 (discovery) + 2 (spec) + 5 (design) + 1 (plan) + 0 + 0 + 0 + 0 = 10
    expect(total).toBe(10);
  });

  it("runGate without an explicit profile uses 0.2.0 (empty PRD body must report 0.2.0 required sections)", async () => {
    const project = await createTempProject("ocn-sop020-gate-default-");
    try {
      await initProject({ cwd: project.cwd, tier: "minimal" });
      // Seed to step_prd, write an empty file. Default (0.2.0) gate must
      // block on the 0.2.0 PRD required sections — proves the default
      // profile cut over in PR 4.
      await seedState(project.cwd, {
        currentStateId: "state_spec",
        currentStepId: "step_prd",
      });
      const target = join(project.cwd, "docs/02-prd.md");
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, "# PRD\n", "utf8");
      const result = await runGate({ cwd: project.cwd, command: "gate" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("ERR_GATE_FAILED");
        const data = result.data as {
          missingRequiredSectionIds: readonly string[];
        };
        expect(data.missingRequiredSectionIds).toEqual([
          "section_product_form",
          "section_user_roles",
          "section_user_flow",
          "section_core_features",
          "section_non_functional_requirements",
          "section_acceptance_preconditions",
          "section_non_goals",
        ]);
      }
    } finally {
      await project.cleanup();
    }
  });
});
