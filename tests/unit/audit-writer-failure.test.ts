import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeAuditEvent, safeAudit } from "../../src/core/audit/audit-writer.js";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import { createAuditEvent } from "../../src/core/audit/audit-event.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const buildEvent = () =>
  createAuditEvent({
    eventType: "project_initialized",
    result: "success",
    actor: "user",
    source: "cli",
    projectRoot: "/tmp/p",
    message: { en: "OCN initialized.", zh: "OCN 已初始化。" },
  });

describe("writeAuditEvent — failure semantics", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-audit-fail-test-");
  });

  afterEach(async () => {
    await project.cleanup();
    vi.restoreAllMocks();
  });

  it("happy path: returns jsonlOk + markdownOk both true", async () => {
    const result = await writeAuditEvent(project.cwd, buildEvent());
    expect(result).toEqual({ jsonlOk: true, markdownOk: true });
    await fs.access(AuditPaths.jsonlFile(project.cwd));
    await fs.access(AuditPaths.markdownFile(project.cwd));
  });

  it("when JSONL fs.appendFile throws, markdown is NOT written and the error propagates", async () => {
    const spy = vi.spyOn(fs, "appendFile").mockRejectedValueOnce(
      Object.assign(new Error("disk full"), { code: "ENOSPC" }),
    );
    await expect(writeAuditEvent(project.cwd, buildEvent())).rejects.toThrow(
      "disk full",
    );
    spy.mockRestore();
    // Markdown file must not exist.
    await expect(fs.access(AuditPaths.markdownFile(project.cwd))).rejects.toMatchObject(
      { code: "ENOENT" },
    );
  });

  it("when markdown fs.appendFile fails, JSONL has the line and result.markdownOk = false", async () => {
    // First call (JSONL) succeeds, second call (markdown body) fails.
    let callCount = 0;
    const original = fs.appendFile.bind(fs);
    const spy = vi.spyOn(fs, "appendFile").mockImplementation(async (...args) => {
      callCount += 1;
      if (callCount === 2) {
        throw Object.assign(new Error("perm denied"), { code: "EACCES" });
      }
       
      return (original as any)(...args);
    });

    const result = await writeAuditEvent(project.cwd, buildEvent());
    spy.mockRestore();
    expect(result.jsonlOk).toBe(true);
    expect(result.markdownOk).toBe(false);
    expect(result.warning).toContain("audit markdown failed");
    // JSONL still has the event line.
    const raw = await fs.readFile(AuditPaths.jsonlFile(project.cwd), "utf8");
    expect(raw.trim().length).toBeGreaterThan(0);
  });
});

describe("safeAudit — never throws, never affects caller", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-safe-audit-test-");
  });

  afterEach(async () => {
    await project.cleanup();
    vi.restoreAllMocks();
  });

  it("returns successfully on the happy path", async () => {
    await expect(safeAudit(project.cwd, buildEvent())).resolves.toBeUndefined();
  });

  it("swallows JSONL failures and writes a stderr warning", async () => {
    vi.spyOn(fs, "appendFile").mockRejectedValueOnce(
      Object.assign(new Error("disk full"), { code: "ENOSPC" }),
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await expect(safeAudit(project.cwd, buildEvent())).resolves.toBeUndefined();
    expect(stderrSpy).toHaveBeenCalled();
    const arg = stderrSpy.mock.calls[0]?.[0];
    expect(String(arg)).toMatch(/audit:/);
    stderrSpy.mockRestore();
  });
});
