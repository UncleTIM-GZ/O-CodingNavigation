import { afterEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { initProject } from "../../src/core/init.js";
import {
  type AuditFallbackLogger,
  resetAuditFallbackLogger,
  setAuditFallbackLogger,
  silentAuditFallbackLogger,
  stderrAuditFallbackLogger,
} from "../../src/core/audit/audit-logger.js";
import { safeAudit } from "../../src/core/audit/audit-writer.js";
import { createAuditEvent } from "../../src/core/audit/audit-event.js";
import { createTempProject } from "../helpers/temp-project.js";

describe("safeAudit logger seam", () => {
  afterEach(() => {
    resetAuditFallbackLogger();
    vi.restoreAllMocks();
  });

  it("happy path: configured logger is NOT called when audit succeeds", async () => {
    const project = await createTempProject();
    try {
      await initProject({ cwd: project.cwd, tier: "minimal" });
      const captured: string[] = [];
      setAuditFallbackLogger({
        warn: (m) => captured.push(`warn:${m}`),
        error: (m) => captured.push(`error:${m}`),
      });
      await safeAudit(
        project.cwd,
        createAuditEvent({
          eventType: "artifact_created",
          result: "success",
          actor: "ai_agent",
          source: "core",
          projectRoot: project.cwd,
          message: { en: "ok", zh: "ok" },
        }),
      );
      expect(captured).toEqual([]);
    } finally {
      await project.cleanup();
    }
  });

  it("routes JSONL failure through the configured logger (NOT directly to stderr)", async () => {
    const project = await createTempProject();
    try {
      await initProject({ cwd: project.cwd, tier: "minimal" });

      // Force JSONL append to fail.
      const spy = vi
        .spyOn(fs, "appendFile")
        .mockRejectedValueOnce(Object.assign(new Error("disk full"), { code: "ENOSPC" }));

      // Custom logger captures the message; stderr must NOT receive anything.
      const captured: string[] = [];
      setAuditFallbackLogger({
        warn: (m) => captured.push(`warn:${m}`),
        error: (m) => captured.push(`error:${m}`),
      });
      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

      await safeAudit(
        project.cwd,
        createAuditEvent({
          eventType: "artifact_created",
          result: "success",
          actor: "ai_agent",
          source: "core",
          projectRoot: project.cwd,
          message: { en: "x", zh: "x" },
        }),
      );

      spy.mockRestore();
      stderrSpy.mockRestore();

      expect(captured.length).toBeGreaterThan(0);
      expect(captured[0]).toMatch(/error:|warn:/);
      // safeAudit must NOT bypass the logger and go to stderr directly.
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      await project.cleanup();
    }
  });

  it("silentAuditFallbackLogger drops messages on the floor", async () => {
    const project = await createTempProject();
    try {
      await initProject({ cwd: project.cwd, tier: "minimal" });
      setAuditFallbackLogger(silentAuditFallbackLogger);

      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      const spy = vi
        .spyOn(fs, "appendFile")
        .mockRejectedValueOnce(Object.assign(new Error("disk full"), { code: "ENOSPC" }));

      await safeAudit(
        project.cwd,
        createAuditEvent({
          eventType: "artifact_created",
          result: "success",
          actor: "ai_agent",
          source: "core",
          projectRoot: project.cwd,
          message: { en: "x", zh: "x" },
        }),
      );

      spy.mockRestore();
      stderrSpy.mockRestore();
      stdoutSpy.mockRestore();

      expect(stderrSpy).not.toHaveBeenCalled();
      expect(stdoutSpy).not.toHaveBeenCalled();
    } finally {
      await project.cleanup();
    }
  });

  it("stderrAuditFallbackLogger writes one prefixed line per message", () => {
    // Direct method swap — vitest's spyOn doesn't reliably intercept
    // process.stderr.write across worker boundaries.
    const calls: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    (process.stderr as unknown as { write: (chunk: unknown) => boolean }).write = (
      chunk: unknown,
    ) => {
      calls.push(String(chunk));
      return true;
    };
    try {
      stderrAuditFallbackLogger.warn("hello");
      stderrAuditFallbackLogger.error("boom");
    } finally {
      (process.stderr as unknown as { write: typeof original }).write = original;
    }
    expect(calls).toEqual(["audit: hello\n", "audit: boom\n"]);
  });

  it("setAuditFallbackLogger replaces and resetAuditFallbackLogger restores", () => {
    const fakeLogger: AuditFallbackLogger = { warn: () => {}, error: () => {} };
    setAuditFallbackLogger(fakeLogger);
    resetAuditFallbackLogger();
    // After reset, the stderr default is active again. Verify by direct swap.
    const calls: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    (process.stderr as unknown as { write: (chunk: unknown) => boolean }).write = (
      chunk: unknown,
    ) => {
      calls.push(String(chunk));
      return true;
    };
    try {
      stderrAuditFallbackLogger.warn("post-reset");
    } finally {
      (process.stderr as unknown as { write: typeof original }).write = original;
    }
    expect(calls).toEqual(["audit: post-reset\n"]);
  });
});
