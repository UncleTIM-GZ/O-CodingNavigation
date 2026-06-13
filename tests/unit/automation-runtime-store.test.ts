import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_AUTOMATION_RUNTIME,
  readAutomationRuntime,
  writeAutomationRuntime,
} from "../../src/core/automation/automation-runtime-store.js";
import type { AutomationRuntime } from "../../src/types/automation.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-009 / DEC-034 — `.ocoding/automation-runtime.json` holds MACHINE state
// (circuit-breaker counter + suspended flag), deliberately separate from the
// human-intent config.yaml. Defensive reads resolve to the not-suspended
// default; writes follow the task-ledger atomic temp+rename protocol.

describe("automation-runtime-store", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-auto-runtime-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns the not-suspended default when the file is absent", async () => {
    const runtime = await readAutomationRuntime(project.cwd);
    expect(runtime).toEqual(DEFAULT_AUTOMATION_RUNTIME);
    expect(runtime.suspended).toBe(false);
    expect(runtime.failureCounter).toBeNull();
  });

  it("returns the default on invalid JSON / invalid schema", async () => {
    const file = join(project.cwd, ".ocoding", "automation-runtime.json");
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(file, "{broken", "utf8");
    expect(await readAutomationRuntime(project.cwd)).toEqual(DEFAULT_AUTOMATION_RUNTIME);
    await fs.writeFile(file, JSON.stringify({ schemaVersion: "9.9" }), "utf8");
    expect(await readAutomationRuntime(project.cwd)).toEqual(DEFAULT_AUTOMATION_RUNTIME);
  });

  it("write→read roundtrips a suspended runtime with a failure counter", async () => {
    const runtime: AutomationRuntime = {
      schemaVersion: "1.0",
      suspended: true,
      suspendedAt: "2026-06-13T00:00:00.000Z",
      suspendedReason: "circuit_breaker_tripped",
      failureCounter: { stepId: "step_prd", count: 5 },
    };
    await writeAutomationRuntime(project.cwd, runtime);
    expect(await readAutomationRuntime(project.cwd)).toEqual(runtime);
  });

  it("leaves no temp files behind (atomic temp+rename)", async () => {
    await writeAutomationRuntime(project.cwd, DEFAULT_AUTOMATION_RUNTIME);
    const entries = await fs.readdir(join(project.cwd, ".ocoding"));
    expect(entries.filter((e) => e.includes(".tmp"))).toEqual([]);
  });

  it("rejects a runtime whose suspendedAt is not ISO-8601-UTC-Z at write time", async () => {
    const bad = {
      schemaVersion: "1.0",
      suspended: true,
      suspendedAt: "2026-06-13T08:00:00+08:00",
      suspendedReason: "circuit_breaker_tripped",
      failureCounter: null,
    } as unknown as AutomationRuntime;
    await expect(writeAutomationRuntime(project.cwd, bad)).rejects.toThrow();
  });
});
