import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AuditEventTooLargeError,
  appendAuditJsonl,
} from "../../src/core/audit/audit-jsonl.js";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import { createAuditEvent } from "../../src/core/audit/audit-event.js";
import { AuditEvent } from "../../src/types/audit.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const buildEvent = (msg = "hello") =>
  createAuditEvent({
    eventType: "project_initialized",
    result: "success",
    actor: "user",
    source: "cli",
    projectRoot: "/tmp/p",
    message: { en: msg, zh: `${msg}（中文）` },
  });

describe("appendAuditJsonl", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-jsonl-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates the .ocoding/audit/ directory and audit-events.jsonl", async () => {
    await appendAuditJsonl(project.cwd, buildEvent("first"));
    const target = AuditPaths.jsonlFile(project.cwd);
    await fs.access(target);
  });

  it("writes a parseable single line ending in newline", async () => {
    await appendAuditJsonl(project.cwd, buildEvent());
    const raw = await fs.readFile(AuditPaths.jsonlFile(project.cwd), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    const lines = raw.trimEnd().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = AuditEvent.parse(JSON.parse(lines[0]!));
    expect(parsed.eventType).toBe("project_initialized");
  });

  it("appends multiple events as multiple lines, each parseable", async () => {
    await appendAuditJsonl(project.cwd, buildEvent("a"));
    await appendAuditJsonl(project.cwd, buildEvent("b"));
    await appendAuditJsonl(project.cwd, buildEvent("c"));
    const raw = await fs.readFile(AuditPaths.jsonlFile(project.cwd), "utf8");
    const lines = raw.trimEnd().split("\n");
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(() => AuditEvent.parse(JSON.parse(line))).not.toThrow();
    }
  });

  it("throws AuditEventTooLargeError when the line exceeds the cap", async () => {
    const huge = "x".repeat(4096);
    const event = createAuditEvent({
      eventType: "project_initialized",
      result: "success",
      actor: "user",
      source: "cli",
      projectRoot: "/tmp/p",
      message: { en: "a", zh: "b" },
      data: { huge },
    });
    await expect(appendAuditJsonl(project.cwd, event)).rejects.toBeInstanceOf(
      AuditEventTooLargeError,
    );
  });

  it("does not write the file when an oversized event is rejected", async () => {
    const huge = "x".repeat(4096);
    const oversized = createAuditEvent({
      eventType: "project_initialized",
      result: "success",
      actor: "user",
      source: "cli",
      projectRoot: "/tmp/p",
      message: { en: "a", zh: "b" },
      data: { huge },
    });
    await appendAuditJsonl(project.cwd, buildEvent("ok-first")).catch(() => undefined);
    await appendAuditJsonl(project.cwd, oversized).catch(() => undefined);
    const raw = await fs.readFile(AuditPaths.jsonlFile(project.cwd), "utf8");
    const lines = raw.trimEnd().split("\n");
    // Only the first (legitimate) line landed.
    expect(lines).toHaveLength(1);
  });
});
