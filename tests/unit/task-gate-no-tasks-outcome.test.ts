import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAcceptanceProjection,
  writeAcceptanceSpecs,
} from "../../src/core/acceptance/acceptance-spec-store.js";
import {
  reconcileFrozenContracts,
  setOutcomeWaiver,
  writeOutcomeLedger,
} from "../../src/core/outcome/outcome-ledger-store.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";
import { evaluateTaskSpecs } from "../../src/core/task/task-gate.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.9.0 (AM-017) §E.2 / AC-12 — a lone `no_tasks` defect is downgraded to a
// warning for a pure-outcome project (>=1 UNWAIVED outcome AC), so the build
// plan can be empty and the project still reaches SHIP. All-waived or <0.9.0 →
// `no_tasks` still hard-blocks.

const SPECS: readonly AcceptanceSpecV2[] = [
  {
    kind: "outcome",
    id: "AC-CORE-003",
    desc: "onboarding under 30m",
    trace: [],
    measure: {
      command: "node probe.js",
      threshold: { op: ">=", value: 1 },
      source: "cases/*.json",
      due: "state_ship",
      timeoutSeconds: 60,
    },
  },
];
const P090 = loadSopProfileByVersion("0.9.0");
const P080 = loadSopProfileByVersion("0.8.0");

// A build plan with an empty Task Specs section → the parser reports `no_tasks`.
const EMPTY_BUILD_PLAN = [
  "# Build Plan｜构建计划",
  "",
  "## Task Specs｜任务规格",
  "",
].join("\n");

async function freezeOutcome(cwd: string): Promise<void> {
  await writeAcceptanceSpecs(cwd, buildAcceptanceProjection(SPECS, "h", true));
  const ledger = reconcileFrozenContracts(SPECS, null);
  if (ledger !== null) await writeOutcomeLedger(cwd, ledger);
}

describe("evaluateTaskSpecs — no_tasks relaxation (§E.2)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject("ocn-notasks-");
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("downgrades a lone no_tasks to a warning for a pure-outcome 0.9.0 project", async () => {
    await freezeOutcome(project.cwd);
    const r = await evaluateTaskSpecs({
      cwd: project.cwd,
      profile: P090,
      buildPlanContent: EMPTY_BUILD_PLAN,
    });
    expect(r.ok).toBe(true);
    expect(r.ledger?.tasks).toHaveLength(0);
    expect(r.warnings?.some((w) => w.includes("no tasks"))).toBe(true);
  });

  it("still blocks no_tasks below a 0.9.0 pin", async () => {
    await freezeOutcome(project.cwd);
    const r = await evaluateTaskSpecs({
      cwd: project.cwd,
      profile: P080,
      buildPlanContent: EMPTY_BUILD_PLAN,
    });
    expect(r.ok).toBe(false);
    expect(r.issues?.some((d) => d.code === "no_tasks")).toBe(true);
  });

  it("still blocks when the only outcome AC is waived (no silent empty BUILD)", async () => {
    await freezeOutcome(project.cwd);
    await setOutcomeWaiver(project.cwd, "AC-CORE-003", {
      dec: "DEC-043",
      reason: "accepted",
      at: "2026-07-03T00:00:00.000Z",
    });
    const r = await evaluateTaskSpecs({
      cwd: project.cwd,
      profile: P090,
      buildPlanContent: EMPTY_BUILD_PLAN,
    });
    expect(r.ok).toBe(false);
    expect(r.issues?.some((d) => d.code === "no_tasks")).toBe(true);
  });

  it("still blocks a 0.9.0 project with no outcome AC at all", async () => {
    const r = await evaluateTaskSpecs({
      cwd: project.cwd,
      profile: P090,
      buildPlanContent: EMPTY_BUILD_PLAN,
    });
    expect(r.ok).toBe(false);
    expect(r.issues?.some((d) => d.code === "no_tasks")).toBe(true);
  });
});
