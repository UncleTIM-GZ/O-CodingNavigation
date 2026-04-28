import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureLog } from "../../src/core/log/capture-log.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

describe("captureLog core fn", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("dev type appends to docs/19-dev-log.md with bilingual header", async () => {
    const r = await captureLog({
      cwd: project.cwd,
      type: "dev",
      message: "first dev note",
    });
    expect(r.ok).toBe(true);
    const log = await fs.readFile(join(project.cwd, "docs", "19-dev-log.md"), "utf8");
    expect(log).toContain("# Dev Log｜开发日志");
    expect(log).toContain("first dev note");
    expect(log).toMatch(/## \d{4}-\d{2}-\d{2}T/); // ISO timestamp section
  });

  it("research type appends to docs/18-research-log.md", async () => {
    const r = await captureLog({
      cwd: project.cwd,
      type: "research",
      message: "research note A",
    });
    expect(r.ok).toBe(true);
    await fs.access(join(project.cwd, "docs", "18-research-log.md"));
  });

  it("decision type is REJECTED with ERR_GATE_FAILED", async () => {
    const r = await captureLog({
      cwd: project.cwd,
      type: "decision",
      message: "anything",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ERR_GATE_FAILED");
  });

  it("two consecutive dev writes produce ONE header + TWO entries", async () => {
    await captureLog({ cwd: project.cwd, type: "dev", message: "one" });
    await captureLog({ cwd: project.cwd, type: "dev", message: "two" });
    const log = await fs.readFile(join(project.cwd, "docs", "19-dev-log.md"), "utf8");
    const headerCount = (log.match(/^# Dev Log/gm) ?? []).length;
    expect(headerCount).toBe(1);
    expect(log).toContain("one");
    expect(log).toContain("two");
  });

  it("emits artifact_created audit with subType=log-dev", async () => {
    await captureLog({ cwd: project.cwd, type: "dev", message: "audit me" });
    const raw = await fs.readFile(
      join(project.cwd, ".ocoding", "audit", "audit-events.jsonl"),
      "utf8",
    );
    const events = raw
      .trimEnd()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line));
    const created = events.find(
      (e) =>
        e.eventType === "artifact_created" &&
        e.data?.subType === "log-dev",
    );
    expect(created).toBeDefined();
  });

  it("rejects when project not initialized", async () => {
    const fresh = await createTempProject();
    try {
      const r = await captureLog({
        cwd: fresh.cwd,
        type: "dev",
        message: "x",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("ERR_IO_OR_CONFIG");
    } finally {
      await fresh.cleanup();
    }
  });
});
