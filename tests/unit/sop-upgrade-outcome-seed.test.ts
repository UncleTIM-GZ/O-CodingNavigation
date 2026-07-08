import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProject } from "../../src/core/init.js";
import { readOutcomeLedger } from "../../src/core/outcome/outcome-ledger-store.js";
import { upgradeSopProfile } from "../../src/core/sop/upgrade.js";
import { acceptanceCriteriaTemplate } from "../../src/core/templates/acceptance-criteria.js";
import { seedState } from "../helpers/seed-state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.9.0 (AM-017 / DEC-043) §F — `ocn sop upgrade` outcome-ledger seed.
// A project upgraded past step_acceptance_criteria never re-runs the acceptance
// gate, so the outcome contracts must be seeded at upgrade time from docs/03.

const AC = "docs/03-acceptance-criteria.md";

function withSpecs(...lines: string[]): string {
  return acceptanceCriteriaTemplate.replace(
    "## Acceptance Specs｜验收规格\n",
    ["## Acceptance Specs｜验收规格", "", ...lines, ""].join("\n"),
  );
}

const OUTCOME_AC = [
  "### AC-INIT-001",
  "- desc: minimal init lands .ocoding",
  "",
  "### AC-ADOPT-001",
  "- desc: onboarding completions are measured",
  "- kind: outcome",
  "- measure.command: node scripts/probe.js",
  "- measure.threshold: >= 1",
  "- measure.source: out/*.json",
  "- measure.due: state_ship",
  "- measure.timeout: 60",
];

describe("sop upgrade — outcome ledger seed (§F)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-upgrade-seed-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  async function initPastSpec(specLines: string[]): Promise<void> {
    await initProject({ cwd: project.cwd, tier: "minimal", sopVersion: "0.8.0" });
    await fs.mkdir(join(project.cwd, "docs"), { recursive: true });
    await fs.writeFile(join(project.cwd, AC), withSpecs(...specLines), "utf8");
    // Cursor already past SPEC — the acceptance gate will never re-run.
    await seedState(project.cwd, {
      currentStateId: "state_build",
      currentStepId: "step_implementation_log",
    });
  }

  it("seeds the ledger with the frozen outcome contract on upgrade to 0.9.0", async () => {
    await initPastSpec(OUTCOME_AC);
    expect(await readOutcomeLedger(project.cwd)).toBeNull(); // nothing under 0.8.0

    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.9.0" });
    expect(result.ok).toBe(true);

    const ledger = await readOutcomeLedger(project.cwd);
    expect(ledger).not.toBeNull();
    const entry = ledger?.entries.find((e) => e.acId === "AC-ADOPT-001");
    expect(entry).toBeDefined();
    expect(entry?.due).toBe("state_ship");
    expect(entry?.history).toEqual([]); // freshly frozen — unmeasured
  });

  it("does not seed a ledger for a build-only project", async () => {
    await initPastSpec(["### AC-INIT-001", "- desc: minimal init lands .ocoding"]);
    const result = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.9.0" });
    expect(result.ok).toBe(true);
    expect(await readOutcomeLedger(project.cwd)).toBeNull();
  });

  it("is idempotent — a valid existing ledger is preserved across a re-upgrade", async () => {
    await initPastSpec(OUTCOME_AC);
    await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.9.0" });
    const first = await readOutcomeLedger(project.cwd);
    // Re-running the same-version upgrade is a noop and must not disturb the ledger.
    const again = await upgradeSopProfile({ cwd: project.cwd, targetVersion: "0.9.0" });
    expect(again.ok).toBe(true);
    expect(await readOutcomeLedger(project.cwd)).toEqual(first);
  });
});
