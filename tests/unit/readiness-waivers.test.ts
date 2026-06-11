import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { evaluateReadiness } from "../../src/core/readiness/evaluator.js";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { readWaivers, writeWaivers } from "../../src/core/readiness/waiver-store.js";
import type { ReadinessWaiver } from "../../src/types/readiness.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// P4 — conditional waivers (waive-with-probe). Apply-time re-validation is
// the tamper defense: even a hand-edited waivers file cannot waive a
// waivable:false check, survive a state change, or skip the probe.

const RULEBOOK = `
version: 0.0.1
artifact_aliases:
  artifact_prd: ["*prd*"]
repo_probes:
  git_initialized: { type: path, any: [".git/"] }
checks:
  - id: rdy_waivable
    role: network_engineer
    layer: operations
    concern: network
    tier_required: [solo]
    requires: [artifact_prd.network]
    severity: block
    scenario: "Given prd When check Then network declared"
    check:
      network: not_empty
    fix_hint: { zh: "声明网络需求", en: "Declare network needs" }
  - id: rdy_hard
    role: qa_engineer
    layer: delivery
    concern: tests
    tier_required: [solo]
    requires: [repo.git_initialized]
    severity: block
    scenario: "Given repo When check Then git initialized"
    check:
      git_initialized: true
    waivable: false
    fix_hint: { zh: "git init", en: "git init" }
`;

function waiver(over: Partial<ReadinessWaiver> = {}): ReadinessWaiver {
  return {
    checkId: "rdy_waivable",
    reason: "纯本地项目无网络面",
    probe: "true",
    stateId: "state_discovery",
    grantedAt: "2026-06-11T00:00:00.000Z",
    ...over,
  };
}

describe("waiver store", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("roundtrips waivers", async () => {
    await writeWaivers(project.cwd, [waiver()]);
    expect(await readWaivers(project.cwd)).toEqual([waiver()]);
  });

  it("missing / corrupt / schema-invalid file → [] (broken waiver is NO waiver)", async () => {
    expect(await readWaivers(project.cwd)).toEqual([]);
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(join(project.cwd, ".ocoding", "readiness-waivers.yaml"), "{{{", "utf8");
    expect(await readWaivers(project.cwd)).toEqual([]);
    await fs.writeFile(
      join(project.cwd, ".ocoding", "readiness-waivers.yaml"),
      "waivers:\n  - checkId: rdy_x\n    extra: nope\n",
      "utf8",
    );
    expect(await readWaivers(project.cwd)).toEqual([]);
  });
});

describe("waiver application (apply-time re-validation)", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  async function run(
    waivers: readonly ReadinessWaiver[] | undefined,
    currentStateId?: string,
  ): Promise<Map<string, { verdict: string; detail: string }>> {
    const rulebook = parseReadinessRulebook(RULEBOOK).rulebook;
    expect(rulebook).not.toBeNull();
    const ledger = await evaluateReadiness({
      root: project.cwd,
      rulebook: rulebook!,
      projectTier: "minimal",
      commands: {},
      ...(waivers !== undefined ? { waivers } : {}),
      ...(currentStateId !== undefined ? { currentStateId } : {}),
    });
    return new Map(ledger.checks.map((c) => [c.id, { verdict: c.verdict, detail: c.detail }]));
  }

  it("FAIL/UNKNOWN + valid waiver + passing probe → WAIVED with reason recorded", async () => {
    const byId = await run([waiver()], "state_discovery");
    expect(byId.get("rdy_waivable")?.verdict).toBe("WAIVED");
    expect(byId.get("rdy_waivable")?.detail).toContain("纯本地项目无网络面");
  });

  it("failing probe → original verdict kept, detail says voided", async () => {
    const byId = await run([waiver({ probe: "exit 1" })], "state_discovery");
    expect(byId.get("rdy_waivable")?.verdict).toBe("UNKNOWN");
    expect(byId.get("rdy_waivable")?.detail).toContain("voided");
  });

  it("state mismatch → waiver expired, original verdict kept", async () => {
    const byId = await run([waiver()], "state_spec");
    expect(byId.get("rdy_waivable")?.verdict).toBe("UNKNOWN");
    expect(byId.get("rdy_waivable")?.detail).toContain("expired");
  });

  it("waivable:false is never waived — even via a hand-edited file", async () => {
    const byId = await run([waiver({ checkId: "rdy_hard" })], "state_discovery");
    expect(byId.get("rdy_hard")?.verdict).toBe("FAIL"); // no .git
    expect(byId.get("rdy_hard")?.detail).toContain("not waivable");
  });

  it("PASS checks are untouched by waivers", async () => {
    await fs.mkdir(join(project.cwd, ".git"), { recursive: true });
    const byId = await run([waiver({ checkId: "rdy_hard" })], "state_discovery");
    expect(byId.get("rdy_hard")?.verdict).toBe("PASS");
  });

  it("no waivers argument → identical to P3 behavior (regression)", async () => {
    const byId = await run(undefined);
    expect(byId.get("rdy_waivable")?.verdict).toBe("UNKNOWN");
    expect(byId.get("rdy_hard")?.verdict).toBe("FAIL");
  });
});

describe("audit size guard", () => {
  it("a max-length waiver audit payload stays under the 3500-byte line cap", () => {
    const data = {
      checkId: "rdy_service_delivery_manager",
      reason: `${"很长的理由".repeat(40)}…`.slice(0, 200),
      probe: `${"x".repeat(300)}`.slice(0, 200),
      stateId: "state_discovery",
    };
    const line = JSON.stringify({
      eventId: "01J0000000000000000000000",
      eventType: "readiness_waived",
      result: "executed",
      timestamp: "2026-06-11T00:00:00.000Z",
      actor: "user",
      source: "cli",
      projectRoot: "/tmp/some/deeply/nested/project/path",
      message: { en: "Readiness check waived (conditional).", zh: "就绪检查已条件豁免。" },
      currentStateId: "state_discovery",
      data,
    });
    expect(Buffer.byteLength(line, "utf8")).toBeLessThan(3500);
  });
});
