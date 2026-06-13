import { describe, expect, it } from "vitest";
import { AuditEvent } from "../../src/types/audit.js";

const valid = {
  eventId: "01HXAB7QGY3M5N9P2VWQR4S6T8",
  eventType: "project_initialized" as const,
  result: "success" as const,
  timestamp: "2026-04-28T03:14:15.000Z",
  actor: "user" as const,
  source: "cli" as const,
  projectRoot: "/tmp/project",
  message: { en: "hi", zh: "你好" },
};

describe("AuditEvent schema", () => {
  it("parses a fully populated valid event", () => {
    expect(AuditEvent.safeParse(valid).success).toBe(true);
  });

  it("rejects non-Z timestamps", () => {
    expect(AuditEvent.safeParse({ ...valid, timestamp: "2026-04-28T03:14:15+08:00" }).success).toBe(
      false,
    );
  });

  it("rejects ULIDs containing forbidden letters (I, L, O, U)", () => {
    // Replace last char with 'I' (forbidden in Crockford Base32)
    const badId = valid.eventId.slice(0, 25) + "I";
    expect(AuditEvent.safeParse({ ...valid, eventId: badId }).success).toBe(false);
  });

  it("rejects ULIDs with the wrong length", () => {
    expect(AuditEvent.safeParse({ ...valid, eventId: "TOO_SHORT" }).success).toBe(false);
  });

  it("accepts every event type from the verbatim taxonomy", () => {
    const types = [
      "project_initialized",
      "state_write_started",
      "state_write_succeeded",
      "state_write_failed",
      "lock_acquired",
      "lock_released",
      "lock_timeout",
      "lock_stale_recovered",
      "artifact_created",
      "artifact_gate_run",
      "artifact_gate_blocked",
      "artifact_gate_passed",
    ] as const;
    for (const eventType of types) {
      const result = AuditEvent.safeParse({ ...valid, eventType });
      expect(result.success).toBe(true);
    }
  });

  it("accepts every result value from the verbatim taxonomy", () => {
    const results = [
      "success",
      "failed",
      "blocked",
      "pass",
      "warning",
      "detected",
      "executed",
    ] as const;
    for (const result of results) {
      expect(AuditEvent.safeParse({ ...valid, result }).success).toBe(true);
    }
  });

  it("accepts auto_mode_changed (AM-009, single type for on/off/resume/suspend)", () => {
    expect(
      AuditEvent.safeParse({
        ...valid,
        eventType: "auto_mode_changed",
        actor: "system",
        data: { action: "suspend", failureCount: 5 },
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown eventType", () => {
    expect(AuditEvent.safeParse({ ...valid, eventType: "ocn_blew_up" }).success).toBe(false);
  });

  it("rejects empty bilingual message fields", () => {
    expect(AuditEvent.safeParse({ ...valid, message: { en: "", zh: "你好" } }).success).toBe(false);
  });

  it("rejects extra unknown keys (strict mode)", () => {
    expect(AuditEvent.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it("accepts optional currentStateId / currentStepId with correct prefixes", () => {
    expect(
      AuditEvent.safeParse({
        ...valid,
        currentStateId: "state_spec",
        currentStepId: "step_prd",
      }).success,
    ).toBe(true);
  });

  it("rejects currentStateId without state_ prefix", () => {
    expect(AuditEvent.safeParse({ ...valid, currentStateId: "spec" }).success).toBe(false);
  });
});
