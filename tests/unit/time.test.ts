import { describe, expect, it } from "vitest";
import { isIsoUtcZ, nowIsoUtc } from "../../src/core/time.js";

describe("ISO 8601 UTC time helpers", () => {
  it("produces a Z-suffixed UTC timestamp (CLAUDE.md §4.3)", () => {
    const now = nowIsoUtc();
    expect(now).toMatch(/Z$/);
    expect(isIsoUtcZ(now)).toBe(true);
  });

  it("validates ISO timestamps with Z suffix", () => {
    expect(isIsoUtcZ("2026-04-28T03:14:15.000Z")).toBe(true);
    expect(isIsoUtcZ("2026-04-28T03:14:15Z")).toBe(true);
  });

  it("rejects timestamps missing the Z suffix", () => {
    expect(isIsoUtcZ("2026-04-28T03:14:15.000")).toBe(false);
    expect(isIsoUtcZ("2026-04-28T03:14:15+08:00")).toBe(false);
  });
});
