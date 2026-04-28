import { describe, expect, it } from "vitest";
import { createAuditEvent } from "../../src/core/audit/audit-event.js";
import { AuditEvent } from "../../src/types/audit.js";

const baseInput = {
  eventType: "project_initialized" as const,
  result: "success" as const,
  actor: "user" as const,
  source: "cli" as const,
  projectRoot: "/tmp/project",
  message: { en: "hello", zh: "你好" },
};

describe("createAuditEvent factory", () => {
  it("emits an event that parses against the schema", () => {
    const event = createAuditEvent(baseInput);
    expect(AuditEvent.safeParse(event).success).toBe(true);
  });

  it("emits a Z-suffixed ISO 8601 timestamp", () => {
    const event = createAuditEvent(baseInput);
    expect(event.timestamp).toMatch(/Z$/);
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  it("emits a 26-char ULID by default", () => {
    const event = createAuditEvent(baseInput);
    expect(event.eventId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("respects injected now() and generateId()", () => {
    const fixedNow = new Date("2026-04-28T12:00:00.000Z");
    const fixedId = "01HXAB7QGY3M5N9P2VWQR4S6T8";
    const event = createAuditEvent({
      ...baseInput,
      now: () => fixedNow,
      generateId: () => fixedId,
    });
    expect(event.timestamp).toBe("2026-04-28T12:00:00.000Z");
    expect(event.eventId).toBe(fixedId);
  });

  it("omits empty optional arrays per exactOptionalPropertyTypes", () => {
    const event = createAuditEvent({
      ...baseInput,
      relatedArtifactIds: [],
      relatedPaths: [],
    });
    expect(event.relatedArtifactIds).toBeUndefined();
    expect(event.relatedPaths).toBeUndefined();
  });

  it("preserves provided non-empty arrays", () => {
    const event = createAuditEvent({
      ...baseInput,
      relatedArtifactIds: ["artifact_prd"],
      relatedPaths: ["docs/02-prd.md"],
    });
    expect(event.relatedArtifactIds).toEqual(["artifact_prd"]);
    expect(event.relatedPaths).toEqual(["docs/02-prd.md"]);
  });

  it("preserves currentStateId / currentStepId when provided", () => {
    const event = createAuditEvent({
      ...baseInput,
      currentStateId: "state_spec",
      currentStepId: "step_prd",
    });
    expect(event.currentStateId).toBe("state_spec");
    expect(event.currentStepId).toBe("step_prd");
  });

  it("two consecutive ULIDs are both valid 26-char Crockford Base32", () => {
    const a = createAuditEvent(baseInput);
    const b = createAuditEvent(baseInput);
    // The basic `ulid()` export is NOT guaranteed monotonic within the same ms
    // (random suffix can decrease). Use ulid.monotonicFactory() if strict
    // ordering is required — out of scope for the spike.
    const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
    expect(a.eventId).toMatch(ulidRegex);
    expect(b.eventId).toMatch(ulidRegex);
    expect(a.eventId).not.toBe(b.eventId);
  });
});
