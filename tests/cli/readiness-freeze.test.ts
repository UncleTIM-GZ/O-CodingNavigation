import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditEvent } from "../../src/types/audit.js";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// P5 (R4) — CLI integration: changing a probe command in config.yaml leaves
// an audited readiness_config_changed event on the next gate evaluation.

async function readEvents(cwd: string): Promise<AuditEvent[]> {
  const file = join(cwd, ".ocoding", "audit", "audit-events.jsonl");
  const text = await fs.readFile(file, "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => AuditEvent.parse(JSON.parse(l)));
}

async function setCommand(cwd: string, key: string, value: string): Promise<void> {
  const file = join(cwd, ".ocoding", "config.yaml");
  const text = await fs.readFile(file, "utf8");
  const re = new RegExp(`^(\\s*${key}:).*$`, "m");
  await fs.writeFile(file, text.replace(re, `$1 "${value}"`), "utf8");
}

describe("readiness config drift (P5, CLI)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.4.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("baseline → silent; change → readiness_config_changed; second run → silent", async () => {
    await setCommand(project.cwd, "test", "true");
    await spawnOcn(["readiness", "list"], { cwd: project.cwd }); // captures baseline
    let events = await readEvents(project.cwd);
    expect(events.filter((e) => e.eventType === "readiness_config_changed")).toHaveLength(0);
    const frozen = JSON.parse(
      await fs.readFile(join(project.cwd, ".ocoding", "readiness-frozen.json"), "utf8"),
    );
    expect(frozen.commands.test).toBe("true");

    await setCommand(project.cwd, "test", "exit 0"); // drift
    await spawnOcn(["readiness", "list"], { cwd: project.cwd });
    events = await readEvents(project.cwd);
    const changed = events.filter((e) => e.eventType === "readiness_config_changed");
    expect(changed).toHaveLength(1);
    const changes = (changed[0]?.data as { changes: { key: string; from: string; to: string }[] })
      .changes;
    expect(changes).toEqual([{ key: "test", from: "true", to: "exit 0" }]);

    await spawnOcn(["readiness", "list"], { cwd: project.cwd }); // snapshot updated → silent
    events = await readEvents(project.cwd);
    expect(events.filter((e) => e.eventType === "readiness_config_changed")).toHaveLength(1);
  }, 30_000);
});
